# CLAUDE.md

@AGENTS.md

This project defines a native Claude Code implementation of this workflow pack:
- Subagent: `.claude/agents/python-reviewer.md`
- Subagent: `.claude/agents/fastapi-reviewer.md`
- Subagent: `.claude/agents/django-reviewer.md`
- Command: `.claude/commands/python-review.md`
- Command: `.claude/commands/fastapi-review.md`
- Command: `.claude/commands/django-review.md`
- Hooks: see `.claude/settings.json`
- Skill: `.claude/skills/python-patterns/SKILL.md` — Pythonic idioms, type hints, error handling, context managers, comprehensions/generators, dataclasses, decorators, concurrency, package layout, and anti-patterns. Use when writing, reviewing, or refactoring Python code, or designing a package/module layout.
- Skill: `.claude/skills/python-testing/SKILL.md` — pytest fundamentals, fixtures (scopes, params, autouse, conftest), parametrization, mocking/patching, async test patterns, and TDD methodology with coverage targets. Use when writing or reviewing Python tests, or setting up a pytest suite.
- Skill: `.claude/skills/fastapi-patterns/SKILL.md` — FastAPI project layout, app factory/lifespan, pydantic-settings config, Pydantic v2 request/response schemas, async dependency injection, router design, a transactional service layer, and httpx+pytest testing. Use when building or reviewing a FastAPI application.
- Skill: `.claude/skills/django-security/SKILL.md` — Django production security settings, authentication and custom user models, authorization/RBAC and DRF permissions, SQL injection and XSS prevention, CSRF, file-upload validation, rate limiting, security headers, and secret management. Use when configuring or reviewing Django security posture.
- Skill: `.claude/skills/django-tdd/SKILL.md` — Django testing with pytest-django and factory_boy: TDD workflow, test settings, fixtures, model/view/serializer/DRF-API testing, mocking external services and email, and integration/full-flow tests, plus coverage targets. Use when writing or reviewing Django tests.
