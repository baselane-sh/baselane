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

function repoMemoryPack(base: WorkflowPack = demo): WorkflowPack {
  return { ...base, capabilities: [{ type: "memory", store: "repo", method: "files" }] };
}

function orgMemoryPack(base: WorkflowPack = demo): WorkflowPack {
  return { ...base, capabilities: [{ type: "memory", store: "org", method: "files" }] };
}

function nativeMemoryPack(): WorkflowPack {
  return { ...demo, capabilities: [{ type: "memory", store: "repo", method: "native" }] };
}

function orgNativeMemoryPack(): WorkflowPack {
  return { ...demo, capabilities: [{ type: "memory", store: "org", method: "native" }] };
}

function claudeMemPack(store: "org" | "repo"): WorkflowPack {
  return { ...demo, capabilities: [{ type: "memory", store, method: "claude-mem" }] };
}

function vectorMemoryPack(store: "org" | "repo"): WorkflowPack {
  return { ...demo, capabilities: [{ type: "memory", store, method: "vector" }] };
}

function lettaMemoryPack(store: "org" | "repo"): WorkflowPack {
  return { ...demo, capabilities: [{ type: "memory", store, method: "letta" }] };
}

describe("memory capability: store repo, method files", () => {
  const files = renderPack(repoMemoryPack());

  it("adds the memory README and /remember command to the repo file map", () => {
    expect(files[".baselane/memory/README.md"]).toContain("Memory protocol");
    expect(files[".claude/commands/remember.md"]).toContain(".baselane/memory/");
  });

  it("adds a Stop hook to settings.json", () => {
    const settings = JSON.parse(files[".claude/settings.json"] ?? "{}");
    expect(settings.hooks.Stop).toBeDefined();
    expect(JSON.stringify(settings.hooks.Stop)).toContain("memory");
  });

  it("does not duplicate the repo memory dir in the laptop bundle", () => {
    const bundle = renderBundleFiles(repoMemoryPack());
    expect(bundle["memory/README.md"]).toBeUndefined();
  });
});

describe("memory capability: store org, method files", () => {
  it("puts the memory README and command in the laptop bundle, not the repo", () => {
    const bundle = renderBundleFiles(orgMemoryPack());
    expect(bundle["memory/README.md"]).toContain("Memory protocol");
    expect(bundle["commands/remember.md"]).toContain(".baselane/memory/");

    const files = renderPack(orgMemoryPack());
    expect(files[".baselane/memory/README.md"]).toBeUndefined();
    expect(files[".claude/commands/remember.md"]).toBeUndefined();
  });

  it("records the capability in the manifest as provisioned, but omits the AGENTS.md note (bug #37.1: the note points at a repo path that org-store scaffolds only on the laptop, never into this repo)", () => {
    const files = renderPack(orgMemoryPack());
    expect(JSON.parse(files[".baselane/capabilities.json"] ?? "{}")).toEqual({
      version: 1,
      capabilities: [{ type: "memory", store: "org", method: "files" }],
    });
    expect(files["AGENTS.md"]).toContain("memory · org · files — provisioned");
    expect(files["AGENTS.md"]).not.toContain("### Memory");
  });
});

describe("memory capability: method native (Claude Code built-in)", () => {
  it("store:repo — scaffolds the native adapter README + /remember command + Stop hook, marked provisioned", () => {
    const files = renderPack(nativeMemoryPack());
    expect(files["AGENTS.md"]).toContain("memory · repo · native — provisioned");
    expect(files[".baselane/memory/native/README.md"]).toContain("native (Claude Code)");
    expect(files[".claude/commands/remember.md"]).toContain("native memory");
    const settings = JSON.parse(files[".claude/settings.json"] ?? "{}");
    expect(JSON.stringify(settings.hooks.Stop)).toContain("native memory");
  });

  it("store:org — scaffolds into the laptop bundle, not the repo, and omits the repo AGENTS.md note", () => {
    const bundle = renderBundleFiles(orgNativeMemoryPack());
    expect(bundle["memory/native/README.md"]).toContain("native (Claude Code)");
    expect(bundle["commands/remember.md"]).toContain("native memory");

    const files = renderPack(orgNativeMemoryPack());
    expect(files[".baselane/memory/native/README.md"]).toBeUndefined();
    expect(files["AGENTS.md"]).toContain("memory · org · native — provisioned");
    expect(files["AGENTS.md"]).not.toContain("### Memory");
  });
});

