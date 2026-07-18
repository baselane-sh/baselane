import { describe, expect, it } from "vitest";
import type { WorkflowPack } from "../src/types.ts";
import { renderPack } from "../src/render/render-pack.ts";
import { renderRepoFileUnion } from "../src/render/repo-union.ts";

function pack(over: Partial<WorkflowPack>): WorkflowPack {
  return {
    id: "p", version: "1.0.0", title: "t", summary: "s",
    context: { markdown: "## X\n\n- rule\n" },
    agents: [], commands: [], hooks: [],
    ...over,
  };
}

describe("renderRepoFileUnion", () => {
  it("is byte-identical to renderPack's non-entry files for a single pack", () => {
    const p = pack({
      id: "solo",
      agents: [{ name: "rev", description: "d", tools: ["Read"], model: "sonnet", prompt: "p" }],
      hooks: [{ event: "PostToolUse", matcher: "Edit", description: "d", action: "run-command", command: "pnpm -s test" }],
    });
    const union = renderRepoFileUnion([p]);
    expect(union.collisions).toEqual([]);
    const rendered = renderPack(p);
    expect(union.files[".claude/agents/rev.md"]).toBe(rendered[".claude/agents/rev.md"]);
    expect(union.files[".claude/settings.json"]).toBe(rendered[".claude/settings.json"]);
    // no entry-file keys leak into the union
    expect(union.files["AGENTS.md"]).toBeUndefined();
    expect(union.files["CLAUDE.md"]).toBeUndefined();
  });

  it("concatenates hook events across packs into one .claude/settings.json", () => {
    const a = pack({ id: "a", hooks: [{ event: "PostToolUse", matcher: "Edit", description: "d", action: "run-command", command: "a-cmd" }] });
    const b = pack({ id: "b", hooks: [{ event: "PostToolUse", matcher: "Write", description: "d", action: "run-command", command: "b-cmd" }] });
    const union = renderRepoFileUnion([a, b]);
    const settings = JSON.parse(union.files[".claude/settings.json"]);
    expect(settings.hooks.PostToolUse).toHaveLength(2);
  });

  it("unions distinct agent/command files with no collision", () => {
    const a = pack({ id: "a", agents: [{ name: "a-agent", description: "d", tools: ["Read"], model: "sonnet", prompt: "p" }] });
    const b = pack({ id: "b", commands: [{ name: "b-cmd", description: "d", argument_hint: "", prompt: "p" }] });
    const union = renderRepoFileUnion([a, b]);
    expect(union.files[".claude/agents/a-agent.md"]).toBeDefined();
    expect(union.files[".claude/commands/b-cmd.md"]).toBeDefined();
    expect(union.collisions).toEqual([]);
  });

  it("records a collision when two packs render different content at the same non-entry path; first pack wins", () => {
    const first = pack({ id: "same", agents: [{ name: "dup", description: "FIRST", tools: ["Read"], model: "sonnet", prompt: "p" }] });
    const second = pack({ id: "same", agents: [{ name: "dup", description: "SECOND", tools: ["Read"], model: "sonnet", prompt: "p" }] });
    const union = renderRepoFileUnion([first, second]);
    expect(union.files[".claude/agents/dup.md"]).toContain("FIRST");
    expect(union.files[".claude/agents/dup.md"]).not.toContain("SECOND");
    expect(union.collisions).toContain(".claude/agents/dup.md");
  });

  it("dedups identical capability manifests and unions distinct ones", () => {
    const a = pack({ id: "a", capabilities: [{ type: "system-map", store: "repo", method: "analyze" }] });
    const b = pack({
      id: "b",
      capabilities: [
        { type: "system-map", store: "repo", method: "analyze" },
        { type: "graph", store: "repo", method: "imports" },
      ],
    });
    const manifest = JSON.parse(renderRepoFileUnion([a, b]).files[".baselane/capabilities.json"]);
    expect(manifest.capabilities).toEqual([
      { type: "system-map", store: "repo", method: "analyze" },
      { type: "graph", store: "repo", method: "imports" },
    ]);
  });
});
