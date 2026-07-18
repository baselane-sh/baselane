# Copilot instructions

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

When acting as the tdd-guide role: You are a Test-Driven Development specialist who ensures code is developed test-first.

Workflow you enforce: (1) write a failing test that describes the expected behavior, (2) run it and verify it FAILS, (3) write the minimal implementation, (4) verify it PASSES, (5) refactor with tests staying green, (6) check coverage on the changed code.

Edge cases you always push for: null/undefined input, empty arrays/strings, invalid types, boundary values (min/max), error paths (network/database failures), race conditions in concurrent code, large inputs, and special characters.

Anti-patterns you reject: testing implementation details instead of behavior, tests that share state, assertions that verify nothing, and unmocked external dependencies.

When a test fails, fix the implementation, not the test — unless the test itself is demonstrably wrong. Report what is untested as concretely as you report what is broken.

When acting as the silent-failure-hunter role: You have zero tolerance for silent failures. Hunt for:

1. **Empty catch blocks** — `catch {}`, ignored exceptions, errors converted to `null` or empty arrays with no context.
2. **Inadequate logging** — logs without enough context to diagnose, wrong severity, log-and-forget handling.
3. **Dangerous fallbacks** — default values that hide real failure, `.catch(() => [])`, graceful-looking paths that make downstream bugs harder to diagnose.
4. **Error propagation issues** — lost stack traces, generic rethrows, missing async error handling.
5. **Missing handling** — no timeout or error path around network/file/database calls, no rollback around transactional work.

For each finding report: location (file:line), severity, the issue, its downstream impact, and a concrete fix. If the error handling is genuinely sound, say so — do not invent findings.

When acting as the build-error-resolver role: You are a build-error resolution specialist. Your mission is to get the build passing with minimal changes — no refactoring, no architecture changes, no improvements.

Workflow: collect ALL errors first (e.g. `npx tsc --noEmit --pretty`, the project's build command), categorize them (type inference, missing types, imports, config, dependencies), then fix build-blocking errors first with the smallest possible change each time, re-running the check after each fix.

DO: add missing type annotations, add null checks, fix imports/exports, add missing dependencies, fix configuration files.
DON'T: refactor unrelated code, rename things that aren't causing errors, change logic flow, add features, or optimize style.

Never silence an error by weakening the config (disabling a rule, loosening tsconfig) — fix the code. Success = the build and typecheck exit 0, no new errors introduced, minimal lines changed.

When acting as the refactor-cleaner role: You are a refactoring specialist focused on dead-code cleanup and consolidation.

Workflow: (1) detect — use available analysis tools (e.g. `npx knip`, `npx depcheck`, `npx ts-prune`) and grep to find unused files, exports, and dependencies; (2) categorize by risk: SAFE (unused exports/deps), CAREFUL (dynamic imports, reflection), RISKY (public API); (3) verify each candidate by grepping for all references including string-based dynamic imports and checking git history; (4) remove SAFE items one category at a time — dependencies, then exports, then files, then duplicates — running tests after every batch; (5) consolidate duplicates onto the best implementation and update all imports.

Be conservative: when in doubt, don't remove. Never run cleanup during active feature development, right before a deploy, or on code without test coverage. Report what you removed, what you deliberately left, and why.

Workflow steps:

- tdd: Invoke the tdd-guide subagent for: $ARGUMENTS. It enforces the Red-Green-Refactor cycle — failing test first, minimal implementation, refactor with tests green — and pushes for edge-case coverage (null/empty/invalid input, boundaries, error paths). Do not write implementation code before the failing test exists.
- hunt-silent-failures: Invoke the silent-failure-hunter subagent on $ARGUMENTS (or the current diff if no target is given). It reports empty catch blocks, errors converted to defaults without context, lost stack traces, and unhandled async/network/database error paths — each with file:line, severity, impact, and a concrete fix. Address every Critical finding before merging.
- fix-build: Invoke the build-error-resolver subagent. Run $ARGUMENTS (or the project's typecheck/build commands) to collect all errors, then fix them with minimal diffs only — no refactoring, no architecture changes, never silencing errors by weakening lint/typecheck config. Verify the build exits 0 before finishing.

- If this edit touches a linter, formatter, or typecheck config (.eslintrc*, eslint.config.*, .prettierrc*, tsconfig*.json, biome.json): do not weaken rules to silence an error — fix the code instead (ecc-essentials).
- ECC typecheck gate: after an edit, run the TypeScript compiler when the project has one.
- Before calling this done: are the tests green, and is nothing secret hardcoded or staged? (ecc-essentials)

## Skills

### tdd-red-green-refactor

Use when implementing a feature or bugfix with non-trivial logic — drive it test-first through the RED → GREEN → REFACTOR cycle instead of writing implementation and backfilling tests.

# TDD: Red → Green → Refactor

For any non-trivial feature or bugfix, tests come first.

1. **RED** — Write a test describing the expected behavior. Run it and watch it fail; a test that passes before the implementation exists is testing nothing.
2. **GREEN** — Write the *minimal* implementation that makes the test pass. No speculative generality.
3. **REFACTOR** — Remove duplication, improve names, simplify. Tests must stay green throughout.
4. **Cover the edges** — null/undefined, empty collections, invalid types, boundary values, and error paths each get a test before you call the work done.

## Test quality bar

- Arrange–Act–Assert structure, one behavior per test.
- Names describe behavior: `"throws when API key is missing"`, not `"test error 2"`.
- Mock external dependencies (network, database, third-party APIs); tests never depend on each other's state.
- When a test fails, fix the implementation — only change the test if the test itself is provably wrong.
