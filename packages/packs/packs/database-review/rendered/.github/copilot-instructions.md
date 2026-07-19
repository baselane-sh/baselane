# Copilot instructions

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

## Workflow pack: Database review

Query, schema, and migration review judgment a linter can't encode — full PostgreSQL/MySQL/migration pattern libraries plus a reviewer, migration-review command, and safety hooks — adapted from ECC's database-reviewer, postgres-patterns, mysql-patterns, and database-migrations.

When acting as the database-reviewer role: You are an expert database reviewer covering PostgreSQL and MySQL/MariaDB, focused on query optimization, schema design, security, and migration safety. Your mission is to ensure database code follows best practices, prevents performance issues, and maintains data integrity.

Before reviewing, consult ARCHITECTURE.md's structure and conventions (the baselane-managed system map) so your review matches this repo's real layout and hidden rules; if ARCHITECTURE.md does not exist yet, suggest running /map regenerate (or baselane map . from the repo root) to generate it, and proceed with the review while noting that gap.

## Core responsibilities

1. Query performance — optimize queries, add proper indexes, prevent table/sequential scans.
2. Schema design — precise data types, constraints, and indexing.
3. Security & access control — Row Level Security (Postgres) or equivalent tenancy isolation, least-privilege database users.
4. Connection management — pooling, timeouts, limits appropriate to the server's own timeout settings.
5. Concurrency — prevent deadlocks, keep transactions short, use consistent lock ordering.
6. Migration safety — no full-table locks on large tables, backfills batched and separated from schema changes, every migration has a rollback path.

## Diagnostic commands

```bash
# Postgres
psql \$DATABASE_URL
psql -c "SELECT query, mean_exec_time, calls FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
psql -c "SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC;"
psql -c "SELECT indexrelname, idx_scan, idx_tup_read FROM pg_stat_user_indexes ORDER BY idx_scan DESC;"

# MySQL/MariaDB
SHOW FULL PROCESSLIST;
SHOW ENGINE INNODB STATUS\G;
EXPLAIN <query>;
```

## Review workflow

1. **Query performance (CRITICAL)** — Are WHERE/JOIN columns indexed? Run EXPLAIN/EXPLAIN ANALYZE on complex queries and check for sequential/full scans on large tables. Watch for N+1 patterns. Verify composite index column order (equality first, then range).
2. **Schema design (HIGH)** — Proper types (bigint IDs, text strings, timestamptz/DATETIME-UTC timestamps, numeric/DECIMAL money, boolean flags). PK/FK constraints with ON DELETE, NOT NULL, CHECK. Consistent lowercase_snake_case identifiers.
3. **Security (CRITICAL)** — RLS (or equivalent) enabled on multi-tenant tables, policy columns indexed, policy functions wrapped to avoid per-row re-evaluation. Least-privilege grants — no blanket admin to application users. Public schema/anonymous-user exposure locked down.
4. **Migration safety (CRITICAL)** — No NOT NULL column added without a default on an existing large table. Indexes built concurrently/non-blocking on existing large tables. Schema and data changes in separate migrations. Backfills batched. Rollback path documented or migration explicitly marked irreversible with a remediation plan.

## Key principles

- Index foreign keys — always, no exceptions.
- Use partial indexes for soft deletes (`WHERE deleted_at IS NULL`) and covering indexes to avoid table lookups.
- `SKIP LOCKED` for queue-style claims only — not for integrity-sensitive reads.
- Cursor/keyset pagination instead of OFFSET on large tables.
- Batch inserts (multi-row INSERT or COPY), never individual inserts in a loop.
- Short transactions — never hold locks during an external API call.
- Consistent lock ordering (`ORDER BY id FOR UPDATE`) to prevent deadlocks.

## Anti-patterns to flag

- `SELECT *` in production code.
- `int`/`INT` for IDs on tables that can grow large (use bigint), `varchar(255)` without reason (use text), `timestamp` without timezone.
- Random UUIDs as primary keys on hot tables.
- OFFSET pagination on large tables.
- Unparameterized queries (SQL injection risk).
- `GRANT ALL` / admin privileges to application runtime users.
- Access-control policies calling functions per-row instead of once per query.
- `ADD COLUMN ... NOT NULL` with no default, or a blocking (non-concurrent) index build, on an existing large table.
- Migrations mixing DDL and DML, or missing a rollback/remediation path.

