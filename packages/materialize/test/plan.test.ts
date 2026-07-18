import { describe, it, expect } from "vitest";
import { planReconcile } from "../src/plan.ts";
import { sha256 } from "../src/hash.ts";
import type { Bundle, Manifest } from "../src/types.ts";

const bundle = (files: Record<string, string>): Bundle => ({ version: 1, files });
const manifestOf = (files: Record<string, string>): Manifest => ({
  version: 1,
  files: Object.fromEntries(Object.entries(files).map(([p, c]) => [p, sha256(c)])),
});
const empty: Manifest = { version: 1, files: {} };

describe("planReconcile", () => {
  it("fresh install: everything in the bundle is a write", () => {
    const b = bundle({ "agents/a.md": "A", "commands/c.md": "C" });
    const plan = planReconcile(b, empty, { "agents/a.md": null, "commands/c.md": null });
    expect(plan).toEqual({
      writes: ["agents/a.md", "commands/c.md"],
      deletes: [],
      drifted: [],
      unchanged: [],
    });
  });

  it("no-op when disk already matches the bundle", () => {
    const b = bundle({ "agents/a.md": "A" });
    const plan = planReconcile(b, manifestOf({ "agents/a.md": "A" }), { "agents/a.md": "A" });
    expect(plan).toEqual({ writes: [], deletes: [], drifted: [], unchanged: ["agents/a.md"] });
  });

  it("changed bundle content is a write; removed bundle entry is a delete", () => {
    const b = bundle({ "agents/a.md": "A2" });
    const prior = manifestOf({ "agents/a.md": "A1", "commands/gone.md": "G" });
    const plan = planReconcile(b, prior, { "agents/a.md": "A1", "commands/gone.md": "G" });
    expect(plan.writes).toEqual(["agents/a.md"]);
    expect(plan.deletes).toEqual(["commands/gone.md"]);
  });

  it("a manifest path already absent on disk is not deleted again", () => {
    const plan = planReconcile(bundle({}), manifestOf({ "agents/a.md": "A" }), {
      "agents/a.md": null,
    });
    expect(plan.deletes).toEqual([]);
  });

  it("reports drift when a managed file was locally edited", () => {
    const b = bundle({ "agents/a.md": "A1" });
    const prior = manifestOf({ "agents/a.md": "A1" });
    const plan = planReconcile(b, prior, { "agents/a.md": "HACKED" });
    expect(plan.drifted).toEqual(["agents/a.md"]);
    expect(plan.writes).toEqual(["agents/a.md"]); // desired state still converges
  });

  it("never mentions paths outside bundle ∪ manifest", () => {
    const plan = planReconcile(bundle({ "agents/a.md": "A" }), empty, {
      "agents/a.md": null,
    });
    const all = [...plan.writes, ...plan.deletes, ...plan.drifted, ...plan.unchanged];
    expect(all).toEqual(["agents/a.md"]);
  });

  it("reports a locally-edited file that left the bundle as both drifted and deleted", () => {
    const prior = manifestOf({ "agents/a.md": "A1" });
    const plan = planReconcile(bundle({}), prior, { "agents/a.md": "HACKED" });
    expect(plan.drifted).toEqual(["agents/a.md"]);
    expect(plan.deletes).toEqual(["agents/a.md"]);
  });
});
