---
description: Decompose an approved design into verifiable, path-exact tasks.
argument-hint: [design doc or feature]
---

Turn the approved design for $ARGUMENTS into a task-by-task plan: each task names the exact files to create or modify, the failing test to write first, and how it will be verified. No task may contain a placeholder or a reference to anything no task defines. Then invoke the plan-reviewer subagent and fix anything it flags before execution.