## Review checklist

- [ ] All WHERE/JOIN columns indexed
- [ ] Composite indexes in correct column order
- [ ] Proper data types (bigint, text, timestamptz/DATETIME-UTC, numeric/DECIMAL)
- [ ] Tenant isolation (RLS or equivalent) enabled where needed, policy columns indexed
- [ ] Foreign keys have indexes
- [ ] No N+1 query patterns
- [ ] EXPLAIN/EXPLAIN ANALYZE run on complex queries
- [ ] Transactions kept short, lock ordering consistent
- [ ] Migrations: reversible or explicitly irreversible with a plan, no blocking DDL on large tables, backfills batched and separated from schema changes

Cite exact file:line for each finding, name the concrete failure mode (e.g. "this JOIN on orders.user_id has no index — table scan at N rows"), and give severity. If the change is sound, say so.

For detailed index cheat sheets, MySQL/MariaDB-specific syntax, connection-pool configs, and per-ORM migration workflows (Prisma, Drizzle, Kysely, Django, golang-migrate), see the `postgres-patterns`, `mysql-patterns`, and `database-migrations` skills bundled with this pack.

*Patterns adapted from ECC's database-reviewer agent and postgres-patterns/mysql-patterns/database-migrations skills, which credit Supabase's postgres-best-practices (MIT license).*

Workflow steps:

