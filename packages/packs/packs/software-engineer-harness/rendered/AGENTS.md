# AGENTS.md

<!-- generated from workflow-pack software-engineer-harness v2.0.0 -->
<!-- adapted from affaan-m/ECC (Everything Claude Code) (MIT) — https://github.com/affaan-m/ECC -->

## Engineering discipline

A self-directed engineering loop with a full toolkit: understand before building, test-first, independent review, and verify with real command output before declaring anything done. These are enforced, not just remembered — the post-edit reminder hook, the typecheck gate hook, and the `/tdd-task`, `/tdd`, `/build-and-check`, `/fix-build` commands exist because instruction-following decays across a long session, so lean on them rather than your own recall.

- Understand before building: for any non-trivial change, state the plan (what, where, how verified) before editing code.
- Test-first: write or extend a failing test before the implementation; never mark work done without a green suite you ran yourself.
- Small, reviewable steps: one logical change per commit, with a message that says why.
- Never silently swallow errors; handle them explicitly or let them propagate.
- Scope discipline: touch only what the task requires — no drive-by refactors.
- Every non-trivial change gets an independent review before merge; the reviewer's findings are addressed, not argued away.

## Development workflow

The feature pipeline this harness assumes: research & reuse, plan, TDD, review, commit.

0. **Research & reuse first** (before writing anything new) — search for existing implementations, templates, and patterns in the codebase and in well-known libraries before hand-rolling. Confirm library/API behavior against real docs rather than assumption. Prefer adopting or porting a proven approach that meets the requirement over writing net-new code.
1. **Plan first** — use the `planner` (or `architect` for system-level scope) agent to produce an implementation plan: files to touch, interfaces, dependencies, risks, phases.
2. **TDD** — use the `tdd-guide` agent: write tests first (RED), implement to pass (GREEN), refactor (IMPROVE), verify 80%+ coverage on changed code.
3. **Code review** — use `code-reviewer` immediately after writing code; address CRITICAL and HIGH issues, fix MEDIUM where practical.
4. **Commit & push** — conventional commit format, detailed messages (see Git workflow below).
5. **Pre-review checks** — verify CI is passing, resolve merge conflicts, ensure the branch is current with its target before requesting review.

## Coding style

**Immutability (critical).** Always create new objects; never mutate a value you were handed. `update(original, field, value)` returns a new copy — it never edits `original` in place. Return `{ ...obj, field }` / `map`/`filter` copies, not `push`/`splice`/field assignment on shared state. Locally-scoped accumulators that never escape their function are fine. Rationale: immutable data prevents hidden side effects, makes debugging easier, and enables safe concurrency.

**KISS / DRY / YAGNI.**
- Prefer the simplest solution that actually works; optimize for clarity over cleverness; avoid premature optimization.
- Extract repeated logic into shared functions only when the repetition is real, not speculative — avoid copy-paste drift without inventing abstractions ahead of need.
- Do not build features or abstractions before they're needed; start simple, refactor when the pressure is real.

**File organization.** Many small files over few large ones: 200–400 lines typical, 800 max; high cohesion, low coupling; organize by feature/domain, not by type; extract utilities from large modules.

**Error handling.** Handle errors explicitly at every level. User-friendly messages in UI-facing code; detailed context in server-side logs. Never silently swallow errors.

**Input validation.** Validate all input at system boundaries, schema-based where available. Fail fast with clear messages. Never trust external data — API responses, user input, file content.

**Naming conventions.** `camelCase` for variables/functions; boolean names prefer `is`/`has`/`should`/`can`; `PascalCase` for interfaces, types, and components; `UPPER_SNAKE_CASE` for constants; custom hooks are `camelCase` with a `use` prefix.

**Code smells to flag.** Deep nesting (prefer early returns once conditionals start stacking), magic numbers (name the constant), long functions (split by responsibility, <50 lines), large files (>800 lines — extract modules).

