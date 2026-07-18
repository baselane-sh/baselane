import { describe, expect, it } from "vitest";
import type { WorkflowPack } from "../src/types.ts";
import { renderBundleFiles } from "../src/render/bundle.ts";
import { renderBundleUnion } from "../src/render/bundle-union.ts";

function pack(over: Partial<WorkflowPack>): WorkflowPack {
  return {
    id: "p", version: "1.0.0", title: "t", summary: "s",
    context: { markdown: "## X\n\n- rule\n" },
    agents: [], commands: [], hooks: [],
    ...over,
  };
}

describe("renderBundleUnion", () => {
  it("is byte-identical to renderBundleFiles for a single pack", () => {
    const p = pack({
      id: "solo",
      agents: [{ name: "rev", description: "d", tools: ["Read"], model: "sonnet", prompt: "p" }],
      hooks: [{ event: "PostToolUse", matcher: "Edit", description: "d", action: "run-command", command: "pnpm -s test" }],
      capabilities: [{ type: "system-map", store: "repo", method: "analyze" }],
    });
    const union = renderBundleUnion([p]);
    expect(union.collisions).toEqual([]);
    expect(union.files).toEqual(renderBundleFiles(p));
  });

  it("unions distinct whole-file paths and concatenates hook events across packs", () => {
    const a = pack({
      id: "a",
      agents: [{ name: "a-agent", description: "d", tools: ["Read"], model: "sonnet", prompt: "p" }],
      hooks: [{ event: "PostToolUse", matcher: "Edit", description: "d", action: "run-command", command: "a-cmd" }],
    });
    const b = pack({
      id: "b",
      agents: [{ name: "b-agent", description: "d", tools: ["Read"], model: "sonnet", prompt: "p" }],
      hooks: [{ event: "PostToolUse", matcher: "Write", description: "d", action: "run-command", command: "b-cmd" }],
    });
    const union = renderBundleUnion([a, b]);
    expect(union.collisions).toEqual([]);
    expect(union.files["agents/a-agent.md"]).toBeDefined();
    expect(union.files["agents/b-agent.md"]).toBeDefined();
    const settings = JSON.parse(union.files["settings.json"]);
    expect(settings.hooks.PostToolUse).toHaveLength(2); // both packs' entries concatenated
  });

  it("records a collision when two packs render different content at the same path; most-specific wins", () => {
    const specific = pack({
      id: "same",
      agents: [{ name: "dup", description: "SPECIFIC", tools: ["Read"], model: "sonnet", prompt: "p" }],
    });
    const general = pack({
      id: "same",
      agents: [{ name: "dup", description: "GENERAL", tools: ["Read"], model: "sonnet", prompt: "p" }],
    });
    const union = renderBundleUnion([specific, general]); // specific first
    expect(union.files["agents/dup.md"]).toContain("SPECIFIC");
    expect(union.files["agents/dup.md"]).not.toContain("GENERAL");
    expect(union.collisions).toContain("agents/dup.md");
  });

  it("dedups identical capabilities and unions distinct ones", () => {
    const a = pack({ id: "a", capabilities: [{ type: "system-map", store: "repo", method: "analyze" }] });
    const b = pack({
      id: "b",
      capabilities: [
        { type: "system-map", store: "repo", method: "analyze" }, // identical → deduped
        { type: "graph", store: "repo", method: "imports" },
      ],
    });
    const manifest = JSON.parse(renderBundleUnion([a, b]).files[".baselane/capabilities.json"]);
    expect(manifest.capabilities).toEqual([
      { type: "system-map", store: "repo", method: "analyze" },
      { type: "graph", store: "repo", method: "imports" },
    ]);
  });
});
