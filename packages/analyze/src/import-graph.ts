import { posix } from "node:path";
import type { RepoFileSource } from "./types.ts";

export interface ImportGraphNode {
  /** Repo-relative POSIX path for a module, or `pkg:<name>` for an external package. */
  id: string;
  kind: "module" | "external";
  language?: string;
}

export interface ImportGraphEdge {
  from: string;
  to: string;
  kind: "import" | "require" | "export-from";
  confidence: "extracted";
}

export interface ImportGraph {
  version: 1;
  generated: string;
  nodes: ImportGraphNode[];
  edges: ImportGraphEdge[];
}

const LANG_BY_EXT: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".py": "python",
  ".go": "go",
};

const JS_TS_EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

function extOf(path: string): string {
  const dot = path.lastIndexOf(".");
  const slash = path.lastIndexOf("/");
  return dot > slash ? path.slice(dot) : "";
}

function languageOf(path: string): string | undefined {
  return LANG_BY_EXT[extOf(path)];
}

interface RawEdge {
  to: string;
  kind: ImportGraphEdge["kind"];
}

/** Line-lexical import extraction for one file, keyed by its detected language. */
function extractEdges(language: string, content: string): RawEdge[] {
  if (language === "typescript" || language === "javascript") return extractJsTsEdges(content);
  if (language === "python") return extractPythonEdges(content);
  if (language === "go") return extractGoEdges(content);
  return [];
}

/** Strips `//` line comments and tracks `/* *\/` block comments across lines (best-effort). */
function stripCommentLines(content: string, lineCommentPrefix: string): string[] {
  const lines = content.split("\n");
  const out: string[] = [];
  let inBlock = false;
  for (let line of lines) {
    if (inBlock) {
      const end = line.indexOf("*/");
      if (end === -1) {
        out.push("");
        continue;
      }
      line = line.slice(end + 2);
      inBlock = false;
    }
    const blockStart = line.indexOf("/*");
    if (blockStart !== -1) {
      const blockEnd = line.indexOf("*/", blockStart + 2);
      if (blockEnd === -1) {
        line = line.slice(0, blockStart);
        inBlock = true;
      } else {
        line = line.slice(0, blockStart) + line.slice(blockEnd + 2);
      }
    }
    const trimmed = line.trimStart();
    out.push(trimmed.startsWith(lineCommentPrefix) ? "" : line);
  }
  return out;
}

const IMPORT_FROM_RE = /^\s*import\b[^'"]*from\s*['"]([^'"]+)['"]/;
const IMPORT_SIDE_EFFECT_RE = /^\s*import\s*['"]([^'"]+)['"]/;
const EXPORT_FROM_RE = /^\s*export\b[^'"]*from\s*['"]([^'"]+)['"]/;
const REQUIRE_RE = /require\(\s*['"]([^'"]+)['"]\s*\)/g;

function extractJsTsEdges(content: string): RawEdge[] {
  const edges: RawEdge[] = [];
  for (const line of stripCommentLines(content, "//")) {
    const exportMatch = EXPORT_FROM_RE.exec(line);
    if (exportMatch) {
      edges.push({ to: exportMatch[1], kind: "export-from" });
      continue;
    }
    const importMatch = IMPORT_FROM_RE.exec(line) ?? IMPORT_SIDE_EFFECT_RE.exec(line);
    if (importMatch) {
      edges.push({ to: importMatch[1], kind: "import" });
      continue;
    }
    for (const m of line.matchAll(REQUIRE_RE)) edges.push({ to: m[1], kind: "require" });
  }
  return edges;
}

const PY_IMPORT_RE = /^\s*import\s+(.+)$/;
const PY_FROM_IMPORT_RE = /^\s*from\s+(\.*[\w.]*)\s+import\b/;

function extractPythonEdges(content: string): RawEdge[] {
  const edges: RawEdge[] = [];
  for (const line of stripCommentLines(content, "#")) {
    const fromMatch = PY_FROM_IMPORT_RE.exec(line);
    if (fromMatch) {
      edges.push({ to: fromMatch[1], kind: "import" });
      continue;
    }
    const importMatch = PY_IMPORT_RE.exec(line);
    if (importMatch) {
      for (const part of importMatch[1].split(",")) {
        const name = part.trim().split(/\s+as\s+/)[0].trim();
        if (name) edges.push({ to: name, kind: "import" });
      }
    }
  }
  return edges;
}

const GO_QUOTED_RE = /"([^"]+)"/;

