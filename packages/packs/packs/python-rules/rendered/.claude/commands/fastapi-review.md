---
description: Run the FastAPI reviewer over the current change for async correctness, DI, schemas, and API security.
argument-hint: [base ref]
---

Invoke the fastapi-reviewer subagent on the changed FastAPI files (the diff since $ARGUMENTS, or the working tree if no ref is given). It checks app construction, routing, Pydantic request/response schemas, async dependency injection, auth/CORS/rate limits, and test dependency overrides, reporting file:line + severity plus `Tests checked:` and `Residual risk:`. Fix any Critical or High findings before merging.