- db-review: Invoke the database-reviewer subagent over the current diff (or $ARGUMENTS if given). Report findings grouped by area (indexing, schema, migration safety, security) with file:line and fix for each. End with a clear verdict.
- migration-review: Invoke the database-reviewer subagent over the migration at $ARGUMENTS (or the most recently added/changed migration file if not given). Check specifically: (1) does any DDL statement hold a full-table lock on a table that can be large in production — e.g. a plain CREATE INDEX instead of CONCURRENTLY, or ADD COLUMN ... NOT NULL with no default; (2) is there a rollback path (a DOWN migration, or an explicit note that it's forward-only with a remediation plan); (3) is any data backfill batched (bounded LIMIT + commit per batch) rather than a single unbounded UPDATE, and kept in a separate migration from the schema change. Report each of the three areas with file:line, verdict (pass/fail), and the concrete fix if it fails.

- After an edit, lint SQL and migrations with sqlfluff when it is installed.
- Reminder from database-review: schema/migration file edits need a documented rollback path (or explicit forward-only + remediation plan) and must not hold long locks on production-sized tables — batch backfills, build indexes concurrently, and avoid NOT NULL columns without a default on existing large tables.

## Skills

### postgres-patterns

PostgreSQL indexing, schema, RLS, pagination, and configuration patterns. Use when writing SQL queries or migrations, designing schemas, troubleshooting slow queries, implementing Row Level Security, or setting up connection pooling.

# PostgreSQL Patterns

Quick reference for PostgreSQL best practices. For detailed guidance, use the `database-reviewer` agent.

## When to Activate

- Writing SQL queries or migrations
- Designing database schemas
- Troubleshooting slow queries
- Implementing Row Level Security
- Setting up connection pooling

## Quick Reference

### Index Cheat Sheet

| Query Pattern | Index Type | Example |
|--------------|------------|---------|
| `WHERE col = value` | B-tree (default) | `CREATE INDEX idx ON t (col)` |
| `WHERE col > value` | B-tree | `CREATE INDEX idx ON t (col)` |
| `WHERE a = x AND b > y` | Composite | `CREATE INDEX idx ON t (a, b)` |
| `WHERE jsonb @> '{}'` | GIN | `CREATE INDEX idx ON t USING gin (col)` |
| `WHERE tsv @@ query` | GIN | `CREATE INDEX idx ON t USING gin (col)` |
| Time-series ranges | BRIN | `CREATE INDEX idx ON t USING brin (col)` |

### Data Type Quick Reference

| Use Case | Correct Type | Avoid |
|----------|-------------|-------|
| IDs | `bigint` | `int`, random UUID |
| Strings | `text` | `varchar(255)` |
| Timestamps | `timestamptz` | `timestamp` |
| Money | `numeric(10,2)` | `float` |
| Flags | `boolean` | `varchar`, `int` |

### Common Patterns

**Composite Index Order:**
```sql
-- Equality columns first, then range columns
CREATE INDEX idx ON orders (status, created_at);
-- Works for: WHERE status = 'pending' AND created_at > '2024-01-01'
```

**Covering Index:**
```sql
CREATE INDEX idx ON users (email) INCLUDE (name, created_at);
-- Avoids table lookup for SELECT email, name, created_at
```

**Partial Index:**
```sql
CREATE INDEX idx ON users (email) WHERE deleted_at IS NULL;
-- Smaller index, only includes active users
```

**RLS Policy (Optimized):**
```sql
CREATE POLICY policy ON orders
  USING ((SELECT auth.uid()) = user_id);  -- Wrap in SELECT!
```

**UPSERT:**
```sql
INSERT INTO settings (user_id, key, value)
VALUES (123, 'theme', 'dark')
ON CONFLICT (user_id, key)
DO UPDATE SET value = EXCLUDED.value;
```

**Cursor Pagination:**
```sql
SELECT * FROM products WHERE id > $last_id ORDER BY id LIMIT 20;
-- O(1) vs OFFSET which is O(n)
```

**Queue Processing:**
```sql
UPDATE jobs SET status = 'processing'
WHERE id = (
  SELECT id FROM jobs WHERE status = 'pending'
  ORDER BY created_at LIMIT 1
  FOR UPDATE SKIP LOCKED
) RETURNING *;
```

### Anti-Pattern Detection

```sql
-- Find unindexed foreign keys
SELECT conrelid::regclass, a.attname
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
WHERE c.contype = 'f'
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = c.conrelid AND a.attnum = ANY(i.indkey)
  );

-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC;

-- Check table bloat
SELECT relname, n_dead_tup, last_vacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;
```

### Configuration Template

```sql
-- Connection limits (adjust for RAM)
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET work_mem = '8MB';

-- Timeouts
ALTER SYSTEM SET idle_in_transaction_session_timeout = '30s';
ALTER SYSTEM SET statement_timeout = '30s';

-- Monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Security defaults
REVOKE ALL ON SCHEMA public FROM public;

SELECT pg_reload_conf();
```

## Related

- Agent: `database-reviewer` - Full database review workflow
- Skill: `clickhouse-io` - ClickHouse analytics patterns
- Skill: `backend-patterns` - API and backend patterns

---

*Based on Supabase Agent Skills (credit: Supabase team) (MIT License)*

### mysql-patterns

MySQL and MariaDB schema, query, indexing, transaction, replication, and connection-pool patterns for production backends. Use when designing MySQL/MariaDB tables and indexes, reviewing migrations before they run on large tables, debugging slow queries/lock waits/deadlocks/connection exhaustion, or adding keyset pagination, upserts, full-text search, JSON columns, or queues.

# MySQL Patterns

Use this skill when working on MySQL or MariaDB schema design, migrations,
slow-query investigation, queue-style transactions, connection pools, or
production database configuration. Prefer exact version checks before applying a
feature-specific pattern because MySQL and MariaDB have diverged in several SQL
details.

## Activation

- Designing MySQL or MariaDB tables, indexes, and constraints
- Reviewing migrations before they run on large production tables
- Debugging slow queries, lock waits, deadlocks, or connection exhaustion
- Adding keyset pagination, upserts, full-text search, JSON columns, or queues
- Configuring application connection pools, read replicas, TLS, or slow logs

## Version Check

Start by identifying the engine and version:

```sql
SELECT VERSION();
SHOW VARIABLES LIKE 'version_comment';
```

Keep MySQL and MariaDB guidance separate when syntax differs:

- MySQL documents row aliases as the replacement for `VALUES(col)` in
  `ON DUPLICATE KEY UPDATE`; `VALUES(col)` is deprecated there.
- MariaDB documents `VALUES(col)` as the supported way to reference inserted
  values in `ON DUPLICATE KEY UPDATE`; use it for cross-engine compatibility.
- `SKIP LOCKED` is appropriate for queue-like work only. It skips locked rows
  and can return an inconsistent view, so do not use it for general accounting
  or integrity-sensitive reads.

## Schema Defaults

```sql
CREATE TABLE orders (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    account_id BIGINT UNSIGNED NOT NULL,
    status VARCHAR(32) NOT NULL,
    total DECIMAL(15, 2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    PRIMARY KEY (id),
    KEY idx_orders_account_status_created (account_id, status, created_at),
    KEY idx_orders_active (account_id, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Default choices:

| Use Case | Prefer | Avoid |
| --- | --- | --- |
| Surrogate primary keys | `BIGINT UNSIGNED AUTO_INCREMENT` | `INT` for tables that can grow beyond 2B rows |
| UUID lookup keys | `BINARY(16)` with conversion helpers | `VARCHAR(36)` primary keys on hot tables |
| Money and exact quantities | `DECIMAL(p, s)` | `FLOAT` or `DOUBLE` |
| User-facing text | `utf8mb4` tables and indexes | MySQL `utf8` / `utf8mb3` defaults |
| Application timestamps | `DATETIME` with UTC managed by the app | Assuming `DATETIME` stores time zone metadata |
| Soft deletes | `deleted_at DATETIME NULL` plus scoped indexes | Filtering soft-deleted rows without an index |
| Extensible status values | lookup table or constrained `VARCHAR` | `ENUM` when values change often |

## Indexing

Composite index order usually follows equality predicates first, then range or
sort columns:

```sql
CREATE INDEX idx_orders_account_status_created
    ON orders (account_id, status, created_at);

SELECT id, total
FROM orders
WHERE account_id = ?
  AND status = 'pending'
  AND created_at >= ?
ORDER BY created_at DESC
LIMIT 50;
```

Use `EXPLAIN` before adding or changing an index:

```sql
EXPLAIN
SELECT id, total
FROM orders
WHERE account_id = 123 AND status = 'pending'
ORDER BY created_at DESC
LIMIT 50;
```

Signals to investigate:

| Field | Risk Signal |
| --- | --- |
| `type` | `ALL` on a large table |
| `key` | `NULL` when a selective predicate exists |
| `rows` | Very high row estimate for an interactive path |
| `Extra` | `Using temporary`, `Using filesort`, or broad `Using where` |

Avoid adding indexes blindly. Each index increases write cost, migration time,
backup size, and buffer-pool pressure.

## Query Patterns

### Upsert

Cross-engine-compatible form:

```sql
INSERT INTO user_settings (user_id, setting_key, setting_value)
VALUES (?, ?, ?)
ON DUPLICATE KEY UPDATE
    setting_value = VALUES(setting_value),
    updated_at = CURRENT_TIMESTAMP;
```

MySQL row-alias form:

```sql
INSERT INTO user_settings (user_id, setting_key, setting_value)
VALUES (?, ?, ?) AS new
ON DUPLICATE KEY UPDATE
    setting_value = new.setting_value,
    updated_at = CURRENT_TIMESTAMP;
```

Use the row-alias form only after confirming the target is MySQL. Use
`VALUES(col)` for MariaDB or mixed MySQL/MariaDB fleets.

### Keyset Pagination

```sql
SELECT id, name, created_at
FROM products
WHERE (created_at, id) < (?, ?)
ORDER BY created_at DESC, id DESC
LIMIT 50;
```

Back it with an index that matches the cursor:

```sql
CREATE INDEX idx_products_created_id ON products (created_at, id);
```

Do not use deep `OFFSET` pagination on large tables; it makes the server scan
and discard rows before returning the page.

### JSON Fields

Use JSON columns for extension data, not for fields that need heavy relational
filtering or constraints.

```sql
CREATE TABLE events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    payload JSON NOT NULL,
    event_type VARCHAR(64)
        GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(payload, '$.type'))) STORED,
    KEY idx_events_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

