import type { Capability, FileMap, PackCommand, PackHook, WorkflowPack } from "../types.ts";

/** `.baselane/wiki/README.md` (repo) / `wiki/README.md` (bundle) — same body either way. */
const WIKI_README = `# Wiki protocol

This directory is a durable knowledge base the AI reads before acting and writes after
learning — one concept per file, plus an index and a change log, following the Karpathy
"LLM Wiki" pattern of ingest/query/lint.

This wiki is Open Knowledge Format (OKF) compliant — any OKF-reading agent can consume it.

## Format (OKF)

Each page is a single markdown file with YAML frontmatter, one concept per file:

\`\`\`markdown
---
type: How-it-works
title: <optional title>
description: <optional one-line summary>
resource: <optional URI to an external system>
tags: [optional, list, of, tags]
timestamp: <optional ISO 8601 timestamp>
---

<free-form markdown body>
\`\`\`

\`type\` is the only required frontmatter field — a free-form string naming what kind of
page this is (e.g. \`How-it-works\`, \`Runbook\`, \`Decision\`, \`Gotcha\`). Everything else in
the frontmatter is optional; the body below it is unconstrained markdown.

## Reserved files

- \`index.md\` — navigation. One line per page, link plus a one-line summary:

  \`\`\`markdown
  - [Title](page.md) — one-line summary of what this page covers
  \`\`\`

- \`log.md\` — append-only change log. One entry per change, parseable prefix:

  \`\`\`markdown
  ## [YYYY-MM-DD] <operation> | <subject>
  \`\`\`

  where \`<operation>\` is one of \`ingest\`, \`query\`, \`lint\`, and \`<subject>\` names the
  page(s) touched. Never rewrite a line once it's appended — only add new ones.

## Operations

- **Ingest** — when you learn something durable, create or update the relevant page(s):
  update cross-links in related pages, add or update its \`index.md\` line, and append a
  \`log.md\` entry.
- **Query** — read \`index.md\` first, then the relevant pages, BEFORE acting. When
  answering required real synthesis rather than a lookup, save the result as a new page —
  explorations compound instead of being redone.
- **Lint** — periodically, and via \`/wiki lint\`, check for: contradictions between pages,
  stale claims, orphan pages missing from \`index.md\`, and broken cross-links. Reconcile
  contradictions rather than letting them coexist — corrections beat additions.

## The loop rule

Read before acting. Write after learning. The tedious part is the bookkeeping — that's
your job, not the human's.
`;

const WIKI_COMMAND: PackCommand = {
  name: "wiki",
  description: "Look up a topic, record or update one, or run a lint pass over the wiki.",
  argument_hint: "<topic to look up | fact to record | \"lint\">",
  prompt:
    "Follow the wiki protocol in `.baselane/wiki/README.md` (or `wiki/README.md`) for " +
    '$ARGUMENTS. If this is a lookup, read `index.md` first, then the relevant page(s), ' +
    "before answering — if the answer required real synthesis, save it as a new page. If " +
    "this is new or changed durable knowledge, create or update the relevant page (OKF " +
    "frontmatter with at least `type`), update cross-links, add or update its `index.md` " +
    'line, and append a `log.md` entry. If $ARGUMENTS is "lint" (or empty), scan every ' +
    "page for contradictions, stale claims, orphan pages missing from the index, and " +
    "broken cross-links — reconcile contradictions rather than leaving them, since " +
    "corrections beat additions.",
};

const WIKI_STOP_HOOK: PackHook = {
  event: "Stop",
  matcher: "",
  description: "Reminds the agent to update the wiki entry after changing how something works.",
  action: "print-reminder",
  message:
    "Before finishing, if you changed how something works, update the wiki entry " +
    "(and its index.md/log.md lines) — see .baselane/wiki/README.md.",
};

/**
 * `.baselane/mcp/deepwiki.json` (repo) / `mcp/deepwiki.json` (bundle) — a ready-to-merge
 * snippet for this repo's `.mcp.json`. Never write `.mcp.json` itself: an existing one may
 * already declare other servers, so the README instructs a manual merge instead of a clobber.
 */
