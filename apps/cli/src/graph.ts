import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { LocalDirFileSource, buildImportGraph, renderGraphMd, type ImportGraph } from "@baselane/analyze";
import { assertInsideDir } from "./apply.ts";

export interface GraphResult {
  graph: ImportGraph;
  /** Repo-relative paths written, in write order. */
  written: string[];
}

/** Scans `dir` and writes `.baselane/graph.json` + `.baselane/graph/GRAPH.md` through the containment guard. */
export async function runGraph(dir: string): Promise<GraphResult> {
  const graph = await buildImportGraph(new LocalDirFileSource(dir));
  const outputs: [string, string][] = [
    [".baselane/graph.json", JSON.stringify(graph, null, 2) + "\n"],
    [".baselane/graph/GRAPH.md", renderGraphMd(graph)],
  ];
  const written: string[] = [];
  for (const [rel, content] of outputs) {
    const abs = assertInsideDir(dir, rel);
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, content, "utf8");
    written.push(rel);
  }
  return { graph, written };
}

function topFanIn(graph: ImportGraph, limit: number): [string, number][] {
  const fanIn = new Map<string, number>();
  for (const e of graph.edges) fanIn.set(e.to, (fanIn.get(e.to) ?? 0) + 1);
  return [...fanIn.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit);
}

/** One-screen human summary: totals + top fan-in + what was written. */
export function formatGraphSummary(graph: ImportGraph, written: string[]): string {
  const modules = graph.nodes.filter((n) => n.kind === "module").length;
  const externals = graph.nodes.filter((n) => n.kind === "external").length;
  const top = topFanIn(graph, 5);
  return [
    "baselane graph",
    "",
    `Modules: ${modules}`,
    `External packages: ${externals}`,
    `Edges: ${graph.edges.length}`,
    "",
    "Top fan-in (most depended-on):",
    ...(top.length > 0 ? top.map(([id, count], i) => `  ${i + 1}. ${id} (${count})`) : ["  (none)"]),
    "",
    `Wrote: ${written.join(", ")}`,
  ].join("\n");
}
