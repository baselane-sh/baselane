# AGENTS.md

<!-- generated from workflow-pack ecc-essentials v1.0.0 -->
<!-- adapted from affaan-m/ECC (Everything Claude Code) (MIT) — https://github.com/affaan-m/ECC -->

## Engineering rules (from Everything Claude Code)

Always-on discipline distilled from ECC's `rules/common` corpus. These are judgment rules a linter can't encode — the mechanical checks stay in CI.

### Coding style

- **Immutability.** Always create new objects; never mutate a value you were handed. Return `{ ...obj, field }` / `map`/`filter` copies, not `push`/`splice`/field assignment on shared state. Locally-scoped accumulators that never escape are fine.
- **KISS / DRY / YAGNI.** Prefer the simplest solution that works; extract repetition only when it is real, not speculative; do not build abstractions before they are needed.
- **File organization.** Many small files over few large ones: 200–400 lines typical, 800 max; high cohesion, low coupling; organize by feature/domain, not by type.
- **Error handling.** Handle errors explicitly at every level; user-friendly messages in UI-facing code, detailed context in server logs; never silently swallow errors.
- **Input validation.** Validate all input at system boundaries, schema-based where available; fail fast with clear messages; never trust external data (API responses, user input, file content).
- **Smells to flag.** Deep nesting (prefer early returns), magic numbers (name the constant), long functions (split by responsibility).

### Testing

- **TDD is the default** for features and bugfixes: write the failing test (RED), minimal implementation (GREEN), refactor with tests staying green. Target 80%+ coverage on changed code.
- **Structure tests Arrange–Act–Assert** with behavior-describing names (`"falls back to substring search when Redis is unavailable"`), one behavior per test.
- **Edge cases that must be tested:** null/undefined, empty collections, invalid types, boundary values, error paths, race conditions, large inputs, special characters.
- **Anti-patterns:** testing implementation details instead of behavior, tests sharing state, assertions that verify nothing, unmocked external dependencies.
- Fix the implementation, not the test — unless the test itself is wrong.

### Security (before any commit)

- No hardcoded secrets — environment variables or a secret manager, validated present at startup; rotate anything that may have leaked.
- All user input validated; parameterized queries (SQL injection), sanitized HTML (XSS), CSRF protection, authn/authz verified, rate limiting on endpoints.
- Error messages must not leak sensitive data.
- If a security issue is found: stop, fix critical issues before continuing, rotate exposed secrets, then sweep the codebase for the same pattern.

### Git workflow

- Commit format: `<type>: <description>` with types feat, fix, refactor, docs, test, chore, perf, ci.
- PRs: analyze the full branch diff (`git diff <base>...HEAD`), not just the latest commit; include a summary and a test plan.

### Performance of the work itself

- Route lightweight, high-frequency subagent work to smaller models; reserve the deepest model for architecture and hard debugging.
- Avoid the last 20% of the context window for multi-file refactors; keep sessions scoped to one task.

## Workflow pack: ECC essentials

The core engineering discipline from Everything Claude Code (ECC): coding-style, testing, security, and git rules as always-on context; TDD, silent-failure, build-fix, and dead-code agents; plus guard hooks for config edits and typechecking.

### Roles

- **tdd-guide** — Test-Driven Development specialist enforcing write-tests-first. Use proactively when writing new features, fixing bugs, or refactoring; guides the Red-Green-Refactor cycle and hunts untested edge cases.
- **silent-failure-hunter** — Reviews code for silent failures: swallowed errors, empty catch blocks, dangerous fallbacks, and missing error propagation. Use after writing error-handling code or when a bug 'can't be reproduced'.
- **build-error-resolver** — Build and type-error resolution specialist. Use when the build or typecheck fails: fixes errors with minimal diffs only — no refactoring, no architecture changes.
- **refactor-cleaner** — Dead-code cleanup and consolidation specialist. Use for removing unused code, duplicate implementations, and unused dependencies — conservatively, with tests green after every batch.

### Commands

- **/tdd** `[feature or bug description]` — Drive the current feature or bugfix test-first with the tdd-guide agent.
  - How it runs: Invoke the tdd-guide subagent for: $ARGUMENTS. It enforces the Red-Green-Refactor cycle — failing test first, minimal implementation, refactor with tests green — and pushes for edge-case coverage (null/empty/invalid input, boundaries, error paths). Do not write implementation code before the failing test exists.
- **/hunt-silent-failures** `[path or base ref]` — Sweep the current change for swallowed errors, empty catches, and dangerous fallbacks.
  - How it runs: Invoke the silent-failure-hunter subagent on $ARGUMENTS (or the current diff if no target is given). It reports empty catch blocks, errors converted to defaults without context, lost stack traces, and unhandled async/network/database error paths — each with file:line, severity, impact, and a concrete fix. Address every Critical finding before merging.
- **/fix-build** `[build command]` — Get a failing build or typecheck green with minimal diffs via the build-error-resolver agent.
  - How it runs: Invoke the build-error-resolver subagent. Run $ARGUMENTS (or the project's typecheck/build commands) to collect all errors, then fix them with minimal diffs only — no refactoring, no architecture changes, never silencing errors by weakening lint/typecheck config. Verify the build exits 0 before finishing.

### Guardrails

- ECC config-protection: remind before edits that linter/formatter/typecheck configs must not be weakened to silence errors.
- ECC typecheck gate: after an edit, run the TypeScript compiler when the project has one.
- ECC session-discipline reminder at the end of a turn: tests green and no secrets staged before calling work done.

### Skills

- **tdd-red-green-refactor** — Use when implementing a feature or bugfix with non-trivial logic — drive it test-first through the RED → GREEN → REFACTOR cycle instead of writing implementation and backfilling tests.

Tool-specific implementations live alongside this file (see `CLAUDE.md` for the Claude Code implementation). Tools without a native subagent/command surface should treat the sections above as operating instructions.