const DEEPWIKI_MCP_JSON =
  JSON.stringify({ mcpServers: { deepwiki: { type: "sse", url: "https://mcp.deepwiki.com/sse" } } }, null, 2) + "\n";

/** `.baselane/deepwiki/README.md` (repo) / `deepwiki/README.md` (bundle) — same body either way. */
const DEEPWIKI_README = `# Wiki adapter: deepwiki

[DeepWiki](https://deepwiki.com) (\`mcp.deepwiki.com\`) is a free, no-auth remote MCP server
that auto-generates an architecture wiki for any indexed GitHub repository and answers
questions about it — read-only, nothing to install.

## Setup

1. A ready-to-merge snippet lives at \`.baselane/mcp/deepwiki.json\`. Open it and merge its
   \`mcpServers.deepwiki\` entry into this repo's \`.mcp.json\` — **never overwrite an existing
   \`.mcp.json\`**; add the \`deepwiki\` key alongside whatever servers are already configured.
2. If \`.mcp.json\` doesn't exist yet, \`.baselane/mcp/deepwiki.json\` is already in the right
   shape to copy in as-is.
3. Restart Claude Code (or run \`/mcp\`) so it picks up the new server.

## Usage

Once configured, three MCP tools become available:

- \`read_wiki_structure\` — list the documentation topics DeepWiki has generated for a repo.
- \`read_wiki_contents\` — read the generated architecture wiki for a repo.
- \`ask_question\` — ask a natural-language question about a repo's codebase.

Use \`/deepwiki <question>\` for guidance on which tool to reach for.

## How this maps to the baselane protocol

DeepWiki is **read side only** — it answers "how does this work" questions against an
auto-generated wiki you don't maintain, and has no write/ingest path of its own. Pair it with
the \`baselane\` wiki method (\`.baselane/wiki/\`) for the write loop: when DeepWiki (or your own
exploration) surfaces a durable fact worth keeping, ingest it into \`.baselane/wiki/\` the
normal way — DeepWiki won't remember it for you.
`;

const DEEPWIKI_COMMAND: PackCommand = {
  name: "deepwiki",
  description: "Query DeepWiki's auto-generated architecture wiki for this repo via MCP.",
  argument_hint: "<question about this repo>",
  prompt:
    "Use the DeepWiki MCP tools (`read_wiki_structure`, `read_wiki_contents`, `ask_question`), " +
    "configured per `.baselane/deepwiki/README.md` (or `deepwiki/README.md`), to answer " +
    "$ARGUMENTS. Start with `read_wiki_structure` to see what's documented, `read_wiki_contents` " +
    "to read a topic in full, or go straight to `ask_question` for a direct natural-language " +
    "question. If nothing is indexed yet for this repo, say so and suggest visiting " +
    "https://deepwiki.com to request indexing. DeepWiki is read-only — if you learn something " +
    "durable that should persist, ingest it into `.baselane/wiki/` (if present) via the normal " +
    "wiki protocol instead; DeepWiki has no write path of its own.",
};

/** Availability-guarded reminder: fires only while `.mcp.json` doesn't yet declare the
 * `deepwiki` server, so it goes silent the moment setup is actually done. */
const DEEPWIKI_SETUP_HOOK: PackHook = {
  event: "SessionStart",
  matcher: "",
  description: "Reminds the agent to merge the DeepWiki MCP snippet into .mcp.json if it hasn't been yet.",
  action: "run-command",
  command:
    'grep -q "\\"deepwiki\\"" .mcp.json 2>/dev/null || ' +
    'echo "baselane: DeepWiki MCP not configured yet — merge .baselane/mcp/deepwiki.json (or mcp/deepwiki.json) into .mcp.json, see .baselane/deepwiki/README.md"',
};

/**
 * `.baselane/docs-as-context/README.md` (repo) / `docs-as-context/README.md` (bundle) — same
 * body either way. No wiki state directory (no `index.md`/`log.md`) is created for this method:
 * the repo's own docs are the knowledge base.
 */
