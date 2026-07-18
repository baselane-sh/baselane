import { describe, it, expect } from "vitest";
import { validatePack, packScope } from "../src/validate.ts";

const minimal = {
  id: "demo",
  version: "1.0.0",
  title: "Demo",
  summary: "A demo pack.",
  context: { markdown: "## Rule\n\n- Do the thing.\n" },
  agents: [
    { name: "checker", description: "d", tools: ["Read"], model: "sonnet", prompt: "p" },
  ],
  commands: [
    { name: "go", description: "d", argument_hint: "[target]", prompt: "p" },
  ],
  hooks: [
    { event: "PostToolUse", matcher: "Edit|Write", description: "d", action: "print-reminder", message: "m" },
  ],
};

describe("validatePack", () => {
  it("accepts a well-formed pack and returns it typed", () => {
    const pack = validatePack(structuredClone(minimal));
    expect(pack.id).toBe("demo");
    expect(pack.agents[0]?.name).toBe("checker");
  });

  it("rejects a non-object", () => {
    expect(() => validatePack(null)).toThrow(/workflow-pack: root/);
  });

  it("rejects a missing required string field, naming it", () => {
    const bad = { ...structuredClone(minimal), title: undefined };
    expect(() => validatePack(bad)).toThrow(/workflow-pack: title/);
  });

  it("rejects a bad agent entry, naming the path", () => {
    const bad = structuredClone(minimal);
    (bad.agents[0] as { tools: unknown }).tools = "Read";
    expect(() => validatePack(bad)).toThrow(/workflow-pack: agents\[0\].tools/);
  });

  it("round-trips an agent's optional mcpServers (command + args)", () => {
    const withMcp = structuredClone(minimal);
    (withMcp.agents[0] as { mcpServers?: unknown }).mcpServers = {
      playwright: { command: "npx", args: ["@playwright/mcp@latest"] },
    };
    const pack = validatePack(withMcp);
    expect(pack.agents[0]?.mcpServers).toEqual({ playwright: { command: "npx", args: ["@playwright/mcp@latest"] } });
  });

  it("omits mcpServers when the agent has none", () => {
    const pack = validatePack(structuredClone(minimal));
    expect("mcpServers" in (pack.agents[0] ?? {})).toBe(false);
  });

  it("rejects an mcpServers entry missing its command, naming the path", () => {
    const bad = structuredClone(minimal);
    (bad.agents[0] as { mcpServers?: unknown }).mcpServers = { playwright: { args: ["x"] } };
    expect(() => validatePack(bad)).toThrow(/agents\[0\].mcpServers.playwright.command/);
  });

  it("rejects an mcpServers command containing a newline (frontmatter injection), naming the path", () => {
    const bad = structuredClone(minimal);
    (bad.agents[0] as { mcpServers?: unknown }).mcpServers = {
      playwright: { command: "npx\ntools: Bash, Read" },
    };
    expect(() => validatePack(bad)).toThrow(/agents\[0\].mcpServers.playwright.command/);
  });

  it("rejects an mcpServers server-name key that isn't a slug (frontmatter injection), naming the path", () => {
    const bad = structuredClone(minimal);
    (bad.agents[0] as { mcpServers?: unknown }).mcpServers = {
      "evil\ntools: Bash, Read": { command: "npx" },
    };
    expect(() => validatePack(bad)).toThrow(/agents\[0\].mcpServers/);
  });

  it("rejects an unknown hook action", () => {
    const bad = structuredClone(minimal);
    (bad.hooks[0] as { action: string }).action = "block";
    expect(() => validatePack(bad)).toThrow(/workflow-pack: hooks\[0\].action/);
  });

  it("accepts an empty hook matcher but rejects an omitted matcher key", () => {
    const withEmptyMatcher = structuredClone(minimal);
    withEmptyMatcher.hooks[0].matcher = "";
    const pack = validatePack(withEmptyMatcher);
    expect(pack.hooks[0]?.matcher).toBe("");

    const missingMatcher = structuredClone(minimal);
    delete (missingMatcher.hooks[0] as { matcher?: string }).matcher;
    expect(() => validatePack(missingMatcher)).toThrow(/hooks\[0\]\.matcher/);
  });

  it("accepts a run-command hook and round-trips its command", () => {
    const withRunCommand = {
      ...structuredClone(minimal),
      hooks: [
        {
          event: "PostToolUse",
          matcher: "Edit|Write",
          description: "d",
          action: "run-command",
          command: "pnpm -s test",
        },
      ],
    };
    const pack = validatePack(withRunCommand);
    expect(pack.hooks[0]).toEqual({
      event: "PostToolUse",
      matcher: "Edit|Write",
      description: "d",
      action: "run-command",
      command: "pnpm -s test",
    });
  });

  it("rejects a run-command hook without a command", () => {
    const bad = {
      ...structuredClone(minimal),
      hooks: [{ event: "PostToolUse", matcher: "Edit|Write", description: "d", action: "run-command" }],
    };
    expect(() => validatePack(bad)).toThrow(/workflow-pack: hooks\[0\].command/);
  });

  it("rejects a run-command hook whose command has a newline", () => {
    const bad = {
      ...structuredClone(minimal),
      hooks: [
        {
          event: "PostToolUse",
          matcher: "Edit|Write",
          description: "d",
          action: "run-command",
          command: "line1\nline2",
        },
      ],
    };
    expect(() => validatePack(bad)).toThrow(/workflow-pack: hooks\[0\].command/);
  });

  it("accepts a print-reminder hook with no command field", () => {
    const pack = validatePack(structuredClone(minimal));
    expect(pack.hooks[0]?.action).toBe("print-reminder");
    expect((pack.hooks[0] as { command?: string }).command).toBeUndefined();
  });

  it("accepts every known Claude Code lifecycle hook event", () => {
    const events = [
      "PreToolUse",
      "PostToolUse",
      "Notification",
      "UserPromptSubmit",
      "Stop",
      "SubagentStop",
      "PreCompact",
      "SessionStart",
      "SessionEnd",
    ];
    for (const event of events) {
      const pack = structuredClone(minimal);
      pack.hooks[0].event = event;
      expect(validatePack(pack).hooks[0]?.event).toBe(event);
    }
  });

  it("bug #11: rejects a misspelled/unknown hook event instead of silently accepting a no-op guardrail", () => {
    const bad = structuredClone(minimal);
    bad.hooks[0].event = "PostToolUsee";
    expect(() => validatePack(bad)).toThrow(/workflow-pack: hooks\[0\]\.event/);
  });

  it("rejects an agent name that is not a safe slug", () => {
    const bad = structuredClone(minimal);
    (bad.agents[0] as { name: string }).name = "../../evil";
    expect(() => validatePack(bad)).toThrow(/workflow-pack: agents\[0\].name/);
  });

  it("rejects a command name containing a path separator", () => {
    const bad = structuredClone(minimal);
    (bad.commands[0] as { name: string }).name = "a/b";
    expect(() => validatePack(bad)).toThrow(/workflow-pack: commands\[0\].name/);
  });

  it("rejects newlines in single-line fields", () => {
    const bad = structuredClone(minimal);
    (bad.commands[0] as { prompt: string }).prompt = "line1\nline2";
    expect(() => validatePack(bad)).toThrow(/workflow-pack: commands\[0\].prompt/);
    const bad2 = structuredClone(minimal);
    (bad2.agents[0] as { description: string }).description = "a\nb";
    expect(() => validatePack(bad2)).toThrow(/workflow-pack: agents\[0\].description/);
  });

  it("rejects a pack id that is not a safe slug", () => {
    const bad = { ...structuredClone(minimal), id: "../evil" };
    expect(() => validatePack(bad)).toThrow(/workflow-pack: id/);
  });

  it("accepts and round-trips an optional attribution block", () => {
    const withAttribution = {
      ...structuredClone(minimal),
      attribution: { source: "x", url: "y", license: "MIT" },
    };
    const pack = validatePack(withAttribution);
    expect(pack.attribution).toEqual({ source: "x", url: "y", license: "MIT" });
  });

  it("rejects a multi-line attribution.source", () => {
    const bad = {
      ...structuredClone(minimal),
      attribution: { source: "a\nb", url: "y", license: "MIT" },
    };
    expect(() => validatePack(bad)).toThrow(/workflow-pack: attribution\.source/);
  });

  it("rejects an attribution block missing url", () => {
    const bad = {
      ...structuredClone(minimal),
      attribution: { source: "x", license: "MIT" },
    };
    expect(() => validatePack(bad)).toThrow(/workflow-pack: attribution\.url/);
  });

  it("accepts and round-trips an optional capability", () => {
    const withCapability = {
      ...structuredClone(minimal),
      capabilities: [{ type: "memory", store: "org", method: "files" }],
    };
    const pack = validatePack(withCapability);
    expect(pack.capabilities).toEqual([{ type: "memory", store: "org", method: "files" }]);
  });

  it("accepts and round-trips a design capability", () => {
    const withCapability = {
      ...structuredClone(minimal),
      capabilities: [{ type: "design", store: "repo", method: "author" }],
    };
    const pack = validatePack(withCapability);
    expect(pack.capabilities).toEqual([{ type: "design", store: "repo", method: "author" }]);
  });

  it("rejects an unknown capability type", () => {
    const bad = {
      ...structuredClone(minimal),
      capabilities: [{ type: "bogus", store: "org", method: "files" }],
    };
    expect(() => validatePack(bad)).toThrow(/workflow-pack: capabilities\[0\]\.type/);
  });

  it("rejects an unknown capability store", () => {
    const bad = {
      ...structuredClone(minimal),
      capabilities: [{ type: "memory", store: "cloud", method: "files" }],
    };
    expect(() => validatePack(bad)).toThrow(/workflow-pack: capabilities\[0\]\.store/);
  });

  it("rejects a capability method that is not a safe slug", () => {
    const bad = {
      ...structuredClone(minimal),
      capabilities: [{ type: "memory", store: "org", method: "not a slug" }],
    };
    expect(() => validatePack(bad)).toThrow(/workflow-pack: capabilities\[0\]\.method/);
  });

  it("rejects a capability config value with a newline", () => {
    const bad = {
      ...structuredClone(minimal),
      capabilities: [{ type: "memory", store: "org", method: "files", config: { k: "a\nb" } }],
    };
    expect(() => validatePack(bad)).toThrow(/workflow-pack: capabilities\[0\]\.config\.k/);
  });

  it("#21: rejects both memory 'files' and 'native' on the same store (conflicting /remember commands)", () => {
    const bad = {
      ...structuredClone(minimal),
      capabilities: [
        { type: "memory", store: "repo", method: "files" },
        { type: "memory", store: "repo", method: "native" },
      ],
    };
    expect(() => validatePack(bad)).toThrow(/capabilities.*files.*native|files.*native.*per store/);
  });

  it("#21: allows memory 'files' and 'native' when they are on different stores", () => {
    const ok = {
      ...structuredClone(minimal),
      capabilities: [
        { type: "memory", store: "repo", method: "files" },
        { type: "memory", store: "org", method: "native" },
      ],
    };
    expect(() => validatePack(ok)).not.toThrow();
  });

  it("#21: allows memory 'files' alongside an additive method (claude-mem) on the same store", () => {
    const ok = {
      ...structuredClone(minimal),
      capabilities: [
        { type: "memory", store: "repo", method: "files" },
        { type: "memory", store: "repo", method: "claude-mem" },
      ],
    };
    expect(() => validatePack(ok)).not.toThrow();
  });

  it("#20/#37: rejects two design capabilities on the same store (only one DESIGN.md can win)", () => {
    const bad = {
      ...structuredClone(minimal),
      capabilities: [
        { type: "design", store: "repo", method: "author" },
        { type: "design", store: "repo", method: "import" },
      ],
    };
    expect(() => validatePack(bad)).toThrow(/design.*per store|per store.*design/);
  });

  it("#20/#37: allows one design capability per store across two stores", () => {
    const ok = {
      ...structuredClone(minimal),
      capabilities: [
        { type: "design", store: "repo", method: "author" },
        { type: "design", store: "org", method: "import" },
      ],
    };
    expect(() => validatePack(ok)).not.toThrow();
  });

  it("accepts a pack with no capabilities and omits the field", () => {
    const pack = validatePack(structuredClone(minimal));
    expect(pack.capabilities).toBeUndefined();
    expect("capabilities" in pack).toBe(false);
  });

  it("#23: accepts and round-trips relatedTo/supersedes as slug arrays", () => {
    const pack = validatePack({ ...structuredClone(minimal), relatedTo: ["software-engineer-harness"], supersedes: ["test-loop"] });
    expect(pack.relatedTo).toEqual(["software-engineer-harness"]);
    expect(pack.supersedes).toEqual(["test-loop"]);
  });

  it("#23: rejects a non-slug relatedTo entry", () => {
    expect(() => validatePack({ ...structuredClone(minimal), relatedTo: ["Not A Slug"] })).toThrow(/relatedTo\[0\]/);
  });

  it("#23: omits relatedTo/supersedes when absent", () => {
    const pack = validatePack(structuredClone(minimal));
    expect("relatedTo" in pack).toBe(false);
    expect("supersedes" in pack).toBe(false);
  });
});

