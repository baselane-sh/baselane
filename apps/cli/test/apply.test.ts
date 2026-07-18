import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readdir, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validatePack } from "@baselane/packs";
import { applyPack, applyResolvedPack, assertInsideDir } from "../src/apply.ts";

// A minimal custom (non-built-in) pack, validated exactly like a --pack-file's content would be.
const customPack = validatePack({
  id: "acme-custom",
  version: "1.0.0",
  title: "Acme Custom Pack",
  summary: "A hand-authored pack loaded from outside the built-in catalog.",
  context: { markdown: "# Acme conventions\n" },
  agents: [],
  commands: [],
  hooks: [],
});

let dir: string;
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), "baselane-apply-")); });
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

describe("applyPack", () => {
  it("writes the full rendered file map into the target dir", async () => {
    const r = await applyPack(dir, "software-engineer-harness", { force: false, dryRun: false });
    expect(r.written).toContain("AGENTS.md");
    expect(r.skipped).toEqual([]);
    const agents = await readFile(join(dir, "AGENTS.md"), "utf8");
    expect(agents).toContain("generated from workflow-pack software-engineer-harness");
  });

  it("region-merges an existing entry file instead of skipping or clobbering it, even without --force", async () => {
    await writeFile(join(dir, "AGENTS.md"), "hands off", "utf8");
    const r = await applyPack(dir, "software-engineer-harness", { force: false, dryRun: false });
    expect(r.written).toContain("AGENTS.md");
    expect(r.skipped).toEqual([]);
    const merged = await readFile(join(dir, "AGENTS.md"), "utf8");
    expect(merged).toContain("hands off");
    expect(merged).toContain("<!-- baselane:start software-engineer-harness@");
    expect(merged).toContain("generated from workflow-pack software-engineer-harness");
  });

  it("never clobbers an existing non-entry (fully-generated) file without --force", async () => {
    await mkdir(join(dir, ".claude"), { recursive: true });
    await writeFile(join(dir, ".claude", "settings.json"), "{}", "utf8");
    const r = await applyPack(dir, "software-engineer-harness", { force: false, dryRun: false });
    expect(r.skipped).toContain(".claude/settings.json");
    expect(await readFile(join(dir, ".claude", "settings.json"), "utf8")).toBe("{}");
  });

  it("overwrites a non-entry file with force", async () => {
    await mkdir(join(dir, ".claude"), { recursive: true });
    await writeFile(join(dir, ".claude", "settings.json"), "{}", "utf8");
    const r = await applyPack(dir, "software-engineer-harness", { force: true, dryRun: false });
    expect(r.written).toContain(".claude/settings.json");
    expect(await readFile(join(dir, ".claude", "settings.json"), "utf8")).not.toBe("{}");
  });

  it("merges an entry file with existing content the same way whether or not force is set", async () => {
    await writeFile(join(dir, "AGENTS.md"), "old", "utf8");
    const r = await applyPack(dir, "software-engineer-harness", { force: true, dryRun: false });
    expect(r.written).toContain("AGENTS.md");
    const merged = await readFile(join(dir, "AGENTS.md"), "utf8");
    expect(merged).toContain("old");
    expect(merged).not.toBe("old");
  });

  it("dry-run reports but writes nothing", async () => {
    const r = await applyPack(dir, "software-engineer-harness", { force: false, dryRun: true });
    expect(r.written.length).toBeGreaterThan(0);
    await expect(readFile(join(dir, "AGENTS.md"), "utf8")).rejects.toThrow();
  });

  it("rejects a target path that is a file", async () => {
    const f = join(dir, "not-a-dir");
    await writeFile(f, "x", "utf8");
    await expect(applyPack(f, "software-engineer-harness", { force: false, dryRun: false })).rejects.toThrow();
  });

  it("applies a real builtin pack unaffected by the containment guard", async () => {
    const r = await applyPack(dir, "software-engineer-harness", { force: false, dryRun: false });
    expect(r.written).toContain("AGENTS.md");
    const agents = await readFile(join(dir, "AGENTS.md"), "utf8");
    expect(agents.length).toBeGreaterThan(0);
  });

  it("resolves the retired test-loop id to its successor", async () => {
    const r = await applyPack(dir, "test-loop", { force: false, dryRun: false });
    expect(r.written).toContain("AGENTS.md");
    const agents = await readFile(join(dir, "AGENTS.md"), "utf8");
    expect(agents).toContain("generated from workflow-pack software-engineer-harness");
  });

  it("a follow-up --dry-run never reports an entry file as written when the merge is a no-op (#33)", async () => {
    await applyPack(dir, "software-engineer-harness", { force: false, dryRun: false });
    const r = await applyPack(dir, "software-engineer-harness", { force: false, dryRun: true });
    expect(r.written).not.toContain("AGENTS.md");
  });

  it("a follow-up real apply skips rewriting an entry file whose merge is unchanged (#33)", async () => {
    await applyPack(dir, "software-engineer-harness", { force: false, dryRun: false });
    const before = await stat(join(dir, "AGENTS.md"));
    const r = await applyPack(dir, "software-engineer-harness", { force: false, dryRun: false });
    expect(r.written).not.toContain("AGENTS.md");
    const after = await stat(join(dir, "AGENTS.md"));
    expect(after.mtimeMs).toBe(before.mtimeMs); // untouched — no needless rewrite
  });

  it("refuses to write a pack file through a symlinked directory inside the target (#30)", async () => {
    const outside = await mkdtemp(join(tmpdir(), "baselane-apply-outside-"));
    try {
      // The pack renders files under `.claude/` (agents, commands, settings.json). If `.claude`
      // is a symlink out of the target, a lexical-only guard would happily write through it.
      await symlink(outside, join(dir, ".claude"));
      await expect(
        applyPack(dir, "software-engineer-harness", { force: true, dryRun: false }),
      ).rejects.toThrow(/symlink/);
      expect(await readdir(outside)).toEqual([]); // nothing escaped into the symlink target
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
});

describe("applyResolvedPack (#6: custom pack, not just a built-in id)", () => {
  it("applies an already-resolved custom pack the same way applyPack applies a builtin one", async () => {
    const r = await applyResolvedPack(dir, customPack, { force: false, dryRun: false });
    expect(r.written).toContain("AGENTS.md");
    const agents = await readFile(join(dir, "AGENTS.md"), "utf8");
    expect(agents).toContain("<!-- baselane:start acme-custom@1.0.0");
  });

  it("region-merges the custom pack's id/version into an existing entry file", async () => {
    await writeFile(join(dir, "AGENTS.md"), "hands off", "utf8");
    const r = await applyResolvedPack(dir, customPack, { force: false, dryRun: false });
    expect(r.written).toContain("AGENTS.md");
    const merged = await readFile(join(dir, "AGENTS.md"), "utf8");
    expect(merged).toContain("hands off");
    expect(merged).toContain("<!-- baselane:start acme-custom@1.0.0");
  });

  it("dry-run reports but writes nothing for a custom pack", async () => {
    const r = await applyResolvedPack(dir, customPack, { force: false, dryRun: true });
    expect(r.written.length).toBeGreaterThan(0);
    await expect(readFile(join(dir, "AGENTS.md"), "utf8")).rejects.toThrow();
  });
});

describe("assertInsideDir", () => {
  it("returns the resolved absolute path for a safe relative path", () => {
    expect(assertInsideDir("/tmp/t", "AGENTS.md")).toBe("/tmp/t/AGENTS.md");
  });

  it("allows nested safe paths", () => {
    expect(assertInsideDir("/tmp/t", ".claude/agents/x.md")).toBe("/tmp/t/.claude/agents/x.md");
  });

  it("throws when a relative path escapes the target dir", () => {
    expect(() => assertInsideDir("/tmp/t", "../escape")).toThrow(/escapes target dir/);
  });

  it("throws when a path escapes via dot-dot segments", () => {
    expect(() => assertInsideDir("/tmp/t", "a/../../b")).toThrow(/escapes target dir/);
  });

  it("throws when the relative path is absolute", () => {
    expect(() => assertInsideDir("/tmp/t", "/etc/passwd")).toThrow(/escapes target dir/);
  });
});

describe("apply writes harness.json (customer-reported: apply then drift dead-ended)", () => {
  async function readManifest() {
    return JSON.parse(await readFile(join(dir, "harness.json"), "utf8"));
  }

  it("writes a manifest pinning the pack, with hashed vendored receipts and a region receipt per entry file", async () => {
    await applyPack(dir, "software-engineer-harness", { force: false, dryRun: false });
    const m = await readManifest();
    expect(Object.keys(m.packs)).toEqual(["software-engineer-harness"]);
    const settings = m.materialized.vendored.find((v: { path: string }) => v.path === ".claude/settings.json");
    expect(settings.sha256).toMatch(/^[0-9a-f]{64}$/);
    const agents = m.materialized.managedRegions.find((e: { path: string }) => e.path === "AGENTS.md");
    expect(agents.regions).toHaveLength(1);
    expect(agents.regions[0].packId).toBe("software-engineer-harness");
    expect(agents.regions[0].sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("drift runs clean immediately after apply", async () => {
    const { runDrift } = await import("../src/drift-cmd.ts");
    await applyPack(dir, "software-engineer-harness", { force: false, dryRun: false });
    const report = await runDrift({ global: false, dir });
    expect(report.clean).toBe(true);
    expect(report.vendored.length).toBeGreaterThan(0);
    expect(report.regions.length).toBeGreaterThan(0);
    expect(report.vendored.every((v) => v.status === "ok")).toBe(true);
  });

  it("does not write a manifest on dry-run", async () => {
    await applyPack(dir, "software-engineer-harness", { force: false, dryRun: true });
    await expect(readFile(join(dir, "harness.json"), "utf8")).rejects.toThrow();
  });

  it("leaves skipped pre-existing files out of the receipt so drift stays clean", async () => {
    await mkdir(join(dir, ".claude"), { recursive: true });
    await writeFile(join(dir, ".claude", "settings.json"), "{}", "utf8");
    await applyPack(dir, "software-engineer-harness", { force: false, dryRun: false });
    const m = await readManifest();
    expect(m.materialized.vendored.some((v: { path: string }) => v.path === ".claude/settings.json")).toBe(false);
    const { runDrift } = await import("../src/drift-cmd.ts");
    expect((await runDrift({ global: false, dir })).clean).toBe(true);
  });

  it("merges into an existing manifest: keeps other packs' pins, vendored entries, and region receipts", async () => {
    const prior = {
      version: 1,
      registry: "https://registry.example",
      target: { kind: "repo", id: "t" },
      packs: { "other-pack": "2.0.0" },
      capabilities: {},
      materialized: {
        vendored: [{ path: "skills/other.md", sha256: "a".repeat(64) }],
        managedRegions: [{ path: "AGENTS.md", regions: [{ packId: "other-pack", version: "2.0.0", sha256: "b".repeat(64) }] }],
        derivedCommitted: [],
        resolutions: {},
        capabilities: {},
      },
    };
    await writeFile(join(dir, "harness.json"), JSON.stringify(prior, null, 2), "utf8");
    await applyResolvedPack(dir, customPack, { force: false, dryRun: false });
    const m = await readManifest();
    expect(m.packs).toEqual({ "other-pack": "2.0.0", "acme-custom": "1.0.0" });
    expect(m.registry).toBe("https://registry.example");
    expect(m.materialized.vendored.some((v: { path: string }) => v.path === "skills/other.md")).toBe(true);
    const agents = m.materialized.managedRegions.find((e: { path: string }) => e.path === "AGENTS.md");
    const packIds = agents.regions.map((r: { packId: string }) => r.packId).sort();
    expect(packIds).toEqual(["acme-custom", "other-pack"]);
  });

  it("re-applying the same pack twice leaves a single pin and single region receipt", async () => {
    await applyResolvedPack(dir, customPack, { force: false, dryRun: false });
    await applyResolvedPack(dir, customPack, { force: true, dryRun: false });
    const m = await readManifest();
    expect(m.packs).toEqual({ "acme-custom": "1.0.0" });
    const agents = m.materialized.managedRegions.find((e: { path: string }) => e.path === "AGENTS.md");
    expect(agents.regions).toHaveLength(1);
  });
});
