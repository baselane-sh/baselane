import type { FileMap, WorkflowPack } from "../types.ts";
import { renderCapabilities } from "./capabilities.ts";
import { renderClaudeFiles } from "./claude.ts";
import { hasOrgMemoryFiles, renderBundleMemoryFiles, withMemoryScaffolding } from "./memory.ts";
import { hasOrgDesignAnalyze, renderBundleDesignFiles, withDesignAnalyzeScaffolding } from "./design.ts";
import { hasOrgTasksLedger, renderBundleTasksFiles, withTasksScaffolding } from "./tasks.ts";
import { hasOrgWikiBaselane, renderBundleWikiFiles, withWikiScaffolding } from "./wiki.ts";
import { hasOrgGraphCapability, renderBundleGraphFiles, withGraphScaffolding } from "./graph.ts";
import { hasOrgSystemMapCapability, renderBundleSystemMapFiles, withSystemMapScaffolding } from "./system-map.ts";

/** Machine-level bundle for the laptop agent: same artifact bodies, whitelist-rooted paths. */
export function renderBundleFiles(pack: WorkflowPack): FileMap {
  // An org-store memory+files (or tasks+ledger, wiki+baselane, or graph) capability is
  // agent-managed on the laptop, not committed to the repo, so its command and Stop-hook
  // reminder are added here instead of in render/render-pack.ts.
  let claudePack = pack;
  if (hasOrgMemoryFiles(pack)) claudePack = withMemoryScaffolding(claudePack, "org");
  if (hasOrgTasksLedger(pack)) claudePack = withTasksScaffolding(claudePack, "org");
  if (hasOrgWikiBaselane(pack)) claudePack = withWikiScaffolding(claudePack, "org");
  if (hasOrgDesignAnalyze(pack)) claudePack = withDesignAnalyzeScaffolding(claudePack, "org");
  if (hasOrgGraphCapability(pack)) claudePack = withGraphScaffolding(claudePack);
  if (hasOrgSystemMapCapability(pack)) claudePack = withSystemMapScaffolding(claudePack);
  const claude = renderClaudeFiles(claudePack);
  // The capabilities manifest ships at the same `.baselane/capabilities.json` path as the repo
  // render, so the laptop agent finds it in one known location — machine-readable regardless of
  // which surface (repo or bundle) provisioned the capability.
  const { manifest } = renderCapabilities(pack);
  const bundle: FileMap = {
    ...renderBundleMemoryFiles(pack),
    ...renderBundleDesignFiles(pack),
    ...renderBundleTasksFiles(pack),
    ...renderBundleWikiFiles(pack),
    ...renderBundleGraphFiles(pack),
    ...renderBundleSystemMapFiles(pack),
    ...(manifest ? { ".baselane/capabilities.json": manifest } : {}),
  };
  for (const [path, content] of Object.entries(claude)) {
    if (path === ".claude/settings.json") {
      bundle["settings.json"] = content;
      continue;
    }
    const m = /^\.claude\/(agents|commands|skills)\/(.+)$/.exec(path);
    if (m) bundle[`${m[1]}/${m[2]}`] = content;
  }
  return bundle;
}
