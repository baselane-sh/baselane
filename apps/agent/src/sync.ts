import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { validateBundle } from "./validate-bundle.ts";
import type { Bundle, ReconcilePlan } from "@baselane/materialize";
import {
  planReconcile,
  applyPlan,
  loadManifest,
  readCurrent,
  writeManifest,
  hasManagedHooks,
  mergeBaselaneHooks,
  SettingsParseError,
} from "@baselane/materialize";

export interface SyncResult {
  plan: ReconcilePlan;
  applied: boolean;
}

// Bundle key for the machine-level hooks file — merged into the developer's own Claude
// settings (see settings-merge.ts), never manifest-managed so reconcile can't delete it.
const SETTINGS_KEY = "settings.json";

function claudeSettingsPath(): string {
  return process.env.BASELANE_CLAUDE_SETTINGS ?? join(homedir(), ".claude", "settings.json");
}

async function readIfExists(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") return null;
    throw err;
  }
}

// No "settings.json" in the synced bundle means this pack currently manages no hooks.
// We still need to merge (with an empty pack payload) whenever the developer's existing
// settings carry stale BASELANE_MANAGED entries from a *previous* sync, so they get pruned —
// otherwise a pack that drops its hooks would leave old ones running forever. But if there's
// nothing to prune and nothing to add, skip entirely so we never touch (or create) a settings
// file this pack has no business writing to.
const EMPTY_PACK_SETTINGS = "{}";

// Temp file lives in the same directory as the target so `rename` is a same-filesystem,
// atomic directory-entry swap rather than a cross-device copy (mirrors apps/portal's
// jsonl-compact.ts) — readers never observe a partially-written settings.json.
async function writeFileAtomic(path: string, content: string): Promise<void> {
  const tmp = join(dirname(path), `.${randomBytes(8).toString("hex")}.tmp`);
  await writeFile(tmp, content, "utf8");
  await rename(tmp, path);
}

async function applySettingsMerge(packSettingsJson: string | undefined): Promise<void> {
  const path = claudeSettingsPath();
  const existing = await readIfExists(path);
  if (packSettingsJson === undefined && !hasManagedHooks(existing)) return;
  let merged: string;
  try {
    merged = mergeBaselaneHooks(existing, packSettingsJson ?? EMPTY_PACK_SETTINGS);
  } catch (err) {
    if (err instanceof SettingsParseError) {
      // The developer's settings.json exists but isn't valid JSON — leave it exactly as
      // found. Merging over it would mean writing just our hooks, erasing everything else
      // (permissions, model, env, MCP config) the file used to hold.
      console.error(`baselane-agent: ${path} is not valid JSON — skipping hook sync so it isn't clobbered.`);
      return;
    }
    throw err;
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFileAtomic(path, merged);
}

export async function sync(opts: {
  bundlePath?: string;
  bundle?: Bundle;
  targetDir: string;
  dryRun?: boolean;
}): Promise<SyncResult> {
  const bundle =
    opts.bundle ?? validateBundle(JSON.parse(await readFile(opts.bundlePath as string, "utf8")));
  const { [SETTINGS_KEY]: settingsJson, ...restFiles } = bundle.files;
  const manifestBundle: Bundle = { version: 1, files: restFiles };
  const manifest = await loadManifest(opts.targetDir);
  const paths = [...new Set([...Object.keys(manifestBundle.files), ...Object.keys(manifest.files)])];
  const onDisk = await readCurrent(opts.targetDir, paths);
  const plan = planReconcile(manifestBundle, manifest, onDisk);
  if (opts.dryRun) return { plan, applied: false };
  await applyPlan(opts.targetDir, manifestBundle, plan);
  await writeManifest(opts.targetDir, manifestBundle);
  await applySettingsMerge(settingsJson);
  return { plan, applied: true };
}
