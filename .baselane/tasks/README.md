# Tasks & progress ledger

This directory anchors multi-session AI work so it survives context compaction — the
plan lives in one file, completed work is logged in another, and neither depends on
what an agent remembers from a prior session.

## Files

- `PLAN.md` — at the repo root, or `.baselane/tasks/PLAN.md` if the root is reserved
  for something else. The plan, as bite-size checkboxed tasks:

  ```markdown
  - [ ] Add the tasks-ledger capability
  - [x] Wire render-pack.ts and bundle.ts
  ```

- `.baselane/tasks/progress.md` — an append-only ledger, one line per completed step,
  each with a commit reference:

  ```markdown
  - 2026-07-09: Wired render-pack.ts and bundle.ts — commit `a1b2c3d`
  ```

  Never rewrite a line once it's committed to the ledger — only append.

## Rule

- **On session start, read the ledger before the plan.** `progress.md` says what is
  actually done; `PLAN.md` says what was intended. Trust the ledger and `git log`
  over either your own memory or a stale-looking checkbox — a checkbox can lag behind
  reality, but a completed-and-committed ledger line cannot.
- **Append after each completed step**, not in a batch at the end of the session. The
  ledger's value is that it survives a compaction or a dropped session mid-task; a step
  that isn't logged until "later" is a step that can be lost.
- Use `/plan-work` to draft or refresh `PLAN.md` as checkboxed tasks from a spec or
  requirement.
