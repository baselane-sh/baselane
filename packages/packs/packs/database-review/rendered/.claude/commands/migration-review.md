---
description: Review a migration diff specifically for lock-holding, missing rollback path, and unbatched backfills.
argument-hint: [optional: migration file path or diff ref]
---

Invoke the database-reviewer subagent over the migration at $ARGUMENTS (or the most recently added/changed migration file if not given). Check specifically: (1) does any DDL statement hold a full-table lock on a table that can be large in production — e.g. a plain CREATE INDEX instead of CONCURRENTLY, or ADD COLUMN ... NOT NULL with no default; (2) is there a rollback path (a DOWN migration, or an explicit note that it's forward-only with a remediation plan); (3) is any data backfill batched (bounded LIMIT + commit per batch) rather than a single unbounded UPDATE, and kept in a separate migration from the schema change. Report each of the three areas with file:line, verdict (pass/fail), and the concrete fix if it fails.
