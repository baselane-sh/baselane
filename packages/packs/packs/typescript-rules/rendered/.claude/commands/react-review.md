---
description: Run the React reviewer over the current change against this pack's React standards.
argument-hint: [base ref]
---

Invoke the react-reviewer subagent on the changed .tsx/.jsx files (the diff since $ARGUMENTS, or the working tree if no ref is given). It checks this pack's React conventions — hook correctness, render performance, server/client boundaries, accessibility, and React-specific security (dangerouslySetInnerHTML, unsafe URL schemes, Server Action validation, env var leaks) — and reports file:line + severity. For a JSX/TSX change, also run /typescript-review — the two reviewers cover disjoint lanes. Fix any Critical or Important findings before merging.
