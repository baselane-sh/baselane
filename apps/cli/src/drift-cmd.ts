import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { extractManagedRegions, sha256Hex } from "@baselane/packs";
import { readManifestWithFallback, targetLocation } from "@baselane/materialize";

export type PathDriftStatus = "ok" | "modified" | "missing" | "no-hash-recorded";
export type RegionDriftStatus = "ok" | "region-missing" | "version-drift" | "content-drift" | "file-missing";

export interface DriftReport {
  manifestPath: string;
  vendored: Array<{ path: string; status: PathDriftStatus }>;
  regions: Array<{ path: string; packId: string; pinnedVersion: string; status: RegionDriftStatus }>;
  capabilities: Array<{ capability: string; path: string; status: PathDriftStatus }>;
  unreadable: string[];
  clean: boolean;
}

/** null = absent (ENOENT/ENOTDIR); "unreadable" recorded by the caller on any other error. */
async function readOrClassify(abs: string, rel: string, unreadable: string[]): Promise<string | null> {
  try {
    return await readFile(abs, "utf8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") return null;
    unreadable.push(rel);
    return null;
  }
}

export async function runDrift(opts: { global: boolean; dir?: string; homeDir?: string }): Promise<DriftReport> {
  const loc = targetLocation({ global: opts.global, dir: opts.dir, homeDir: opts.homeDir });
  const { manifest } = await readManifestWithFallback(loc);
  if (manifest === null) throw new Error(`drift: no harness.json at ${loc.manifestPath} — run baselane apply or install first`);

  const unreadable: string[] = [];
  const vendored: DriftReport["vendored"] = [];
  for (const entry of manifest.materialized.vendored) {
    const before = unreadable.length;
    const current = await readOrClassify(join(loc.targetDir, entry.path), entry.path, unreadable);
    if (unreadable.length > before) continue; // reported, not statused
    const status: PathDriftStatus =
      current === null ? "missing"
      : entry.sha256 === null ? "no-hash-recorded"
      : sha256Hex(current) === entry.sha256 ? "ok"
      : "modified";
    vendored.push({ path: entry.path, status });
  }

  const regions: DriftReport["regions"] = [];
  for (const entry of manifest.materialized.managedRegions) {
    const before = unreadable.length;
    const current = await readOrClassify(join(loc.targetDir, entry.path), entry.path, unreadable);
    if (unreadable.length > before) continue;
    const found = current === null ? [] : extractManagedRegions(current);
    for (const receipt of entry.regions) {
      const region = found.find((r) => r.packId === receipt.packId);
      const status: RegionDriftStatus =
        current === null ? "file-missing"
        : !region ? "region-missing"
        : region.version !== receipt.version ? "version-drift"
        : sha256Hex(region.body) !== receipt.sha256 ? "content-drift"
        : "ok";
      regions.push({ path: entry.path, packId: receipt.packId, pinnedVersion: receipt.version, status });
    }
  }

  // Capability receipts (M4: committed-vs-cache split) — same hash-compare as vendored, reported
  // under the capability's name. sha256 is always recorded on a receipt path (unlike legacy
  // vendored entries), so no "no-hash-recorded" case here. Legacy manifests normalize
  // materialized.capabilities to {} (validateManifest), so this loop is a no-op for them.
  const capabilities: DriftReport["capabilities"] = [];
  for (const [capability, receipt] of Object.entries(manifest.materialized.capabilities)) {
    for (const entry of receipt.paths) {
      const before = unreadable.length;
      const current = await readOrClassify(join(loc.targetDir, entry.path), entry.path, unreadable);
      if (unreadable.length > before) continue;
      const status: PathDriftStatus = current === null ? "missing" : sha256Hex(current) === entry.sha256 ? "ok" : "modified";
      capabilities.push({ capability, path: entry.path, status });
    }
  }

  const clean =
    unreadable.length === 0 &&
    vendored.every((v) => v.status === "ok") &&
    regions.every((r) => r.status === "ok") &&
    capabilities.every((c) => c.status === "ok");
  return { manifestPath: loc.manifestPath, vendored, regions, capabilities, unreadable, clean };
}

export function formatDriftReport(r: DriftReport): string {
  if (r.clean) return `baselane drift: clean (${r.vendored.length} vendored file(s), ${r.regions.length} region(s) verified)`;
  const lines = [`baselane drift: DRIFT DETECTED (${r.manifestPath})`];
  for (const v of r.vendored) {
    if (v.status === "ok") continue;
    lines.push(v.status === "no-hash-recorded"
      ? `  ~ ${v.path}: no hash recorded (pre-M2 install) — reinstall to record hashes`
      : `  ! ${v.path}: ${v.status}`);
  }
  for (const g of r.regions) {
    if (g.status === "ok") continue;
    lines.push(`  ! ${g.path} [${g.packId}@${g.pinnedVersion}]: ${g.status}`);
  }
  for (const c of r.capabilities) {
    if (c.status === "ok") continue;
    lines.push(`  ! ${c.path} [capability:${c.capability}]: ${c.status}`);
  }
  for (const u of r.unreadable) lines.push(`  ? ${u}: unreadable — skipped (fix permissions and re-run)`);
  return lines.join("\n");
}
