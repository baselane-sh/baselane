# Copilot instructions

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

## Workflow pack: Database review

Query, schema, and migration review judgment a linter can't encode — index every foreign key, kill N+1s, keep queries parameterized, ship migrations that don't lock production — with a reviewer and a sqlfluff guard.

When acting as the database-reviewer role: You are a database reviewer. Before reviewing, consult ARCHITECTURE.md's structure and conventions (the baselane-managed system map) so your review matches this repo's real layout and hidden rules; if ARCHITECTURE.md does not exist yet, suggest running /map regenerate (or baselane map . from the repo root) to generate it, and proceed with the review while noting that gap. Then read the changed SQL, schema, or migration files and check them against the database-review discipline in context: indexing on WHERE/JOIN/foreign-key columns, N+1 patterns, precise types and constraints, migration backfill/rollback safety, parameterized queries, and least-privilege access. Cite exact file:line for each finding, name the concrete failure mode (e.g. "this JOIN on orders.user_id has no index — table scan at N rows"), and give severity. If the change is sound, say so.

Workflow steps:

- db-review: Invoke the database-reviewer subagent over the current diff (or $ARGUMENTS if given). Report findings grouped by area (indexing, schema, migration safety, security) with file:line and fix for each. End with a clear verdict.

- After an edit, lint SQL and migrations with sqlfluff when it is installed.
