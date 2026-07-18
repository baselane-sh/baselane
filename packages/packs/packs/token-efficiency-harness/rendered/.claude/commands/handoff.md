---
description: End the session with a durable handoff note in memory so the next session starts clean and cheap.
argument-hint: [note-name]
---

Write a durable handoff note under `.baselane/memory/` — a new fact file with `name`/`description` frontmatter plus a line in `.baselane/memory/MEMORY.md` — covering what was completed (with commit hashes), what remains, key files and decisions, and the exact next step. Keep it under 40 lines, then tell the user to /clear and resume from memory next session.
