# Copilot instructions

## Security review discipline

Run this against any code that handles user input, authentication, API endpoints, secrets, or sensitive data — before it reaches production. This pack merges baselane's own review discipline with the security material from ECC (Everything Claude Code, MIT).

### Core security rules (apply to every endpoint, always)

- Never hardcode secrets — read them from environment variables (or a secret manager) and fail fast at startup if a required one is missing.
- Use parameterized queries — never build a query by concatenating a user value into a string.
- Every endpoint verifies authentication and authorization server-side; the client hiding a button is not access control.
- Every data query filters by the authenticated user's own id (or explicitly checks an admin role) — never trust a client-supplied id.
- Validate all input server-side against a schema — client-side validation alone is not validation.
- Return generic error messages to the client; log full detail server-side only.
- Rate-limit authentication endpoints and other expensive operations.
- Enable row-level security (RLS) by default on any database that supports it.
- Set secure cookie flags — `httpOnly`, `secure`, `sameSite` — on every session cookie.
- Keep dependencies current and act on `npm audit` / `pip-audit` findings.

### Mandatory checks before ANY commit

- [ ] No hardcoded secrets (API keys, passwords, tokens, connection strings)
- [ ] All user inputs validated server-side
- [ ] SQL injection prevention (parameterized queries only)
- [ ] XSS prevention (sanitized HTML, CSP configured)
- [ ] CSRF protection enabled on state-changing routes
- [ ] Authentication/authorization verified on every route
- [ ] Rate limiting on all public endpoints
- [ ] Error messages don't leak sensitive data (stack traces, internals)

### Severity

Hardcoded secrets, injection, and auth bypass are CRITICAL — block merge. XSS and SSRF without an allow-list, unrestricted shell access on Bash, and BOLA/IDOR gaps are HIGH. Missing rate limiting, verbose error messages, and silent error suppression are MEDIUM. Missing descriptions/hygiene items are INFO.

### False positives to skip

`.env.example` placeholders, clearly-marked test credentials, and public API keys meant to be public are not findings — verify context before flagging. SHA-256/MD5 used purely for checksums (not password storage) is not a finding.

## OWASP Top 10 checklist

1. **Injection** — Are queries parameterized? Is user input ever concatenated into a query, shell command, or template string? Are ORMs used safely?
2. **Broken authentication** — Are passwords hashed with bcrypt/argon2? Are JWTs validated (signature, expiry, audience)? Are sessions secure?
3. **Sensitive data exposure** — Is HTTPS enforced? Are secrets in env vars, never source? Is PII encrypted at rest? Are logs sanitized?
4. **XXE** — Are XML parsers configured to disable external entities?
5. **Broken access control** — Is auth checked on every route/mutation, not just authentication? Is CORS configured correctly (no wildcard with credentials)?
6. **Security misconfiguration** — Are default credentials changed? Is debug mode off in prod? Are security headers set?
7. **XSS** — Is output escaped? Is CSP set? Is the framework's auto-escaping relied on rather than bypassed?
8. **Insecure deserialization** — Is untrusted input ever passed to `eval`, a pickle/deserialize call, or a dynamic `require`/`import` without validation?
9. **Using components with known vulnerabilities** — Are dependencies current? Is `npm audit` / `pip-audit` clean?
10. **Insufficient logging & monitoring** — Are security events (auth failures, admin actions) logged? Are alerts configured for anomalies?

Also check, beyond the classic 10:

- **SSRF** — Does the server ever fetch a URL supplied by the user? If so, is the destination allow-listed, not just "looks like a URL"?
- **Logging hygiene** — Do logs ever include a password, token, session id, or full PII record?

### Code pattern reference

| Pattern | Severity | Fix |
| --- | --- | --- |
| Hardcoded secrets | CRITICAL | Read from `process.env` / secret manager |
| Shell command built from user input | CRITICAL | Use safe APIs or `execFile` with an argument array |
| String-concatenated SQL | CRITICAL | Parameterized queries |
| `innerHTML` / `dangerouslySetInnerHTML` on user content | HIGH | Sanitize (e.g. DOMPurify) or use `textContent` |
| `fetch(userProvidedUrl)` with no allow-list | HIGH | Allow-list destination hosts |
| Plaintext password comparison | CRITICAL | `bcrypt.compare()` / `argon2.verify()` |
| No auth check on a route | CRITICAL | Add authentication + authorization middleware |
| Balance/quantity check without a lock | CRITICAL | Use `FOR UPDATE` / an explicit transaction |
| No rate limiting on an expensive or auth route | HIGH | Add rate limiting middleware |
| Logging passwords/secrets/tokens | MEDIUM | Redact before logging |

