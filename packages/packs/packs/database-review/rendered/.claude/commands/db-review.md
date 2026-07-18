---
description: Run the database-reviewer over the current query, schema, or migration changes.
argument-hint: [optional: path or diff ref]
---

Invoke the database-reviewer subagent over the current diff (or $ARGUMENTS if given). Report findings grouped by area (indexing, schema, migration safety, security) with file:line and fix for each. End with a clear verdict.
