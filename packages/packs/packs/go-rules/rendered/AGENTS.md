# AGENTS.md

<!-- generated from workflow-pack go-rules v2.0.0 -->
<!-- adapted from affaan-m/ECC (MIT) — https://github.com/affaan-m/ECC -->

## Go conventions (beyond what the linter enforces)

`gofmt`, `goimports`, and `go vet` already catch formatting and the obvious mistakes — this is the judgment they can't encode: API shape, error handling, concurrency safety, interface design, package organization, and the anti-patterns a linter waves through. Keep the mechanical checks in CI (`gofmt -l .`, `go vet ./...`, `go test -race ./...`, `gosec ./...`); the reviewer and skills below cover the rest.

### Formatting & tooling

- `gofmt` and `goimports` are mandatory — no style debates.
- Recommended `.golangci.yml`:

```yaml
linters:
  enable:
    - errcheck
    - gosimple
    - govet
    - ineffassign
    - staticcheck
    - unused
    - gofmt
    - goimports
    - misspell
    - unconvert
    - unparam

linters-settings:
  errcheck:
    check-type-assertions: true
  govet:
    enable:
      - shadow

issues:
  exclude-use-default: false
```

### API shape

- Accept interfaces, return structs. Define an interface where it is consumed (1-3 methods), never next to the implementation.
- Use functional options (`type Option func(*Server)`) for constructors with many optional parameters, not a giant config struct or a long positional list.
- Inject dependencies through constructors (`NewUserService(repo, logger)`), never package-level globals.
- Make the zero value useful — design types so their zero value is immediately usable without initialization (e.g. `bytes.Buffer`, a mutex-guarded counter).
- Context is always the first parameter, never a struct field: `func ProcessRequest(ctx context.Context, id string) error`.

```go
// Functional options
type Option func(*Server)

func WithTimeout(d time.Duration) Option {
    return func(s *Server) { s.timeout = d }
}

func NewServer(addr string, opts ...Option) *Server {
    s := &Server{addr: addr, timeout: 30 * time.Second}
    for _, opt := range opts {
        opt(s)
    }
    return s
}
```

```go
// Consumer-defined interface, not provider-defined
package service

type UserStore interface {
    GetUser(id string) (*User, error)
    SaveUser(user *User) error
}

type Service struct{ store UserStore }
```

### Errors

- Wrap every propagated error with context and `%w` (`fmt.Errorf("create user: %w", err)`). A bare returned `err` with no origin is a defect, not a shortcut.
- Never discard an error with `_` unless it is truly best-effort and the reason is commented (`_ = writer.Close() // best-effort cleanup, error logged elsewhere`).
- Use `errors.Is`/`errors.As` to check sentinel/typed errors, not `==` or type assertions.
- Define sentinel errors (`var ErrNotFound = errors.New(...)`) or custom error types for domain-specific failures the caller needs to branch on.
- Never `panic` for a recoverable error — return it.

```go
func LoadConfig(path string) (*Config, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("load config %s: %w", path, err)
    }
    var cfg Config
    if err := json.Unmarshal(data, &cfg); err != nil {
        return nil, fmt.Errorf("parse config %s: %w", path, err)
    }
    return &cfg, nil
}

func HandleError(err error) {
    if errors.Is(err, sql.ErrNoRows) {
        log.Println("no records found")
        return
    }
    var validationErr *ValidationError
    if errors.As(err, &validationErr) {
        log.Printf("validation error on %s: %s", validationErr.Field, validationErr.Message)
        return
    }
    log.Printf("unexpected error: %v", err)
}
```

### Concurrency

- Thread `context.Context` through call chains for cancellation and timeout (`ctx, cancel := context.WithTimeout(ctx, 5*time.Second)`; `defer cancel()`).
- Every piece of shared state has an explicit owner — a mutex or a channel — or a comment proving why it is safe. "Probably fine" is a race.
- Always `defer mu.Unlock()` immediately after `mu.Lock()`; never leave an unlock path implicit.
- Coordinate goroutines with `sync.WaitGroup` or `golang.org/x/sync/errgroup`; a bare `go func(){...}()` with no join point is a leak waiting to happen.
- A goroutine that sends on an unbuffered channel with no guaranteed receiver blocks forever if the reader gives up — buffer the channel or `select` on `ctx.Done()`.

