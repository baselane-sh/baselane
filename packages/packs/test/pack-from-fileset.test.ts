import { describe, expect, it } from "vitest";
import { packFromFileset } from "../src/pack-from-fileset.ts";

const OPTS = { repoName: "superpowers", ref: "v6.1.1", sha: "c".repeat(40) };

describe("packFromFileset", () => {
  it("native: parses root pack.json through validatePack, untouched id/version", async () => {
    // Build a minimal valid pack by round-tripping one the repo already trusts:
    const { loadBuiltinPack, listBuiltinPacks } = await import("../src/load.ts");
    const builtin = await loadBuiltinPack((await listBuiltinPacks())[0]); // listBuiltinPacks(): Promise<string[]>
    const r = await packFromFileset({ "pack.json": JSON.stringify(builtin) }, OPTS);
    expect(r.derived).toBe(false);
    expect(r.pack.id).toBe(builtin.id);
    expect(r.pack.version).toBe(builtin.version);
    expect(r.sources).toEqual(["pack.json"]);
  });

  it("native: invalid pack.json fails loudly via validatePack, not silently ingested", async () => {
    await expect(packFromFileset({ "pack.json": '{"id": 42}' }, OPTS)).rejects.toThrow();
  });

  it("derived: ingests .claude layout and stamps version from a v-tag", async () => {
    const files = {
      "AGENTS.md": "# My repo\n\nSome instructions.\n",
      ".claude/skills/tdd/SKILL.md": "---\nname: tdd\ndescription: Test-driven development discipline for every change\n---\n\nAlways write the failing test first.\n",
    };
    const r = await packFromFileset(files, OPTS);
    expect(r.derived).toBe(true);
    expect(r.pack.version).toBe("6.1.1");
    expect((r.pack.skills ?? []).length).toBeGreaterThan(0); // WorkflowPack.skills is optional
  });

  it("derived: remaps plugin-layout root skills/ into .claude/skills/ before ingest", async () => {
    const files = {
      "skills/tdd/SKILL.md": "---\nname: tdd\ndescription: Test-driven development discipline for every change\n---\n\nAlways write the failing test first.\n",
    };
    const r = await packFromFileset(files, { ...OPTS, ref: "main" });
    expect(r.derived).toBe(true);
    expect(r.pack.version).toBe(`0.0.0+${"c".repeat(7)}`);
    expect((r.pack.skills ?? []).some((s) => s.name === "tdd")).toBe(true);
  });

  it("throws naming both attempts when nothing is installable", async () => {
    await expect(packFromFileset({ "README.md": "hi" }, OPTS)).rejects.toThrow(/pack-from-fileset:.*pack\.json.*ingest/s);
  });

  it("derived: two-level skills/<category>/<name>/SKILL.md ingests", async () => {
    const files = {
      "AGENTS.md": "# repo\n",
      "skills/writing/tdd/SKILL.md": "---\nname: tdd\ndescription: Test-driven development discipline for every change\n---\n\nBody.\n",
    };
    const r = await packFromFileset(files, OPTS);
    expect(r.derived).toBe(true);
    expect((r.pack.skills ?? []).some((s) => s.name === "tdd")).toBe(true);
  });

  it("derived: two-level catalog dot-dirs (.curated/.experimental/.system) ingest as categories", async () => {
    const files = {
      "AGENTS.md": "# repo\n",
      "skills/.curated/tdd/SKILL.md": "---\nname: tdd\ndescription: Test-driven development discipline for every change\n---\n\nBody.\n",
    };
    const r = await packFromFileset(files, OPTS);
    expect(r.derived).toBe(true);
    expect((r.pack.skills ?? []).some((s) => s.name === "tdd")).toBe(true);
  });

  it("derived: .agents/skills/<name>/SKILL.md ingests", async () => {
    const files = {
      "AGENTS.md": "# repo\n",
      ".agents/skills/tdd/SKILL.md": "---\nname: tdd\ndescription: Test-driven development discipline for every change\n---\n\nBody.\n",
    };
    const r = await packFromFileset(files, OPTS);
    expect(r.derived).toBe(true);
    expect((r.pack.skills ?? []).some((s) => s.name === "tdd")).toBe(true);
  });

  it("derived: root SKILL.md — single-skill repo named after the repo", async () => {
    const files = {
      "SKILL.md": "---\nname: ignored\ndescription: Test-driven development discipline for every change\n---\n\nBody.\n",
    };
    const r = await packFromFileset(files, { ...OPTS, repoName: "org/superpowers" });
    expect(r.derived).toBe(true);
    // The frontmatter `name` still wins over the directory-derived fallback (ingestSkills'
    // own precedence) — root layout only decides WHICH directory maps to the skill, not the name.
    expect((r.pack.skills ?? []).some((s) => s.name === "ignored")).toBe(true);
  });

  it("derived: shallow-shadows-deep — skills/foo/SKILL.md beats skills/cat/foo/SKILL.md", async () => {
    const files = {
      "AGENTS.md": "# repo\n",
      "skills/foo/SKILL.md": "---\nname: foo\ndescription: The shallow winner for this skill name\n---\n\nShallow body.\n",
      "skills/cat/foo/SKILL.md": "---\nname: foo\ndescription: The deep loser for this skill name\n---\n\nDeep body.\n",
    };
    const r = await packFromFileset(files, OPTS);
    const foo = (r.pack.skills ?? []).find((s) => s.name === "foo");
    expect(foo).toBeDefined();
    expect(foo?.body).toContain("Shallow body.");
    expect((r.pack.skills ?? []).length).toBe(1);
  });

  it("derived: sibling files next to a SKILL.md remap along with it under the same skill dir", async () => {
    const files = {
      "AGENTS.md": "# repo\n",
      "skills/writing/tdd/SKILL.md": "---\nname: tdd\ndescription: Test-driven development discipline for every change\n---\n\nBody.\n",
      "skills/writing/tdd/reference.md": "Extra reference content.",
    };
    const r = await packFromFileset(files, OPTS);
    const tdd = (r.pack.skills ?? []).find((s) => s.name === "tdd");
    expect(tdd).toBeDefined();
    expect((tdd?.references ?? []).some((ref) => ref.body === "Extra reference content.")).toBe(true);
  });

  it("onlySkill: filters the derived pack to exactly the named skill", async () => {
    const files = {
      "AGENTS.md": "# repo\n",
      "skills/tdd/SKILL.md": "---\nname: tdd\ndescription: Test-driven development discipline for every change\n---\n\nBody.\n",
      "skills/other/SKILL.md": "---\nname: other\ndescription: A different skill entirely for this test\n---\n\nBody.\n",
    };
    const r = await packFromFileset(files, { ...OPTS, onlySkill: "tdd" });
    expect((r.pack.skills ?? []).map((s) => s.name)).toEqual(["tdd"]);
  });

  it("onlySkill: unknown name throws listing available skill names", async () => {
    const files = {
      "AGENTS.md": "# repo\n",
      "skills/tdd/SKILL.md": "---\nname: tdd\ndescription: Test-driven development discipline for every change\n---\n\nBody.\n",
      "skills/other/SKILL.md": "---\nname: other\ndescription: A different skill entirely for this test\n---\n\nBody.\n",
    };
    await expect(packFromFileset(files, { ...OPTS, onlySkill: "nope" })).rejects.toThrow(/no skill named "nope".*tdd.*other|no skill named "nope".*other.*tdd/s);
  });

  it("onlySkill: native pack.json fast-path also filters", async () => {
    const { loadBuiltinPack, listBuiltinPacks } = await import("../src/load.ts");
    const builtinIds = await listBuiltinPacks();
    let builtinWithSkills: Awaited<ReturnType<typeof loadBuiltinPack>> | undefined;
    for (const id of builtinIds) {
      const candidate = await loadBuiltinPack(id);
      if ((candidate.skills ?? []).length > 0) {
        builtinWithSkills = candidate;
        break;
      }
    }
    expect(builtinWithSkills).toBeDefined();
    const wantedName = builtinWithSkills!.skills![0].name;
    const r = await packFromFileset({ "pack.json": JSON.stringify(builtinWithSkills) }, { ...OPTS, onlySkill: wantedName });
    expect(r.derived).toBe(false);
    expect((r.pack.skills ?? []).map((s) => s.name)).toEqual([wantedName]);
  });

  it("still throws naming both attempts when a repo matches none of the skills-corpus layouts", async () => {
    const files = {
      "docs/README.md": "hi",
      "src/skills.ts": "not a skill file",
    };
    await expect(packFromFileset(files, OPTS)).rejects.toThrow(/pack-from-fileset:.*pack\.json.*ingest/s);
  });
});
