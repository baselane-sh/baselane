import type { FileMap, WorkflowPack } from "../types.ts";
import { ENTRY_FILES } from "../merge-region.ts";
import { renderPack } from "./render-pack.ts";

export interface RepoUnion {
  files: FileMap;
  collisions: string[];
}

const SETTINGS_PATH = ".claude/settings.json";
const MANIFEST_PATH = ".baselane/capabilities.json";

interface HookEntry {
  matcher?: string;
  hooks: unknown[];
}

/** Concatenates every rendered pack's hook entries per event, raw. Mirrors
 * render/bundle-union.ts's mergeRenderedSettings but is NOT shared code with it — that module
 * feeds a different consumer (/api/plan's laptop bundle) over bundle-relative paths; this one
 * feeds the repo commit over repo-relative paths. Duplicated on purpose to avoid coupling two
 * independent consumers to one shared internal. */
function mergeSettingsJson(jsons: string[]): string {
  const byEvent: Record<string, HookEntry[]> = {};
  for (const json of jsons) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      continue;
    }
    const hooks = (parsed as { hooks?: Record<string, unknown> }).hooks;
    if (!hooks || typeof hooks !== "object") continue;
    for (const [event, entries] of Object.entries(hooks)) {
      if (!Array.isArray(entries)) continue;
      (byEvent[event] ??= []).push(...(entries as HookEntry[]));
    }
  }
  return JSON.stringify({ hooks: byEvent }, null, 2) + "\n";
}

/** Unions each manifest's capabilities, dedup by exact JSON identity, first occurrence wins. */
function mergeCapabilitiesManifest(jsons: string[]): string {
  const capabilities: unknown[] = [];
  const seen = new Set<string>();
  for (const json of jsons) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      continue;
    }
    const list = (parsed as { capabilities?: unknown[] }).capabilities;
    if (!Array.isArray(list)) continue;
    for (const c of list) {
      const key = JSON.stringify(c);
      if (!seen.has(key)) {
        seen.add(key);
        capabilities.push(c);
      }
    }
  }
  return JSON.stringify({ version: 1, capabilities }, null, 2) + "\n";
}

/**
 * Unions every NON-entry (fully-generated) repo file `renderPack` produces across an ordered
 * (most-specific-first) effective pack set — the repo-committed counterpart of
 * render/bundle-union.ts's laptop-bundle union. `.claude/settings.json` hooks concatenate per
 * event; `.baselane/capabilities.json` capabilities dedup; every other path is first-writer-wins
 * with a collisions note on a differing later write. `renderRepoFileUnion([p]).files` is
 * byte-identical to `renderPack(p)` minus its ENTRY_FILES keys.
 */
export function renderRepoFileUnion(packs: WorkflowPack[]): RepoUnion {
  const files: FileMap = {};
  const collisions: string[] = [];
  const settingsJsons: string[] = [];
  const manifestJsons: string[] = [];

  for (const pack of packs) {
    for (const [path, content] of Object.entries(renderPack(pack))) {
      if (ENTRY_FILES.includes(path)) continue;
      if (path === SETTINGS_PATH) {
        settingsJsons.push(content);
        continue;
      }
      if (path === MANIFEST_PATH) {
        manifestJsons.push(content);
        continue;
      }
      if (!(path in files)) {
        files[path] = content;
      } else if (files[path] !== content && !collisions.includes(path)) {
        collisions.push(path);
      }
    }
  }

  if (settingsJsons.length > 0) files[SETTINGS_PATH] = mergeSettingsJson(settingsJsons);
  if (manifestJsons.length > 0) files[MANIFEST_PATH] = mergeCapabilitiesManifest(manifestJsons);
  return { files, collisions };
}
