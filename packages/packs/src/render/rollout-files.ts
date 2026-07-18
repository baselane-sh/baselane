import type { FileMap, WorkflowPack } from "../types.ts";
import { ENTRY_FILES, mergeManagedRegion, stripManagedRegion, strippedManagedPackIds } from "../merge-region.ts";
import { renderPack } from "./render-pack.ts";
import { renderRepoFileUnion } from "./repo-union.ts";

export interface RolloutFiles {
  files: FileMap;
  collisions: string[];
}

/**
 * Renders the full file set for the single combined `baselane/rollout` branch, given the repo's
 * ordered (most-specific-first) effective pack set. `baseEntryFiles` is each ENTRY_FILES path's
 * current content on the repo's default branch (or absent/undefined if the file doesn't exist
 * there) — the caller (distributeRollout) fetches these; this function is otherwise pure.
 *
 * Entry files (AGENTS.md/CLAUDE.md/GEMINI.md/.github/copilot-instructions.md): strip any pack's
 * region that isn't in `packs`, then fold `mergeManagedRegion` over `packs` in order. The result
 * carries exactly `packs`' regions — idempotent on a repeat call with the same set and base.
 * Every other rendered path (settings.json, agents/commands/skills, capability files) comes from
 * `renderRepoFileUnion`.
 */
export function renderRolloutFiles(baseEntryFiles: Record<string, string | null | undefined>, packs: WorkflowPack[]): RolloutFiles {
  const files: FileMap = {};
  const wantedIds = new Set(packs.map((p) => p.id));
  const rendered = packs.map((pack) => ({ pack, body: renderPack(pack) }));

  for (const path of ENTRY_FILES) {
    let content = baseEntryFiles[path] ?? null;
    if (content !== null) {
      for (const packId of strippedManagedPackIds(content)) {
        if (!wantedIds.has(packId)) content = stripManagedRegion(content, packId);
      }
    }
    for (const { pack, body } of rendered) {
      const managedBody = body[path];
      if (managedBody === undefined) continue;
      content = mergeManagedRegion(content, managedBody, pack.id, pack.version);
    }
    if (content !== null) files[path] = content;
  }

  const repoUnion = renderRepoFileUnion(packs);
  return { files: { ...files, ...repoUnion.files }, collisions: repoUnion.collisions };
}
