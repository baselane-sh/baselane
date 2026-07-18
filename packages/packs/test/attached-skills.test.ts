import { describe, expect, it } from "vitest";
import { listBuiltinPacks, loadBuiltinPack } from "../src/load.ts";
import { loadSeedSkills } from "../src/seed-skills.ts";

// #19 part 2: built-in packs may attach first-party skills (inlined into pack.json). The body is
// necessarily duplicated (a pack is a self-contained unit), so guard against silent drift between
// the attached copy and the catalog source.
describe("attached pack skills stay in sync with their first-party source", () => {
  it("every built-in pack skill sharing a first-party name carries the same body and description", async () => {
    const seed = await loadSeedSkills();
    const seedByName = new Map(seed.map((s) => [s.block.name, s.block]));
    const packs = await Promise.all((await listBuiltinPacks()).map((id) => loadBuiltinPack(id)));

    let checked = 0;
    for (const pack of packs) {
      for (const skill of pack.skills ?? []) {
        const source = seedByName.get(skill.name);
        if (!source) continue; // a pack-only skill with no catalog twin is fine
        checked++;
        // Bodies compared trimmed: the catalog parse keeps a leading blank line, the inlined copy
        // is fully trimmed — only real content drift should fail this.
        expect(skill.body.trim(), `${pack.id} attaches "${skill.name}" but its body drifted from the first-party source`).toBe(source.body.trim());
        expect(skill.description, `${pack.id} "${skill.name}" description drifted from the first-party source`).toBe(source.description);
      }
    }
    expect(checked, "expected at least one attached first-party skill to verify").toBeGreaterThan(0);
  });
});
