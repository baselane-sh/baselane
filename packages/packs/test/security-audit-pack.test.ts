import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validatePack } from "../src/validate.ts";
import { renderPack } from "../src/render/render-pack.ts";

// The flagship security pack (increment: upgrade thin `security-review` per
// docs/superpowers/reviews/2026-07-11-session-inputs.md §A2). Asserts the pack carries the
// 4-layer pre-deploy audit as a skill, a /security-audit command that runs it, the CLAUDE.md
// "Security Rules" block as context, and a real-lifecycle-event hook (never an invented
// "pre-deploy" event — that's platform-council-review finding #11).

const packDir = join(dirname(fileURLToPath(import.meta.url)), "..", "packs", "security-review");
const raw: unknown = JSON.parse(readFileSync(join(packDir, "pack.json"), "utf8"));

describe("flagship security pack", () => {
  it("validates against the locked schema", () => {
    const pack = validatePack(raw);
    expect(pack.id).toBe("security-review");
  });

  it("carries a security-audit skill encoding all 4 layers with an audit prompt each", () => {
    const pack = validatePack(raw);
    const skill = pack.skills?.find((s) => s.name === "security-audit");
    expect(skill).toBeDefined();
    for (const layer of ["Secrets", "Authentication", "Input validation", "Data access"]) {
      expect(skill!.body).toContain(layer);
    }
    expect(skill!.body.toLowerCase()).toContain("audit prompt");
  });

  it("names the toolkit in the skill body", () => {
    const pack = validatePack(raw);
    const skill = pack.skills!.find((s) => s.name === "security-audit")!;
    for (const tool of ["gitleaks", "trufflehog", "npm audit", "pip-audit", "semgrep"]) {
      expect(skill.body).toContain(tool);
    }
  });

  it("has a /security-audit command that runs the 4-layer pass", () => {
    const pack = validatePack(raw);
    const cmd = pack.commands.find((c) => c.name === "security-audit");
    expect(cmd).toBeDefined();
    expect(cmd!.prompt.toLowerCase()).toContain("security-audit skill");
  });

  it("keeps the existing security-reviewer agent and /security-scan command intact", () => {
    const pack = validatePack(raw);
    expect(pack.agents.some((a) => a.name === "security-reviewer")).toBe(true);
    expect(pack.commands.some((c) => c.name === "security-scan")).toBe(true);
  });

  it("carries the CLAUDE.md Security Rules block in context.markdown", () => {
    const pack = validatePack(raw);
    const md = pack.context.markdown;
    expect(md).toContain("environment variable");
    expect(md).toContain("parameterized");
    expect(md.toLowerCase()).toContain("row-level security");
    expect(md.toLowerCase()).toContain("httponly");
  });

  it("only uses real Claude Code lifecycle hook events, never an invented one", () => {
    const pack = validatePack(raw);
    const REAL_EVENTS = new Set([
      "PreToolUse",
      "PostToolUse",
      "Notification",
      "UserPromptSubmit",
      "Stop",
      "SubagentStop",
      "PreCompact",
      "SessionStart",
      "SessionEnd",
    ]);
    for (const h of pack.hooks) expect(REAL_EVENTS.has(h.event)).toBe(true);
    expect(pack.hooks.some((h) => h.event === "pre-deploy")).toBe(false);
  });

  it("adds a Stop-event reminder to run the audit before shipping", () => {
    const pack = validatePack(raw);
    const stopHook = pack.hooks.find((h) => h.event === "Stop");
    expect(stopHook).toBeDefined();
    expect(stopHook!.description.toLowerCase()).toContain("security-audit");
  });

  it("renders the skill and command into the file map", () => {
    const pack = validatePack(raw);
    const files = renderPack(pack);
    expect(files[".claude/skills/security-audit/SKILL.md"]).toBeDefined();
    expect(files[".claude/commands/security-audit.md"]).toBeDefined();
    expect(files["CLAUDE.md"]).toContain("Skill: `.claude/skills/security-audit/SKILL.md`");
    expect(files["AGENTS.md"]).toContain("### Skills");
    expect(files["AGENTS.md"]).toContain("- **security-audit**");
  });
});
