# CLAUDE.md

@AGENTS.md

This project defines a native Claude Code implementation of this workflow pack:
- Subagent: `.claude/agents/security-reviewer.md`
- Command: `.claude/commands/security-scan.md`
- Command: `.claude/commands/security-audit.md`
- Hooks: see `.claude/settings.json`
- Skill: `.claude/skills/security-audit/SKILL.md` — Run the 4-layer pre-deploy security pass (secrets, authentication, input validation, data access) before shipping code that touches user input, auth, an endpoint, or a database query.
- Skill: `.claude/skills/validate-at-boundaries/SKILL.md` — Use when code receives data from outside its own module — user input, API responses, file contents, env vars, message payloads — validate it against a schema at the boundary and fail fast, so untrusted shapes never propagate inward.
