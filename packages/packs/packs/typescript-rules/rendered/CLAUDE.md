# CLAUDE.md

@AGENTS.md

This project defines a native Claude Code implementation of this workflow pack:
- Subagent: `.claude/agents/typescript-reviewer.md`
- Subagent: `.claude/agents/react-reviewer.md`
- Subagent: `.claude/agents/type-design-analyzer.md`
- Command: `.claude/commands/typescript-review.md`
- Command: `.claude/commands/react-review.md`
- Hooks: see `.claude/settings.json`
- Skill: `.claude/skills/immutable-updates/SKILL.md` — Use when updating objects, arrays, or records in application code — return a new copy with the change applied instead of mutating the original in place, to prevent hidden side effects and aliasing bugs.
- Skill: `.claude/skills/react-patterns/SKILL.md` — Use when writing or reviewing React function components, custom hooks, or component trees — covers hooks discipline, state location, Server/Client Component boundaries, Suspense + error boundaries, form actions, data fetching, and accessibility-first composition for React 18/19.
- Skill: `.claude/skills/react-performance/SKILL.md` — Use when writing, reviewing, or refactoring React/Next.js code for performance — 70+ rules across waterfalls, bundle size, server-side performance, client fetching, re-renders, rendering, JS micro-perf, and advanced patterns, adapted from Vercel Engineering's React Best Practices.
- Skill: `.claude/skills/react-testing/SKILL.md` — Use when writing or fixing tests for React components, hooks, or pages — React Testing Library query priority, userEvent, async assertions, MSW network mocking, accessibility assertions with axe, and the RTL-vs-Playwright decision boundary.
