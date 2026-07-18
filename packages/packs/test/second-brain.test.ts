import { describe, it, expect } from "vitest";
import { loadBuiltinPack } from "../src/load.ts";
import { renderPack } from "../src/render/render-pack.ts";
import { renderBundleWikiFiles } from "../src/render/wiki.ts";
import { renderBundleMemoryFiles } from "../src/render/memory.ts";

describe("second-brain pack", () => {
  it("declares wiki+memory in both the repo and org stores", async () => {
    const pack = await loadBuiltinPack("second-brain");
    expect(pack.id).toBe("second-brain");
    const caps = pack.capabilities ?? [];
    for (const type of ["wiki", "memory"] as const) {
      for (const store of ["repo", "org"] as const) {
        expect(caps.some((c) => c.type === type && c.store === store)).toBe(true);
      }
    }
  });

  it("renders the OKF wiki + memory scaffold, librarian, and a SessionStart hook into a repo", async () => {
    const files = renderPack(await loadBuiltinPack("second-brain"));

    // OKF wiki + memory protocol files
    expect(files[".baselane/wiki/README.md"]).toContain("Open Knowledge Format (OKF)");
    expect(files[".baselane/memory/README.md"]).toContain("Memory protocol");

    // auto-spliced capability commands (never declared in pack.json)
    expect(files[".claude/commands/wiki.md"]).toBeDefined();
    expect(files[".claude/commands/remember.md"]).toBeDefined();

    // the librarian subagent
    expect(files[".claude/agents/librarian.md"]).toBeDefined();

    // both capability notes land in AGENTS.md, all four capabilities provisioned (no coming soon)
    expect(files["AGENTS.md"]).toContain("### Wiki");
    expect(files["AGENTS.md"]).toContain("### Memory");
    expect(files[".baselane/capabilities.json"]).not.toContain("coming soon");

    // the SessionStart "read the index first" reminder is wired into settings.json
    expect(files[".claude/settings.json"]).toContain("SessionStart");
  });

  it("ships the scaffold to the laptop bundle too (org store, no .baselane/ prefix)", async () => {
    const pack = await loadBuiltinPack("second-brain");
    expect(renderBundleWikiFiles(pack)["wiki/README.md"]).toContain("Open Knowledge Format (OKF)");
    expect(renderBundleMemoryFiles(pack)["memory/README.md"]).toContain("Memory protocol");
  });
});
