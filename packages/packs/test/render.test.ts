import { describe, it, expect } from "vitest";
import type { WorkflowPack } from "../src/types.ts";
import { renderAgentsMd } from "../src/render/agents-md.ts";
import { renderClaudeFiles } from "../src/render/claude.ts";
import { renderPack } from "../src/render/render-pack.ts";

export const demo: WorkflowPack = {
  id: "demo",
  version: "1.0.0",
  title: "Demo loop",
  summary: "A two-step demo workflow.",
  context: { markdown: "## Demo discipline\n\n- Always verify before done.\n" },
  agents: [
    {
      name: "checker",
      description: "Verifies work independently.",
      tools: ["Read", "Bash"],
      model: "sonnet",
      prompt: "Re-run verification yourself. Report raw output.",
    },
  ],
  commands: [
    {
      name: "go",
      description: "Run the demo loop.",
      argument_hint: "[target]",
      prompt: "Do the work for $ARGUMENTS, then invoke the checker.",
    },
  ],
  hooks: [
    {
      event: "PostToolUse",
      matcher: "Edit|Write",
      description: "Remind about verification after edits.",
      action: "print-reminder",
      message: "Reminder: verify before declaring done.",
    },
  ],
};

describe("renderAgentsMd", () => {
  it("renders context, roles, commands and guardrails deterministically", () => {
    const md = renderAgentsMd(demo);
    expect(md).toBe(`# AGENTS.md

<!-- generated from workflow-pack demo v1.0.0 -->

## Demo discipline

- Always verify before done.

## Workflow pack: Demo loop

A two-step demo workflow.

### Roles

- **checker** — Verifies work independently.

### Commands

- **/go** \`[target]\` — Run the demo loop.
  - How it runs: Do the work for $ARGUMENTS, then invoke the checker.

### Guardrails

- Remind about verification after edits.

Tool-specific implementations live alongside this file (see \`CLAUDE.md\` for the Claude Code implementation). Tools without a native subagent/command surface should treat the sections above as operating instructions.
`);
  });

  it("omits Roles/Commands/Guardrails sections for empty arrays", () => {
    const md = renderAgentsMd({ ...demo, agents: [], commands: [], hooks: [] });
    expect(md).not.toContain("### Roles");
    expect(md).not.toContain("### Commands");
    expect(md).not.toContain("### Guardrails");
  });

  it("renders an adapted-from comment immediately after the provenance comment when attribution is present", () => {
    const md = renderAgentsMd({
      ...demo,
      attribution: { source: "affaan-m/ECC", url: "https://github.com/affaan-m/ECC", license: "MIT" },
    });
    expect(md).toContain(
      "<!-- generated from workflow-pack demo v1.0.0 -->\n" +
        "<!-- adapted from affaan-m/ECC (MIT) — https://github.com/affaan-m/ECC -->",
    );
  });

  it("omits the adapted-from comment when the pack has no attribution", () => {
    const md = renderAgentsMd(demo);
    expect(md).not.toContain("adapted from");
  });

  it("splices the capabilities section after context, before the workflow pack section", () => {
    const md = renderAgentsMd({
      ...demo,
      capabilities: [{ type: "memory", store: "repo", method: "files" }],
    });
    const contextEnd = md.indexOf("- Always verify before done.") + "- Always verify before done.".length;
    const capabilitiesStart = md.indexOf("## Harness capabilities");
    const workflowStart = md.indexOf("## Workflow pack: Demo loop");
    expect(capabilitiesStart).toBeGreaterThan(contextEnd);
    expect(workflowStart).toBeGreaterThan(capabilitiesStart);
  });

  it("omits the capabilities section when the pack has none", () => {
    const md = renderAgentsMd(demo);
    expect(md).not.toContain("Harness capabilities");
  });
});