**Code quality checklist before marking work complete:**
- [ ] Code is readable and well-named
- [ ] Functions are small (<50 lines), files focused (<800 lines)
- [ ] No deep nesting (>4 levels)
- [ ] Proper, explicit error handling
- [ ] No hardcoded values (use constants or config)
- [ ] No mutation (immutable patterns used)

## Common patterns

**Skeleton projects.** When implementing genuinely new functionality: search for battle-tested skeleton projects or reference implementations first; evaluate candidates on security, extensibility, and relevance; clone the best match as a foundation and iterate within its proven structure rather than inventing structure from scratch.

**Repository pattern.** Encapsulate data access behind a consistent interface (`findAll`/`findById`/`create`/`update`/`delete`); concrete implementations handle storage details (database, API, file); business logic depends on the abstract interface, not the storage mechanism — this enables swapping data sources and mocking in tests.

**API response envelope.** Use a consistent shape for all responses: a success/status indicator, a nullable data payload, a nullable error message, and pagination metadata (total, page, limit) where relevant. See the API design section below for the full contract.

## Testing

Minimum test coverage target: 80%, across three required types — unit (functions, utilities, components), integration (API endpoints, database operations), and E2E (critical user flows).

**TDD is mandatory** for features and bugfixes: write the failing test (RED) → run it and confirm it fails for the right reason → write the minimal implementation (GREEN) → run it and confirm it passes → refactor with tests staying green → verify coverage. When a test fails, fix the implementation, not the test — unless the test itself is demonstrably wrong.

**Structure: Arrange–Act–Assert**, one behavior per test, with names that describe the behavior under test:

```typescript
test('falls back to substring search when Redis is unavailable', () => {
  // Arrange
  const vector1 = [1, 0, 0]
  // Act
  const similarity = calculateCosineSimilarity(vector1, [0, 1, 0])
  // Assert
  expect(similarity).toBe(0)
})
```

**Edge cases that must be tested:** null/undefined, empty collections, invalid types, boundary values, error paths, race conditions, large inputs, special characters.

**Anti-patterns to avoid:** testing implementation details instead of user-visible behavior, tests that share state, assertions that verify nothing, unmocked external dependencies, brittle CSS-class selectors (prefer semantic/`data-testid` selectors).

## Code review

**Mandatory review triggers:** after writing or modifying code, before any commit to a shared branch, when security-sensitive code changes (auth, payments, user data), when architectural changes are made, before merging a PR.

**Pre-review requirements:** all automated checks (CI/CD) passing, merge conflicts resolved, branch current with its target.

**Severity levels:**

| Level | Meaning | Action |
|-------|---------|--------|
| CRITICAL | Security vulnerability or data-loss risk | **BLOCK** — must fix before merge |
| HIGH | Bug or significant quality issue | **WARN** — should fix before merge |
| MEDIUM | Maintainability concern | **INFO** — consider fixing |
| LOW | Style or minor suggestion | **NOTE** — optional |

**Approval criteria:** approve with zero CRITICAL/HIGH issues; warn (merge with caution) if only HIGH issues remain; block on any CRITICAL issue.

**Review workflow:** run `git diff` to see the actual changes → check the security checklist first → apply the code-quality checklist → run relevant tests → verify coverage ≥80% → apply the 7-category review pass below for anything non-trivial.

**Seven-category review pass** (used by the `code-reviewer` agent and the `/review-change` command): correctness (logic errors, off-by-ones, null handling, edge cases, race conditions), type safety (mismatches, unsafe casts, `any` usage, missing generics), pattern compliance (matches project conventions — naming, structure, error handling, imports), security (injection, auth gaps, secret exposure, SSRF, path traversal, XSS), performance (N+1 queries, missing indexes, unbounded loops, memory leaks, large payloads), completeness (missing tests, missing error handling, incomplete migrations, missing docs), maintainability (dead code, magic numbers, deep nesting, unclear naming, missing types).

For a diff with genuinely zero findings, say so — a clean review is a valid outcome, not a sign the reviewer didn't try hard enough. Never manufacture findings to look thorough.