## Secrets management

```typescript
// FAIL — hardcoded
const apiKey = "sk-proj-xxxxx";

// PASS — env var, fail fast if missing
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
```

- [ ] No hardcoded API keys, tokens, or passwords
- [ ] All secrets in environment variables or a secrets manager
- [ ] `.env.local` (and equivalents) in `.gitignore`
- [ ] No secrets in git history
- [ ] Production secrets live in the hosting platform's secret store, not in a committed file

In cloud environments, prefer a managed secrets manager over a bare environment variable so access is audited and rotation is automatic:

```typescript
// PASS — cloud secrets manager, audited + rotatable
import { SecretsManager } from "@aws-sdk/client-secrets-manager";
const client = new SecretsManager({ region: "us-east-1" });
const secret = await client.getSecretValue({ SecretId: "prod/api-key" });
```

## Input validation

```typescript
import { z } from "zod";

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.number().int().min(0).max(150),
});

export async function createUser(input: unknown) {
  const validated = CreateUserSchema.parse(input); // throws on bad shape
  return await db.users.create(validated);
}
```

File uploads: enforce a size limit, an allow-listed MIME type, and a matching extension — all three, not just one.

- [ ] All user inputs validated server-side with a schema
- [ ] File uploads restricted (size, type, extension)
- [ ] No direct use of user input in a query, shell command, or template string
- [ ] Whitelist validation, not blacklist
- [ ] Error messages don't leak internal detail

## SQL injection prevention

```typescript
// FAIL — string-concatenated SQL
const query = `SELECT * FROM users WHERE email = '${userEmail}'`;

// PASS — parameterized
await db.query("SELECT * FROM users WHERE email = $1", [userEmail]);
```

- [ ] All database queries use parameterized queries or a query builder
- [ ] No string concatenation in SQL
- [ ] ORM/query builder used correctly (no raw-string escape hatches with user input)

## Authentication & authorization

```typescript
// FAIL — token in localStorage (readable by any XSS)
localStorage.setItem("token", token);

// PASS — httpOnly cookie
res.setHeader("Set-Cookie", `token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`);
```

```typescript
export async function deleteUser(userId: string, requesterId: string) {
  const requester = await db.users.findUnique({ where: { id: requesterId } });
  if (requester.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  await db.users.delete({ where: { id: userId } });
}
```

Row-level security, once available, is the backstop that catches an authorization check a developer forgot to write:

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own data" ON users FOR UPDATE USING (auth.uid() = id);
```

- [ ] Tokens stored in httpOnly cookies, not `localStorage`
- [ ] Authorization checked before every sensitive operation, scoped to resource owner (the BOLA/IDOR check — `GET /api/invoices/43` must 403/404 for anyone but the invoice's owner or an explicit admin)
- [ ] Row-level security enabled where the database supports it
- [ ] Session management is secure (rotation on privilege change, expiry enforced)

## XSS prevention & CSP

```typescript
import DOMPurify from "isomorphic-dompurify";

