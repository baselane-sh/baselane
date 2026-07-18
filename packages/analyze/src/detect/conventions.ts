import type { RepoFileSource } from "../types.ts";
import { isTestPath } from "./test-paths.ts";

export interface LintConfig {
  tool: string;
  path: string;
}

export interface ConventionFinding {
  id: string; // "indentation" | "quotes" | "semicolons" | "import-extensions" | "file-naming" | "test-placement"
  statement: string; // human sentence, e.g. 'Relative imports include the ".ts" extension'
  consistency: number; // 0..1, rounded to 2 decimals
  sampleSize: number; // units measured (files or import statements)
  enforced: boolean; // some config plausibly mandates it
  evidence: string; // e.g. "47/50 sampled files"
}

export interface ConventionsReport {
  version: 1;
  sampleCap: number;
  sampledFiles: number;
  lintConfigs: LintConfig[];
  /** consistency >= RULE_THRESHOLD. A rule with enforced:false is a "hidden rule". */
  rules: ConventionFinding[];
  mixed: ConventionFinding[];
  fileLength: { p50: number; p90: number } | null;
}

export const RULE_THRESHOLD = 0.9;
const MAX_FILE_BYTES = 64 * 1024;

const ROOT_CONFIGS: ReadonlyArray<{ tool: string; paths: readonly string[] }> = [
  { tool: "editorconfig", paths: [".editorconfig"] },
  { tool: "eslint", paths: [".eslintrc", ".eslintrc.json", ".eslintrc.js", ".eslintrc.cjs", ".eslintrc.yml", "eslint.config.js", "eslint.config.mjs", "eslint.config.cjs", "eslint.config.ts"] },
  { tool: "prettier", paths: [".prettierrc", ".prettierrc.json", ".prettierrc.yml", ".prettierrc.yaml", ".prettierrc.js", ".prettierrc.cjs", "prettier.config.js", "prettier.config.cjs", "prettier.config.mjs"] },
  { tool: "biome", paths: ["biome.json", "biome.jsonc"] },
  { tool: "ruff", paths: ["ruff.toml", ".ruff.toml"] },
  { tool: "flake8", paths: [".flake8"] },
];

async function detectLintConfigs(source: RepoFileSource, files: string[]): Promise<LintConfig[]> {
  const present = new Set(files);
  const found: LintConfig[] = [];
  for (const probe of ROOT_CONFIGS) {
    const hit = probe.paths.find((p) => present.has(p));
    if (hit) found.push({ tool: probe.tool, path: hit });
  }
  if (present.has("pyproject.toml")) {
    const text = (await source.readFile("pyproject.toml")) ?? "";
    if (text.includes("[tool.black]")) found.push({ tool: "black", path: "pyproject.toml" });
    if (text.includes("[tool.ruff]")) found.push({ tool: "ruff", path: "pyproject.toml" });
  }
  if (present.has("setup.cfg")) {
    const text = (await source.readFile("setup.cfg")) ?? "";
    if (text.includes("[flake8]")) found.push({ tool: "flake8", path: "setup.cfg" });
  }
  if (present.has("tsconfig.json")) {
    const text = (await source.readFile("tsconfig.json")) ?? "";
    if (/"strict"\s*:\s*true/.test(text)) found.push({ tool: "tsconfig-strict", path: "tsconfig.json" });
  }
  const seen = new Set<string>();
  return found
    .filter((c) => (seen.has(c.tool) ? false : (seen.add(c.tool), true)))
    .sort((a, b) => a.tool.localeCompare(b.tool));
}

const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".rb", ".go", ".rs", ".java", ".css", ".scss"]);
const JS_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

function ext(path: string): string {
  const dot = path.lastIndexOf(".");
  return dot === -1 ? "" : path.slice(dot);
}

interface Sample {
  path: string;
  content: string;
  lines: string[];
}

/** Majority vote over per-unit observations -> one finding (or null when nothing voted). */
function findingFromVotes(
  id: string,
  statements: Record<string, string>,
  votes: Map<string, number>,
  enforced: boolean,
  unit: string,
): ConventionFinding | null {
  let total = 0;
  let topKey: string | null = null;
  let topCount = 0;
  for (const [key, count] of votes) {
    total += count;
    if (count > topCount || (count === topCount && topKey !== null && key < topKey)) {
      topKey = key;
      topCount = count;
    }
  }
  if (topKey === null || total === 0) return null;
  return {
    id,
    statement: statements[topKey],
    consistency: Math.round((topCount / total) * 100) / 100,
    sampleSize: total,
    enforced,
    evidence: `${topCount}/${total} sampled ${unit}`,
  };
}

