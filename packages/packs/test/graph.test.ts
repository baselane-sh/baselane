import { describe, it, expect } from "vitest";
import type { WorkflowPack } from "../src/types.ts";
import { renderPack } from "../src/render/render-pack.ts";
import { renderBundleFiles } from "../src/render/bundle.ts";

const demo: WorkflowPack = {
  id: "demo",
  version: "1.0.0",
  title: "Demo loop",
  summary: "A two-step demo workflow.",
  context: { markdown: "## Demo discipline\n\n- Always verify before done.\n" },
  agents: [],
  commands: [],
  hooks: [],
};

function graphPack(store: "org" | "repo", method: string): WorkflowPack {
  return { ...demo, capabilities: [{ type: "graph", store, method }] };
}

describe("graph capability: method imports", () => {
  it("store:repo scaffolds .baselane/graph/README.md + /graph command + Stop hook, marked provisioned", () => {
    const files = renderPack(graphPack("repo", "imports"));
    expect(files["AGENTS.md"]).toContain("graph · repo · imports — provisioned");
    expect(files["AGENTS.md"]).toContain("### Graph");
    expect(files[".baselane/graph/README.md"]).toContain("Graph protocol (method: imports)");
    expect(files[".claude/commands/graph.md"]).toContain(".baselane/graph/README.md");
    const settings = JSON.parse(files[".claude/settings.json"] ?? "{}");
    expect(JSON.stringify(settings.hooks.Stop)).toContain("regenerate the graph");
  });

  it("store:org scaffolds into the laptop bundle, not the repo, and omits the repo AGENTS.md note (bug #37.1)", () => {
    const bundle = renderBundleFiles(graphPack("org", "imports"));
    expect(bundle["graph/README.md"]).toContain("Graph protocol");
    expect(bundle["commands/graph.md"]).toContain(".baselane/graph/README.md");

    const files = renderPack(graphPack("org", "imports"));
    expect(files[".baselane/graph/README.md"]).toBeUndefined();
    expect(files["AGENTS.md"]).toContain("graph · org · imports — provisioned");
    expect(files["AGENTS.md"]).not.toContain("### Graph");
  });

  it("documents the graph.json schema and the query-before-grep rule", () => {
    const readme = renderPack(graphPack("repo", "imports"))[".baselane/graph/README.md"] ?? "";
    expect(readme).toContain('"version": 1');
    expect(readme).toContain('"confidence": "extracted"');
    expect(readme).toContain("do not reach");
    expect(readme).toContain("baselane graph .");
  });
});

describe("graph capability: method graphify", () => {
  it("scaffolds its own README under graph/graphify/ + a SessionStart hook that builds the graph if the tool is installed", () => {
    const files = renderPack(graphPack("repo", "graphify"));
    expect(files["AGENTS.md"]).toContain("graph · repo · graphify — provisioned");
    expect(files[".baselane/graph/graphify/README.md"]).toContain("graphify build .");
    const settings = JSON.parse(files[".claude/settings.json"] ?? "{}");
    expect(JSON.stringify(settings.hooks.SessionStart)).toContain("command -v graphify");
    expect(JSON.stringify(settings.hooks.SessionStart)).toContain("graphify not installed");
  });

  it("does not add the graphify SessionStart hook when graphify isn't declared (imports only)", () => {
    const files = renderPack(graphPack("repo", "imports"));
    const settings = JSON.parse(files[".claude/settings.json"] ?? "{}");
    expect(settings.hooks.SessionStart).toBeUndefined();
  });
});

describe("graph capability: method aider", () => {
  it("scaffolds the aider README under graph/aider/, no build step documented", () => {
    const files = renderPack(graphPack("repo", "aider"));
    expect(files["AGENTS.md"]).toContain("graph · repo · aider — provisioned");
    expect(files[".baselane/graph/aider/README.md"]).toContain("pip install aider-chat");
    expect(files[".baselane/graph/aider/README.md"]).toContain("repo map");
  });
});

