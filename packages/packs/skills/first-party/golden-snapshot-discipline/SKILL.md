---
name: golden-snapshot-discipline
description: Use when a code path has committed golden/snapshot output — treat a snapshot diff as a signal, review it before regenerating, and update the golden only when the change in output is intentional.
---

# Golden snapshot discipline

A golden snapshot is committed expected output — rendered files, serialized structures, generated
text — that a test compares byte-for-byte against what the code produces now. Its whole value is
that **an unintended change to output shows up as a failing diff.** Regenerating snapshots
reflexively to make the test pass throws that value away.

## The rule

- **A snapshot diff is a question, not a chore.** When a golden test fails, read the diff first. Did
  *this* change intend to alter that output?
- **Intended change → update the golden in the same commit,** so the diff is reviewable alongside the
  code that caused it. The reviewer sees both the cause and the effect.
- **Unintended change → you found a bug.** Fix the code; do not update the golden. The snapshot just
  did its job.
- **Never regenerate blindly.** `--update`-ing every snapshot to get green is how a real regression
  silently becomes the new "expected."

## Workflow

```
1. Run the tests → a golden fails.
2. Read the diff. Is every changed byte something this change was supposed to do?
   - YES → regenerate the golden, commit code + golden together, call out the output change.
   - NO  → stop. The code is wrong. Fix it; the golden stays.
```

## Why this matters

- **Catches action-at-a-distance.** A refactor "far away" from the output path that nonetheless
  shifts a byte is exactly what goldens exist to surface.
- **Makes output changes explicit and reviewed.** A golden update in a diff is a visible,
  human-approved statement: "yes, the output changed, on purpose, this way."

## Authoring goldens that stay useful

- Keep them **deterministic** — sort keys, pin timestamps/versions/random seeds, normalize line
  endings — so a passing test means "output is correct," not "output happened to match today."
- Keep them **readable** — a golden a human can eyeball makes review of its diffs meaningful.
- Scope them tightly — one golden per unit of output, so a failure points at what changed.
