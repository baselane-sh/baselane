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
import { mergeManagedRegion } from "@baselane/packs";
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
  opts: { dryRun?: boolean; narration?: NarrationSections | null; designNarration?: DesignNarration | null } = {},
): Promise<MapResult> {
  const source = new LocalDirFileSource(dir);
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
  }
  return { profile, conventions, tokens, architectureMd, designMd, written };
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
