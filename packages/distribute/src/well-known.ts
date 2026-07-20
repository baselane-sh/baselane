import { createHash } from "node:crypto";
import { lookup as dnsLookup } from "node:dns/promises";

/** RFC 8615 well-known discovery for agent skills. A host publishes a signed index at
 * `<origin>/.well-known/agent-skills/index.json`; each artifact carries an integrity `digest`.
 * This is the deterministic, zero-AI `docs:` install path: the manifest pins the sha256 of the
 * index bytes, and every re-resolve re-fetches and re-verifies (index sha against the pin, then
 * each artifact against its declared digest) or hard-fails — exactly like the registry tamper
 * check in resolve-packs.ts. Legacy (pre-0.2.0) indexes carry no per-artifact digests and so
 * cannot be safely pinned; they are rejected with a clear message rather than resolved unverified. */

const WELL_KNOWN_PATHS = [".well-known/agent-skills", ".well-known/skills"] as const;
const INDEX_FILE = "index.json";
const DISCOVERY_SCHEMA_V2 = "discovery/0.2.0";
const MAX_ARTIFACT_BYTES = 5 * 1024 * 1024; // 5 MB — bounds memory and (later) token cost

export interface ResolvedWellKnown {
  /** sha256 (hex) of the raw index.json bytes — the manifest pin. */
  indexSha: string;
  /** Repo-shaped fileset (`skills/<slug>/SKILL.md` → body) for packFromFileset. */
  files: Record<string, string>;
}

interface WellKnownEntryV2 {
  name: string;
  type: "skill-md" | "archive";
  description?: string;
  url: string;
  digest: string;
}

export type DnsLookup = (hostname: string) => Promise<{ address: string }>;

function sha256Hex(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64)
      .replace(/-+$/g, "") || "skill"
  );
}

/** IPv4/IPv6 ranges that must never be fetched server-side (SSRF): private, loopback,
 * link-local (incl. the cloud metadata host 169.254.169.254), CGNAT, and unspecified. */
export function isBlockedAddress(address: string): boolean {
  const ip = address.trim();
  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1) → test the embedded v4.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  const v4 = mapped ? mapped[1] : ip;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(v4);
  if (m) {
    const o = m.slice(1).map(Number);
    if (o.some((n) => n > 255)) return true; // malformed — refuse
    const [a, b] = o;
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local + metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
    return false;
  }
  // IPv6
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true; // loopback / unspecified
  if (lower.startsWith("fe80")) return true; // link-local
  if (/^f[cd][0-9a-f]{2}:/.test(lower)) return true; // unique-local fc00::/7
  return false;
}

/** Enforce https + non-empty host, then resolve the host and reject internal targets.
 * `lookupImpl` is injectable for tests. */
export async function assertPublicHttpsUrl(url: string, lookupImpl: DnsLookup = dnsLookup): Promise<URL> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error(`docs: "${url}" is not a valid URL`);
  }
  if (u.protocol !== "https:") {
    throw new Error(`docs: "${url}" must be https (got "${u.protocol.replace(/:$/, "")}")`);
  }
  if (!u.hostname) throw new Error(`docs: "${url}" has no host`);
  const { address } = await lookupImpl(u.hostname);
  if (isBlockedAddress(address)) {
    throw new Error(`docs: refusing to fetch ${u.hostname} — it resolves to a blocked/internal address (${address})`);
  }
  return u;
}

async function fetchText(
  url: string,
  fetchImpl: typeof fetch,
  lookupImpl: DnsLookup,
): Promise<{ ok: boolean; status: number; body: string }> {
  await assertPublicHttpsUrl(url, lookupImpl);
  const res = await fetchImpl(url, {
    redirect: "error", // a redirect could bypass the SSRF check — refuse it
    headers: { "user-agent": "baselane", accept: "application/json, text/plain, */*" },
  });
  if (!res.ok) return { ok: false, status: res.status, body: "" };
  const body = await res.text();
  if (body.length > MAX_ARTIFACT_BYTES) {
    throw new Error(`docs: ${url} exceeds the ${MAX_ARTIFACT_BYTES}-byte cap`);
  }
  return { ok: true, status: res.status, body };
}

