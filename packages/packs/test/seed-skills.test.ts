import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadSeedSkills, seedSkillsDir } from "../src/seed-skills.ts";
import { validateSkill } from "../src/validate.ts";

const FORBIDDEN = ["docx", "pdf", "pptx", "xlsx", "doc-coauthoring"];

describe("curated seed", () => {
  it("loads a non-trivial catalog and every block re-validates", async () => {
    const seed = await loadSeedSkills();
    expect(seed.length).toBeGreaterThanOrEqual(14);
    for (const s of seed) expect(() => validateSkill(s.block)).not.toThrow();
  });

  it("retains a licence notice and attribution for every imported (third-party) skill", async () => {
    const seed = await loadSeedSkills();
    for (const s of seed) {
      // First-party skills are authored in-repo, not imported — they carry no third-party licence.
      if (s.source === "baselane") continue;
      expect(s.licenseText.trim().length).toBeGreaterThan(0);
      expect(s.block.attribution?.license).toBeTruthy();
      expect(s.block.attribution?.source).toBeTruthy();
    }
  });

  it("merges baselane-authored first-party skills — tagged, unattributed (#19)", async () => {
    const seed = await loadSeedSkills();
    const firstParty = seed.filter((s) => s.source === "baselane");
    const thirdParty = seed.filter((s) => s.source !== "baselane");
    expect(firstParty.length).toBeGreaterThanOrEqual(6); // the authored first-party set
    for (const s of firstParty) {
      expect(() => validateSkill(s.block)).not.toThrow();
      // No external licence notice: first-party content is ours, not carried under a third-party licence.
      expect(s.block.attribution).toBeUndefined();
      expect(s.licenseText).toBe("");
    }
    expect(firstParty.some((s) => s.block.name === "ts-extension-imports")).toBe(true);
    // First-party skills must not shadow an imported skill of the same name (#19/#23 anti-overlap).
    const thirdPartyNames = new Set(thirdParty.map((s) => s.block.name));
    for (const s of firstParty) {
      expect(thirdPartyNames.has(s.block.name), `first-party "${s.block.name}" shadows a third-party seed skill`).toBe(false);
    }
  });

  it("draws skills from both sources under both licences", async () => {
    const seed = await loadSeedSkills();
    const licenses = new Set(seed.map((s) => s.block.attribution?.license));
    const sources = new Set(seed.map((s) => s.source));
    expect(licenses.has("MIT")).toBe(true);
    expect(licenses.has("Apache-2.0")).toBe(true);
    expect(sources.has("obra/superpowers")).toBe(true);
    expect(sources.has("anthropics/skills")).toBe(true);
  });

  it("includes the superpowers process skills and excludes every forbidden document skill", async () => {
    const seed = await loadSeedSkills();
    const names = new Set(seed.map((s) => s.block.name));
    expect(names.has("brainstorming")).toBe(true);
    expect(names.has("systematic-debugging")).toBe(true);
    for (const forbidden of FORBIDDEN) expect(names.has(forbidden)).toBe(false);
  });

  it("assigns every skill a category slug", async () => {
    const seed = await loadSeedSkills();
    for (const s of seed) expect(s.block.category).toMatch(/^[a-z0-9][a-z0-9-]*$/);
  });

  // #9.1 — the importer used to fetch only SKILL.md + LICENSE per skill, stripping every
  // companion file its own SKILL.md text pointed at (dangling links mid-task). Re-vendoring the
  // full directory + wiring loadSeedSkills() to read those companions back in as references[] is
  // the fix; these two skills were named as confirmed danglers in the review.
  it("loads at least one seed skill with a non-empty references[] (dangling-link fix, #9.1)", async () => {
    const seed = await loadSeedSkills();
    const withRefs = seed.filter((s) => (s.block.references?.length ?? 0) > 0);
    expect(withRefs.length).toBeGreaterThan(0);
    for (const s of withRefs) expect(() => validateSkill(s.block)).not.toThrow();
  });

  it("re-vendors systematic-debugging's flat companion files as references (previously dangling)", async () => {
    const dir = join(seedSkillsDir(), "systematic-debugging");
    // These are the exact files systematic-debugging's own SKILL.md names — present on disk now
    // that the importer vendors the full directory, not just SKILL.md.
    expect(existsSync(join(dir, "root-cause-tracing.md"))).toBe(true);
    expect(existsSync(join(dir, "defense-in-depth.md"))).toBe(true);
    expect(existsSync(join(dir, "condition-based-waiting.md"))).toBe(true);

    const seed = await loadSeedSkills();
    const skill = seed.find((s) => s.block.name === "systematic-debugging");
    expect(skill).toBeDefined();
    const refNames = new Set((skill?.block.references ?? []).map((r) => r.name));
    expect(refNames.has("root-cause-tracing")).toBe(true);
    expect(refNames.has("defense-in-depth")).toBe(true);
    expect(refNames.has("condition-based-waiting")).toBe(true);
  });

  it("re-vendors mcp-builder's nested reference/*.md files as slugified references (previously dangling)", async () => {
    const dir = join(seedSkillsDir(), "mcp-builder");
    // mcp-builder's companions live under a nested reference/ dir — the importer must walk into
    // subdirectories, not just the skill's top level.
    expect(existsSync(join(dir, "reference", "mcp_best_practices.md"))).toBe(true);
    expect(existsSync(join(dir, "reference", "evaluation.md"))).toBe(true);

    const seed = await loadSeedSkills();
    const skill = seed.find((s) => s.block.name === "mcp-builder");
    expect(skill).toBeDefined();
    expect(skill?.block.references?.length ?? 0).toBeGreaterThan(0);
    // Nested paths are flattened into a slug (render only ever emits a flat <name>.md sibling of
    // SKILL.md), so "reference/mcp_best_practices.md" becomes "reference-mcp-best-practices".
    const refNames = new Set((skill?.block.references ?? []).map((r) => r.name));
    expect(refNames.has("reference-mcp-best-practices")).toBe(true);
    expect(refNames.has("reference-evaluation")).toBe(true);
    for (const r of skill?.block.references ?? []) {
      expect(r.name).toMatch(/^[a-z0-9][a-z0-9-]*$/); // must itself be a valid slug (validateSkill's rule)
    }
  });
});
