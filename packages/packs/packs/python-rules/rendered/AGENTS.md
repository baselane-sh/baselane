# AGENTS.md

<!-- generated from workflow-pack python-rules v2.0.0 -->
<!-- adapted from affaan-m/ECC (MIT) — https://github.com/affaan-m/ECC -->

## Python conventions (beyond what the linter enforces)

`ruff` and `black` already enforce PEP 8, import order, bare `except`, and mutable default arguments — this pack is the judgment they can't encode. Keep the mechanical checks in CI (`ruff check .`, `bandit -r src/`, `pytest --cov`); the reviewers cover the rest.

### Standards and formatting

- Follow PEP 8 conventions; annotate every function signature, including internal helpers.
- Format with **black**, sort imports with **isort**, lint with **ruff**.
- Import order: stdlib, then third-party, then local — enforced by isort.

### Core principles

- **Readability counts.** Code should be obvious; prefer a clear loop over a clever one-liner.
- **Explicit is better than implicit.** Avoid hidden side effects (e.g. a bare `some_module.setup()` import with no visible call site).
- **EAFP over LBYL.** Prefer `try`/`except KeyError` over `if key in dictionary` — Python favors asking forgiveness over checking permission first.

### Data shapes

- Model value objects as `@dataclass(frozen=True)` or `NamedTuple`, not a mutable class with public attributes.
- Use a `Protocol` when a caller needs only an interface, not a concrete base class; use plain `@dataclass` for request/DTO shapes at API and service boundaries.
- Validate invariants in `__post_init__` (e.g. reject a malformed email or an out-of-range age at construction, not later).
- Acquire every resource (files, locks, connections, DB transactions) through a context manager (`with`); write custom ones with `@contextlib.contextmanager` or an `__enter__`/`__exit__` class when reuse pays off. Use generators for lazy, memory-efficient iteration and to avoid building large intermediate lists.

### Errors

- Catch specific exception types and preserve the chain when wrapping (`raise NewError(...) from err`); never swallow into a bare `except` or drop the cause.
- Build a small custom exception hierarchy (`AppError` → `ValidationError`, `NotFoundError`, ...) instead of raising bare `Exception` or built-ins for domain errors.

### Boundaries

- Validate external input at the boundary before it reaches business logic; fail fast with a clear message (Pydantic or an explicit check).
- Read required secrets with `os.environ["KEY"]` so a missing value raises at startup — never `os.environ.get(...)` with a fallback that lets a misconfigured app boot silently.

### Concurrency

- Use `ThreadPoolExecutor` for I/O-bound work, `ProcessPoolExecutor` for CPU-bound work, and `asyncio`/`aiohttp` for concurrent I/O — pick the tool that matches what's actually blocking.
- Guard shared mutable state with `threading.Lock`; don't mix sync and async call paths in the same function.
- Batch queries instead of issuing one per loop iteration (N+1).

### Performance

- Avoid `result += str(item)` in a loop (O(n²) due to string immutability) — use `"".join(...)` or `io.StringIO`.
- Use `__slots__` on high-volume value classes to cut per-instance memory.
- Prefer a generator over building a full list when the data is only consumed once.

### Anti-patterns (flag in review — a linter won't catch these)

- Mutable default arguments: `def f(x=[])` — use `def f(x=None)` and create the list inside.
- `type(obj) == list` instead of `isinstance(obj, list)`.
- `value == None` instead of `value is None`.
- `from module import *` — namespace pollution.
- A mutable class used where a frozen value object belongs.
- A concrete base class used where a `Protocol` would decouple the caller.
- A wrapped exception that drops `from err` and loses the cause.
- A required secret read via `.get()` with a silent fallback default.

### Security