const DOCS_README = `# Wiki adapter: docs (docs-as-context)

This project's own existing docs (\`docs/\`, \`ARCHITECTURE.md\`, \`README.md\`, or wherever this
repo keeps them) are the knowledge base — read them before acting, and propose changes to them
the same way you'd propose any other code change. No separate wiki state is created; this
file just names the protocol.

## Setup

Nothing to install or scaffold. This method has no state directory of its own — it points at
docs the repo already owns.

## Usage

- **Before acting**, skim the repo's existing docs for anything relevant to the task at hand.
- **When you learn something that belongs in the docs** — a decision, a correction, an
  architectural note — propose the update as a normal PR/commit to those same files. Docs
  changes go through the same review as code; there's no separate ingest step.
- Use \`/docs-lookup <topic>\` to find and read the relevant existing doc(s) before starting work.

## How this maps to the baselane protocol

Where \`baselane\` maintains its own read/write knowledge base under \`.baselane/wiki/\`, \`docs\`
treats the repo's pre-existing documentation as that knowledge base directly — read-only from
the harness's point of view, writable only through the normal commit/PR path a human reviews.
`;

const DOCS_COMMAND: PackCommand = {
  name: "docs-lookup",
  description: "Find and read the repo's existing docs relevant to a topic before acting.",
  argument_hint: "<topic to look up>",
  prompt:
    "Locate and read the existing documentation relevant to $ARGUMENTS — check `docs/`, " +
    "`ARCHITECTURE.md`, `README.md`, and any other doc files this repo already maintains (see " +
    "`.baselane/docs-as-context/README.md`, or `docs-as-context/README.md`, for the protocol). " +
    "Read before acting. If the docs are missing or wrong for $ARGUMENTS, propose the fix as a " +
    "normal edit to those files, not a separate wiki entry — docs changes go through the same " +
    "review as code.",
};

/** The AGENTS.md capabilities-section note for a wiki+baselane capability, regardless of store. */
export const WIKI_AGENTS_NOTE =
  "### Wiki\n\n" +
  "`.baselane/wiki/` is an OKF-compliant knowledge base: read `index.md` and the relevant " +
  "pages before acting, and ingest new durable knowledge into a page (with its index and " +
  "log lines) after learning it. Use `/wiki` to look up, record, or lint.";

// #9: each sibling method gets its own note naming the path/command it actually scaffolds,
// instead of wiki+baselane's note being handed to every method (see hasRepoWikiBaselaneMethod).
export const WIKI_DEEPWIKI_AGENTS_NOTE =
  "### Wiki (deepwiki)\n\n" +
  "This project queries DeepWiki's auto-generated architecture wiki via MCP — merge " +
  "`.baselane/mcp/deepwiki.json` into `.mcp.json` (see `.baselane/deepwiki/README.md`), then use " +
  "`/deepwiki <question>`. DeepWiki is read-only; ingest anything durable you learn into " +
  "`.baselane/wiki/` (if present) the normal way instead.";

export const WIKI_DOCS_AGENTS_NOTE =
  "### Wiki (docs)\n\n" +
  "This project treats its own existing docs as the knowledge base (see " +
  "`.baselane/docs-as-context/README.md`) — read them before acting, and propose changes the " +
  "normal way. Use `/docs-lookup <topic>` to find the relevant doc before starting work.";

function wikiCapabilitiesFor(pack: WorkflowPack, store: "org" | "repo"): Capability[] {
  return (pack.capabilities ?? []).filter((c) => c.type === "wiki" && c.store === store);
}

function hasWikiMethod(pack: WorkflowPack, store: "org" | "repo", method: string): boolean {
  return wikiCapabilitiesFor(pack, store).some((c) => c.method === method);
}

/** True if this store has any wired-up wiki capability (baselane, deepwiki, or docs) that needs
 * its command (and, for baselane, its Stop hook) spliced into the pack via `withWikiScaffolding`. */
function hasWikiScaffoldingNeed(pack: WorkflowPack, store: "org" | "repo"): boolean {
  return (
    hasWikiMethod(pack, store, "baselane") || hasWikiMethod(pack, store, "deepwiki") || hasWikiMethod(pack, store, "docs")
  );
}