describe("renderClaudeFiles", () => {
  it("renders CLAUDE.md as an @AGENTS.md importer listing native artifacts", () => {
    const files = renderClaudeFiles(demo);
    expect(files["CLAUDE.md"]).toBe(`# CLAUDE.md

@AGENTS.md

This project defines a native Claude Code implementation of this workflow pack:
- Subagent: \`.claude/agents/checker.md\`
- Command: \`.claude/commands/go.md\`
- Hooks: see \`.claude/settings.json\`
`);
  });

  it("renders an agent file with frontmatter and prompt body", () => {
    const files = renderClaudeFiles(demo);
    expect(files[".claude/agents/checker.md"]).toBe(`---
name: checker
description: Verifies work independently.
tools: Read, Bash
model: sonnet
---

Re-run verification yourself. Report raw output.
`);
  });

  it("renders an agent's mcpServers as nested YAML after model when present", () => {
    const files = renderClaudeFiles({
      ...demo,
      agents: [{
        ...demo.agents[0]!,
        mcpServers: { playwright: { command: "npx", args: ["@playwright/mcp@latest"] } },
      }],
    });
    expect(files[".claude/agents/checker.md"]).toBe(`---
name: checker
description: Verifies work independently.
tools: Read, Bash
model: sonnet
mcpServers:
  playwright:
    command: npx
    args:
      - "@playwright/mcp@latest"
---

Re-run verification yourself. Report raw output.
`);
  });

  it("renders an agent file byte-identically when mcpServers is absent", () => {
    const files = renderClaudeFiles(demo);
    expect(files[".claude/agents/checker.md"]).toBe(`---
name: checker
description: Verifies work independently.
tools: Read, Bash
model: sonnet
---

Re-run verification yourself. Report raw output.
`);
  });

  it("renders a command file with frontmatter and prompt body", () => {
    const files = renderClaudeFiles(demo);
    expect(files[".claude/commands/go.md"]).toBe(`---
description: Run the demo loop.
argument-hint: [target]
---

Do the work for $ARGUMENTS, then invoke the checker.
`);
  });

  it("renders hooks into settings.json grouped by event", () => {
    const files = renderClaudeFiles(demo);
    expect(JSON.parse(files[".claude/settings.json"] ?? "")).toEqual({
      hooks: {
        PostToolUse: [
          {
            matcher: "Edit|Write",
            hooks: [{ type: "command", command: 'echo "Reminder: verify before declaring done."' }],
          },
        ],
      },
    });
  });

  it("omits settings.json when the pack has no hooks", () => {
    const files = renderClaudeFiles({ ...demo, hooks: [] });
    expect(files[".claude/settings.json"]).toBeUndefined();
  });

  it("#34: emits only the thin @AGENTS.md importer for a zero-artifact pack (no empty 'native implementation' preamble)", () => {
    // A pack with no agents/commands/hooks/skills has no native Claude Code artifacts to list.
    // The old preamble claimed "this project defines a native implementation" and then listed
    // nothing — a false identity. A true empty pack must render only the @AGENTS.md importer.
    const files = renderClaudeFiles({ ...demo, agents: [], commands: [], hooks: [], skills: [] });
    expect(files["CLAUDE.md"]).toBe("# CLAUDE.md\n\n@AGENTS.md\n");
    expect(files["CLAUDE.md"]).not.toContain("native Claude Code implementation");
  });

  it("renders a run-command hook's command verbatim, unlike the echo-wrapped print-reminder", () => {
    const withRunCommand: WorkflowPack = {
      ...demo,
      hooks: [
        {
          event: "PostToolUse",
          matcher: "Edit|Write",
          description: "Run the test suite after edits.",
          action: "run-command",
          command: "pnpm -s test",
        },
      ],
    };
    const files = renderClaudeFiles(withRunCommand);
    expect(JSON.parse(files[".claude/settings.json"] ?? "")).toEqual({
      hooks: {
        PostToolUse: [
          {
            matcher: "Edit|Write",
            hooks: [{ type: "command", command: "pnpm -s test" }],
          },
        ],
      },
    });
  });
});

describe("renderPack", () => {
  it("produces the full file map with canonical + adapters", () => {
    const files = renderPack(demo);
    expect(Object.keys(files).sort()).toEqual([
      ".claude/agents/checker.md",
      ".claude/commands/go.md",
      ".claude/settings.json",
      ".github/copilot-instructions.md",
      "AGENTS.md",
      "CLAUDE.md",
      "GEMINI.md",
    ]);
  });

  it("GEMINI.md is a one-line importer", () => {
    expect(renderPack(demo)["GEMINI.md"]).toBe("# GEMINI.md\n\n@AGENTS.md\n");
  });

  it("copilot adapter inlines context and workflow prose (no imports, no native artifacts)", () => {
    const md = renderPack(demo)[".github/copilot-instructions.md"] ?? "";
    expect(md.startsWith("# Copilot instructions\n")).toBe(true);
    expect(md).toContain("## Demo discipline");
    expect(md).toContain("## Workflow pack: Demo loop");
    expect(md).not.toContain("@AGENTS.md");
    expect(md).not.toContain(".claude/");
    expect(md).toContain("- go: Do the work for $ARGUMENTS, then invoke the checker.");
  });

  it("is deterministic: identical input gives byte-identical output", () => {
    const a = renderPack(structuredClone(demo));
    const b = renderPack(structuredClone(demo));
    expect(a).toEqual(b);
  });
});
