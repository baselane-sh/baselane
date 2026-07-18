import { describe, it, expect } from "vitest";
import type { RepoFileSource } from "../src/types.ts";
import { detectPackageManager } from "../src/detect/package-manager.ts";
import { detectNodeProject } from "../src/detect/node-project.ts";

/** In-memory source: a monorepo with NO root package.json, an npm subproject, and pytest files —
 * the issue #3 shape that previously read as "package manager: none / no test suite". */
function memSource(files: Record<string, string>): RepoFileSource {
  return {
    listFiles: async () => Object.keys(files).sort(),
    readFile: async (path: string) => files[path] ?? null,
  };
}

const MONOREPO = {
  "README.md": "# repo\n",
  "web/package.json": JSON.stringify({ scripts: { test: "vitest run", build: "tsc" }, devDependencies: { vitest: "^2.0.0" } }),
  "web/package-lock.json": "{}",
  "svc/pyproject.toml": "[project]\nname='svc'\n",
  "svc/tests/test_api.py": "def test_ok():\n    assert True\n",
};

describe("issue #3: subdir-aware detection", () => {
  it("finds a package manager from a subdir lockfile", async () => {
    expect(await detectPackageManager(memSource(MONOREPO))).toBe("npm");
  });

  it("prefers the root lockfile and the shallowest subdir lockfile", async () => {
    expect(await detectPackageManager(memSource({ ...MONOREPO, "pnpm-lock.yaml": "" }))).toBe("pnpm");
    expect(await detectPackageManager(memSource({
      "a/deep/nested/yarn.lock": "",
      "b/package-lock.json": "{}",
    }))).toBe("npm");
  });

  it("detects the nearest subdir Node project with cd-prefixed commands", async () => {
    const r = await detectNodeProject(memSource(MONOREPO), "npm");
    expect(r.commands.test).toBe("cd web && npm run test");
    expect(r.commands.build).toBe("cd web && npm run build");
    expect(r.frameworks.map((f) => f.name)).toContain("vitest");
    expect(r.hasTestSuite).toBe(true);
  });

  it("reports a test suite for a pytest-only repo with no package.json anywhere", async () => {
    const r = await detectNodeProject(memSource({
      "pyproject.toml": "[project]\nname='x'\n",
      "tests/test_x.py": "def test():\n    pass\n",
    }), null);
    expect(r.hasTestSuite).toBe(true);
    expect(r.commands.test).toBeNull();
  });
});
