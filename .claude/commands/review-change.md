---
description: Get an independent review of the current change before merging.
argument-hint: [base ref]
---

Invoke the reviewer subagent on the diff since $ARGUMENTS. If it returns Critical or Important findings, fix them and request re-review. Do not merge with open Critical or Important findings.
