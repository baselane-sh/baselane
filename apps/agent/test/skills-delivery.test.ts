import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateBundle } from "../src/validate-bundle.ts";
import { planReconcile, applyPlan, loadManifest, readCurrent } from "@baselane/materialize";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "baselane-agent-skl-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("skills delivery via bundle", () => {
  it("accepts a v2 bundle with a skills/ path and writes it to the target", async () => {
    const bundle = validateBundle({
      version: 2,
      files: { "skills/brainstorming/SKILL.md": "---\nname: brainstorming\ndescription: Explore first.\n---\n\n# B\n" },
      packIds: ["p"],
    });
    const manifest = await loadManifest(dir);
    const onDisk = await readCurrent(dir, Object.keys(bundle.files));
    const plan = planReconcile(bundle, manifest, onDisk);
    await applyPlan(dir, bundle, plan);
    expect(await readFile(join(dir, "skills/brainstorming/SKILL.md"), "utf8")).toContain("# B");
  });
});
