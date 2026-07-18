import type { RepoFileSource } from "../types.ts";

// Order matters: when multiple lockfiles coexist, the first match takes priority.
const LOCKFILE_TO_PM: [string, string][] = [
  ["pnpm-lock.yaml", "pnpm"],
  ["bun.lockb", "bun"],
  ["yarn.lock", "yarn"],
  ["package-lock.json", "npm"],
];

export async function detectPackageManager(source: RepoFileSource): Promise<string | null> {
  const files = new Set(await source.listFiles());
  for (const [lockfile, pm] of LOCKFILE_TO_PM) {
    if (files.has(lockfile)) return pm;
  }
  return null;
}
