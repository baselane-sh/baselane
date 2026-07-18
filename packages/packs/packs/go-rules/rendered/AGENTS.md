# AGENTS.md

<!-- generated from workflow-pack go-rules v1.3.0 -->
<!-- adapted from affaan-m/ECC (MIT) — https://github.com/affaan-m/ECC -->

## Go conventions (beyond what the linter enforces)

`gofmt`, `goimports`, and `go vet` already catch formatting and the obvious mistakes — this pack is the judgment they can't encode. Keep the mechanical checks in CI (`gofmt -l .`, `go vet ./...`, `go test -race ./...`, `gosec ./...`); the reviewer covers the rest.

### API shape

- Accept interfaces, return structs. Define an interface where it is consumed (1-3 methods), never next to the implementation.
- Use functional options (`type Option func(*Server)`) for constructors with many optional parameters, not a giant config struct or a long positional list.
- Inject dependencies through constructors (`NewUserService(repo, logger)`), never package-level globals.

### Errors

- Wrap every propagated error with context and `%w` (`fmt.Errorf("create user: %w", err)`). A bare returned `err` with no origin is a defect, not a shortcut.

### Concurrency

- Thread `context.Context` through call chains for cancellation and timeout (`ctx, cancel := context.WithTimeout(ctx, 5*time.Second)`; `defer cancel()`).
- Every piece of shared state has an explicit owner — a mutex or a channel — or a comment proving why it is safe. "Probably fine" is a race.

### Boundaries

- Validate external input at the boundary before it reaches business logic; fail fast with a clear message.
- Read required secrets from the environment and `log.Fatal` on an empty value at startup — never a silent zero value.

### Flag in review (a linter won't)

- A propagated error with no `%w` and no context string.
- An interface defined beside its implementation instead of its consumer.
- Shared state touched by multiple goroutines with no mutex/channel and no safety comment.
- A required env var read without an empty-check before use.

## Workflow pack: Go rules

Go conventions a linter can't check — interfaces accepted not returned, errors wrapped with context, functional options, owned shared state — with a reviewer and a gofmt guard; formatting, vet, and races belong in CI.

### Roles

- **go-reviewer** — Reviews changed Go against the Go standards: interfaces, wrapped errors, context threading, race safety, and env-var secrets. Reports file:line + severity. Use after any Go change.

### Commands

- **/go-review** `[base ref]` — Run the Go reviewer over the current change against this pack's Go standards.
  - How it runs: Invoke the go-reviewer subagent on the changed Go files (the diff since $ARGUMENTS, or the working tree if no ref is given). It checks this pack's conventions — consumer-defined interfaces, errors wrapped with %w and context, functional options, context threading, explicitly owned shared state, boundary validation, and fail-fast env-var secrets — and reports file:line + severity. Formatting, go vet, and races are CI's job; don't re-litigate them. Fix any Critical or Important findings before merging.

### Guardrails

- After an edit, check Go formatting with gofmt when it is installed.

Tool-specific implementations live alongside this file (see `CLAUDE.md` for the Claude Code implementation). Tools without a native subagent/command surface should treat the sections above as operating instructions.