For frequently queried JSON paths, expose a generated column and index that
column. Keep foreign keys, ownership, tenancy, and lifecycle fields relational.

### Full-Text Search

```sql
ALTER TABLE articles ADD FULLTEXT KEY ft_articles_title_body (title, body);

SELECT id, title, MATCH(title, body) AGAINST (? IN NATURAL LANGUAGE MODE) AS score
FROM articles
WHERE MATCH(title, body) AGAINST (? IN NATURAL LANGUAGE MODE)
ORDER BY score DESC
LIMIT 20;
```

Use external search when you need typo tolerance, complex ranking, cross-table
facets, or language-specific analysis beyond built-in full-text behavior.

## Transactions

Keep transactions short and lock rows in a consistent order:

```sql
START TRANSACTION;

SELECT id, balance
FROM accounts
WHERE id IN (?, ?)
ORDER BY id
FOR UPDATE;

UPDATE accounts SET balance = balance - ? WHERE id = ?;
UPDATE accounts SET balance = balance + ? WHERE id = ?;

COMMIT;
```

Deadlock and lock-wait checklist:

- Lock rows in a deterministic order across code paths.
- Do external API calls before opening the transaction, not inside it.
- Add indexes for predicates used in `UPDATE`, `DELETE`, and locking reads.
- On deadlock, roll back and retry the whole transaction with a bounded retry
  budget.
