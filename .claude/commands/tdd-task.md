---
description: Implement a planned task test-first with the red-green-refactor loop and independent verification.
argument-hint: [task]
---

For $ARGUMENTS, follow the 6-step red-green-refactor loop: (1) write a failing test; (2) run it and watch it fail for the right reason; (3) write the minimal code to pass; (4) run it and watch it pass; (5) refactor while green; (6) re-run the full suite. Keep line coverage at or above 80%. Then invoke the checker subagent to independently verify, and only then report done.
