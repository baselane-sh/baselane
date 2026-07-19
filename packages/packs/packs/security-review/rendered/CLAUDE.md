# CLAUDE.md

@AGENTS.md

This project defines a native Claude Code implementation of this workflow pack:
- Subagent: `.claude/agents/security-reviewer.md`
- Command: `.claude/commands/security-scan.md`
- Command: `.claude/commands/security-audit.md`
- Hooks: see `.claude/settings.json`
- Skill: `.claude/skills/security-audit/SKILL.md` — Run the 4-layer pre-deploy security pass (secrets, authentication, input validation, data access) before shipping code that touches user input, auth, an endpoint, or a database query.
- Skill: `.claude/skills/validate-at-boundaries/SKILL.md` — Use when code receives data from outside its own module — user input, API responses, file contents, env vars, message payloads — validate it against a schema at the boundary and fail fast, so untrusted shapes never propagate inward.
- Skill: `.claude/skills/security-review/SKILL.md` — Use this skill when adding authentication, handling user input, working with secrets, creating API endpoints, or implementing payment/sensitive features. Full worked checklist with code examples for every OWASP Top 10 category, plus a cloud-infrastructure reference.
- Skill: `.claude/skills/security-scan-config/SKILL.md` — Scan this project's AI-harness configuration (settings, CLAUDE.md/AGENTS.md, MCP servers, hooks, agent definitions) for secrets, dangerous permission bypasses, and prompt-injection risk — before committing configuration changes.