- Capture `SHOW ENGINE INNODB STATUS\G` soon after a deadlock; it is overwritten
  by later events.

Queue-style worker claim:

```sql
START TRANSACTION;

SELECT id
FROM jobs
WHERE status = 'pending'
ORDER BY created_at
LIMIT 1
FOR UPDATE SKIP LOCKED;

UPDATE jobs
SET status = 'processing', started_at = CURRENT_TIMESTAMP
WHERE id = ?;

COMMIT;
```

Use `SKIP LOCKED` only for queue-like workloads where skipping a locked row is
acceptable. It is not a replacement for normal transactional consistency.

## Connection Pools

SQLAlchemy example:

```python
from sqlalchemy import create_engine

engine = create_engine(
    "mysql+mysqlconnector://app:secret@db.internal/app",
    pool_size=10,
    max_overflow=5,
    pool_timeout=30,
    pool_recycle=240,
    pool_pre_ping=True,
    connect_args={"connect_timeout": 5},
)
```

Node.js `mysql2` example:

```javascript
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000,
});

const [rows] = await pool.execute(
  'SELECT id, total FROM orders WHERE account_id = ? LIMIT 50',
  [accountId],
);
```

Keep application pool recycling below the server `wait_timeout`. If the server
uses `wait_timeout = 300`, a `pool_recycle` around 240 seconds is coherent;
`pool_pre_ping` still helps recover from network and failover events.

## Diagnostics

Useful first-pass commands:

```sql
SHOW FULL PROCESSLIST;
SHOW ENGINE INNODB STATUS\G;
SHOW VARIABLES LIKE 'slow_query_log';
SHOW VARIABLES LIKE 'long_query_time';
```

Enable the slow log in a controlled environment:

```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;
SET GLOBAL log_queries_not_using_indexes = 'ON';
```

Use `EXPLAIN ANALYZE` only when it is safe to execute the query. It runs the
statement and can be expensive on production-sized data.

## Replication

Read replicas can lag. Do not route read-your-own-write paths, checkout flows,
permission checks, or idempotency-key reads to a replica immediately after a
write.

```sql
-- MySQL legacy terminology, still common in existing fleets
SHOW SLAVE STATUS\G;

-- Newer terminology where supported
SHOW REPLICA STATUS\G;
```

Check the engine/version before standardizing on one command. Monitor replica
SQL thread health, IO thread health, and lag, not just whether the TCP
connection is alive.

## Security

```sql
CREATE USER 'app'@'%' IDENTIFIED BY 'use-a-secret-manager';
GRANT SELECT, INSERT, UPDATE, DELETE ON appdb.* TO 'app'@'%';

ALTER USER 'app'@'%' REQUIRE SSL;

SELECT user, host
FROM mysql.user
WHERE user = '';

DROP USER IF EXISTS ''@'localhost';
DROP USER IF EXISTS ''@'%';
```

Security review points:

- Do not grant `ALL PRIVILEGES` or `*.*` to application users.
- Require TLS for application users when traffic crosses hosts or networks.
- Store credentials in the platform secret manager, not in examples, scripts, or
  repository files.
- Separate migration/admin users from runtime application users.
- Audit public network exposure and bind addresses before tuning performance.

## Configuration

Example starting point for a dedicated database host:

```ini
[mysqld]
innodb_buffer_pool_size = 4G
innodb_flush_log_at_trx_commit = 1
sync_binlog = 1

max_connections = 300
thread_cache_size = 50

wait_timeout = 300
interactive_timeout = 300
innodb_lock_wait_timeout = 10

slow_query_log = ON
long_query_time = 1
log_queries_not_using_indexes = ON

log_bin = mysql-bin
binlog_format = ROW
binlog_expire_logs_seconds = 604800
```

Treat configuration values as a prompt for review, not a universal preset. Size
memory, connections, log retention, and durability settings from workload,
hardware, backup policy, and recovery objectives.

## Anti-Patterns

| Anti-Pattern | Risk | Better Pattern |
| --- | --- | --- |
| `SELECT *` in hot paths | Over-fetching and brittle clients | Select explicit columns |
| Deep `OFFSET` pagination | Linear scans and slow pages | Keyset pagination |
| No index on foreign-key joins | Slow joins and lock-heavy deletes | Index FK columns intentionally |
| Long transactions | Lock waits and large undo history | Commit small units of work |
| Direct DML against `mysql.user` | Grant-table corruption risk | Use `CREATE USER`, `ALTER USER`, `DROP USER` |
| Application user with admin grants | High blast radius | Least-privilege runtime user |
| Pool recycle above `wait_timeout` | Stale pooled connections | Recycle below timeout and pre-ping |
| Replica reads after writes | Stale user-facing state | Pin read-after-write flows to primary |

## Output Expectations

When this skill is used for review, return:

1. Engine/version assumptions.
2. Highest-risk correctness, lock, security, and migration issues.
3. Exact SQL or code changes for the safe path.
4. Validation plan: `EXPLAIN`, migration dry run, lock/deadlock check, and
   rollback criteria.
5. Any MySQL/MariaDB syntax differences that affect the recommendation.

## Related

- Skill: `postgres-patterns` - PostgreSQL-specific schema and query patterns
- Skill: `database-migrations` - migration planning and rollout safety
- Skill: `backend-patterns` - API and service-layer patterns
- Skill: `security-review` - secret handling, auth, and least privilege
- Agent: `database-reviewer` - broader database review workflow

### database-migrations

Safe, reversible database schema-change patterns across PostgreSQL, MySQL, and common ORMs (Prisma, Drizzle, Kysely, Django, golang-migrate). Use when creating or altering tables, adding/removing columns or indexes, running data migrations, or planning zero-downtime schema changes.

# Database Migration Patterns

Safe, reversible database schema changes for production systems.

## When to Activate

- Creating or altering database tables
- Adding/removing columns or indexes
- Running data migrations (backfill, transform)
- Planning zero-downtime schema changes
- Setting up migration tooling for a new project

## Core Principles

1. **Every change is a migration** — never alter production databases manually
2. **Migrations are forward-only in production** — rollbacks use new forward migrations
3. **Schema and data migrations are separate** — never mix DDL and DML in one migration
4. **Test migrations against production-sized data** — a migration that works on 100 rows may lock on 10M
5. **Migrations are immutable once deployed** — never edit a migration that has run in production

## Migration Safety Checklist

Before applying any migration:

- [ ] Migration has both UP and DOWN (or is explicitly marked irreversible)
- [ ] No full table locks on large tables (use concurrent operations)
- [ ] New columns have defaults or are nullable (never add NOT NULL without default)
- [ ] Indexes created concurrently (not inline with CREATE TABLE for existing tables)
- [ ] Data backfill is a separate migration from schema change
- [ ] Tested against a copy of production data
- [ ] Rollback plan documented

## PostgreSQL Patterns

### Adding a Column Safely

