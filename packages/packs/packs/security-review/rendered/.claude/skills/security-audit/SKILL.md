---
name: security-audit
description: Run the 4-layer pre-deploy security pass (secrets, authentication, input validation, data access) before shipping code that touches user input, auth, an endpoint, or a database query.
---

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