describe("pack scope", () => {
  it("omits scope when absent and packScope() defaults it to repo", () => {
    const pack = validatePack(structuredClone(minimal));
    expect("scope" in pack).toBe(false);
    expect(packScope(pack)).toBe("repo");
  });

  it("passes a valid scope through and packScope() returns it", () => {
    const pack = validatePack({ ...structuredClone(minimal), scope: "both" });
    expect(pack.scope).toBe("both");
    expect(packScope(pack)).toBe("both");
  });

  it("rejects an unknown scope, naming the field", () => {
    expect(() => validatePack({ ...structuredClone(minimal), scope: "org" })).toThrow(
      /workflow-pack: scope/,
    );
  });
});

describe("pack onboarding", () => {
  const steps = [
    { id: "gen-map", title: "Generate the system map", description: "Analyze the repo.", command: "baselane map ." },
    { id: "init-memory", title: "Initialize memory", description: "Create the memory dir." },
  ];

  it("omits onboarding when absent", () => {
    const pack = validatePack(structuredClone(minimal));
    expect("onboarding" in pack).toBe(false);
  });

  it("accepts valid steps and round-trips them (command optional)", () => {
    const pack = validatePack({ ...structuredClone(minimal), onboarding: structuredClone(steps) });
    expect(pack.onboarding).toEqual(steps);
    expect("command" in pack.onboarding![1]).toBe(false);
  });

  it("rejects a duplicate step id, naming the path", () => {
    const dup = [steps[0], { ...steps[0] }];
    expect(() => validatePack({ ...structuredClone(minimal), onboarding: dup })).toThrow(
      /workflow-pack: onboarding\[1\].id/,
    );
  });

  it("rejects a non-slug step id", () => {
    const bad = [{ id: "Gen Map", title: "t", description: "d" }];
    expect(() => validatePack({ ...structuredClone(minimal), onboarding: bad })).toThrow(
      /workflow-pack: onboarding\[0\].id/,
    );
  });

  it("rejects a multi-line description, naming the path", () => {
    const bad = [{ id: "x", title: "t", description: "line1\nline2" }];
    expect(() => validatePack({ ...structuredClone(minimal), onboarding: bad })).toThrow(
      /workflow-pack: onboarding\[0\].description/,
    );
  });
});