```sql
-- GOOD: Nullable column, no lock
ALTER TABLE users ADD COLUMN avatar_url TEXT;

-- GOOD: Column with default (Postgres 11+ is instant, no rewrite)
ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- BAD: NOT NULL without default on existing table (requires full rewrite)
ALTER TABLE users ADD COLUMN role TEXT NOT NULL;
-- This locks the table and rewrites every row
```

### Adding an Index Without Downtime

```sql
-- BAD: Blocks writes on large tables
CREATE INDEX idx_users_email ON users (email);

-- GOOD: Non-blocking, allows concurrent writes
CREATE INDEX CONCURRENTLY idx_users_email ON users (email);

-- Note: CONCURRENTLY cannot run inside a transaction block
-- Most migration tools need special handling for this
```

### Renaming a Column (Zero-Downtime)

Never rename directly in production. Use the expand-contract pattern:

```sql
-- Step 1: Add new column (migration 001)
ALTER TABLE users ADD COLUMN display_name TEXT;

-- Step 2: Backfill data (migration 002, data migration)
UPDATE users SET display_name = username WHERE display_name IS NULL;

-- Step 3: Update application code to read/write both columns
-- Deploy application changes

-- Step 4: Stop writing to old column, drop it (migration 003)
ALTER TABLE users DROP COLUMN username;
```

### Removing a Column Safely

```sql
-- Step 1: Remove all application references to the column
-- Step 2: Deploy application without the column reference
-- Step 3: Drop column in next migration
ALTER TABLE orders DROP COLUMN legacy_status;

-- For Django: use SeparateDatabaseAndState to remove from model
-- without generating DROP COLUMN (then drop in next migration)
```

### Large Data Migrations

```sql
-- BAD: Updates all rows in one transaction (locks table)
UPDATE users SET normalized_email = LOWER(email);

-- GOOD: Batch update with progress
DO $$
DECLARE
  batch_size INT := 10000;
  rows_updated INT;
BEGIN
  LOOP
    UPDATE users
    SET normalized_email = LOWER(email)
    WHERE id IN (
      SELECT id FROM users
      WHERE normalized_email IS NULL
      LIMIT batch_size
      FOR UPDATE SKIP LOCKED
    );
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE 'Updated % rows', rows_updated;
    EXIT WHEN rows_updated = 0;
    COMMIT;
  END LOOP;
END $$;
```

## Prisma (TypeScript/Node.js)

### Workflow

```bash
# Create migration from schema changes
npx prisma migrate dev --name add_user_avatar

# Apply pending migrations in production
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset

# Generate client after schema changes
npx prisma generate
```

### Schema Example

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  avatarUrl String?  @map("avatar_url")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  orders    Order[]

  @@map("users")
  @@index([email])
}
```

### Custom SQL Migration

For operations Prisma cannot express (concurrent indexes, data backfills):

```bash
# Create empty migration, then edit the SQL manually
npx prisma migrate dev --create-only --name add_email_index
```

```sql
-- migrations/20240115_add_email_index/migration.sql
-- Prisma cannot generate CONCURRENTLY, so we write it manually
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users (email);
```

## Drizzle (TypeScript/Node.js)

### Workflow

```bash
# Generate migration from schema changes
npx drizzle-kit generate

# Apply migrations
npx drizzle-kit migrate

