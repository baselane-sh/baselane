---
description: Run the Django reviewer over the current change for ORM correctness, DRF patterns, migration safety, and security.
argument-hint: [base ref]
---

Invoke the django-reviewer subagent on the changed Django files (the diff since $ARGUMENTS, or the working tree if no ref is given). It checks ORM correctness (N+1, atomic(), bulk_create), DRF serializer/permission/pagination patterns, migration safety, and security misconfigurations (mark_safe, CSRF, DEBUG, SECRET_KEY), reporting file:line + severity. Run `python-review` too for general Python quality. Fix any CRITICAL or HIGH findings before merging.
