import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { formatGraphSummary, runGraph } from "../src/graph.ts";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "baselane-graph-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function write(rel: string, content: string): Promise<void> {
  const abs = join(dir, rel);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, content, "utf8");
}

describe("runGraph", () => {
  it("writes .baselane/graph.json and .baselane/graph/GRAPH.md with sane content", async () => {
    await write("src/index.ts", 'import { foo } from "./foo.ts";\n');
    await write("src/foo.ts", "export const foo = 1;\n");

    const r = await runGraph(dir);

    expect(r.written).toEqual([".baselane/graph.json", ".baselane/graph/GRAPH.md"]);

    const json = JSON.parse(await readFile(join(dir, ".baselane/graph.json"), "utf8"));
    expect(json.version).toBe(1);
    expect(json.nodes.map((n: { id: string }) => n.id)).toContain("src/foo.ts");
    expect(json.edges).toContainEqual({
      from: "src/index.ts",
      to: "src/foo.ts",
      kind: "import",
      confidence: "extracted",
    });

    const md = await readFile(join(dir, ".baselane/graph/GRAPH.md"), "utf8");
    expect(md).toContain("# Import graph");
    expect(md).toContain("Modules: 2");
  });

  it("is deterministic: node/edge content matches across repeated runs", async () => {
    await write("a.ts", 'import "./b.ts";\n');
    await write("b.ts", "export const b = 1;\n");

    const r1 = await runGraph(dir);
    const r2 = await runGraph(dir);

    expect(r1.graph.nodes).toEqual(r2.graph.nodes);
    expect(r1.graph.edges).toEqual(r2.graph.edges);
  });

  it("writes through the containment guard, landing exactly under the target dir", async () => {
    await write("index.ts", "export const x = 1;\n");
    const r = await runGraph(dir);
    for (const rel of r.written) {
      await expect(readFile(join(dir, rel), "utf8")).resolves.toBeTypeOf("string");
    }
  });
});

describe("formatGraphSummary", () => {
  it("includes totals, top fan-in, and the written paths", async () => {
    await write("a.ts", 'import "./b.ts";\nimport "./c.ts";\n');
    await write("b.ts", 'import "./c.ts";\n');
    await write("c.ts", "export const c = 1;\n");

    const r = await runGraph(dir);
    const summary = formatGraphSummary(r.graph, r.written);

    expect(summary).toContain("Modules: 3");
    expect(summary).toContain("Top fan-in");
    expect(summary).toContain("c.ts");
    expect(summary).toContain(".baselane/graph.json");
    expect(summary).toContain(".baselane/graph/GRAPH.md");
  });
});
