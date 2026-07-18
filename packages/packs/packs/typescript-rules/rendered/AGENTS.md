# AGENTS.md

<!-- generated from workflow-pack typescript-rules v1.4.0 -->
<!-- adapted from affaan-m/ECC (MIT) — https://github.com/affaan-m/ECC -->

## TypeScript/JavaScript conventions (beyond what the linter enforces)

`eslint` and `prettier` already enforce formatting, `no-explicit-any`, and stray `console.log` — this pack is the judgment they can't encode. Keep the mechanical checks in CI (`prettier --check .`, `eslint .`); the reviewer covers the rest.

### Types at the surface

- Give exported functions, shared utilities, and public methods explicit parameter and return types; let inference handle obvious locals.
- Use `interface` for object shapes meant to be extended; use `type` for unions, intersections, and mapped types. Prefer string-literal unions over `enum` unless interop demands one.
- Use `unknown` for external/untrusted input and narrow it before use (`error instanceof Error`); reserve `any` for genuine escape hatches, never as the default.
- Type React props with a named `interface`/`type` and type callback props explicitly; skip `React.FC` unless you need it.

### Immutability

- Return new objects/arrays via spread (`{ ...user, name }`) or `map`/`filter` — never `push`/`splice`/assignment on a value you received.

### Errors and boundaries

- Handle errors explicitly with context, then re-raise or return a typed error; narrow an `unknown` caught error before reading `.message`.
- Validate external input at the boundary with a schema (e.g. Zod) and infer the type from the schema rather than hand-writing both.
- Read required secrets from the environment and fail fast at startup if one is missing.

### Flag in review (a linter won't)

- An exported function with no parameter/return types.
- `any` where `unknown` plus a type guard would do.
- In-place mutation of a function argument.
- A repeated inline object shape that should be a named type.

## Workflow pack: TypeScript rules

TypeScript conventions a linter can't check — explicit public-API types, unknown over any with narrowing, immutable updates, Zod at the boundary — with a reviewer and a prettier guard; formatting and lint rules belong in CI.

### Roles

- **typescript-reviewer** — Reviews changed TypeScript/JavaScript against the standards: explicit public-API types, unknown over any, immutable updates, Zod boundaries, and env-var secrets. Reports file:line + severity. Use after any TS/JS change.

### Commands

- **/typescript-review** `[base ref]` — Run the TypeScript reviewer over the current change against this pack's TypeScript standards.
  - How it runs: Invoke the typescript-reviewer subagent on the changed TypeScript files (the diff since $ARGUMENTS, or the working tree if no ref is given). It checks this pack's conventions — explicit public-API types, unknown over any with narrowing, immutable updates, and Zod at the boundary — and reports file:line + severity. Formatting and lint rules are CI's job; don't re-litigate them. Fix any Critical or Important findings before merging.

### Guardrails

- After an edit, check formatting with prettier when it is installed.

### Skills

- **immutable-updates** — Use when updating objects, arrays, or records in application code — return a new copy with the change applied instead of mutating the original in place, to prevent hidden side effects and aliasing bugs.

Tool-specific implementations live alongside this file (see `CLAUDE.md` for the Claude Code implementation). Tools without a native subagent/command surface should treat the sections above as operating instructions.