function renderUserContent(html: string) {
  const clean = DOMPurify.sanitize(html, { ALLOWED_TAGS: ["b", "i", "em", "strong", "p"], ALLOWED_ATTR: [] });
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

Start CSP strict and loosen only with a documented removal plan. Do not default to `'unsafe-inline'` or `'unsafe-eval'` — they neutralize much of CSP's protection and should be treated as temporary compatibility debt.

```
Content-Security-Policy:
  default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none';
  script-src 'self'; style-src 'self'; img-src 'self' data: https:; font-src 'self';
```

- [ ] User-provided HTML sanitized before render
- [ ] CSP headers configured (no blanket `unsafe-inline`/`unsafe-eval`)
- [ ] No unvalidated dynamic content rendering
- [ ] Framework's built-in escaping relied on rather than bypassed

## CSRF

```typescript
export async function POST(request: Request) {
  const token = request.headers.get("X-CSRF-Token");
  if (!csrf.verify(token)) return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
}
```

- [ ] CSRF tokens on state-changing operations
- [ ] `SameSite=Strict` on session cookies
- [ ] Double-submit cookie pattern where token-based CSRF isn't practical

## Rate limiting

```typescript
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use("/api/", limiter);

const searchLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 }); // stricter for expensive ops
app.use("/api/search", searchLimiter);
```

- [ ] Rate limiting on all public API endpoints
- [ ] Stricter limits on expensive operations (search, auth, sends)
- [ ] Limits keyed by IP and, where authenticated, by user

## Sensitive data exposure & logging

```typescript
// FAIL
console.log("User login:", { email, password });
catch (error) { return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 }); }

// PASS
console.log("User login:", { email, userId });
catch (error) {
  console.error("Internal error:", error); // full detail server-side only
  return NextResponse.json({ error: "An error occurred. Please try again." }, { status: 500 });
}
```

- [ ] No passwords, tokens, secrets, or full PII in logs
- [ ] Error messages generic for the client; detail logged server-side only
- [ ] No stack traces exposed to users

## Dependency security

```bash
npm audit --audit-level=high
npm audit fix
npm outdated
npm ci            # reproducible installs in CI, not `npm install`
```

- [ ] Dependencies current, `npm audit` clean at the chosen severity threshold
- [ ] Lock files committed
- [ ] Automated dependency update tooling enabled (e.g. Dependabot) where the platform supports it

## Cloud & infrastructure security (summary)

Full detail lives in the `cloud-infrastructure-security` reference alongside the `security-review` skill. Highlights to check on any deploy-touching change:

- **IAM** — least privilege (no `*` actions on `*` resources), MFA on privileged accounts, service accounts use roles rather than long-lived keys.
- **Network** — databases not publicly accessible, security groups scoped by CIDR and port, no `0.0.0.0/0` on anything but public HTTP(S).
- **Secrets** — cloud secrets manager with rotation, not a bare env var for long-lived production credentials.
- **CI/CD** — OIDC instead of long-lived cloud credentials, secret scanning and dependency audit as pipeline steps, branch protection + required review before merge.
- **CDN/WAF** — security headers set (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`), WAF/rate limiting enabled at the edge where available.
- **Backups** — automated, retention meets the project's compliance bar, recovery tested rather than assumed.

## Agent & harness security minimum bar

This project's own reviewer and the code it reviews increasingly run inside an AI coding harness, which is itself part of the attack surface (poisoned repo config, malicious hook definitions, prompt injection via fetched content or untrusted files). Treat these as review targets too, not just application code:

- Agent/bot identities are separate from personal accounts (a dedicated bot user/email/token), never the developer's own credentials.
- Credentials handed to an agent are short-lived and scoped to what the task needs — not org-wide, not long-lived.
- Untrusted or foreign-content-heavy work (unfamiliar repos, email/PDF/webpage ingestion) runs in an isolated sandbox with no default network egress, not on the primary machine.
- Harness permission config denies reads/writes to secret-bearing paths (`~/.ssh`, `~/.aws`, `.env*`) by default; a workflow that only needs to read a repo and run tests should not be able to read the home directory.
- Anything read from outside the repo (fetched pages, tool output, PR/issue bodies, file attachments) is treated as untrusted content, not as instructions — a boundary a reviewer should flag if code blurs it (e.g. an agent tool that executes text from a fetched document).
- The agent is not the final authority for unsandboxed shell execution, network egress, secret reads, or writes outside the workspace — a human-in-the-loop approval sits between the model and the action for all four.
- Tool calls, approval decisions, files touched, and network attempts are logged somewhere a human can review after the fact.
- Long-running/autonomous agent processes have an actual stop path (process-group kill, not just the parent process) and a heartbeat-based dead-man switch rather than relying on the process stopping itself.
- Persistent agent memory stays narrow: no secrets in memory files, and memory from an untrusted run is reset or rotated rather than carried forward indefinitely.
- Skills, hooks, MCP server configs, and agent descriptors pulled from outside the team are reviewed like any other supply-chain artifact before being trusted (unicode/zero-width-character checks, no unexplained outbound network commands, no silent permission escalation).

## Pre-deployment security checklist

Before ANY production deployment:

- [ ] Secrets: no hardcoded secrets, all in env vars or a secrets manager
- [ ] Input validation: all user inputs validated server-side
- [ ] SQL injection: all queries parameterized
- [ ] XSS: user content sanitized, CSP configured
- [ ] CSRF: protection enabled on state-changing routes
- [ ] Authentication: proper token handling (httpOnly cookies)
- [ ] Authorization: role/ownership checks in place on every route
- [ ] Rate limiting: enabled on public and expensive endpoints
- [ ] HTTPS enforced in production
- [ ] Security headers configured (CSP, X-Frame-Options, etc.)
- [ ] Error handling: no sensitive data in client-facing errors
- [ ] Logging: no sensitive data logged
- [ ] Dependencies: up to date, no known-high/critical vulnerabilities
- [ ] Row-level security enabled where the database supports it
- [ ] CORS properly scoped (no wildcard origin with credentials)
- [ ] File uploads validated (size, type, extension)

## Workflow pack: Security review

Comprehensive OWASP Top 10 + secrets/input/auth/XSS/CSRF/rate-limiting/logging/dependency/cloud-infra security review discipline, a 4-layer pre-deploy audit, a full-checklist skill with cloud-infra reference, an AI-harness config scan skill, a reviewer agent, full-audit and diff-scoped scan commands, and a portable secret-leak guard hook — flags real vulnerabilities with severity and file:line, not theater.

When acting as the security-reviewer role: You are an expert security reviewer focused on identifying and remediating real vulnerabilities before they reach production. Read the changed code and check it against the security-review checklist in this pack's context: injection, broken authentication, sensitive data exposure, broken access control, security misconfiguration, XSS, insecure deserialization, known-vulnerable dependencies, insufficient logging, SSRF, and hardcoded secrets.

## Review workflow

1. **Initial scan** — search the diff (and, if relevant, git history) for hardcoded secrets; identify high-risk areas touched: auth, API endpoints, DB queries, file uploads, payments, webhooks, MCP/agent configuration.
2. **OWASP Top 10 pass** — work through each of the 10 categories in this pack's context against the actual code, not in the abstract.
3. **Pattern match** — flag any of this pack's known-bad patterns on sight (hardcoded secret, shell command built from user input, string-concatenated SQL, unsanitized `innerHTML`, unallow-listed `fetch(userUrl)`, plaintext password comparison, missing auth check, unlocked balance/quantity check, missing rate limiting, secrets in logs).

## Reporting

For each finding, cite the exact file:line, name the concrete input and outcome that makes it exploitable, and give a severity:

- **CRITICAL** — hardcoded secrets, injection, auth bypass. Blocks merge.
- **HIGH** — XSS/SSRF without an allow-list, a BOLA/IDOR gap, unrestricted shell access.
- **MEDIUM** — missing rate limiting, verbose error messages, silent error suppression.
- **INFO** — hygiene items (missing descriptions, outdated-but-non-vulnerable dependency).

For every finding, give a concrete fix — a corrected code snippet, not just a description of the problem. Skip findings you cannot point to in the code; do not manufacture issues to look thorough. Common false positives to verify context on before flagging: `.env.example` placeholders, clearly-marked test credentials, intentionally-public API keys, and SHA-256/MD5 used for checksums rather than password storage.

## When to run

Always after: new API endpoints, auth code changes, user input handling, DB query changes, file uploads, payment code, external API integrations, dependency updates, or changes to this project's own AI-harness configuration (hooks, MCP servers, agent/skill definitions). Immediately for: production incidents, dependency CVEs, user security reports, or before any major release.

## Reference

For the full worked checklist with code examples, see the `security-review` skill in this pack (and its `cloud-infrastructure-security` reference for deploy-touching changes). For the 4-layer pre-deploy pass, see the `security-audit` skill.

**Remember**: be thorough and specific, not performative. One real, well-cited finding is worth more than ten vague ones.

Workflow steps:

- security-scan: Invoke the security-reviewer subagent over the current diff (or $ARGUMENTS if given). Report findings grouped by severity (CRITICAL, HIGH, MEDIUM) with file:line and fix for each. End with a verdict: approve, or block until CRITICAL/HIGH issues are fixed.
- security-audit: Run the security-audit skill's 4-layer pass over the current diff (or $ARGUMENTS if given): secrets, authentication, input validation, data access. For each layer, run the relevant toolkit command when it's installed (gitleaks, trufflehog, npm audit / pip-audit, semgrep --config auto) and answer that layer's audit prompt against the actual code. Report findings grouped by layer with file:line and severity (CRITICAL/HIGH/MEDIUM). End with a verdict: safe to ship, or block until CRITICAL/HIGH issues are fixed.

- Security check: never paste or echo a live secret (API key, token, cookie, password, .pem contents) into this command's output or a log — reference an environment variable or secret manager instead.
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

### security-review

Use this skill when adding authentication, handling user input, working with secrets, creating API endpoints, or implementing payment/sensitive features. Full worked checklist with code examples for every OWASP Top 10 category, plus a cloud-infrastructure reference.

# Security review

Comprehensive security review discipline for code that adds authentication, handles user input, works with secrets, exposes an API endpoint, or touches payment/sensitive data. This is the full checklist version of the pack's own context — use it when you need the worked examples inline rather than the summary.

## When to activate

- Implementing authentication or authorization
- Handling user input or file uploads
- Creating new API endpoints
- Working with secrets or credentials
- Implementing payment features
- Storing or transmitting sensitive data
- Integrating third-party APIs

## Secrets management

FAIL:
```typescript
const apiKey = "sk-proj-xxxxx" // hardcoded secret
const dbPassword = "password123" // in source code
```

PASS:
```typescript
const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) throw new Error('OPENAI_API_KEY not configured')
```

Verify: no hardcoded API keys/tokens/passwords · all secrets in env vars · `.env.local` gitignored · no secrets in git history · production secrets in the hosting platform's secret store.

## Input validation

```typescript
import { z } from 'zod'

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.number().int().min(0).max(150)
})