describe("graph capability: method lsp (Serena MCP)", () => {
  it("store:repo scaffolds the README + a ready-to-merge .baselane/mcp/serena.json snippet", () => {
    const files = renderPack(graphPack("repo", "lsp"));
    expect(files["AGENTS.md"]).toContain("graph · repo · lsp — provisioned");
    expect(files[".baselane/graph/lsp/README.md"]).toContain("Serena");
    expect(files[".baselane/mcp/serena.json"]).toContain("serena-mcp-server");
    expect(files[".mcp.json"]).toBeUndefined(); // never clobbers .mcp.json directly
  });

  it("store:org scaffolds the README into the bundle but never the MCP snippet (repo-local by nature)", () => {
    const bundle = renderBundleFiles(graphPack("org", "lsp"));
    expect(bundle["graph/lsp/README.md"]).toContain("Serena");
    expect(bundle["mcp/serena.json"]).toBeUndefined();
  });
});

describe("graph capability: method sourcegraph", () => {
  it("scaffolds the sourcegraph README under graph/sourcegraph/", () => {
    const files = renderPack(graphPack("repo", "sourcegraph"));
    expect(files["AGENTS.md"]).toContain("graph · repo · sourcegraph — provisioned");
    expect(files[".baselane/graph/sourcegraph/README.md"]).toContain("src login");
  });
});

describe("graph capability: still-coming-soon methods (treesitter, embeddings)", () => {
  it("method:treesitter renders 'coming soon' with no files scaffolded", () => {
    const files = renderPack(graphPack("repo", "treesitter"));
    expect(files["AGENTS.md"]).toContain("graph · repo · treesitter — coming soon");
    expect(files[".baselane/graph/README.md"]).toBeUndefined();
    expect(files[".claude/commands/graph.md"]).toBeUndefined();
    expect(files[".claude/settings.json"]).toBeUndefined();
  });

  it("method:embeddings renders 'coming soon' with no files scaffolded — deliberately never adapted (no canonical local tool)", () => {
    const files = renderPack(graphPack("org", "embeddings"));
    const bundle = renderBundleFiles(graphPack("org", "embeddings"));
    expect(files["AGENTS.md"]).toContain("graph · org · embeddings — coming soon");
    expect(bundle["graph/README.md"]).toBeUndefined();
  });
});

describe("graph capability: multiple methods for the same store coexist", () => {
  it("imports + graphify both scaffold, without one clobbering the other's files", () => {
    const pack: WorkflowPack = {
      ...demo,
      capabilities: [
        { type: "graph", store: "repo", method: "imports" },
        { type: "graph", store: "repo", method: "graphify" },
      ],
    };
    const files = renderPack(pack);
    expect(files[".baselane/graph/README.md"]).toContain("Graph protocol");
    expect(files[".baselane/graph/graphify/README.md"]).toContain("graphify build .");
    // exactly one /graph command (not duplicated) plus the graphify hook alongside the Stop hook
    const settings = JSON.parse(files[".claude/settings.json"] ?? "{}");
    expect(settings.hooks.Stop).toHaveLength(1);
    expect(settings.hooks.SessionStart).toHaveLength(1);
  });
});

describe("graph Stop-hook merges with a pack's own hooks", () => {
  it("keeps the pack's existing hook and appends the graph Stop hook", () => {
    const withOwnHook: WorkflowPack = {
      ...demo,
      hooks: [
        {
          event: "PostToolUse",
          matcher: "Edit|Write",
          description: "The pack's own reminder.",
          action: "print-reminder",
          message: "Pack-specific reminder.",
        },
      ],
    };
    const files = renderPack(graphPack("repo", "imports"));
    const filesWithHook = renderPack({ ...graphPack("repo", "imports"), hooks: withOwnHook.hooks });
    const settings = JSON.parse(filesWithHook[".claude/settings.json"] ?? "{}");
    expect(settings.hooks.PostToolUse).toBeDefined();
    expect(JSON.stringify(settings.hooks.PostToolUse)).toContain("Pack-specific reminder");
    expect(settings.hooks.Stop).toBeDefined();
    expect(files[".claude/settings.json"]).toBeDefined();
  });
});