function measureIndentation(samples: Sample[]): Map<string, number> {
  const votes = new Map<string, number>();
  for (const s of samples) {
    let tabs = 0;
    let two = 0;
    let four = 0;
    for (const line of s.lines) {
      if (line.startsWith("\t")) tabs++;
      else if (line.startsWith("    ")) four++;
      else if (line.startsWith("  ")) two++;
    }
    const top = Math.max(tabs, two, four);
    if (top === 0) continue;
    const key = top === tabs ? "tabs" : top === two ? "2-space" : "4-space";
    votes.set(key, (votes.get(key) ?? 0) + 1);
  }
  return votes;
}

function measureQuotes(samples: Sample[]): Map<string, number> {
  const votes = new Map<string, number>();
  for (const s of samples) {
    if (!JS_EXTS.has(ext(s.path))) continue;
    const doubles = (s.content.match(/"[^"\n]*"/g) ?? []).length;
    const singles = (s.content.match(/'[^'\n]*'/g) ?? []).length;
    if (doubles === singles) continue;
    const key = doubles > singles ? "double" : "single";
    votes.set(key, (votes.get(key) ?? 0) + 1);
  }
  return votes;
}

function measureSemicolons(samples: Sample[]): Map<string, number> {
  const votes = new Map<string, number>();
  const stmt = /^\s*(const |let |var |return |import |export const |export let )/;
  for (const s of samples) {
    if (!JS_EXTS.has(ext(s.path))) continue;
    let ends = 0;
    let bare = 0;
    for (const line of s.lines) {
      if (!stmt.test(line)) continue;
      const trimmed = line.trimEnd();
      if (trimmed.endsWith(";")) ends++;
      else if (!trimmed.endsWith("{") && !trimmed.endsWith("(") && !trimmed.endsWith(",")) bare++;
    }
    if (ends === bare) continue;
    votes.set(ends > bare ? "semis" : "no-semis", (votes.get(ends > bare ? "semis" : "no-semis") ?? 0) + 1);
  }
  return votes;
}

function measureImportExtensions(samples: Sample[]): Map<string, number> {
  const votes = new Map<string, number>();
  const importRe = /from\s+["'](\.[^"']+)["']/g;
  for (const s of samples) {
    if (!JS_EXTS.has(ext(s.path))) continue;
    for (const match of s.content.matchAll(importRe)) {
      const spec = match[1];
      const key = /\.[a-z]+$/.test(spec) ? "with-extension" : "bare";
      votes.set(key, (votes.get(key) ?? 0) + 1);
    }
  }
  return votes;
}

function caseClass(base: string): string | null {
  const name = base.replace(/\.[^.]*$/, "").replace(/\.(test|spec)$/, "");
  if (name === "" || /^[0-9]/.test(name) || name.toUpperCase() === name) return null;
  if (/^[a-z0-9]+(-[a-z0-9]+)+$/.test(name)) return "kebab-case";
  if (/^[a-z0-9]+(_[a-z0-9]+)+$/.test(name)) return "snake_case";
  if (/^[a-z]+[A-Z]/.test(name)) return "camelCase";
  if (/^[A-Z][a-z]/.test(name)) return "PascalCase";
  if (/^[a-z0-9]+$/.test(name)) return "single-word";
  return null;
}

function measureFileNaming(sourcePaths: string[]): Map<string, number> {
  const votes = new Map<string, number>();
  for (const path of sourcePaths) {
    const base = path.split("/").pop() ?? path;
    const cls = caseClass(base);
    if (cls === null || cls === "single-word") continue; // single words fit every convention — no signal
    votes.set(cls, (votes.get(cls) ?? 0) + 1);
  }
  return votes;
}


function measureTestPlacement(allPaths: string[]): { placement: Map<string, number>; suffix: Map<string, number> } {
  const placement = new Map<string, number>();
  const suffix = new Map<string, number>();
  for (const path of allPaths) {
    if (!isTestPath(path) || !SOURCE_EXTS.has(ext(path))) continue;
    const inTestDir = /(^|\/)(__tests__|tests?)\//.test(path);
    placement.set(inTestDir ? "test-dir" : "colocated", (placement.get(inTestDir ? "test-dir" : "colocated") ?? 0) + 1);
    if (/\.test\.[a-z]+$/.test(path)) suffix.set("test", (suffix.get("test") ?? 0) + 1);
    else if (/\.spec\.[a-z]+$/.test(path)) suffix.set("spec", (suffix.get("spec") ?? 0) + 1);
  }
  return { placement, suffix };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

export async function analyzeConventions(
  source: RepoFileSource,
  opts: { sampleCap?: number } = {},
): Promise<ConventionsReport> {
  const sampleCap = opts.sampleCap ?? 200;
  const files = await source.listFiles();
  const lintConfigs = await detectLintConfigs(source, files);
  const tools = new Set(lintConfigs.map((c) => c.tool));
  const formattingEnforced = tools.has("prettier") || tools.has("biome") || tools.has("editorconfig");

  const sourcePaths = files.filter((f) => SOURCE_EXTS.has(ext(f)));
  const samples: Sample[] = [];
  for (const path of sourcePaths) {
    if (samples.length >= sampleCap) break;
    const content = await source.readFile(path);
    if (content === null || content.length > MAX_FILE_BYTES || content.includes("\x00")) continue;
    samples.push({ path, content, lines: content.split("\n") });
  }

  // eslint config text is only greppable when it's a readable root file; used to decide
  // whether the import-extension / naming conventions are config-enforced.
  const eslintPath = lintConfigs.find((c) => c.tool === "eslint")?.path;
  const eslintText = eslintPath ? ((await source.readFile(eslintPath)) ?? "") : "";

  const candidates: Array<ConventionFinding | null> = [
    findingFromVotes(
      "indentation",
      { tabs: "Indentation is tabs", "2-space": "Indentation is 2 spaces", "4-space": "Indentation is 4 spaces" },
      measureIndentation(samples),
      formattingEnforced,
      "files",
    ),
    findingFromVotes(
      "quotes",
      { double: "Strings use double quotes", single: "Strings use single quotes" },
      measureQuotes(samples),
      formattingEnforced,
      "files",
    ),
    findingFromVotes(
      "semicolons",
      { semis: "Statements end with semicolons", "no-semis": "Statements omit semicolons" },
      measureSemicolons(samples),
      formattingEnforced,
      "files",
    ),
    findingFromVotes(
      "import-extensions",
      {
        "with-extension": 'Relative imports include the file extension (e.g. "./x.ts")',
        bare: "Relative imports omit the file extension",
      },
      measureImportExtensions(samples),
      eslintText.includes("import/extensions"),
      "import statements",
    ),
    findingFromVotes(
      "file-naming",
      {
        "kebab-case": "Source files are named in kebab-case",
        camelCase: "Source files are named in camelCase",
        PascalCase: "Source files are named in PascalCase",
        snake_case: "Source files are named in snake_case",
      },
      measureFileNaming(sourcePaths),
      eslintText.includes("unicorn/filename-case") || eslintText.includes("check-file/"),
      "files",
    ),
  ];

  const { placement, suffix } = measureTestPlacement(files);
  const placementFinding = findingFromVotes(
    "test-placement",
    { "test-dir": "Tests live in a dedicated test directory", colocated: "Tests are colocated with source files" },
    placement,
    false,
    "test files",
  );
  if (placementFinding) {
    const suffixFinding = findingFromVotes("s", { test: "test", spec: "spec" }, suffix, false, "test files");
    if (suffixFinding && suffixFinding.consistency >= RULE_THRESHOLD) {
      candidates.push({
        ...placementFinding,
        statement: `${placementFinding.statement} and are named "*.${suffixFinding.statement}.*"`,
      });
    } else {
      candidates.push(placementFinding);
    }
  }

  const findings = candidates.filter((f): f is ConventionFinding => f !== null);
  const lineCounts = samples
    .map((s) => (s.content.endsWith("\n") ? s.lines.length - 1 : s.lines.length))
    .sort((a, b) => a - b);

  return {
    version: 1,
    sampleCap,
    sampledFiles: samples.length,
    lintConfigs,
    rules: findings.filter((f) => f.consistency >= RULE_THRESHOLD),
    mixed: findings.filter((f) => f.consistency < RULE_THRESHOLD),
    fileLength: lineCounts.length > 0 ? { p50: percentile(lineCounts, 50), p90: percentile(lineCounts, 90) } : null,
  };
}
