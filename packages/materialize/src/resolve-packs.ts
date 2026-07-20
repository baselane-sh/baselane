import { packFromFileset, validatePack, type HarnessManifest, type Resolution, type WorkflowPack } from "@baselane/packs";
import { isGitSourceName, parseGitSourceName, resolveGitSource, resolveWellKnownSource, type DnsLookup } from "@baselane/distribute";

export interface ResolvedManifestPacks {
  packs: Record<string, WorkflowPack>;
  resolutions: Record<string, Resolution>;
  notes: string[];
}

/** CLI default registry, overridden by `manifest.registry`, then a caller-supplied `registryBase`
 * (the CLI reads `BASELANE_REGISTRY` and passes it through — env access stays out of this
 * package, same as how `GITHUB_TOKEN` flows in as `opts.token`). Spec: RETURN DECISION 4. */
export const DEFAULT_REGISTRY = "https://registry.baselane.sh";

export function registryBaseFor(manifest: HarnessManifest, fallback?: string): string {
  return manifest.registry ?? fallback ?? DEFAULT_REGISTRY;
}

export interface RegistryVersionEntry {
  version: string;
  source: { name: string; ref: string; sha: string };
  packId: string;
  publishedAt: string;
}

const VERSION_RE = /^\d+\.\d+\.\d+$/;
const SOURCE_NAME_RE = /^github:[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;
const SHA_RE = /^[0-9a-f]{40}$/;

/** 3-part numeric semver compare, descending ("1.10.0" sorts before "1.2.0"). Mirrors
 * apps/portal/src/compliance.ts's compareVersions — inlined because packages can't import
 * from apps/portal. ALL client-side "latest" resolution must go through this, never trust
 * the order the registry response happened to arrive in. */
function compareVersionsDesc(a: string, b: string): number {
  const part = (v: string, i: number): number => Number.parseInt(v.split(".")[i] ?? "0", 10);
  for (let i = 0; i < 3; i++) {
    const d = part(b, i) - part(a, i);
    if (d !== 0) return d;
  }
  return 0;
}

/** A registry is an untrusted network response, not a trusted local store — a malicious or
 * buggy server could otherwise write a non-semver version, a non-github: source, or a
 * malformed sha straight into a committed harness.json pin. Reject anything that doesn't
 * match the exact shape the portal's own RegistryIndexRec validator enforces at publish time. */
function isValidRegistryVersionEntry(v: unknown): v is RegistryVersionEntry {
  if (v === null || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  if (typeof r.version !== "string" || !VERSION_RE.test(r.version)) return false;
  if (typeof r.packId !== "string" || r.packId.length === 0) return false;
  if (typeof r.publishedAt !== "string") return false;
  const source = r.source as Record<string, unknown> | undefined;
  if (source === null || typeof source !== "object") return false;
  if (typeof source.name !== "string" || !SOURCE_NAME_RE.test(source.name)) return false;
  if (typeof source.ref !== "string" || source.ref.length === 0) return false;
  if (typeof source.sha !== "string" || !SHA_RE.test(source.sha)) return false;
  return true;
}

/** GET {registryBase}/registry/v1/packs/{name} — every entry validated against the registry's
 * own publish-time shape (semver version, `github:` source, 40-hex lowercase sha); entries that
 * fail are dropped (never written to a committed manifest pin), with a notice so a silently
 * degraded registry response isn't invisible. The kept entries are sorted semver-desc locally —
 * "latest" must never trust server-supplied order. */
export async function fetchRegistryVersions(
  name: string, registryBase: string,
  ctx: { fetchImpl?: typeof fetch; onNotice?: (m: string) => void } = {},
): Promise<RegistryVersionEntry[]> {
  const fetchImpl = ctx.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(`${registryBase}/registry/v1/packs/${name}`);
  } catch (err) {
    throw new Error(`registry: lookup for "${name}" at ${registryBase} failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (res.status === 404) throw new Error(`registry: pack "${name}" not found at ${registryBase}`);
  if (!res.ok) throw new Error(`registry: lookup for "${name}" at ${registryBase} failed with HTTP ${res.status}`);
  const body = (await res.json()) as { versions?: unknown };
  if (!Array.isArray(body.versions)) throw new Error(`registry: malformed response for "${name}" at ${registryBase} (missing "versions")`);
  const valid = body.versions.filter(isValidRegistryVersionEntry);
  const dropped = body.versions.length - valid.length;
  if (dropped > 0) {
    ctx.onNotice?.(
      `registry: dropped ${dropped} malformed version entr${dropped === 1 ? "y" : "ies"} for "${name}" ` +
        `at ${registryBase} (bad version/source/sha shape) — refusing to trust them`,
    );
  }
  return valid.sort((a, b) => compareVersionsDesc(a.version, b.version));
}

/** The `owner/repo@skill` shorthand (no explicit ref) resolves to a `github:owner/repo` manifest
 * entry pinned at the repo's default branch — but the single-skill filter it implies has nowhere
 * else to live (manifest pins are plain ref strings, `Record<string,string>`; touching that shape
 * ripples through validateManifest/buildManifest/materializeHarness for a one-slice feature).
 * Instead the filter rides along inside the pin string itself, behind a control-character
 * separator no real git ref name can contain (git refuses control chars in ref names) — so this
 * is unambiguous and invisible to any pin that isn't skill-scoped. */
const SKILL_PIN_SEP = "";

export function encodeSkillPin(ref: string, skill: string): string {
  return `${ref}${SKILL_PIN_SEP}${skill}`;
}

/** Exported for display code (e.g. formatting an install/update report) — the raw pin string
 * contains a control character and must never be printed verbatim. */
export function decodeSkillPin(pin: string): { ref: string; onlySkill: string | undefined } {
  const at = pin.indexOf(SKILL_PIN_SEP);
  if (at === -1) return { ref: pin, onlySkill: undefined };
  return { ref: pin.slice(0, at), onlySkill: pin.slice(at + 1) };
}

export async function resolveManifestPacks(
  manifest: HarnessManifest,
  opts: {
    token?: string; fetchImpl?: typeof fetch; onNotice?: (m: string) => void;
    inlinePacks?: Record<string, WorkflowPack>; registryBase?: string; lookupImpl?: DnsLookup;
  } = {},
): Promise<ResolvedManifestPacks> {
  const packs: Record<string, WorkflowPack> = {};
  const resolutions: Record<string, Resolution> = {};
  const notes: string[] = [];
  const registryBase = registryBaseFor(manifest, opts.registryBase);
  for (const [name, pin] of Object.entries(manifest.packs)) {
    const inline = opts.inlinePacks?.[name];
    if (inline !== undefined) {
      packs[name] = validatePack(inline);
      continue;
    }
    if (name.startsWith("docs:")) {
      // Well-known agent-skills source. `pin` is the sha256 of the host's index.json; the resolver
      // re-fetches and re-verifies (index sha against the pin, each artifact against its digest) or
      // hard-fails on drift/tamper. Reuses packFromFileset for validation.
      const url = name.slice("docs:".length);
      const { indexSha, files } = await resolveWellKnownSource({ url, pin, fetchImpl: opts.fetchImpl, onNotice: opts.onNotice, lookupImpl: opts.lookupImpl });
      const host = new URL(url).hostname;
      const result = await packFromFileset(files, { repoName: host, ref: "well-known", sha: indexSha });
      packs[name] = result.pack;
      resolutions[name] = { ref: pin, sha: indexSha, packId: result.pack.id };
      continue;
    }
    if (isGitSourceName(name)) {
      const { repo } = parseGitSourceName(name);
      const { ref, onlySkill } = decodeSkillPin(pin);
      const resolved = await resolveGitSource({ name, ref, token: opts.token, fetchImpl: opts.fetchImpl, onNotice: opts.onNotice });
      const result = await packFromFileset(resolved.files, { repoName: repo, ref, sha: resolved.sha, onlySkill });
      packs[name] = result.pack;
      resolutions[name] = { ref: pin, sha: resolved.sha, packId: result.pack.id };
      if (result.derived) {
        notes.push(`derived pack from ${name}@${ref}: id "${result.pack.id}", ${(result.pack.skills ?? []).length} skill(s) (no pack.json found — ingested)`);
      }
      continue;
    }
    // Registry-scoped: `pin` is an exact version (manifest pins are always exact — RETURN
    // DECISION 4). Look it up in the index, verify the resolved sha against what the index
    // recorded at publish time (tamper evidence — a moved tag/branch or a compromised registry
    // record must fail loudly, never resolve silently to different content), then ingest exactly
    // like a git install.
    const versions = await fetchRegistryVersions(name, registryBase, { fetchImpl: opts.fetchImpl, onNotice: opts.onNotice });
    const match = versions.find((v) => v.version === pin);
    if (!match) {
      const available = versions.map((v) => v.version).join(", ") || "(none)";
      throw new Error(`install: "${name}@${pin}" not found in registry ${registryBase} — available versions: ${available}`);
    }
    const resolved = await resolveGitSource({
      name: match.source.name, ref: match.source.ref, token: opts.token, fetchImpl: opts.fetchImpl, onNotice: opts.onNotice,
    });
    if (resolved.sha !== match.source.sha) {
      throw new Error(
        `install: "${name}@${pin}" tamper check failed — registry index says ${match.source.name}@${match.source.ref} ` +
          `resolved to sha ${match.source.sha} at publish time, but it currently resolves to ${resolved.sha}`,
      );
    }
    const { repo } = parseGitSourceName(match.source.name);
    const result = await packFromFileset(resolved.files, { repoName: repo, ref: match.source.ref, sha: resolved.sha });
    packs[name] = result.pack;
    resolutions[name] = { ref: pin, sha: resolved.sha, packId: result.pack.id };
  }
  return { packs, resolutions, notes };
}
