import type { FileMap, WorkflowPack } from "../types.ts";
import { renderAgentsMd } from "./agents-md.ts";
import { renderCapabilities } from "./capabilities.ts";
import { renderClaudeFiles } from "./claude.ts";
import { renderCopilot, renderGemini } from "./adapters.ts";
import { hasRepoMemoryFiles, renderRepoMemoryFiles, withMemoryScaffolding } from "./memory.ts";
import { hasRepoDesignAnalyze, renderRepoDesignFiles, withDesignAnalyzeScaffolding } from "./design.ts";
import { hasRepoTasksLedger, renderRepoTasksFiles, withTasksScaffolding } from "./tasks.ts";
import { hasRepoWikiBaselane, renderRepoWikiFiles, withWikiScaffolding } from "./wiki.ts";
import { hasRepoGraphCapability, renderRepoGraphFiles, withGraphScaffolding } from "./graph.ts";
import { hasRepoSystemMapCapability, renderRepoSystemMapFiles, withSystemMapScaffolding } from "./system-map.ts";

/** Full deterministic file map for one pack: canonical AGENTS.md + all tool targets. */
export function renderPack(pack: WorkflowPack): FileMap {
  const { manifest } = renderCapabilities(pack);
  // A repo-store memory+files (or tasks+ledger, wiki+baselane, or graph) capability adds its
  // command and Stop-hook reminder to the repo's own Claude Code surface; org-store versions
  // live on the laptop instead (see render/bundle.ts), so this pack is left untouched in that case.
  let claudePack = pack;
  if (hasRepoMemoryFiles(pack)) claudePack = withMemoryScaffolding(claudePack, "repo");
  if (hasRepoTasksLedger(pack)) claudePack = withTasksScaffolding(claudePack, "repo");
  if (hasRepoWikiBaselane(pack)) claudePack = withWikiScaffolding(claudePack, "repo");
  if (hasRepoDesignAnalyze(pack)) claudePack = withDesignAnalyzeScaffolding(claudePack, "repo");
  if (hasRepoGraphCapability(pack)) claudePack = withGraphScaffolding(claudePack);
  if (hasRepoSystemMapCapability(pack)) claudePack = withSystemMapScaffolding(claudePack);
  return {
    "AGENTS.md": renderAgentsMd(pack),
    ...renderClaudeFiles(claudePack),
    ".github/copilot-instructions.md": renderCopilot(pack),
    "GEMINI.md": renderGemini(pack),
    ...(manifest ? { ".baselane/capabilities.json": manifest } : {}),
    ...renderRepoMemoryFiles(pack),
    ...renderRepoDesignFiles(pack),
    ...renderRepoTasksFiles(pack),
    ...renderRepoWikiFiles(pack),
    ...renderRepoGraphFiles(pack),
    ...renderRepoSystemMapFiles(pack),
  };
}