- Read secrets from the environment (`os.environ["KEY"]`, or `python-dotenv`'s `load_dotenv()` in development) — never hardcode them.
- Run **bandit** for static security analysis: `bandit -r src/`.
- SQL injection: never interpolate user input into a query string — use parameterized queries or the ORM.
- Command injection: never pass unvalidated input to a shell — use `subprocess` with a list of args, not `shell=True` with a formatted string.
- Path traversal: validate user-controlled paths with `normpath` and reject `..` segments.
- Avoid `eval`/`exec` on untrusted input, unsafe deserialization (`pickle`, `yaml.load` without `SafeLoader`), and weak crypto (MD5/SHA1 for anything security-sensitive).

### Testing

- Use **pytest**; follow the TDD cycle (red — write a failing test, green — minimal code to pass, refactor — clean up while green).
- Target 80%+ coverage overall, 100% on critical paths: `pytest --cov=src --cov-report=term-missing`.
- Use `pytest.mark` to categorize tests (`unit`, `integration`, `slow`) and `pytest -m "not slow"` to skip the slow ones in a fast local loop.
- Mock external dependencies (`unittest.mock.patch`), not the code under test; prefer `tmp_path` over hand-rolled temp files.

### Reference

See skills `python-patterns` (idioms, decorators, concurrency, package layout), `python-testing` (pytest fixtures, mocking, parametrization), `fastapi-patterns` (async API layering), and `django-security`/`django-tdd` for framework-specific depth.

## Workflow pack: Python rules

Full ECC Python corpus: conventions, three framework-aware reviewers (Python/FastAPI/Django), five deep-reference skills, and a ruff guard hook.

### Roles

- **python-reviewer** — Expert Python code reviewer for PEP 8, Pythonic idioms, type hints, security (injection, unsafe deserialization, weak crypto), error handling, concurrency, and code quality. Reports file:line + severity. Use for all Python code changes.
- **fastapi-reviewer** — Reviews FastAPI applications for async correctness, dependency injection, Pydantic schemas, security (secrets, SQL injection, CORS, auth), OpenAPI quality, and test dependency overrides. Use after any FastAPI change.
- **django-reviewer** — Expert Django code reviewer for ORM correctness (N+1, atomic(), bulk_create), DRF patterns, migration safety, security misconfigurations (mark_safe, CSRF, DEBUG, SECRET_KEY), and production-grade practices. Use for all Django code changes.

### Commands

- **/python-review** `[base ref]` — Run the Python reviewer over the current change against this pack's Python standards.
  - How it runs: Invoke the python-reviewer subagent on the changed Python files (the diff since $ARGUMENTS, or the working tree if no ref is given). It checks this pack's conventions — frozen dataclasses for value objects, Protocols for structural typing, `raise ... from`, and os.environ[] over silent .get() fallbacks, plus security, type hints, and code quality — and reports file:line + severity. Style and coverage are CI's job; don't re-litigate them. Fix any CRITICAL or HIGH findings before merging.
- **/fastapi-review** `[base ref]` — Run the FastAPI reviewer over the current change for async correctness, DI, schemas, and API security.
  - How it runs: Invoke the fastapi-reviewer subagent on the changed FastAPI files (the diff since $ARGUMENTS, or the working tree if no ref is given). It checks app construction, routing, Pydantic request/response schemas, async dependency injection, auth/CORS/rate limits, and test dependency overrides, reporting file:line + severity plus `Tests checked:` and `Residual risk:`. Fix any Critical or High findings before merging.
- **/django-review** `[base ref]` — Run the Django reviewer over the current change for ORM correctness, DRF patterns, migration safety, and security.
  - How it runs: Invoke the django-reviewer subagent on the changed Django files (the diff since $ARGUMENTS, or the working tree if no ref is given). It checks ORM correctness (N+1, atomic(), bulk_create), DRF serializer/permission/pagination patterns, migration safety, and security misconfigurations (mark_safe, CSRF, DEBUG, SECRET_KEY), reporting file:line + severity. Run `python-review` too for general Python quality. Fix any CRITICAL or HIGH findings before merging.

### Guardrails

- After an edit, lint and typecheck with ruff when it's installed and the repo looks like a Python project.

### Skills

- **python-patterns** — Pythonic idioms, type hints, error handling, context managers, comprehensions/generators, dataclasses, decorators, concurrency, package layout, and anti-patterns. Use when writing, reviewing, or refactoring Python code, or designing a package/module layout.
- **python-testing** — pytest fundamentals, fixtures (scopes, params, autouse, conftest), parametrization, mocking/patching, async test patterns, and TDD methodology with coverage targets. Use when writing or reviewing Python tests, or setting up a pytest suite.
- **fastapi-patterns** — FastAPI project layout, app factory/lifespan, pydantic-settings config, Pydantic v2 request/response schemas, async dependency injection, router design, a transactional service layer, and httpx+pytest testing. Use when building or reviewing a FastAPI application.
- **django-security** — Django production security settings, authentication and custom user models, authorization/RBAC and DRF permissions, SQL injection and XSS prevention, CSRF, file-upload validation, rate limiting, security headers, and secret management. Use when configuring or reviewing Django security posture.
- **django-tdd** — Django testing with pytest-django and factory_boy: TDD workflow, test settings, fixtures, model/view/serializer/DRF-API testing, mocking external services and email, and integration/full-flow tests, plus coverage targets. Use when writing or reviewing Django tests.

Tool-specific implementations live alongside this file (see `CLAUDE.md` for the Claude Code implementation). Tools without a native subagent/command surface should treat the sections above as operating instructions.
