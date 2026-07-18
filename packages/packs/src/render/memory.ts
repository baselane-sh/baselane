import type { Capability, FileMap, PackCommand, PackHook, WorkflowPack } from "../types.ts";

/** `.baselane/memory/README.md` (repo) / `memory/README.md` (bundle) — same body either way. */
const MEMORY_README = `# Memory protocol

This directory holds durable facts the AI has learned while working on this project —
one fact per file, plus an index. Consult the index before acting; add a fact after
learning something durable (a decision, a correction, a constraint that isn't obvious
from the code).

## Format

Each fact is a single markdown file with simple frontmatter:

\`\`\`markdown
---
name: <short-kebab-case-slug>
description: <one-line summary — used to decide relevance during recall>
---

<the fact, in a sentence or two.>
\`\`\`

## Index

\`MEMORY.md\` in this directory lists every fact, one line per file, so the index alone
can be scanned without opening each one:

\`\`\`markdown
- [Title](file.md) — one-line hook
\`\`\`

## Rule

- Consult \`MEMORY.md\` before acting — recall what's already known.
- After learning something durable, write a new fact file and add a line to
  \`MEMORY.md\`. Use \`/remember <fact>\` to do both in one step.
`;

const REMEMBER_COMMAND: PackCommand = {
  name: "remember",
  description: "Append a durable fact to .baselane/memory/ and update its index.",
  argument_hint: "<fact>",
  prompt:
    "Write $ARGUMENTS as a new fact file under `.baselane/memory/` (kebab-case name, " +
    "frontmatter with `name` and `description`, then the fact itself). Then add a " +
    "one-line entry for it to `.baselane/memory/MEMORY.md` (create the index if it " +
    "doesn't exist yet). Keep the fact to one durable, non-obvious sentence or two.",
};

const MEMORY_STOP_HOOK: PackHook = {
  event: "Stop",
  matcher: "",
  description: "Reminds the agent to capture durable decisions to memory before ending the session.",
  action: "print-reminder",
  message:
    "Before finishing, capture any durable decisions or facts from this session to " +
    ".baselane/memory/ (use /remember) and update its MEMORY.md index.",
};

/** `.baselane/memory/native/README.md` (repo) / `memory/native/README.md` (bundle) — native Claude Code memory. */
const NATIVE_MEMORY_README = `# Memory adapter: native (Claude Code)

This project uses Claude Code's own built-in persistent memory instead of an in-repo
\`.baselane/memory/\` store. Facts live under \`~/.claude/projects/<project>/memory/\` on the
machine running the agent — one fact per file, plus a \`MEMORY.md\` index — and are recalled
automatically at the start of a session.

## Setup

No install step: native memory ships with Claude Code itself. There is nothing to add to
\`.mcp.json\` and no package to install.

## Usage

- **Save a fact fast:** type \`# <fact>\` at the start of a chat message. Claude Code writes
  it straight to the memory directory with frontmatter (\`name\`, \`description\`) and appends
  a line to \`MEMORY.md\` — no extra step needed.
- **Save a fact deliberately:** ask the agent to write a new file under
  \`~/.claude/projects/<project>/memory/\` with the same one-fact-per-file, frontmatter +
  index convention, for facts that need more than a sentence.
- **CLAUDE.md memory hierarchy:** \`CLAUDE.md\` (project) and \`~/.claude/CLAUDE.md\` (user,
  global across all projects) are read every session and take precedence for standing
  instructions; the memory directory is for facts learned *during* work, not standing
  preferences — put those in \`CLAUDE.md\` instead.
- **Recall:** memories relevant to the current work surface automatically; \`MEMORY.md\` can
  also be read directly for the full index.

## How this maps to the baselane protocol

Native memory replaces \`.baselane/memory/README.md\` + \`MEMORY.md\` — Claude Code manages the
store itself, so there is no separate baselane-owned directory to keep in sync. Org-store
sync (pushing memory to a shared org-level store) does not apply to this method: native
memory is entirely tool-managed and local to the machine, so declaring it at \`org\` scope
only documents that fact rather than provisioning any additional sync.
`;

const NATIVE_REMEMBER_COMMAND: PackCommand = {
  name: "remember",
  description: "Save a durable fact to Claude Code's native memory.",
  argument_hint: "<fact>",
  prompt:
    "Save $ARGUMENTS as a durable fact using Claude Code's native memory: write it as a " +
    "new file under `~/.claude/projects/<project>/memory/` with frontmatter (`name`, " +
    "`description`) and the fact itself, then add a one-line entry to that directory's " +
    "`MEMORY.md` index. For a short fact, the `# <fact>` chat shortcut does both steps in " +
    "one. Keep the fact to one durable, non-obvious sentence or two.",
};

