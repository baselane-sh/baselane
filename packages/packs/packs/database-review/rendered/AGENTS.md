# AGENTS.md

<!-- generated from workflow-pack database-review v1.2.0 -->
<!-- adapted from affaan-m/ECC (MIT) — https://github.com/affaan-m/ECC -->

## Database review discipline

`sqlfluff` catches SQL style and obvious mistakes — this pack is the judgment it can't encode, applied in review of any query, schema, or migration before it reaches production.

### Query performance

- Every column in a `WHERE` or `JOIN` should be indexed — confirm with `EXPLAIN ANALYZE`, don't assume.
- Watch for N+1: a query inside a loop over rows from a previous query. Batch or join it.
- Composite indexes put equality columns before range columns.

### Schema design

- Use precise types: timestamp-with-timezone for times, decimal/numeric for money, `text` over an arbitrary varchar cap.
- Every foreign key gets an index — no exceptions.
- Put constraints (`NOT NULL`, `CHECK`, `ON DELETE`) in the schema, not only in application code.

### Migration safety

- Adding a `NOT NULL` column to a large table needs a backfill, not just a default — check in-flight writes during the migration.
- Don't hold locks across an external call or a slow backfill; batch the backfill.
- Every migration has a rollback path.

### Data-layer security

- Queries are parameterized, never string-concatenated with user input.
- Multi-tenant tables enforce row-level access at the database, not only in application code.
- Application database users get least-privilege grants, never blanket admin.

### Flag in review

- `SELECT *` in application code shipped to production.
- Offset pagination on large, frequently-written tables — prefer cursor pagination.
- `INSERT`s in a loop instead of a batch/multi-row insert.
- Inconsistent lock ordering across transactions touching the same tables (deadlock risk).

## Harness capabilities

- system-map · repo · analyze — provisioned

### System map

`ARCHITECTURE.md` carries a generated, baselane-managed system map — languages, layout, commands, import-graph hotspots, and measured conventions including hidden rules (consistent but unenforced). Read its conventions section before writing code, and regenerate with `baselane map .` (or `/map regenerate`) after structural changes.

## Workflow pack: Database review

Query, schema, and migration review judgment a linter can't encode — index every foreign key, kill N+1s, keep queries parameterized, ship migrations that don't lock production — with a reviewer and a sqlfluff guard.

### Roles

- **database-reviewer** — Reviews SQL, schema changes, and migrations for missing indexes, N+1 queries, unsafe migrations, and injection risk. Use when writing queries, schemas, or migrations, or troubleshooting database performance.

### Commands

- **/db-review** `[optional: path or diff ref]` — Run the database-reviewer over the current query, schema, or migration changes.
  - How it runs: Invoke the database-reviewer subagent over the current diff (or $ARGUMENTS if given). Report findings grouped by area (indexing, schema, migration safety, security) with file:line and fix for each. End with a clear verdict.

### Guardrails

- After an edit, lint SQL and migrations with sqlfluff when it is installed.

Tool-specific implementations live alongside this file (see `CLAUDE.md` for the Claude Code implementation). Tools without a native subagent/command surface should treat the sections above as operating instructions.
