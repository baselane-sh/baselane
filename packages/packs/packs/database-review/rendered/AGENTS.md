# AGENTS.md

<!-- generated from workflow-pack database-review v2.0.0 -->
<!-- adapted from affaan-m/ECC (Everything Claude Code) (MIT) — https://github.com/affaan-m/ECC -->

## Database review discipline

`sqlfluff` catches SQL style and obvious mistakes — this pack is the judgment it can't encode, applied in review of any query, schema, or migration before it reaches production. It draws on PostgreSQL, MySQL/MariaDB, and cross-ORM migration patterns (Prisma, Drizzle, Kysely, Django, golang-migrate) — see the `postgres-patterns`, `mysql-patterns`, and `database-migrations` skills bundled with this pack for full detail and copy-paste examples.

### Query performance

- Every column in a `WHERE` or `JOIN` should be indexed — confirm with `EXPLAIN`/`EXPLAIN ANALYZE`, don't assume.
- Watch for N+1: a query inside a loop over rows from a previous query. Batch or join it.
- Composite indexes put equality columns before range columns: `(status, created_at)` serves `WHERE status = 'pending' AND created_at > ...`.
- Use partial indexes for soft-delete filters (`WHERE deleted_at IS NULL`) and covering indexes (`INCLUDE (col)` / trailing columns) to avoid table lookups.
- Prefer cursor/keyset pagination (`WHERE id > $last` or `WHERE (created_at, id) < (?, ?)`) over `OFFSET` on large or frequently-written tables — OFFSET is O(n) and gets slower as the page number grows.
- For queue-style claims, `FOR UPDATE SKIP LOCKED` gives real throughput — but only for workloads where skipping a locked row is acceptable, never for general accounting/integrity-sensitive reads.

### Schema design

- Use precise types: `bigint` for IDs (not `int`, which overflows on tables that grow past 2B rows), `timestamptz`/`DATETIME`-with-UTC-discipline for times, `numeric`/`DECIMAL` for money (never `float`/`double`), `text` over an arbitrary varchar cap, `boolean` for flags.
- Every foreign key gets an index — no exceptions. An unindexed FK makes joins slow and deletes/updates on the parent lock-heavy.
- Put constraints (`NOT NULL`, `CHECK`, `ON DELETE`) in the schema, not only in application code.
- Avoid random UUID primary keys on hot tables (poor locality); prefer UUIDv7/ordered IDs or surrogate integer keys with a separate lookup UUID if external-facing IDs are needed.
- Use `lowercase_snake_case` identifiers consistently — quoted mixed-case identifiers are a recurring source of driver/tooling bugs.

### Migration safety

- Every change is a migration — never alter production databases manually, and never edit a migration that has already run in production (create a new forward migration instead).
- Adding a `NOT NULL` column to a large table needs a nullable-add + backfill + constrain sequence, not a single `ADD COLUMN ... NOT NULL` — that requires a full table rewrite and lock. A column with a constant default is instant in modern Postgres (11+); a computed/volatile default is not.
- Build indexes with `CREATE INDEX CONCURRENTLY` (Postgres) or equivalent non-blocking DDL on existing large tables — a plain `CREATE INDEX` blocks writes for the duration of the build. Note `CONCURRENTLY` cannot run inside a transaction block; most migration tools need special handling for it.
- Never mix schema (DDL) and data (DML) changes in one migration — a large backfill inside a schema migration turns a fast operation into a long lock.
- Batch large data migrations (e.g. `LIMIT batch_size ... FOR UPDATE SKIP LOCKED`, commit per batch) instead of updating every row in one transaction.
- Renames and drops go through expand-contract: add the new column, backfill, dual-write/dual-read from the application, then drop the old column in a later, separate migration — never rename directly in production.
- Every migration has a rollback path (an explicit DOWN, or an documented forward-only remediation migration if truly irreversible). Test against production-sized data — a migration that's instant on 100 rows can lock for minutes on 10M.

### Data-layer security

- Queries are parameterized, never string-concatenated with user input.
- Multi-tenant tables enforce row-level access at the database (Postgres RLS with policies wrapped as `(SELECT auth.uid())` — an unwrapped per-row function call in a policy is a hidden N+1), not only in application code.
- Application database users get least-privilege grants (`SELECT, INSERT, UPDATE, DELETE` on the app schema), never `GRANT ALL`/admin. Separate migration/admin users from runtime application users. Require TLS for connections that cross hosts/networks. Revoke default `public` schema privileges.
- Drop anonymous/empty-username database accounts (a default MySQL install footgun) and audit public network exposure/bind addresses before tuning performance.