export async function createUser(input: unknown) {
  try {
    const validated = CreateUserSchema.parse(input)
    return await db.users.create(validated)
  } catch (error) {
    if (error instanceof z.ZodError) return { success: false, errors: error.issues }
    throw error
  }
}
```

File upload validation checks size, MIME type, AND extension — never just one:

```typescript
function validateFileUpload(file: File) {
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) throw new Error('File too large (max 5MB)')

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
  if (!allowedTypes.includes(file.type)) throw new Error('Invalid file type')

  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif']
  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0]
  if (!extension || !allowedExtensions.includes(extension)) throw new Error('Invalid file extension')

  return true
}
```

Verify: all user inputs validated with schemas · file uploads restricted (size, type, extension) · no direct use of user input in queries · whitelist validation (not blacklist) · error messages don't leak sensitive info.

## SQL injection prevention

FAIL:
```typescript
const query = `SELECT * FROM users WHERE email = '${userEmail}'`
await db.query(query)
```

PASS:
```typescript
const { data } = await supabase.from('users').select('*').eq('email', userEmail)
// or
await db.query('SELECT * FROM users WHERE email = $1', [userEmail])
```

Verify: all database queries use parameterized queries · no string concatenation in SQL · ORM/query builder used correctly.

## Authentication & authorization

```typescript
// FAIL: localStorage is vulnerable to XSS
localStorage.setItem('token', token)

