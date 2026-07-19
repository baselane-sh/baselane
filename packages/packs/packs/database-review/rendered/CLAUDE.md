# CLAUDE.md

@AGENTS.md

This project defines a native Claude Code implementation of this workflow pack:
- Subagent: `.claude/agents/database-reviewer.md`
- Command: `.claude/commands/db-review.md`
- Command: `.claude/commands/migration-review.md`
- Command: `.claude/commands/map.md`
- Hooks: see `.claude/settings.json`
- Skill: `.claude/skills/postgres-patterns/SKILL.md` — PostgreSQL indexing, schema, RLS, pagination, and configuration patterns. Use when writing SQL queries or migrations, designing schemas, troubleshooting slow queries, implementing Row Level Security, or setting up connection pooling.
- Skill: `.claude/skills/mysql-patterns/SKILL.md` — MySQL and MariaDB schema, query, indexing, transaction, replication, and connection-pool patterns for production backends. Use when designing MySQL/MariaDB tables and indexes, reviewing migrations before they run on large tables, debugging slow queries/lock waits/deadlocks/connection exhaustion, or adding keyset pagination, upserts, full-text search, JSON columns, or queues.
- Skill: `.claude/skills/database-migrations/SKILL.md` — Safe, reversible database schema-change patterns across PostgreSQL, MySQL, and common ORMs (Prisma, Drizzle, Kysely, Django, golang-migrate). Use when creating or altering tables, adding/removing columns or indexes, running data migrations, or planning zero-downtime schema changes.
