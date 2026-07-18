import { createHash } from "node:crypto";
import type { WorkflowPack } from "./types.ts";
import { isEntryFile, extractManagedRegions } from "./merge-region.ts";
import { renderRolloutFiles } from "./render/rollout-files.ts";
import { renderBundleUnion } from "./render/bundle-union.ts";
import { validateManifest, type HarnessManifest, type Resolution, type ManagedRegionEntry, type VendoredEntry } from "./manifest.ts";

export function sha256Hex(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export interface MaterializeInput {
  manifest: HarnessManifest;
  resolvedPacks: Record<string, WorkflowPack>;
  currentFiles: Record<string, string | null>;
  resolutions?: Record<string, Resolution>;
}

export interface MaterializeResult {
  files: Record<string, string>;
  collisions: string[];
  manifest: HarnessManifest;
}

const MACHINE_SETTINGS_PATH = "settings.json";

export function materializeHarness(input: MaterializeInput): MaterializeResult {
  const names = Object.keys(input.manifest.packs);
  const packs = names.map((name) => {
    const pack = input.resolvedPacks[name];
    if (!pack) throw new Error(`materialize: pack "${name}" was not resolved`);
    return pack;
  });

  const rendered =
    input.manifest.target.kind === "repo"
      ? renderRolloutFiles(input.currentFiles, packs)
      : renderBundleUnion(packs);

  const vendored: VendoredEntry[] = [];
  const managedRegions: ManagedRegionEntry[] = [];
  for (const [path, content] of Object.entries(rendered.files).sort(([a], [b]) => a.localeCompare(b))) {
    if (input.manifest.target.kind === "machine" && path === MACHINE_SETTINGS_PATH) continue;
    if (isEntryFile(path)) {
      const regions = extractManagedRegions(content).map((r) => ({
        packId: r.packId,
        version: r.version,
        sha256: sha256Hex(r.body),
      }));
      managedRegions.push({ path, regions });
    } else {
      vendored.push({ path, sha256: sha256Hex(content) });
    }
  }

  const manifest = validateManifest({
    ...input.manifest,
    materialized: {
      vendored,
      managedRegions,
      derivedCommitted: [],
      resolutions: input.resolutions ?? {},
    },
  });
  return { files: rendered.files, collisions: rendered.collisions, manifest };
}
