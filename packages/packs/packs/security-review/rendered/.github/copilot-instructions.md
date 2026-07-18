# Copilot instructions

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

When acting as the security-reviewer role: You are a security reviewer. Read the changed code and check it against the security-review checklist in context: injection, authorization, hardcoded secrets, unsafe deserialization, SSRF, XSS, and sensitive-data logging. For each finding, cite the exact file:line, name the concrete input and outcome that makes it exploitable, and give severity (CRITICAL/HIGH/MEDIUM). Skip findings you cannot point to in the code — do not manufacture issues to look thorough. If nothing is exploitable, say so and approve.

Workflow steps:

- security-scan: Invoke the security-reviewer subagent over the current diff (or $ARGUMENTS if given). Report findings grouped by severity (CRITICAL, HIGH, MEDIUM) with file:line and fix for each. End with a verdict: approve, or block until CRITICAL/HIGH issues are fixed.
- security-audit: Run the security-audit skill's 4-layer pass over the current diff (or $ARGUMENTS if given): secrets, authentication, input validation, data access. For each layer, run the relevant toolkit command when it's installed (gitleaks, trufflehog, npm audit / pip-audit, semgrep --config auto) and answer that layer's audit prompt against the actual code. Report findings grouped by layer with file:line and severity (CRITICAL/HIGH/MEDIUM). End with a verdict: safe to ship, or block until CRITICAL/HIGH issues are fixed.

- Security check: any user input, external fetch, or deserialized data crossing a trust boundary here? Validate it before it's used.
- After an edit, scan the working tree for committed secrets with gitleaks when it is installed.
- Before ending the session, run the pre-deploy security toolkit and remind to run /security-audit before shipping.

## Skills

### security-audit

Run the 4-layer pre-deploy security pass (secrets, authentication, input validation, data access) before shipping code that touches user input, auth, an endpoint, or a database query.

# Security audit: the 4-layer pre-deploy pass

Run this before shipping any change that touches user input, authentication, an API endpoint, or a database query. It exists because most vibe-coded security incidents come from three repeat failure modes: a committed API key (in git history or a client bundle), an endpoint the server never actually checks auth on (the client just hides the button — `GET /api/invoices/43` returns someone else's invoice), and a hand-built SQL string. All three are caught by asking specific questions in order, not by "looking for bugs" in general.

Work through all four layers. Each has an audit prompt — answer it against the actual code, not in the abstract.

## Layer 1 — Secrets

**Audit prompt:** Scan the current diff and git history for hardcoded API keys, passwords, tokens, or connection strings. Is every secret read from an environment variable (or a secret manager), never a literal in source? Does startup fail fast with a clear error if a required secret is missing?

**Run:** `gitleaks detect` (finds secrets already in git history) and, if a match turns up, `trufflehog` to verify the secret is still active before treating it as a false positive.

## Layer 2 — Authentication

**Audit prompt:** For every route and mutation, does the *server* check authentication and authorization — not just the client hiding a button? For every resource-scoped endpoint, is access scoped to the resource's owner, not just "any logged-in user" (the BOLA/IDOR check — `GET /api/invoices/43` must 403/404 for anyone but the invoice's owner or an explicit admin)?

## Layer 3 — Input validation

**Audit prompt:** Is every external or untrusted input validated server-side against a schema before it reaches business logic — not only in the client? Are queries parameterized (never a user value concatenated into SQL, a shell command, or a template string)? Do file uploads have a size limit, and do auth endpoints have rate limiting?

## Layer 4 — Data access

**Audit prompt:** Does every data query filter by the authenticated user's own id (or explicitly check an admin role for cross-user access), instead of trusting a client-supplied id? Do error responses returned to the client stay generic (no stack trace, no internal detail) while the full context is logged server-side? Where the schema supports it, is deletion a soft delete rather than an irreversible hard delete?

## Toolkit

Run what's installed; note what isn't so a human can decide whether to install it.

| Tool | Layer | What it checks |
| --- | --- | --- |
| `gitleaks detect` | 1 | secrets already committed to git history |
| `trufflehog` | 1 | verifies a found secret is still live before you page anyone |
| `npm audit` / `pip-audit` | 3 | known-vulnerable dependencies |
| `semgrep --config auto` | 3–4 | static analysis for injection, unsafe patterns |
| GitHub Secret Scanning + Push Protection | 1 | blocks a secret from ever reaching the remote |

## Severity

Hardcoded secrets, injection, and an auth bypass are CRITICAL — block the release. A BOLA/IDOR gap or an un-rate-limited auth endpoint is HIGH. A verbose error message or a missing rate limit is MEDIUM. Report every finding with file:line, not a vague "looks risky."

### validate-at-boundaries

Use when code receives data from outside its own module — user input, API responses, file contents, env vars, message payloads — validate it against a schema at the boundary and fail fast, so untrusted shapes never propagate inward.

# Validate at boundaries

Every place external data enters your system is a boundary: an HTTP handler, a file read, an API
response, an environment variable, a queue message. **Validate at the boundary, before the data
reaches any logic that assumes it is well-formed.** Inside the boundary, the value is trusted because
you already checked it — not because you hope it is right.

```ts
// At the boundary: parse into a known shape, or reject.
const parsed = OrderSchema.parse(await req.json()); // throws on bad shape
createOrder(parsed);                                 // inner code trusts `parsed`
```

## Rules

- **One validator is the authority for each shape.** Route every entry point for that shape through
  it — built-in, user-supplied, or machine-generated. Never hand-construct or trust an unvalidated
  object further in.
- **Fail fast, name the field.** Reject the whole input on the first violation with a message that
  says which field was wrong and why. A vague "invalid input" costs the caller a debugging session.
- **Parse, don't just check.** Return a typed value from validation so downstream code carries the
  guarantee in its types, not just in a comment.
- **Never trust "internal" data blindly.** An API response or a sibling service's payload is external
  to your module even if it's inside your company — validate it the same way.

## Why

Unvalidated data that flows inward turns a boundary problem into a deep-stack mystery: the crash
happens three layers down, far from the malformed input that caused it. Validation at the edge keeps
the failure where the bad data actually entered, where the error message can still be specific.

## Boundaries to cover

HTTP request bodies and query params · file and config contents · third-party API responses ·
environment variables (validate presence and format at startup) · deserialized messages/events ·
anything read from a store you did not just write in the same transaction.
