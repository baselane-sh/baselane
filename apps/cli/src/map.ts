import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  LocalDirFileSource,
  analyze,
  analyzeConventions,
  analyzeDesignTokens,
  buildImportGraph,
  renderArchitectureMd,
  renderDesignMd,
  DESIGN_REGION_ID,
  DESIGN_REGION_VERSION,
  SYSTEM_MAP_REGION_ID,
  SYSTEM_MAP_REGION_VERSION,
  type AnalysisProfile,
  type ConventionsReport,
  type DesignNarration,
  type DesignTokensReport,
  type NarrationSections,
} from "@baselane/analyze";
import { buildManifest, extractManagedRegions, mergeManagedRegion, sha256Hex } from "@baselane/packs";
import { readManifestWithFallback, targetLocation, writeManifestFile } from "@baselane/materialize";
import { assertInsideDir } from "./apply.ts";

export interface MapResult {
  profile: AnalysisProfile;
  conventions: ConventionsReport;
  tokens: DesignTokensReport;
  architectureMd: string; // the full merged ARCHITECTURE.md content
  designMd: string | null; // the full merged DESIGN.md content, or null when no UI surface
  written: string[];
}

export async function runMap(
  dir: string,
  opts: {
    dryRun?: boolean;
    narration?: NarrationSections | null;
    designNarration?: DesignNarration | null;
    excludes?: string[];
  } = {},
): Promise<MapResult> {
  const source = new LocalDirFileSource(dir, { excludes: opts.excludes });
  const [profile, graph, conventions, tokens] = await Promise.all([
    analyze(source),
    buildImportGraph(source),
    analyzeConventions(source),
    analyzeDesignTokens(source),
  ]);

  const archBody = renderArchitectureMd({ profile, graph, conventions, narration: opts.narration ?? null });
  const architectureMd = mergeManagedRegion(
    await readIfExists(join(dir, "ARCHITECTURE.md")),
    archBody,
    SYSTEM_MAP_REGION_ID,
    SYSTEM_MAP_REGION_VERSION,
  );

  let designMd: string | null = null;
  if (tokens.hasUiSurface) {
    const designBody = renderDesignMd({ tokens, narration: opts.designNarration ?? null });
    designMd = mergeManagedRegion(await readIfExists(join(dir, "DESIGN.md")), designBody, DESIGN_REGION_ID, DESIGN_REGION_VERSION);
  }

  const written: string[] = [];
  if (!opts.dryRun) {
    const outputs: Array<[string, string]> = [
      ["ARCHITECTURE.md", architectureMd],
      [".baselane/system-map/report.json", JSON.stringify({ profile, conventions, tokens }, null, 2) + "\n"],
    ];
    if (designMd !== null) outputs.push(["DESIGN.md", designMd]);
    for (const [rel, content] of outputs) {
      const abs = assertInsideDir(dir, rel);
      await mkdir(dirname(abs), { recursive: true });
      await writeFile(abs, content, "utf8");
      written.push(rel);
    }
    await recordMapRegionReceipts(dir, architectureMd, designMd);
  }
  return { profile, conventions, tokens, architectureMd, designMd, written };
}

/** Issue #1: capability outputs were invisible to drift — apply/map wrote ARCHITECTURE.md and
 * DESIGN.md but recorded nothing, so hand-edits or deletions never surfaced. Record their managed
 * regions into harness.json's managedRegions receipts (drift's regions loop already verifies any
 * path listed there). Region receipts, not whole-file hashes: prose the developer writes OUTSIDE
 * the region is theirs and must not flag. No-op when the target has no manifest yet — drift has
 * nothing to run against until an apply/install creates one. */
async function recordMapRegionReceipts(dir: string, architectureMd: string, designMd: string | null): Promise<void> {
  const loc = targetLocation({ global: false, dir });
  const { manifest: existing } = await readManifestWithFallback(loc);
  if (existing === null) return;

  const managed = new Map(existing.materialized.managedRegions.map((m) => [m.path, m]));
  const outputs: Array<[string, string]> = [["ARCHITECTURE.md", architectureMd]];
  if (designMd !== null) outputs.push(["DESIGN.md", designMd]);
  for (const [path, content] of outputs) {
    const regions = extractManagedRegions(content).map((r) => ({
      packId: r.packId,
      version: r.version,
      sha256: sha256Hex(r.body),
    }));
    if (regions.length === 0) continue;
    const regionIds = new Set(regions.map((r) => r.packId));
    const others = (managed.get(path)?.regions ?? []).filter((r) => !regionIds.has(r.packId));
    managed.set(path, { path, regions: [...others, ...regions] });
  }

  const manifest = buildManifest({
    target: loc.target,
    packs: existing.packs,
    registry: existing.registry,
    capabilities: existing.capabilities,
    receipt: {
      ...existing.materialized,
      managedRegions: [...managed.values()].sort((a, b) => a.path.localeCompare(b.path)),
    },
  });
  await writeManifestFile(loc.manifestPath, manifest);
}

/** Reads a file, returning null (not throwing) when it does not exist. */
async function readIfExists(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    return null;
  }
}

export function formatMapSummary(result: MapResult): string {
  const hidden = result.conventions.rules.filter((r) => !r.enforced).length;
  const design = result.tokens.hasUiSurface
    ? `Design tokens: ${result.tokens.colors.length} colors, ${result.tokens.fonts.length} fonts, ${result.tokens.radii.length} radii${result.written.includes("DESIGN.md") ? " — DESIGN.md written" : ""}`
    : "Design: no UI surface detected — DESIGN.md skipped";
  return [
    "baselane map",
    "",
    `Languages: ${result.profile.languages.join(", ") || "(none)"}`,
    `Conventions measured over ${result.conventions.sampledFiles} files — rules: ${result.conventions.rules.length} (${hidden} hidden), mixed: ${result.conventions.mixed.length}`,
    design,
    "",
    result.written.length > 0 ? `Wrote: ${result.written.join(", ")}` : "(dry-run — nothing written)",
  ].join("\n");
}
