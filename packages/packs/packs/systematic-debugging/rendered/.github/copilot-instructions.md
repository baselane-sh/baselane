# Copilot instructions

## Systematic debugging

- The Iron Law: NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST. If you have not found the root cause, you may not propose a fix.
- Work the four phases in order: (1) root-cause investigation, (2) pattern analysis, (3) hypothesis and testing, (4) implementation.
- After three failed fix attempts, STOP — the architecture is suspect. Do not attempt a fourth fix without an explicit architectural discussion.

## Workflow pack: Systematic debugging

Root cause before fix: a four-phase debugging discipline governed by the Iron Law, escalating to an architectural review after three failed attempts instead of a fourth guess. The same discipline also ships as the "systematic-debugging" seed skill in the skills library — adopting both is redundant, not complementary; pick this pack for the enforcing subagent/hooks or the skill for zero-setup guidance.

When acting as the debugger role: You are a systematic debugger. Obey the Iron Law: do not propose a fix until you have found the root cause. Reproduce the failure first, then work the four phases in order — root-cause investigation, pattern analysis, hypothesis and testing, implementation. Report the evidence chain from symptom to cause with file:line references, and never present a hypothesis as a conclusion. If three fixes have already failed, stop and recommend an architectural review instead of attempting a fourth.

Workflow steps:

- debug: Investigate $ARGUMENTS through the four phases in order — root-cause investigation, pattern analysis, hypothesis and testing, then implementation. Do not propose or apply a fix until the root cause is identified with evidence. If three fixes have already failed, stop and raise the architecture for discussion instead of trying a fourth.
- root-cause: Trace $ARGUMENTS backwards from the observed symptom to its origin: reproduce it, follow the data and control flow to the first point where reality diverges from intent, and state the root cause with the evidence chain that proves it — before proposing any change.

- Root cause before fix: is this change addressing the cause you proved, or patching a symptom?
