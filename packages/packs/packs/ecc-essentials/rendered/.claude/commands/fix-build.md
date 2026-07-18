---
description: Get a failing build or typecheck green with minimal diffs via the build-error-resolver agent.
argument-hint: [build command]
---

Invoke the build-error-resolver subagent. Run $ARGUMENTS (or the project's typecheck/build commands) to collect all errors, then fix them with minimal diffs only — no refactoring, no architecture changes, never silencing errors by weakening lint/typecheck config. Verify the build exits 0 before finishing.
