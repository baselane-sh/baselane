import type { Capability, FileMap, PackCommand, PackHook, WorkflowPack } from "../types.ts";

/** `.baselane/tasks/README.md` (repo) / `tasks/README.md` (bundle) — same body either way. */
const TASKS_README = `# Tasks & progress ledger

This directory anchors multi-session AI work so it survives context compaction — the
plan lives in one file, completed work is logged in another, and neither depends on
what an agent remembers from a prior session.

## Files

- \`PLAN.md\` — at the repo root, or \`.baselane/tasks/PLAN.md\` if the root is reserved
  for something else. The plan, as bite-size checkboxed tasks:

  \`\`\`markdown
  - [ ] Add the tasks-ledger capability
  - [x] Wire render-pack.ts and bundle.ts
  \`\`\`

- \`.baselane/tasks/progress.md\` — an append-only ledger, one line per completed step,
  each with a commit reference:

  \`\`\`markdown
  - 2026-07-09: Wired render-pack.ts and bundle.ts — commit \`a1b2c3d\`
  \`\`\`

  Never rewrite a line once it's committed to the ledger — only append.

## Rule

- **On session start, read the ledger before the plan.** \`progress.md\` says what is
  actually done; \`PLAN.md\` says what was intended. Trust the ledger and \`git log\`
  over either your own memory or a stale-looking checkbox — a checkbox can lag behind
  reality, but a completed-and-committed ledger line cannot.
- **Append after each completed step**, not in a batch at the end of the session. The
  ledger's value is that it survives a compaction or a dropped session mid-task; a step
  that isn't logged until "later" is a step that can be lost.
- Use \`/plan-work\` to draft or refresh \`PLAN.md\` as checkboxed tasks from a spec or
  requirement.
`;

const PLAN_WORK_COMMAND: PackCommand = {
  name: "plan-work",
  description: "Draft or refresh PLAN.md as bite-size checkboxed tasks.",
  argument_hint: "<goal or spec>",
  prompt:
    "Draft or refresh `PLAN.md` (repo root, or `.baselane/tasks/PLAN.md` if the root is " +
    "reserved) for $ARGUMENTS: break the goal into bite-size, independently verifiable, " +
    "checkboxed tasks (`- [ ] ...`). If `PLAN.md` already exists, first reconcile it " +
    "against `.baselane/tasks/progress.md` — check off anything the ledger shows as " +
    "done — then add only the tasks still remaining.",
};

const TASKS_STOP_HOOK: PackHook = {
  event: "Stop",
  matcher: "",
  description: "Reminds the agent to append completed steps to the progress ledger before ending.",
  action: "print-reminder",
  message:
    "Before finishing, append any steps completed this session to " +
    ".baselane/tasks/progress.md with a commit reference, and check off finished tasks in PLAN.md.",
};

/** `.baselane/tasks/speckit/README.md` (repo) / `tasks/speckit/README.md` (bundle) — GitHub Spec Kit. */
const SPECKIT_README = `# Tasks adapter: speckit (GitHub Spec Kit)

This project uses GitHub's Spec Kit for spec-driven development: a spec, then a plan, then
a task list, then implementation — each stage a file under \`.specify/\`, reviewed before the
next stage starts.

## Setup

\`\`\`bash
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git
specify init --here
\`\`\`

\`specify init --here\` scaffolds \`.specify/\` into the current repo (use \`specify init
<project>\` instead to create a new directory).

## Usage

Inside Claude Code, drive the flow with Spec Kit's own slash commands, in order:

1. \`/specify <what to build>\` — writes \`.specify/.../spec.md\`, the requirements.
2. \`/plan\` — writes \`.specify/.../plan.md\`, the technical approach.
3. \`/tasks\` — writes \`.specify/.../tasks.md\`, a checkboxed task breakdown.
4. \`/implement\` — executes the tasks, one at a time.

Use \`/speckit-flow\` in this pack to keep that flow reconciled with this repo's own ledger
as you go, rather than running the four steps in isolation.

## How this maps to the baselane protocol

\`spec.md\` + \`plan.md\` together are the requirements/design half of what \`PLAN.md\` would
otherwise hold; \`tasks.md\` is the checkboxed task list itself. Spec Kit does not keep an
append-only, commit-referenced ledger the way \`.baselane/tasks/progress.md\` does — so as
each task in \`tasks.md\` is completed, still append a line to
\`.baselane/tasks/progress.md\` with a commit reference. Trust the ledger and \`git log\` over
a checkbox in \`tasks.md\`, same as the baselane protocol's own rule.
`;

