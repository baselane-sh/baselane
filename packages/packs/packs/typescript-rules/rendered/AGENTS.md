# AGENTS.md

<!-- generated from workflow-pack typescript-rules v2.0.0 -->
<!-- adapted from affaan-m/ECC (MIT) — https://github.com/affaan-m/ECC -->

## TypeScript/JavaScript + React conventions (beyond what the linter enforces)

`eslint` and `prettier` already enforce formatting, `no-explicit-any`, and stray `console.log` — this pack is the judgment they can't encode. Keep the mechanical checks in CI (`prettier --check .`, `eslint .`); the reviewers below cover the rest.

## Types and interfaces

### Public APIs

- Add parameter and return types to exported functions, shared utilities, and public class methods.
- Let TypeScript infer obvious local variable types.
- Extract repeated inline object shapes into named types or interfaces.

```typescript
// WRONG: exported function without explicit types
export function formatUser(user) {
  return `${user.firstName} ${user.lastName}`
}

// CORRECT: explicit types on public APIs
interface User {
  firstName: string
  lastName: string
}

export function formatUser(user: User): string {
  return `${user.firstName} ${user.lastName}`
}
```

### Interfaces vs. type aliases

- Use `interface` for object shapes that may be extended or implemented.
- Use `type` for unions, intersections, tuples, mapped types, and utility types.
- Prefer string-literal unions over `enum` unless an `enum` is required for interop.

```typescript
interface User {
  id: string
  email: string
}

type UserRole = 'admin' | 'member'
type UserWithRole = User & { role: UserRole }
```

### Avoid `any`

- Avoid `any` in application code.
- Use `unknown` for external or untrusted input, then narrow it safely.
- Use generics when a value's type depends on the caller.

```typescript
// WRONG: any removes type safety
function getErrorMessage(error: any) {
  return error.message
}

// CORRECT: unknown forces safe narrowing
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return 'Unexpected error'
}
```

### React props

- Define component props with a named `interface` or `type`; type callback props explicitly.
- Prefer `type Props = {}` for closed component prop shapes; use `interface` only when the prop type is extended via declaration merging or exported as a public API extension point.
- Do not use `React.FC` unless there is a specific reason to.
- Always destructure props in the parameter list — no `props.user` access inside the body.

```tsx
type Props = {
  user: User;
  onSelect: (id: string) => void;
};

export function UserCard({ user, onSelect }: Props) {
  return (
    <button type="button" onClick={() => onSelect(user.id)}>
      {user.name}
    </button>
  );
}
```

### JavaScript files

- In `.js`/`.jsx` files, use JSDoc when types improve clarity and a TypeScript migration isn't practical; keep JSDoc aligned with runtime behavior.

## Immutability

Return new objects/arrays via spread or `map`/`filter` — never mutate an argument you were handed. Shared references make in-place mutation a spooky-action-at-a-distance bug: some other holder of the same object sees a change it never asked for.

```typescript
interface User {
  id: string
  name: string
}

// WRONG — mutates the caller's object
function updateUser(user: User, name: string): User {
  user.name = name
  return user
}

// CORRECT — returns a new object, original untouched
function updateUser(user: Readonly<User>, name: string): User {
  return { ...user, name }
}
```

- **Object field:** `{ ...obj, field: value }`.
- **Nested field:** spread each level you touch — `{ ...obj, addr: { ...obj.addr, city } }`.
- **Array append/remove:** `[...list, item]`, `list.filter(x => x.id !== id)`, `list.map(x => x.id === id ? { ...x, done: true } : x)` — not `push`/`splice`/index assignment.
- **Record update:** `{ ...map, [key]: value }` and `const { [key]: _drop, ...rest } = map` to remove a key.

A locally-scoped object that never escapes the function — a builder/accumulator you allocated and return once — is fine to mutate. The rule protects values that are *shared*.

## Error handling

Use `async`/`await` with `try`/`catch` and narrow `unknown` errors before reading them.

```typescript
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Unexpected error'
}

async function loadUser(userId: string): Promise<User> {
  try {
    return await riskyOperation(userId)
  } catch (error: unknown) {
    logger.error('Operation failed', error)
    throw new Error(getErrorMessage(error))
  }
}
```

- Handle errors explicitly with context, then re-raise or return a typed error.
- Empty `catch` blocks that swallow the error are a defect, not a shortcut.
- `JSON.parse` throws on invalid input — always wrap it.
- Always `throw new Error("message")`, never `throw "message"`.
- Wrap React trees that fetch or do async work in an `<ErrorBoundary>`.

## Input validation

Validate external input at the boundary with a schema (Zod) and infer the type from the schema rather than hand-writing both.

```typescript
import { z } from 'zod'

const userSchema = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(150)
})

type UserInput = z.infer<typeof userSchema>
const validated: UserInput = userSchema.parse(input)
```

Read required secrets from the environment and fail fast at startup if one is missing.

## Console/logging

No `console.log` statements in production code — use a structured logger.

## Common patterns