const NATIVE_STOP_HOOK: PackHook = {
  event: "Stop",
  matcher: "",
  description: "Reminds the agent to capture durable decisions to native memory before ending the session.",
  action: "print-reminder",
  message:
    "Before finishing, capture any durable decisions or facts from this session to " +
    "Claude Code's native memory (use `# <fact>` or /remember).",
};

/** `.baselane/memory/claude-mem/README.md` (repo) / `memory/claude-mem/README.md` (bundle) — claude-mem. */
const CLAUDE_MEM_README = `# Memory adapter: claude-mem

This project uses \`claude-mem\` for durable memory: a companion tool that captures Claude
Code session transcripts, compresses them into semantic summaries, and stores them locally
so future sessions can search past decisions instead of re-deriving them.

## Setup

\`\`\`bash
npm install -g claude-mem
claude-mem install
\`\`\`

\`claude-mem install\` wires its own hooks into this project's Claude Code configuration —
it does not touch or replace any hooks already declared by this pack; both run.

## Usage

- Memory capture happens automatically at the end of a session (or compaction) via the
  installed hooks — no manual save step for ordinary work.
- To inspect what has been stored, search the local memory store from the CLI:
  \`claude-mem search "<topic>"\` lists past compressed summaries relevant to a query.
- Captures are compressed, not raw transcripts — expect a short summary of the decision or
  fact, not the full conversation.

## How this maps to the baselane protocol

\`claude-mem\`'s captured-and-compressed summaries are the equivalent of a
\`.baselane/memory/\` fact file: durable, one-topic, written after learning something. The
read-before/write-after loop still applies — search claude-mem's store for relevant context
before acting, and let its Stop-time hook capture what changed after.
`;

const CLAUDE_MEM_STOP_HOOK: PackHook = {
  event: "Stop",
  matcher: "",
  description: "Confirms claude-mem is installed and available to capture this session's memory.",
  action: "run-command",
  command:
    'command -v claude-mem >/dev/null 2>&1 && echo "claude-mem will capture this session\'s memory automatically." || echo "claude-mem not installed — see .baselane/memory/claude-mem/README.md for setup (npm install -g claude-mem && claude-mem install)"',
};

/** `.baselane/memory/vector/README.md` (repo) / `memory/vector/README.md` (bundle) — mem0 vector memory. */
const VECTOR_README = `# Memory adapter: vector (mem0)

This project uses mem0 for durable memory: facts are embedded and stored in a vector store,
then recalled by semantic similarity rather than an exact filename or index lookup.

## Setup

\`\`\`bash
pip install mem0ai
export MEM0_API_KEY=<your-key>   # or configure a self-hosted vector store per mem0's docs
\`\`\`

## Usage

\`\`\`python
from mem0 import Memory
m = Memory()

# recall — read before acting
relevant = m.search(query="<what you're about to do>", user_id="<project-or-agent-id>")

# write — after learning something durable
m.add("<the fact>", user_id="<project-or-agent-id>")
\`\`\`

Facts are retrieved by meaning, not by filename — a search for "database migration
strategy" can surface a fact that never used those exact words.

## How this maps to the baselane protocol

\`m.search(...)\` before acting is the same discipline as reading
\`.baselane/memory/MEMORY.md\` before acting; \`m.add(...)\` after learning is the same
discipline as writing a new fact file. The read-before/write-after loop is identical — only
the storage and retrieval mechanism (embeddings + similarity search vs. flat files + an
index) differs.
`;

const VECTOR_STOP_HOOK: PackHook = {
  event: "Stop",
  matcher: "",
  description: "Confirms mem0 is installed and reminds the agent to write durable facts to it.",
  action: "run-command",
  command:
    'python3 -c "import mem0" >/dev/null 2>&1 && echo "Before finishing, write any durable facts from this session to mem0 (m.add(...))." || echo "mem0 not installed — see .baselane/memory/vector/README.md for setup (pip install mem0ai)"',
};

