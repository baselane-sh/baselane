# AGENTS.md

<!-- generated from workflow-pack disciplined-workflow v1.1.0 -->
<!-- adapted from obra/superpowers (MIT) — https://github.com/obra/superpowers -->

## Disciplined workflow

- Plan before you build: for any change beyond a one-sentence diff, produce a short written design and get it approved before writing implementation code.
- Decompose the approved design into small, independently verifiable tasks — each with exact file paths and a verification step.
- Evidence before claims: never report work done without the verification output (the command you ran and its result) to back it.
- Isolate feature work in a git worktree or branch — never directly on the main line.

## Harness capabilities

- tasks · repo · ledger — provisioned

### Tasks

On session start, read `.baselane/tasks/progress.md` before `PLAN.md` — trust the ledger and `git log` over memory. Use `/plan-work` to draft or refresh `PLAN.md`, and append to the ledger after each completed step.

## Workflow pack: Disciplined workflow

The plan-first pipeline with hard approval gates: a written design signed off before any code, a path-exact task plan, then task-by-task spec-then-quality review — for teams that need explicit sign-off at each stage. Pick the software-engineer harness instead for the same loop without gates.

### Roles

- **plan-reviewer** — Checks a plan for placeholders, undefined references, and coverage gaps before execution starts.
- **task-reviewer** — Reviews one completed task in two ordered verdicts: spec compliance first, then code quality.

### Commands

- **/brainstorm** `[what to build]` — Interview toward an approved written design before any implementation.
  - How it runs: Interview the requester about $ARGUMENTS to surface intent, constraints, and edge cases, then write a short design doc and get explicit approval. Do not write or invoke any implementation until the design is approved.
- **/write-plan** `[design doc or feature]` — Decompose an approved design into verifiable, path-exact tasks.
  - How it runs: Turn the approved design for $ARGUMENTS into a task-by-task plan: each task names the exact files to create or modify, the failing test to write first, and how it will be verified. No task may contain a placeholder or a reference to anything no task defines. Then invoke the plan-reviewer subagent and fix anything it flags before execution.
- **/execute-plan** `[plan file]` — Run the plan task-by-task with per-task spec-then-quality review.
  - How it runs: Execute the plan in $ARGUMENTS one task at a time. After each task, invoke the task-reviewer subagent for its two ordered verdicts — spec compliance, then code quality — and do not advance while any Critical or Important finding is open.

### Guardrails

- Reminds that a claim of done must carry its verification output.

Tool-specific implementations live alongside this file (see `CLAUDE.md` for the Claude Code implementation). Tools without a native subagent/command surface should treat the sections above as operating instructions.