function extractGoEdges(content: string): RawEdge[] {
  const edges: RawEdge[] = [];
  let inBlock = false;
  for (const rawLine of stripCommentLines(content, "//")) {
    const line = rawLine.trim();
    if (!inBlock) {
      const blockStart = /^import\s*\($/.exec(line);
      if (blockStart) {
        inBlock = true;
        continue;
      }
      const single = /^import\s+(?:\w+\s+)?"([^"]+)"/.exec(line);
      if (single) edges.push({ to: single[1], kind: "import" });
      continue;
    }
    if (line === ")") {
      inBlock = false;
      continue;
    }
    const m = GO_QUOTED_RE.exec(line);
    if (m) edges.push({ to: m[1], kind: "import" });
  }
  return edges;
}

/** Candidate paths to try resolving a relative TS/JS specifier against the known file set. */
function jsTsCandidates(resolved: string): string[] {
  if (JS_TS_EXTS.includes(extOf(resolved))) return [resolved];
  const candidates = [resolved];
  for (const ext of JS_TS_EXTS) candidates.push(resolved + ext);
  for (const ext of JS_TS_EXTS) candidates.push(`${resolved}/index${ext}`);
  return candidates;
}

function pythonCandidates(resolved: string): string[] {
  return [resolved, `${resolved}.py`, `${resolved}/__init__.py`];
}

/** External-package name for a bare (non-relative) TS/JS specifier: scope/name or first segment. */
function jsTsPackageName(specifier: string): string {
  const segments = specifier.split("/");
  if (specifier.startsWith("@")) return segments.slice(0, 2).join("/");
  return segments[0];
}

class Resolver {
  private readonly known: Set<string>;

  constructor(files: string[]) {
    this.known = new Set(files);
  }

  /** Resolves one edge target to a node id, given the importing file's path and language. */
  resolve(fromPath: string, specifier: string, language: string): string {
    const isRelative = specifier.startsWith(".");
    if (!isRelative) {
      if (language === "go") return `pkg:${specifier}`;
      if (language === "python") return `pkg:${specifier.split(".")[0]}`;
      return `pkg:${jsTsPackageName(specifier)}`;
    }
    if (language === "python") return this.resolvePython(fromPath, specifier);
    const dir = posix.dirname(fromPath);
    const joined = posix.normalize(posix.join(dir, specifier));
    for (const candidate of jsTsCandidates(joined)) {
      if (this.known.has(candidate)) return candidate;
    }
    return joined;
  }

  // Python's leading dots count package levels up from the importing file's own directory
  // (one dot = that directory itself), which is not the same walk as a JS "./"/".." specifier.
  private resolvePython(fromPath: string, specifier: string): string {
    const [, dots, remainder] = /^(\.+)(.*)$/.exec(specifier) ?? [, ".", ""];
    let dir = posix.dirname(fromPath);
    for (let i = 1; i < dots.length; i++) dir = posix.dirname(dir);
    const joined = remainder ? posix.normalize(posix.join(dir, remainder.split(".").join("/"))) : dir;
    for (const candidate of pythonCandidates(joined)) {
      if (this.known.has(candidate)) return candidate;
    }
    return joined;
  }
}

function sortNodes(nodes: ImportGraphNode[]): ImportGraphNode[] {
  return [...nodes].sort((a, b) => a.id.localeCompare(b.id));
}

