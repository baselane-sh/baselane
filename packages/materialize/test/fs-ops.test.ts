import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  MANIFEST_NAME,
  loadManifest,
  readCurrent,
  applyPlan,
  writeManifest,
} from "../src/fs-ops.ts";
import { sha256 } from "../src/hash.ts";
import type { Bundle } from "../src/types.ts";

let root = "";
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "baselane-agent-"));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const bundle: Bundle = {
  version: 1,
  files: { "agents/a.md": "AAA", "commands/c.md": "CCC" },
};

describe("fs-ops", () => {
  it("loadManifest returns an empty manifest when none exists", async () => {
    expect(await loadManifest(root)).toEqual({ version: 1, files: {} });
  });

  it("writeManifest then loadManifest round-trips bundle hashes", async () => {
    await writeManifest(root, bundle);
    const m = await loadManifest(root);
    expect(m.files["agents/a.md"]).toBe(sha256("AAA"));
    expect(Object.keys(m.files)).toHaveLength(2);
  });

  it("throws on a malformed manifest instead of defaulting", async () => {
    await writeFile(join(root, MANIFEST_NAME), "{not json", "utf8");
    await expect(loadManifest(root)).rejects.toThrow();
  });

  it("readCurrent maps present files to content and absent to null", async () => {
    await mkdir(join(root, "agents"), { recursive: true });
    await writeFile(join(root, "agents/a.md"), "AAA", "utf8");
    const state = await readCurrent(root, ["agents/a.md", "commands/c.md"]);
    expect(state).toEqual({ "agents/a.md": "AAA", "commands/c.md": null });
  });

  it("applyPlan writes (creating parent dirs) and deletes exactly the planned paths", async () => {
    await mkdir(join(root, "commands"), { recursive: true });
    await writeFile(join(root, "commands/old.md"), "OLD", "utf8");
    await writeFile(join(root, "unmanaged.txt"), "MINE", "utf8");
    await applyPlan(root, bundle, {
      writes: ["agents/a.md", "commands/c.md"],
      deletes: ["commands/old.md"],
      drifted: [],
      unchanged: [],
    });
    expect(await readFile(join(root, "agents/a.md"), "utf8")).toBe("AAA");
    expect(await readFile(join(root, "commands/c.md"), "utf8")).toBe("CCC");
    await expect(readFile(join(root, "commands/old.md"), "utf8")).rejects.toThrow();
    expect(await readFile(join(root, "unmanaged.txt"), "utf8")).toBe("MINE"); // never-clobber
  });

  it("applyPlan backs up a drifted (hand-edited) file to *.baselane-bak before reverting it (#3)", async () => {
    await mkdir(join(root, "agents"), { recursive: true });
    await writeFile(join(root, "agents/a.md"), "LOCAL EDIT", "utf8"); // developer's hand-edit
    const b: Bundle = { version: 1, files: { "agents/a.md": "MANAGED" } };
    await applyPlan(root, b, { writes: ["agents/a.md"], deletes: [], drifted: ["agents/a.md"], unchanged: [] });
    expect(await readFile(join(root, "agents/a.md"), "utf8")).toBe("MANAGED"); // reverted to managed
    expect(await readFile(join(root, "agents/a.md.baselane-bak"), "utf8")).toBe("LOCAL EDIT"); // edit recoverable
  });

  it("applyPlan backs up a drifted delete-target (hand-edited, now-unbundled) file to *.baselane-bak before removing it (finding 4)", async () => {
    await mkdir(join(root, "agents"), { recursive: true });
    await writeFile(join(root, "agents/old.md"), "HAND EDITED", "utf8"); // developer's hand-edit, tracked hash differs
    const b: Bundle = { version: 1, files: {} }; // bundle no longer ships this file
    await applyPlan(root, b, { writes: [], deletes: ["agents/old.md"], drifted: ["agents/old.md"], unchanged: [] });
    await expect(readFile(join(root, "agents/old.md"), "utf8")).rejects.toThrow(); // deleted
    expect(await readFile(join(root, "agents/old.md.baselane-bak"), "utf8")).toBe("HAND EDITED"); // edit recoverable
  });

  it("applyPlan makes no backup for a non-drifted delete", async () => {
    await mkdir(join(root, "commands"), { recursive: true });
    await writeFile(join(root, "commands/old.md"), "OLD", "utf8");
    await applyPlan(root, { version: 1, files: {} }, { writes: [], deletes: ["commands/old.md"], drifted: [], unchanged: [] });
    await expect(readFile(join(root, "commands/old.md.baselane-bak"), "utf8")).rejects.toThrow();
  });

  it("applyPlan makes no backup for a non-drifted write (new file)", async () => {
    const b: Bundle = { version: 1, files: { "agents/new.md": "NEW" } };
    await applyPlan(root, b, { writes: ["agents/new.md"], deletes: [], drifted: [], unchanged: [] });
    await expect(readFile(join(root, "agents/new.md.baselane-bak"), "utf8")).rejects.toThrow();
  });

  it("applyPlan refuses a path that escapes the root", async () => {
    const evil: Bundle = { version: 1, files: { "../evil.md": "X" } };
    await expect(
      applyPlan(root, evil, { writes: ["../evil.md"], deletes: [], drifted: [], unchanged: [] }),
    ).rejects.toThrow(/escapes target root/);
  });

  it("refuses a delete path that escapes the root", async () => {
    await expect(
      applyPlan(root, { version: 1, files: {} }, { writes: [], deletes: ["../evil.md"], drifted: [], unchanged: [] }),
    ).rejects.toThrow(/escapes target root/);
  });

  it("refuses to write through a symlinked directory inside the root", async () => {
    const outside = await mkdtemp(join(tmpdir(), "baselane-outside-"));
    try {
      await symlink(outside, join(root, "agents"));
      await expect(
        applyPlan(root, bundle, { writes: ["agents/a.md"], deletes: [], drifted: [], unchanged: [] }),
      ).rejects.toThrow(/traverses a symlink/);
      await expect(readFile(join(outside, "a.md"), "utf8")).rejects.toThrow();
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
});
