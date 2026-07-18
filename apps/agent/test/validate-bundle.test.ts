import { describe, it, expect } from "vitest";
import { validateBundle } from "../src/validate-bundle.ts";

const good = {
  version: 1,
  files: {
    "agents/checker.md": "---\nname: checker\n---\n\nVerify.\n",
    "commands/tdd-task.md": "---\ndescription: d\n---\n\nDo it.\n",
    "skills/review/SKILL.md": "# Review\n",
  },
};

describe("validateBundle", () => {
  it("accepts a well-formed bundle", () => {
    const b = validateBundle(structuredClone(good));
    expect(Object.keys(b.files)).toHaveLength(3);
  });

  it("rejects a non-object and a wrong version", () => {
    expect(() => validateBundle(null)).toThrow(/bundle: root/);
    expect(() => validateBundle({ version: 3, files: {} })).toThrow(/bundle: version/);
  });

  it("rejects keys outside the allowed roots", () => {
    const bad = { version: 1, files: { "other.json": "{}" } };
    expect(() => validateBundle(bad)).toThrow(/bundle: files\["other.json"\]/);
  });

  it("accepts the settings.json exact key alongside whitelist-rooted keys", () => {
    const good2 = {
      version: 1,
      files: { ...good.files, "settings.json": '{"hooks":{}}' },
    };
    const b = validateBundle(good2);
    expect(b.files["settings.json"]).toBe('{"hooks":{}}');
  });

  it("rejects traversal, absolute and backslash keys", () => {
    for (const key of ["agents/../evil.md", "/etc/passwd", "agents\\win.md"]) {
      const bad = { version: 1, files: { [key]: "x" } };
      expect(() => validateBundle(bad)).toThrow(/bundle: files\[/);
    }
  });

  it("rejects non-string content", () => {
    const bad = { version: 1, files: { "agents/a.md": 7 } };
    expect(() => validateBundle(bad)).toThrow(/bundle: files\["agents\/a.md"\]/);
  });

  it("rejects an empty key and bare root keys", () => {
    for (const key of ["", "agents/", "commands/", "skills/"]) {
      const bad = { version: 1, files: { [key]: "x" } };
      expect(() => validateBundle(bad)).toThrow(/bundle: files\[/);
    }
  });

  it("accepts an org-memory bundle: memory/ files and the .baselane/capabilities.json manifest", () => {
    const withMemory = {
      version: 1,
      files: {
        ...good.files,
        "memory/README.md": "# Memory protocol\n",
        ".baselane/capabilities.json": '{"version":1,"capabilities":[]}\n',
      },
    };
    const b = validateBundle(withMemory);
    expect(b.files["memory/README.md"]).toBe("# Memory protocol\n");
    expect(b.files[".baselane/capabilities.json"]).toContain("capabilities");
  });

  it("accepts the DESIGN.md exact key alongside whitelist-rooted keys", () => {
    const withDesign = {
      version: 1,
      files: { ...good.files, "DESIGN.md": "## Visual theme & atmosphere\n" },
    };
    const b = validateBundle(withDesign);
    expect(b.files["DESIGN.md"]).toBe("## Visual theme & atmosphere\n");
  });

  it("still rejects other .baselane/ paths and a bare memory/ root", () => {
    for (const key of [".baselane/secrets.json", ".baselane/memory/README.md", "memory/"]) {
      const bad = { version: 1, files: { [key]: "x" } };
      expect(() => validateBundle(bad)).toThrow(/bundle: files\[/);
    }
  });

  it("accepts an org-tasks bundle: tasks/ files and the .baselane/capabilities.json manifest", () => {
    const withTasks = {
      version: 1,
      files: {
        ...good.files,
        "tasks/README.md": "# Tasks & progress ledger\n",
        ".baselane/capabilities.json": '{"version":1,"capabilities":[]}\n',
      },
    };
    const b = validateBundle(withTasks);
    expect(b.files["tasks/README.md"]).toBe("# Tasks & progress ledger\n");
    expect(b.files[".baselane/capabilities.json"]).toContain("capabilities");
  });

  it("still rejects a bare tasks/ root", () => {
    const bad = { version: 1, files: { "tasks/": "x" } };
    expect(() => validateBundle(bad)).toThrow(/bundle: files\[/);
  });

  it("accepts an org-wiki bundle: wiki/ files and the .baselane/capabilities.json manifest", () => {
    const withWiki = {
      version: 1,
      files: {
        ...good.files,
        "wiki/README.md": "# Wiki protocol\n",
        ".baselane/capabilities.json": '{"version":1,"capabilities":[]}\n',
      },
    };
    const b = validateBundle(withWiki);
    expect(b.files["wiki/README.md"]).toBe("# Wiki protocol\n");
    expect(b.files[".baselane/capabilities.json"]).toContain("capabilities");
  });

  it("still rejects a bare wiki/ root", () => {
    const bad = { version: 1, files: { "wiki/": "x" } };
    expect(() => validateBundle(bad)).toThrow(/bundle: files\[/);
  });

  it("accepts an org-wiki-deepwiki bundle: mcp/ and deepwiki/ files alongside commands/", () => {
    const withDeepwiki = {
      version: 1,
      files: {
        ...good.files,
        "mcp/deepwiki.json": '{"mcpServers":{"deepwiki":{"type":"sse","url":"https://mcp.deepwiki.com/sse"}}}\n',
        "deepwiki/README.md": "# DeepWiki MCP\n",
        "commands/deepwiki.md": "---\ndescription: d\n---\n\nAsk DeepWiki.\n",
        ".baselane/capabilities.json": '{"version":1,"capabilities":[]}\n',
      },
    };
    const b = validateBundle(withDeepwiki);
    expect(b.files["mcp/deepwiki.json"]).toContain("deepwiki");
    expect(b.files["deepwiki/README.md"]).toBe("# DeepWiki MCP\n");
  });

  it("accepts an org-wiki-docs bundle: docs-as-context/ files", () => {
    const withDocs = {
      version: 1,
      files: { ...good.files, "docs-as-context/README.md": "# Docs-as-context\n" },
    };
    const b = validateBundle(withDocs);
    expect(b.files["docs-as-context/README.md"]).toBe("# Docs-as-context\n");
  });

  it("still rejects bare mcp/, deepwiki/, and docs-as-context/ roots", () => {
    for (const key of ["mcp/", "deepwiki/", "docs-as-context/"]) {
      const bad = { version: 1, files: { [key]: "x" } };
      expect(() => validateBundle(bad)).toThrow(/bundle: files\[/);
    }
  });

  it("accepts an org-store system-map bundle: system-map/README.md", () => {
    const withSystemMap = {
      version: 1,
      files: { ...good.files, "system-map/README.md": "# System map\n" },
    };
    const b = validateBundle(withSystemMap);
    expect(b.files["system-map/README.md"]).toBe("# System map\n");
  });

  it("still rejects a bare system-map/ root", () => {
    const bad = { version: 1, files: { "system-map/": "x" } };
    expect(() => validateBundle(bad)).toThrow(/bundle: files\[/);
  });

  describe("bundle version 2", () => {
    it("accepts a version-2 bundle with packIds, collisions, and onboarding", () => {
      const b = validateBundle({
        version: 2,
        files: { "agents/a.md": "x" },
        packIds: ["a", "b"],
        collisions: ["agents/dup.md"],
        onboarding: [{ packId: "a", stepId: "s1", title: "T", description: "D", command: "baselane map ." }],
      });
      expect(b.version).toBe(2);
      expect(b.packIds).toEqual(["a", "b"]);
      expect(b.onboarding?.[0].command).toBe("baselane map .");
    });

    it("still accepts a bare version-1 bundle (old-agent compat)", () => {
      const b = validateBundle({ version: 1, files: { "commands/x.md": "y" } });
      expect(b.version).toBe(1);
      expect(b.packIds).toBeUndefined();
      expect(b.onboarding).toBeUndefined();
    });

    it("rejects an unknown version", () => {
      expect(() => validateBundle({ version: 3, files: {} })).toThrow(/bundle: version/);
    });

    it("rejects a malformed onboarding step", () => {
      expect(() =>
        validateBundle({ version: 2, files: {}, onboarding: [{ packId: "a", stepId: "s1", title: "T" }] }),
      ).toThrow(/bundle: onboarding\[0\].description/);
    });
  });
});
