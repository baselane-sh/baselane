# Copilot instructions

## Python conventions (beyond what the linter enforces)

`ruff` and `black` already enforce PEP 8, import order, bare `except`, and mutable default arguments — this pack is the judgment they can't encode. Keep the mechanical checks in CI (`ruff check .`, `bandit -r src/`, `pytest --cov`); the reviewer covers the rest.

### Data shapes

- Model value objects as `@dataclass(frozen=True)` or `NamedTuple`, not a mutable class with public attributes.
- Use a `Protocol` when a caller needs only an interface, not a concrete base class; use plain `@dataclass` for request/DTO shapes at API and service boundaries.
- Acquire every resource (files, locks, connections) through a context manager (`with`); use generators for lazy, memory-efficient iteration.

### Types

- Annotate every function signature, including internal helpers — not just the public API a type checker would force.

### Errors

- Catch specific exception types and preserve the chain when wrapping (`raise NewError(...) from err`); never swallow into a bare `except` or drop the cause.

### Boundaries

- Validate external input at the boundary before it reaches business logic; fail fast with a clear message (Pydantic or an explicit check).
- Read required secrets with `os.environ["KEY"]` so a missing value raises at startup — never `os.environ.get(...)` with a fallback that lets a misconfigured app boot.

### Flag in review (a linter won't)

- A mutable class used where a frozen value object belongs.
- A concrete base class used where a `Protocol` would decouple the caller.
- A wrapped exception that drops `from err` and loses the cause.
- A required secret read via `.get()` with a silent fallback default.

## Workflow pack: Python rules

Python conventions a linter can't check — frozen dataclasses for value objects, Protocols for structural typing, raise ... from, os.environ[] over silent .get() fallbacks — with a reviewer and a ruff guard; style and coverage belong in CI.

When acting as the python-reviewer role: You are a Python reviewer. Read the changed Python files and check them against the conventions in context: frozen dataclasses/NamedTuples for value objects, Protocols for structural typing, context managers for resources, full signature annotations, specific-exception handling with `raise ... from`, boundary input validation, and `os.environ[...]` secrets that fail fast. PEP 8, import order, and coverage are the linter/CI's job — don't re-litigate them. Cite the exact file:line for each finding, name the concrete failure mode, and give severity. If the change is sound, say so plainly rather than inventing findings.

Workflow steps:

- python-review: Invoke the python-reviewer subagent on the changed Python files (the diff since $ARGUMENTS, or the working tree if no ref is given). It checks this pack's conventions — frozen dataclasses for value objects, Protocols for structural typing, `raise ... from`, and os.environ[] over silent .get() fallbacks — and reports file:line + severity. Style and coverage are CI's job; don't re-litigate them. Fix any Critical or Important findings before merging.

- After an edit, lint with ruff when it is installed.
