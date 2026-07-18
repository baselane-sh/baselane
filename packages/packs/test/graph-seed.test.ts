import { describe, it, expect } from "vitest";
import type { RepoFileSource } from "@baselane/analyze";
import { buildGraphSeed } from "../src/seed/graph-seed.ts";

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

describe("buildGraphSeed", () => {
  it("produces a deterministic graph.json + GRAPH.md from the repo's imports", async () => {
    const source = memSource({
      "src/core.ts": "export const x = 1;",
      "src/a.ts": "import { x } from './core.ts';",
      "src/b.ts": "import { x } from './core.ts';",
    });

    const files = await buildGraphSeed(source, { generated: "2026-07-11T00:00:00.000Z" });

    const graph = JSON.parse(files["graph.json"]);
    expect(graph.generated).toBe("2026-07-11T00:00:00.000Z"); // pinned → deterministic (buildImportGraph uses new Date())
    expect(graph.nodes.some((n: { id: string; kind: string }) => n.id === "src/core.ts" && n.kind === "module")).toBe(true);
    expect(graph.edges.some((e: { to: string }) => e.to === "src/core.ts")).toBe(true);

    const md = files["graph/GRAPH.md"];
    expect(md).toContain("# Import graph");
    expect(md).toContain("Generated: 2026-07-11T00:00:00.000Z");
    expect(md).toContain("src/core.ts"); // top fan-in (imported by a.ts + b.ts)
  });

  it("degrades cleanly on a repo with no resolvable imports", async () => {
    const files = await buildGraphSeed(memSource({ "readme.md": "# x" }), { generated: "2026-07-11T00:00:00.000Z" });
    expect(files["graph.json"]).toContain('"edges"');
    expect(files["graph/GRAPH.md"]).toContain("# Import graph");
  });
});
