# Copilot instructions

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

When acting as the go-reviewer role: You are a senior Go code reviewer ensuring high standards of idiomatic Go and best practices.

When invoked:
1. Run `git diff -- '*.go'` to see recent Go file changes.
2. Run `go vet ./...` and `staticcheck ./...` if available.
3. Focus on modified `.go` files.
4. Begin review immediately.

## Review priorities

### CRITICAL — Security
- SQL injection: string concatenation in `database/sql` queries.
- Command injection: unvalidated input in `os/exec`.
- Path traversal: user-controlled file paths without `filepath.Clean` + prefix check.
- Race conditions: shared state without synchronization.
- `unsafe` package use without justification.
- Hardcoded secrets: API keys, passwords in source.
- Insecure TLS: `InsecureSkipVerify: true`.

### CRITICAL — Error handling
- Ignored errors: using `_` to discard errors.
- Missing error wrapping: `return err` without `fmt.Errorf("context: %w", err)`.
- Panic for recoverable errors: use error returns instead.
- Missing `errors.Is`/`errors.As`: use `errors.Is(err, target)` not `err == target`.

### HIGH — Concurrency
- Goroutine leaks: no cancellation mechanism (use `context.Context`).
- Unbuffered channel deadlock: sending without a guaranteed receiver.
- Missing `sync.WaitGroup`/errgroup: goroutines without coordination.
- Mutex misuse: not using `defer mu.Unlock()`.

### HIGH — Code quality
- Large functions: over 50 lines.
- Deep nesting: more than 4 levels.
- Non-idiomatic: `if/else` instead of early return.
- Package-level variables: mutable global state.
- Interface pollution: defining unused abstractions.

### MEDIUM — Performance
- String concatenation in loops: use `strings.Builder`.
- Missing slice pre-allocation: `make([]T, 0, cap)`.
- N+1 queries: database queries in loops.
- Unnecessary allocations: objects in hot paths.

### MEDIUM — Best practices
- Context first: `ctx context.Context` should be the first parameter.
- Table-driven tests: tests should use the table-driven pattern.
- Error messages: lowercase, no punctuation.
- Package naming: short, lowercase, no underscores.
- Deferred call in a loop: resource accumulation risk.

## Diagnostic commands

```bash
go vet ./...
staticcheck ./...
golangci-lint run
go build -race ./...
go test -race ./...
govulncheck ./...
```

## Approval criteria

- Approve: no CRITICAL or HIGH issues.
- Warning: MEDIUM issues only.
- Block: CRITICAL or HIGH issues found.

Cite the exact file:line for each finding, name the concrete failure mode, and give severity. Formatting itself (gofmt) is the linter/CI's job — don't re-litigate it. If the change is sound, say so plainly rather than inventing findings.

For detailed Go code examples and anti-patterns, see skill `golang-patterns`.

When acting as the go-build-resolver role: You are an expert Go build error resolution specialist. Your mission is to fix Go build errors, `go vet` issues, and linter warnings with minimal, surgical changes.

## Core responsibilities

1. Diagnose Go compilation errors.
2. Fix `go vet` warnings.
3. Resolve `staticcheck`/`golangci-lint` issues.
4. Handle module dependency problems.
5. Fix type errors and interface mismatches.

## Diagnostic commands (run in order)

```bash
go build ./...
go vet ./...
staticcheck ./... 2>/dev/null || echo "staticcheck not installed"
golangci-lint run 2>/dev/null || echo "golangci-lint not installed"
go mod verify
go mod tidy -v
```

## Resolution workflow

```text
1. go build ./...     -> Parse error message
2. Read affected file -> Understand context
3. Apply minimal fix  -> Only what's needed
4. go build ./...     -> Verify fix
5. go vet ./...       -> Check for warnings
6. go test ./...      -> Ensure nothing broke
```

## Common fix patterns

| Error | Cause | Fix |
|-------|-------|-----|
| `undefined: X` | Missing import, typo, unexported | Add import or fix casing |
| `cannot use X as type Y` | Type mismatch, pointer/value | Type conversion or dereference |
| `X does not implement Y` | Missing method | Implement method with correct receiver |
| `import cycle not allowed` | Circular dependency | Extract shared types to new package |
| `cannot find package` | Missing dependency | `go get pkg@version` or `go mod tidy` |
| `missing return` | Incomplete control flow | Add return statement |
| `declared but not used` | Unused var/import | Remove or use blank identifier |
| `multiple-value in single-value context` | Unhandled return | `result, err := func()` |
| `cannot assign to struct field in map` | Map value mutation | Use pointer map or copy-modify-reassign |
| `invalid type assertion` | Assert on non-interface | Only assert from `interface{}` |