/** `.baselane/memory/letta/README.md` (repo) / `memory/letta/README.md` (bundle) — Letta tiered memory. */
const LETTA_README = `# Memory adapter: letta

This project uses Letta (formerly MemGPT) for durable memory: a local server manages
tiered memory for the agent, inspectable and editable through Letta's ADE (Agent
Development Environment) UI.

## Setup

\`\`\`bash
pip install letta
letta server
\`\`\`

Then open the ADE at http://localhost:8283 to inspect or edit memory directly, or drive it
programmatically with the Letta client SDK.

## Usage

Letta's memory is tiered:

- **Core memory** — a small set of always-in-context editable blocks (e.g. persona, current
  task); update these for facts that should be visible on every turn.
- **Recall memory** — the full conversation history, searchable but not always in context.
- **Archival memory** — a long-term vector store for facts that don't need to be in every
  context window; write here for durable, occasionally-needed facts.

## How this maps to the baselane protocol

Writing a durable fact to archival memory after learning it is the write-after half of the
loop; querying archival/recall memory (or checking the relevant core memory block) before
acting is the read-before half. Core memory blocks are the closest analog to \`MEMORY.md\`'s
index — small, always-visible, and worth keeping current.
`;

const LETTA_STOP_HOOK: PackHook = {
  event: "Stop",
  matcher: "",
  description: "Confirms the Letta server is available and reminds the agent to archive durable facts.",
  action: "run-command",
  command:
    'command -v letta >/dev/null 2>&1 && echo "Before finishing, write any durable facts from this session to Letta\'s archival memory." || echo "letta not installed — see .baselane/memory/letta/README.md for setup (pip install letta && letta server)"',
};

/** The AGENTS.md capabilities-section note for a memory+files capability, regardless of store. */
export const MEMORY_AGENTS_NOTE =
  "### Memory\n\n" +
  "Consult `.baselane/memory/` and its `MEMORY.md` index before acting — it holds " +
  "durable facts from past sessions. Use `/remember` to add one after learning " +
  "something durable.";

// #9: each sibling method gets its own note naming the path/command it actually scaffolds,
// instead of memory+files' note being handed to every method (see hasRepoMemoryFilesMethod).
export const MEMORY_NATIVE_AGENTS_NOTE =
  "### Memory (native)\n\n" +
  "This project uses Claude Code's native memory instead of `.baselane/memory/` — facts live " +
  "under `~/.claude/projects/<project>/memory/` and are recalled automatically each session. " +
  "Use `/remember` (or the `# <fact>` chat shortcut) to add one after learning something durable.";

export const MEMORY_CLAUDE_MEM_AGENTS_NOTE =
  "### Memory (claude-mem)\n\n" +
  "This project uses claude-mem to capture and compress session transcripts into searchable " +
  "summaries (see `.baselane/memory/claude-mem/README.md`) — run `claude-mem search \"<topic>\"` " +
  "before acting; capture happens automatically at session end via its own hooks.";

export const MEMORY_VECTOR_AGENTS_NOTE =
  "### Memory (vector)\n\n" +
  "This project uses mem0 for durable memory (see `.baselane/memory/vector/README.md`) — recall " +
  "by semantic similarity with `m.search(...)` before acting, and `m.add(...)` after learning " +
  "something durable.";

export const MEMORY_LETTA_AGENTS_NOTE =
  "### Memory (letta)\n\n" +
  "This project uses Letta's tiered memory (see `.baselane/memory/letta/README.md`) — write " +
  "durable facts to archival memory after learning them, and query archival/recall memory (or " +
  "the relevant core memory block) before acting.";

function memoryCapabilitiesFor(pack: WorkflowPack, store: "org" | "repo"): Capability[] {
  return (pack.capabilities ?? []).filter((c) => c.type === "memory" && c.store === store);
}

function hasMemoryMethod(pack: WorkflowPack, store: "org" | "repo", method: string): boolean {
  return memoryCapabilitiesFor(pack, store).some((c) => c.method === method);
}

/** True if this store has any wired-up memory method (files, native, claude-mem, vector, letta)
 * that needs scaffolding spliced into the pack via `withMemoryScaffolding`. */
function hasMemoryScaffoldingNeed(pack: WorkflowPack, store: "org" | "repo"): boolean {
  return (
    hasMemoryMethod(pack, store, "files") ||
    hasMemoryMethod(pack, store, "native") ||
    hasMemoryMethod(pack, store, "claude-mem") ||
    hasMemoryMethod(pack, store, "vector") ||
    hasMemoryMethod(pack, store, "letta")
  );
}

/** Despite the name — kept for compatibility with the existing gate call sites in
 * render-pack.ts/bundle.ts/capabilities.ts — this now guards `withMemoryScaffolding` for every
 * wired-up memory method in the repo store, not `files` alone. */
