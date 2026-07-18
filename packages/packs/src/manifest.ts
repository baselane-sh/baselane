// packages/packs/src/manifest.ts
import { isEntryFile } from "./merge-region.ts";

export interface VendoredEntry { path: string; sha256: string | null }
export interface RegionReceipt { packId: string; version: string; sha256: string }
export interface ManagedRegionEntry { path: string; regions: RegionReceipt[] }
export interface Resolution { ref: string; sha: string; packId: string }

/** Capabilities a pack can declare as materialized (centrally computed, then distributed). */
export const KNOWN_CAPABILITIES = ["system-map", "wiki", "graph"] as const;
export type CapabilityName = (typeof KNOWN_CAPABILITIES)[number];
/** Receipt for one materialized capability: what it was generated from and what it wrote. */
export interface CapabilityReceipt { sourceSha: string | null; generatedTs: string; paths: { path: string; sha256: string }[] }

/** The per-target contract: what a repo/machine uses. Source of truth lives IN the target
 * (committed root `harness.json`, beside package.json — npm's manifest-as-front-door convention).
 * Machine manifest stays at `~/.baselane/harness.json`. Exact pins only in v1. */
export interface HarnessManifest {
  version: 1;
  registry: string | null;
  target: { kind: "repo" | "machine"; id: string };
  packs: Record<string, string>;
  capabilities: Record<string, unknown>;
  materialized: {
    vendored: VendoredEntry[];
    managedRegions: ManagedRegionEntry[];
    derivedCommitted: string[];
    resolutions: Record<string, Resolution>;
    capabilities: Record<string, CapabilityReceipt>;
  };
}

export const MANIFEST_PATH = "harness.json";
/** Served from the landing site (landing/harness.schema.json); documented in baselane-sh/harness.json.
 * Written as the first key of every generated harness.json for editor validation/autocomplete. */
export const MANIFEST_SCHEMA_URL = "https://baselane.sh/harness.schema.json";
/** Pre-2026-07-16 repo manifest location. `readManifestWithFallback` (packages/materialize)
 * reads from here when the root manifest is absent; `install` migrates it forward. */
export const LEGACY_MANIFEST_PATH = ".baselane/harness.json";

function fail(msg: string): never {
  throw new Error(`invalid manifest: ${msg}`);
}

function strList(v: unknown, label: string): string[] {
  if (v === undefined) return [];
  if (!Array.isArray(v) || !v.every((x) => typeof x === "string" && x.length > 0)) fail(`${label} must be a list of non-empty strings`);
  return [...(v as string[])];
}

function nonEmpty(v: unknown, label: string): string {
  if (typeof v !== "string" || v.length === 0) fail(`${label} must be a non-empty string`);
  return v;
}

/** Accepts the S1 legacy shape (string) and the v2 shape ({path, sha256}). */
function vendoredList(v: unknown): VendoredEntry[] {
  if (v === undefined) return [];
  if (!Array.isArray(v)) fail("materialized.vendored must be a list");
  return v.map((e) => {
    if (typeof e === "string") {
      if (e.length === 0) fail("materialized.vendored paths must be non-empty");
      return { path: e, sha256: null };
    }
    if (e === null || typeof e !== "object") fail("materialized.vendored entries must be strings or {path, sha256}");
    const o = e as Record<string, unknown>;
    const path = nonEmpty(o.path, "materialized.vendored path");
    if (o.sha256 !== null && typeof o.sha256 !== "string") fail("materialized.vendored sha256 must be a string or null");
    return { path, sha256: (o.sha256 as string | null) ?? null };
  });
}