const SPECKIT_FLOW_COMMAND: PackCommand = {
  name: "speckit-flow",
  description: "Drive the Spec Kit spec→plan→tasks→implement flow, reconciled with the progress ledger.",
  argument_hint: "<what to build>",
  prompt:
    "Drive GitHub Spec Kit's flow for $ARGUMENTS: run `/specify $ARGUMENTS` if `spec.md` " +
    "doesn't exist yet, then `/plan`, then `/tasks` to produce a checkboxed `tasks.md` " +
    "under `.specify/`. Before implementing, reconcile `.specify/.../tasks.md` against " +
    "`.baselane/tasks/progress.md` — trust the ledger over a stale-looking checkbox. Then " +
    "run `/implement` one task at a time, and after each task completes, append a line to " +
    "`.baselane/tasks/progress.md` with a commit reference before moving to the next.",
};

const SPECKIT_STOP_HOOK: PackHook = {
  event: "Stop",
  matcher: "",
  description: "Confirms Spec Kit is installed and reminds the agent to log completed tasks to the ledger.",
  action: "run-command",
  command:
    'command -v specify >/dev/null 2>&1 && echo "Before finishing, append any tasks.md items completed this session to .baselane/tasks/progress.md with a commit reference." || echo "specify-cli not installed — see .baselane/tasks/speckit/README.md for setup (uv tool install specify-cli --from git+https://github.com/github/spec-kit.git)"',
};

/** `.baselane/tasks/taskmaster/README.md` (repo) / `tasks/taskmaster/README.md` (bundle) — Task Master AI. */
const TASKMASTER_README = `# Tasks adapter: taskmaster (Task Master AI)

This project uses Task Master AI to break a PRD or goal into a dependency-aware task list
that an agent can work through directly from the CLI.

## Setup

\`\`\`bash
npm install -g task-master-ai
task-master init
\`\`\`

\`task-master init\` scaffolds a \`.taskmaster/\` directory and prompts for the model provider
API key it should use to generate and expand tasks.

## Usage

- \`task-master parse-prd <file>\` — turns a requirements doc into an initial task list.
- \`task-master list\` — shows all tasks and their status.
- \`task-master next\` — picks the next unblocked task to work on.
- \`task-master set-status --id=<id> --status=done\` — marks a task complete.

## How this maps to the baselane protocol

Task Master's task list (\`.taskmaster/tasks/\`) is the equivalent of \`PLAN.md\`'s checkboxed
tasks, and \`task-master next\` is how you decide what to work on instead of scanning
\`PLAN.md\` yourself. Task Master does not write a commit-referenced ledger entry when a
task is marked done, so after every \`task-master set-status ... --status=done\`, still
append a line to \`.baselane/tasks/progress.md\` with the commit reference — the same
append-only discipline the baselane protocol requires, just triggered from a different CLI.
`;

const TASKMASTER_STOP_HOOK: PackHook = {
  event: "Stop",
  matcher: "",
  description: "Confirms Task Master is installed and reminds the agent to log completed tasks to the ledger.",
  action: "run-command",
  command:
    'command -v task-master >/dev/null 2>&1 && echo "Before finishing, append any task-master tasks marked done this session to .baselane/tasks/progress.md with a commit reference." || echo "task-master-ai not installed — see .baselane/tasks/taskmaster/README.md for setup (npm install -g task-master-ai && task-master init)"',
};

/**
 * `.baselane/tasks/beads/README.md` (repo) / `tasks/beads/README.md` (bundle) — beads (task #38).
 *
 * beads (`bd`, github.com/gastownhall/beads — formerly steveyegge/beads) is a real, actively
 * maintained dependency-aware issue tracker built for coding agents: a Dolt-backed (versioned
 * SQL, cell-level merge) local database with hash-based issue IDs specifically to avoid
 * merge collisions when multiple agents work in parallel branches, plus JSON output so an
 * agent can consume `bd` output programmatically. Validated via web search before adoption,
 * per this repo's AGENTS.md rule on new external tools.
 */