```go
func WorkerPool(jobs <-chan Job, results chan<- Result, numWorkers int) {
    var wg sync.WaitGroup
    for i := 0; i < numWorkers; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for job := range jobs {
                results <- process(job)
            }
        }()
    }
    wg.Wait()
    close(results)
}

// Good: handles cancellation instead of leaking
func safeFetch(ctx context.Context, url string) <-chan []byte {
    ch := make(chan []byte, 1)
    go func() {
        data, err := fetch(url)
        if err != nil {
            return
        }
        select {
        case ch <- data:
        case <-ctx.Done():
        }
    }()
    return ch
}
```

```go
import "golang.org/x/sync/errgroup"

func FetchAll(ctx context.Context, urls []string) ([][]byte, error) {
    g, ctx := errgroup.WithContext(ctx)
    results := make([][]byte, len(urls))
    for i, url := range urls {
        i, url := i, url // capture loop variables
        g.Go(func() error {
            data, err := FetchWithTimeout(ctx, url)
            if err != nil {
                return err
            }
            results[i] = data
            return nil
        })
    }
    if err := g.Wait(); err != nil {
        return nil, err
    }
    return results, nil
}
```

### Interface design

- Keep interfaces small (1-3 methods) and compose them (`ReadWriteCloser` from `Reader`+`Writer`+`Closer`), rather than one large interface.
- Define the interface in the consumer's package, not the provider's — the implementation doesn't need to know the interface exists.
- Optional behavior can be probed with a type assertion (`if f, ok := w.(Flusher); ok { ... }`) instead of a bloated required interface.

### Package organization

- Standard layout: `cmd/<app>/main.go` (entry point), `internal/` (handler/service/repository/config), `pkg/` (public client), `api/` (proto/OpenAPI), `testdata/`.
- Package names: short, lowercase, no underscores, no redundant suffix (`user`, not `userService`).
- Avoid package-level mutable state (`var db *sql.DB` + `init()`) — inject dependencies through a constructor instead.
- Prefer embedding for composition (`type Server struct { *Logger; addr string }`) over duplicating methods.

### Memory & performance

- Preallocate slices when the size is known: `make([]T, 0, len(items))` instead of an unbounded `append` loop.
- Use `strings.Builder` (or `strings.Join`) instead of `+=` string concatenation in a loop.
- Use `sync.Pool` for frequently allocated short-lived buffers in hot paths.
- Avoid unnecessary allocations in hot paths; N+1 query patterns and per-item deferred calls in a loop are red flags too.

### Boundaries & secrets

- Validate external input at the boundary before it reaches business logic; fail fast with a clear message.
- Read required secrets from the environment and `log.Fatal` on an empty value at startup — never a silent zero value.

```go
apiKey := os.Getenv("OPENAI_API_KEY")
if apiKey == "" {
    log.Fatal("OPENAI_API_KEY not configured")
}
```

### Security (flag in review — a linter won't catch these)

- SQL injection: string concatenation in `database/sql` queries instead of parameterized placeholders.
- Command injection: unvalidated input passed into `os/exec`.
- Path traversal: user-controlled file paths used without `filepath.Clean` + a prefix check.
- `unsafe` package usage without justification.
- Hardcoded secrets (API keys, passwords) in source.
- Insecure TLS (`InsecureSkipVerify: true`).
- Run `gosec ./...` for static security analysis in CI.

### Anti-patterns to flag in review (a linter won't)

- A propagated error with no `%w` and no context string, or an error discarded with `_`.
- `panic` used for a recoverable error instead of an error return.
- An interface defined beside its implementation instead of its consumer.
- Shared state touched by multiple goroutines with no mutex/channel and no safety comment.
- A required env var read without an empty-check before use.
- Naked returns in long functions, mixed value/pointer receivers on the same type, `context.Context` stored in a struct field instead of passed as the first parameter.
- Functions over ~50 lines or nested more than 4 levels deep — prefer early return over `if/else` chains.

### Testing & tooling

- Standard `go test` with **table-driven tests**; always run `go test -race ./...` and check coverage with `go test -cover ./...`. See skill `golang-testing` for the full pattern set (TDD workflow, subtests, benchmarks, fuzzing, golden files, HTTP handler tests).