### API response format

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: { total: number; page: number; limit: number }
}
```

### Repository pattern

```typescript
interface Repository<T> {
  findAll(filters?: Filters): Promise<T[]>
  findById(id: string): Promise<T | null>
  create(data: CreateDto): Promise<T>
  update(id: string, data: UpdateDto): Promise<T>
  delete(id: string): Promise<void>
}
```

### Custom hooks

```typescript
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}
```

## Secret management

```typescript
// NEVER: hardcoded secrets
const apiKey = "sk-proj-xxxxx"

// ALWAYS: environment variables, fail fast if missing
const apiKey = process.env.API_KEY
if (!apiKey) {
  throw new Error('API_KEY not configured')
}
```

## Testing (TypeScript baseline)

Use **Playwright** for E2E tests covering critical user flows. React-specific component/hook testing patterns are covered in the [react-testing skill](#) below.

---

# React coding style

## File extensions

- `.tsx` for any file containing JSX, even a one-liner.
- `.ts` for pure logic, custom hooks without JSX, type definitions, utilities.
- `.test.tsx` / `.test.ts` mirroring the source file.
- Use `.jsx` only when the project intentionally avoids TypeScript — flag every new untyped React file in review.

## Naming

- Components: `PascalCase` for both the symbol and the file (`UserCard.tsx`, default export `UserCard`).
- Custom hooks: `useCamelCase` for the symbol, kebab-case for the file when that's the project convention (`use-debounce.ts` exports `useDebounce`).
- Context: `<Domain>Context` symbol, `<Domain>Provider` provider component, `use<Domain>` consumer hook.
- Event handlers: `handleClick`, `handleSubmit` inside the component; the prop that receives it is `onClick`, `onSubmit`.
- Boolean props: `isLoading`, `hasError`, `canSubmit` — never `loading` or `error` alone for booleans.

## JSX

- Self-close tags with no children: `<img />`, `<UserCard user={u} />`.
- Use fragments `<>...</>` over a wrapper `<div>` when no DOM element is needed.
- Conditional rendering: `{condition && <Foo />}` for booleans, ternary for either/or, early return for guard clauses. **Use a ternary, not `&&`, when the left side can be `0`** — `{count && <Badge>{count}</Badge>}` renders the literal text `0`; use `{count > 0 ? <Badge>{count}</Badge> : null}`.
- Never put logic inline in JSX when it reads as multi-line — extract to a const above the return or a function.

```tsx
// Prefer
const greeting = user.isAdmin ? "Welcome, admin" : `Hello ${user.name}`;
return <h1>{greeting}</h1>;

// Over
return <h1>{user.isAdmin ? "Welcome, admin" : `Hello ${user.name}`}</h1>;
```

## Imports

- React imports first, then third-party libs, then absolute project imports, then relative.
- Type-only imports: `import type { ReactNode } from "react"` — never mix runtime and type imports in one statement when `consistent-type-imports` is configured.

## Hooks discipline

- Custom hooks must start with `use` — enforced by `eslint-plugin-react-hooks`.
- Hooks are top-level only, never conditional (not inside `if`/`for`/`&&`/ternary, not after an early return).
- Group all hook calls at the top of the component, before any conditional logic.
- Cleanup every subscription, interval, and listener.
- Use the functional updater (`setX(prev => prev + 1)`) when new state depends on old state.
- Default position: do not memoize — add `useMemo`/`useCallback` only when a profiler or a dependency chain proves it matters.
- Avoid creating ad-hoc hooks for one-line wrappers — inline the call instead; extract a custom hook only when the same hook sequence appears in 2+ components.

## State

- Local first (`useState`), lift only when shared.
- Context for cross-cutting, low-frequency reads (theme, auth, i18n) — not for high-frequency updates. Split context by concern: one context per concern so a change to `ThemeContext` doesn't re-render `AuthContext` consumers.
- External store (Zustand, Jotai, Redux Toolkit) when state must persist across route changes, sync across tabs, or be debugged via devtools.
- Server-derived data belongs in a server-state library (TanStack Query, SWR, RSC fetch), not application state.
- Never duplicate state that can be derived — compute during render, never via `useEffect`.

```tsx
// Bad: derived state stored separately, desyncs, extra render cycle
const [total, setTotal] = useState(0);
useEffect(() => {
  setTotal(items.reduce((sum, i) => sum + i.price * i.qty, 0));
}, [items]);

// Good: derive during render
const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
```

### State location decision tree

1. Used by one component → `useState` inside it.
2. Used by parent + a few children → lift to nearest common ancestor, pass via props.
3. Used across distant branches, low-frequency reads → React Context.
4. High-frequency updates shared across the tree → external store (Zustand, Jotai, Redux Toolkit).
5. Server-derived data → server-state library (TanStack Query, SWR, RSC fetch) — not application state.

Context misused for frequently changing values causes every consumer to re-render on every update. Most pages need neither context nor a global store — resist abstraction until duplicated lifting becomes painful.

## Class components

Forbidden in new code. Convert legacy class components to function components when touching them for non-trivial changes. Error boundaries remain a class API (no functional equivalent as of React 19) unless using a wrapper library such as `react-error-boundary`.

## File layout per component

```
components/UserCard/
  UserCard.tsx
  UserCard.module.css   # or styled-components, or Tailwind classes inline
  UserCard.test.tsx
  index.ts              # re-export only
