---
description: Guided feature development: explore the existing codebase, design, implement, and review — before writing new code.
argument-hint: [feature request]
---

Run a structured feature-development workflow for: $ARGUMENTS. (1) Discovery: restate requirements, constraints, and acceptance criteria; ask clarifying questions if ambiguous. (2) Codebase exploration: invoke the code-explorer subagent to trace execution paths and architecture layers for the relevant area. (3) Present exploration findings and ask targeted design/edge-case questions; wait for the user's answers. (4) Architecture: invoke the architect subagent (or planner for a single-file-scoped change) for the implementation blueprint; wait for approval before implementing. (5) Implement test-first per the tdd-guide workflow, keeping commits small and focused. (6) Quality review: invoke the code-reviewer subagent; address Critical and Important findings; verify test coverage. (7) Summarize what was built, follow-up items or limitations, and how to test it.
