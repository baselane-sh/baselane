# System map

`ARCHITECTURE.md` at the repo root carries a baselane-managed region generated from static
analysis: languages, layout, commands, import-graph hotspots, and measured conventions —
including **hidden rules** (conventions the code follows at >=90% consistency that no lint
config enforces). Human prose outside the managed region is never touched.

## Regenerating

Run `baselane map .` from the repo root after structural changes (modules added/moved,
commands changed, conventions shifted). Add `--llm` for an AI-narrated architecture section
(needs BASELANE_ANTHROPIC_KEY or ANTHROPIC_API_KEY). Commit the refreshed `ARCHITECTURE.md`
and `.baselane/system-map/report.json` together.

## Reading it

Consult ARCHITECTURE.md's conventions section before writing code — the hidden rules are the
ones nobody will tell you about in review until you break them.