```

Inline single-file components are fine for trivial presentational pieces.

## Container / presentational split

Container components own data fetching, state, and side effects. Presentational components receive props and render — no service calls, no hooks beyond local UI state.

```tsx
// Container — owns data
export function UserPage({ userId }: { userId: string }) {
  const { data: user, isLoading } = useUser(userId);
  if (isLoading) return <Spinner />;
  if (!user) return <NotFound />;
  return <UserCard user={user} onSelect={handleSelect} />;
}

// Presentational — pure
export function UserCard({ user, onSelect }: { user: User; onSelect: (id: string) => void }) {
  return <button onClick={() => onSelect(user.id)}>{user.name}</button>;
}
```

## Server / Client Component boundary (RSC, Next.js App Router)

- Server Components are the default — they run on the server, don't ship to the client, and can `await` directly. Only add `"use client"` when the file uses state, effects, refs, browser APIs, or event handlers; place the directive on line 1, before any imports.
- Data flows down: a Server Component can render a Client Component and pass serializable props. A Client Component cannot import a Server Component, but it can receive one via `children` or named slots.
- Never import a Client Component file from inside a `"use server"` action file. Never re-export server-only code through a client module — the bundler will silently include it. Mark sensitive modules with `import "server-only"` so the bundler errors if a client file imports them.

```tsx
// Server (default)
export default async function Page() {
  const user = await fetchUser();
  return <UserClient user={user} />;
}

// Client
"use client";
export function UserClient({ user }: { user: User }) {
  const [tab, setTab] = useState("profile");
  return <Tabs value={tab} onChange={setTab}>{user.name}</Tabs>;
}
```

## Suspense + error boundaries

Every Suspense boundary needs an Error Boundary above it — the pair handles both states. Place boundaries close to where data is needed, not at the route root; multiple narrower boundaries reveal loaded content progressively. A boundary catches errors thrown during render, lifecycle, and constructors of its children — NOT in event handlers or async code.

```tsx
<ErrorBoundary fallback={<ErrorView />}>
  <Suspense fallback={<Skeleton />}>
    <UserDetails id={id} />
  </Suspense>
</ErrorBoundary>
```

## Forms

**Uncontrolled (React 19 + form actions)** — prefer when the form has a clear submit step; the browser owns the value, React reads it via `FormData` on submit.

```tsx
async function action(formData: FormData) {
  "use server";
  await saveUser({ name: String(formData.get("name")) });
}

export function UserForm() {
  return (
    <form action={action}>
      <input name="name" required />
      <button type="submit">Save</button>
    </form>
  );
}
```

**Controlled** — use when the value drives other UI, requires real-time validation, or formatting.

**Complex forms** (multi-step, dynamic field arrays, cross-field validation) — use a library: React Hook Form (minimal re-renders, uncontrolled-first), TanStack Form (typed, framework-agnostic), or Final Form. Roll-your-own state management for forms past trivial complexity is a maintenance trap.

## Data fetching

| Strategy | When |
|---|---|
| RSC fetch (`await` in Server Component) | Per-request data in Next.js App Router, no client-side cache needed |
| TanStack Query | Client-side cache, mutations, optimistic updates, polling |
| SWR | Lightweight cache + revalidation, simpler than TanStack Query |
| `fetch` in `useEffect` | Avoid — race conditions, no cache, no retry. Only acceptable for one-off fire-and-forget |

Never fetch in a `useEffect` when a real cache library is available — they handle deduping, cache invalidation, error retry, and Suspense integration.

## Lists and keys

`key` must be stable across renders — never `index` for any list that can reorder, insert, or delete. `key` must be unique among siblings, not globally. A reordered list with index keys causes state in child components to attach to the wrong row.

## Composition over inheritance

Pass `children` for slot-style composition, render-prop functions for parameterized rendering, component types for plug-in points (`renderItem={UserRow}`). Never extend a component class to specialize behavior.

## Compound components

For related controls (Tabs, Accordion, Menu), share state via Context:

```tsx
<Tabs defaultValue="profile">
  <Tabs.List>
    <Tabs.Trigger value="profile">Profile</Tabs.Trigger>
    <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Panel value="profile"><ProfileForm /></Tabs.Panel>
  <Tabs.Panel value="settings"><SettingsForm /></Tabs.Panel>
