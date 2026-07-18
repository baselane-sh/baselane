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

function repoTasksPack(base: WorkflowPack = demo): WorkflowPack {
  return { ...base, capabilities: [{ type: "tasks", store: "repo", method: "ledger" }] };
}

function orgTasksPack(base: WorkflowPack = demo): WorkflowPack {
  return { ...base, capabilities: [{ type: "tasks", store: "org", method: "ledger" }] };
}

function speckitTasksPack(): WorkflowPack {
  return { ...demo, capabilities: [{ type: "tasks", store: "repo", method: "speckit" }] };
}

function taskmasterTasksPack(): WorkflowPack {
  return { ...demo, capabilities: [{ type: "tasks", store: "org", method: "taskmaster" }] };
}

describe("tasks capability: store repo, method ledger", () => {
  const files = renderPack(repoTasksPack());

  it("adds the tasks README and /plan-work command to the repo file map", () => {
    expect(files[".baselane/tasks/README.md"]).toContain("Tasks & progress ledger");
    expect(files[".claude/commands/plan-work.md"]).toContain("PLAN.md");
  });

  it("adds a Stop hook to settings.json", () => {
    const settings = JSON.parse(files[".claude/settings.json"] ?? "{}");
    expect(settings.hooks.Stop).toBeDefined();
    expect(JSON.stringify(settings.hooks.Stop)).toContain("progress.md");
  });

  it("does not duplicate the repo tasks dir in the laptop bundle", () => {
    const bundle = renderBundleFiles(repoTasksPack());
    expect(bundle["tasks/README.md"]).toBeUndefined();
  });
});

describe("tasks capability: store org, method ledger", () => {
  it("puts the tasks README and command in the laptop bundle, not the repo", () => {
    const bundle = renderBundleFiles(orgTasksPack());
    expect(bundle["tasks/README.md"]).toContain("Tasks & progress ledger");
    expect(bundle["commands/plan-work.md"]).toContain("PLAN.md");

    const files = renderPack(orgTasksPack());
    expect(files[".baselane/tasks/README.md"]).toBeUndefined();
    expect(files[".claude/commands/plan-work.md"]).toBeUndefined();
  });

  it("records the capability in the manifest as provisioned, but omits the AGENTS.md note (bug #37.1: org-store scaffolds only the laptop bundle, never this repo)", () => {
    const files = renderPack(orgTasksPack());
    expect(JSON.parse(files[".baselane/capabilities.json"] ?? "{}")).toEqual({
      version: 1,
      capabilities: [{ type: "tasks", store: "org", method: "ledger" }],
    });
    expect(files["AGENTS.md"]).toContain("tasks · org · ledger — provisioned");
    expect(files["AGENTS.md"]).not.toContain("### Tasks");
  });
});

describe("tasks capability: method speckit", () => {
  it("scaffolds the speckit README + /speckit-flow command + availability-guarded Stop hook, marked provisioned", () => {
    const files = renderPack(speckitTasksPack());
    expect(files["AGENTS.md"]).toContain("tasks · repo · speckit — provisioned");
    expect(files[".baselane/tasks/speckit/README.md"]).toContain("Spec Kit");
    expect(files[".claude/commands/speckit-flow.md"]).toContain("/specify");
    const settings = JSON.parse(files[".claude/settings.json"] ?? "{}");
    expect(JSON.stringify(settings.hooks.Stop)).toContain("command -v specify");
  });
});

describe("tasks capability: method taskmaster", () => {
  it("store:org scaffolds the taskmaster README + availability-guarded Stop hook into the bundle only", () => {
    const files = renderPack(taskmasterTasksPack());
    const bundle = renderBundleFiles(taskmasterTasksPack());
    expect(files["AGENTS.md"]).toContain("tasks · org · taskmaster — provisioned");
    expect(files["AGENTS.md"]).not.toContain("### Tasks");
    expect(bundle["tasks/taskmaster/README.md"]).toContain("task-master-ai");
    expect(bundle["commands/plan-work.md"]).toBeUndefined();
    const settings = JSON.parse(bundle["settings.json"] ?? "{}");
    expect(JSON.stringify(settings.hooks.Stop)).toContain("command -v task-master");
  });
});

describe("tasks capability: method beads (task #38)", () => {
  function beadsTasksPack(): WorkflowPack {
    return { ...demo, capabilities: [{ type: "tasks", store: "repo", method: "beads" }] };
  }

  it("scaffolds the beads README + availability-guarded Stop hook, marked provisioned", () => {
    const files = renderPack(beadsTasksPack());
    expect(files["AGENTS.md"]).toContain("tasks · repo · beads — provisioned");
    expect(files[".baselane/tasks/beads/README.md"]).toContain("bd init");
    expect(files[".baselane/tasks/beads/README.md"]).toContain("bd ready");
    const settings = JSON.parse(files[".claude/settings.json"] ?? "{}");
    expect(JSON.stringify(settings.hooks.Stop)).toContain("command -v bd");
  });
});

describe("tasks capability: an unimplemented method still stays honest", () => {
  it("records the capability and renders 'coming soon', with no files scaffolded", () => {
    const pack: WorkflowPack = { ...demo, capabilities: [{ type: "tasks", store: "repo", method: "linear" }] };
    const files = renderPack(pack);
    expect(files["AGENTS.md"]).toContain("tasks · repo · linear — coming soon");
    expect(JSON.parse(files[".baselane/capabilities.json"] ?? "{}").capabilities).toEqual([
      { type: "tasks", store: "repo", method: "linear" },
    ]);
    expect(files[".baselane/tasks/README.md"]).toBeUndefined();
    expect(files[".claude/commands/plan-work.md"]).toBeUndefined();
    expect(files[".claude/settings.json"]).toBeUndefined();
  });
});

describe("tasks Stop-hook merges with a pack's own hooks", () => {
  it("keeps the pack's existing hook and appends the tasks Stop hook", () => {
    const files = renderPack(repoTasksPack(withOwnHook));
    const settings = JSON.parse(files[".claude/settings.json"] ?? "{}");
    expect(settings.hooks.PostToolUse).toBeDefined();
    expect(JSON.stringify(settings.hooks.PostToolUse)).toContain("Pack-specific reminder");
    expect(settings.hooks.Stop).toBeDefined();
    expect(JSON.stringify(settings.hooks.Stop)).toContain("progress.md");
  });
});

describe("tasks README content", () => {
  const readme = renderPack(repoTasksPack())[".baselane/tasks/README.md"] ?? "";

  it("states the session-start rule: ledger before plan, trust ledger + git log over memory", () => {
    expect(readme).toContain("On session start, read the ledger before the plan");
    expect(readme).toContain("git log");
  });

  it("documents PLAN.md and the append-only progress.md ledger with commit refs", () => {
    expect(readme).toContain("PLAN.md");
    expect(readme).toContain(".baselane/tasks/progress.md");
    expect(readme).toContain("commit");
  });

  it("golds a demo pack's tasks README for stability", async () => {
    const dir = join(dirname(fileURLToPath(import.meta.url)), "__snapshots__");
    await expect(readme).toMatchFileSnapshot(join(dir, "tasks-demo.README.md"));
  });
});
