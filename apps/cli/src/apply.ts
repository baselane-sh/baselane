import { lstat, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import {
  buildManifest, extractManagedRegions, isEntryFile, loadBuiltinPack, mergeManagedRegion,
  renderPack, sha256Hex, type WorkflowPack,
} from "@baselane/packs";
import { readManifestWithFallback, targetLocation, writeManifestFile } from "@baselane/materialize";

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
  if (!opts.dryRun) {
    await recordApplyManifest(targetDir, pack, files, written);
  }
  return { written: written.sort(), skipped: skipped.sort() };
}

/** Writes/updates the target's harness.json after an apply, so `baselane drift` works on the
 * apply path exactly as it does after `baselane install`. Merges into any existing manifest
 * (other packs' pins and receipts survive). Files apply SKIPPED (pre-existing, no --force) are
 * deliberately left out of the receipt: apply didn't write them, so drift shouldn't police them. */
async function recordApplyManifest(
  targetDir: string,
  pack: WorkflowPack,
  files: Record<string, string>,
  written: string[],
): Promise<void> {
  const loc = targetLocation({ global: false, dir: targetDir });
  const { manifest: existing } = await readManifestWithFallback(loc);
  const writtenSet = new Set(written);

  const vendored = new Map((existing?.materialized.vendored ?? []).map((v) => [v.path, v]));
  const managed = new Map((existing?.materialized.managedRegions ?? []).map((m) => [m.path, m]));

  for (const [rel, content] of Object.entries(files)) {
    if (isEntryFile(rel)) {
      // The region merge runs on every apply, so after apply the region is on disk whether or
      // not this run changed it. Its body derives only from the rendered content, so hash the
      // null-merge instead of re-reading disk.
      const region = extractManagedRegions(mergeManagedRegion(null, content, pack.id, pack.version))
        .find((r) => r.packId === pack.id);
      if (!region) continue;
      const others = (managed.get(rel)?.regions ?? []).filter((r) => r.packId !== pack.id);
      managed.set(rel, {
        path: rel,
        regions: [...others, { packId: pack.id, version: pack.version, sha256: sha256Hex(region.body) }],
      });
      continue;
    }
    if (!writtenSet.has(rel)) continue;
    vendored.set(rel, { path: rel, sha256: sha256Hex(content) });
  }

  const byPath = <T extends { path: string }>(a: T, b: T) => a.path.localeCompare(b.path);
  const manifest = buildManifest({
    target: loc.target,
    packs: { ...(existing?.packs ?? {}), [pack.id]: pack.version },
    registry: existing?.registry ?? null,
    capabilities: existing?.capabilities ?? {},
    receipt: {
      vendored: [...vendored.values()].sort(byPath),
      managedRegions: [...managed.values()].sort(byPath),
      derivedCommitted: existing?.materialized.derivedCommitted ?? [],
      resolutions: existing?.materialized.resolutions ?? {},
      capabilities: existing?.materialized.capabilities ?? {},
    },
  });
  await writeManifestFile(loc.manifestPath, manifest);
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