export function hasRepoMemoryFiles(pack: WorkflowPack): boolean {
  return hasMemoryScaffoldingNeed(pack, "repo");
}

/** Org-store counterpart of {@link hasRepoMemoryFiles}. */
export function hasOrgMemoryFiles(pack: WorkflowPack): boolean {
  return hasMemoryScaffoldingNeed(pack, "org");
}

/** #9: `MEMORY_AGENTS_NOTE` describes the `files` method specifically (`.baselane/memory/`,
 * `/remember`). Unlike {@link hasRepoMemoryFiles} (which gates scaffolding for ANY memory method),
 * this gates only that note — so a native/vector/letta/claude-mem pack isn't handed a note pointing
 * at a `.baselane/memory/` path it never created. */
export function hasRepoMemoryFilesMethod(pack: WorkflowPack): boolean {
  return hasMemoryMethod(pack, "repo", "files");
}

/** #9: narrow, note-only gates for each sibling method — same rationale as
 * {@link hasRepoMemoryFilesMethod} above, one per method so each note is only shown when its own
 * method is actually present. */
export function hasRepoMemoryNativeMethod(pack: WorkflowPack): boolean {
  return hasMemoryMethod(pack, "repo", "native");
}

export function hasRepoMemoryClaudeMemMethod(pack: WorkflowPack): boolean {
  return hasMemoryMethod(pack, "repo", "claude-mem");
}

export function hasRepoMemoryVectorMethod(pack: WorkflowPack): boolean {
  return hasMemoryMethod(pack, "repo", "vector");
}

export function hasRepoMemoryLettaMethod(pack: WorkflowPack): boolean {
  return hasMemoryMethod(pack, "repo", "letta");
}

/** Adds the present memory method(s)' command(s) + Stop-hook reminder(s) for one store to a
 * pack, without disturbing what it already declares. `store` defaults to "repo" for
 * compatibility with pre-multi-method call sites; render-pack.ts passes "repo" and bundle.ts
 * passes "org" explicitly so a method declared in one store never leaks scaffolding into the
 * other's file map. */
export function withMemoryScaffolding(pack: WorkflowPack, store: "org" | "repo" = "repo"): WorkflowPack {
  const methods = new Set(memoryCapabilitiesFor(pack, store).map((c) => c.method));
  const commands = [...pack.commands];
  const hooks = [...pack.hooks];
  if (methods.has("files")) {
    commands.push(REMEMBER_COMMAND);
    hooks.push(MEMORY_STOP_HOOK);
  }
  if (methods.has("native")) {
    commands.push(NATIVE_REMEMBER_COMMAND);
    hooks.push(NATIVE_STOP_HOOK);
  }
  if (methods.has("claude-mem")) hooks.push(CLAUDE_MEM_STOP_HOOK);
  if (methods.has("vector")) hooks.push(VECTOR_STOP_HOOK);
  if (methods.has("letta")) hooks.push(LETTA_STOP_HOOK);
  return { ...pack, commands, hooks };
}

/** File map for one store's memory capabilities — `files`' README at the top-level slot, every
 * other real method under its own subdirectory so multiple methods can coexist without one
 * silently clobbering another's docs. `pathFor` picks repo vs bundle path shape for a leaf. */
function memoryFilesFor(pack: WorkflowPack, store: "org" | "repo", pathFor: (leaf: string) => string): FileMap {
  const methods = new Set(memoryCapabilitiesFor(pack, store).map((c) => c.method));
  const files: FileMap = {};
  if (methods.has("files")) files[pathFor("memory/README.md")] = MEMORY_README;
  if (methods.has("native")) files[pathFor("memory/native/README.md")] = NATIVE_MEMORY_README;
  if (methods.has("claude-mem")) files[pathFor("memory/claude-mem/README.md")] = CLAUDE_MEM_README;
  if (methods.has("vector")) files[pathFor("memory/vector/README.md")] = VECTOR_README;
  if (methods.has("letta")) files[pathFor("memory/letta/README.md")] = LETTA_README;
  return files;
}

/** `.baselane/memory/...`, for whichever repo-store memory methods the pack declares. */
export function renderRepoMemoryFiles(pack: WorkflowPack): FileMap {
  return memoryFilesFor(pack, "repo", (leaf) => `.baselane/${leaf}`);
}

/** `memory/...` in the laptop bundle, for whichever org-store memory methods the pack declares. */
export function renderBundleMemoryFiles(pack: WorkflowPack): FileMap {
  return memoryFilesFor(pack, "org", (leaf) => leaf);
}
