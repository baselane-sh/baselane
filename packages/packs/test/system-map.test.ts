import { describe, expect, it } from "vitest";
import { validatePack } from "../src/validate.ts";
import { renderPack } from "../src/render/render-pack.ts";
import { renderCapabilities } from "../src/render/capabilities.ts";

const base = {
  id: "sm-pack",
  version: "1.0.0",
  title: "SM",
  summary: "s",
  context: { markdown: "ctx" },
  agents: [],
  commands: [],
  hooks: [],
};

function packWith(method: string, store: "org" | "repo" = "repo") {
  return validatePack({ ...base, capabilities: [{ type: "system-map", store, method }] });
}

describe("system-map capability", () => {
  it("validatePack accepts system-map with both methods", () => {
    expect(packWith("analyze").capabilities?.[0].type).toBe("system-map");
    expect(packWith("analyze+llm").capabilities?.[0].method).toBe("analyze+llm");
  });

  it("validatePack still rejects unknown capability types", () => {
    expect(() => validatePack({ ...base, capabilities: [{ type: "sitemap", store: "repo", method: "analyze" }] })).toThrow(/capabilities\[0\]\.type/);
  });

  it("both methods are provisioned in the manifest, never coming soon", () => {
    const { section, manifest } = renderCapabilities(packWith("analyze+llm"));
    expect(section).toContain("system-map · repo · analyze+llm — provisioned");
    expect(manifest).toContain('"system-map"');
    expect(section).not.toContain("coming soon");
  });

  it("repo store renders the README, /map command, stop hook, and AGENTS note", () => {
    const rendered = renderPack(packWith("analyze"));
    expect(rendered[".baselane/system-map/README.md"]).toContain("baselane map .");
    expect(rendered["AGENTS.md"]).toContain("### System map");
    expect(rendered[".claude/commands/map.md"]).toBeDefined();
  });

  it("org store renders no repo files but keeps the manifest entry", () => {
    const rendered = renderPack(packWith("analyze", "org"));
    expect(rendered[".baselane/system-map/README.md"]).toBeUndefined();
    expect(rendered["AGENTS.md"]).not.toContain("### System map");
    expect(rendered[".baselane/capabilities.json"]).toContain('"system-map"');
  });

  it("bug #10: an unrecognized method is 'coming soon' and must NOT scaffold the README, /map command, or Stop hook", () => {
    const rendered = renderPack(packWith("analyzz"));
    expect(rendered["AGENTS.md"]).toContain("system-map · repo · analyzz — coming soon");
    expect(rendered[".baselane/system-map/README.md"]).toBeUndefined();
    expect(rendered["AGENTS.md"]).not.toContain("### System map");
    expect(rendered[".claude/commands/map.md"]).toBeUndefined();
    expect(rendered[".claude/settings.json"]).toBeUndefined();
  });
});