/** Accepts the S1 legacy shape (string) and the v2 shape ({path, regions}). */
function managedRegionList(v: unknown): ManagedRegionEntry[] {
  if (v === undefined) return [];
  if (!Array.isArray(v)) fail("materialized.managedRegions must be a list");
  return v.map((e) => {
    if (typeof e === "string") {
      if (e.length === 0) fail("materialized.managedRegions paths must be non-empty");
      return { path: e, regions: [] };
    }
    if (e === null || typeof e !== "object") fail("materialized.managedRegions entries must be strings or {path, regions}");
    const o = e as Record<string, unknown>;
    const path = nonEmpty(o.path, "materialized.managedRegions path");
    const regionsRaw = o.regions === undefined ? [] : o.regions;
    if (!Array.isArray(regionsRaw)) fail("materialized.managedRegions regions must be a list");
    const regions = regionsRaw.map((r) => {
      if (r === null || typeof r !== "object") fail("materialized.managedRegions region must be an object");
      const ro = r as Record<string, unknown>;
      return {
        packId: nonEmpty(ro.packId, "managedRegions region packId"),
        version: nonEmpty(ro.version, "managedRegions region version"),
        sha256: nonEmpty(ro.sha256, "managedRegions region sha256"),
      };
    });
    return { path, regions };
  });
}

function resolutionMap(v: unknown): Record<string, Resolution> {
  if (v === undefined) return {};
  if (v === null || typeof v !== "object" || Array.isArray(v)) fail("materialized.resolutions must be an object");
  const out: Record<string, Resolution> = {};
  for (const [name, raw] of Object.entries(v as Record<string, unknown>)) {
    if (raw === null || typeof raw !== "object") fail(`resolutions["${name}"] must be an object`);
    const o = raw as Record<string, unknown>;
    out[name] = {
      ref: nonEmpty(o.ref, `resolutions["${name}"].ref`),
      sha: nonEmpty(o.sha, `resolutions["${name}"].sha`),
      packId: nonEmpty(o.packId, `resolutions["${name}"].packId`),
    };
  }
  return out;
}

function capabilityReceiptMap(v: unknown): Record<string, CapabilityReceipt> {
  if (v === undefined) return {};
  if (v === null || typeof v !== "object" || Array.isArray(v)) fail("materialized.capabilities must be an object");
  const out: Record<string, CapabilityReceipt> = {};
  for (const [name, raw] of Object.entries(v as Record<string, unknown>)) {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) fail(`materialized.capabilities["${name}"] must be an object`);
    const o = raw as Record<string, unknown>;
    if (o.sourceSha !== null && typeof o.sourceSha !== "string") fail(`materialized.capabilities["${name}"].sourceSha must be a string or null`);
    const generatedTs = nonEmpty(o.generatedTs, `materialized.capabilities["${name}"].generatedTs`);
    if (!Array.isArray(o.paths)) fail(`materialized.capabilities["${name}"].paths must be a list`);
    const paths = o.paths.map((p, i) => {
      if (p === null || typeof p !== "object") fail(`materialized.capabilities["${name}"].paths[${i}] must be an object`);
      const po = p as Record<string, unknown>;
      return {
        path: nonEmpty(po.path, `materialized.capabilities["${name}"].paths[${i}].path`),
        sha256: nonEmpty(po.sha256, `materialized.capabilities["${name}"].paths[${i}].sha256`),
      };
    });
    out[name] = { sourceSha: (o.sourceSha as string | null) ?? null, generatedTs, paths };
  }
  return out;
}

/** Sole authority on what a HarnessManifest is (mirror of validatePack). Returns a NEW
 * normalized object — absent registry → null, absent capabilities → {}, absent materialized
 * lists → []. Throws with a reason on anything invalid. Never mutates `raw`. */
