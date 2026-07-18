import type { AnalysisProfile, Framework, RepoFileSource } from "../types.ts";
import { isTestPath } from "./test-paths.ts";

// Known dependency names we surface as "frameworks" (deliberately small for v1).
const KNOWN_FRAMEWORKS = new Set([
  "react", "next", "vue", "svelte", "express", "fastify", "@nestjs/core",
  "vitest", "jest", "mocha", "@playwright/test",
]);

const PLACEHOLDER_TEST = 'echo "Error: no test specified" && exit 1';

interface PackageJson {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function command(pm: string | null, script: string | undefined): string | null {
  if (!script) return null;
  const runner = pm ?? "npm";
  return `${runner} run ${script}`;
}

export async function detectNodeProject(
  source: RepoFileSource,
  packageManager: string | null,
): Promise<{
  frameworks: Framework[];
  commands: AnalysisProfile["commands"];
  hasTestSuite: boolean;
}> {
  const raw = await source.readFile("package.json");
  if (!raw) return { frameworks: [], commands: { build: null, test: null, lint: null }, hasTestSuite: false };

  let pkg: PackageJson;
  try {
    pkg = JSON.parse(raw) as PackageJson;
  } catch {
    return { frameworks: [], commands: { build: null, test: null, lint: null }, hasTestSuite: false };
  }

  const allDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const frameworks: Framework[] = Object.entries(allDeps)
    .filter(([name]) => KNOWN_FRAMEWORKS.has(name))
    .map(([name, version]) => ({ name, version }));

  const scripts = pkg.scripts ?? {};
  const testScript = scripts.test;
  const hasRealTestScript = !!testScript && testScript.trim() !== PLACEHOLDER_TEST;

  const commands: AnalysisProfile["commands"] = {
    build: command(packageManager, scripts.build && "build"),
    test: command(packageManager, hasRealTestScript ? "test" : undefined),
    lint: command(packageManager, scripts.lint && "lint"),
  };

  const files = await source.listFiles();
  const hasTestFiles = files.some(isTestPath);

  return { frameworks, commands, hasTestSuite: hasRealTestScript || hasTestFiles };
}
