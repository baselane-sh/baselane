# CLAUDE.md

@AGENTS.md

This project defines a native Claude Code implementation of this workflow pack:
- Subagent: `.claude/agents/go-reviewer.md`
- Subagent: `.claude/agents/go-build-resolver.md`
- Command: `.claude/commands/go-review.md`
- Command: `.claude/commands/go-build.md`
- Command: `.claude/commands/go-test.md`
- Hooks: see `.claude/settings.json`
- Skill: `.claude/skills/golang-patterns/SKILL.md` — Idiomatic Go patterns, best practices, and conventions for building robust, efficient, and maintainable Go applications — API shape, error handling, concurrency, interface design, package organization, and performance. Use when writing, reviewing, or refactoring Go code, or designing Go packages/modules.
- Skill: `.claude/skills/golang-testing/SKILL.md` — Go testing patterns including TDD workflow, table-driven tests, subtests, benchmarks, fuzzing, golden files, HTTP handler testing, mocking with interfaces, and coverage targets. Use when writing new Go functions, adding test coverage, creating benchmarks, or following TDD in a Go project.
