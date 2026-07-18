import { describe, expect, it } from "vitest";
import type { SkillBlock, WorkflowPack } from "../src/types.ts";
import { computeSkillOverlaps, normalizeName } from "../src/overlap.ts";

function pack(over: Partial<WorkflowPack>): WorkflowPack {
  return {
    id: "p", version: "1.0.0", title: "T", summary: "s", context: { markdown: "# x\n" },
    agents: [], commands: [], hooks: [], ...over,
  } as WorkflowPack;
}
function cmd(name: string): WorkflowPack["commands"][number] {
  return { name, description: "d", argument_hint: "", prompt: "p" };
}
function skill(name: string): SkillBlock {
  return { name, description: "d", body: "b\n", category: "write" };
}

describe("normalizeName", () => {
  it("collapses gerund/plural word forms so concept-equal names match", () => {
    expect(normalizeName("brainstorm")).toBe(normalizeName("brainstorming"));
    expect(normalizeName("write-plan")).toBe(normalizeName("writing-plans"));
    expect(normalizeName("execute-plan")).toBe(normalizeName("executing-plans"));
    expect(normalizeName("systematic-debugging")).toBe(normalizeName("systematic-debugging"));
  });
  it("does not collapse genuinely different names", () => {
    expect(normalizeName("go-review")).not.toBe(normalizeName("brainstorming"));
    expect(normalizeName("frontend-design")).not.toBe(normalizeName("write-plan"));
  });
});

describe("computeSkillOverlaps", () => {
  it("flags a skill whose name matches a pack id (systematic-debugging pack <-> skill, #23)", () => {
    const o = computeSkillOverlaps([pack({ id: "systematic-debugging" })], [skill("systematic-debugging"), skill("unrelated")]);
    expect(o).toHaveLength(1);
    expect(o[0]).toMatchObject({ packId: "systematic-debugging", skillName: "systematic-debugging", via: "pack-id" });
  });

  it("flags skills matching a pack's commands across word forms (disciplined-workflow <-> seed skills, #23)", () => {
    const packs = [pack({
      id: "disciplined-workflow",
      commands: [cmd("brainstorm"), cmd("write-plan"), cmd("execute-plan")],
    })];
    const skills = [skill("brainstorming"), skill("writing-plans"), skill("executing-plans"), skill("frontend-design")];
    const o = computeSkillOverlaps(packs, skills);
    expect(o.map((x) => x.skillName).sort()).toEqual(["brainstorming", "executing-plans", "writing-plans"]);
    expect(o.every((x) => x.via === "command")).toBe(true);
  });

  it("flags a skill matching a pack's agent name across word forms", () => {
    const packs = [pack({ id: "p", agents: [{ name: "brainstorm", description: "d", tools: ["Read"], model: "sonnet", prompt: "p" }] })];
    const o = computeSkillOverlaps(packs, [skill("brainstorming")]);
    expect(o).toHaveLength(1);
    expect(o[0]).toMatchObject({ via: "agent", matchedName: "brainstorm" });
  });

  it("does NOT collapse agent-noun/verb suffix differences (reviewer vs review) — those are declared, not guessed", () => {
    const packs = [pack({ id: "p", agents: [{ name: "code-reviewer", description: "d", tools: ["Read"], model: "sonnet", prompt: "p" }] })];
    expect(computeSkillOverlaps(packs, [skill("code-review")])).toEqual([]);
  });

  it("returns nothing when there is no overlap", () => {
    expect(computeSkillOverlaps([pack({ id: "security-review" })], [skill("brand-guidelines")])).toEqual([]);
  });

  it("does not double-count one skill against two matching surfaces of the same pack", () => {
    const packs = [pack({ id: "debug", commands: [cmd("debug")] })];
    const o = computeSkillOverlaps(packs, [skill("debug")]);
    expect(o).toHaveLength(1); // one overlap for the (pack, skill) pair, not one per surface
  });
});
