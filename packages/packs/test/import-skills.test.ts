import { describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resetFetchedArea } from "../scripts/import-skills.ts";

describe("import-skills reset (#19 first-party preservation)", () => {
  it("removes fetched artifacts but keeps skills/first-party across a re-import", async () => {
    const dir = await mkdtemp(join(tmpdir(), "seed-reset-"));
    try {
      // Simulate a populated seed area: a fetched skill dir, the generated manifest, and the
      // hand-authored first-party subtree.
      await mkdir(join(dir, "brainstorming"), { recursive: true });
      await writeFile(join(dir, "brainstorming", "SKILL.md"), "# fetched", "utf8");
      await writeFile(join(dir, "seed-manifest.json"), "{}", "utf8");
      await mkdir(join(dir, "first-party", "ts-extension-imports"), { recursive: true });
      await writeFile(join(dir, "first-party", "ts-extension-imports", "SKILL.md"), "# authored", "utf8");

      await resetFetchedArea(dir);

      // Everything fetched is gone; only the first-party subtree survives.
      expect((await readdir(dir)).sort()).toEqual(["first-party"]);
      expect((await readdir(join(dir, "first-party"))).sort()).toEqual(["ts-extension-imports"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("is a no-op-safe reset on a directory that does not yet exist", async () => {
    const base = await mkdtemp(join(tmpdir(), "seed-reset-"));
    try {
      const dir = join(base, "not-created-yet");
      await resetFetchedArea(dir); // must create it, not throw
      expect(await readdir(dir)).toEqual([]);
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });
});