// PASS: httpOnly cookie
res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`)
```

```typescript
export async function deleteUser(userId: string, requesterId: string) {
  const requester = await db.users.findUnique({ where: { id: requesterId } })
  if (requester.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  await db.users.delete({ where: { id: userId } })
}
```

Row-level security (e.g. Supabase):

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own data" ON users FOR UPDATE USING (auth.uid() = id);
```

Verify: tokens in httpOnly cookies (not localStorage) · authorization checks before sensitive operations · row-level security enabled where supported · role-based access control implemented · session management secure.

## XSS prevention

```typescript
import DOMPurify from 'isomorphic-dompurify'

function renderUserContent(html: string) {
  const clean = DOMPurify.sanitize(html, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p'], ALLOWED_ATTR: [] })
  return <div dangerouslySetInnerHTML={{ __html: clean }} />
}
```

Content-Security-Policy — start strict and loosen only with a documented removal plan; don't default to `'unsafe-inline'` or `'unsafe-eval'`:

```typescript
const securityHeaders = [{
  key: 'Content-Security-Policy',
  value: `
    default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none';
    script-src 'self'; style-src 'self'; img-src 'self' data: https:; font-src 'self';
    connect-src 'self' https://api.example.com;
  `.replace(/\s{2,}/g, ' ').trim()
}]
```

Verify: user-provided HTML sanitized · CSP headers configured · no unvalidated dynamic content rendering · framework's built-in XSS protection used, not bypassed.

## CSRF protection

```typescript
export async function POST(request: Request) {
  const token = request.headers.get('X-CSRF-Token')
  if (!csrf.verify(token)) return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
}
```

```typescript
res.setHeader('Set-Cookie', `session=${sessionId}; HttpOnly; Secure; SameSite=Strict`)
```

Verify: CSRF tokens on state-changing operations · `SameSite=Strict` on all cookies · double-submit cookie pattern where applicable.

## Rate limiting

```typescript
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: 'Too many requests' })
app.use('/api/', limiter)

const searchLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: 'Too many search requests' })
app.use('/api/search', searchLimiter)
```

Verify: rate limiting on all API endpoints · stricter limits on expensive operations · IP-based and, where authenticated, user-based limits.

## Sensitive data exposure

```typescript
// FAIL
console.log('User login:', { email, password })
console.log('Payment:', { cardNumber, cvv })

// PASS
console.log('User login:', { email, userId })
console.log('Payment:', { last4: card.last4, userId })
```

```typescript
// FAIL
catch (error) {
  return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
}

// PASS
catch (error) {
  console.error('Internal error:', error)
  return NextResponse.json({ error: 'An error occurred. Please try again.' }, { status: 500 })
}
```

Verify: no passwords/tokens/secrets in logs · error messages generic for users · detailed errors server-side only · no stack traces exposed to users.

## Signed-transaction verification (any system that signs/authorizes value transfer)

Wherever a system accepts a signed message or transaction authorizing a transfer of value (payments, on-chain transactions, signed API mutations), verify the signature AND re-check business constraints server-side — never trust a client-reported amount or recipient:

```typescript
async function verifyTransaction(transaction: Transaction) {
  if (transaction.to !== expectedRecipient) throw new Error('Invalid recipient')
  if (transaction.amount > maxAmount) throw new Error('Amount exceeds limit')
  const balance = await getBalance(transaction.from)
  if (balance < transaction.amount) throw new Error('Insufficient balance')
  return true
}
```

Verify: signatures verified · transaction/mutation details re-validated server-side · balance/limit checks before committing · no blind signing of client-supplied payloads.

## Dependency security

```bash
npm audit
npm audit fix
npm update
npm outdated
```

```bash
git add package-lock.json   # always commit lock files
npm ci                      # in CI, for reproducible builds
```

Verify: dependencies up to date · no known vulnerabilities (`npm audit` clean) · lock files committed · automated dependency update tooling enabled · regular security updates.

## Security testing

```typescript
test('requires authentication', async () => {
  const response = await fetch('/api/protected')
  expect(response.status).toBe(401)
})

test('requires admin role', async () => {
  const response = await fetch('/api/admin', { headers: { Authorization: `Bearer ${userToken}` } })
  expect(response.status).toBe(403)
})

test('rejects invalid input', async () => {
  const response = await fetch('/api/users', { method: 'POST', body: JSON.stringify({ email: 'not-an-email' }) })
  expect(response.status).toBe(400)
})

test('enforces rate limits', async () => {
  const requests = Array(101).fill(null).map(() => fetch('/api/endpoint'))
  const responses = await Promise.all(requests)
  expect(responses.filter(r => r.status === 429).length).toBeGreaterThan(0)
})
```

## Pre-deployment security checklist

Before ANY production deployment:

- [ ] Secrets: no hardcoded secrets, all in env vars
- [ ] Input validation: all user inputs validated
- [ ] SQL injection: all queries parameterized
- [ ] XSS: user content sanitized
- [ ] CSRF: protection enabled
- [ ] Authentication: proper token handling
- [ ] Authorization: role checks in place
- [ ] Rate limiting: enabled on all endpoints
- [ ] HTTPS: enforced in production
- [ ] Security headers: CSP, X-Frame-Options configured
- [ ] Error handling: no sensitive data in errors
- [ ] Logging: no sensitive data logged
- [ ] Dependencies: up to date, no vulnerabilities
- [ ] Row-level security: enabled where supported
- [ ] CORS: properly configured
- [ ] File uploads: validated (size, type)
- [ ] Signed transactions: signatures and business constraints re-verified server-side (if applicable)

## Common false positives

- Environment variables in `.env.example` (not actual secrets)
- Test credentials in test files, clearly marked as such
- Public API keys that are actually meant to be public
- SHA-256/MD5 used for checksums, not password storage

Always verify context before flagging.

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Web Security Academy](https://portswigger.net/web-security)

### security-scan-config

Scan this project's AI-harness configuration (settings, CLAUDE.md/AGENTS.md, MCP servers, hooks, agent definitions) for secrets, dangerous permission bypasses, and prompt-injection risk — before committing configuration changes.

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
