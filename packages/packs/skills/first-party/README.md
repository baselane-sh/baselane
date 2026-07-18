# First-party skills

Baselane-authored skills, distributed alongside the imported third-party seed catalog.

Unlike the rest of `skills/` — which `scripts/import-skills.ts` fetches from upstream repos and
**wipes and rebuilds on every re-import** — everything under this `first-party/` directory is
hand-authored and version-controlled here. `resetFetchedArea()` in the import script preserves this
subtree, so re-running the fetch never clobbers it.

## Layout

```
first-party/
  manifest.json          # [{ name, category }] — the skills to load, in catalog order
  <skill-name>/SKILL.md  # one dir per skill; standard agentskills.io SKILL.md (frontmatter + body)
```

## Conventions

- **No `attribution`.** First-party skills are ours; they carry no third-party licence notice and no
  `LICENSE` file. `loadSeedSkills` tags them `source: "baselane"` (`FIRST_PARTY_SOURCE`), which drives
  the catalog's first-party/third-party filter.
- **Must pass `validateSkill`** — slug name, single-line description (≤1024 chars), body ≤500 lines.
- **`category`** is one of the phase slugs (`plan` / `write` / `debug` / `review` / `ship`) or any
  custom org category; it is baselane-side taxonomy and is never written into SKILL.md frontmatter.

## Adding a skill

1. Create `first-party/<name>/SKILL.md`.
2. Add `{ "name": "<name>", "category": "<phase>" }` to `manifest.json`.
3. `loadSeedSkills()` picks it up automatically — it becomes catalog-visible, importable, and
   overlap-detectable with no further wiring.