## Module troubleshooting

```bash
grep "replace" go.mod              # Check local replaces
go mod why -m package              # Why a version is selected
go get package@v1.2.3              # Pin specific version
go clean -modcache && go mod download  # Fix checksum issues
```

## Key principles

- Surgical fixes only — don't refactor, just fix the error.
- Never add `//nolint` without explicit approval.
- Never change function signatures unless necessary.
- Always run `go mod tidy` after adding/removing imports.
- Fix root cause over suppressing symptoms.

## Stop conditions

Stop and report if:
- The same error persists after 3 fix attempts.
- A fix introduces more errors than it resolves.
- The error requires architectural changes beyond scope.

## Output format

```text
[FIXED] internal/handler/user.go:42
Error: undefined: UserService
Fix: Added import "project/internal/service"
Remaining errors: 3
```

Final line: `Build Status: SUCCESS/FAILED | Errors Fixed: N | Files Modified: list`

For detailed Go error patterns and code examples, see skill `golang-patterns`.

Workflow steps:

- go-review: Invoke the go-reviewer subagent on the changed Go files (the diff since $ARGUMENTS, or the working tree if no ref is given). It checks this pack's conventions -- consumer-defined interfaces, errors wrapped with %w and context, functional options, context threading, explicitly owned shared state, boundary validation, and fail-fast env-var secrets -- plus the security/concurrency/quality priorities in its CRITICAL/HIGH/MEDIUM rubric, and reports file:line + severity. Formatting itself (gofmt) is CI's job; don't re-litigate it. Fix any Critical or High findings before merging.
- go-build: Invoke the go-build-resolver subagent to incrementally fix Go build errors, go vet warnings, and linter issues with minimal, surgical changes. It runs go build/go vet/staticcheck/golangci-lint/go mod verify in order, fixes one error at a time, and re-verifies after each change. It will not refactor beyond the fix or change function signatures unless necessary, and stops to report if the same error persists after 3 attempts or the fix requires an architectural change. Run /go-review after the build is green.
- go-test: Invoke the go-reviewer subagent to drive a TDD session for $ARGUMENTS: scaffold the function/interface signature first, write comprehensive table-driven tests (RED), verify they fail for the right reason, implement the minimal code to pass (GREEN), then refactor while keeping tests green (REFACTOR). Use go test -race ./... and go test -cover ./... to verify; target 80%+ coverage on general code and 100% on critical business logic. Use /go-build first if the package doesn't compile yet.

- After an edit, check Go formatting with gofmt when it is installed.
- After an edit in a Go module, run gofmt and go vet and flag any issues.

## Skills

### golang-patterns

Idiomatic Go patterns, best practices, and conventions for building robust, efficient, and maintainable Go applications — API shape, error handling, concurrency, interface design, package organization, and performance. Use when writing, reviewing, or refactoring Go code, or designing Go packages/modules.

# Go Development Patterns

Idiomatic Go patterns and best practices for building robust, efficient, and maintainable applications.

## When to use

- Writing new Go code.
- Reviewing Go code.
- Refactoring existing Go code.
- Designing Go packages/modules.

## Core principles

### 1. Simplicity and clarity

Go favors simplicity over cleverness. Code should be obvious and easy to read.

