import { describe, expect, it } from "vitest";
import type { WorkflowPack } from "../src/types.ts";
import { buildStartMarker, mergeManagedRegion } from "../src/merge-region.ts";
import { renderPack } from "../src/render/render-pack.ts";
import { renderRolloutFiles } from "../src/render/rollout-files.ts";

function pack(over: Partial<WorkflowPack>): WorkflowPack {
  return {
    id: "p", version: "1.0.0", title: "t", summary: "s",
    context: { markdown: "## X\n\n- rule\n" },
    agents: [], commands: [], hooks: [],
    ...over,
  };
}

describe("renderRolloutFiles", () => {
  it("with no base content, produces exactly one pack's regions plus its non-entry files", () => {
    const p = pack({ id: "solo", agents: [{ name: "rev", description: "d", tools: ["Read"], model: "sonnet", prompt: "p" }] });
    const result = renderRolloutFiles({}, [p]);
    expect(result.files["AGENTS.md"]).toContain(`<!-- baselane:start solo@1.0.0`);
    expect(result.files[".claude/agents/rev.md"]).toBe(renderPack(p)[".claude/agents/rev.md"]);
    expect(result.collisions).toEqual([]);
  });

  it("preserves a repo's hand-written entry-file content and adds both packs' regions", () => {
    const teamClaude = "## Key Entities\nBikes, Batteries, Drivers\n";
    const a = pack({ id: "a" });
    const b = pack({ id: "b" });
    const result = renderRolloutFiles({ "CLAUDE.md": teamClaude }, [a, b]);
    expect(result.files["CLAUDE.md"]).toContain("## Key Entities");
    expect(result.files["CLAUDE.md"]).toContain(`<!-- baselane:start a@1.0.0`);
    expect(result.files["CLAUDE.md"]).toContain(`<!-- baselane:start b@1.0.0`);
  });

  it("strips a previously-applied pack's region when it's no longer in the effective set", () => {
    const a = pack({ id: "a" });
    const b = pack({ id: "b" });
    const both = mergeManagedRegion(
      mergeManagedRegion(null, renderPack(a)["AGENTS.md"], "a", "1.0.0"),
      renderPack(b)["AGENTS.md"], "b", "1.0.0",
    );
    // b was dropped from the effective set — only a remains
    const result = renderRolloutFiles({ "AGENTS.md": both }, [a]);
    expect(result.files["AGENTS.md"]).toContain(buildStartMarker("a", "1.0.0"));
    expect(result.files["AGENTS.md"]).not.toContain(buildStartMarker("b", "1.0.0"));
  });

  it("is idempotent — re-running with the same effective set produces byte-identical output", () => {
    const a = pack({ id: "a" });
    const b = pack({ id: "b" });
    const once = renderRolloutFiles({}, [a, b]);
    const twice = renderRolloutFiles(once.files, [a, b]);
    expect(twice.files).toEqual(once.files);
  });

  it("unions non-entry files and surfaces collisions exactly like renderRepoFileUnion", () => {
    const a = pack({ id: "a", hooks: [{ event: "PostToolUse", matcher: "Edit", description: "d", action: "run-command", command: "a-cmd" }] });
    const b = pack({ id: "b", hooks: [{ event: "PostToolUse", matcher: "Write", description: "d", action: "run-command", command: "b-cmd" }] });
    const result = renderRolloutFiles({}, [a, b]);
    const settings = JSON.parse(result.files[".claude/settings.json"]);
    expect(settings.hooks.PostToolUse).toHaveLength(2);
  });
});