/** Despite the name — kept for compatibility with the existing gate call sites in
 * render-pack.ts/bundle.ts/capabilities.ts — this now guards `withWikiScaffolding` for every
 * wired-up wiki method in the repo store, not baselane alone. */
export function hasRepoWikiBaselane(pack: WorkflowPack): boolean {
  return hasWikiScaffoldingNeed(pack, "repo");
}

/** Org-store counterpart of {@link hasRepoWikiBaselane}. */
export function hasOrgWikiBaselane(pack: WorkflowPack): boolean {
  return hasWikiScaffoldingNeed(pack, "org");
}

/** #9: `WIKI_AGENTS_NOTE` describes the `baselane` method (`.baselane/wiki/` OKF store, `/wiki`).
 * Unlike {@link hasRepoWikiBaselane} (which gates scaffolding for ANY wiki method), this gates only
 * that note — so a deepwiki/docs pack isn't told to use `/wiki` + a `.baselane/wiki/index.md` that
 * was never created (deepwiki scaffolds `/deepwiki`, docs scaffolds `/docs-lookup`). */
export function hasRepoWikiBaselaneMethod(pack: WorkflowPack): boolean {
  return hasWikiMethod(pack, "repo", "baselane");
}

/** #9: narrow, note-only gates for the sibling methods — same rationale as
 * {@link hasRepoWikiBaselaneMethod} above. */
export function hasRepoWikiDeepwikiMethod(pack: WorkflowPack): boolean {
  return hasWikiMethod(pack, "repo", "deepwiki");
}

export function hasRepoWikiDocsMethod(pack: WorkflowPack): boolean {
  return hasWikiMethod(pack, "repo", "docs");
}

/** Adds the present wiki method(s)' command(s) for one store (+ baselane's Stop-hook reminder)
 * to a pack, without disturbing what it already declares. `store` defaults to "repo" for
 * compatibility with pre-multi-method call sites; render-pack.ts passes "repo" and bundle.ts
 * passes "org" explicitly so a method declared in one store never leaks a command into the
 * other's file map. */
export function withWikiScaffolding(pack: WorkflowPack, store: "org" | "repo" = "repo"): WorkflowPack {
  const methods = new Set(wikiCapabilitiesFor(pack, store).map((c) => c.method));
  const commands = [...pack.commands];
  const hooks = [...pack.hooks];
  if (methods.has("baselane")) {
    commands.push(WIKI_COMMAND);
    hooks.push(WIKI_STOP_HOOK);
  }
  if (methods.has("deepwiki")) {
    commands.push(DEEPWIKI_COMMAND);
    hooks.push(DEEPWIKI_SETUP_HOOK);
  }
  if (methods.has("docs")) commands.push(DOCS_COMMAND);
  return { ...pack, commands, hooks };
}

/** File map for one store's wiki capabilities — baselane's README, deepwiki's MCP snippet +
 * README, and/or docs' README, whichever methods are present. `pathFor` picks repo vs bundle
 * path shape for a given leaf filename. */
function wikiFilesFor(pack: WorkflowPack, store: "org" | "repo", pathFor: (leaf: string) => string): FileMap {
  const methods = new Set(wikiCapabilitiesFor(pack, store).map((c) => c.method));
  const files: FileMap = {};
  if (methods.has("baselane")) files[pathFor("wiki/README.md")] = WIKI_README;
  if (methods.has("deepwiki")) {
    files[pathFor("mcp/deepwiki.json")] = DEEPWIKI_MCP_JSON;
    files[pathFor("deepwiki/README.md")] = DEEPWIKI_README;
  }
  if (methods.has("docs")) files[pathFor("docs-as-context/README.md")] = DOCS_README;
  return files;
}

/** `.baselane/wiki/README.md` etc., for whichever wiki methods are present in the repo store. */
export function renderRepoWikiFiles(pack: WorkflowPack): FileMap {
  return wikiFilesFor(pack, "repo", (leaf) => `.baselane/${leaf}`);
}

/** `wiki/README.md` etc. in the laptop bundle, for whichever wiki methods are present in the org store. */
export function renderBundleWikiFiles(pack: WorkflowPack): FileMap {
  return wikiFilesFor(pack, "org", (leaf) => leaf);
}