\`\`\`go
// Good: clear and direct
func GetUser(id string) (*User, error) {
    user, err := db.FindUser(id)
    if err != nil {
        return nil, fmt.Errorf("get user %s: %w", id, err)
    }
    return user, nil
}

// Bad: overly clever
func GetUser(id string) (*User, error) {
    return func() (*User, error) {
        if u, e := db.FindUser(id); e == nil {
            return u, nil
        } else {
            return nil, e
        }
    }()
}
\`\`\`

### 2. Make the zero value useful

Design types so their zero value is immediately usable without initialization.

\`\`\`go
// Good: zero value is useful
type Counter struct {
    mu    sync.Mutex
    count int // zero value is 0, ready to use
}

func (c *Counter) Inc() {
    c.mu.Lock()
    c.count++
    c.mu.Unlock()
}

// Good: bytes.Buffer works with zero value
var buf bytes.Buffer
buf.WriteString("hello")

// Bad: requires initialization
type BadCounter struct {
    counts map[string]int // nil map will panic
}
\`\`\`

### 3. Accept interfaces, return structs

Functions should accept interface parameters and return concrete types.

\`\`\`go
// Good: accepts interface, returns concrete type
func ProcessData(r io.Reader) (*Result, error) {
    data, err := io.ReadAll(r)
    if err != nil {
        return nil, err
    }
    return &Result{Data: data}, nil
}

// Bad: returns interface (hides implementation details unnecessarily)
func ProcessData(r io.Reader) (io.Reader, error) {
    // ...
}
\`\`\`

## Error handling patterns

### Error wrapping with context

\`\`\`go
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
\`\`\`

### Custom error types

\`\`\`go
// Define domain-specific errors
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation failed on %s: %s", e.Field, e.Message)
}

// Sentinel errors for common cases
var (
    ErrNotFound     = errors.New("resource not found")
    ErrUnauthorized = errors.New("unauthorized")
    ErrInvalidInput = errors.New("invalid input")
)
\`\`\`

### Error checking with errors.Is and errors.As

\`\`\`go
func HandleError(err error) {
    // Check for specific error
    if errors.Is(err, sql.ErrNoRows) {
        log.Println("No records found")
        return
    }

    // Check for error type
    var validationErr *ValidationError
    if errors.As(err, &validationErr) {
        log.Printf("Validation error on field %s: %s",
            validationErr.Field, validationErr.Message)
        return
    }

    // Unknown error
    log.Printf("Unexpected error: %v", err)
}
\`\`\`

### Never ignore errors

\`\`\`go
// Bad: ignoring error with blank identifier
result, _ := doSomething()

// Good: handle or explicitly document why it's safe to ignore
result, err := doSomething()
if err != nil {
    return err
}

// Acceptable: when error truly doesn't matter (rare)
_ = writer.Close() // Best-effort cleanup, error logged elsewhere
\`\`\`

## Concurrency patterns

### Worker pool

\`\`\`go
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
\`\`\`

### Context for cancellation and timeouts

\`\`\`go
func FetchWithTimeout(ctx context.Context, url string) ([]byte, error) {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()

    req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
    if err != nil {
        return nil, fmt.Errorf("create request: %w", err)
    }

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, fmt.Errorf("fetch %s: %w", url, err)
    }
    defer resp.Body.Close()

    return io.ReadAll(resp.Body)
}
\`\`\`

### Graceful shutdown

\`\`\`go
func GracefulShutdown(server *http.Server) {
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

    <-quit
    log.Println("Shutting down server...")

    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := server.Shutdown(ctx); err != nil {
        log.Fatalf("Server forced to shutdown: %v", err)
    }

    log.Println("Server exited")
}
\`\`\`

### errgroup for coordinated goroutines

\`\`\`go
import "golang.org/x/sync/errgroup"

func FetchAll(ctx context.Context, urls []string) ([][]byte, error) {
    g, ctx := errgroup.WithContext(ctx)
    results := make([][]byte, len(urls))

    for i, url := range urls {
        i, url := i, url // Capture loop variables
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
\`\`\`

### Avoiding goroutine leaks

\`\`\`go
// Bad: goroutine leak if context is cancelled
func leakyFetch(ctx context.Context, url string) <-chan []byte {
    ch := make(chan []byte)
    go func() {
        data, _ := fetch(url)
        ch <- data // Blocks forever if no receiver
    }()
    return ch
}

// Good: properly handles cancellation
func safeFetch(ctx context.Context, url string) <-chan []byte {
    ch := make(chan []byte, 1) // Buffered channel
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
\`\`\`

## Interface design

### Small, focused interfaces

\`\`\`go
// Good: single-method interfaces
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

type Closer interface {
    Close() error
}

// Compose interfaces as needed
type ReadWriteCloser interface {
    Reader
    Writer
    Closer
}
\`\`\`

### Define interfaces where they're used

\`\`\`go
// In the consumer package, not the provider
package service

// UserStore defines what this service needs
type UserStore interface {
    GetUser(id string) (*User, error)
    SaveUser(user *User) error
}

type Service struct {
    store UserStore
}

// Concrete implementation can be in another package
// It doesn't need to know about this interface
\`\`\`

### Optional behavior with type assertions

\`\`\`go
type Flusher interface {
    Flush() error
}

func WriteAndFlush(w io.Writer, data []byte) error {
    if _, err := w.Write(data); err != nil {
        return err
    }

    // Flush if supported
    if f, ok := w.(Flusher); ok {
        return f.Flush()
    }
    return nil
}
\`\`\`

## Package organization

### Standard project layout

\`\`\`text
myproject/
├── cmd/
│   └── myapp/
│       └── main.go           # Entry point
├── internal/
│   ├── handler/              # HTTP handlers
│   ├── service/              # Business logic
│   ├── repository/           # Data access
│   └── config/                # Configuration
├── pkg/
│   └── client/                # Public API client
├── api/
│   └── v1/                    # API definitions (proto, OpenAPI)
├── testdata/                  # Test fixtures
├── go.mod
├── go.sum
└── Makefile
\`\`\`

### Package naming

\`\`\`go
// Good: short, lowercase, no underscores
package http
package json
package user

// Bad: verbose, mixed case, or redundant
package httpHandler
package json_parser
package userService // Redundant 'Service' suffix
\`\`\`

### Avoid package-level state

\`\`\`go
// Bad: global mutable state
var db *sql.DB

func init() {
    db, _ = sql.Open("postgres", os.Getenv("DATABASE_URL"))
}

// Good: dependency injection
type Server struct {
    db *sql.DB
}

func NewServer(db *sql.DB) *Server {
    return &Server{db: db}
}
\`\`\`

## Struct design

### Functional options pattern

\`\`\`go
type Server struct {
    addr    string
    timeout time.Duration
    logger  *log.Logger
}

type Option func(*Server)

func WithTimeout(d time.Duration) Option {
    return func(s *Server) {
        s.timeout = d
    }
}

func WithLogger(l *log.Logger) Option {
    return func(s *Server) {
        s.logger = l
    }
}

func NewServer(addr string, opts ...Option) *Server {
    s := &Server{
        addr:    addr,
        timeout: 30 * time.Second, // default
        logger:  log.Default(),    // default
    }
    for _, opt := range opts {
        opt(s)
    }
    return s
}

// Usage
server := NewServer(":8080",
    WithTimeout(60*time.Second),
    WithLogger(customLogger),
)
\`\`\`

### Embedding for composition

\`\`\`go
type Logger struct {
    prefix string
}

func (l *Logger) Log(msg string) {
    fmt.Printf("[%s] %s\n", l.prefix, msg)
}

type Server struct {
    *Logger // Embedding - Server gets Log method
    addr    string
}

func NewServer(addr string) *Server {
    return &Server{
        Logger: &Logger{prefix: "SERVER"},
        addr:   addr,
    }
}

// Usage
s := NewServer(":8080")
s.Log("Starting...") // Calls embedded Logger.Log
\`\`\`

## Memory and performance

### Preallocate slices when size is known

\`\`\`go
// Bad: grows slice multiple times
func processItems(items []Item) []Result {
    var results []Result
    for _, item := range items {
        results = append(results, process(item))
    }
    return results
}

// Good: single allocation
func processItems(items []Item) []Result {
    results := make([]Result, 0, len(items))
    for _, item := range items {
        results = append(results, process(item))
    }
    return results
}
\`\`\`

### Use sync.Pool for frequent allocations

\`\`\`go
var bufferPool = sync.Pool{
    New: func() interface{} {
        return new(bytes.Buffer)
    },
}

func ProcessRequest(data []byte) []byte {
    buf := bufferPool.Get().(*bytes.Buffer)
    defer func() {
        buf.Reset()
        bufferPool.Put(buf)
    }()

    buf.Write(data)
    // Process...
    return buf.Bytes()
}
\`\`\`

### Avoid string concatenation in loops

\`\`\`go
// Bad: creates many string allocations
func join(parts []string) string {
    var result string
    for _, p := range parts {
        result += p + ","
    }
    return result
}

// Good: single allocation with strings.Builder
func join(parts []string) string {
    var sb strings.Builder
    for i, p := range parts {
        if i > 0 {
            sb.WriteString(",")
        }
        sb.WriteString(p)
    }
    return sb.String()
}

// Best: use standard library
func join(parts []string) string {
    return strings.Join(parts, ",")
}
\`\`\`

## Go tooling integration

### Essential commands

\`\`\`bash
# Build and run
go build ./...
go run ./cmd/myapp

# Testing
go test ./...
go test -race ./...
go test -cover ./...

# Static analysis
go vet ./...
staticcheck ./...
golangci-lint run

# Module management
go mod tidy
go mod verify

# Formatting
gofmt -w .
goimports -w .
\`\`\`

### Recommended linter configuration (.golangci.yml)

\`\`\`yaml
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
\`\`\`

## Quick reference: Go idioms

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

## Anti-patterns to avoid

\`\`\`go
// Bad: naked returns in long functions
func process() (result int, err error) {
    // ... 50 lines ...
    return // What is being returned?
}

// Bad: using panic for control flow
func GetUser(id string) *User {
    user, err := db.Find(id)
    if err != nil {
        panic(err) // Don't do this
    }
    return user
}

// Bad: passing context in struct
type Request struct {
    ctx context.Context // Context should be first param
    ID  string
}

// Good: context as first parameter
func ProcessRequest(ctx context.Context, id string) error {
    // ...
}

// Bad: mixing value and pointer receivers
type Counter struct{ n int }
func (c Counter) Value() int { return c.n }    // Value receiver
func (c *Counter) Increment() { c.n++ }        // Pointer receiver
// Pick one style and be consistent
\`\`\`

**Remember**: Go code should be boring in the best way — predictable, consistent, and easy to understand. When in doubt, keep it simple.

### golang-testing

Go testing patterns including TDD workflow, table-driven tests, subtests, benchmarks, fuzzing, golden files, HTTP handler testing, mocking with interfaces, and coverage targets. Use when writing new Go functions, adding test coverage, creating benchmarks, or following TDD in a Go project.

# Go Testing Patterns

Comprehensive Go testing patterns for writing reliable, maintainable tests following TDD methodology.

## When to use

- Writing new Go functions or methods.
- Adding test coverage to existing code.
- Creating benchmarks for performance-critical code.
- Implementing fuzz tests for input validation.
- Following a TDD workflow in Go projects.

## TDD workflow for Go

### The RED-GREEN-REFACTOR cycle

\`\`\`
RED     → Write a failing test first
GREEN   → Write minimal code to pass the test
REFACTOR → Improve code while keeping tests green
REPEAT  → Continue with next requirement
\`\`\`

### Step-by-step TDD in Go

\`\`\`go
// Step 1: Define the interface/signature
// calculator.go
package calculator

func Add(a, b int) int {
    panic("not implemented") // Placeholder
}

// Step 2: Write failing test (RED)
// calculator_test.go
package calculator

import "testing"

func TestAdd(t *testing.T) {
    got := Add(2, 3)
    want := 5
    if got != want {
        t.Errorf("Add(2, 3) = %d; want %d", got, want)
    }
}

// Step 3: Run test - verify FAIL
// $ go test
// --- FAIL: TestAdd (0.00s)
// panic: not implemented

// Step 4: Implement minimal code (GREEN)
func Add(a, b int) int {
    return a + b
}

// Step 5: Run test - verify PASS
// $ go test
// PASS

// Step 6: Refactor if needed, verify tests still pass
\`\`\`

## Table-driven tests

The standard pattern for Go tests. Enables comprehensive coverage with minimal code.

\`\`\`go
func TestAdd(t *testing.T) {
    tests := []struct {
        name     string
        a, b     int
        expected int
    }{
        {"positive numbers", 2, 3, 5},
        {"negative numbers", -1, -2, -3},
        {"zero values", 0, 0, 0},
        {"mixed signs", -1, 1, 0},
        {"large numbers", 1000000, 2000000, 3000000},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := Add(tt.a, tt.b)
            if got != tt.expected {
                t.Errorf("Add(%d, %d) = %d; want %d",
                    tt.a, tt.b, got, tt.expected)
            }
        })
    }
}
\`\`\`

### Table-driven tests with error cases

\`\`\`go
func TestParseConfig(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        want    *Config
        wantErr bool
    }{
        {
            name:  "valid config",
            input: \`{"host": "localhost", "port": 8080}\`,
            want:  &Config{Host: "localhost", Port: 8080},
        },
        {
            name:    "invalid JSON",
            input:   \`{invalid}\`,
            wantErr: true,
        },
        {
            name:    "empty input",
            input:   "",
            wantErr: true,
        },
        {
            name:  "minimal config",
            input: \`{}\`,
            want:  &Config{}, // Zero value config
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := ParseConfig(tt.input)

            if tt.wantErr {
                if err == nil {
                    t.Error("expected error, got nil")
                }
                return
            }

            if err != nil {
                t.Fatalf("unexpected error: %v", err)
            }

            if !reflect.DeepEqual(got, tt.want) {
                t.Errorf("got %+v; want %+v", got, tt.want)
            }
        })
    }
}
\`\`\`

## Subtests and sub-benchmarks

### Organizing related tests

\`\`\`go
func TestUser(t *testing.T) {
    // Setup shared by all subtests
    db := setupTestDB(t)

    t.Run("Create", func(t *testing.T) {
        user := &User{Name: "Alice"}
        err := db.CreateUser(user)
        if err != nil {
            t.Fatalf("CreateUser failed: %v", err)
        }
        if user.ID == "" {
            t.Error("expected user ID to be set")
        }
    })

    t.Run("Get", func(t *testing.T) {
        user, err := db.GetUser("alice-id")
        if err != nil {
            t.Fatalf("GetUser failed: %v", err)
        }
        if user.Name != "Alice" {
            t.Errorf("got name %q; want %q", user.Name, "Alice")
        }
    })

    t.Run("Update", func(t *testing.T) {
        // ...
    })

    t.Run("Delete", func(t *testing.T) {
        // ...
    })
}
\`\`\`

### Parallel subtests

\`\`\`go
func TestParallel(t *testing.T) {
    tests := []struct {
        name  string
        input string
    }{
        {"case1", "input1"},
        {"case2", "input2"},
        {"case3", "input3"},
    }

    for _, tt := range tests {
        tt := tt // Capture range variable
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel() // Run subtests in parallel
            result := Process(tt.input)
            // assertions...
            _ = result
        })
    }
}
\`\`\`

## Test helpers

### Helper functions

\`\`\`go
func setupTestDB(t *testing.T) *sql.DB {
    t.Helper() // Marks this as a helper function

    db, err := sql.Open("sqlite3", ":memory:")
    if err != nil {
        t.Fatalf("failed to open database: %v", err)
    }

    // Cleanup when test finishes
    t.Cleanup(func() {
        db.Close()
    })

    // Run migrations
    if _, err := db.Exec(schema); err != nil {
        t.Fatalf("failed to create schema: %v", err)
    }

    return db
}

func assertNoError(t *testing.T, err error) {
    t.Helper()
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
}

func assertEqual[T comparable](t *testing.T, got, want T) {
    t.Helper()
    if got != want {
        t.Errorf("got %v; want %v", got, want)
    }
}
\`\`\`

### Temporary files and directories

\`\`\`go
func TestFileProcessing(t *testing.T) {
    // Create temp directory - automatically cleaned up
    tmpDir := t.TempDir()

    // Create test file
    testFile := filepath.Join(tmpDir, "test.txt")
    err := os.WriteFile(testFile, []byte("test content"), 0644)
    if err != nil {
        t.Fatalf("failed to create test file: %v", err)
    }

    // Run test
    result, err := ProcessFile(testFile)
    if err != nil {
        t.Fatalf("ProcessFile failed: %v", err)
    }

    // Assert...
    _ = result
}
\`\`\`

## Golden files

Testing against expected output files stored in \`testdata/\`.

\`\`\`go
var update = flag.Bool("update", false, "update golden files")

func TestRender(t *testing.T) {
    tests := []struct {
        name  string
        input Template
    }{
        {"simple", Template{Name: "test"}},
        {"complex", Template{Name: "test", Items: []string{"a", "b"}}},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := Render(tt.input)

            golden := filepath.Join("testdata", tt.name+".golden")

            if *update {
                // Update golden file: go test -update
                err := os.WriteFile(golden, got, 0644)
                if err != nil {
                    t.Fatalf("failed to update golden file: %v", err)
                }
            }

            want, err := os.ReadFile(golden)
            if err != nil {
                t.Fatalf("failed to read golden file: %v", err)
            }

            if !bytes.Equal(got, want) {
                t.Errorf("output mismatch:\ngot:\n%s\nwant:\n%s", got, want)
            }
        })
    }
}
\`\`\`

## Mocking with interfaces

### Interface-based mocking

\`\`\`go
// Define interface for dependencies
type UserRepository interface {
    GetUser(id string) (*User, error)
    SaveUser(user *User) error
}

// Production implementation
type PostgresUserRepository struct {
    db *sql.DB
}

func (r *PostgresUserRepository) GetUser(id string) (*User, error) {
    // Real database query
}

// Mock implementation for tests
type MockUserRepository struct {
    GetUserFunc  func(id string) (*User, error)
    SaveUserFunc func(user *User) error
}

func (m *MockUserRepository) GetUser(id string) (*User, error) {
    return m.GetUserFunc(id)
}

func (m *MockUserRepository) SaveUser(user *User) error {
    return m.SaveUserFunc(user)
}

// Test using mock
func TestUserService(t *testing.T) {
    mock := &MockUserRepository{
        GetUserFunc: func(id string) (*User, error) {
            if id == "123" {
                return &User{ID: "123", Name: "Alice"}, nil
            }
            return nil, ErrNotFound
        },
    }

    service := NewUserService(mock)

    user, err := service.GetUserProfile("123")
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if user.Name != "Alice" {
        t.Errorf("got name %q; want %q", user.Name, "Alice")
    }
}
\`\`\`

## Benchmarks

### Basic benchmarks

\`\`\`go
func BenchmarkProcess(b *testing.B) {
    data := generateTestData(1000)
    b.ResetTimer() // Don't count setup time

    for i := 0; i < b.N; i++ {
        Process(data)
    }
}

// Run: go test -bench=BenchmarkProcess -benchmem
// Output: BenchmarkProcess-8   10000   105234 ns/op   4096 B/op   10 allocs/op
\`\`\`

### Benchmark with different sizes

\`\`\`go
func BenchmarkSort(b *testing.B) {
    sizes := []int{100, 1000, 10000, 100000}

    for _, size := range sizes {
        b.Run(fmt.Sprintf("size=%d", size), func(b *testing.B) {
            data := generateRandomSlice(size)
            b.ResetTimer()

            for i := 0; i < b.N; i++ {
                // Make a copy to avoid sorting already sorted data
                tmp := make([]int, len(data))
                copy(tmp, data)
                sort.Ints(tmp)
            }
        })
    }
}
\`\`\`

### Memory allocation benchmarks

\`\`\`go
func BenchmarkStringConcat(b *testing.B) {
    parts := []string{"hello", "world", "foo", "bar", "baz"}

    b.Run("plus", func(b *testing.B) {
        for i := 0; i < b.N; i++ {
            var s string
            for _, p := range parts {
                s += p
            }
            _ = s
        }
    })

    b.Run("builder", func(b *testing.B) {
        for i := 0; i < b.N; i++ {
            var sb strings.Builder
            for _, p := range parts {
                sb.WriteString(p)
            }
            _ = sb.String()
        }
    })

    b.Run("join", func(b *testing.B) {
        for i := 0; i < b.N; i++ {
            _ = strings.Join(parts, "")
        }
    })
}
\`\`\`

## Fuzzing (Go 1.18+)

### Basic fuzz test

\`\`\`go
func FuzzParseJSON(f *testing.F) {
    // Add seed corpus
    f.Add(\`{"name": "test"}\`)
    f.Add(\`{"count": 123}\`)
    f.Add(\`[]\`)
    f.Add(\`""\`)

    f.Fuzz(func(t *testing.T, input string) {
        var result map[string]interface{}
        err := json.Unmarshal([]byte(input), &result)

        if err != nil {
            // Invalid JSON is expected for random input
            return
        }

        // If parsing succeeded, re-encoding should work
        _, err = json.Marshal(result)
        if err != nil {
            t.Errorf("Marshal failed after successful Unmarshal: %v", err)
        }
    })
}

// Run: go test -fuzz=FuzzParseJSON -fuzztime=30s
\`\`\`

### Fuzz test with multiple inputs

\`\`\`go
func FuzzCompare(f *testing.F) {
    f.Add("hello", "world")
    f.Add("", "")
    f.Add("abc", "abc")

    f.Fuzz(func(t *testing.T, a, b string) {
        result := Compare(a, b)

        // Property: Compare(a, a) should always equal 0
        if a == b && result != 0 {
            t.Errorf("Compare(%q, %q) = %d; want 0", a, b, result)
        }

        // Property: Compare(a, b) and Compare(b, a) should have opposite signs
        reverse := Compare(b, a)
        if (result > 0 && reverse >= 0) || (result < 0 && reverse <= 0) {
            if result != 0 || reverse != 0 {
                t.Errorf("Compare(%q, %q) = %d, Compare(%q, %q) = %d; inconsistent",
                    a, b, result, b, a, reverse)
            }
        }
    })
}
\`\`\`

## Test coverage

### Running coverage

\`\`\`bash
# Basic coverage
go test -cover ./...

# Generate coverage profile
go test -coverprofile=coverage.out ./...

# View coverage in browser
go tool cover -html=coverage.out

# View coverage by function
go tool cover -func=coverage.out

# Coverage with race detection
go test -race -coverprofile=coverage.out ./...
\`\`\`

### Coverage targets

| Code Type | Target |
|-----------|--------|
| Critical business logic | 100% |
| Public APIs | 90%+ |
| General code | 80%+ |
| Generated code | Exclude |

### Excluding generated code from coverage

\`\`\`go
//go:generate mockgen -source=interface.go -destination=mock_interface.go

// In coverage profile, exclude with build tags:
// go test -cover -tags=!generate ./...
\`\`\`

## HTTP handler testing

\`\`\`go
func TestHealthHandler(t *testing.T) {
    // Create request
    req := httptest.NewRequest(http.MethodGet, "/health", nil)
    w := httptest.NewRecorder()

    // Call handler
    HealthHandler(w, req)

    // Check response
    resp := w.Result()
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        t.Errorf("got status %d; want %d", resp.StatusCode, http.StatusOK)
    }

    body, _ := io.ReadAll(resp.Body)
    if string(body) != "OK" {
        t.Errorf("got body %q; want %q", body, "OK")
    }
}

func TestAPIHandler(t *testing.T) {
    tests := []struct {
        name       string
        method     string
        path       string
        body       string
        wantStatus int
        wantBody   string
    }{
        {
            name:       "get user",
            method:     http.MethodGet,
            path:       "/users/123",
            wantStatus: http.StatusOK,
            wantBody:   \`{"id":"123","name":"Alice"}\`,
        },
        {
            name:       "not found",
            method:     http.MethodGet,
            path:       "/users/999",
            wantStatus: http.StatusNotFound,
        },
        {
            name:       "create user",
            method:     http.MethodPost,
            path:       "/users",
            body:       \`{"name":"Bob"}\`,
            wantStatus: http.StatusCreated,
        },
    }

    handler := NewAPIHandler()

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            var body io.Reader
            if tt.body != "" {
                body = strings.NewReader(tt.body)
            }

            req := httptest.NewRequest(tt.method, tt.path, body)
            req.Header.Set("Content-Type", "application/json")
            w := httptest.NewRecorder()

            handler.ServeHTTP(w, req)

            if w.Code != tt.wantStatus {
                t.Errorf("got status %d; want %d", w.Code, tt.wantStatus)
            }

            if tt.wantBody != "" && w.Body.String() != tt.wantBody {
                t.Errorf("got body %q; want %q", w.Body.String(), tt.wantBody)
            }
        })
    }
}
\`\`\`

## Testing commands

\`\`\`bash
# Run all tests
go test ./...

# Run tests with verbose output
go test -v ./...

# Run specific test
go test -run TestAdd ./...

# Run tests matching pattern
go test -run "TestUser/Create" ./...

# Run tests with race detector
go test -race ./...

# Run tests with coverage
go test -cover -coverprofile=coverage.out ./...

# Run short tests only
go test -short ./...

# Run tests with timeout
go test -timeout 30s ./...

# Run benchmarks
go test -bench=. -benchmem ./...

# Run fuzzing
go test -fuzz=FuzzParse -fuzztime=30s ./...

# Count test runs (for flaky test detection)
go test -count=10 ./...
\`\`\`

## Best practices

**DO:**
- Write tests FIRST (TDD).
- Use table-driven tests for comprehensive coverage.
- Test behavior, not implementation.
- Use \`t.Helper()\` in helper functions.
- Use \`t.Parallel()\` for independent tests.
- Clean up resources with \`t.Cleanup()\`.
- Use meaningful test names that describe the scenario.

**DON'T:**
- Test private functions directly (test through the public API).
- Use \`time.Sleep()\` in tests (use channels or conditions).
- Ignore flaky tests (fix or remove them).
- Mock everything (prefer integration tests when possible).
- Skip error path testing.

## Integration with CI/CD

\`\`\`yaml
# GitHub Actions example
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-go@v5
      with:
        go-version: '1.22'

    - name: Run tests
      run: go test -race -coverprofile=coverage.out ./...

    - name: Check coverage
      run: |
        go tool cover -func=coverage.out | grep total | awk '{print $3}' | \
        awk -F'%' '{if ($1 < 80) exit 1}'
\`\`\`

**Remember**: Tests are documentation. They show how your code is meant to be used. Write them clearly and keep them up to date.
