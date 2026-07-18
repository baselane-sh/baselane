import { describe, expect, it } from "vitest";
import type { RepoFileSource } from "../src/types.ts";
import { analyzeConventions } from "../src/detect/conventions.ts";

export function memSource(files: Record<string, string>): RepoFileSource {
  return {
    listFiles: async () => Object.keys(files).sort(),
    readFile: async (path) => (path in files ? files[path] : null),
  };
}

describe("lint-config inventory", () => {
  it("detects prettier, eslint, editorconfig and tsconfig strictness by root files", async () => {
    const report = await analyzeConventions(
      memSource({
        ".prettierrc": "{}",
        "eslint.config.js": "export default [];",
        ".editorconfig": "root = true",
        "tsconfig.json": '{ "compilerOptions": { "strict": true } }',
        "src/a.ts": "export const a = 1;\n",
      }),
    );
    expect(report.lintConfigs).toEqual([
      { tool: "editorconfig", path: ".editorconfig" },
      { tool: "eslint", path: "eslint.config.js" },
      { tool: "prettier", path: ".prettierrc" },
      { tool: "tsconfig-strict", path: "tsconfig.json" },
    ]);
  });

  it("detects python tools only when their sections exist", async () => {
    const report = await analyzeConventions(
      memSource({
        "pyproject.toml": "[tool.ruff]\nline-length = 100\n[tool.black]\n",
        "setup.cfg": "[metadata]\nname = x\n",
        "src/app.py": "x = 1\n",
      }),
    );
    expect(report.lintConfigs).toEqual([
      { tool: "black", path: "pyproject.toml" },
      { tool: "ruff", path: "pyproject.toml" },
    ]);
  });

  it("reports an empty inventory for a configless repo", async () => {
    const report = await analyzeConventions(memSource({ "src/a.ts": "export const a = 1;\n" }));
    expect(report.lintConfigs).toEqual([]);
    expect(report.version).toBe(1);
  });
});

describe("measured conventions", () => {
  const tsFile = (body: string) => body; // alias for readability

  it("measures 2-space indentation, double quotes, semicolons, .ts import extensions as rules", async () => {
    const body = 'import { x } from "./x.ts";\nexport function f() {\n  const a = "hi";\n  return a;\n}\n';
    const files: Record<string, string> = {};
    for (let i = 0; i < 10; i++) files[`src/mod-${i}.ts`] = tsFile(body);
    const report = await analyzeConventions(memSource(files));
    const byId = new Map(report.rules.map((r) => [r.id, r]));
    expect(byId.get("indentation")?.statement).toBe("Indentation is 2 spaces");
    expect(byId.get("quotes")?.statement).toBe("Strings use double quotes");
    expect(byId.get("semicolons")?.statement).toBe("Statements end with semicolons");
    expect(byId.get("import-extensions")?.statement).toBe('Relative imports include the file extension (e.g. "./x.ts")');
    expect(byId.get("file-naming")?.statement).toBe("Source files are named in kebab-case");
    expect(report.sampledFiles).toBe(10);
  });

  it("flags an unenforced >=90% convention as a hidden rule, enforced when prettier exists", async () => {
    const files: Record<string, string> = {};
    for (let i = 0; i < 10; i++) files[`src/m${i}.ts`] = 'const a = "x";\n';
    const bare = await analyzeConventions(memSource(files));
    const quotesBare = bare.rules.find((r) => r.id === "quotes");
    expect(quotesBare?.enforced).toBe(false); // hidden rule

    const withPrettier = await analyzeConventions(memSource({ ...files, ".prettierrc": "{}" }));
    const quotesEnforced = withPrettier.rules.find((r) => r.id === "quotes");
    expect(quotesEnforced?.enforced).toBe(true);
  });

  it("puts sub-threshold signals in mixed, not rules", async () => {
    const files: Record<string, string> = {};
    for (let i = 0; i < 5; i++) files[`src/a${i}.ts`] = "const a = 'x'\n";
    for (let i = 0; i < 5; i++) files[`src/b${i}.ts`] = 'const b = "y"\n';
    const report = await analyzeConventions(memSource(files));
    expect(report.rules.find((r) => r.id === "quotes")).toBeUndefined();
    const mixed = report.mixed.find((r) => r.id === "quotes");
    expect(mixed).toBeDefined();
    expect(mixed!.consistency).toBeLessThan(0.9);
  });

  it("detects test placement in a test dir with .test suffix", async () => {
    const files: Record<string, string> = { "src/a.ts": "export const a = 1;\n" };
    for (let i = 0; i < 5; i++) files[`test/f${i}.test.ts`] = "import {} from 'vitest'\n";
    const report = await analyzeConventions(memSource(files));
    const placement = report.rules.find((r) => r.id === "test-placement");
    expect(placement?.statement).toBe('Tests live in a dedicated test directory and are named "*.test.*"');
  });

  it("respects the sampleCap and reports fileLength percentiles", async () => {
    const files: Record<string, string> = {};
    for (let i = 0; i < 30; i++) files[`src/f${String(i).padStart(2, "0")}.ts`] = "const x = 1;\n".repeat(10);
    const report = await analyzeConventions(memSource(files), { sampleCap: 10 });
    expect(report.sampledFiles).toBe(10);
    expect(report.sampleCap).toBe(10);
    expect(report.fileLength).toEqual({ p50: 10, p90: 10 });
  });

  it("fileLength counts internal blank lines, dropping only the trailing newline artifact", async () => {
    const files: Record<string, string> = {};
    for (let i = 0; i < 3; i++) files[`src/g${i}.ts`] = "const a = 1;\n\nconst b = 2;\n"; // 3 lines incl. the blank
    const report = await analyzeConventions(memSource(files));
    expect(report.fileLength).toEqual({ p50: 3, p90: 3 });
  });
});
