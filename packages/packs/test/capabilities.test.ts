import { describe, it, expect } from "vitest";
import type { WorkflowPack } from "../src/types.ts";
import { renderCapabilities } from "../src/render/capabilities.ts";
import { renderPack } from "../src/render/render-pack.ts";

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

const withCapabilities: WorkflowPack = {
  ...demo,
  capabilities: [
    { type: "memory", store: "repo", method: "files" },
    { type: "graph", store: "org", method: "treesitter", config: { language: "typescript" } },
  ],
};

const withoutMemory: WorkflowPack = {
  ...demo,
  capabilities: [{ type: "graph", store: "org", method: "treesitter", config: { language: "typescript" } }],
};

describe("renderCapabilities", () => {
  it("returns a section naming each capability with its status, plus a Memory note when memory+files is present", () => {
    const { section } = renderCapabilities(withCapabilities);
    expect(section).toBe(
      "## Harness capabilities\n\n" +
        "- memory · repo · files — provisioned\n" +
        "- graph · org · treesitter — coming soon\n\n" +
        "### Memory\n\n" +
        "Consult `.baselane/memory/` and its `MEMORY.md` index before acting — it holds " +
        "durable facts from past sessions. Use `/remember` to add one after learning " +
        "something durable.",
    );
  });

  it("omits the Memory note when no memory+files capability is present", () => {
    const { section } = renderCapabilities(withoutMemory);
    expect(section).toBe(
      "## Harness capabilities\n\n" + "- graph · org · treesitter — coming soon",
    );
  });

  it("#9: a memory+native capability gets its own native-specific note, not the files-specific one", () => {
    const { section } = renderCapabilities({
      ...demo,
      capabilities: [{ type: "memory", store: "repo", method: "native" }],
    });
    expect(section).toContain("- memory · repo · native — provisioned");
    expect(section).toContain("### Memory (native)");
    expect(section).toContain("~/.claude/projects");
    expect(section).not.toContain(".baselane/memory/README"); // files' note/path, never scaffolded here
  });

  it("#9: memory+claude-mem/vector/letta each get their own note naming their own README path", () => {
    for (const [method, needle] of [
      ["claude-mem", "claude-mem search"],
      ["vector", "mem0"],
      ["letta", "archival memory"],
    ] as const) {
      const { section } = renderCapabilities({ ...demo, capabilities: [{ type: "memory", store: "repo", method }] });
      expect(section).toContain(`### Memory (${method})`);
      expect(section).toContain(needle);
    }
  });

  it("#9: shows the baselane-specific Wiki note for wiki+baselane, and a deepwiki-specific note (not the /wiki one) for wiki+deepwiki", () => {
    const baselane = renderCapabilities({
      ...demo,
      capabilities: [{ type: "wiki", store: "repo", method: "baselane" }],
    }).section;
    expect(baselane).toContain("### Wiki");
    expect(baselane).not.toContain("### Wiki (");

    const deepwiki = renderCapabilities({
      ...demo,
      capabilities: [{ type: "wiki", store: "repo", method: "deepwiki" }],
    }).section;
    expect(deepwiki).toContain("- wiki · repo · deepwiki — provisioned");
    expect(deepwiki).toContain("### Wiki (deepwiki)");
    expect(deepwiki).toContain("/deepwiki");
    expect(deepwiki).not.toContain(".baselane/wiki/README"); // the baselane note's own path, never scaffolded here

    const docs = renderCapabilities({
      ...demo,
      capabilities: [{ type: "wiki", store: "repo", method: "docs" }],
    }).section;
    expect(docs).toContain("### Wiki (docs)");
    expect(docs).toContain("/docs-lookup");
  });

  it("#9: shows the ledger-specific Tasks note for tasks+ledger, and a speckit-specific note (not the ledger one) for tasks+speckit", () => {
    const ledger = renderCapabilities({
      ...demo,
      capabilities: [{ type: "tasks", store: "repo", method: "ledger" }],
    }).section;
    expect(ledger).toContain("### Tasks");
    expect(ledger).not.toContain("### Tasks (");

    const speckit = renderCapabilities({
      ...demo,
      capabilities: [{ type: "tasks", store: "repo", method: "speckit" }],
    }).section;
    expect(speckit).toContain("- tasks · repo · speckit — provisioned");
    expect(speckit).toContain("### Tasks (speckit)");
    expect(speckit).toContain("/speckit-flow");
    expect(speckit).not.toContain(".baselane/tasks/README"); // the ledger note's own path, never scaffolded here
  });

  it("#9: tasks+taskmaster/beads each get their own note naming their own command", () => {
    const taskmaster = renderCapabilities({
      ...demo,
      capabilities: [{ type: "tasks", store: "repo", method: "taskmaster" }],
    }).section;
    expect(taskmaster).toContain("### Tasks (taskmaster)");
    expect(taskmaster).toContain("task-master next");

    const beads = renderCapabilities({
      ...demo,
      capabilities: [{ type: "tasks", store: "repo", method: "beads" }],
    }).section;
    expect(beads).toContain("### Tasks (beads)");
    expect(beads).toContain("bd ready");
  });

  it("returns a manifest containing every capability verbatim, including config", () => {
    const { manifest } = renderCapabilities(withCapabilities);
    expect(JSON.parse(manifest ?? "")).toEqual({
      version: 1,
      capabilities: withCapabilities.capabilities,
    });
  });

  it("returns {section: null, manifest: null} for a pack with no capabilities", () => {
    expect(renderCapabilities(demo)).toEqual({ section: null, manifest: null });
  });
});

describe("renderPack with capabilities", () => {
  it("adds .baselane/capabilities.json to the file map", () => {
    const files = renderPack(withCapabilities);
    expect(JSON.parse(files[".baselane/capabilities.json"] ?? "")).toEqual({
      version: 1,
      capabilities: withCapabilities.capabilities,
    });
  });

  it("splices the capabilities section into AGENTS.md", () => {
    const md = renderPack(withCapabilities)["AGENTS.md"];
    expect(md).toContain("## Harness capabilities");
    expect(md).toContain("- memory · repo · files — provisioned");
    expect(md).toContain("- graph · org · treesitter — coming soon");
  });

  it("adds no .baselane/capabilities.json and leaves AGENTS.md unchanged for a pack with no capabilities", () => {
    const files = renderPack(demo);
    expect(files[".baselane/capabilities.json"]).toBeUndefined();
    expect(files["AGENTS.md"]).not.toContain("Harness capabilities");
  });
});