function sortEdges(edges: ImportGraphEdge[]): ImportGraphEdge[] {
  return [...edges].sort(
    (a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || a.kind.localeCompare(b.kind),
  );
}

/** Zero-dep, line-lexical module-dependency graph: TS/JS/Python/Go, relative-resolved, deterministic.
 * `opts.maxFiles`, when set, bounds the scan to the first N scannable files (listFiles() is
 * already sorted, so this is deterministic) — for a RepoFileSource backed by one HTTP call per
 * file (e.g. GithubFileSource), this bounds an otherwise-unbounded sequential fan-out. Unset
 * (the default) scans every scannable file, matching prior behavior exactly. */
export async function buildImportGraph(source: RepoFileSource, opts?: { maxFiles?: number }): Promise<ImportGraph> {
  const files = await source.listFiles();
  const allScannable = files.filter((f) => languageOf(f) !== undefined).sort();
  const scannable = opts?.maxFiles !== undefined ? allScannable.slice(0, opts.maxFiles) : allScannable;
  const resolver = new Resolver(files);

  const nodeById = new Map<string, ImportGraphNode>();
  for (const file of scannable) nodeById.set(file, { id: file, kind: "module", language: languageOf(file) });

  const edgeKey = new Set<string>();
  const edges: ImportGraphEdge[] = [];

  for (const file of scannable) {
    const language = languageOf(file)!;
    const content = await source.readFile(file);
    if (content === null) continue;
    for (const raw of extractEdges(language, content)) {
      const to = resolver.resolve(file, raw.to, language);
      if (!nodeById.has(to)) {
        nodeById.set(to, to.startsWith("pkg:") ? { id: to, kind: "external" } : { id: to, kind: "module" });
      }
      const key = `${file} ${to} ${raw.kind}`;
      if (edgeKey.has(key)) continue;
      edgeKey.add(key);
      edges.push({ from: file, to, kind: raw.kind, confidence: "extracted" });
    }
  }

  return {
    version: 1,
    generated: new Date().toISOString(),
    nodes: sortNodes([...nodeById.values()]),
    edges: sortEdges(edges),
  };
}

function topByCount(counts: Map<string, number>, limit: number): [string, number][] {
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit);
}

/** Human-readable GRAPH.md summary: totals, languages, top fan-in/fan-out, external packages. */
export function renderGraphMd(graph: ImportGraph): string {
  const modules = graph.nodes.filter((n) => n.kind === "module");
  const externals = graph.nodes.filter((n) => n.kind === "external");

  const languageCounts = new Map<string, number>();
  for (const m of modules) {
    if (m.language) languageCounts.set(m.language, (languageCounts.get(m.language) ?? 0) + 1);
  }

  const fanIn = new Map<string, number>();
  const fanOut = new Map<string, number>();
  for (const e of graph.edges) {
    fanIn.set(e.to, (fanIn.get(e.to) ?? 0) + 1);
    fanOut.set(e.from, (fanOut.get(e.from) ?? 0) + 1);
  }

  const lines = [
    "# Import graph",
    "",
    `Generated: ${graph.generated}`,
    `Modules: ${modules.length}`,
    `External packages: ${externals.length}`,
    `Edges: ${graph.edges.length}`,
    "",
    "## Languages",
    "",
  ];
  if (languageCounts.size === 0) {
    lines.push("(none detected)");
  } else {
    for (const [lang, count] of [...languageCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      lines.push(`- ${lang}: ${count} file(s)`);
    }
  }

  lines.push("", "## Most depended-on (fan-in)", "");
  const topFanIn = topByCount(fanIn, 10);
  if (topFanIn.length === 0) {
    lines.push("(no internal dependents)");
  } else {
    topFanIn.forEach(([id, count], i) => lines.push(`${i + 1}. ${id} (${count} importer(s))`));
  }

  lines.push("", "## Most dependencies (fan-out)", "");
  const topFanOut = topByCount(fanOut, 10);
  if (topFanOut.length === 0) {
    lines.push("(no internal dependencies)");
  } else {
    topFanOut.forEach(([id, count], i) => lines.push(`${i + 1}. ${id} (${count} import(s))`));
  }

  lines.push("", "## External packages", "");
  if (externals.length === 0) {
    lines.push("(none)");
  } else {
    for (const ext of [...externals].sort((a, b) => a.id.localeCompare(b.id))) {
      lines.push(`- ${ext.id.slice("pkg:".length)}`);
    }
  }

  return lines.join("\n") + "\n";
}
