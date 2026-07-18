# AGENTS.md

<!-- generated from workflow-pack software-engineer-harness v1.5.0 -->
<!-- adapted from affaan-m/ECC (MIT) — https://github.com/affaan-m/ECC -->

## Engineering discipline

- Understand before building: for any non-trivial change, state the plan (what, where, how verified) before editing code.
- Test-first: write or extend a failing test before the implementation; never mark work done without a green suite you ran yourself.
- Small, reviewable steps: one logical change per commit, with a message that says why.
- Never silently swallow errors; handle them explicitly or let them propagate.
- Scope discipline: touch only what the task requires — no drive-by refactors.
- Every non-trivial change gets an independent review before merge; the reviewer's findings are addressed, not argued away.

These are enforced, not remembered: the post-edit reminder hook and the `/tdd-task` and `/build-and-check` commands exist because instruction-following decays across a long session — lean on them rather than your own recall.

## Harness capabilities

- tasks · repo · ledger — provisioned
- system-map · repo · analyze — provisioned

### Tasks

On session start, read `.baselane/tasks/progress.md` before `PLAN.md` — trust the ledger and `git log` over memory. Use `/plan-work` to draft or refresh `PLAN.md`, and append to the ledger after each completed step.

### System map

`ARCHITECTURE.md` carries a generated, baselane-managed system map — languages, layout, commands, import-graph hotspots, and measured conventions including hidden rules (consistent but unenforced). Read its conventions section before writing code, and regenerate with `baselane map .` (or `/map regenerate`) after structural changes.

## Workflow pack: Software engineer harness

A self-directed engineering loop with a full toolkit (architect, reviewers, simplifier): plan, implement test-first, get an independent review, and verify with real command output before declaring done — no hard approval gates. Pick disciplined-workflow instead when each stage needs explicit sign-off.

### Roles

- **planner** — Turns a feature request or bug report into a concrete implementation plan: files to touch, interfaces, test cases, and step order. Use before starting any non-trivial change.
- **reviewer** — Reviews a completed change against its requirements and code quality standards. Use after implementation, before merge or done.
- **checker** — Independently re-runs the build, test suite, and typecheck and reports raw results. Use before declaring any task complete.
- **architect** — Evaluates system-level design and trade-offs for larger or cross-cutting changes: patterns, scalability, maintainability. Use before designing a new subsystem or a refactor that spans multiple components.
- **code-reviewer** — Deep-dives a diff for security, quality, and framework-specific issues with confidence-based filtering — only reports findings it can back with an exact line and failure mode. Use as a stricter second pass alongside the reviewer role, especially on security-sensitive or framework-heavy changes.
- **code-simplifier** — Simplifies recently-changed code for clarity and consistency while preserving behavior exactly — extracts nested logic, removes dead code, unwinds over-abstraction. Use after a change works and is reviewed, before final merge.

### Commands

- **/plan-change** `[task description]` — Produce an implementation plan for a change before touching code.
  - How it runs: Invoke the planner subagent for: $ARGUMENTS. Present the returned plan and wait for approval before implementing.
- **/tdd-task** `[task]` — Implement a planned task test-first with the red-green-refactor loop and independent verification.
  - How it runs: For $ARGUMENTS, follow the 6-step red-green-refactor loop: (1) write a failing test; (2) run it and watch it fail for the right reason; (3) write the minimal code to pass; (4) run it and watch it pass; (5) refactor while green; (6) re-run the full suite. Keep line coverage at or above 80%. Then invoke the checker subagent to independently verify, and only then report done.
- **/review-change** `[base ref]` — Get an independent review of the current change before merging.
  - How it runs: Invoke the reviewer subagent on the diff since $ARGUMENTS. If it returns Critical or Important findings, fix them and request re-review. Do not merge with open Critical or Important findings.
- **/build-and-check** `[target]` — Run the build/verify loop until the suite is green or a retry budget is exhausted.
  - How it runs: Build or apply the pending change for $ARGUMENTS, then invoke the checker subagent to verify. If it fails, fix and repeat, up to 3 rounds; stop and report if still red after 3 rounds.

### Guardrails

- Nudge: after any file edit, remind about the test-first and build/verify discipline.

Tool-specific implementations live alongside this file (see `CLAUDE.md` for the Claude Code implementation). Tools without a native subagent/command surface should treat the sections above as operating instructions.
