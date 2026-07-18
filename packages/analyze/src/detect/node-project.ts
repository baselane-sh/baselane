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

const EMPTY = { frameworks: [] as Framework[], commands: { build: null, test: null, lint: null }, hasTestSuite: false };

function command(pm: string | null, script: string | undefined, subdir: string | null): string | null {
  if (!script) return null;
  const runner = pm ?? "npm";
  const cmd = `${runner} run ${script}`;
  return subdir === null ? cmd : `cd ${subdir} && ${cmd}`;
}

/** The shallowest non-root package.json path, or null. Issue #3: monorepos without a root
 * manifest (subdir npm projects) previously read as "no Node project at all". */
function nearestSubProject(files: string[]): string | null {
  let best: { path: string; depth: number } | null = null;
  for (const f of files) {
    if (!f.endsWith("/package.json")) continue;
    const depth = f.split("/").length;
    if (!best || depth < best.depth || (depth === best.depth && f < best.path)) best = { path: f, depth };
  }
  return best?.path ?? null;
}

export async function detectNodeProject(
  source: RepoFileSource,
  packageManager: string | null,
): Promise<{
  frameworks: Framework[];
  commands: AnalysisProfile["commands"];
  hasTestSuite: boolean;
}> {
  const files = await source.listFiles();
  // Test files count regardless of whether a package.json exists anywhere — a pytest- or Go-only
  // repo has a test suite even with no Node project (issue #3's "no test suite" false negative).
  const hasTestFiles = files.some(isTestPath);

  let pkgPath = "package.json";
  let subdir: string | null = null;
  let raw = await source.readFile(pkgPath);
  if (!raw) {
    const nearest = nearestSubProject(files);
    if (nearest) {
      pkgPath = nearest;
      subdir = nearest.slice(0, -"/package.json".length);
      raw = await source.readFile(pkgPath);
    }
  }
  if (!raw) return { ...EMPTY, hasTestSuite: hasTestFiles };

  let pkg: PackageJson;
  try {
    pkg = JSON.parse(raw) as PackageJson;
  } catch {
    return { ...EMPTY, hasTestSuite: hasTestFiles };
  }

  const allDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const frameworks: Framework[] = Object.entries(allDeps)
    .filter(([name]) => KNOWN_FRAMEWORKS.has(name))
    .map(([name, version]) => ({ name, version }));

  const scripts = pkg.scripts ?? {};
  const testScript = scripts.test;
  const hasRealTestScript = !!testScript && testScript.trim() !== PLACEHOLDER_TEST;

  const commands: AnalysisProfile["commands"] = {
    build: command(packageManager, scripts.build && "build", subdir),
    test: command(packageManager, hasRealTestScript ? "test" : undefined, subdir),
    lint: command(packageManager, scripts.lint && "lint", subdir),
  };

  return { frameworks, commands, hasTestSuite: hasRealTestScript || hasTestFiles };
}
