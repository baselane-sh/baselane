import { lstat, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import type { Bundle, Manifest, ReconcilePlan } from "./types.ts";
import { sha256 } from "./hash.ts";

export const MANIFEST_NAME = ".baselane-manifest.json";

// Lexical containment only — symlink traversal is refused separately by assertNoSymlinkWithin on mutating ops.
function resolveInside(rootDir: string, path: string): string {
  const abs = resolve(rootDir, path);
  const rootAbs = resolve(rootDir);
  if (abs !== rootAbs && !abs.startsWith(rootAbs + sep)) {
    throw new Error(`baselane: path "${path}" escapes target root`);
  }
  return abs;
}

async function assertNoSymlinkWithin(rootDir: string, relPath: string): Promise<void> {
  const segments = relPath.split("/");
  let current = resolve(rootDir);
  for (const segment of segments) {
    current = join(current, segment);
    let stats;
    try {
      stats = await lstat(current);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT" || code === "ENOTDIR") return; // remainder doesn't exist yet; mkdir creates real dirs
      throw err;
    }
    if (stats.isSymbolicLink()) {
      throw new Error(`baselane: path "${relPath}" traverses a symlink ("${segment}") — refusing`);
    }
  }
}

async function readIfExists(absPath: string): Promise<string | null> {
  try {
    return await readFile(absPath, "utf8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") return null;
    throw err;
  }
}

export async function loadManifest(rootDir: string): Promise<Manifest> {
  const raw = await readIfExists(join(rootDir, MANIFEST_NAME));
  if (raw === null) return { version: 1, files: {} };
  const parsed = JSON.parse(raw) as Manifest;
  if (parsed.version !== 1 || typeof parsed.files !== "object" || parsed.files === null) {
    throw new Error("baselane: malformed manifest");
  }
  return parsed;
}

export async function readCurrent(
  rootDir: string,
  paths: string[],
): Promise<Record<string, string | null>> {
  const state: Record<string, string | null> = {};
  for (const path of paths) {
    state[path] = await readIfExists(resolveInside(rootDir, path));
  }
  return state;
}

export async function applyPlan(
  rootDir: string,
  bundle: Bundle,
  plan: ReconcilePlan,
): Promise<void> {
  // A file in plan.drifted was hand-edited since baselane last wrote it. It is also in
  // plan.writes (its content differs from desired), so applyPlan is about to overwrite —
  // revert — the local edit. Back the local version up to <path>.baselane-bak FIRST so a
  // developer's edit is never silently lost (#3 data-loss critical: revert-without-backup).
  const drifted = new Set(plan.drifted);
  for (const path of plan.writes) {
    await assertNoSymlinkWithin(rootDir, path);
    const abs = resolveInside(rootDir, path);
    const content = bundle.files[path];
    if (content === undefined) throw new Error(`baselane: write "${path}" not in bundle`);
    if (drifted.has(path)) {
      const local = await readFile(abs, "utf8").catch(() => null);
      if (local !== null) await writeFile(`${abs}.baselane-bak`, local, "utf8");
    }
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, content, "utf8");
  }
  for (const path of plan.deletes) {
    await assertNoSymlinkWithin(rootDir, path);
    const abs = resolveInside(rootDir, path);
    // Same rule as writes: a delete target that's drifted (hand-edited since baselane last wrote
    // it) is about to lose that edit permanently. Back it up first.
    if (drifted.has(path)) {
      const local = await readFile(abs, "utf8").catch(() => null);
      if (local !== null) await writeFile(`${abs}.baselane-bak`, local, "utf8");
    }
    await unlink(abs);
  }
}

export async function writeManifest(rootDir: string, bundle: Bundle): Promise<void> {
  const manifest: Manifest = {
    version: 1,
    files: Object.fromEntries(
      Object.entries(bundle.files).map(([path, content]) => [path, sha256(content)]),
    ),
  };
  await writeFile(join(rootDir, MANIFEST_NAME), JSON.stringify(manifest, null, 2) + "\n", "utf8");
}
