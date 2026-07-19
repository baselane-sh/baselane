---
name: security-review
description: Use this skill when adding authentication, handling user input, working with secrets, creating API endpoints, or implementing payment/sensitive features. Full worked checklist with code examples for every OWASP Top 10 category, plus a cloud-infrastructure reference.
license: MIT
---

<!-- adapted from affaan-m/ECC (Everything Claude Code) (MIT) — https://github.com/affaan-m/ECC -->

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