### Concurrency and connections

- Keep transactions short — never hold a lock across an external API call or a slow backfill.
- Lock rows in a consistent order across all code paths touching the same tables (e.g. `ORDER BY id FOR UPDATE`) to prevent deadlocks; on deadlock, roll back and retry the whole transaction with a bounded budget.
- Size connection pools below the server's connection/idle timeout (e.g. `pool_recycle` under MySQL's `wait_timeout`), enable pre-ping/keepalive, and set statement/idle-in-transaction timeouts on the server side.
- Read replicas lag — never route read-your-own-write paths, checkout flows, permission checks, or idempotency-key reads to a replica immediately after a write.

### Flag in review

- `SELECT *` in application code shipped to production.
- Offset pagination on large, frequently-written tables — prefer cursor/keyset pagination.
- `INSERT`s in a loop instead of a batch/multi-row insert or `COPY`.
- Inconsistent lock ordering across transactions touching the same tables (deadlock risk).
- `ADD COLUMN ... NOT NULL` with no default on an existing large table, or a plain (non-concurrent) `CREATE INDEX` on one.
- `GRANT ALL` / admin privileges granted to an application's runtime database user.
- A migration that mixes schema and data changes, or has no rollback/remediation path.

## Harness capabilities

- system-map · repo · analyze — provisioned

### System map

`ARCHITECTURE.md` carries a generated, baselane-managed system map — languages, layout, commands, import-graph hotspots, and measured conventions including hidden rules (consistent but unenforced). Read its conventions section before writing code, and regenerate with `baselane map .` (or `/map regenerate`) after structural changes.

## Workflow pack: Database review

Query, schema, and migration review judgment a linter can't encode — full PostgreSQL/MySQL/migration pattern libraries plus a reviewer, migration-review command, and safety hooks — adapted from ECC's database-reviewer, postgres-patterns, mysql-patterns, and database-migrations.

### Roles

- **database-reviewer** — PostgreSQL/MySQL database specialist: reviews SQL, schema changes, and migrations for missing indexes, N+1 queries, unsafe migrations, RLS/least-privilege gaps, and injection risk. Use PROACTIVELY when writing queries, schemas, or migrations, or troubleshooting database performance.

### Commands

- **/db-review** `[optional: path or diff ref]` — Run the database-reviewer over the current query, schema, or migration changes.
  - How it runs: Invoke the database-reviewer subagent over the current diff (or $ARGUMENTS if given). Report findings grouped by area (indexing, schema, migration safety, security) with file:line and fix for each. End with a clear verdict.
- **/migration-review** `[optional: migration file path or diff ref]` — Review a migration diff specifically for lock-holding, missing rollback path, and unbatched backfills.
  - How it runs: Invoke the database-reviewer subagent over the migration at $ARGUMENTS (or the most recently added/changed migration file if not given). Check specifically: (1) does any DDL statement hold a full-table lock on a table that can be large in production — e.g. a plain CREATE INDEX instead of CONCURRENTLY, or ADD COLUMN ... NOT NULL with no default; (2) is there a rollback path (a DOWN migration, or an explicit note that it's forward-only with a remediation plan); (3) is any data backfill batched (bounded LIMIT + commit per batch) rather than a single unbounded UPDATE, and kept in a separate migration from the schema change. Report each of the three areas with file:line, verdict (pass/fail), and the concrete fix if it fails.

### Guardrails

- After an edit, lint SQL and migrations with sqlfluff when it is installed.
- Before editing a schema/migration file, remind that changes need a rollback path and must not hold long locks.

### Skills

- **postgres-patterns** — PostgreSQL indexing, schema, RLS, pagination, and configuration patterns. Use when writing SQL queries or migrations, designing schemas, troubleshooting slow queries, implementing Row Level Security, or setting up connection pooling.
- **mysql-patterns** — MySQL and MariaDB schema, query, indexing, transaction, replication, and connection-pool patterns for production backends. Use when designing MySQL/MariaDB tables and indexes, reviewing migrations before they run on large tables, debugging slow queries/lock waits/deadlocks/connection exhaustion, or adding keyset pagination, upserts, full-text search, JSON columns, or queues.
- **database-migrations** — Safe, reversible database schema-change patterns across PostgreSQL, MySQL, and common ORMs (Prisma, Drizzle, Kysely, Django, golang-migrate). Use when creating or altering tables, adding/removing columns or indexes, running data migrations, or planning zero-downtime schema changes.

Tool-specific implementations live alongside this file (see `CLAUDE.md` for the Claude Code implementation). Tools without a native subagent/command surface should treat the sections above as operating instructions.
