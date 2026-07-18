import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
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

function repoWikiPack(base: WorkflowPack = demo): WorkflowPack {
  return { ...base, capabilities: [{ type: "wiki", store: "repo", method: "baselane" }] };
}

function orgWikiPack(base: WorkflowPack = demo): WorkflowPack {
  return { ...base, capabilities: [{ type: "wiki", store: "org", method: "baselane" }] };
}

function deepwikiWikiPack(): WorkflowPack {
  return { ...demo, capabilities: [{ type: "wiki", store: "repo", method: "deepwiki" }] };
}

function docsWikiPack(): WorkflowPack {
  return { ...demo, capabilities: [{ type: "wiki", store: "org", method: "docs" }] };
}

describe("wiki capability: store repo, method baselane", () => {
  const files = renderPack(repoWikiPack());

  it("adds the wiki README and /wiki command to the repo file map", () => {
    expect(files[".baselane/wiki/README.md"]).toContain("Wiki protocol");
    expect(files[".claude/commands/wiki.md"]).toContain("wiki protocol");
  });

  it("adds a Stop hook to settings.json", () => {
    const settings = JSON.parse(files[".claude/settings.json"] ?? "{}");
    expect(settings.hooks.Stop).toBeDefined();
    expect(JSON.stringify(settings.hooks.Stop)).toContain("wiki entry");
  });

  it("does not duplicate the repo wiki dir in the laptop bundle", () => {
    const bundle = renderBundleFiles(repoWikiPack());
    expect(bundle["wiki/README.md"]).toBeUndefined();
  });
});

describe("wiki capability: store org, method baselane", () => {
  it("puts the wiki README and command in the laptop bundle, not the repo", () => {
    const bundle = renderBundleFiles(orgWikiPack());
    expect(bundle["wiki/README.md"]).toContain("Wiki protocol");
    expect(bundle["commands/wiki.md"]).toContain("wiki protocol");

    const files = renderPack(orgWikiPack());
    expect(files[".baselane/wiki/README.md"]).toBeUndefined();
    expect(files[".claude/commands/wiki.md"]).toBeUndefined();
  });

  it("records the capability in the manifest as provisioned, but omits the AGENTS.md note (bug #37.1: org-store scaffolds only the laptop bundle, never this repo)", () => {
    const files = renderPack(orgWikiPack());
    expect(JSON.parse(files[".baselane/capabilities.json"] ?? "{}")).toEqual({
      version: 1,
      capabilities: [{ type: "wiki", store: "org", method: "baselane" }],
    });
    expect(files["AGENTS.md"]).toContain("wiki · org · baselane — provisioned");
    expect(files["AGENTS.md"]).not.toContain("### Wiki");
  });
});

describe("wiki capability: method deepwiki", () => {
  it("scaffolds the MCP snippet + README + /deepwiki command + availability-guarded SessionStart hook, marked provisioned", () => {
    const files = renderPack(deepwikiWikiPack());
    expect(files["AGENTS.md"]).toContain("wiki · repo · deepwiki — provisioned");
    expect(files[".baselane/mcp/deepwiki.json"]).toContain("mcp.deepwiki.com");
    expect(files[".baselane/deepwiki/README.md"]).toContain("DeepWiki");
    expect(files[".claude/commands/deepwiki.md"]).toContain("read_wiki_structure");
    const settings = JSON.parse(files[".claude/settings.json"] ?? "{}");
    expect(JSON.stringify(settings.hooks.SessionStart)).toContain("deepwiki");
  });

  it("never writes .mcp.json itself — only the ready-to-merge snippet under .baselane/mcp/", () => {
    const files = renderPack(deepwikiWikiPack());
    expect(files[".mcp.json"]).toBeUndefined();
  });
});

describe("wiki capability: method docs (docs-as-context)", () => {
  it("store:org scaffolds the docs-as-context README + /docs-lookup command into the bundle only, marked provisioned, no wiki state dir", () => {
    const files = renderPack(docsWikiPack());
    const bundle = renderBundleFiles(docsWikiPack());
    expect(files["AGENTS.md"]).toContain("wiki · org · docs — provisioned");
    expect(files["AGENTS.md"]).not.toContain("### Wiki");
    expect(bundle["docs-as-context/README.md"]).toContain("docs-as-context");
    expect(bundle["commands/docs-lookup.md"]).toContain("existing documentation");
    expect(bundle["wiki/README.md"]).toBeUndefined();
    expect(bundle["commands/wiki.md"]).toBeUndefined();
  });
});

describe("wiki capability: an unimplemented method still stays honest", () => {
  it("records the capability and renders 'coming soon', with no files scaffolded", () => {
    const pack: WorkflowPack = { ...demo, capabilities: [{ type: "wiki", store: "repo", method: "confluence" }] };
    const files = renderPack(pack);
    expect(files["AGENTS.md"]).toContain("wiki · repo · confluence — coming soon");
    expect(JSON.parse(files[".baselane/capabilities.json"] ?? "{}").capabilities).toEqual([
      { type: "wiki", store: "repo", method: "confluence" },
    ]);
    expect(files[".baselane/wiki/README.md"]).toBeUndefined();
    expect(files[".claude/commands/wiki.md"]).toBeUndefined();
    expect(files[".claude/settings.json"]).toBeUndefined();
  });
});

describe("wiki Stop-hook merges with a pack's own hooks", () => {
  it("keeps the pack's existing hook and appends the wiki Stop hook", () => {
    const files = renderPack(repoWikiPack(withOwnHook));
    const settings = JSON.parse(files[".claude/settings.json"] ?? "{}");
    expect(settings.hooks.PostToolUse).toBeDefined();
    expect(JSON.stringify(settings.hooks.PostToolUse)).toContain("Pack-specific reminder");
    expect(settings.hooks.Stop).toBeDefined();
    expect(JSON.stringify(settings.hooks.Stop)).toContain("wiki entry");
  });
});

describe("wiki README content", () => {
  const readme = renderPack(repoWikiPack())[".baselane/wiki/README.md"] ?? "";

  it("states this wiki is OKF-compliant", () => {
    expect(readme).toContain(
      "This wiki is Open Knowledge Format (OKF) compliant — any OKF-reading agent can consume it.",
    );
  });

  it("requires the `type` frontmatter field, with other fields optional", () => {
    expect(readme).toContain("type: How-it-works");
    expect(readme).toContain("is the only required frontmatter field");
  });

  it("documents the reserved index.md and log.md formats", () => {
    expect(readme).toContain("index.md");
    expect(readme).toContain("[Title](page.md)");
    expect(readme).toContain("log.md");
    expect(readme).toContain("## [YYYY-MM-DD] <operation> | <subject>");
  });

  it("documents the three operations: ingest, query, lint", () => {
    expect(readme).toContain("**Ingest**");
    expect(readme).toContain("**Query**");
    expect(readme).toContain("**Lint**");
  });

  it("states the contradiction/lint rule: reconcile, corrections beat additions", () => {
    expect(readme).toContain("contradictions between pages");
    expect(readme).toContain("orphan pages");
    expect(readme).toContain("broken cross-links");
    expect(readme).toContain("corrections beat additions");
  });

  it("states the loop rule: read before acting, write after learning", () => {
    expect(readme).toContain("Read before acting. Write after learning.");
  });

  it("golds a demo pack's wiki README for stability", async () => {
    const dir = join(dirname(fileURLToPath(import.meta.url)), "__snapshots__");
    await expect(readme).toMatchFileSnapshot(join(dir, "wiki-demo.README.md"));
  });
});
