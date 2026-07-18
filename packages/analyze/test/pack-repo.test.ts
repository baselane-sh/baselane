import { describe, it, expect } from "vitest";
import type { RepoFileSource } from "../src/types.ts";
import { packRepo, estTokens } from "../src/pack-repo.ts";

class InMemoryFileSource implements RepoFileSource {
  constructor(private readonly files: Record<string, string>) {}
  async listFiles(): Promise<string[]> {
    return Object.keys(this.files).sort();
  }
  async readFile(path: string): Promise<string | null> {
    return path in this.files ? this.files[path] : null;
  }
}

class FlakyFileSource extends InMemoryFileSource {
  constructor(files: Record<string, string>, private readonly fail: Set<string>) {
    super(files);
  }
  async readFile(path: string): Promise<string | null> {
    if (this.fail.has(path)) throw new TypeError("fetch failed");
    return super.readFile(path);
  }
}

describe("packRepo", () => {
  it("includes tooling/config files verbatim and renders a directory tree", async () => {
    const src = new InMemoryFileSource({
      "package.json": '{"name":"x","scripts":{"build":"tsc"}}',
      "tsconfig.json": '{"compilerOptions":{}}',
      "src/index.ts": "export const a = 1;\n",
    });
    const d = await packRepo(src);
    expect(d.text).toContain("package.json");
    expect(d.text).toContain('"scripts"'); // config content verbatim
    expect(d.tree).toContain("src");
    expect(d.included).toContain("tsconfig.json");
  });

  it("drops ignored paths (node_modules, lockfiles, binaries)", async () => {
    const src = new InMemoryFileSource({
      "src/a.ts": "export const a = 1;\n",
      "node_modules/dep/index.js": "module.exports = {};\n",
      "pnpm-lock.yaml": "lockfileVersion: 9\n",
      "logo.png": "PNG...",
    });
    const d = await packRepo(src);
    expect(d.text).not.toContain("node_modules/dep");
    expect(d.text).not.toContain("pnpm-lock.yaml");
    expect(d.text).not.toContain("logo.png");
    expect(d.included).toEqual(["src/a.ts"]);
  });

  it("ranks by rankBy (fan-in) desc so hot files land before the budget fills", async () => {
    const files: Record<string, string> = {
      "src/hot.ts": "// hot " + "x".repeat(40),
      "src/cold.ts": "// cold " + "y".repeat(40),
    };
    const rankBy = new Map([["src/cold.ts", 1], ["src/hot.ts", 9]]);
    // budget only fits ONE of the two source files
    const d = await packRepo(new InMemoryFileSource(files), { tokenBudget: estTokens("--- src/hot.ts ---\n" + files["src/hot.ts"]) + 5, rankBy });
    expect(d.included).toContain("src/hot.ts");
    expect(d.omitted).toContain("src/cold.ts");
  });

  it("stops at the token budget and reports omitted files + a footer", async () => {
    const files: Record<string, string> = {};
    for (let i = 0; i < 50; i++) files[`src/f${i}.ts`] = "z".repeat(400);
    const d = await packRepo(new InMemoryFileSource(files), { tokenBudget: 2000 });
    expect(d.estTokens).toBeLessThanOrEqual(2600); // budget + one overshoot block
    expect(d.omitted.length).toBeGreaterThan(0);
    expect(d.text).toContain("omitted");
  });

  it("skips a file whose read throws, but still packs the rest", async () => {
    const d = await packRepo(new FlakyFileSource({ "src/a.ts": "export const a=1;\n", "src/b.ts": "export const b=2;\n" }, new Set(["src/a.ts"])));
    expect(d.included).toContain("src/b.ts");
    expect(d.included).not.toContain("src/a.ts");
  });

  it("throws when every read fails (systematic failure surfaces)", async () => {
    await expect(packRepo(new FlakyFileSource({ "a.ts": "x", "b.ts": "y" }, new Set(["a.ts", "b.ts"])))).rejects.toThrow();
  });
});
