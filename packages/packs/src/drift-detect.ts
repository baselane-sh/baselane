import { ENTRY_FILES, extractManagedRegions } from "./merge-region.ts";

export type DriftKind = "version" | "content" | "missing" | "none";

const DRIFT_RANK: Record<DriftKind, number> = { none: 0, content: 1, version: 2, missing: 3 };

/**
 * Worst-of drift across every entry file this pack actually renders — missing (the region is gone)
 * outranks a stale version, which outranks a hand-edited body, which outranks no drift at all. Pure:
 * the caller supplies the repo's current entry-file contents and the pack's freshly rendered FileMap,
 * so this has no I/O and no dependency on how either was obtained.
 */
export function detectPackDrift(
  entryFiles: Record<string, string>,
  packId: string,
  currentVersion: string,
  renderedFiles: Record<string, string>,
): DriftKind {
  let worst: DriftKind = "none";
  for (const path of ENTRY_FILES) {
    const rendered = renderedFiles[path];
    if (rendered === undefined) continue; // this pack doesn't render this entry file at all
    const region = extractManagedRegions(entryFiles[path] ?? "").find((r) => r.packId === packId);
    const kind: DriftKind = !region ? "missing" : region.version !== currentVersion ? "version" : region.body !== rendered.trim() ? "content" : "none";
    if (DRIFT_RANK[kind] > DRIFT_RANK[worst]) worst = kind;
  }
  return worst;
}