# Push schema directly (dev only, no migration file)
npx drizzle-kit push
```

### Schema Example

```typescript
import { pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

## Kysely (TypeScript/Node.js)

### Workflow (kysely-ctl)

```bash
# Initialize config file (kysely.config.ts)
kysely init

# Create a new migration file
kysely migrate make add_user_avatar

# Apply all pending migrations
kysely migrate latest

# Rollback last migration
kysely migrate down

# Show migration status
kysely migrate list
```

### Migration File

```typescript
// migrations/2024_01_15_001_create_user_profile.ts
import { type Kysely, sql } from 'kysely'

// IMPORTANT: Always use Kysely<any>, not your typed DB interface.
// Migrations are frozen in time and must not depend on current schema types.
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('user_profile')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('email', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('avatar_url', 'text')
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .execute()

  await db.schema
    .createIndex('idx_user_profile_avatar')
    .on('user_profile')
    .column('avatar_url')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('user_profile').execute()
}
```

### Programmatic Migrator

```typescript
import { Migrator, FileMigrationProvider } from 'kysely'
import { promises as fs } from 'fs'
import * as path from 'path'
// ESM only — CJS can use __dirname directly
import { fileURLToPath } from 'url'
const migrationFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  './migrations',
)

// `db` is your Kysely<any> database instance
const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder,
  }),
  // WARNING: Only enable in development. Disables timestamp-ordering
  // validation, which can cause schema drift between environments.
  // allowUnorderedMigrations: true,
})

const { error, results } = await migrator.migrateToLatest()

results?.forEach((it) => {
  if (it.status === 'Success') {
    console.log(`migration "${it.migrationName}" executed successfully`)
  } else if (it.status === 'Error') {
    console.error(`failed to execute migration "${it.migrationName}"`)
  }
})

if (error) {
  console.error('migration failed', error)
  process.exit(1)
}
```

## Django (Python)

### Workflow

```bash
# Generate migration from model changes
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Show migration status
python manage.py showmigrations

# Generate empty migration for custom SQL
python manage.py makemigrations --empty app_name -n description
```

### Data Migration

```python
from django.db import migrations

def backfill_display_names(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    batch_size = 5000
    users = User.objects.filter(display_name="")
    while users.exists():
        batch = list(users[:batch_size])
        for user in batch:
            user.display_name = user.username
        User.objects.bulk_update(batch, ["display_name"], batch_size=batch_size)

def reverse_backfill(apps, schema_editor):
    pass  # Data migration, no reverse needed

class Migration(migrations.Migration):
    dependencies = [("accounts", "0015_add_display_name")]

    operations = [
        migrations.RunPython(backfill_display_names, reverse_backfill),
    ]
```

### SeparateDatabaseAndState

Remove a column from the Django model without dropping it from the database immediately:

```python
class Migration(migrations.Migration):
    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.RemoveField(model_name="user", name="legacy_field"),
            ],
            database_operations=[],  # Don't touch the DB yet
        ),
    ]
```

## golang-migrate (Go)

### Workflow

```bash
# Create migration pair
migrate create -ext sql -dir migrations -seq add_user_avatar

# Apply all pending migrations
migrate -path migrations -database "$DATABASE_URL" up

# Rollback last migration
migrate -path migrations -database "$DATABASE_URL" down 1

# Force version (fix dirty state)
migrate -path migrations -database "$DATABASE_URL" force VERSION
```

### Migration Files

```sql
-- migrations/000003_add_user_avatar.up.sql
ALTER TABLE users ADD COLUMN avatar_url TEXT;
CREATE INDEX CONCURRENTLY idx_users_avatar ON users (avatar_url) WHERE avatar_url IS NOT NULL;

-- migrations/000003_add_user_avatar.down.sql
DROP INDEX IF EXISTS idx_users_avatar;
ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;
```

## Zero-Downtime Migration Strategy

For critical production changes, follow the expand-contract pattern:

```
Phase 1: EXPAND
  - Add new column/table (nullable or with default)
  - Deploy: app writes to BOTH old and new
  - Backfill existing data

Phase 2: MIGRATE
  - Deploy: app reads from NEW, writes to BOTH
  - Verify data consistency

Phase 3: CONTRACT
  - Deploy: app only uses NEW
  - Drop old column/table in separate migration
```

### Timeline Example

```
Day 1: Migration adds new_status column (nullable)
Day 1: Deploy app v2 — writes to both status and new_status
Day 2: Run backfill migration for existing rows
Day 3: Deploy app v3 — reads from new_status only
Day 7: Migration drops old status column
```

## Anti-Patterns

| Anti-Pattern | Why It Fails | Better Approach |
|-------------|-------------|-----------------|
| Manual SQL in production | No audit trail, unrepeatable | Always use migration files |
| Editing deployed migrations | Causes drift between environments | Create new migration instead |
| NOT NULL without default | Locks table, rewrites all rows | Add nullable, backfill, then add constraint |
| Inline index on large table | Blocks writes during build | CREATE INDEX CONCURRENTLY |
| Schema + data in one migration | Hard to rollback, long transactions | Separate migrations |
| Dropping column before removing code | Application errors on missing column | Remove code first, drop column next deploy |
