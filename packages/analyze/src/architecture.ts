import type { AnalysisProfile } from "./types.ts";
import type { ImportGraph } from "./import-graph.ts";
import type { ConventionsReport, ConventionFinding } from "./detect/conventions.ts";
import type { AuditFacts } from "./ai-audit.ts";

export const SYSTEM_MAP_REGION_ID = "system-map";
export const SYSTEM_MAP_REGION_VERSION = "1";

export interface NarrationSections {
  overview: string;
  hypothesizedRules: string[];
}

export interface ArchitectureInput {
  profile: AnalysisProfile;
  graph: ImportGraph;
  conventions: ConventionsReport;
  narration?: NarrationSections | null;
}

const NARRATION_CAP = 8000;

/** Defends mergeManagedRegion integrity: AI text must never smuggle region markers in. */
export function sanitizeNarration(text: string): string {
  return text
    .split("\n")
    .filter((line) => !line.includes("baselane:start") && !line.includes("baselane:end"))
    .join("\n")
    .trim()
    .slice(0, NARRATION_CAP);
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function findingLine(f: ConventionFinding): string {
  const label = f.enforced ? "enforced" : "unwritten rule";
  const evidenceParts = f.evidence.split("/");
  const evidenceDesc = evidenceParts.length > 1 ? evidenceParts[1] : f.evidence;
  const line = `${f.statement} (${label} · ${pct(f.consistency)} of ${evidenceDesc})`;
  return f.enforced ? `- ${line}` : `- **Hidden rule** — ${line}`;
}

function topFanIn(graph: ImportGraph, limit: number): Array<[string, number]> {
  const fanIn = new Map<string, number>();
  for (const e of graph.edges) fanIn.set(e.to, (fanIn.get(e.to) ?? 0) + 1);
  return [...fanIn.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit);
}

export function renderArchitectureMd(input: ArchitectureInput): string {
  const { profile, graph, conventions, narration } = input;
  const lines: string[] = [];

  lines.push("## Overview", "");
  lines.push(`- Languages: ${profile.languages.join(", ") || "(none detected)"}`);
  lines.push(`- Package manager: ${profile.packageManager ?? "(none detected)"}`);
  lines.push(`- Layout: ${profile.layout}`);
  const frameworks = profile.frameworks.map((f) => (f.version ? `${f.name} ${f.version}` : f.name));
  lines.push(`- Frameworks: ${frameworks.join(", ") || "(none detected)"}`);

  lines.push("", "## Commands", "");
  lines.push(`- Build: ${profile.commands.build ?? "(not detected)"}`);
  lines.push(`- Test: ${profile.commands.test ?? "(not detected)"}`);
  lines.push(`- Lint: ${profile.commands.lint ?? "(not detected)"}`);

  const modules = graph.nodes.filter((n) => n.kind === "module").length;
  const externals = graph.nodes.filter((n) => n.kind === "external").length;
  lines.push("", "## Import graph", "");
  lines.push(`${modules} modules, ${externals} external packages, ${graph.edges.length} edges.`);
  const top = topFanIn(graph, 5);
  if (top.length > 0) {
    lines.push("", "Most depended-on modules:");
    for (const [id, count] of top) lines.push(`- ${id} (${count} dependents)`);
  }

  lines.push("", "## Conventions & hidden rules", "");
  lines.push(
    conventions.lintConfigs.length > 0
      ? `Configured tooling: ${conventions.lintConfigs.map((c) => `${c.tool} (${c.path})`).join(", ")}.`
      : "No lint/format tooling configured — every consistent convention below is unwritten.",
  );
  lines.push(`Measured over ${conventions.sampledFiles} sampled files (cap ${conventions.sampleCap}).`, "");
  if (conventions.rules.length > 0) {
    for (const rule of conventions.rules) lines.push(findingLine(rule));
  } else {
    lines.push("- (no >=90%-consistent conventions detected)");
  }
  if (conventions.fileLength) {
    lines.push(`- File length: p50 ${conventions.fileLength.p50} lines, p90 ${conventions.fileLength.p90} lines`);
  }
  if (conventions.mixed.length > 0) {
    lines.push("", "### Mixed signals", "");
    for (const m of conventions.mixed) lines.push(`- ${m.statement} — only ${pct(m.consistency)} consistent`);
  }

  if (narration) {
    lines.push("", "## Architecture notes (AI-generated)", "");
    lines.push(sanitizeNarration(narration.overview));
    if (narration.hypothesizedRules.length > 0) {
      lines.push("", "### AI-hypothesized rules (verify before relying on them)", "");
      for (const rule of narration.hypothesizedRules) lines.push(`- ${sanitizeNarration(rule)}`);
    }
  }

  return lines.join("\n") + "\n";
}

export function renderArchitectureDoc(input: {
  repo: string;
  facts: AuditFacts;
  auditBody: string | null;
  degradeReason?: string;
}): string {
  const f = input.facts;
  const g = f.importGraph;
  const header = [
    `# System map — ${input.repo}`,
    "",
    "## Facts",
    `- Languages: ${f.languages.join(", ") || "(none detected)"}`,
    `- Frameworks: ${f.frameworks.join(", ") || "(none detected)"}`,
    `- Package manager: ${f.packageManager ?? "(none detected)"}`,
    `- Commands: build=${f.commands.build ?? "—"}, test=${f.commands.test ?? "—"}, lint=${f.commands.lint ?? "—"}`,
    `- Tooling: ${f.lintTools.join(", ") || "(none detected)"}${f.hasCI ? " · CI" : ""}${f.hasTestSuite ? " · tests" : ""}`,
    `- Import graph: ${g.modules} modules, ${g.externals} external packages, ${g.edges} edges`,
  ].join("\n");

  if (input.auditBody) {
    const marker = "> _The analysis below was generated by an AI Principal-Engineer audit — review before relying on it._";
    return `${header}\n\n---\n\n${marker}\n\n${input.auditBody}\n`;
  }
  return `${header}\n\n> AI audit unavailable — ${input.degradeReason ?? "analysis error"}. Deterministic facts only.\n`;
}
