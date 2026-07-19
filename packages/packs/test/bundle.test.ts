import { describe, expect, it } from "vitest";
import { loadBuiltinPack } from "../src/load.ts";
import { renderBundleFiles } from "../src/render/bundle.ts";
import { renderClaudeFiles } from "../src/render/claude.ts";

describe("renderBundleFiles", () => {
  it("maps agents and commands to whitelist roots with claude-identical bodies", async () => {
    const pack = await loadBuiltinPack("token-efficiency-harness");
    const bundle = renderBundleFiles(pack);
    const claude = renderClaudeFiles(pack);
    expect(Object.keys(bundle).sort()).toEqual([
      ".baselane/capabilities.json",
      "agents/scout.md",
      "commands/handoff.md",
      "commands/usage-audit.md",
      "settings.json",
    ]);
    expect(bundle["agents/scout.md"]).toBe(claude[".claude/agents/scout.md"]);
    expect(bundle["commands/handoff.md"]).toBe(claude[".claude/commands/handoff.md"]);
    expect(bundle["settings.json"]).toBe(claude[".claude/settings.json"]);
    expect(
      Object.keys(bundle).every((p) => p === "settings.json" || /^(agents|commands|skills|\.baselane)\//.test(p)),
    ).toBe(true);
  });

  it("includes settings.json (claude-identical body) when the pack has hooks, even with no agents or commands", async () => {
    const pack = await loadBuiltinPack("software-engineer-harness");
    const stripped = { ...pack, agents: [], commands: [], skills: [], capabilities: [] };
    const bundle = renderBundleFiles(stripped);
    const claude = renderClaudeFiles(stripped);
    expect(bundle).toEqual({ "settings.json": claude[".claude/settings.json"] });
  });

  it("renders an empty map for a pack with no agents, commands, hooks, or capabilities", async () => {
    const pack = await loadBuiltinPack("software-engineer-harness");
    const stripped = { ...pack, agents: [], commands: [], hooks: [], skills: [], capabilities: [] };
    expect(renderBundleFiles(stripped)).toEqual({});
  });
});
