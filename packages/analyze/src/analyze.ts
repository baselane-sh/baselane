import type { AnalysisProfile, RepoFileSource } from "./types.ts";
import { detectLanguages } from "./detect/languages.ts";
import { detectPackageManager } from "./detect/package-manager.ts";
import { detectLayout } from "./detect/layout.ts";
import { detectNodeProject } from "./detect/node-project.ts";

export async function analyze(source: RepoFileSource): Promise<AnalysisProfile> {
  const [languages, packageManager, layout] = await Promise.all([
    detectLanguages(source),
    detectPackageManager(source),
    detectLayout(source),
  ]);
  const node = await detectNodeProject(source, packageManager);
  return {
    languages,
    packageManager,
    frameworks: node.frameworks,
    commands: node.commands,
    hasTestSuite: node.hasTestSuite,
    layout,
  };
}