</Tabs>
```

## Portals

Use `createPortal` for modals, tooltips, toast containers — anything that must escape the parent's `overflow: hidden` or `z-index` stacking context. Render to a stable DOM node mounted in `index.html`.

## Refs (React 19+)

React 19 lets function components accept `ref` as a regular prop — `forwardRef` is no longer required for new code. Older codebases on React 18 still need `forwardRef`.

```tsx
export function Input({ ref, ...rest }: { ref?: React.Ref<HTMLInputElement> } & InputProps) {
  return <input ref={ref} {...rest} />;
}
```

## Accessibility-first composition

- Always render semantic HTML (`<button>`, `<a>`, `<nav>`, `<main>`) before reaching for `role` attributes.
- Every interactive element must be reachable by keyboard.
- Form inputs need labels — `<label htmlFor>` or `aria-label` if visually labeled by an icon.
- Manage focus on route changes and modal open/close.

## Out of scope (pointer, not a hard boundary)

Next.js App Router specifics (Server Actions, Route Handlers, Middleware, Parallel/Intercepted Routes, streaming Metadata) and React Native (platform-specific imports, `StyleSheet`, navigation libraries) are separate framework concerns — follow their official docs. React core hooks/patterns in this document still apply there.

---

# React security

## XSS via `dangerouslySetInnerHTML`

CRITICAL. The prop name is deliberately scary — treat every usage as a code review halt.

```tsx
// CRITICAL: unsanitized user input
<div dangerouslySetInnerHTML={{ __html: userBio }} />

// CORRECT options:
// 1. Render as text
<div>{userBio}</div>

// 2. Render parsed markdown via a library that sanitizes
<ReactMarkdown>{userBio}</ReactMarkdown>

// 3. If raw HTML is required, sanitize first with DOMPurify
import DOMPurify from "isomorphic-dompurify";
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userBio) }} />
```

Audit checklist for every `dangerouslySetInnerHTML` call: is the input always under our control (document the source)? If user-derived, is it sanitized at the *same call site* (sanitization only at the API boundary is acceptable if every consumer is verified)? Is the sanitizer config allowlisting tags, not denylisting?

## Unsafe URL schemes

`javascript:` and `data:` URLs in `href`, `src`, and `xlink:href` execute arbitrary code. React warns about `javascript:` URLs in `href` in development mode but does not block them at runtime; `data:` URLs and other schemes also slip through — always validate.

```tsx
// CRITICAL: javascript: URL injection
<a href={user.website}>Visit</a>   // if user.website = "javascript:alert(1)"

// CORRECT: validate scheme
function safeUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    if (["http:", "https:", "mailto:"].includes(parsed.protocol)) return url;
  } catch {
    return undefined;
  }
  return undefined;
}
<a href={safeUrl(user.website)}>Visit</a>
```

## `target="_blank"` without `rel`

`<a target="_blank">` without `rel="noopener noreferrer"` lets the target page access `window.opener` and run navigation hijacks. Modern browsers default to `noopener`, but don't rely on the default — be explicit.

```tsx
// WRONG
<a href={externalUrl} target="_blank">External</a>

// CORRECT
<a href={externalUrl} target="_blank" rel="noopener noreferrer">External</a>
```

## Server Action input validation

Server Actions (`"use server"`) run with the same trust level as a public API endpoint — validate every input, authenticate inside the action (don't trust the client-side route gate), and authorize per-record.

```tsx
"use server";
import { z } from "zod";

const Input = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(120),
});

export async function updateUser(_state: unknown, formData: FormData) {
  const parsed = Input.safeParse({
    email: formData.get("email"),
    age: Number(formData.get("age")),
  });
  if (!parsed.success) return { error: parsed.error.flatten() };
  // ...
}
```

## Secret exposure via env vars

Prefixed env vars are bundled into the client — treat them as public.

| Framework | Public prefix | Private |
|---|---|---|
| Next.js | `NEXT_PUBLIC_*` | All others |
| Vite | `VITE_*` | `.env` server-side only |
| Create React App | `REACT_APP_*`, plus `NODE_ENV`, `PUBLIC_URL` | All others |
| Remix | `process.env` access in `loader`/`action` only | Same |

```ts
// CRITICAL: secret leaked to client bundle
const apiKey = process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY;
```

Audit on every PR that touches env vars: would this string in the public bundle be a problem?

## Authentication / authorization

- Never store sessions in `localStorage` — accessible to any XSS. Use httpOnly secure cookies.
- Never trust client-set state to gate sensitive UI. Render-gating in JSX prevents display, not access — the API must enforce it.
- CSRF: cookie-based auth requires CSRF tokens or `SameSite=Strict`/`Lax` cookies; use double-submit cookies or origin verification for form actions when not using framework defaults.

## Content Security Policy

Configure server-side. Minimum acceptable CSP for a React app:

```
default-src 'self';
script-src 'self' 'nonce-{REQUEST_NONCE}';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
connect-src 'self' https://api.example.com;
frame-ancestors 'none';
```

Avoid `unsafe-inline`/`unsafe-eval` in `script-src`. For SSR with inline scripts (Next.js streaming, hydration data), use per-request nonces. `style-src 'unsafe-inline'` is often unavoidable for CSS-in-JS — document the tradeoff.

## Prototype pollution via object spread

```tsx
// WRONG: untrusted JSON spread directly into state
const update = await req.json();
setState({ ...state, ...update });    // attacker controls __proto__

