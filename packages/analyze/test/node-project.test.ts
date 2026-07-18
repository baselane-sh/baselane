import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LocalDirFileSource } from "../src/file-source.ts";
import { detectNodeProject } from "../src/detect/node-project.ts";

const here = dirname(fileURLToPath(import.meta.url));
const src = (name: string) => new LocalDirFileSource(join(here, "fixtures", name));

describe("detectNodeProject", () => {
  it("extracts frameworks, commands, and a real test suite", async () => {
    const r = await detectNodeProject(src("node-vitest-app"), "pnpm");
    expect(r.frameworks).toContainEqual({ name: "react", version: "^18.2.0" });
    expect(r.frameworks).toContainEqual({ name: "vitest", version: "^2.0.0" });
    expect(r.commands).toEqual({
      build: "pnpm run build",
      test: "pnpm run test",
      lint: "pnpm run lint",
    });
    expect(r.hasTestSuite).toBe(true);
  });

  it("treats the npm placeholder test script as no test suite", async () => {
    const r = await detectNodeProject(src("npm-no-tests"), "npm");
    expect(r.hasTestSuite).toBe(false);
    expect(r.commands.test).toBeNull();
    expect(r.commands.build).toBeNull();
  });

  it("returns safe defaults when package.json is missing or malformed", async () => {
    for (const fx of ["no-manifest", "bad-json"]) {
      const r = await detectNodeProject(src(fx), null);
      expect(r).toEqual({ frameworks: [], commands: { build: null, test: null, lint: null }, hasTestSuite: false });
    }
  });

  it("detects a test suite from test files even without a test script", async () => {
    const r = await detectNodeProject(src("tests-no-script"), null);
    expect(r.hasTestSuite).toBe(true);
    expect(r.commands.test).toBeNull();
  });
});
