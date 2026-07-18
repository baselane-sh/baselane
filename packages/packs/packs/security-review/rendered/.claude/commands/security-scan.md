---
description: Run the security-reviewer over the current changes and report findings by severity.
argument-hint: [optional: path or diff ref]
---

Invoke the security-reviewer subagent over the current diff (or $ARGUMENTS if given). Report findings grouped by severity (CRITICAL, HIGH, MEDIUM) with file:line and fix for each. End with a verdict: approve, or block until CRITICAL/HIGH issues are fixed.
