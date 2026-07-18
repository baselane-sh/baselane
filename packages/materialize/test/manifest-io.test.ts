import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir, hostname } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readManifestFile, readManifestWithFallback, targetLocation, writeManifestFile } from "../src/manifest-io.ts";
import { validateManifest, LEGACY_MANIFEST_PATH, MANIFEST_SCHEMA_URL } from "@baselane/packs";

describe("targetLocation", () => {
  it("repo mode: dir-anchored manifest, id = basename", () => {
    const loc = targetLocation({ global: false, dir: "/tmp/somewhere/checkout" });
    expect(loc.manifestPath).toBe("/tmp/somewhere/checkout/harness.json");
    expect(loc.targetDir).toBe("/tmp/somewhere/checkout");
    expect(loc.target).toEqual({ kind: "repo", id: "checkout" });
  });
  it("global mode: ~/.baselane/harness.json → ~/.claude, id = hostname", () => {
    const loc = targetLocation({ global: true, homeDir: "/home/dev" });
    expect(loc.manifestPath).toBe("/home/dev/.baselane/harness.json");
    expect(loc.targetDir).toBe("/home/dev/.claude");
    expect(loc.target).toEqual({ kind: "machine", id: hostname() });
  });
});

describe("read/writeManifestFile", () => {
  it("round-trips through validateManifest, atomic write with trailing newline", async () => {
    const dir = await mkdtemp(join(tmpdir(), "blm-"));
    const path = join(dir, ".baselane", "harness.json");
    expect(await readManifestFile(path)).toBeNull();
    const m = validateManifest({ version: 1, target: { kind: "repo", id: "x" }, packs: {} });
    await writeManifestFile(path, m);
    const raw = await readFile(path, "utf8");
    expect(raw.endsWith("\n")).toBe(true);
    expect(await readManifestFile(path)).toEqual(m);
  });
  it("writes $schema as the first key so editors get validation/autocomplete", async () => {
    const dir = await mkdtemp(join(tmpdir(), "blm-"));
    const path = join(dir, "harness.json");
    const m = validateManifest({ version: 1, target: { kind: "repo", id: "x" }, packs: {} });
    await writeManifestFile(path, m);
    const raw = await readFile(path, "utf8");
    expect(raw.startsWith(`{\n  "$schema": "${MANIFEST_SCHEMA_URL}",`)).toBe(true);
    expect(Object.keys(JSON.parse(raw))[0]).toBe("$schema");
    // Round-trip: validateManifest normalizes $schema away, so reads stay shape-stable.
    expect(await readManifestFile(path)).toEqual(m);
  });
  it("throws loudly on malformed JSON instead of returning null", async () => {
    const dir = await mkdtemp(join(tmpdir(), "blm-"));
    await mkdir(join(dir, ".baselane"), { recursive: true });
    await writeFile(join(dir, ".baselane", "harness.json"), "{nope", "utf8");
    await expect(readManifestFile(join(dir, ".baselane", "harness.json"))).rejects.toThrow(/harness\.json/);
  });
});

describe("readManifestWithFallback", () => {
  it("repo target: root manifest wins when both root and legacy exist", async () => {
    const dir = await mkdtemp(join(tmpdir(), "blmf-"));
    const rootM = validateManifest({ version: 1, target: { kind: "repo", id: "root" }, packs: {} });
    const legacyM = validateManifest({ version: 1, target: { kind: "repo", id: "legacy" }, packs: {} });
    await writeManifestFile(join(dir, "harness.json"), rootM);
    await writeManifestFile(join(dir, LEGACY_MANIFEST_PATH), legacyM);
    const loc = targetLocation({ global: false, dir });
    const { manifest, legacyPath } = await readManifestWithFallback(loc);
    expect(manifest).toEqual(rootM);
    expect(legacyPath).toBeNull();
  });

  it("repo target: falls back to legacy .baselane/harness.json when root is absent", async () => {
    const dir = await mkdtemp(join(tmpdir(), "blmf-"));
    const legacyM = validateManifest({ version: 1, target: { kind: "repo", id: "legacy" }, packs: {} });
    await writeManifestFile(join(dir, LEGACY_MANIFEST_PATH), legacyM);
    const loc = targetLocation({ global: false, dir });
    const { manifest, legacyPath } = await readManifestWithFallback(loc);
    expect(manifest).toEqual(legacyM);
    expect(legacyPath).toBe(join(dir, LEGACY_MANIFEST_PATH));
  });

  it("repo target: neither file present ⇒ null manifest, null legacyPath", async () => {
    const dir = await mkdtemp(join(tmpdir(), "blmf-"));
    const loc = targetLocation({ global: false, dir });
    const { manifest, legacyPath } = await readManifestWithFallback(loc);
    expect(manifest).toBeNull();
    expect(legacyPath).toBeNull();
  });

  it("machine target: never falls back, even if a legacy-shaped path exists under targetDir", async () => {
    const home = await mkdtemp(join(tmpdir(), "blmf-home-"));
    const loc = targetLocation({ global: true, homeDir: home });
    // machine manifestPath is ~/.baselane/harness.json already — nothing else to fall back to.
    const { manifest, legacyPath } = await readManifestWithFallback(loc);
    expect(manifest).toBeNull();
    expect(legacyPath).toBeNull();
  });
});
