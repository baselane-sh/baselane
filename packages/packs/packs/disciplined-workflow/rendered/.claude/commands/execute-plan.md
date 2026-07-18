---
description: Run the plan task-by-task with per-task spec-then-quality review.
argument-hint: [plan file]
---

Execute the plan in $ARGUMENTS one task at a time. After each task, invoke the task-reviewer subagent for its two ordered verdicts — spec compliance, then code quality — and do not advance while any Critical or Important finding is open.
