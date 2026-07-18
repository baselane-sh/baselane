import { isGitSourceName } from "@baselane/distribute";
import {
  DEFAULT_REGISTRY, decodeSkillPin, fetchRegistryVersions, readManifestWithFallback, resolveManifestPacks, targetLocation, writeManifestFile,
} from "@baselane/materialize";
import type { HarnessManifest, Resolution } from "@baselane/packs";
import { runInstall, type InstallReport } from "./install.ts";

export interface UpdateOptions {
  name?: string; global: boolean; dir?: string; homeDir?: string; dryRun: boolean;
  token?: string; fetchImpl?: typeof fetch; registryBase?: string; log?: (line: string) => void;
}

export interface UpdateReport {
  changed: Array<{ name: string; ref: string; oldSha: string | null; newSha: string }>;
  /** Registry packs whose "is a newer version published" check failed (registry unreachable,
   * malformed response, etc) this run — left pinned at their current version, not a crash. */
  skippedRegistry: string[];
  install: InstallReport;
}

// `install` alone would also re-resolve moving refs (a moved tag or branch pin is exactly what
// re-resolution is for); update's added value is named scoping, the old→new sha report, and (for
// registry packs) finding+writing a newer EXACT version pin before that re-resolution runs.
//
// KNOWN LIMITATION (M2a, documented not fixed): `--name` scoping affects only the report below —
// `runInstall` re-resolves every pack in the manifest regardless, since install is whole-manifest
// by design.
export async function runUpdate(opts: UpdateOptions): Promise<UpdateReport> {
  const log = opts.log ?? console.log;
  const loc = targetLocation({ global: opts.global, dir: opts.dir, homeDir: opts.homeDir });
  const { manifest } = await readManifestWithFallback(loc);
  if (manifest === null) throw new Error(`update: no harness.json at ${loc.manifestPath} — run baselane install first`);

  const gitNames = Object.keys(manifest.packs).filter(isGitSourceName);
  const registryNames = Object.keys(manifest.packs).filter((n) => !isGitSourceName(n));
  const allNames = [...gitNames, ...registryNames];
  if (opts.name !== undefined && !allNames.includes(opts.name)) {
    throw new Error(`update: "${opts.name}" is not a pack in this manifest — packs: ${allNames.join(", ") || "(none)"}`);
  }

  // Registry packs are exact-pin-only: unlike a git ref (a branch/tag name whose pin never
  // changes — only the sha it resolves to moves), "update" for a registry pack means finding a
  // NEWER version and rewriting the pin itself. A registry that's unreachable for this check is a
  // per-pack warning, not a fatal error — the pack just stays pinned where it was.
  const registryTargets = opts.name !== undefined ? registryNames.filter((n) => n === opts.name) : registryNames;
  const registryBase = manifest.registry ?? opts.registryBase ?? DEFAULT_REGISTRY;
  const bumpedPacks = { ...manifest.packs };
  const skippedRegistry: string[] = [];
  for (const name of registryTargets) {
    try {
      const versions = await fetchRegistryVersions(name, registryBase, { fetchImpl: opts.fetchImpl });
      const latest = versions[0]?.version;
      if (latest !== undefined && latest !== manifest.packs[name]) bumpedPacks[name] = latest;
    } catch (err) {
      skippedRegistry.push(name);
      log(`update: "${name}" registry lookup failed (${err instanceof Error ? err.message : String(err)}) — leaving pinned at ${manifest.packs[name]}`);
    }
  }
  const bumped = JSON.stringify(bumpedPacks) !== JSON.stringify(manifest.packs);
  const manifestForResolve: HarnessManifest = bumped ? { ...manifest, packs: bumpedPacks } : manifest;
  if (!opts.dryRun && bumped) await writeManifestFile(loc.manifestPath, manifestForResolve);

  const oldResolutions = manifest.materialized.resolutions;
  const install = await runInstall({
    global: opts.global, dir: opts.dir, homeDir: opts.homeDir,
    dryRun: opts.dryRun, json: false, token: opts.token, fetchImpl: opts.fetchImpl, registryBase: opts.registryBase, log,
  });

  const targets = opts.name !== undefined ? [opts.name] : allNames;
  // dry-run never wrote a new manifest — resolve fresh shas in-memory instead of reading disk, so
  // the preview still reports a moved tag/branch (or a bumped registry version) instead of always
  // claiming "unchanged".
  let newResolutions: Record<string, Resolution> | null;
  if (opts.dryRun) {
    const fresh = await resolveManifestPacks(manifestForResolve, { token: opts.token, fetchImpl: opts.fetchImpl, registryBase: opts.registryBase });
    newResolutions = fresh.resolutions;
  } else {
    const { manifest: updated } = await readManifestWithFallback(loc);
    newResolutions = updated?.materialized.resolutions ?? null;
  }
  const changed: UpdateReport["changed"] = [];
  for (const name of targets) {
    const oldSha = oldResolutions[name]?.sha ?? null;
    const newSha = newResolutions?.[name]?.sha ?? oldSha ?? "";
    const ref = bumpedPacks[name] ?? manifest.packs[name];
    // A skill-scoped git pack encodes the onlySkill filter behind a control-character separator
    // (see encodeSkillPin) — decode before logging, same as formatInstallReport, or the raw
    // U+0001 byte prints straight to the terminal.
    const { ref: shownRef, onlySkill } = decodeSkillPin(ref);
    const shownRefLabel = `${shownRef}${onlySkill ? ` (skill: ${onlySkill})` : ""}`;
    if (newSha !== "" && newSha !== oldSha) {
      changed.push({ name, ref, oldSha, newSha });
      log(`updated ${name}: ${shownRefLabel} ${oldSha?.slice(0, 7) ?? "(none)"} → ${newSha.slice(0, 7)}`);
    } else {
      log(`unchanged ${name}@${shownRefLabel}${oldSha ? ` (${oldSha.slice(0, 7)})` : ""}`);
    }
  }
  return { changed, skippedRegistry, install };
}
