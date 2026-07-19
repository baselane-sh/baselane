---
description: Run the Go reviewer over the current change against this pack's Go standards.
argument-hint: [base ref]
---

Invoke the go-reviewer subagent on the changed Go files (the diff since $ARGUMENTS, or the working tree if no ref is given). It checks this pack's conventions -- consumer-defined interfaces, errors wrapped with %w and context, functional options, context threading, explicitly owned shared state, boundary validation, and fail-fast env-var secrets -- plus the security/concurrency/quality priorities in its CRITICAL/HIGH/MEDIUM rubric, and reports file:line + severity. Formatting itself (gofmt) is CI's job; don't re-litigate it. Fix any Critical or High findings before merging.
