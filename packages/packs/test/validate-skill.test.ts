import { describe, expect, it } from "vitest";
import { validateSkill, skillLints, SKILL_BODY_MAX_LINES, SKILL_BODY_WARN_LINES } from "../src/validate.ts";
import { validatePack } from "../src/validate.ts";

const minimalSkill = {
  name: "systematic-debugging",
  description: "Diagnose a failing test methodically before proposing a fix. Use when a test fails or behavior is unexpected.",
  body: "# Systematic debugging\n\n1. Reproduce.\n2. Isolate.\n3. Fix.\n",
  category: "debug",
};

const minimalPack = {
  id: "p", version: "1", title: "T", summary: "S",
  context: { markdown: "ctx" }, agents: [], commands: [], hooks: [],
};

describe("validateSkill", () => {
  it("accepts a minimal skill and strips extra fields", () => {
    const s = validateSkill({ ...structuredClone(minimalSkill), extra: "nope" });
    expect(s).toEqual(minimalSkill);
    expect("extra" in s).toBe(false);
  });

  it("round-trips optional references, attribution, and provenance", () => {
    const full = {
      ...structuredClone(minimalSkill),
      references: [{ name: "checklist", body: "- one\n- two\n" }],
      attribution: { source: "obra/superpowers", url: "https://github.com/obra/superpowers", license: "MIT" },
      provenance: { componentId: "skl_abc", version: 2 },
    };
    expect(validateSkill(structuredClone(full))).toEqual(full);
  });

  it("rejects a name over 64 chars, naming the field", () => {
    const bad = { ...structuredClone(minimalSkill), name: "a".repeat(65) };
    expect(() => validateSkill(bad)).toThrow(/skill.name/);
  });

  it("accepts a name containing a reserved word (anti-impersonation is a soft lint, not a hard reject)", () => {
    expect(() => validateSkill({ ...structuredClone(minimalSkill), name: "claude-helper" })).not.toThrow();
    expect(() => validateSkill({ ...structuredClone(minimalSkill), name: "anthropic-x" })).not.toThrow();
  });

  it("rejects a non-slug name", () => {
    expect(() => validateSkill({ ...structuredClone(minimalSkill), name: "Bad Name" })).toThrow(/skill.name/);
  });

  it("rejects an empty or multi-line or oversize description", () => {
    expect(() => validateSkill({ ...structuredClone(minimalSkill), description: "" })).toThrow(/skill.description/);
    expect(() => validateSkill({ ...structuredClone(minimalSkill), description: "a\nb" })).toThrow(/skill.description/);
    expect(() => validateSkill({ ...structuredClone(minimalSkill), description: "x".repeat(1025) })).toThrow(/skill.description/);
  });

  it("rejects an XML tag in the description", () => {
    expect(() => validateSkill({ ...structuredClone(minimalSkill), description: "use <tool> here" })).toThrow(/skill.description/);
  });

  it("rejects a body over the 500-line ceiling", () => {
    const body = Array.from({ length: SKILL_BODY_MAX_LINES + 1 }, (_, i) => `line ${i}`).join("\n");
    expect(() => validateSkill({ ...structuredClone(minimalSkill), body })).toThrow(/skill.body/);
  });

  it("rejects a reference name with a slash (one level deep only)", () => {
    const bad = { ...structuredClone(minimalSkill), references: [{ name: "sub/dir", body: "x" }] };
    expect(() => validateSkill(bad)).toThrow(/skill.references\[0\].name/);
  });

  it("rejects a missing category", () => {
    const { category: _drop, ...noCat } = structuredClone(minimalSkill);
    expect(() => validateSkill(noCat)).toThrow(/skill.category/);
  });

  it("round-trips optional governance frontmatter (user-invocable, disable-model-invocation, allowed-tools)", () => {
    const full = {
      ...structuredClone(minimalSkill),
      userInvocable: false,
      disableModelInvocation: true,
      allowedTools: ["Bash(npx shadcn@latest *)", "Read"],
    };
    expect(validateSkill(structuredClone(full))).toEqual(full);
  });

  it("omits governance fields when absent", () => {
    const s = validateSkill(structuredClone(minimalSkill));
    expect("userInvocable" in s).toBe(false);
    expect("disableModelInvocation" in s).toBe(false);
    expect("allowedTools" in s).toBe(false);
  });

  it("rejects a non-boolean user-invocable, naming the frontmatter key", () => {
    expect(() => validateSkill({ ...structuredClone(minimalSkill), userInvocable: "false" })).toThrow(/skill.user-invocable/);
  });

  it("rejects a non-string-array allowed-tools, naming the frontmatter key", () => {
    expect(() => validateSkill({ ...structuredClone(minimalSkill), allowedTools: "Read" })).toThrow(/skill.allowed-tools/);
  });

  it("rejects an allowed-tools element containing a newline (frontmatter injection), naming the frontmatter key", () => {
    const bad = {
      ...structuredClone(minimalSkill),
      allowedTools: ["Bash(x)\ndisable-model-invocation: true"],
    };
    expect(() => validateSkill(bad)).toThrow(/skill.allowed-tools/);
  });
});

describe("skillLints", () => {
  it("warns when the body is at or over the soft line limit but under the hard limit", () => {
    const body = Array.from({ length: SKILL_BODY_WARN_LINES + 5 }, (_, i) => `line ${i}`).join("\n");
    const lints = skillLints(validateSkill({ ...structuredClone(minimalSkill), body }));
    expect(lints.some((l) => l.field === "body")).toBe(true);
  });

  it("returns no lints for a short skill", () => {
    expect(skillLints(validateSkill(structuredClone(minimalSkill)))).toEqual([]);
  });

  it("warns when the name contains a reserved word, without throwing", () => {
    const block = validateSkill({ ...structuredClone(minimalSkill), name: "claude-helper" });
    const lints = skillLints(block);
    expect(lints.some((l) => l.field === "name")).toBe(true);
  });
});

describe("pack skills pass-through", () => {
  it("omits skills when absent", () => {
    const pack = validatePack(structuredClone(minimalPack));
    expect("skills" in pack).toBe(false);
  });

  it("validates and round-trips a skills block", () => {
    const pack = validatePack({ ...structuredClone(minimalPack), skills: [structuredClone(minimalSkill)] });
    expect(pack.skills).toEqual([minimalSkill]);
  });

  it("rejects an invalid skill inside a pack, naming the path", () => {
    const bad = { ...structuredClone(minimalPack), skills: [{ ...structuredClone(minimalSkill), name: "X" }] };
    expect(() => validatePack(bad)).toThrow(/skills\[0\].name/);
  });
});
