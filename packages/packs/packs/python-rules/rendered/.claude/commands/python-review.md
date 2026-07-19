---
description: Run the Python reviewer over the current change against this pack's Python standards.
argument-hint: [base ref]
---

Invoke the python-reviewer subagent on the changed Python files (the diff since $ARGUMENTS, or the working tree if no ref is given). It checks this pack's conventions — frozen dataclasses for value objects, Protocols for structural typing, `raise ... from`, and os.environ[] over silent .get() fallbacks, plus security, type hints, and code quality — and reports file:line + severity. Style and coverage are CI's job; don't re-litigate them. Fix any CRITICAL or HIGH findings before merging.