export function validateManifest(raw: unknown): HarnessManifest {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) fail("manifest must be an object");
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) fail(`unsupported version ${JSON.stringify(o.version)} (expected 1)`);
  if (o.registry !== undefined && o.registry !== null && typeof o.registry !== "string") fail("registry must be a string or null");

  const t = o.target;
  if (t === null || typeof t !== "object") fail("target must be an object");
  const target = t as Record<string, unknown>;
  if (target.kind !== "repo" && target.kind !== "machine") fail(`target.kind must be "repo" or "machine"`);
  if (typeof target.id !== "string" || target.id.length === 0) fail("target.id must be a non-empty string");

  if (o.packs === null || typeof o.packs !== "object" || Array.isArray(o.packs)) fail("packs must be an object");
  const packs: Record<string, string> = {};
  for (const [name, pin] of Object.entries(o.packs as Record<string, unknown>)) {
    if (name.length === 0) fail("pack name must be non-empty");
    if (typeof pin !== "string" || pin.length === 0) fail(`pack "${name}" pin must be a non-empty string (exact pins only)`);
    packs[name] = pin;
  }

  let capabilities: Record<string, unknown> = {};
  if (o.capabilities !== undefined) {
    if (o.capabilities === null || typeof o.capabilities !== "object" || Array.isArray(o.capabilities)) fail("capabilities must be an object");
    try {
      capabilities = structuredClone(o.capabilities) as Record<string, unknown>;
    } catch {
      fail("capabilities must be JSON-serializable");
    }
  }

  let vendored: VendoredEntry[] = [], managedRegions: ManagedRegionEntry[] = [], derivedCommitted: string[] = [];
  let resolutions: Record<string, Resolution> = {};
  let materializedCapabilities: Record<string, CapabilityReceipt> = {};
  if (o.materialized !== undefined) {
    if (o.materialized === null || typeof o.materialized !== "object") fail("materialized must be an object");
    const m = o.materialized as Record<string, unknown>;
    vendored = vendoredList(m.vendored);
    managedRegions = managedRegionList(m.managedRegions);
    derivedCommitted = strList(m.derivedCommitted, "materialized.derivedCommitted");
    resolutions = resolutionMap(m.resolutions);
    materializedCapabilities = capabilityReceiptMap(m.capabilities);
  }

  return {
    version: 1,
    registry: (o.registry as string | null | undefined) ?? null,
    target: { kind: target.kind, id: target.id },
    packs,
    capabilities,
    materialized: { vendored, managedRegions, derivedCommitted, resolutions, capabilities: materializedCapabilities },
  };
}

/** Canonical serialization of a generated harness.json: $schema first key (editor
 * validation/autocomplete against the published schema), 2-space indent, trailing newline.
 * Every writer of a harness.json file — CLI/agent (writeManifestFile) and portal install
 * PRs — goes through this, so the $schema key can never drift per-writer. */
export function serializeManifest(manifest: HarnessManifest): string {
  return JSON.stringify({ $schema: MANIFEST_SCHEMA_URL, ...manifest }, null, 2) + "\n";
}

/** Builds the manifest an install writes. If a `receipt` is supplied (hashed vendored files,
 * managed-region receipts, resolutions), it is used verbatim. Otherwise the receipt half is
 * derived from the file paths the materializer produced — entry files become managedRegions,
 * everything else vendored (sorted, deterministic), null hashes, no resolutions — this is the
 * S1 behavior, kept unchanged for callers that don't pass a receipt (e.g. install-job.ts). */
export function buildManifest(input: {
  target: HarnessManifest["target"];
  packs: Record<string, string>;
  registry?: string | null;
  capabilities?: Record<string, unknown>;
  materializedPaths?: string[];
  receipt?: HarnessManifest["materialized"];
}): HarnessManifest {
  const paths = [...(input.materializedPaths ?? [])].sort((a, b) => a.localeCompare(b));
  const materialized =
    input.receipt ??
    {
      vendored: paths.filter((p) => !isEntryFile(p)).map((p) => ({ path: p, sha256: null })),
      managedRegions: paths.filter((p) => isEntryFile(p)).map((p) => ({ path: p, regions: [] })),
      derivedCommitted: [],
      resolutions: {},
      capabilities: {},
    };
  return validateManifest({
    version: 1,
    registry: input.registry ?? null,
    target: input.target,
    packs: input.packs,
    capabilities: input.capabilities ?? {},
    materialized,
  });
}
