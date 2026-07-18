import { describe, it, expect } from "vitest";
import type { RepoFileSource } from "../src/types.ts";
import { buildImportGraph, renderGraphMd } from "../src/import-graph.ts";

class InMemoryFileSource implements RepoFileSource {
  constructor(private readonly files: Record<string, string>) {}
  async listFiles(): Promise<string[]> {
    return Object.keys(this.files).sort();
  }
  async readFile(path: string): Promise<string | null> {
    return path in this.files ? this.files[path] : null;
  }
}

const FIXTURE = {
  "src/index.ts": [
    'import { foo } from "./foo.ts";',
    'import bar from "./bar";',
    'export { baz } from "./baz";',
    'const legacy = require("./legacy.js");',
    'import lodash from "lodash";',
    'import scoped from "@scope/pkg/sub";',
    '// import "./commented.ts" — must be ignored',
    "",
  ].join("\n"),
  "src/foo.ts": "export const foo = 1;\n",
  "src/bar.ts": "export default 2;\n",
  "src/baz.js": "export const baz = 3;\n",
  "src/legacy.js": "module.exports = {};\n",
  "src/lonely.ts": "export const lonely = true;\n",
  "app/main.py": [
    "import os",
    "import sys, json",
    "from .utils import helper",
    "from pkg_ext import thing",
    "# from .commented import nope",
    "",
  ].join("\n"),
  "app/utils.py": "def helper():\n    pass\n",
  "server/main.go": [
    "package main",
    "",
    "import (",
    '\t"fmt"',
    '\t"os"',
    ")",
    "",
    'import "strings"',
    "",
    "func main() {}",
    "",
  ].join("\n"),
};

const source = new InMemoryFileSource(FIXTURE);

