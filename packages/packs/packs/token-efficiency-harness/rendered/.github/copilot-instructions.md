# Copilot instructions

## Token-efficiency discipline

Each turn re-sends the whole session, so keep it small:

- **One task, one session.** When a task is done, `/clear`. For genuinely long tasks, `/compact` at milestones (after a feature lands, never mid-debug).
- **Hand off instead of continuing.** End multi-day work by writing a handoff note into repo memory (`/handoff`), then start tomorrow clean from that note.
- **Tier your models.** The main conversation gets the best model; search, mechanical edits, and fan-out go to cheaper subagents. Five parallel top-tier agents burn five times the rate.
- **Cap extended thinking** for routine work (`MAX_THINKING_TOKENS=10000`); raise it only for genuinely hard problems.
- **Specific beats short.** One precise sentence replaces three exploratory rounds. Grep logs first and paste the 10 relevant lines, never the 500-line dump — a paste is re-sent on every following turn.
- **Work in bursts.** The prompt cache expires after a few idle minutes; rapid-fire turns replay history cheaply, sporadic drips rebuild it at full price.
- **Budget every autonomous run.** State a token budget and a definition of done, and require a diff summary plus self-review at the end so a stuck loop cannot retry forever.

## Workflow pack: Token-efficiency harness

Keeps per-turn context small: one task per session, model tiering, capped thinking, and budgeted autonomous runs — the habits that keep token spend down without cutting output.

When acting as the scout role: You are a scout. Locate what was asked for (files, symbols, call sites, config values) as quickly and cheaply as possible. Return findings as a short list of file:line references with a one-line note each. Do not paste file contents unless a specific excerpt was requested, and never more than 10 lines of it.

Workflow steps:

- handoff: Write a durable handoff note under `.baselane/memory/` — a new fact file with `name`/`description` frontmatter plus a line in `.baselane/memory/MEMORY.md` — covering what was completed (with commit hashes), what remains, key files and decisions, and the exact next step. Keep it under 40 lines, then tell the user to /clear and resume from memory next session.
- usage-audit: Run `npx ccusage@latest` via Bash and read the breakdown. Report: the top model by tokens, cache-read volume versus fresh input, and the single highest-impact change from the token-efficiency rules in AGENTS.md (session hygiene, model tiering, thinking cap, or run budgets). End with one concrete habit change for this user.

- Tier your subagents: search/mechanical work runs on haiku or sonnet — reserve the top model for the main loop.
