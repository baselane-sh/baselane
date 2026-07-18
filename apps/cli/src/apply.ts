import { lstat, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { isEntryFile, loadBuiltinPack, mergeManagedRegion, renderPack, type WorkflowPack } from "@baselane/packs";

export interface ApplyOptions {
  force: boolean;
  dryRun: boolean;
}

export interface ApplyResult {
  /** Paths written (or that would be written, on dry-run). */
  written: string[];
  /** Paths left untouched because they exist and force is off. */
  skipped: string[];
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

// Lexical containment only — mirrors apps/agent/src/fs-ops.ts resolveInside.
// Builtin packs only ever produce safe keys today; this guard exists ahead of
// any future external/third-party pack loading. It does NOT follow symlinks —
// assertNoSymlinkWithin below is the runtime companion that refuses those.
export function assertInsideDir(rootDir: string, rel: string): string {
  const abs = resolve(rootDir, rel);
  const rootAbs = resolve(rootDir);
  if (abs !== rootAbs && !abs.startsWith(rootAbs + sep)) {
    throw new Error(`pack file "${rel}" escapes target dir`);
  }
  return abs;
}

// #30: lexical containment is defeated by a symlinked directory inside the target — a `.claude`
// symlink pointing outside would let a write escape even though the path is lexically inside.
// Walk each path segment and refuse if any is a symlink, mirroring apps/agent/src/fs-ops.ts's
// assertNoSymlinkWithin (which apply.ts previously only CLAIMED to mirror). Matters once
// untrusted/AI-drafted packs can be applied. Segments the pack key on "/" (its keys are always
// forward-slash joined), same as fs-ops.ts.
async function assertNoSymlinkWithin(rootDir: string, rel: string): Promise<void> {
  let current = resolve(rootDir);
  for (const segment of rel.split("/")) {
    current = join(current, segment);
    let stats;
    try {
      stats = await lstat(current);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT" || code === "ENOTDIR") return; // remainder doesn't exist yet — mkdir makes real dirs
      throw err;
    }
    if (stats.isSymbolicLink()) {
      throw new Error(`pack file "${rel}" traverses a symlink ("${segment}") — refusing`);
    }
  }
}

// #6: the actual apply logic against an already-resolved pack — a built-in id (applyPack
// below) or a custom pack loaded from --pack-file and validatePack'd by the caller. Neither
// path trusts an unvalidated pack object; this function just doesn't care which one it got.
export async function applyResolvedPack(
  targetDir: string,
  pack: WorkflowPack,
  opts: ApplyOptions,
): Promise<ApplyResult> {
  const target = await stat(targetDir).catch(() => null);
  if (!target || !target.isDirectory()) {
    throw new Error(`target is not a directory: ${targetDir}`);
  }
  const files = renderPack(pack);
  const written: string[] = [];
  const skipped: string[] = [];
  for (const [rel, content] of Object.entries(files)) {
    const abs = assertInsideDir(targetDir, rel);
    // Refuse before ANY read/write of abs (entry-file merge included) so a symlinked segment
    // can neither exfiltrate an existing file's contents nor redirect a write outside the target.
    await assertNoSymlinkWithin(targetDir, rel);

    // ENTRY files (AGENTS.md/CLAUDE.md/...) region-merge into whatever is already on
    // disk instead of being skipped or clobbered — preserving a developer's existing
    // content is always safe, so this ignores force/skip and applies every time.
    if (isEntryFile(rel)) {
      const existing = (await exists(abs)) ? await readFile(abs, "utf8") : null;
      const merged = mergeManagedRegion(existing, content, pack.id, pack.version);
      // #33: the merge is idempotent — re-applying the same pack version onto an already-merged
      // file reproduces the same bytes. Only count/write it when the merge actually changes
      // something, so --dry-run doesn't claim "written" for a no-op, and a real apply doesn't
      // needlessly rewrite an untouched file.
      const changed = merged !== existing;
      if (changed) {
        written.push(rel);
        if (!opts.dryRun) {
          await mkdir(dirname(abs), { recursive: true });
          await writeFile(abs, merged, "utf8");
        }
      }
      continue;
    }

    if (!opts.force && (await exists(abs))) {
      skipped.push(rel);
      continue;
    }
    written.push(rel);
    if (!opts.dryRun) {
      await mkdir(dirname(abs), { recursive: true });
      await writeFile(abs, content, "utf8");
    }
  }
  return { written: written.sort(), skipped: skipped.sort() };
}

/** Built-in-pack convenience wrapper over applyResolvedPack — kept so existing callers that
 * only ever deal in built-in pack ids don't need to load the pack themselves. */
export async function applyPack(
  targetDir: string,
  packId: string,
  opts: ApplyOptions,
): Promise<ApplyResult> {
  const pack = await loadBuiltinPack(packId);
  return applyResolvedPack(targetDir, pack, opts);
}
