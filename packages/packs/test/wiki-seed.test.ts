import { describe, it, expect } from "vitest";
import type { RepoFileSource } from "@baselane/analyze";
import { buildWikiSeed } from "../src/seed/wiki-seed.ts";

function memSource(files: Record<string, string>): RepoFileSource {
  return {
    async listFiles() {
      return Object.keys(files);
    },
    async readFile(p) {
      return files[p] ?? null;
    },
  };
}

describe("buildWikiSeed", () => {
  it("seeds an OKF wiki (index + architecture page + log) from static analysis", async () => {
    const source = memSource({
      "package.json": JSON.stringify({ name: "app", scripts: { test: "vitest run", build: "tsc" } }),
      "src/core.ts": "export const x = 1;",
      "src/a.ts": "import { x } from './core.ts';",
      "src/b.ts": "import { x } from './core.ts';",
    });

    const files = await buildWikiSeed(source, { date: "2026-07-11" });

    // OKF index names the seeded page
    expect(files["wiki/index.md"]).toContain("[Architecture overview](architecture.md)");

    // architecture page is a valid OKF page (leading `type:` frontmatter) grounded in real analysis
    const arch = files["wiki/architecture.md"];
    expect(arch.startsWith("---\ntype: ")).toBe(true);
    expect(arch).toContain("typescript"); // detected language
    expect(arch).toContain("core.ts"); // top module hotspot: imported by a.ts + b.ts

    // OKF log carries a dated ingest entry (date injected for determinism)
    expect(files["wiki/log.md"]).toContain("## [2026-07-11] ingest | architecture.md");
  });

  it("degrades honestly when there are no internal import edges", async () => {
    const source = memSource({ "package.json": JSON.stringify({ name: "x" }), "readme.md": "# x" });
    const arch = (await buildWikiSeed(source, { date: "2026-07-11" }))["wiki/architecture.md"];
    expect(arch).toContain("No internal import edges detected");
  });

  it("adds an OKF design page + index/log lines when the repo has a UI surface", async () => {
    const source = memSource({
      "package.json": JSON.stringify({ name: "app", dependencies: { react: "^18" } }),
      "src/theme.css": ":root{--color-brand:#4F46E5;--radius:8px}",
    });
    const files = await buildWikiSeed(source, { date: "2026-07-11" });
    expect(files["wiki/design.md"]?.startsWith("---\ntype: ")).toBe(true);
    expect(files["wiki/design.md"]).toContain("react"); // detected UI framework
    expect(files["wiki/index.md"]).toContain("[Design](design.md)");
    expect(files["wiki/log.md"]).toContain("design.md");
  });

  it("omits the design page when there is no UI surface", async () => {
    const files = await buildWikiSeed(memSource({ "src/core.ts": "export const x = 1;" }), { date: "2026-07-11" });
    expect(files["wiki/design.md"]).toBeUndefined();
    expect(files["wiki/index.md"]).not.toContain("design.md");
  });

  it("embeds an AI overview + hypothesized rules in the architecture page when an AI key is provided", async () => {
    const source = memSource({ "src/core.ts": "export const x = 1;", "src/a.ts": "import { x } from './core.ts';" });
    const aiFetch = (async () =>
      new Response(
        JSON.stringify({
          content: [
            { type: "text", text: JSON.stringify({ overview: "A concise AI overview of the system.", hypothesizedRules: ["Handlers live under src/"] }) },
          ],
        }),
        { status: 200 },
      )) as unknown as typeof fetch;

    const arch = (await buildWikiSeed(source, { date: "2026-07-11", ai: { apiKey: "sk-test", fetchImpl: aiFetch } }))["wiki/architecture.md"];
    expect(arch).toContain("A concise AI overview of the system.");
    expect(arch).toContain("Handlers live under src/");
    expect(arch).toContain("core.ts"); // still grounded in the static hotspots
  });
});
