# Copilot instructions

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

When acting as the typescript-reviewer role: You are a TypeScript reviewer. Read the changed TS/JS files and check them against the conventions in context: explicit types on exported/public APIs, `unknown` over `any` with narrowing, immutable updates via spread/array methods, typed error handling, boundary validation with a schema library, and env-var secrets that fail fast. Formatting and lint rules are the linter/CI's job — don't re-litigate them. Cite the exact file:line for each finding, name the concrete failure mode, and give severity. If the change is sound, say so plainly rather than inventing findings.

Workflow steps:

- typescript-review: Invoke the typescript-reviewer subagent on the changed TypeScript files (the diff since $ARGUMENTS, or the working tree if no ref is given). It checks this pack's conventions — explicit public-API types, unknown over any with narrowing, immutable updates, and Zod at the boundary — and reports file:line + severity. Formatting and lint rules are CI's job; don't re-litigate them. Fix any Critical or Important findings before merging.

- After an edit, check formatting with prettier when it is installed.

## Skills

### immutable-updates

Use when updating objects, arrays, or records in application code — return a new copy with the change applied instead of mutating the original in place, to prevent hidden side effects and aliasing bugs.

# Immutable updates

When you change a value, **produce a new copy — never mutate the argument you were handed.** Shared
references mean an in-place mutation is a spooky-action-at-a-distance bug: some other holder of the
same object sees a change it never asked for.

```ts
// WRONG — mutates the caller's object
function rename(user, name) {
  user.name = name;
  return user;
}

// CORRECT — returns a new object, original untouched
function rename(user, name) {
  return { ...user, name };
}
```

## Patterns

- **Object field:** `{ ...obj, field: value }`.
- **Nested field:** spread each level you touch — `{ ...obj, addr: { ...obj.addr, city } }`.
- **Array append/remove:** `[...list, item]`, `list.filter(x => x.id !== id)`,
  `list.map(x => x.id === id ? { ...x, done: true } : x)` — not `push`/`splice`/index assignment.
- **Record update:** `{ ...map, [key]: value }` and `const { [key]: _drop, ...rest } = map` to remove.

## Why it pays off

- **No hidden side effects.** A function that returns a new value can't corrupt state its caller
  still depends on. Behavior is a function of inputs, not of call order.
- **Debugging is local.** When a value is wrong, the mutation that produced it is the expression
  that built it — not some distant `.sort()` or field write on a shared reference.
- **Safe concurrency and change-detection.** Referential equality (`prev !== next`) becomes a
  reliable "did this change?" signal for caches, memoization, and UI diffing.

## When in-place is acceptable

A locally-scoped object that never escapes the function — a builder/accumulator you allocated and
return once — is fine to mutate. The rule protects values that are *shared*: arguments, fields on
long-lived state, anything another holder still references.
