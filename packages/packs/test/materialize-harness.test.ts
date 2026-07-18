import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { listBuiltinPacks, loadBuiltinPack } from "../src/load.ts";
import { validateManifest } from "../src/manifest.ts";
import { materializeHarness } from "../src/materialize-harness.ts";

const sha = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

async function firstBuiltin() {
  return loadBuiltinPack((await listBuiltinPacks())[0]); // listBuiltinPacks(): Promise<string[]>
}

describe("materializeHarness", () => {
  it("repo target: merges entry files, hashes vendored, writes region receipts — deterministically", async () => {
    const pack = await firstBuiltin();
    const manifest = validateManifest({
      version: 1, target: { kind: "repo", id: "acme/checkout" },
      packs: { "github:acme/pack": "v1.0.0" },
    });
    const input = {
      manifest,
      resolvedPacks: { "github:acme/pack": pack },
      currentFiles: { "AGENTS.md": "# Mine\n\nHuman text.\n" },
      resolutions: { "github:acme/pack": { ref: "v1.0.0", sha: "d".repeat(40), packId: pack.id } },
    };
    const a = materializeHarness(input);
    const b = materializeHarness(input);
    expect(a).toEqual(b); // deterministic

    // every vendored entry's hash matches its file content
    for (const v of a.manifest.materialized.vendored) {
      expect(v.sha256).toBe(sha(a.files[v.path]));
    }
    // entry files are in managedRegions (not vendored), with a region receipt for the pack
    const entryPaths = a.manifest.materialized.managedRegions.map((m) => m.path);
    if (a.files["AGENTS.md"] !== undefined) {
      expect(entryPaths).toContain("AGENTS.md");
      expect(a.files["AGENTS.md"]).toContain("# Mine"); // user content preserved by the merge
      const regions = a.manifest.materialized.managedRegions.find((m) => m.path === "AGENTS.md")!.regions;
      expect(regions.some((r) => r.packId === pack.id && r.version === pack.version)).toBe(true);
    }
    expect(a.manifest.materialized.resolutions).toEqual(input.resolutions);
    expect(a.manifest.packs).toEqual(manifest.packs);
  });

  it("machine target: uses the bundle union and excludes settings.json from the receipt", async () => {
    const pack = await firstBuiltin();
    const manifest = validateManifest({
      version: 1, target: { kind: "machine", id: "laptop" }, packs: { p: pack.version },
    });
    const r = materializeHarness({ manifest, resolvedPacks: { p: pack }, currentFiles: {} });
    const receiptPaths = r.manifest.materialized.vendored.map((v) => v.path);
    expect(receiptPaths).not.toContain("settings.json");
    for (const v of r.manifest.materialized.vendored) expect(v.sha256).toBe(sha(r.files[v.path]));
  });

  it("throws on a manifest pack with no resolved pack", async () => {
    const manifest = validateManifest({ version: 1, target: { kind: "repo", id: "r" }, packs: { ghost: "1.0.0" } });
    expect(() => materializeHarness({ manifest, resolvedPacks: {}, currentFiles: {} })).toThrow(/materialize: pack "ghost"/);
  });
});
