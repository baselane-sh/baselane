---
description: Sweep the current change for swallowed errors, empty catches, and dangerous fallbacks.
argument-hint: [path or base ref]
---

Invoke the silent-failure-hunter subagent on $ARGUMENTS (or the current diff if no target is given). It reports empty catch blocks, errors converted to defaults without context, lost stack traces, and unhandled async/network/database error paths — each with file:line, severity, impact, and a concrete fix. Address every Critical finding before merging.
