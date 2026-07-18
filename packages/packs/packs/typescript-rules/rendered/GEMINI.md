# GEMINI.md

@AGENTS.md

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
