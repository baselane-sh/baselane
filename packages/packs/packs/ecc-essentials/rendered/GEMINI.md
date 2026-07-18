# GEMINI.md

@AGENTS.md

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