const BEADS_README = `# Tasks adapter: beads

This project uses [beads](https://github.com/gastownhall/beads) (the \`bd\` CLI) for a
dependency-aware task ledger: issues form a DAG (not just a flat list), so \`bd\` can tell you
exactly which tasks are actually unblocked right now — durable across sessions and safe for
multiple agents to share, since it's backed by a version-controlled, git-friendly database
with cell-level merge and hash-based issue IDs (built specifically to avoid ID collisions
when parallel agents create issues on separate branches).

## Setup

Install \`bd\` with whichever fits this machine (see the project's docs for the full matrix):

\`\`\`bash
brew install beads                                  # macOS/Linux, via the gastownhall tap
# or
npm install -g @beads/bd                             # Node.js environments
# or
curl -fsSL https://raw.githubusercontent.com/gastownhall/beads/main/scripts/install.sh | bash
\`\`\`

Then scaffold it into this repo:

\`\`\`bash
bd init
\`\`\`

A machine that runs the desktop agent should install \`bd\` once, the same way it installs any
other harness dependency — the Stop hook below checks for it and prints this same setup block
if it's missing, so a session never fails silently for want of the tool.

## Usage

- \`bd create "<title>"\` — file a new issue (add \`--depends-on <id>\` to record a dependency).
- \`bd list\` — see everything open.
- \`bd ready\` — the key agent-facing command: lists only the issues with no *uncompleted*
  dependency, i.e. what can actually be worked on right now — read this before picking a task,
  not \`bd list\`.
- \`bd close <id>\` — mark an issue done once its work is committed.
- \`bd quickstart\` — beads' own interactive walkthrough, useful the first time in a repo.

## How this maps to the baselane protocol

\`bd\`'s issue DAG plus \`bd ready\` is a more structured version of what \`PLAN.md\` +
\`.baselane/tasks/progress.md\` do by hand: the plan is the set of open issues, the "what's
next" question is answered by \`bd ready\` instead of scanning checkboxes, and closing an
issue with \`bd close <id>\` is the completion event — still append a line to
\`.baselane/tasks/progress.md\` with the commit reference when you do, so the append-only,
commit-referenced ledger this repo's other tasks methods rely on stays populated regardless
of which method a given session is using.
`;

const BEADS_STOP_HOOK: PackHook = {
  event: "Stop",
  matcher: "",
  description: "Confirms beads (bd) is installed and reminds the agent to log completed tasks to the ledger.",
  action: "run-command",
  command:
    'command -v bd >/dev/null 2>&1 && echo "Before finishing, bd close any issues completed this session and append a line to .baselane/tasks/progress.md with a commit reference." || echo "beads (bd) not installed — see .baselane/tasks/beads/README.md for setup (brew install beads, or npm install -g @beads/bd, then bd init)"',
};

/** The AGENTS.md capabilities-section note for a tasks+ledger capability, regardless of store. */
export const TASKS_AGENTS_NOTE =
  "### Tasks\n\n" +
  "On session start, read `.baselane/tasks/progress.md` before `PLAN.md` — trust the " +
  "ledger and `git log` over memory. Use `/plan-work` to draft or refresh `PLAN.md`, " +
  "and append to the ledger after each completed step.";

// #9: each sibling method gets its own note naming the path/command it actually scaffolds,
// instead of tasks+ledger's note being handed to every method (see hasRepoTasksLedgerMethod).
export const TASKS_SPECKIT_AGENTS_NOTE =
  "### Tasks (speckit)\n\n" +
  "This project drives GitHub Spec Kit's spec→plan→tasks→implement flow (see " +
  "`.baselane/tasks/speckit/README.md`) — use `/speckit-flow`, and still append a line to " +
  "`.baselane/tasks/progress.md` with a commit reference after each completed task.";

export const TASKS_TASKMASTER_AGENTS_NOTE =
  "### Tasks (taskmaster)\n\n" +
  "This project uses Task Master AI (see `.baselane/tasks/taskmaster/README.md`) — use " +
  "`task-master next` to pick up work, and append a line to `.baselane/tasks/progress.md` with a " +
  "commit reference after each `task-master set-status ... --status=done`.";

export const TASKS_BEADS_AGENTS_NOTE =
  "### Tasks (beads)\n\n" +
  "This project uses beads (see `.baselane/tasks/beads/README.md`) — run `bd ready` before " +
  "picking a task, and append a line to `.baselane/tasks/progress.md` with a commit reference " +
  "when you `bd close` an issue.";

function tasksCapabilitiesFor(pack: WorkflowPack, store: "org" | "repo"): Capability[] {
  return (pack.capabilities ?? []).filter((c) => c.type === "tasks" && c.store === store);
}

function hasTasksMethod(pack: WorkflowPack, store: "org" | "repo", method: string): boolean {
  return tasksCapabilitiesFor(pack, store).some((c) => c.method === method);
}

/** True if this store has any wired-up tasks method (ledger, speckit, taskmaster, beads) that
 * needs scaffolding spliced into the pack via `withTasksScaffolding`. */
