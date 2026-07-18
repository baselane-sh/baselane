---
description: Audit local Claude Code token usage and recommend the highest-impact fix.
argument-hint: [optional]
---

Run `npx ccusage@latest` via Bash and read the breakdown. Report: the top model by tokens, cache-read volume versus fresh input, and the single highest-impact change from the token-efficiency rules in AGENTS.md (session hygiene, model tiering, thinking cap, or run budgets). End with one concrete habit change for this user.
