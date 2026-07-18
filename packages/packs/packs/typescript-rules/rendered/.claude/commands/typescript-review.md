---
description: Run the TypeScript reviewer over the current change against this pack's TypeScript standards.
argument-hint: [base ref]
---

Invoke the typescript-reviewer subagent on the changed TypeScript files (the diff since $ARGUMENTS, or the working tree if no ref is given). It checks this pack's conventions — explicit public-API types, unknown over any with narrowing, immutable updates, and Zod at the boundary — and reports file:line + severity. Formatting and lint rules are CI's job; don't re-litigate them. Fix any Critical or Important findings before merging.
