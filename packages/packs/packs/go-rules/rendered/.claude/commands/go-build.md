---
description: Fix Go build errors, go vet warnings, and linter issues incrementally with minimal, surgical changes.
argument-hint: (no arguments)
---

Invoke the go-build-resolver subagent to incrementally fix Go build errors, go vet warnings, and linter issues with minimal, surgical changes. It runs go build/go vet/staticcheck/golangci-lint/go mod verify in order, fixes one error at a time, and re-verifies after each change. It will not refactor beyond the fix or change function signatures unless necessary, and stops to report if the same error persists after 3 attempts or the fix requires an architectural change. Run /go-review after the build is green.
