import type { RepoFileSource } from "../types.ts";

// Order matters: when multiple lockfiles coexist, the first match takes priority.
const LOCKFILE_TO_PM: [string, string][] = [
  ["pnpm-lock.yaml", "pnpm"],
  ["bun.lockb", "bun"],
  ["yarn.lock", "yarn"],
  ["package-lock.json", "npm"],
];

export async function detectPackageManager(source: RepoFileSource): Promise<string | null> {
  const files = await source.listFiles();
  // Root lockfiles win outright, in priority order.
  for (const [lockfile, pm] of LOCKFILE_TO_PM) {
    if (files.includes(lockfile)) return pm;
  }
  // Issue #3: a monorepo may keep lockfiles only in subprojects (no root manifest at all), so
  // fall back to any depth — shallowest match wins, priority order breaks depth ties.
  let best: { pm: string; depth: number; order: number } | null = null;
  for (const f of files) {
    for (let order = 0; order < LOCKFILE_TO_PM.length; order++) {
      const [lockfile, pm] = LOCKFILE_TO_PM[order];
      if (!f.endsWith("/" + lockfile)) continue;
      const depth = f.split("/").length;
      if (!best || depth < best.depth || (depth === best.depth && order < best.order)) {
        best = { pm, depth, order };
      }
    }
  }
  return best?.pm ?? null;
}
