---
description: Look up a topic, record or update one, or run a lint pass over the wiki.
argument-hint: <topic to look up | fact to record | "lint">
---

Follow the wiki protocol in `.baselane/wiki/README.md` (or `wiki/README.md`) for $ARGUMENTS. If this is a lookup, read `index.md` first, then the relevant page(s), before answering — if the answer required real synthesis, save it as a new page. If this is new or changed durable knowledge, create or update the relevant page (OKF frontmatter with at least `type`), update cross-links, add or update its `index.md` line, and append a `log.md` entry. If $ARGUMENTS is "lint" (or empty), scan every page for contradictions, stale claims, orphan pages missing from the index, and broken cross-links — reconcile contradictions rather than leaving them, since corrections beat additions.
