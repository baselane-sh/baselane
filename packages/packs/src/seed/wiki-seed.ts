import {
  analyze,
  analyzeConventions,
  analyzeDesignTokens,
  buildImportGraph,
  narrateArchitecture,
  pickSamples,
  type AnalysisProfile,
  type DesignTokensReport,
  type ImportGraph,
  type NarrationSections,
  type RepoFileSource,
} from "@baselane/analyze";
import type { FileMap } from "../types.ts";

export interface WikiSeedOptions {
  /** ISO date (YYYY-MM-DD) stamped into the OKF change log — injected so the seed is deterministic. */
  date: string;
  /** When present, the architecture page gets an AI-narrated overview + hypothesized rules (via the
   * same narrateArchitecture path the system map uses). Absent ⇒ the deterministic static seed only. */
  ai?: { apiKey: string; fetchImpl?: typeof fetch };
}

const TOP_HUBS = 5;

/**
 * A queryable, OKF-formatted seed for `.baselane/wiki/`, computed centrally from static analysis:
 * an index, one architecture page grounded in the repo's real languages/commands/module hotspots,
 * and a change log. This is the missing central compute for the `wiki` capability (system-map,
 * graph, and design already have theirs) — the "narrateWiki" of the central-compute→push design.
 *
 * It is a *starting point* an agent (or the `second-brain` librarian) grows, never the whole
 * knowledge base — everything here is derived from the code, nothing is fabricated. Returns leaf
 * paths under `wiki/`; the caller prefixes `.baselane/` for the repo surface.
 */
export async function buildWikiSeed(source: RepoFileSource, opts: WikiSeedOptions): Promise<FileMap> {
  const [profile, graph, design] = await Promise.all([analyze(source), buildImportGraph(source), analyzeDesignTokens(source)]);
  let narration: NarrationSections | null = null;
  if (opts.ai) {
    const [conventions, samples] = await Promise.all([analyzeConventions(source), pickSamples(source)]);
    narration = await narrateArchitecture({ profile, conventions, samples }, { apiKey: opts.ai.apiKey, fetchImpl: opts.ai.fetchImpl });
  }
  const files: FileMap = {
    "wiki/index.md": renderIndex(design.hasUiSurface),
    "wiki/architecture.md": renderArchitecturePage(profile, graph, narration),
    "wiki/log.md": renderLog(opts.date, design.hasUiSurface),
  };
  // OKF is one-concept-per-file: the design system gets its own page, only when there's a UI surface.
  if (design.hasUiSurface) files["wiki/design.md"] = renderDesignPage(design);
  return files;
}

function renderIndex(hasDesign: boolean): string {
  const lines = [
    "# Wiki index",
    "",
    "One line per page — scan this before opening any page. Add a line here whenever you create a page.",
    "",
    "- [Architecture overview](architecture.md) — languages, commands, and module hotspots (seeded from static analysis)",
  ];
  if (hasDesign) lines.push("- [Design](design.md) — UI frameworks and design tokens (colors, fonts, radii, spacing)");
  lines.push("");
  return lines.join("\n");
}

/** Modules ranked by in-degree (how many modules import them) — the architectural centers of gravity. */
function topHubs(graph: ImportGraph): Array<{ id: string; inDegree: number }> {
  const moduleIds = new Set(graph.nodes.filter((n) => n.kind === "module").map((n) => n.id));
  const inDegree = new Map<string, number>();
  for (const e of graph.edges) {
    if (moduleIds.has(e.to)) inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
  }
  return [...inDegree.entries()]
    .map(([id, inDeg]) => ({ id, inDegree: inDeg }))
    .sort((a, b) => b.inDegree - a.inDegree || a.id.localeCompare(b.id))
    .slice(0, TOP_HUBS);
}

function renderArchitecturePage(profile: AnalysisProfile, graph: ImportGraph, narration: NarrationSections | null): string {
  const frameworks = profile.frameworks.map((f) => (f.version ? `${f.name} ${f.version}` : f.name));
  const hubs = topHubs(graph);
  const lines = [
    "---",
    "type: How-it-works",
    "title: Architecture overview",
    "description: Seeded from static analysis — languages, commands, and module hotspots.",
    "---",
    "",
    "This page was seeded from static analysis when the second brain was set up. Treat it as a",
    "starting point: correct it and split out new pages as you learn how this project actually works.",
    "",
  ];
  if (narration) {
    lines.push("## Overview", "", narration.overview, "");
    if (narration.hypothesizedRules.length) {
      lines.push("## Hypothesized conventions", "", "AI-suggested from the samples — verify before relying on them:", "");
      for (const r of narration.hypothesizedRules) lines.push(`- ${r}`);
      lines.push("");
    }
  }
  lines.push(
    "## Stack",
    "",
    `- Languages: ${profile.languages.join(", ") || "(none detected)"}`,
    `- Package manager: ${profile.packageManager ?? "(none detected)"}`,
    `- Frameworks: ${frameworks.join(", ") || "(none detected)"}`,
    `- Layout: ${profile.layout}`,
    "",
    "## Commands",
    "",
    `- Build: ${profile.commands.build ?? "(not detected)"}`,
    `- Test: ${profile.commands.test ?? "(not detected)"}`,
    `- Lint: ${profile.commands.lint ?? "(not detected)"}`,
    "",
    "## Module hotspots",
    "",
  );
  if (hubs.length === 0) {
    lines.push("No internal import edges detected — this repo has no resolvable module graph yet.");
  } else {
    lines.push("The most-imported modules (by in-degree) — likely the architectural centers of gravity:");
    lines.push("");
    for (const h of hubs) lines.push(`- \`${h.id}\` — imported by ${h.inDegree} module${h.inDegree === 1 ? "" : "s"}`);
  }
  lines.push("");
  return lines.join("\n");
}

const MAX_LISTED = 8;

function renderDesignPage(design: DesignTokensReport): string {
  const list = (label: string, items: string[]): string =>
    items.length ? `- ${label}: ${items.slice(0, MAX_LISTED).join(", ")}${items.length > MAX_LISTED ? ", …" : ""}` : `- ${label}: (none detected)`;
  return [
    "---",
    "type: How-it-works",
    "title: Design",
    "description: Seeded from static analysis — UI frameworks and design tokens.",
    "---",
    "",
    "This project has a UI surface. Seeded design facts below — correct and extend them as the design",
    "system evolves; pair with the repo's DESIGN.md if the design capability is also enabled.",
    "",
    "## UI frameworks",
    "",
    design.frameworks.length ? design.frameworks.map((f) => `- ${f}`).join("\n") : "(none detected)",
    "",
    "## Tokens",
    "",
    list("Colors", design.colors.map((c) => `${c.name} ${c.value}`)),
    list("Fonts", design.fonts),
    list("Radii", design.radii),
    list("Spacing", design.spacing),
    `- Custom properties: ${design.customPropertyCount}`,
    "",
  ].join("\n");
}

function renderLog(date: string, hasDesign: boolean): string {
  const subject = hasDesign ? "architecture.md, design.md" : "architecture.md";
  const detail = hasDesign
    ? "Seeded the wiki from static analysis (languages, commands, module hotspots, design tokens)."
    : "Seeded the wiki from static analysis (languages, commands, module hotspots).";
  return [
    "# Change log",
    "",
    "Append-only. One entry per change; never rewrite a line once added.",
    "",
    `## [${date}] ingest | ${subject}`,
    detail,
    "",
  ].join("\n");
}