function hasTasksScaffoldingNeed(pack: WorkflowPack, store: "org" | "repo"): boolean {
  return (
    hasTasksMethod(pack, store, "ledger") ||
    hasTasksMethod(pack, store, "speckit") ||
    hasTasksMethod(pack, store, "taskmaster") ||
    hasTasksMethod(pack, store, "beads")
  );
}

/** Despite the name — kept for compatibility with the existing gate call sites in
 * render-pack.ts/bundle.ts/capabilities.ts — this now guards `withTasksScaffolding` for every
 * wired-up tasks method in the repo store, not `ledger` alone. */
export function hasRepoTasksLedger(pack: WorkflowPack): boolean {
  return hasTasksScaffoldingNeed(pack, "repo");
}

/** Org-store counterpart of {@link hasRepoTasksLedger}. */
export function hasOrgTasksLedger(pack: WorkflowPack): boolean {
  return hasTasksScaffoldingNeed(pack, "org");
}

/** #9: `TASKS_AGENTS_NOTE` describes the `ledger` method (`.baselane/tasks/progress.md`,
 * `/plan-work`). Unlike {@link hasRepoTasksLedger} (which gates scaffolding for ANY tasks method),
 * this gates only that note — so a speckit/taskmaster/beads pack isn't handed a note pointing at a
 * ledger it never created. */
export function hasRepoTasksLedgerMethod(pack: WorkflowPack): boolean {
  return hasTasksMethod(pack, "repo", "ledger");
}

/** #9: narrow, note-only gates for the sibling methods — same rationale as
 * {@link hasRepoTasksLedgerMethod} above. */
export function hasRepoTasksSpeckitMethod(pack: WorkflowPack): boolean {
  return hasTasksMethod(pack, "repo", "speckit");
}

export function hasRepoTasksTaskmasterMethod(pack: WorkflowPack): boolean {
  return hasTasksMethod(pack, "repo", "taskmaster");
}

export function hasRepoTasksBeadsMethod(pack: WorkflowPack): boolean {
  return hasTasksMethod(pack, "repo", "beads");
}

/** Adds the present tasks method(s)' command(s) + Stop-hook reminder(s) for one store to a
 * pack, without disturbing what it already declares. `store` defaults to "repo" for
 * compatibility with pre-multi-method call sites; render-pack.ts passes "repo" and bundle.ts
 * passes "org" explicitly so a method declared in one store never leaks scaffolding into the
 * other's file map. */
export function withTasksScaffolding(pack: WorkflowPack, store: "org" | "repo" = "repo"): WorkflowPack {
  const methods = new Set(tasksCapabilitiesFor(pack, store).map((c) => c.method));
  const commands = [...pack.commands];
  const hooks = [...pack.hooks];
  if (methods.has("ledger")) {
    commands.push(PLAN_WORK_COMMAND);
    hooks.push(TASKS_STOP_HOOK);
  }
  if (methods.has("speckit")) {
    commands.push(SPECKIT_FLOW_COMMAND);
    hooks.push(SPECKIT_STOP_HOOK);
  }
  if (methods.has("taskmaster")) hooks.push(TASKMASTER_STOP_HOOK);
  if (methods.has("beads")) hooks.push(BEADS_STOP_HOOK);
  return { ...pack, commands, hooks };
}

/** File map for one store's tasks capabilities — `ledger`'s README at the top-level slot, every
 * other real method under its own subdirectory so multiple methods can coexist without one
 * silently clobbering another's docs. `pathFor` picks repo vs bundle path shape for a leaf. */
function tasksFilesFor(pack: WorkflowPack, store: "org" | "repo", pathFor: (leaf: string) => string): FileMap {
  const methods = new Set(tasksCapabilitiesFor(pack, store).map((c) => c.method));
  const files: FileMap = {};
  if (methods.has("ledger")) files[pathFor("tasks/README.md")] = TASKS_README;
  if (methods.has("speckit")) files[pathFor("tasks/speckit/README.md")] = SPECKIT_README;
  if (methods.has("taskmaster")) files[pathFor("tasks/taskmaster/README.md")] = TASKMASTER_README;
  if (methods.has("beads")) files[pathFor("tasks/beads/README.md")] = BEADS_README;
  return files;
}

/** `.baselane/tasks/...`, for whichever repo-store tasks methods the pack declares. */
export function renderRepoTasksFiles(pack: WorkflowPack): FileMap {
  return tasksFilesFor(pack, "repo", (leaf) => `.baselane/${leaf}`);
}

/** `tasks/...` in the laptop bundle, for whichever org-store tasks methods the pack declares. */
export function renderBundleTasksFiles(pack: WorkflowPack): FileMap {
  return tasksFilesFor(pack, "org", (leaf) => leaf);
}
