# Memory protocol

This directory holds durable facts the AI has learned while working on this project —
one fact per file, plus an index. Consult the index before acting; add a fact after
learning something durable (a decision, a correction, a constraint that isn't obvious
from the code).

## Format

Each fact is a single markdown file with simple frontmatter:

```markdown
---
name: <short-kebab-case-slug>
description: <one-line summary — used to decide relevance during recall>
---

<the fact, in a sentence or two.>
```

## Index

`MEMORY.md` in this directory lists every fact, one line per file, so the index alone
can be scanned without opening each one:

```markdown
- [Title](file.md) — one-line hook
```

## Rule

- Consult `MEMORY.md` before acting — recall what's already known.
- After learning something durable, write a new fact file and add a line to
  `MEMORY.md`. Use `/remember <fact>` to do both in one step.
