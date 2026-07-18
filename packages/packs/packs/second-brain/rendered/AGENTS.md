# AGENTS.md

<!-- generated from workflow-pack second-brain v1.0.0 -->

## Second brain (OKF wiki + memory)

This project keeps a durable second brain the AI reads before acting and writes after learning:

- `.baselane/wiki/` — an Open Knowledge Format (OKF) knowledge base for project knowledge: architecture, decisions, gotchas, runbooks. One concept per file (with a `type` frontmatter field), plus an `index.md` and an append-only `log.md`.
- `.baselane/memory/` — durable one-line facts (decisions, corrections, non-obvious constraints), indexed by `MEMORY.md`.

Read `index.md` and `MEMORY.md` before acting — recall what's already known rather than re-deriving it. After learning something durable, ingest it (a wiki page or a memory fact) together with its index and log lines. Corrections beat additions: reconcile contradictions rather than letting them pile up. Use `/wiki` and `/remember` for one-step capture; the `librarian` subagent handles the bookkeeping and periodic lint.

## Harness capabilities

- wiki · repo · baselane — provisioned
- wiki · org · baselane — provisioned
- memory · repo · files — provisioned
- memory · org · files — provisioned

### Memory

Consult `.baselane/memory/` and its `MEMORY.md` index before acting — it holds durable facts from past sessions. Use `/remember` to add one after learning something durable.

### Wiki

`.baselane/wiki/` is an OKF-compliant knowledge base: read `index.md` and the relevant pages before acting, and ingest new durable knowledge into a page (with its index and log lines) after learning it. Use `/wiki` to look up, record, or lint.

## Workflow pack: Second Brain (OKF)

A durable second brain for every repo and laptop: an Open Knowledge Format (OKF) wiki for project knowledge — architecture, decisions, gotchas, runbooks — plus a memory store of durable one-line facts, maintained by a librarian subagent that ingests what the team learns and lints for contradictions. The discipline is read-before-acting and write-after-learning, and the AI keeps the bookkeeping, not you. Built on the Karpathy "LLM Wiki" ingest/query/lint loop and Google's Open Knowledge Format. It ships the format and the habit, not pre-filled content — the brain accumulates as the team works.

### Roles

- **librarian** — Knowledge-base keeper: ingests durable knowledge into the OKF wiki and memory, and lints them for contradictions, stale claims, orphan pages, and broken cross-links.

### Guardrails

- At session start, recall the second brain before acting.

Tool-specific implementations live alongside this file (see `CLAUDE.md` for the Claude Code implementation). Tools without a native subagent/command surface should treat the sections above as operating instructions.
