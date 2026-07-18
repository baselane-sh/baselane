import { buildImportGraph, renderGraphMd, type RepoFileSource } from "@baselane/analyze";
import type { FileMap } from "../types.ts";

export interface GraphSeedOptions {
  /** ISO timestamp stamped as the graph's `generated` field — injected so the seed is deterministic
   * (buildImportGraph otherwise stamps `new Date().toISOString()`). */
  generated: string;
}

/**
 * A computed module-dependency graph for `.baselane/graph.json` (+ human-readable `graph/GRAPH.md`),
 * the central compute the `graph` capability was missing (system-map/design/wiki already have theirs).
 * `runSystemMapJob` already runs buildImportGraph but keeps only a summary; this renders and persists
 * the full graph so it can ride the rollout fold as `file` artifacts — a mirror of buildWikiSeed.
 *
 * Pure + source-agnostic (RepoFileSource → runs centrally via GithubFileSource, no clone). Returns
 * leaf paths (`graph.json`, `graph/GRAPH.md`); the caller prefixes `.baselane/` for the repo surface.
 */
export async function buildGraphSeed(source: RepoFileSource, opts: GraphSeedOptions): Promise<FileMap> {
  const raw = await buildImportGraph(source);
  const graph = { ...raw, generated: opts.generated };
  return {
    "graph.json": JSON.stringify(graph, null, 2) + "\n",
    "graph/GRAPH.md": renderGraphMd(graph),
  };
}