// CORRECT: parse with a schema, or guard keys
const Allowed = z.object({ name: z.string(), email: z.string().email() });
const parsed = Allowed.parse(await req.json());
setState({ ...state, ...parsed });
```

## SSR template injection

Values rendered inside JSX are escaped by React — safe. Values passed to `dangerouslySetInnerHTML` are NOT escaped — same rules as client. Manually constructed HTML wrappers around React output must be escaped or sanitized — never concatenate user input into the surrounding HTML template.

## Third-party components

Audit `npm audit` before adding any UI library. Check the library doesn't internally use `dangerouslySetInnerHTML` on its input (e.g., rich text editors). Pin versions, review changelogs before major upgrades. Be wary of components that accept raw HTML strings as props.

## Source map exposure in production

Production builds should ship without source maps, or with sourcemaps uploaded to an error tracker (Sentry) and stripped from the public bundle — public source maps leak internal logic and file structure.

---

# React testing

## Library choice

- **React Testing Library (RTL)** — the standard for component testing; tests behavior through the rendered DOM.
- **Vitest** — preferred runner for new Vite-based projects; faster than Jest, native ESM, same API.
- **Jest** — still the default for Next.js/CRA projects; RTL works identically.
- **Playwright Component Testing** — when component tests need a real browser engine (animation, layout, complex events).
- **Cypress Component Testing** — alternative real-browser component runner.

Pick one component test runner per project — do not mix RTL + Playwright CT in the same repo.

## Core principle

Test what the user sees and does, not implementation details. Query by accessible role first, then label, then text — fall back to `data-testid` only when nothing else fits. Never assert on internal state, props passed to children, or which hooks were called. Refactor without breaking tests = the test was testing behavior; that's the goal.

## Query priority

1. **Accessible to everyone:** `getByRole(role, { name })` (primary choice), `getByLabelText` (form inputs), `getByPlaceholderText` (when no label — and add one), `getByText` (non-interactive text), `getByDisplayValue` (form field with a current value).
2. **Semantic:** `getByAltText` (images), `getByTitle` (last resort, low accessibility value).
3. **Test IDs:** `getByTestId("some-id")` — escape hatch only, when none of the above work.

`getBy*` throws when no match. `queryBy*` returns `null` (use for asserting absence). `findBy*` returns a promise (use for async).

## User interaction with `userEvent`

Prefer `userEvent` over `fireEvent` — it simulates a real browser sequence (focus, keydown, beforeinput, input, keyup); `fireEvent` dispatches a single synthetic event.

```tsx
import userEvent from "@testing-library/user-event";

test("submits the form", async () => {
  const user = userEvent.setup();
  render(<UserForm onSubmit={handleSubmit} />);

  await user.type(screen.getByLabelText("Email"), "user@example.com");
  await user.click(screen.getByRole("button", { name: /save/i }));

  expect(handleSubmit).toHaveBeenCalledWith({ email: "user@example.com" });
});
```

Always `await` `userEvent` calls — they are async. Call `userEvent.setup()` once at the top of each test, then reuse the returned `user`.

## Async assertions

```tsx
// WRONG: synchronous query for async-rendered content
expect(screen.getByText("Loaded")).toBeInTheDocument();   // throws — not in DOM yet

// CORRECT: findBy* (returns a promise, retries)
expect(await screen.findByText("Loaded")).toBeInTheDocument();

// CORRECT: waitFor for non-element assertions
await waitFor(() => expect(saveSpy).toHaveBeenCalled());

// CORRECT: element that should disappear
await waitForElementToBeRemoved(() => screen.queryByText("Loading"));
```

Never `setTimeout` + assertion — flaky.

## Network mocking with MSW

Mock Service Worker mocks at the network layer, so the component, hooks, and fetch library all behave as in production.

```tsx
// test/setup.ts
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/users/:id", ({ params }) =>
    HttpResponse.json({ id: params.id, name: "Alice" }),
  ),
];

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

`onUnhandledRequest: "error"` makes any unmocked request fail loudly — silent passes are worse than red. Per-test override:

```tsx
test("renders error on 500", async () => {
  server.use(http.get("/api/users/:id", () => new HttpResponse(null, { status: 500 })));
  render(<UserPage id="1" />);
  expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
});
```

## Provider wrapping

Wrap providers once in a `test-utils.tsx` and export from there — use everywhere instead of re-wrapping per test.

```tsx
function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <ThemeProvider theme={lightTheme}>
        <Router>{ui}</Router>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}
```

## Custom hook testing

Use `renderHook`/`act` from RTL. Always wrap state-changing calls in `act`; always test through the public hook API, not internal implementation. For hooks reading context, pass a `wrapper`. Instantiate a shared `QueryClient` once per test, outside the wrapper closure — creating it inside resets cache state on every render and produces flaky tests.

