# AGENTS.md

Canonical agent-context file for anyone (including an AI) working in this repo. This file is build/test commands and conventions.

## Commands

```
pnpm -r test         # run every package/app's Vitest suite
pnpm -r typecheck     # tsc --noEmit everywhere
```

Per-package equivalents (`vitest run`, `tsc --noEmit`) live in each `package.json`. There is no build step — packages are consumed directly as `.ts` sources via ESM.

## Non-negotiable conventions

- **Node ≥24, ESM, `.ts`-extension imports.** Every relative import ends in `.ts` (`import { x } from "./y.ts"`), enabled by `--experimental-transform-types` semantics — no transpile/build step, no `.js` output to check in.
- **NO new npm dependencies.** This has held across 19 increments, including an Anthropic API integration (`packages/packs/src/ai-merge.ts`) done via global `fetch`, not an SDK. If a task seems to need a new package, it almost always doesn't — check for a zero-dep way first.
- **`validatePack` (`packages/packs/src/validate.ts`) is the sole authority** on what a `WorkflowPack` is. Every pack — built-in JSON, custom, or AI-drafted — passes through it before being stored or rendered. Never hand-construct or trust an unvalidated pack object.
- **Immutability in stores.** Updating a record means appending a new JSONL line with the changed fields, never mutating an existing object in place.
- **Golden snapshots.** `packages/packs/packs/<id>/rendered/` holds committed expected output for each of the 10 built-in packs. A change to the render pipeline that isn't intentional must not change these bytes; a change that IS intentional must update the golden alongside it.
- **Content-preserving by default.** Anything that writes into a human-editable file the repo/developer already owns (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `~/.claude/settings.json`) must merge, never clobber. See `mergeManagedRegion` / `aiMergeFile` / `mergeBaselaneHooks` in `packages/packs`.
- **"Coming soon" honesty.** An unimplemented capability method/adapter is always labeled as such in both the UI and the `.baselane/capabilities.json` manifest — never a silent no-op.

## Where things live

- `packages/packs` — pack schema, validation, render pipeline, merge.
- `packages/analyze` — repo static analysis (languages/frameworks/commands).
- `packages/distribute` — GitHub REST PR distribution + git-ref pack resolution (`github:owner/repo@ref`).
- `packages/materialize` — disk-reconcile + install engine (plan/apply/receipt/settings-merge/manifest-io/resolve/install) shared by CLI and agent.
- `apps/cli` — single-repo `baselane` CLI (audit/apply/distribute/drift/update); `install.ts` resolves `@scope/name[@version]` via the registry (git+SHA, tamper-checked) or `owner/repo@skill` (npx-skills addressing); `publish.ts` does semver-tag-only `baselane publish` against the registry with `GITHUB_TOKEN`.
- `apps/agent` — desktop-agent sync/reconcile engine.
- `docs-site` — the public docs site (docs.baselane.sh): `scripts/build-docs.ts` renders `docs-site/src/pages/*.ts` through `docs-site/src/shell.ts` into `docs-site/dist/` (gitignored, static, zero-dep); CLI/manifest/pack pages are drift-tested against the real `USAGE`/`validateManifest`/`validatePack`.


<!-- baselane:start software-engineer-harness@1.3.0 — managed region, do not edit inside -->
# AGENTS.md

<!-- generated from workflow-pack software-engineer-harness v1.3.0 -->
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

### Tasks

On session start, read `.baselane/tasks/progress.md` before `PLAN.md` — trust the ledger and `git log` over memory. Use `/plan-work` to draft or refresh `PLAN.md`, and append to the ledger after each completed step.

## Workflow pack: Software engineer harness

An explicit engineering loop for AI-assisted work: plan before building, implement test-first, get an independent review, and verify with real command output before declaring done.

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
<!-- baselane:end -->
