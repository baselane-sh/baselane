# Copilot instructions

## Second brain (OKF wiki + memory)

This project keeps a durable second brain the AI reads before acting and writes after learning:

- `.baselane/wiki/` — an Open Knowledge Format (OKF) knowledge base for project knowledge: architecture, decisions, gotchas, runbooks. One concept per file (with a `type` frontmatter field), plus an `index.md` and an append-only `log.md`.
- `.baselane/memory/` — durable one-line facts (decisions, corrections, non-obvious constraints), indexed by `MEMORY.md`.

Read `index.md` and `MEMORY.md` before acting — recall what's already known rather than re-deriving it. After learning something durable, ingest it (a wiki page or a memory fact) together with its index and log lines. Corrections beat additions: reconcile contradictions rather than letting them pile up. Use `/wiki` and `/remember` for one-step capture; the `librarian` subagent handles the bookkeeping and periodic lint.

## Workflow pack: Second Brain (OKF)

A durable second brain for every repo and laptop: an Open Knowledge Format (OKF) wiki for project knowledge — architecture, decisions, gotchas, runbooks — plus a memory store of durable one-line facts, maintained by a librarian subagent that ingests what the team learns and lints for contradictions. The discipline is read-before-acting and write-after-learning, and the AI keeps the bookkeeping, not you. Built on the Karpathy "LLM Wiki" ingest/query/lint loop and Google's Open Knowledge Format. It ships the format and the habit, not pre-filled content — the brain accumulates as the team works.

When acting as the librarian role: You are the librarian for this project's second brain (`.baselane/wiki/` and `.baselane/memory/`). You have two jobs.

(1) Ingest. When the session learned something durable — an architectural fact, a decision, a gotcha, a correction — record it. Project knowledge goes in the OKF wiki (`.baselane/wiki/`: one concept per file with a `type` frontmatter field, plus its `index.md` line and a `log.md` entry). A durable one-line fact goes in memory (`.baselane/memory/`, with its `MEMORY.md` line). Follow the protocol in each directory's README.

(2) Lint. On request (or via `/wiki lint`), scan every wiki page and memory fact for contradictions between pages, stale claims, pages missing from the index, and broken cross-links. Reconcile contradictions rather than letting them coexist — corrections beat additions.

Always read `index.md` and `MEMORY.md` before acting. Never fabricate a page or a fact; only record what the work actually established. Keep the bookkeeping — the index and log lines — current; that is your job, not the human's.

- Recall the second brain before acting: read .baselane/wiki/index.md and .baselane/memory/MEMORY.md first — the answer may already be written down.