```tsx
import { renderHook, act } from "@testing-library/react";

test("useCounter increments", () => {
  const { result } = renderHook(() => useCounter());
  act(() => result.current.increment());
  expect(result.current.count).toBe(1);
});
```

## Accessibility assertions

```tsx
import { axe } from "vitest-axe";   // or jest-axe

test("UserCard has no a11y violations", async () => {
  const { container } = render(<UserCard user={mockUser} />);
  expect(await axe(container)).toHaveNoViolations();
});
```

Run axe assertions in component tests for every interactive component — catches missing labels, invalid ARIA usage, poor color contrast (limited to inline styles; real visual contrast belongs in Playwright), missing alt text, and heading order violations.

## Avoid snapshot tests for components

Snapshots of rendered output are brittle, hard to review, and get rubber-stamped by reviewers — they test DOM structure, not behavior. Acceptable uses: pure data serialization functions (stable string output) and generated config files. For component visual regression, use Playwright/Cypress/Percy screenshots — actual visual diffs, not DOM diffs.

## Coverage targets

| Layer | Target |
|---|---|
| Pure utility functions | ≥90% |
| Custom hooks | ≥85% |
| Components (presentational) | ≥80% — behavior, not lines |
| Container components | ≥70% — golden paths + error states |
| Pages (E2E covered separately) | Smoke test per route minimum |

## Anti-patterns

- Asserting on `container.querySelector` — bypasses accessibility queries.
- Asserting on number of renders — implementation detail.
- Mocking React itself or framework hooks (`jest.mock("react", ...)`) — refactor the component instead.
- Mocking child components by default — tests the integration, not the parent in isolation; mock only when the child has heavy side effects.
- Ignoring `act()` warnings — they indicate real bugs (state update after unmount, missing async wrapping).
- Sharing mutable state across tests — flakes when test order changes.

## When to reach for Playwright/Cypress

RTL + JSDOM cannot test real layout (flexbox, grid, viewport-dependent rendering), scrolling, drag-and-drop, paste from clipboard, native browser animation/CSS transitions, or cross-frame interactions (iframes, popups). For those, use Playwright Component Testing or full end-to-end Playwright/Cypress runs.

---

# React performance

Organized by priority — highest-impact categories first. Rules are adapted from Vercel Labs' `react-best-practices` skill (MIT).

## 1. Eliminating waterfalls (CRITICAL)

Every sequential `await` adds full network latency — this is the #1 performance killer.

- **Cheap conditions before await:** check sync conditions (props, env, hardcoded flags) before awaiting remote data.
- **Defer awaits until used:** move `await` into the branch that actually needs it, don't await unconditionally up front.
- **`Promise.all` for independent work:**

```ts
// INCORRECT — sequential
const user = await getUser(id);
const posts = await getPosts(id);
const followers = await getFollowers(id);

// CORRECT — parallel
const [user, posts, followers] = await Promise.all([
  getUser(id),
  getPosts(id),
  getFollowers(id),
]);
```

- **Partial dependencies — start early, await late:** kick off all promises immediately, only `await` each when its result is actually needed.
- **Suspense for streaming:** push `<Suspense>` boundaries close to the data so the page paints what it can while slower sub-trees stream in; reserve space (skeleton/`min-height`) for the resulting layout shift.
- **Server Components: parallel through composition** — sibling `await`s inside one async Server Component run sequentially; split into sibling child components instead so React can run them in parallel.

## 2. Bundle size (CRITICAL)

- **Direct imports, not barrels:** `import { Button } from "@/components/Button"` — barrel `index.ts` files force the bundler to walk the entire module graph even when tree-shaking removes most of it; this can cost 200-800ms of first-load JS. Next.js 13.5+'s Optimize Package Imports automates this for listed packages.
- **Statically analyzable paths:** `name === "home" ? await import("./pages/home") : await import("./pages/about")`, never a template-literal dynamic import path — it defeats bundler/trace analysis.
- **Dynamic imports for heavy components:** `dynamic(() => import("./HeavyChart"), { loading: () => <Skeleton />, ssr: false })`.
- **Defer third-party scripts:** load analytics, logging, support widgets after hydration (`next/script` `strategy="afterInteractive"` or `"lazyOnload"`).
- **Conditional module loading:** `if (user.role === "admin") { const { AdminPanel } = await import("./admin/AdminPanel"); }`.
- **Preload on hover/focus:** trigger `<link rel="preload">` or `import()` on hover so the bundle is cached by click time.

## 3. Server-side performance (HIGH)

- **Authenticate Server Actions like API routes:** every `"use server"` function is a public endpoint — authenticate and authorize inside the action itself, never rely on the calling Client Component's gating.
- **`React.cache()` for per-request dedup:** `getUser("1")` called from three Server Components in the same render becomes one DB query.
- **LRU cache for cross-request data** that doesn't change per request (config, lookup tables) — cache outside React with an LRU cache or `unstable_cache`.
- **Avoid duplicate serialization in RSC props:** when a Server Component renders the same data into multiple Client Components, lift the Client Component up and pass `children` instead.
- **Hoist static I/O to module scope** — e.g. `readFileSync` for a font at module load, not per-request.
- **No mutable module-level state in RSC/SSR** — it's shared across all requests, a race condition between users. Use request-scoped storage instead.
- **Minimize data passed to Client Components** — only serialize what the client needs; strip fields, paginate, project columns at the DB layer.
- **Parallelize nested fetches** with `Promise.all` per item when enriching a list.
- **Use `after()`** (Next.js 15) for non-blocking work after the response is sent — logging, cache warming, analytics.

