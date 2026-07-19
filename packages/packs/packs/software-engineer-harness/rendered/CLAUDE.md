# CLAUDE.md

@AGENTS.md

This project defines a native Claude Code implementation of this workflow pack:
- Subagent: `.claude/agents/planner.md`
- Subagent: `.claude/agents/reviewer.md`
- Subagent: `.claude/agents/checker.md`
- Subagent: `.claude/agents/architect.md`
- Subagent: `.claude/agents/code-reviewer.md`
- Subagent: `.claude/agents/code-simplifier.md`
- Subagent: `.claude/agents/tdd-guide.md`
- Subagent: `.claude/agents/silent-failure-hunter.md`
- Subagent: `.claude/agents/build-error-resolver.md`
- Subagent: `.claude/agents/refactor-cleaner.md`
- Subagent: `.claude/agents/code-explorer.md`
- Subagent: `.claude/agents/performance-optimizer.md`
- Subagent: `.claude/agents/pr-test-analyzer.md`
- Command: `.claude/commands/plan-change.md`
- Command: `.claude/commands/tdd-task.md`
- Command: `.claude/commands/review-change.md`
- Command: `.claude/commands/build-and-check.md`
- Command: `.claude/commands/tdd.md`
- Command: `.claude/commands/hunt-silent-failures.md`
- Command: `.claude/commands/fix-build.md`
- Command: `.claude/commands/feature-dev.md`
- Command: `.claude/commands/plan-work.md`
- Command: `.claude/commands/map.md`
- Hooks: see `.claude/settings.json`
- Skill: `.claude/skills/tdd-red-green-refactor/SKILL.md` — Use when implementing a feature or bugfix with non-trivial logic — drive it test-first through the RED → GREEN → REFACTOR cycle instead of writing implementation and backfilling tests.
- Skill: `.claude/skills/tdd-workflow/SKILL.md` — Use when writing new features, fixing bugs, or refactoring code. Enforces test-driven development with 80%+ coverage including unit, integration, and E2E tests, including how to detect the project's actual test runner and how to hand off from a *.plan.md implementation plan.
- Skill: `.claude/skills/api-design/SKILL.md` — REST API design patterns including resource naming, status codes, pagination, filtering, error responses, versioning, and rate limiting for production APIs.
- Skill: `.claude/skills/backend-patterns/SKILL.md` — Backend architecture patterns, API design, database optimization, and server-side best practices for Node.js, Express, and Next.js API routes.
- Skill: `.claude/skills/deployment-patterns/SKILL.md` — Deployment workflows, CI/CD pipeline patterns, Docker containerization, health checks, rollback strategies, and production readiness checklists for web applications.
- Skill: `.claude/skills/docker-patterns/SKILL.md` — Docker and Docker Compose patterns for local development, container security, networking, volume strategies, and multi-service orchestration.
- Skill: `.claude/skills/e2e-testing/SKILL.md` — Playwright E2E testing patterns, Page Object Model, configuration, CI/CD integration, artifact management, and flaky test strategies.
- Skill: `.claude/skills/codebase-onboarding/SKILL.md` — Analyze an unfamiliar codebase and generate a structured onboarding guide with architecture map, key entry points, conventions, and a starter CLAUDE.md. Use when joining a new project or setting up this harness for the first time in a repo.
- Skill: `.claude/skills/architecture-decision-records/SKILL.md` — Capture architectural decisions made during a session as structured ADRs. Detects decision moments, records context, alternatives considered, and rationale. Maintains an ADR log so future developers understand why the codebase is shaped the way it is.
