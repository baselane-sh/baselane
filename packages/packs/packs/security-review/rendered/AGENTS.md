# AGENTS.md

<!-- generated from workflow-pack security-review v2.0.0 -->
<!-- adapted from affaan-m/ECC (MIT) — https://github.com/affaan-m/ECC -->

## Security review discipline

Run this against any code that handles user input, authentication, API endpoints, or sensitive data — before it reaches production.

### Security rules (apply to every endpoint, always)

- Never hardcode secrets — read them from environment variables (or a secret manager) and fail fast at startup if a required one is missing.
- Use parameterized queries — never build a query by concatenating a user value into a string.
- Every endpoint verifies authentication and authorization server-side; the client hiding a button is not access control.
- Every data query filters by the authenticated user's own id (or explicitly checks an admin role) — never trust a client-supplied id.
- Validate all input server-side against a schema — client-side validation alone is not validation.
- Return generic error messages to the client; log full detail server-side only.
- Rate-limit authentication endpoints.
- Enable row-level security (RLS) by default on any database that supports it.
- Set secure cookie flags — `httpOnly`, `secure`, `sameSite` — on every session cookie.

### Checklist

- **Injection** — Validate every external or untrusted input at the boundary before it reaches business logic; fail fast with a clear message. Are queries parameterized? Is user input ever concatenated into a query, shell command, or template string?
- **Authorization** — Is every route/mutation checked for auth, not just authentication? Is access scoped to the resource owner, not just "logged in"?
- **Secrets** — Never hardcode secrets — read them from environment variables and fail fast at startup if a required one is missing. Any hardcoded API key, password, token, or connection string in source?
- **Unsafe deserialization** — Is untrusted input ever passed to `eval`, a pickle/deserialize call, or a dynamic `require`/`import` without validation?
- **SSRF** — Does the server ever fetch a URL supplied by the user? If so, is the destination allow-listed, not just "looks like a URL"?
- **XSS** — Is user content ever rendered as raw HTML (`innerHTML`, `dangerouslySetInnerHTML`) without sanitization?
- **Logging** — Do logs ever include a password, token, or full PII record?

### Severity

Hardcoded secrets, injection, and auth bypass are CRITICAL — block merge. XSS and SSRF without an allow-list are HIGH. Missing rate limiting or verbose error messages are MEDIUM.

### False positives to skip

`.env.example` placeholders, clearly-marked test credentials, and public API keys meant to be public are not findings — verify context before flagging.

## Workflow pack: Security review

A 4-layer pre-deploy security audit (secrets, authentication, input validation, data access) with per-layer prompts and a scan toolkit, a reviewer role, a /security-scan diff check, a /security-audit pre-deploy pass, a pre-ship Stop-hook reminder, and baseline security rules for every endpoint — flags real vulnerabilities with severity and file:line, not theater.

### Roles

- **security-reviewer** — Flags real vulnerabilities (injection, authz gaps, secrets, unsafe deserialization, SSRF, XSS) with severity and file:line. Use after writing code that touches user input, auth, or sensitive data, and before any release.

### Commands

- **/security-scan** `[optional: path or diff ref]` — Run the security-reviewer over the current changes and report findings by severity.
  - How it runs: Invoke the security-reviewer subagent over the current diff (or $ARGUMENTS if given). Report findings grouped by severity (CRITICAL, HIGH, MEDIUM) with file:line and fix for each. End with a verdict: approve, or block until CRITICAL/HIGH issues are fixed.
- **/security-audit** `[optional: path or diff ref]` — Run the security-audit skill's 4-layer pre-deploy pass (secrets, authentication, input validation, data access) and report findings by layer and severity.
  - How it runs: Run the security-audit skill's 4-layer pass over the current diff (or $ARGUMENTS if given): secrets, authentication, input validation, data access. For each layer, run the relevant toolkit command when it's installed (gitleaks, trufflehog, npm audit / pip-audit, semgrep --config auto) and answer that layer's audit prompt against the actual code. Report findings grouped by layer with file:line and severity (CRITICAL/HIGH/MEDIUM). End with a verdict: safe to ship, or block until CRITICAL/HIGH issues are fixed.

### Guardrails

- Remind to check untrusted input at trust boundaries whenever code is edited.
- After an edit, scan the working tree for committed secrets with gitleaks when it is installed.
- Before ending the session, run the pre-deploy security toolkit and remind to run /security-audit before shipping.

### Skills

- **security-audit** — Run the 4-layer pre-deploy security pass (secrets, authentication, input validation, data access) before shipping code that touches user input, auth, an endpoint, or a database query.
- **validate-at-boundaries** — Use when code receives data from outside its own module — user input, API responses, file contents, env vars, message payloads — validate it against a schema at the boundary and fail fast, so untrusted shapes never propagate inward.

Tool-specific implementations live alongside this file (see `CLAUDE.md` for the Claude Code implementation). Tools without a native subagent/command surface should treat the sections above as operating instructions.
