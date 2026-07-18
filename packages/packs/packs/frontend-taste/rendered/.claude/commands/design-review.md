---
description: Run the taste-reviewer over the current changes and summarize violations and fixes.
argument-hint: [optional: path or component name]
---

Invoke the taste-reviewer subagent over the current diff (or $ARGUMENTS if given). Present its findings grouped by rule (locks, hero discipline, anti-slop bans), each with file:line and fix. If it finds nothing, report a clean pass.