/**
 * Resolve a `docs:<url>` source against the host's well-known agent-skills index.
 * Returns the index sha (the pin) and a repo-shaped fileset ready for `packFromFileset`.
 * When `pin` is provided the fetched index sha must equal it (drift/tamper → throw).
 */
export async function resolveWellKnownSource(opts: {
  url: string;
  pin?: string;
  fetchImpl?: typeof fetch;
  onNotice?: (m: string) => void;
  lookupImpl?: DnsLookup;
}): Promise<ResolvedWellKnown> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const lookupImpl = opts.lookupImpl ?? dnsLookup;
  const origin = (await assertPublicHttpsUrl(opts.url, lookupImpl)).origin;

  let indexBody: string | null = null;
  let indexUrl = "";
  for (const path of WELL_KNOWN_PATHS) {
    indexUrl = `${origin}/${path}/${INDEX_FILE}`;
    const r = await fetchText(indexUrl, fetchImpl, lookupImpl);
    if (r.ok) {
      indexBody = r.body;
      break;
    }
  }
  if (indexBody === null) {
    throw new Error(
      `docs: no well-known agent-skills manifest at ${origin} ` +
        `(looked for /${WELL_KNOWN_PATHS[0]}/${INDEX_FILE} and /${WELL_KNOWN_PATHS[1]}/${INDEX_FILE})`,
    );
  }

  const indexSha = sha256Hex(indexBody);
  if (opts.pin !== undefined && opts.pin !== indexSha) {
    throw new Error(
      `docs: "${opts.url}" integrity check failed — pinned index sha ${opts.pin}, ` +
        `but ${indexUrl} now hashes to ${indexSha} (upstream docs changed; run "baselane refresh")`,
    );
  }

  let index: unknown;
  try {
    index = JSON.parse(indexBody);
  } catch {
    throw new Error(`docs: ${indexUrl} is not valid JSON`);
  }
  if (typeof index !== "object" || index === null || !Array.isArray((index as { skills?: unknown }).skills)) {
    throw new Error(`docs: ${indexUrl} has no "skills" array`);
  }
  const schema = (index as { $schema?: unknown }).$schema;
  if (schema !== undefined) {
    if (typeof schema !== "string" || !schema.includes(DISCOVERY_SCHEMA_V2)) {
      throw new Error(`docs: ${indexUrl} declares an unrecognized $schema (${String(schema)}) — expected ${DISCOVERY_SCHEMA_V2}`);
    }
  } else {
    // Legacy (pre-0.2.0) indexes carry no per-artifact digests, so a sha256 index pin cannot
    // guarantee the fetched skill bytes — refuse rather than resolve unverified content.
    throw new Error(
      `docs: ${indexUrl} is a legacy index without per-artifact digests — publish a ${DISCOVERY_SCHEMA_V2} index to install with baselane`,
    );
  }

  const entries = (index as { skills: unknown[] }).skills;
  const files: Record<string, string> = {};
  const seen = new Set<string>();
  for (const raw of entries) {
    const e = raw as Partial<WellKnownEntryV2>;
    if (typeof e.name !== "string" || typeof e.url !== "string" || typeof e.digest !== "string" || typeof e.type !== "string") {
      throw new Error(`docs: ${indexUrl} has a malformed skill entry`);
    }
    if (e.type === "archive") {
      opts.onNotice?.(`docs: skipping "${e.name}" — archive artifacts are not yet supported (coming soon)`);
      continue;
    }
    if (e.type !== "skill-md") {
      throw new Error(`docs: ${indexUrl} entry "${e.name}" has unknown type "${e.type}"`);
    }
    const r = await fetchText(e.url, fetchImpl, lookupImpl);
    if (!r.ok) throw new Error(`docs: artifact ${e.url} for "${e.name}" returned HTTP ${r.status}`);
    const got = sha256Hex(r.body);
    if (got !== e.digest) {
      throw new Error(`docs: artifact "${e.name}" integrity check failed — declared digest ${e.digest}, fetched bytes hash to ${got}`);
    }
    let slug = slugify(e.name);
    while (seen.has(slug)) slug = `${slug.slice(0, 60)}-2`;
    seen.add(slug);
    files[`skills/${slug}/SKILL.md`] = r.body;
  }

  if (Object.keys(files).length === 0) {
    throw new Error(`docs: ${indexUrl} lists no installable skill-md artifacts`);
  }
  return { indexSha, files };
}