```bash
go build ./...
go vet ./...
staticcheck ./...
golangci-lint run
go test -race ./...
go test -cover ./...
gofmt -l .
goimports -l .
go mod tidy
go mod verify
```

### Quick reference: Go idioms

| Idiom | Description |
|-------|-------------|
| Accept interfaces, return structs | Functions accept interface params, return concrete types |
| Errors are values | Treat errors as first-class values, not exceptions |
| Don't communicate by sharing memory | Use channels for coordination between goroutines |
| Make the zero value useful | Types should work without explicit initialization |
| A little copying is better than a little dependency | Avoid unnecessary external dependencies |
| Clear is better than clever | Prioritize readability over cleverness |
| gofmt is no one's favorite but everyone's friend | Always format with gofmt/goimports |
| Return early | Handle errors first, keep happy path unindented |

See skills `golang-patterns` (comprehensive idioms, concurrency, package organization) and `golang-testing` (TDD workflow, table-driven tests, benchmarks, fuzzing) for full worked examples.

## Workflow pack: Go rules

Comprehensive Go conventions, reviewer, build-error resolver, and skills covering API shape, errors, concurrency, interfaces, package layout, security, and testing — mechanical checks (gofmt/vet/race) stay in CI.

### Roles

- **go-reviewer** — Expert Go code reviewer specializing in idiomatic Go, concurrency patterns, error handling, and security. Reports file:line + severity across CRITICAL/HIGH/MEDIUM categories. Use for all Go code changes.
- **go-build-resolver** — Go build, vet, and compilation error resolution specialist. Fixes build errors, go vet issues, and linter warnings with minimal, surgical changes. Use when Go builds fail.

### Commands

- **/go-review** `[base ref]` — Run the Go reviewer over the current change against this pack's Go standards.
  - How it runs: Invoke the go-reviewer subagent on the changed Go files (the diff since $ARGUMENTS, or the working tree if no ref is given). It checks this pack's conventions -- consumer-defined interfaces, errors wrapped with %w and context, functional options, context threading, explicitly owned shared state, boundary validation, and fail-fast env-var secrets -- plus the security/concurrency/quality priorities in its CRITICAL/HIGH/MEDIUM rubric, and reports file:line + severity. Formatting itself (gofmt) is CI's job; don't re-litigate it. Fix any Critical or High findings before merging.
- **/go-build** `(no arguments)` — Fix Go build errors, go vet warnings, and linter issues incrementally with minimal, surgical changes.
  - How it runs: Invoke the go-build-resolver subagent to incrementally fix Go build errors, go vet warnings, and linter issues with minimal, surgical changes. It runs go build/go vet/staticcheck/golangci-lint/go mod verify in order, fixes one error at a time, and re-verifies after each change. It will not refactor beyond the fix or change function signatures unless necessary, and stops to report if the same error persists after 3 attempts or the fix requires an architectural change. Run /go-review after the build is green.
- **/go-test** `<what to build>` — Enforce TDD workflow for Go: write table-driven tests first, then implement. Verify 80%+ coverage with go test -cover.
  - How it runs: Invoke the go-reviewer subagent to drive a TDD session for $ARGUMENTS: scaffold the function/interface signature first, write comprehensive table-driven tests (RED), verify they fail for the right reason, implement the minimal code to pass (GREEN), then refactor while keeping tests green (REFACTOR). Use go test -race ./... and go test -cover ./... to verify; target 80%+ coverage on general code and 100% on critical business logic. Use /go-build first if the package doesn't compile yet.

### Guardrails

- After an edit, check Go formatting with gofmt when it is installed.
- After an edit in a Go module, run gofmt and go vet and flag any issues.

### Skills

- **golang-patterns** — Idiomatic Go patterns, best practices, and conventions for building robust, efficient, and maintainable Go applications — API shape, error handling, concurrency, interface design, package organization, and performance. Use when writing, reviewing, or refactoring Go code, or designing Go packages/modules.
- **golang-testing** — Go testing patterns including TDD workflow, table-driven tests, subtests, benchmarks, fuzzing, golden files, HTTP handler testing, mocking with interfaces, and coverage targets. Use when writing new Go functions, adding test coverage, creating benchmarks, or following TDD in a Go project.

Tool-specific implementations live alongside this file (see `CLAUDE.md` for the Claude Code implementation). Tools without a native subagent/command surface should treat the sections above as operating instructions.
