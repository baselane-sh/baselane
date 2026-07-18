# CLAUDE.md

@AGENTS.md

This project defines a native Claude Code implementation of this workflow pack:
- Subagent: `.claude/agents/typescript-reviewer.md`
- Command: `.claude/commands/typescript-review.md`
- Hooks: see `.claude/settings.json`
- Skill: `.claude/skills/immutable-updates/SKILL.md` — Use when updating objects, arrays, or records in application code — return a new copy with the change applied instead of mutating the original in place, to prevent hidden side effects and aliasing bugs.
