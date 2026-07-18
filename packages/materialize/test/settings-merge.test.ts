import { describe, it, expect } from "vitest";
import { mergeBaselaneHooks, SettingsParseError } from "../src/settings-merge.ts";

const packSettings = JSON.stringify({
  hooks: {
    PostToolUse: [
      {
        matcher: "Edit|Write",
        hooks: [{ type: "command", command: "pnpm -s test" }],
      },
    ],
  },
});

describe("mergeBaselaneHooks", () => {
  it("merging into null: every baselane hook command is prefixed", () => {
    const merged = JSON.parse(mergeBaselaneHooks(null, packSettings));
    const entries = merged.hooks.PostToolUse;
    expect(entries).toHaveLength(1);
    for (const entry of entries) {
      for (const h of entry.hooks) {
        expect(h.command.startsWith("BASELANE_MANAGED=1 ")).toBe(true);
      }
    }
    expect(merged.hooks.PostToolUse[0].hooks[0].command).toBe("BASELANE_MANAGED=1 pnpm -s test");
  });

  it("preserves user hooks and non-hook keys byte-identically, replacing only old baselane entries", () => {
    const existing = JSON.stringify({
      model: "opus",
      hooks: {
        PostToolUse: [
          {
            matcher: "Edit",
            hooks: [{ type: "command", command: "echo user-hook" }],
          },
          {
            matcher: "Edit|Write",
            hooks: [{ type: "command", command: "BASELANE_MANAGED=1 echo old" }],
          },
        ],
      },
    });
    const merged = JSON.parse(mergeBaselaneHooks(existing, packSettings));
    expect(merged.model).toBe("opus");
    expect(merged.hooks.PostToolUse).toHaveLength(2);
    expect(merged.hooks.PostToolUse[0]).toEqual({
      matcher: "Edit",
      hooks: [{ type: "command", command: "echo user-hook" }],
    });
    expect(merged.hooks.PostToolUse[1]).toEqual({
      matcher: "Edit|Write",
      hooks: [{ type: "command", command: "BASELANE_MANAGED=1 pnpm -s test" }],
    });
  });

  it("is idempotent: merging twice equals merging once", () => {
    const once = mergeBaselaneHooks(null, packSettings);
    const twice = mergeBaselaneHooks(once, packSettings);
    expect(twice).toBe(once);
  });

  // A prior version silently treated unparseable existing settings as "{}" and merged over
  // them, erasing whatever the file actually held (permissions, model, env, MCP config).
  // Bailing loudly is the only safe response — the caller must leave the file untouched.
  it("throws instead of clobbering when existing settings are not valid JSON", () => {
    expect(() => mergeBaselaneHooks("{ not json", packSettings)).toThrow(SettingsParseError);
  });

  it("throws instead of clobbering when existing settings parse to a non-object", () => {
    expect(() => mergeBaselaneHooks("[1,2,3]", packSettings)).toThrow(SettingsParseError);
    expect(() => mergeBaselaneHooks("null", packSettings)).toThrow(SettingsParseError);
  });
});
