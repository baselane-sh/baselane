import { describe, expect, it } from "vitest";
import { validatePack } from "../src/validate.ts";
import { renderPack } from "../src/render/render-pack.ts";
import { renderBundleFiles } from "../src/render/bundle.ts";
import { renderBundleUnion } from "../src/render/bundle-union.ts";

const base = { id: "p", version: "1", title: "T", summary: "S", context: { markdown: "ctx" }, agents: [], commands: [], hooks: [] };

const skill = {
  name: "brainstorming",
  description: "Explore intent before building. Use before any creative work.",
  body: "# Brainstorming\n\nAsk what and why first.\n",
  category: "plan",
};

function packWith(skills: unknown[]) {
  return validatePack({ ...structuredClone(base), skills });
}

describe("Option A skill rendering", () => {
  it("writes a native SKILL.md with two-field frontmatter and the body", () => {
    const files = renderPack(packWith([structuredClone(skill)]));
    expect(files[".claude/skills/brainstorming/SKILL.md"]).toBe(
      "---\nname: brainstorming\ndescription: Explore intent before building. Use before any creative work.\n---\n\n# Brainstorming\n\nAsk what and why first.\n",
    );
  });

  it("emits governance frontmatter (user-invocable, disable-model-invocation, allowed-tools) after description when present", () => {
    const files = renderPack(packWith([{
      ...structuredClone(skill),
      userInvocable: false,
      disableModelInvocation: true,
      allowedTools: ["Bash(npx shadcn@latest *)", "Read"],
    }]));
    expect(files[".claude/skills/brainstorming/SKILL.md"]).toBe(
      "---\nname: brainstorming\ndescription: Explore intent before building. Use before any creative work.\nuser-invocable: false\ndisable-model-invocation: true\nallowed-tools: Bash(npx shadcn@latest *), Read\n---\n\n# Brainstorming\n\nAsk what and why first.\n",
    );
  });

  it("orders governance frontmatter before the license key when both are present", () => {
    const files = renderPack(packWith([{
      ...structuredClone(skill),
      userInvocable: false,
      attribution: { source: "autometa-ltd/AL-Design", url: "https://github.com/autometa-ltd/AL-Design", license: "MIT" },
    }]));
    expect(files[".claude/skills/brainstorming/SKILL.md"]).toContain("user-invocable: false\nlicense: MIT\n");
  });

  it("renders a reference file one level deep and a license frontmatter key + attribution comment", () => {
    const files = renderPack(packWith([{
      ...structuredClone(skill),
      references: [{ name: "checklist", body: "- reproduce\n- isolate\n" }],
      attribution: { source: "obra/superpowers", url: "https://github.com/obra/superpowers", license: "MIT" },
    }]));
    expect(files[".claude/skills/brainstorming/checklist.md"]).toBe("- reproduce\n- isolate\n");
    expect(files[".claude/skills/brainstorming/SKILL.md"]).toBe(
      "---\nname: brainstorming\ndescription: Explore intent before building. Use before any creative work.\nlicense: MIT\n---\n\n<!-- adapted from obra/superpowers (MIT) — https://github.com/obra/superpowers -->\n\n# Brainstorming\n\nAsk what and why first.\n",
    );
  });

  it("adds a CLAUDE.md index line and an AGENTS.md Skills section (index only, not the body)", () => {
    const files = renderPack(packWith([structuredClone(skill)]));
    expect(files["CLAUDE.md"]).toContain("- Skill: `.claude/skills/brainstorming/SKILL.md` — Explore intent before building. Use before any creative work.");
    expect(files["AGENTS.md"]).toContain("### Skills");
    expect(files["AGENTS.md"]).toContain("- **brainstorming** — Explore intent before building. Use before any creative work.");
    expect(files["AGENTS.md"]).not.toContain("Ask what and why first."); // body not inlined into AGENTS.md
  });

  it("inlines full skill bodies into GEMINI.md and copilot-instructions.md", () => {
    const files = renderPack(packWith([structuredClone(skill)]));
    expect(files["GEMINI.md"]).toContain("@AGENTS.md");
    expect(files["GEMINI.md"]).toContain("Ask what and why first."); // full body
    expect(files[".github/copilot-instructions.md"]).toContain("Ask what and why first.");
  });

  it("remaps skills into the machine bundle under skills/", () => {
    const bundle = renderBundleFiles(packWith([structuredClone(skill)]));
    expect(bundle["skills/brainstorming/SKILL.md"]).toContain("# Brainstorming");
    expect(".claude/skills/brainstorming/SKILL.md" in bundle).toBe(false);
  });

  it("unions skills across packs and flags a same-name differing-body collision", () => {
    const a = packWith([structuredClone(skill)]);
    const b = packWith([{ ...structuredClone(skill), body: "# Brainstorming\n\nDIFFERENT.\n" }]);
    const union = renderBundleUnion([a, b]);
    expect(union.files["skills/brainstorming/SKILL.md"]).toContain("Ask what and why first."); // first wins
    expect(union.collisions).toContain("skills/brainstorming/SKILL.md");
  });

  it("is byte-identical to today when a pack has no skills", () => {
    const files = renderPack(validatePack(structuredClone(base)));
    expect(files["GEMINI.md"]).toBe("# GEMINI.md\n\n@AGENTS.md\n");
    expect(files["CLAUDE.md"]).not.toContain("- Skill:");
    expect(files["AGENTS.md"]).not.toContain("### Skills");
    expect(Object.keys(files).some((k) => k.startsWith(".claude/skills/"))).toBe(false);
  });
});
