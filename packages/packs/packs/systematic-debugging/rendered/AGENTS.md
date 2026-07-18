# AGENTS.md

<!-- generated from workflow-pack systematic-debugging v1.1.0 -->
<!-- adapted from obra/superpowers (MIT) — https://github.com/obra/superpowers -->

## Systematic debugging

- The Iron Law: NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST. If you have not found the root cause, you may not propose a fix.
- Work the four phases in order: (1) root-cause investigation, (2) pattern analysis, (3) hypothesis and testing, (4) implementation.
- After three failed fix attempts, STOP — the architecture is suspect. Do not attempt a fourth fix without an explicit architectural discussion.

## Workflow pack: Systematic debugging

Root cause before fix: a four-phase debugging discipline governed by the Iron Law, escalating to an architectural review after three failed attempts instead of a fourth guess. The same discipline also ships as the "systematic-debugging" seed skill in the skills library — adopting both is redundant, not complementary; pick this pack for the enforcing subagent/hooks or the skill for zero-setup guidance.

### Roles

- **debugger** — Phase-disciplined investigator that reports an evidence chain from symptom to cause, not a guess.

### Commands

- **/debug** `[symptom]` — Walk a bug through the four phases; refuse to patch before the root cause is found.
  - How it runs: Investigate $ARGUMENTS through the four phases in order — root-cause investigation, pattern analysis, hypothesis and testing, then implementation. Do not propose or apply a fix until the root cause is identified with evidence. If three fixes have already failed, stop and raise the architecture for discussion instead of trying a fourth.
- **/root-cause** `[symptom or failing test]` — Trace a symptom back to its origin before any change.
  - How it runs: Trace $ARGUMENTS backwards from the observed symptom to its origin: reproduce it, follow the data and control flow to the first point where reality diverges from intent, and state the root cause with the evidence chain that proves it — before proposing any change.

### Guardrails

- After an edit, nudge the root-cause-before-fix discipline.

Tool-specific implementations live alongside this file (see `CLAUDE.md` for the Claude Code implementation). Tools without a native subagent/command surface should treat the sections above as operating instructions.