## Security basics

Before any commit: no hardcoded secrets (API keys, passwords, tokens — use environment variables or a secret manager, validated present at startup); all user input validated at the boundary; parameterized queries (SQL injection); sanitized HTML (XSS); CSRF protection where relevant; authentication/authorization verified; rate limiting on public endpoints; error messages that never leak sensitive data (stack traces, SQL errors, internal paths).

If a security issue is found: stop immediately, fix CRITICAL issues before continuing, rotate any exposed secrets, then sweep the codebase for the same pattern. For a full security pass — OWASP Top 10, dependency CVEs, auth/authz deep review — install the dedicated `security-review` pack; this harness only carries the always-on baseline above.

## Git workflow

**Commit format:** `<type>: <description>`, optional body. Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`.

**Pull requests:** analyze the full branch diff (`git diff <base-branch>...HEAD`), not just the latest commit; draft a comprehensive summary with a test plan; push with `-u` on a new branch.

## Performance (of the work itself)

**Model selection:** route lightweight, high-frequency, or worker-style subagent work to a smaller/faster model; reserve the deepest-reasoning model for architectural decisions, maximum-reasoning research, and hard debugging; use the mid-tier model for main development work and orchestrating multi-agent workflows.

**Context window management:** avoid the last 20% of the context window for large-scale refactoring, multi-file feature implementation, or debugging complex interactions — those are exactly the tasks where running out of room mid-task is most costly. Single-file edits, independent utility creation, docs updates, and simple bug fixes tolerate a fuller window.

**Extended thinking:** for genuinely hard reasoning, make sure extended thinking is enabled, use a structured planning mode, run multiple critique rounds, and use split-role subagents for diverse perspectives rather than one pass from one angle.

**Build troubleshooting:** if the build fails, use the `build-error-resolver` agent — analyze errors, fix incrementally, verify after each fix, never silence an error by weakening lint/typecheck config.

## API design (REST)

Resources are nouns, plural, lowercase, kebab-case: `GET /api/v1/users`, `POST /api/v1/users/:id/orders`. No verbs in the URL (`/getUsers` is wrong); use HTTP methods for the verb. Sub-resources express ownership (`/users/:id/orders`); actions that don't map to CRUD are sparing exceptions (`POST /orders/:id/cancel`).

**Status codes, used semantically, not just 200/500 for everything:** 200 (GET/PUT/PATCH with body), 201 (POST, include `Location` header), 204 (DELETE/PUT, no body), 400 (validation/malformed JSON), 401 (missing/invalid auth), 403 (authenticated but not authorized), 404, 409 (conflict/duplicate), 422 (semantically invalid data), 429 (rate limited, include `Retry-After`), 500 (never expose internal details), 502/503.

**Response envelope:** a `data` payload, `meta`/`links` for paginated collections, and a structured `error` object with `code`/`message`/field-level `details` on failure — see `backend-patterns` for the API response format pattern shared across this pack.

**Pagination:** offset-based (`?page=2&per_page=20`) is simple but slow on large offsets and inconsistent under concurrent inserts — fine for admin dashboards and small datasets. Cursor-based (`?cursor=...&limit=20`) has consistent performance and stability under concurrent writes but can't jump to an arbitrary page — default for public APIs, infinite scroll, and large datasets.

**Filtering/sorting:** simple equality (`?status=active`), bracket-notation comparisons (`?price[gte]=10`), comma-separated multi-values, `-field` prefix for descending sort, comma-separated multi-field sort.

**Versioning:** URL path versioning (`/api/v1/`) is the default recommendation — explicit, cacheable, easy to route. Don't version until you need to; maintain at most 2 active versions; give public APIs 6 months' deprecation notice with a `Sunset` header before returning 410. Additive changes (new fields, new optional params, new endpoints) don't need a new version; removing/renaming fields, changing types, or changing auth do.

**Rate limiting:** communicate via `X-RateLimit-Limit`/`X-RateLimit-Remaining`/`X-RateLimit-Reset` headers and a `429` with `Retry-After` when exceeded. See `backend-patterns` for why the limiter itself must be backed by a shared store, not per-process memory.

Full endpoint checklist, response-envelope code samples (TypeScript/Python/Go), and the resource-naming reference live in the `api-design` skill.

## Deployment & Docker

**Deployment strategies:** rolling (default — gradual instance replacement, zero downtime, requires backward-compatible changes mid-rollout), blue-green (two full environments, instant rollback, 2x infra cost during deploy), canary (small traffic percentage to the new version first, catches issues before full rollout, needs traffic-splitting infra).

**Docker basics:** multi-stage builds to minimize image size, pinned version tags (never `:latest`), run as non-root, `.dockerignore` for `node_modules`/`.git`/`.env`/`dist`, a `HEALTHCHECK` instruction, secrets via env vars or a secrets manager (never baked into an image layer).

**Health checks:** a lightweight `/health` endpoint for liveness; a `/health/detailed` endpoint that checks dependencies (database, cache, external APIs) and returns 503 when degraded, for readiness probes and internal monitoring.

**Production readiness, before any deploy:** all tests pass; no hardcoded secrets; structured logging with no PII; Docker image builds reproducibly; env vars documented and validated at startup (fail fast on bad config); resource limits set; SSL/TLS everywhere; dependencies scanned for CVEs; CORS scoped to allowed origins; rate limiting enabled; rollback plan documented and tested.

Full Dockerfiles (Node/Go/Python), docker-compose stacks, CI/CD pipeline YAML, and the rollback-strategy reference live in the `deployment-patterns` and `docker-patterns` skills.

## Backend patterns

**Layering:** repository (data access behind a consistent interface) → service (business logic, orchestrates repositories) → controller/handler (HTTP concerns only) → middleware (cross-cutting: auth, logging, rate limiting) as a request-processing pipeline.

**N+1 prevention:** never fetch related data in a loop — batch-fetch by collected IDs and join in memory, or use a database JOIN. Select only the columns you need, not `SELECT *`.

**Caching:** cache-aside is the default pattern — check cache, on miss fetch from the source of truth and populate the cache with a TTL, explicitly invalidate on write.

**Error handling:** a centralized error handler that maps a typed `ApiError` (with a `statusCode`) and schema-validation errors to the right HTTP status and a safe, non-leaking message; log full detail server-side, return only what's safe to the client. Wrap flaky external calls in retry-with-exponential-backoff rather than failing on the first transient error.

**Auth:** verify tokens centrally (`requireAuth`), then layer role/permission checks (`requirePermission`) as composable middleware/HOFs rather than inline `if` checks scattered through handlers.

**Rate limiting must use a shared store** (Redis, a gateway, or the platform's native limiter) — never a per-process in-memory counter, which resets on deploy, splits across replicas, and fails open under serverless/multi-instance deployment.

Full code patterns (repository/service/middleware implementations, JWT validation, RBAC, background job queues, structured logging) live in the `backend-patterns` skill.

## Harness capabilities

- tasks · repo · ledger — provisioned
- system-map · repo · analyze — provisioned

### Tasks

On session start, read `.baselane/tasks/progress.md` before `PLAN.md` — trust the ledger and `git log` over memory. Use `/plan-work` to draft or refresh `PLAN.md`, and append to the ledger after each completed step.

### System map

`ARCHITECTURE.md` carries a generated, baselane-managed system map — languages, layout, commands, import-graph hotspots, and measured conventions including hidden rules (consistent but unenforced). Read its conventions section before writing code, and regenerate with `baselane map .` (or `/map regenerate`) after structural changes.

## Workflow pack: Software engineer harness

The flagship general-engineering harness: a self-directed plan/TDD/review/verify loop plus the full discipline, agent, skill, and hook toolkit absorbed from Everything Claude Code (ECC) — coding style, testing, API/backend/deployment/Docker patterns, silent-failure and dead-code hunting, build-fix, ADRs, and codebase onboarding.

### Roles

- **planner** — Turns a feature request or bug report into a concrete implementation plan: files to touch, interfaces, test cases, and step order. Use before starting any non-trivial change.
- **reviewer** — Reviews a completed change against its requirements and code quality standards. Use after implementation, before merge or done.
- **checker** — Independently re-runs the build, test suite, and typecheck and reports raw results. Use before declaring any task complete.
- **architect** — Evaluates system-level design and trade-offs for larger or cross-cutting changes: patterns, scalability, maintainability. Use before designing a new subsystem or a refactor that spans multiple components.
- **code-reviewer** — Deep-dives a diff for security, quality, and framework-specific issues with confidence-based filtering — only reports findings it can back with an exact line and failure mode. Use as a stricter second pass alongside the reviewer role, especially on security-sensitive or framework-heavy changes.
- **code-simplifier** — Simplifies recently-changed code for clarity and consistency while preserving behavior exactly — extracts nested logic, removes dead code, unwinds over-abstraction. Use after a change works and is reviewed, before final merge.
- **tdd-guide** — Test-Driven Development specialist enforcing write-tests-first. Use proactively when writing new features, fixing bugs, or refactoring; guides the Red-Green-Refactor cycle and hunts untested edge cases.
- **silent-failure-hunter** — Reviews code for silent failures: swallowed errors, empty catch blocks, dangerous fallbacks, and missing error propagation. Use after writing error-handling code or when a bug 'can't be reproduced'.
- **build-error-resolver** — Build and type-error resolution specialist. Use when the build or typecheck fails: fixes errors with minimal diffs only — no refactoring, no architecture changes.
- **refactor-cleaner** — Dead-code cleanup and consolidation specialist. Use for removing unused code, duplicate implementations, and unused dependencies — conservatively, with tests green after every batch.
- **code-explorer** — Deeply analyzes existing codebase features by tracing execution paths, mapping architecture layers, and documenting dependencies to inform new development. Use before starting work in an unfamiliar area of the codebase.
- **performance-optimizer** — Performance analysis and optimization specialist. Use proactively for identifying bottlenecks, optimizing slow code, reducing bundle sizes, and improving runtime performance — profiling, memory leaks, render optimization, algorithmic improvements.
- **pr-test-analyzer** — Reviews pull request test coverage quality and completeness, with emphasis on behavioral coverage and real bug prevention. Use alongside the reviewer role when a change's test adequacy is in question.

### Commands

- **/plan-change** `[task description]` — Produce an implementation plan for a change before touching code.
  - How it runs: Invoke the planner subagent for: $ARGUMENTS. Present the returned plan and wait for approval before implementing.
- **/tdd-task** `[task]` — Implement a planned task test-first with the red-green-refactor loop and independent verification.
  - How it runs: For $ARGUMENTS, follow the 6-step red-green-refactor loop: (1) write a failing test; (2) run it and watch it fail for the right reason; (3) write the minimal code to pass; (4) run it and watch it pass; (5) refactor while green; (6) re-run the full suite. Keep line coverage at or above 80%. Then invoke the checker subagent to independently verify, and only then report done.
- **/review-change** `[base ref]` — Get an independent review of the current change before merging.
  - How it runs: Invoke the reviewer subagent on the diff since $ARGUMENTS. If it returns Critical or Important findings, fix them and request re-review. Do not merge with open Critical or Important findings.
- **/build-and-check** `[target]` — Run the build/verify loop until the suite is green or a retry budget is exhausted.
  - How it runs: Build or apply the pending change for $ARGUMENTS, then invoke the checker subagent to verify. If it fails, fix and repeat, up to 3 rounds; stop and report if still red after 3 rounds.
- **/tdd** `[feature or bug description]` — Drive the current feature or bugfix test-first with the tdd-guide agent.
  - How it runs: Invoke the tdd-guide subagent for: $ARGUMENTS. It enforces the Red-Green-Refactor cycle — failing test first, minimal implementation, refactor with tests green — and pushes for edge-case coverage (null/empty/invalid input, boundaries, error paths). Do not write implementation code before the failing test exists.
- **/hunt-silent-failures** `[path or base ref]` — Sweep the current change for swallowed errors, empty catches, and dangerous fallbacks.
  - How it runs: Invoke the silent-failure-hunter subagent on $ARGUMENTS (or the current diff if no target is given). It reports empty catch blocks, errors converted to defaults without context, lost stack traces, and unhandled async/network/database error paths — each with file:line, severity, impact, and a concrete fix. Address every Critical finding before merging.
- **/fix-build** `[build command]` — Get a failing build or typecheck green with minimal diffs via the build-error-resolver agent.
  - How it runs: Invoke the build-error-resolver subagent. Run $ARGUMENTS (or the project's typecheck/build commands) to collect all errors, then fix them with minimal diffs only — no refactoring, no architecture changes, never silencing errors by weakening lint/typecheck config. Verify the build exits 0 before finishing.
- **/feature-dev** `[feature request]` — Guided feature development: explore the existing codebase, design, implement, and review — before writing new code.
  - How it runs: Run a structured feature-development workflow for: $ARGUMENTS. (1) Discovery: restate requirements, constraints, and acceptance criteria; ask clarifying questions if ambiguous. (2) Codebase exploration: invoke the code-explorer subagent to trace execution paths and architecture layers for the relevant area. (3) Present exploration findings and ask targeted design/edge-case questions; wait for the user's answers. (4) Architecture: invoke the architect subagent (or planner for a single-file-scoped change) for the implementation blueprint; wait for approval before implementing. (5) Implement test-first per the tdd-guide workflow, keeping commits small and focused. (6) Quality review: invoke the code-reviewer subagent; address Critical and Important findings; verify test coverage. (7) Summarize what was built, follow-up items or limitations, and how to test it.

### Guardrails

- Nudge: after any file edit, remind about the test-first and build/verify discipline.
- ECC config-protection: remind before edits that linter/formatter/typecheck configs must not be weakened to silence errors.
- ECC typecheck gate: after an edit, run the TypeScript compiler when the project has one.
- ECC session-discipline reminder at the end of a turn: tests green and no secrets staged before calling work done.

### Skills

- **tdd-red-green-refactor** — Use when implementing a feature or bugfix with non-trivial logic — drive it test-first through the RED → GREEN → REFACTOR cycle instead of writing implementation and backfilling tests.
- **tdd-workflow** — Use when writing new features, fixing bugs, or refactoring code. Enforces test-driven development with 80%+ coverage including unit, integration, and E2E tests, including how to detect the project's actual test runner and how to hand off from a *.plan.md implementation plan.
- **api-design** — REST API design patterns including resource naming, status codes, pagination, filtering, error responses, versioning, and rate limiting for production APIs.
- **backend-patterns** — Backend architecture patterns, API design, database optimization, and server-side best practices for Node.js, Express, and Next.js API routes.
- **deployment-patterns** — Deployment workflows, CI/CD pipeline patterns, Docker containerization, health checks, rollback strategies, and production readiness checklists for web applications.
- **docker-patterns** — Docker and Docker Compose patterns for local development, container security, networking, volume strategies, and multi-service orchestration.
- **e2e-testing** — Playwright E2E testing patterns, Page Object Model, configuration, CI/CD integration, artifact management, and flaky test strategies.
- **codebase-onboarding** — Analyze an unfamiliar codebase and generate a structured onboarding guide with architecture map, key entry points, conventions, and a starter CLAUDE.md. Use when joining a new project or setting up this harness for the first time in a repo.
- **architecture-decision-records** — Capture architectural decisions made during a session as structured ADRs. Detects decision moments, records context, alternatives considered, and rationale. Maintains an ADR log so future developers understand why the codebase is shaped the way it is.

Tool-specific implementations live alongside this file (see `CLAUDE.md` for the Claude Code implementation). Tools without a native subagent/command surface should treat the sections above as operating instructions.
