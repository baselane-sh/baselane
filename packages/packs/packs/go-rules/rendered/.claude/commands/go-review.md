---
description: Run the Go reviewer over the current change against this pack's Go standards.
argument-hint: [base ref]
---

Invoke the go-reviewer subagent on the changed Go files (the diff since $ARGUMENTS, or the working tree if no ref is given). It checks this pack's conventions — consumer-defined interfaces, errors wrapped with %w and context, functional options, context threading, explicitly owned shared state, boundary validation, and fail-fast env-var secrets — and reports file:line + severity. Formatting, go vet, and races are CI's job; don't re-litigate them. Fix any Critical or Important findings before merging.