## 4. Client-side data fetching (MEDIUM-HIGH)

- Use SWR or TanStack Query for deduplication — multiple components calling `useUser(id)` should share one network request and one cache entry; never roll your own `useEffect` + `fetch` for shared data.
- Deduplicate global event listeners — one shared listener via a hook + global subject, not one `addEventListener` per component instance.
- Use passive listeners for scroll (`{ passive: true }`) — improves scroll smoothness (the listener can't `preventDefault()`).
- `localStorage`: always store a `version` field and bump it on schema change; keep payloads small since the API is synchronous and blocks the main thread.

## 5. Re-render optimization (MEDIUM)

- Don't subscribe to state that's only used in callbacks — read it once via `store.getState()` at call time instead of subscribing.
- Extract expensive work into `memo`-wrapped components so a child re-renders only when its actual props change.
- Hoist default non-primitive props to a module-level constant (`const EMPTY: Item[] = []`) — an inline `items ?? []` creates a new array every render and breaks memoization.
- Use primitive dependencies in effects, not object/array literals that get a new identity every render.
- Subscribe to derived booleans from a store, not the raw collection (`useStore(s => s.cart.length > 0)` re-renders only when emptiness flips).
- Derive during render, never via `useEffect` — `useEffect(() => setFull(`${first} ${last}`), [first, last])` adds a render cycle for no reason; `const full = `${first} ${last}`` doesn't.
- Use the functional `setState` updater for stable callbacks (`useCallback(() => setCount(c => c + 1), [])`).
- Use a lazy state initializer (`useState(() => parseTree(largeInput))`) for expensive initial values.
- Avoid `useMemo` for cheap primitives (`x + 1`) — memo earns its keep on object identity and genuinely expensive computation.
- Split hooks with independent dependencies instead of one hook reading multiple unrelated sources, so an unrelated source's update doesn't re-run both selectors.
- Move interaction logic into event handlers, which run only on the user action, instead of `useEffect`, which re-runs whenever its deps change.
- Use `startTransition`/`useTransition` for non-urgent updates and `useDeferredValue` for expensive renders driven by fast-changing input.
- Use `useRef` for transient, frequently-changing values that should not trigger a re-render (timestamps, last-key, accumulators).
- Don't define components inside components — each render creates a new component type, defeating reconciliation and unmounting children.

## 6. Rendering performance (MEDIUM)

- Animate the wrapper `<div>` around an SVG (GPU-accelerated), not the SVG itself (triggers paint).
- `content-visibility: auto` on long-list rows lets the browser skip offscreen rendering — a major win for lists with hundreds of rows.
- Hoist static JSX to a module-level constant when it never changes across renders.
- Reduce SVG coordinate precision (`M10.123456,20.654321` → `M10.12,20.65`) — each digit costs bytes with no visible difference.
- For hydration no-flicker on values needed before hydration (theme, locale), inline a `<script>` that sets `document.documentElement.dataset.*` before React mounts.
- Use `suppressHydrationWarning` only on known-divergent leaf nodes (e.g. a `<time>` rendering `Date.now()`), never on a tree containing other children.
- Use React 19's `<Activity mode="visible|hidden">` for show/hide instead of mount/unmount — cheaper for tabs and accordions since it keeps tree state and effects mounted.
- Use a ternary, not `&&`, for conditional render when the left side can be falsy-but-not-boolean (`0` renders as a text node).
- Use `preload`/`preconnect` from `react-dom` for resource hints; `defer`/`async` on `<script>` tags as appropriate.

## 7. JavaScript performance (LOW-MEDIUM)

Batch DOM/CSS changes via class swap, not property-by-property. Use `Map` for repeated lookups (`O(1)` vs `O(n)`). Cache property access in loops (`const len = arr.length`). Memoize pure functions with a module-level `Map`. Cache `localStorage` reads — one read per render, not per access. Combine `filter().map()` into a single pass. Check array length before expensive comparisons. Prefer early return. Hoist `RegExp` construction out of loops. Loop for min/max instead of `sort()` (`O(n)` vs `O(n log n)`). Use `Set`/`Map` for membership tests over `Array.includes`. Use `toSorted()` over in-place `.sort()` when immutability matters. Use `flatMap` to map and filter in one pass. Use `requestIdleCallback` for non-critical work.

## 8. Advanced patterns (LOW)

- Values from `useEffectEvent` are stable — do not add them to an effect's dependency array.
- For a stable callback passed to a memoized child, keep the latest handler in a ref and wrap a stable `useCallback` around reading `ref.current`.
- Guard module-level singleton initialization (telemetry, logger) with a module-scope flag, not `useEffect`.

## Automation note

Many of the re-render rules above are now automatable — Next.js 13.5+'s Optimize Package Imports, the React Compiler (auto-memoization), Turbopack, and `@next/bundle-analyzer`. Once a project ships the React Compiler, demote manual `useMemo`/`useCallback` memoization to review-only — it becomes unnecessary noise.

## Web Vitals mapping

| Metric | Most relevant categories |
|---|---|
| LCP (Largest Contentful Paint) | Waterfalls, Bundle Size, Resource Hints |
| INP (Interaction to Next Paint) | Re-render, Rendering, JavaScript |
| CLS (Cumulative Layout Shift) | Rendering (Suspense placement, image dimensions) |
| TBT (Total Blocking Time) | Bundle Size, JavaScript, Defer Third-Party |

---

## Flag in review (a linter won't catch these)

- An exported function with no parameter/return types.
- `any` where `unknown` plus a type guard would do.
- In-place mutation of a function argument or of React state.
- A repeated inline object shape that should be a named type.
- A hook called conditionally, or state mutated directly then passed to `setState`.
- `dangerouslySetInnerHTML` with unsanitized input, or an unvalidated URL scheme in `href`/`src`.
- `target="_blank"` without `rel="noopener noreferrer"`.
- A `"use server"` action with no schema validation or authorization check.
- A `NEXT_PUBLIC_*`/`VITE_*`/`REACT_APP_*` env var holding a private secret.
- `key={index}` on a list that can reorder, insert, or delete.
- Sequential `await`s that could run via `Promise.all`.

## Workflow pack: TypeScript rules

Full TypeScript + React standards (types, immutability, errors, RSC boundaries, hooks, security, testing, performance) with three reviewers, four skills, and a guarded typecheck hook — the complete ECC TS/React corpus, not a distillation.

### Roles

- **typescript-reviewer** — Reviews changed TypeScript/JavaScript against the standards: explicit public-API types, unknown over any, immutable updates, Zod boundaries, and env-var secrets. Reports file:line + severity. Use after any TS/JS change.
- **react-reviewer** — Expert React/JSX code reviewer specializing in hook correctness, render performance, server/client component boundaries, accessibility, and React-specific security. Use for any change touching .tsx/.jsx files or React component logic.
- **type-design-analyzer** — Analyzes type design for encapsulation, invariant expression, usefulness, and enforcement — whether types make illegal states harder or impossible to represent. Use when reviewing a new or changed type/interface for domain modeling quality, not just correctness.

### Commands

- **/typescript-review** `[base ref]` — Run the TypeScript reviewer over the current change against this pack's TypeScript standards.
  - How it runs: Invoke the typescript-reviewer subagent on the changed TypeScript files (the diff since $ARGUMENTS, or the working tree if no ref is given). It checks this pack's conventions — explicit public-API types, unknown over any with narrowing, immutable updates, and Zod at the boundary — and reports file:line + severity. Formatting and lint rules are CI's job; don't re-litigate them. Fix any Critical or Important findings before merging.
- **/react-review** `[base ref]` — Run the React reviewer over the current change against this pack's React standards.
  - How it runs: Invoke the react-reviewer subagent on the changed .tsx/.jsx files (the diff since $ARGUMENTS, or the working tree if no ref is given). It checks this pack's React conventions — hook correctness, render performance, server/client boundaries, accessibility, and React-specific security (dangerouslySetInnerHTML, unsafe URL schemes, Server Action validation, env var leaks) — and reports file:line + severity. For a JSX/TSX change, also run /typescript-review — the two reviewers cover disjoint lanes. Fix any Critical or Important findings before merging.

### Guardrails

- After an edit, check formatting with prettier when it is installed.
- After an edit, typecheck with tsc when the project has a tsconfig.json.

### Skills

- **immutable-updates** — Use when updating objects, arrays, or records in application code — return a new copy with the change applied instead of mutating the original in place, to prevent hidden side effects and aliasing bugs.
- **react-patterns** — Use when writing or reviewing React function components, custom hooks, or component trees — covers hooks discipline, state location, Server/Client Component boundaries, Suspense + error boundaries, form actions, data fetching, and accessibility-first composition for React 18/19.
- **react-performance** — Use when writing, reviewing, or refactoring React/Next.js code for performance — 70+ rules across waterfalls, bundle size, server-side performance, client fetching, re-renders, rendering, JS micro-perf, and advanced patterns, adapted from Vercel Engineering's React Best Practices.
- **react-testing** — Use when writing or fixing tests for React components, hooks, or pages — React Testing Library query priority, userEvent, async assertions, MSW network mocking, accessibility assertions with axe, and the RTL-vs-Playwright decision boundary.

Tool-specific implementations live alongside this file (see `CLAUDE.md` for the Claude Code implementation). Tools without a native subagent/command surface should treat the sections above as operating instructions.
