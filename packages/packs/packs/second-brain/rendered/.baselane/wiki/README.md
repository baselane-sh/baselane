# Wiki protocol

This directory is a durable knowledge base the AI reads before acting and writes after
learning — one concept per file, plus an index and a change log, following the Karpathy
"LLM Wiki" pattern of ingest/query/lint.

This wiki is Open Knowledge Format (OKF) compliant — any OKF-reading agent can consume it.

## Format (OKF)

Each page is a single markdown file with YAML frontmatter, one concept per file:

```markdown
---
type: How-it-works
title: <optional title>
description: <optional one-line summary>
resource: <optional URI to an external system>
tags: [optional, list, of, tags]
timestamp: <optional ISO 8601 timestamp>
---

<free-form markdown body>
```

`type` is the only required frontmatter field — a free-form string naming what kind of
page this is (e.g. `How-it-works`, `Runbook`, `Decision`, `Gotcha`). Everything else in
the frontmatter is optional; the body below it is unconstrained markdown.

## Reserved files

- `index.md` — navigation. One line per page, link plus a one-line summary:

  ```markdown
  - [Title](page.md) — one-line summary of what this page covers
  ```

- `log.md` — append-only change log. One entry per change, parseable prefix:

  ```markdown
  ## [YYYY-MM-DD] <operation> | <subject>
  ```

  where `<operation>` is one of `ingest`, `query`, `lint`, and `<subject>` names the
  page(s) touched. Never rewrite a line once it's appended — only add new ones.

## Operations

- **Ingest** — when you learn something durable, create or update the relevant page(s):
  update cross-links in related pages, add or update its `index.md` line, and append a
  `log.md` entry.
- **Query** — read `index.md` first, then the relevant pages, BEFORE acting. When
  answering required real synthesis rather than a lookup, save the result as a new page —
  explorations compound instead of being redone.
- **Lint** — periodically, and via `/wiki lint`, check for: contradictions between pages,
  stale claims, orphan pages missing from `index.md`, and broken cross-links. Reconcile
  contradictions rather than letting them coexist — corrections beat additions.

## The loop rule

Read before acting. Write after learning. The tedious part is the bookkeeping — that's
your job, not the human's.
