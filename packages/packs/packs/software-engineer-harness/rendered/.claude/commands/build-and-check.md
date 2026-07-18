---
description: Run the build/verify loop until the suite is green or a retry budget is exhausted.
argument-hint: [target]
---

Build or apply the pending change for $ARGUMENTS, then invoke the checker subagent to verify. If it fails, fix and repeat, up to 3 rounds; stop and report if still red after 3 rounds.