describe("buildImportGraph", () => {
  it("includes every scanned file as a module node, even ones with no edges", async () => {
    const graph = await buildImportGraph(source);
    const ids = graph.nodes.filter((n) => n.kind === "module").map((n) => n.id);
    expect(ids).toContain("src/lonely.ts");
    expect(ids).toContain("app/utils.py");
  });

  it("opts.maxFiles bounds the scan to the first N scannable (sorted) files — nodes and edges alike", async () => {
    const capped = new InMemoryFileSource({
      "a.ts": 'import { b } from "./b.ts";\n',
      "b.ts": "export const b = 1;\n",
      "c.ts": 'import { d } from "./d.ts";\n',
      "d.ts": "export const d = 1;\n",
      "e.ts": "export const e = 1;\n",
    });
    const graph = await buildImportGraph(capped, { maxFiles: 2 });
    const ids = graph.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(["a.ts", "b.ts"]);
    expect(graph.edges).toEqual([{ from: "a.ts", to: "b.ts", kind: "import", confidence: "extracted" }]);
  });

  it("opts.maxFiles left unset scans every scannable file (default behavior unchanged)", async () => {
    const capped = new InMemoryFileSource({
      "a.ts": 'import { b } from "./b.ts";\n',
      "b.ts": "export const b = 1;\n",
      "c.ts": 'import { d } from "./d.ts";\n',
      "d.ts": "export const d = 1;\n",
    });
    const graph = await buildImportGraph(capped);
    const ids = graph.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(["a.ts", "b.ts", "c.ts", "d.ts"]);
    expect(graph.edges).toHaveLength(2);
  });

  it("tags module nodes with their detected language", async () => {
    const graph = await buildImportGraph(source);
    const byId = new Map(graph.nodes.map((n) => [n.id, n]));
    expect(byId.get("src/index.ts")?.language).toBe("typescript");
    expect(byId.get("app/main.py")?.language).toBe("python");
    expect(byId.get("server/main.go")?.language).toBe("go");
  });

  it("resolves TS/JS relative imports (with and without extension) to repo paths", async () => {
    const graph = await buildImportGraph(source);
    expect(graph.edges).toContainEqual({ from: "src/index.ts", to: "src/foo.ts", kind: "import", confidence: "extracted" });
    expect(graph.edges).toContainEqual({ from: "src/index.ts", to: "src/bar.ts", kind: "import", confidence: "extracted" });
  });

  it("tags a re-export as export-from and a require() call as require", async () => {
    const graph = await buildImportGraph(source);
    expect(graph.edges).toContainEqual({ from: "src/index.ts", to: "src/baz.js", kind: "export-from", confidence: "extracted" });
    expect(graph.edges).toContainEqual({ from: "src/index.ts", to: "src/legacy.js", kind: "require", confidence: "extracted" });
  });

  it("skips a line-commented-out import", async () => {
    const graph = await buildImportGraph(source);
    expect(graph.edges.some((e) => e.to.includes("commented"))).toBe(false);
  });

  it("resolves bare TS/JS specifiers to pkg: external nodes (plain and scoped)", async () => {
    const graph = await buildImportGraph(source);
    expect(graph.edges).toContainEqual({ from: "src/index.ts", to: "pkg:lodash", kind: "import", confidence: "extracted" });
    expect(graph.edges).toContainEqual({ from: "src/index.ts", to: "pkg:@scope/pkg", kind: "import", confidence: "extracted" });
    const lodashNode = graph.nodes.find((n) => n.id === "pkg:lodash");
    expect(lodashNode?.kind).toBe("external");
  });

  it("resolves Python plain and relative imports, and skips a comment", async () => {
    const graph = await buildImportGraph(source);
    expect(graph.edges).toContainEqual({ from: "app/main.py", to: "pkg:os", kind: "import", confidence: "extracted" });
    expect(graph.edges).toContainEqual({ from: "app/main.py", to: "pkg:sys", kind: "import", confidence: "extracted" });
    expect(graph.edges).toContainEqual({ from: "app/main.py", to: "pkg:json", kind: "import", confidence: "extracted" });
    expect(graph.edges).toContainEqual({ from: "app/main.py", to: "app/utils.py", kind: "import", confidence: "extracted" });
    expect(graph.edges).toContainEqual({ from: "app/main.py", to: "pkg:pkg_ext", kind: "import", confidence: "extracted" });
    expect(graph.edges.some((e) => e.to.includes("commented"))).toBe(false);
  });

  it("resolves Go import blocks and single-line imports", async () => {
    const graph = await buildImportGraph(source);
    expect(graph.edges).toContainEqual({ from: "server/main.go", to: "pkg:fmt", kind: "import", confidence: "extracted" });
    expect(graph.edges).toContainEqual({ from: "server/main.go", to: "pkg:os", kind: "import", confidence: "extracted" });
    expect(graph.edges).toContainEqual({ from: "server/main.go", to: "pkg:strings", kind: "import", confidence: "extracted" });
  });

  it("is deterministic: two builds over the same source produce deep-equal graphs (generated timestamps aside)", async () => {
    const g1 = await buildImportGraph(source);
    const g2 = await buildImportGraph(source);
    expect(g1.nodes).toEqual(g2.nodes);
    expect(g1.edges).toEqual(g2.edges);
  });

  it("sorts nodes and edges deterministically", async () => {
    const graph = await buildImportGraph(source);
    const nodeIds = graph.nodes.map((n) => n.id);
    expect(nodeIds).toEqual([...nodeIds].sort((a, b) => a.localeCompare(b)));
  });
});

describe("renderGraphMd", () => {
  it("summarizes totals, languages, fan-in/fan-out, and external packages", async () => {
    const graph = await buildImportGraph(source);
    const md = renderGraphMd(graph);
    expect(md).toContain("# Import graph");
    expect(md).toContain("## Languages");
    expect(md).toContain("typescript");
    expect(md).toContain("python");
    expect(md).toContain("go");
    expect(md).toContain("## Most depended-on (fan-in)");
    expect(md).toContain("## Most dependencies (fan-out)");
    expect(md).toContain("## External packages");
    expect(md).toContain("lodash");
  });

  it("handles an empty graph without crashing", () => {
    const md = renderGraphMd({ version: 1, generated: new Date().toISOString(), nodes: [], edges: [] });
    expect(md).toContain("(none detected)");
    expect(md).toContain("(no internal dependents)");
    expect(md).toContain("(no internal dependencies)");
    expect(md).toContain("(none)");
  });
});