describe("memory capability: method claude-mem", () => {
  it("scaffolds the claude-mem README + an availability-guarded Stop hook, no /remember command", () => {
    const files = renderPack(claudeMemPack("repo"));
    expect(files["AGENTS.md"]).toContain("memory · repo · claude-mem — provisioned");
    expect(files[".baselane/memory/claude-mem/README.md"]).toContain("npm install -g claude-mem");
    expect(files[".claude/commands/remember.md"]).toBeUndefined();
    const settings = JSON.parse(files[".claude/settings.json"] ?? "{}");
    expect(JSON.stringify(settings.hooks.Stop)).toContain("command -v claude-mem");
  });

  it("store:org puts the README in the bundle, not the repo", () => {
    const bundle = renderBundleFiles(claudeMemPack("org"));
    expect(bundle["memory/claude-mem/README.md"]).toContain("claude-mem");
    expect(renderPack(claudeMemPack("org"))[".baselane/memory/claude-mem/README.md"]).toBeUndefined();
  });
});

describe("memory capability: method vector (mem0)", () => {
  it("scaffolds the mem0 README + an availability-guarded Stop hook", () => {
    const files = renderPack(vectorMemoryPack("repo"));
    expect(files["AGENTS.md"]).toContain("memory · repo · vector — provisioned");
    expect(files[".baselane/memory/vector/README.md"]).toContain("pip install mem0ai");
    const settings = JSON.parse(files[".claude/settings.json"] ?? "{}");
    expect(JSON.stringify(settings.hooks.Stop)).toContain("mem0");
  });
});

describe("memory capability: method letta", () => {
  it("scaffolds the Letta README + an availability-guarded Stop hook", () => {
    const files = renderPack(lettaMemoryPack("repo"));
    expect(files["AGENTS.md"]).toContain("memory · repo · letta — provisioned");
    expect(files[".baselane/memory/letta/README.md"]).toContain("letta server");
    const settings = JSON.parse(files[".claude/settings.json"] ?? "{}");
    expect(JSON.stringify(settings.hooks.Stop)).toContain("letta");
  });
});

describe("memory capability: an unimplemented method still stays honest", () => {
  it("records the capability and renders 'coming soon', with no files scaffolded", () => {
    const pack: WorkflowPack = { ...demo, capabilities: [{ type: "memory", store: "repo", method: "graph-linked" }] };
    const files = renderPack(pack);
    expect(files["AGENTS.md"]).toContain("memory · repo · graph-linked — coming soon");
    expect(JSON.parse(files[".baselane/capabilities.json"] ?? "{}").capabilities).toEqual([
      { type: "memory", store: "repo", method: "graph-linked" },
    ]);
    expect(files[".baselane/memory/README.md"]).toBeUndefined();
    expect(files[".claude/commands/remember.md"]).toBeUndefined();
    expect(files[".claude/settings.json"]).toBeUndefined();
  });
});

describe("memory Stop-hook merges with a pack's own hooks", () => {
  it("keeps the pack's existing hook and appends the memory Stop hook", () => {
    const files = renderPack(repoMemoryPack(withOwnHook));
    const settings = JSON.parse(files[".claude/settings.json"] ?? "{}");
    expect(settings.hooks.PostToolUse).toBeDefined();
    expect(JSON.stringify(settings.hooks.PostToolUse)).toContain("Pack-specific reminder");
    expect(settings.hooks.Stop).toBeDefined();
    expect(JSON.stringify(settings.hooks.Stop)).toContain("memory");
  });
});
