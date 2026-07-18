import type { Capability, WorkflowPack } from "../types.ts";
import {
  MEMORY_AGENTS_NOTE,
  MEMORY_CLAUDE_MEM_AGENTS_NOTE,
  MEMORY_LETTA_AGENTS_NOTE,
  MEMORY_NATIVE_AGENTS_NOTE,
  MEMORY_VECTOR_AGENTS_NOTE,
  hasRepoMemoryClaudeMemMethod,
  hasRepoMemoryFilesMethod,
  hasRepoMemoryLettaMethod,
  hasRepoMemoryNativeMethod,
  hasRepoMemoryVectorMethod,
} from "./memory.ts";
import { DESIGN_AGENTS_NOTE, hasRepoDesignCapability } from "./design.ts";
import {
  TASKS_AGENTS_NOTE,
  TASKS_BEADS_AGENTS_NOTE,
  TASKS_SPECKIT_AGENTS_NOTE,
  TASKS_TASKMASTER_AGENTS_NOTE,
  hasRepoTasksBeadsMethod,
  hasRepoTasksLedgerMethod,
  hasRepoTasksSpeckitMethod,
  hasRepoTasksTaskmasterMethod,
} from "./tasks.ts";
import {
  WIKI_AGENTS_NOTE,
  WIKI_DEEPWIKI_AGENTS_NOTE,
  WIKI_DOCS_AGENTS_NOTE,
  hasRepoWikiBaselaneMethod,
  hasRepoWikiDeepwikiMethod,
  hasRepoWikiDocsMethod,
} from "./wiki.ts";
import { GRAPH_AGENTS_NOTE, hasRepoGraphCapability } from "./graph.ts";
import { SYSTEM_MAP_AGENTS_NOTE, hasRepoSystemMapCapability } from "./system-map.ts";

const PROVISIONED_METHODS: Record<string, Set<string>> = {
  memory: new Set(["files", "native", "claude-mem", "vector", "letta"]),
  design: new Set(["author", "import", "analyze"]),
  tasks: new Set(["ledger", "speckit", "taskmaster", "beads"]),
  wiki: new Set(["baselane", "deepwiki", "docs"]),
  graph: new Set(["imports", "graphify", "aider", "lsp", "sourcegraph"]),
  "system-map": new Set(["analyze", "analyze+llm"]),
};

/** This status is store-agnostic on purpose: it feeds `.baselane/capabilities.json`, which ships
 * identically to the repo and the laptop bundle, and a method that's genuinely implemented is
 * "provisioned" regardless of which surface (repo file or agent-managed laptop bundle) ends up
 * holding its scaffolding — see the bug-#37.1 note below for the part of this file that DOES
 * need to be store-aware. */
function status(capability: Capability): "provisioned" | "coming soon" {
  return PROVISIONED_METHODS[capability.type]?.has(capability.method) ? "provisioned" : "coming soon";
}

/**
 * AGENTS.md "## Harness capabilities" section + `.baselane/capabilities.json` manifest, or both
 * null if the pack declares none.
 *
 * Bug #37.1 fix: AGENTS.md is a repo-only artifact (only `render-pack.ts`'s `renderAgentsMd`
 * calls this for its `section`; `bundle.ts` only reads `manifest`) — so the longer explanatory
 * note for a capability must only appear when the corresponding `hasRepoX` helper (the SAME
 * store-aware gate that decides whether `render-pack.ts` actually scaffolds real files into the
 * repo) is true. Before this fix, an org-store capability — real, but scaffolded only into the
 * laptop bundle, never into this repo — still got its note rendered here, pointing a reader of
 * this repo's AGENTS.md at a `.baselane/...` path that doesn't exist in this repo (a silent
 * no-op from the repo's point of view, the inverse of "coming soon" honesty). The one-line
 * `status()` entries above are left store-agnostic deliberately (see the comment on `status`).
 */
export function renderCapabilities(pack: WorkflowPack): { section: string | null; manifest: string | null } {
  const capabilities = pack.capabilities;
  if (!capabilities || capabilities.length === 0) return { section: null, manifest: null };

  const lines = ["## Harness capabilities", ""];
  for (const c of capabilities) lines.push(`- ${c.type} · ${c.store} · ${c.method} — ${status(c)}`);
  // #9: each note is method-specific — gate it on the method it actually describes, not on "any
  // method of this type", so a native/deepwiki/speckit pack is never handed a note that points at a
  // path or command that method never scaffolds. (design's note is method-agnostic: every design
  // method produces the same DESIGN.md, so it stays gated on "any design capability".)
  if (hasRepoMemoryFilesMethod(pack)) lines.push("", MEMORY_AGENTS_NOTE);
  if (hasRepoMemoryNativeMethod(pack)) lines.push("", MEMORY_NATIVE_AGENTS_NOTE);
  if (hasRepoMemoryClaudeMemMethod(pack)) lines.push("", MEMORY_CLAUDE_MEM_AGENTS_NOTE);
  if (hasRepoMemoryVectorMethod(pack)) lines.push("", MEMORY_VECTOR_AGENTS_NOTE);
  if (hasRepoMemoryLettaMethod(pack)) lines.push("", MEMORY_LETTA_AGENTS_NOTE);
  if (hasRepoDesignCapability(pack)) lines.push("", DESIGN_AGENTS_NOTE);
  if (hasRepoTasksLedgerMethod(pack)) lines.push("", TASKS_AGENTS_NOTE);
  if (hasRepoTasksSpeckitMethod(pack)) lines.push("", TASKS_SPECKIT_AGENTS_NOTE);
  if (hasRepoTasksTaskmasterMethod(pack)) lines.push("", TASKS_TASKMASTER_AGENTS_NOTE);
  if (hasRepoTasksBeadsMethod(pack)) lines.push("", TASKS_BEADS_AGENTS_NOTE);
  if (hasRepoWikiBaselaneMethod(pack)) lines.push("", WIKI_AGENTS_NOTE);
  if (hasRepoWikiDeepwikiMethod(pack)) lines.push("", WIKI_DEEPWIKI_AGENTS_NOTE);
  if (hasRepoWikiDocsMethod(pack)) lines.push("", WIKI_DOCS_AGENTS_NOTE);
  if (hasRepoGraphCapability(pack)) lines.push("", GRAPH_AGENTS_NOTE);
  if (hasRepoSystemMapCapability(pack)) lines.push("", SYSTEM_MAP_AGENTS_NOTE);
  const section = lines.join("\n");

  // Provenance is builder/library metadata (increment 26) — never shipped into a rendered file.
  // This manifest is the ONLY renderer that serializes whole block objects, so it drops the key
  // here (rest-destructuring siblings are exempt from noUnusedLocals). No-op for provenance-free
  // packs: the emitted JSON is byte-identical, so every golden stays untouched.
  const manifestCapabilities = capabilities.map(({ provenance: _prov, ...c }) => c);
  const manifest = JSON.stringify({ version: 1, capabilities: manifestCapabilities }, null, 2) + "\n";

  return { section, manifest };
}
