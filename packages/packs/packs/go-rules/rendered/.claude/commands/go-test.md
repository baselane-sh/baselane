---
description: Enforce TDD workflow for Go: write table-driven tests first, then implement. Verify 80%+ coverage with go test -cover.
argument-hint: <what to build>
---

Invoke the go-reviewer subagent to drive a TDD session for $ARGUMENTS: scaffold the function/interface signature first, write comprehensive table-driven tests (RED), verify they fail for the right reason, implement the minimal code to pass (GREEN), then refactor while keeping tests green (REFACTOR). Use go test -race ./... and go test -cover ./... to verify; target 80%+ coverage on general code and 100% on critical business logic. Use /go-build first if the package doesn't compile yet.
