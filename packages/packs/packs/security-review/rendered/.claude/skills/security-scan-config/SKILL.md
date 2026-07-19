---
name: security-scan-config
description: Scan this project's AI-harness configuration (settings, CLAUDE.md/AGENTS.md, MCP servers, hooks, agent definitions) for secrets, dangerous permission bypasses, and prompt-injection risk — before committing configuration changes.
license: MIT
---

<!-- adapted from affaan-m/ECC (Everything Claude Code) (MIT) — https://github.com/affaan-m/ECC -->

# Security scan (harness configuration)

Scan this project's AI-harness configuration (`.claude/` or equivalent) for security misconfigurations and prompt-injection risk — a separate concern from application code, but part of the same trust boundary in an AI-assisted repo.

## When to activate

- Setting up a new AI-harness project configuration
- After modifying `settings.json`, `CLAUDE.md`/`AGENTS.md`, or MCP server configs
- Before committing configuration changes
- When onboarding to a repo with an existing harness configuration
- Periodic security hygiene checks

## What to review

| File | Checks |
| --- | --- |
| `CLAUDE.md` / `AGENTS.md` | Hardcoded secrets, auto-run instructions embedded in project docs, prompt-injection patterns |
| `settings.json` | Overly permissive allow lists, missing deny lists, dangerous bypass flags (e.g. skip-permissions) |
| MCP server config | Risky/unaudited servers, hardcoded secrets in server env, unpinned `npx`-style install-on-run entries |
| hooks | Command injection via unescaped interpolation into a shell command, silent error suppression (`2>/dev/null`, `\|\| true`), unexplained outbound network calls |
| agent definitions | Unrestricted tool access (e.g. unconditional Bash) where the task doesn't need it, missing model spec, prompt-injection surface from untrusted inputs |

## Manual scan (portable, no extra tooling)

```bash
# hardcoded-looking secrets in harness config
grep -rEn '(api[_-]?key|secret|token|password)\s*[:=]\s*["\x27][A-Za-z0-9/+=_-]{12,}' .claude/ CLAUDE.md AGENTS.md 2>/dev/null

# unrestricted shell / dangerous bypass flags
grep -rn 'Bash(\*)\|dangerously-skip-permissions\|--no-verify' .claude/settings*.json 2>/dev/null

# hook commands that interpolate a file path or tool output directly into a shell string
grep -rn '${.*}|$(.*)' .claude/settings*.json 2>/dev/null | grep -i hook

# silent error suppression in hooks (hides a failing check rather than fixing it)
grep -rn '2>/dev/null\|\|\| true' .claude/settings*.json 2>/dev/null
```

## Severity levels

- **CRITICAL** — hardcoded API keys/tokens in config; `Bash(*)` (or equivalent unrestricted shell) in the allow list; command injection in a hook via unescaped interpolation; a shell-executing MCP server with no scoping.
- **HIGH** — auto-run instructions embedded in project docs (a prompt-injection vector any collaborator's harness will read); missing deny lists on sensitive paths (`~/.ssh`, `~/.aws`, `.env*`); an agent with Bash access it doesn't need for its stated task.
- **MEDIUM** — silent error suppression in hooks; missing a pre-tool-use security hook on Bash; unpinned install-on-run entries in MCP server config.
- **INFO** — missing descriptions on MCP servers or agents; explicit prohibitive instructions correctly present (flag as good practice, not a finding).

## Resources

- [OWASP MCP Top 10](https://owasp.org/) — tool poisoning, prompt injection via contextual payloads, command injection, shadow MCP servers, secret exposure.
