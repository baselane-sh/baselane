import type { FileMap, WorkflowPack } from "../types.ts";
import { renderBundleFiles } from "./bundle.ts";

export interface BundleUnion {
  files: FileMap;
  collisions: string[];
}

const SETTINGS_KEY = "settings.json";
const MANIFEST_KEY = ".baselane/capabilities.json";

interface HookEntry {
  matcher?: string;
  hooks: unknown[];
}

/** Concatenate every rendered pack's hook entries per event, raw (unprefixed). The agent applies its
 * BASELANE_MANAGED prefix later when merging into the developer's real settings — this is a
 * different, earlier operation, so it must NOT prefix. For a single input this rebuilds the exact
 * bytes render/claude.ts's settingsJson produced. */
function mergeRenderedSettings(jsons: string[]): string {
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

/** Union each manifest's capabilities, dedup by exact JSON identity, first occurrence wins. For a
 * single input this rebuilds the exact bytes render/capabilities.ts's manifest produced. */
function mergeCapabilityManifests(jsons: string[]): string {
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

/** Unions the machine-level bundle files of an ordered (most-specific-first) effective pack set.
 * settings.json hooks concatenate per event; capabilities manifests dedup; every other path is
 * first-writer-wins with a collisions note on a differing later write. `renderBundleUnion([p])`
 * byte-equals `renderBundleFiles(p)`. */
export function renderBundleUnion(packs: WorkflowPack[]): BundleUnion {
  const files: FileMap = {};
  const collisions: string[] = [];
  const settings: string[] = [];
  const manifests: string[] = [];

  for (const pack of packs) {
    for (const [path, content] of Object.entries(renderBundleFiles(pack))) {
      if (path === SETTINGS_KEY) {
        settings.push(content);
        continue;
      }
      if (path === MANIFEST_KEY) {
        manifests.push(content);
        continue;
      }
      if (!(path in files)) {
        files[path] = content;
      } else if (files[path] !== content && !collisions.includes(path)) {
        collisions.push(path);
      }
    }
  }

  if (settings.length > 0) files[SETTINGS_KEY] = mergeRenderedSettings(settings);
  if (manifests.length > 0) files[MANIFEST_KEY] = mergeCapabilityManifests(manifests);
  return { files, collisions };
}
