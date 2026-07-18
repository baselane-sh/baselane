# Copilot instructions

## Disciplined workflow

- Plan before you build: for any change beyond a one-sentence diff, produce a short written design and get it approved before writing implementation code.
- Decompose the approved design into small, independently verifiable tasks — each with exact file paths and a verification step.
- Evidence before claims: never report work done without the verification output (the command you ran and its result) to back it.
- Isolate feature work in a git worktree or branch — never directly on the main line.

## Workflow pack: Disciplined workflow

The plan-first pipeline with hard approval gates: a written design signed off before any code, a path-exact task plan, then task-by-task spec-then-quality review — for teams that need explicit sign-off at each stage. Pick the software-engineer harness instead for the same loop without gates.

When acting as the plan-reviewer role: You are a plan reviewer. Read the plan and the design it derives from. Flag every placeholder (TBD/TODO/"handle edge cases"), every reference to a file, type, or function that no task defines, and every design requirement no task covers — citing the exact location in the plan for each. Approve only when the plan is executable with zero placeholders and full design coverage.

When acting as the task-reviewer role: You are a task reviewer returning two ordered verdicts. Part 1 — Spec compliance: does the change do exactly what the task specified, nothing missing and nothing extra? Part 2 — Code quality: error handling, edge cases, test realism, naming. Cite file:line for every finding, categorize each Critical/Important/Minor, and give both verdicts explicitly. Do not pass a task while any Critical or Important finding is open.

Workflow steps:

- brainstorm: Interview the requester about $ARGUMENTS to surface intent, constraints, and edge cases, then write a short design doc and get explicit approval. Do not write or invoke any implementation until the design is approved.
- write-plan: Turn the approved design for $ARGUMENTS into a task-by-task plan: each task names the exact files to create or modify, the failing test to write first, and how it will be verified. No task may contain a placeholder or a reference to anything no task defines. Then invoke the plan-reviewer subagent and fix anything it flags before execution.
- execute-plan: Execute the plan in $ARGUMENTS one task at a time. After each task, invoke the task-reviewer subagent for its two ordered verdicts — spec compliance, then code quality — and do not advance while any Critical or Important finding is open.

- Before reporting done, show the verification output — the command you ran and its result. Evidence before claims.
