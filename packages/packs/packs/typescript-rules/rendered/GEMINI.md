# GEMINI.md

@AGENTS.md

## Skills

### immutable-updates

Use when updating objects, arrays, or records in application code — return a new copy with the change applied instead of mutating the original in place, to prevent hidden side effects and aliasing bugs.

# Immutable updates

When you change a value, **produce a new copy — never mutate the argument you were handed.** Shared
references mean an in-place mutation is a spooky-action-at-a-distance bug: some other holder of the
same object sees a change it never asked for.

```ts
// WRONG — mutates the caller's object
function rename(user, name) {
  user.name = name;
  return user;
}

// CORRECT — returns a new object, original untouched
function rename(user, name) {
  return { ...user, name };
}
```

## Patterns

- **Object field:** `{ ...obj, field: value }`.
- **Nested field:** spread each level you touch — `{ ...obj, addr: { ...obj.addr, city } }`.
- **Array append/remove:** `[...list, item]`, `list.filter(x => x.id !== id)`,
  `list.map(x => x.id === id ? { ...x, done: true } : x)` — not `push`/`splice`/index assignment.
- **Record update:** `{ ...map, [key]: value }` and `const { [key]: _drop, ...rest } = map` to remove.

## Why it pays off

- **No hidden side effects.** A function that returns a new value can't corrupt state its caller
  still depends on. Behavior is a function of inputs, not of call order.
- **Debugging is local.** When a value is wrong, the mutation that produced it is the expression
  that built it — not some distant `.sort()` or field write on a shared reference.
- **Safe concurrency and change-detection.** Referential equality (`prev !== next`) becomes a
  reliable "did this change?" signal for caches, memoization, and UI diffing.

## When in-place is acceptable

A locally-scoped object that never escapes the function — a builder/accumulator you allocated and
return once — is fine to mutate. The rule protects values that are *shared*: arguments, fields on
long-lived state, anything another holder still references.

### react-patterns

Use when writing or reviewing React function components, custom hooks, or component trees — covers hooks discipline, state location, Server/Client Component boundaries, Suspense + error boundaries, form actions, data fetching, and accessibility-first composition for React 18/19.

# React Patterns

Idiomatic React 18/19 patterns for building robust, accessible, performant component trees.

## When to Activate

- Writing or modifying React function components, custom hooks, or component trees
- Reviewing JSX/TSX files
- Designing state shape or component composition
- Migrating class components or older `forwardRef`/`useEffect`-heavy code
- Choosing between local state, lifted state, context, and external stores
- Working with Server Components / Client Components (Next.js App Router, RSC)
- Implementing forms with React 19 actions or controlled inputs
- Wiring data fetching with TanStack Query / SWR / RSC

## Core Principles

### 1. Render is a Pure Function of Props and State

```tsx
// Good: derive during render
function Cart({ items }: { items: CartItem[] }) {
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  return <span>{formatMoney(total)}</span>;
}

// Bad: derived state stored separately
function Cart({ items }: { items: CartItem[] }) {
  const [total, setTotal] = useState(0);
  useEffect(() => {
    setTotal(items.reduce((sum, i) => sum + i.price * i.qty, 0));
  }, [items]);
  return <span>{formatMoney(total)}</span>;
}
```

Derived state in `useEffect` adds a render cycle, can desync, and obscures the data flow.

### 2. Side Effects Outside Render

Effects, mutations, network calls, and subscriptions live in event handlers or `useEffect` — never in the render body.

### 3. Composition Over Inheritance

React has no inheritance model for components. Compose with `children`, render props, or component props.

## Hooks Discipline

See [rules/react/hooks.md](../../rules/react/hooks.md) for the full ruleset. Highlights:

- Top-level only, never conditional
- Cleanup every subscription, interval, listener
- Functional updater (`setX(prev => prev + 1)`) when new state depends on old
- Default position: do not memoize — add `useMemo`/`useCallback` only when a profiler or a dependency chain proves it matters
- Extract a custom hook only when the same hook sequence appears in 2+ components

## State Location Decision Tree

```
Used by one component?
  -> useState inside it

Used by parent + a few descendants?
  -> lift to nearest common ancestor

Used across distant branches AND low-frequency reads (theme, auth, locale)?
  -> React Context

High-frequency updates shared across the tree?
  -> external store (Zustand, Jotai, Redux Toolkit)

Derived from a server?
  -> server-state library (TanStack Query, SWR, RSC fetch)
```

Most pages do not need context or a global store. Resist abstraction until duplicated lifting becomes painful.

## Server / Client Components (RSC)

```tsx
// Server Component - default, async, never ships JS for itself
export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await db.product.findUnique({ where: { id: params.id } });
  if (!product) notFound();
  return <ProductView product={product} />;
}

// Client Component - opt in with "use client"
"use client";
export function AddToCartButton({ productId }: { productId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => addToCart(productId))}
    >
      {pending ? "Adding..." : "Add to cart"}
    </button>
  );
}
```

Boundaries:

- Server -> Client: pass serializable props or `children`
- Client -> Server: invoke Server Actions via `<form action={...}>` or imperatively from event handlers
- Never `import` a Server Component from a Client Component file — compose them via `children` instead

## Suspense + Error Boundaries

```tsx
<ErrorBoundary fallback={<ErrorView />}>
  <Suspense fallback={<UserSkeleton />}>
    <UserDetail id={id} />
  </Suspense>
</ErrorBoundary>
```

- Place Suspense boundaries close to the data, not at the route root — progressively reveal content
- Error Boundary remains a class API; use `react-error-boundary` for a hook-friendly wrapper
- A boundary catches errors thrown during render, lifecycle, and constructors of its children — NOT in event handlers or async code

## Forms

### React 19 form actions (preferred for new code)

```tsx
"use client";
import { useActionState } from "react";

const initial = { error: null as string | null };

async function updateUserAction(_prev: typeof initial, formData: FormData) {
  "use server";
  const parsed = UserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid input" };
  await db.user.update({ where: { id: parsed.data.id }, data: parsed.data });
  return { error: null };
}

export function UserForm() {
  const [state, formAction, pending] = useActionState(updateUserAction, initial);
  return (
    <form action={formAction}>
      <input name="name" required />
      <button type="submit" disabled={pending}>Save</button>
      {state.error && <p role="alert">{state.error}</p>}
    </form>
  );
}
```

### Controlled inputs

Use controlled when the value drives other UI, formats on every keystroke, or implements real-time validation.

### Complex forms

For multi-step forms, dynamic field arrays, or cross-field validation: use a library (React Hook Form, TanStack Form). Roll-your-own state management for forms past trivial complexity is a maintenance trap.

## Data Fetching Decision Matrix

| Need | Tool |
|---|---|
| Per-request data in Next.js App Router | RSC `await fetch()` |
| Client-side cache + mutations + invalidation | TanStack Query |
| Lightweight client cache + revalidation | SWR |
| Real-time subscriptions | Server-Sent Events, WebSockets, or the lib's subscription API |
| One-off fire-and-forget | `fetch()` in an event handler |

Avoid `useEffect` + `fetch` for application data — race conditions, no cache, no retry, no Suspense integration.

## Composition Recipes

### Slot via `children`

```tsx
<Layout>
  <Header />
  <Main>{content}</Main>
</Layout>
```

### Named slots

```tsx
<Page header={<Nav />} sidebar={<Filters />}>
  <Results />
</Page>
```

### Compound components (shared state via Context)

```tsx
<Tabs defaultValue="profile">
  <Tabs.List>
    <Tabs.Trigger value="profile">Profile</Tabs.Trigger>
    <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Panel value="profile"><Profile /></Tabs.Panel>
  <Tabs.Panel value="settings"><Settings /></Tabs.Panel>
</Tabs>
```

### Render prop / function-as-child

Useful when the parent needs to pass parameters to the rendered output:

```tsx
<DataLoader id={id}>
  {({ data, isLoading }) => isLoading ? <Spinner /> : <UserCard user={data} />}
</DataLoader>
```

Modern alternative: a hook (`useData(id)`) returning the same shape — usually cleaner.

## Performance

### When `React.memo` Actually Helps

Wrap a component in `React.memo` only when:

1. It re-renders frequently
2. Its props are usually the same between renders
3. Its render is measurably expensive

`React.memo` adds an equality check on every render. If props differ on most renders, the check is pure overhead.

### Avoiding Render Cascades

- Lift state down rather than up where possible
- Split context: one context per concern, so a change to `themeContext` does not re-render auth consumers
- Use `useSyncExternalStore` for external state libraries — required for safe concurrent rendering

### Lists

- Provide stable `key` props (database id, not array index)
- Virtualize long lists with `@tanstack/react-virtual` or `react-window` once visible item count exceeds ~50 with non-trivial rows

## Accessibility-First Composition

- Always render semantic HTML (`<button>`, `<a>`, `<nav>`, `<main>`) before reaching for `role` attributes
- Every interactive element must be reachable by keyboard
- Form inputs need labels — `<label htmlFor>` or `aria-label` if visually labeled by an icon
- Manage focus on route changes and modal open/close
- Run `axe` in component tests (see [skills/react-testing](../react-testing/SKILL.md))
- Cross-link: [skills/accessibility/SKILL.md](../accessibility/SKILL.md) covers WCAG criteria and pattern libraries

## Routing

This skill is router-agnostic. The patterns above work with React Router, TanStack Router, Next.js App Router, Remix Router. Router-specific patterns (loaders, actions, nested layouts) follow the router's documentation — those are framework concerns layered on top of React core.

## Out of Scope (Pointer Sections)

- **Next.js specifics**: App Router data loading, Route Handlers, Middleware, Parallel Routes — separate concern, use Next.js docs
- **React Native**: Platform-specific patterns differ enough to warrant a separate `react-native-patterns` skill (not present yet)
- **Remix**: Loader/action conventions overlap with RSC but follow Remix docs

## Related

- Rules: [rules/react/](../../rules/react/) — coding-style, hooks, patterns, security, testing
- Skills: [react-performance](../react-performance/SKILL.md) for the Vercel-derived performance ruleset, [frontend-patterns](../frontend-patterns/SKILL.md) for cross-framework UI concerns, [accessibility](../accessibility/SKILL.md), [angular-developer](../angular-developer/SKILL.md) for framework comparison
- Agents: `react-reviewer` for code review, `react-build-resolver` for build/bundler errors
- Commands: `/react-review`, `/react-build`, `/react-test`

## Examples

### Custom hook for debounced search

```tsx
function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function SearchBox() {
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 300);
  const { data } = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => searchApi(debounced),
    enabled: debounced.length > 0,
  });
  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <Results items={data ?? []} />
    </>
  );
}
```

### Optimistic UI with React 19 `useOptimistic`

```tsx
"use client";
import { useOptimistic } from "react";

export function MessageList({ messages }: { messages: Message[] }) {
  const [optimistic, addOptimistic] = useOptimistic(
    messages,
    (state, newMessage: Message) => [...state, newMessage],
  );

  async function send(formData: FormData) {
    const text = String(formData.get("text"));
    addOptimistic({ id: "pending", text, sender: "me" });
    await saveMessage(text);
  }

  return (
    <>
      <ul>{optimistic.map((m) => <li key={m.id}>{m.text}</li>)}</ul>
      <form action={send}>
        <input name="text" />
        <button type="submit">Send</button>
      </form>
    </>
  );
}
```

### Splitting context to avoid render cascades

```tsx
// Two contexts: one rarely changes, one frequently
const ThemeContext = createContext<Theme>("light");
const NotificationsContext = createContext<Notification[]>([]);

// A component that only consumes ThemeContext does NOT re-render when notifications change
```

### react-performance

Use when writing, reviewing, or refactoring React/Next.js code for performance — 70+ rules across waterfalls, bundle size, server-side performance, client fetching, re-renders, rendering, JS micro-perf, and advanced patterns, adapted from Vercel Engineering's React Best Practices.

# React Performance

Performance optimization patterns for React 18/19 and Next.js, adapted from [Vercel Labs `react-best-practices`](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices) (MIT, v1.0.0). This skill organizes rules by priority and provides decision-tree guidance for active code review and refactoring.

## When to Activate

- Writing or reviewing React/Next.js code for performance
- Diagnosing slow page loads, slow interactions, or high CPU on the client
- Auditing bundle size or Lighthouse Core Web Vitals regressions
- Removing waterfalls in Server Components / API routes
- Reducing client-side re-renders
- Optimizing long lists, animations, or hydration
- Auditing optimization choices in PRs touching `app/`, `pages/`, `components/`, or data layers

## Priority Index

| Priority | Category | Prefix | When it matters |
|---|---|---|---|
| 1 — CRITICAL | Eliminating Waterfalls | `async-` | Anytime `await` is followed by independent `await` |
| 2 — CRITICAL | Bundle Size Optimization | `bundle-` | First-load JS, route-level imports, third-party libs |
| 3 — HIGH | Server-Side Performance | `server-` | RSC, Server Actions, API routes, SSR |
| 4 — MEDIUM-HIGH | Client-Side Data Fetching | `client-` | SWR / TanStack Query / raw `fetch` in hooks |
| 5 — MEDIUM | Re-render Optimization | `rerender-` | High-frequency state updates, parent-child fan-out |
| 6 — MEDIUM | Rendering Performance | `rendering-` | Long lists, animations, hydration |
| 7 — LOW-MEDIUM | JavaScript Performance | `js-` | Hot loops, frequent allocations |
| 8 — LOW | Advanced Patterns | `advanced-` | Effect-event integration, stable refs |

## 1. Eliminating Waterfalls (CRITICAL)

> "Waterfalls are the #1 performance killer" — every sequential `await` adds full network latency.

### Cheap conditions before await

Check sync conditions (props, env, hardcoded flags) before awaiting remote data.

```ts
// INCORRECT
async function Page({ id }: { id: string }) {
  const flag = await getFlag("show-page");
  if (!flag || !id) return null;
  const data = await getData(id);
  // ...
}

// CORRECT — short-circuit on cheap sync condition first
async function Page({ id }: { id: string }) {
  if (!id) return null;
  const flag = await getFlag("show-page");
  if (!flag) return null;
  const data = await getData(id);
}
```

### Defer awaits until used

Move `await` into the branch that uses it.

```ts
// INCORRECT — awaits before deciding it needs the data
const user = await getUser(id);
if (mode === "guest") return renderGuest();
return renderUser(user);

// CORRECT
if (mode === "guest") return renderGuest();
const user = await getUser(id);
return renderUser(user);
```

### Promise.all for independent work

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

### Partial dependencies — start early, await late

```ts
// CORRECT — kick off all promises, await only when each result is needed
const userP = getUser(id);
const postsP = getPosts(id);
const profile = await getProfile(id);
if (profile.private) return null;
const [user, posts] = await Promise.all([userP, postsP]);
```

### Suspense for streaming

Push `<Suspense>` boundaries close to the data so the page paints what it can while slower sub-trees stream in. The trade-off: layout shift when content arrives — reserve space (skeleton or `min-height`).

### Server Components: parallel through composition

```tsx
// INCORRECT — sibling awaits run sequentially inside one component
export default async function Page() {
  const user = await getUser();
  const cart = await getCart();
  return <View user={user} cart={cart} />;
}

// CORRECT — split into children, React runs them in parallel
export default async function Page() {
  return (
    <View>
      <UserSection />
      <CartSection />
    </View>
  );
}
```

## 2. Bundle Size Optimization (CRITICAL)

### Direct imports, not barrels

Barrel `index.ts` files force the bundler to walk the entire module graph even when tree-shaking removes most of it. Direct imports save 200-800ms of first-load JS in many real-world apps.

```ts
// INCORRECT
import { Button, Card, Modal } from "@/components";

// CORRECT
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";
```

Next.js 13.5+ has [Optimize Package Imports](https://nextjs.org/docs/app/api-reference/next-config-js/optimizePackageImports) that automates this for listed packages — use it; manual direct imports still required for non-listed libs.

### Statically analyzable paths

```ts
// INCORRECT — defeats bundler/trace analysis
const mod = await import(`./pages/${name}`);

// CORRECT — explicit per branch
const mod = name === "home" ? await import("./pages/home") : await import("./pages/about");
```

### Dynamic imports for heavy components

```tsx
import dynamic from "next/dynamic";

const HeavyChart = dynamic(() => import("./HeavyChart"), {
  loading: () => <Skeleton />,
  ssr: false, // when client-only
});
```

### Defer third-party scripts

Load analytics, logging, support widgets AFTER hydration. Use `next/script` with `strategy="afterInteractive"` (default) or `"lazyOnload"`.

### Conditional module loading

```tsx
if (user.role === "admin") {
  const { AdminPanel } = await import("./admin/AdminPanel");
  // ...
}
```

### Preload on hover/focus

Trigger `<link rel="preload">` or `import()` on hover so the bundle is in cache by the time the user clicks.

## 3. Server-Side Performance (HIGH)

### Authenticate Server Actions like API routes

Every `"use server"` function is a public endpoint. Authenticate AND authorize inside the action — never rely on the calling Client Component's gating.

```ts
"use server";
export async function deleteUser(formData: FormData) {
  const session = await getSession();
  if (!session?.user) throw new Error("Unauthorized");
  const targetId = String(formData.get("id"));
  if (session.user.role !== "admin" && session.user.id !== targetId) {
    throw new Error("Forbidden");
  }
  await db.user.delete({ where: { id: targetId } });
}
```

### `React.cache()` for per-request deduplication

```ts
import { cache } from "react";

export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } });
});
```

`React.cache` dedupes within a single request. Calling `getUser("1")` from three Server Components in the same render = one DB query.

### LRU cache for cross-request data

For data that does NOT change per request (config, lookup tables), cache outside React with an LRU cache or `unstable_cache`.

### Avoid duplicate serialization in RSC props

When a Server Component renders the same data into multiple Client Components, the data is serialized once per consumer. Lift the Client Component up and pass children.

### Hoist static I/O to module scope

```ts
// CORRECT — runs once at module load
const fontData = readFileSync(fontPath);

export async function Page() {
  return <Banner font={fontData} />;
}
```

### No mutable module-level state in RSC/SSR

Module state on the server is shared across all requests — a race condition between users. Use request-scoped storage (`headers()`, `cookies()`, async context) instead.

### Minimize data passed to Client Components

Only serialize what the Client needs. Strip fields, paginate, project columns at the DB layer.

### Parallelize nested fetches with Promise.all per item

```ts
const users = await getUsers();
const enriched = await Promise.all(
  users.map(async (u) => ({ ...u, posts: await getPostsFor(u.id) })),
);
```

### Use `after()` for non-blocking work

Next.js 15 `after()` runs work after the response is sent — logging, cache warming, analytics.

```ts
import { after } from "next/server";
export async function GET() {
  const data = await getData();
  after(() => logAnalytics(data));
  return Response.json(data);
}
```

## 4. Client-Side Data Fetching (MEDIUM-HIGH)

### SWR / TanStack Query for deduplication

Multiple components calling `useUser(id)` should share one network request and one cache entry. Use SWR or TanStack Query — never roll your own `useEffect` + `fetch` for shared data.

### Deduplicate global event listeners

```tsx
// INCORRECT — every component adds its own
useEffect(() => {
  window.addEventListener("scroll", handler);
  return () => window.removeEventListener("scroll", handler);
}, []);

// CORRECT — single shared listener via a hook + global subject
const useScroll = createScrollHook(); // singleton subject under the hood
```

### Passive listeners for scroll

```ts
window.addEventListener("scroll", handler, { passive: true });
```

Improves scrolling smoothness; the listener cannot `preventDefault()`.

### localStorage: version + minimize

- Always store a `version` field; bump on schema change and migrate or discard old data
- Keep payloads small — `localStorage` is synchronous and blocks main thread

## 5. Re-render Optimization (MEDIUM)

### Don't subscribe to state used only in callbacks

```tsx
// INCORRECT — re-renders every time count changes
const count = useStore((s) => s.count);
const handler = () => doSomething(count);

// CORRECT — read once on call
const handler = () => {
  const count = useStore.getState().count;
  doSomething(count);
};
```

### Extract expensive work into memoized components

```tsx
// CORRECT — child re-renders only when `items` changes
const Heavy = memo(function Heavy({ items }: { items: Item[] }) {
  return <Chart data={transform(items)} />;
});
```

### Hoist default non-primitive props

```tsx
// INCORRECT — new array each render breaks memo
<List items={items ?? []} />

// CORRECT
const EMPTY: Item[] = [];
<List items={items ?? EMPTY} />
```

### Primitive dependencies in effects

```tsx
// INCORRECT — new object identity every render
useEffect(() => {}, [{ id, name }]);

// CORRECT — primitives
useEffect(() => {}, [id, name]);
```

### Subscribe to derived booleans, not raw values

```tsx
// INCORRECT — re-renders for any cart change
const cart = useStore((s) => s.cart);
const hasItems = cart.length > 0;

// CORRECT — re-renders only when emptiness flips
const hasItems = useStore((s) => s.cart.length > 0);
```

### Derive during render, never via `useEffect`

```tsx
// INCORRECT
const [full, setFull] = useState("");
useEffect(() => setFull(`${first} ${last}`), [first, last]);

// CORRECT
const full = `${first} ${last}`;
```

### Functional `setState` for stable callbacks

```tsx
// CORRECT
const increment = useCallback(() => setCount((c) => c + 1), []);
```

### Lazy state initializer for expensive values

```tsx
const [tree] = useState(() => parseTree(largeInput));
```

### Avoid memo for simple primitives

`useMemo(() => x + 1, [x])` is overhead. Memo earns its keep on object identity and expensive computation.

### Split hooks with independent deps

```tsx
// INCORRECT — both selectors re-run if either source changes
const { a, b } = useSomething(source1, source2);

// CORRECT
const a = useA(source1);
const b = useB(source2);
```

### Move interaction logic into event handlers

Event handlers run only on the user action — `useEffect` re-runs whenever deps change.

### `startTransition` for non-urgent updates

```tsx
const [pending, startTransition] = useTransition();
startTransition(() => setFilters(newFilters));
```

### `useDeferredValue` for expensive renders

```tsx
const deferredQuery = useDeferredValue(query);
const results = useMemo(() => expensiveSearch(deferredQuery), [deferredQuery]);
```

### `useRef` for transient frequent values

For values that change often but should not trigger re-render (timestamps, last-key, accumulators).

### Don't define components inside components

```tsx
// INCORRECT — Inner is a new component on every Outer render
function Outer() {
  const Inner = () => <span />;
  return <Inner />;
}
```

Each render makes a new `Inner` type, defeating reconciliation and unmounting children.

## 6. Rendering Performance (MEDIUM)

### Animate the wrapper, not the SVG

Transforming a `<div>` wrapper around an SVG is GPU-accelerated; transforming the SVG itself triggers paint.

### `content-visibility: auto` for long lists

```css
.row { content-visibility: auto; contain-intrinsic-size: auto 80px; }
```

Browser skips offscreen rendering — major win for lists with hundreds of rows.

### Hoist static JSX

```tsx
const STATIC_HEADER = <h1>Title</h1>;
function Page() {
  return <>{STATIC_HEADER}<Body /></>;
}
```

### SVG: reduce coordinate precision

`d="M10.123456,20.654321"` → `d="M10.12,20.65"`. Each digit costs bytes; the visual difference is sub-pixel.

### Hydration no-flicker via inline script

For values needed before hydration (theme, locale), inline a `<script>` that sets `document.documentElement.dataset.*` before React mounts.

### Suppress expected hydration mismatches narrowly

```tsx
<time suppressHydrationWarning>{new Date().toLocaleString()}</time>
```

Use ONLY for known-divergent leaf nodes — never on a tree containing other children.

### `<Activity>` for show/hide instead of mount/unmount

React 19 `<Activity mode="visible|hidden">` keeps tree state and effects mounted but hides — cheaper than unmount/remount for tabs and accordions.

### Ternary over `&&` for conditional render

```tsx
// INCORRECT — `0` renders as text node
{count && <Badge>{count}</Badge>}

// CORRECT
{count > 0 ? <Badge>{count}</Badge> : null}
```

### `useTransition` for loading states

Pair `startTransition` with the action; React shows the previous UI as `isPending` while the next state computes.

### React DOM resource hints

```tsx
import { preload, preconnect } from "react-dom";
preload("/api/critical", { as: "fetch" });
preconnect("https://api.example.com");
```

### `defer` / `async` on `<script>` tags

`defer` for ordered execution after DOMContentLoaded; `async` for fire-and-forget.

## 7. JavaScript Performance (LOW-MEDIUM)

- **Batch DOM/CSS changes** — apply via class swap or `cssText`, not property-by-property
- **`Map` for repeated lookups** — `O(1)` vs `O(n)` linear scan
- **Cache property access in loops** — `const len = arr.length`
- **Memoize pure functions** — module-level `Map<key, result>`
- **Cache `localStorage` reads** — sync API; one read per render
- **Combine `filter().map()` into one pass** — `flatMap` or single `for`
- **Check array length first** before expensive comparisons
- **Early return** from functions
- **Hoist RegExp** out of loops — compilation is not free
- **Loop for min/max** instead of `sort()` — `O(n)` vs `O(n log n)`
- **`Set`/`Map` for membership** — `O(1)` vs `Array.includes` `O(n)`
- **`toSorted()` over mutation** when immutability matters
- **`flatMap` to map and filter in one pass**
- **`requestIdleCallback`** for non-critical work

## 8. Advanced Patterns (LOW)

### `useEffectEvent` deps

Values from `useEffectEvent` are stable — do NOT add them to effect deps.

### Event handler refs

For stable callbacks passed to memoized children:

```tsx
const handlerRef = useRef(handler);
useEffect(() => { handlerRef.current = handler; });
const stable = useCallback((arg) => handlerRef.current(arg), []);
```

### Init once per app load

For module-level singletons (telemetry, logger), guard with a module-scope flag — not `useEffect`.

### `useLatest` for stable callback refs

```tsx
function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
```

## Automated Tools

Many of these rules are now automated:

- **Next.js 13.5+ Optimize Package Imports** — barrel import optimization
- **React Compiler** (RFC, in canary) — auto-memoization
- **Turbopack** — faster builds, better tree-shaking
- **Bundle Analyzer** (`@next/bundle-analyzer`) — visualize first-load JS

When the project ships React Compiler, demote `rerender-*` manual memoization rules to "review-only" — the compiler handles them. Manual `useMemo`/`useCallback` becomes unnecessary noise.

## Lighthouse / Web Vitals Mapping

| Metric | Most relevant categories |
|---|---|
| **LCP** (Largest Contentful Paint) | Waterfalls, Bundle Size, Resource Hints |
| **INP** (Interaction to Next Paint) | Re-render, Rendering, JavaScript |
| **CLS** (Cumulative Layout Shift) | Rendering (Suspense placement, image dimensions) |
| **TBT** (Total Blocking Time) | Bundle Size, JavaScript, Defer Third-Party |
| **FID** (legacy) | Bundle Size, Hydration |

## Related

- Skills: [react-patterns](../react-patterns/SKILL.md), [react-testing](../react-testing/SKILL.md), [frontend-patterns](../frontend-patterns/SKILL.md), [accessibility](../accessibility/SKILL.md), [nextjs-turbopack](../nextjs-turbopack/SKILL.md)
- Rules: [rules/react/](../../rules/react/)
- Agents: `react-reviewer` enforces these rules in code review; `react-build-resolver` handles related build failures
- Commands: `/react-review`, `/react-build`, `/react-test`

## Attribution

Adapted from Vercel Labs `react-best-practices` skill (MIT License, copyright Vercel Engineering, v1.0.0 January 2026). Source: [https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices).

This skill restructures and adapts the original 70-rule catalog into a single navigable reference. For the full original ruleset with extended examples, see the upstream repository.

### react-testing

Use when writing or fixing tests for React components, hooks, or pages — React Testing Library query priority, userEvent, async assertions, MSW network mocking, accessibility assertions with axe, and the RTL-vs-Playwright decision boundary.

# React Testing

Comprehensive React testing patterns for behavior-focused component tests, custom hook tests, accessibility assertions, and network-level mocking.

## When to Activate

- Writing tests for React components, custom hooks, or pages
- Adding test coverage to legacy untested components
- Migrating from Enzyme or class-component-era patterns to React Testing Library
- Setting up Vitest or Jest for a new React project
- Mocking HTTP requests in tests
- Asserting accessibility violations
- Deciding which tests belong in RTL vs Playwright Component Testing vs full E2E

## Core Principle

Test what the user sees and does, not implementation details.

A test should:

- Render the component with the same providers it has in production
- Interact with it via accessible queries (role, label) and `userEvent`
- Assert visible output and observable side effects (callback fired, request sent)

A test should NOT:

- Inspect component state, props passed to children, or which hooks were called
- Mock React itself or framework hooks
- Assert on the number of renders or DOM structure beyond what affects users

## Library Choice

| Runner | When | Note |
|---|---|---|
| **Vitest** | Vite, Remix, modern setups | Faster, native ESM, Jest-compatible API |
| **Jest** | Next.js, CRA, established repos | Default for many React projects |
| **Playwright Component Testing** | Real browser engine needed | Use when JSDOM lacks the required feature |
| **Cypress Component Testing** | Real browser, Cypress already in use | Alternative to Playwright CT |

Pick one. Do not run RTL + Vitest AND Playwright CT in the same repo unless you have a clear lane separation.

## Query Priority

React Testing Library exposes queries in three tiers — use top-down:

1. **Accessible to everyone**: `getByRole`, `getByLabelText`, `getByPlaceholderText`, `getByText`, `getByDisplayValue`
2. **Semantic**: `getByAltText`, `getByTitle`
3. **Test IDs (escape hatch)**: `getByTestId`

```tsx
// Best
screen.getByRole("button", { name: /save/i });

// OK for inputs
screen.getByLabelText("Email");

// Last resort
screen.getByTestId("save-btn");
```

Variants:

- `getBy*` — throws if no match
- `queryBy*` — returns `null` (use for "assert absence")
- `findBy*` — async, returns a Promise (use for elements that appear after async work)

## User Interaction with `userEvent`

```tsx
import userEvent from "@testing-library/user-event";

test("submits the form", async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();
  render(<UserForm onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText("Email"), "user@example.com");
  await user.click(screen.getByRole("button", { name: /save/i }));

  expect(onSubmit).toHaveBeenCalledWith({ email: "user@example.com" });
});
```

- Always `await` userEvent calls
- Call `userEvent.setup()` once per test, reuse the returned `user`
- `userEvent` simulates a real browser sequence; `fireEvent` dispatches a single synthetic event — prefer `userEvent`

## Async Patterns

```tsx
// Element that appears after async work
expect(await screen.findByText("Loaded")).toBeInTheDocument();

// Side effect assertion
await waitFor(() => expect(saveSpy).toHaveBeenCalled());

// Element that should disappear
await waitForElementToBeRemoved(() => screen.queryByText("Loading"));
```

Never `setTimeout` + assertion — flaky. Use the matchers above.

## Network Mocking with MSW

Mock Service Worker mocks at the network layer. The component, hooks, and fetch library all behave exactly as in production.

### Setup

```ts
// test/setup.ts
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/users/:id", ({ params }) =>
    HttpResponse.json({ id: params.id, name: "Alice" }),
  ),
  http.post("/api/users", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: "new-id", ...body }, { status: 201 });
  }),
];

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

Configure `onUnhandledRequest: "error"` so any unmocked request fails the test loudly — silent passes are worse than red.

### Per-test override

```tsx
test("renders error on 500", async () => {
  server.use(
    http.get("/api/users/:id", () => new HttpResponse(null, { status: 500 })),
  );
  render(<UserPage id="1" />);
  expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
});
```

## Provider Wrapping

Wrap providers once in a `test-utils.tsx`:

```tsx
// test-utils.tsx
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function renderWithProviders(
  ui: React.ReactElement,
  options?: RenderOptions,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={lightTheme}>
        <MemoryRouter>{ui}</MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
    options,
  );
}

export * from "@testing-library/react";
```

Then `import { renderWithProviders, screen } from "test-utils"` in every test file.

## Custom Hook Testing

```tsx
import { renderHook, act } from "@testing-library/react";

test("useCounter increments and decrements", () => {
  const { result } = renderHook(() => useCounter(0));

  expect(result.current.count).toBe(0);

  act(() => result.current.increment());
  expect(result.current.count).toBe(1);

  act(() => result.current.decrement());
  expect(result.current.count).toBe(0);
});

test("useCounter accepts initial value", () => {
  const { result } = renderHook(() => useCounter(10));
  expect(result.current.count).toBe(10);
});

test("useUser fetches user data", async () => {
  // Instantiate QueryClient ONCE per test outside the wrapper so it survives re-renders.
  // Creating it inside the wrapper closure resets cache state on every render, producing flaky tests.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const { result } = renderHook(() => useUser("1"), { wrapper });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual({ id: "1", name: "Alice" });
});
```

- Wrap state-changing calls in `act`
- Test through the hook's public API only
- For hooks that use context, pass a `wrapper`

## Accessibility Assertions

```tsx
import { axe, toHaveNoViolations } from "jest-axe"; // or vitest-axe
expect.extend(toHaveNoViolations);

test("UserCard has no a11y violations", async () => {
  const { container } = render(<UserCard user={mockUser} />);
  expect(await axe(container)).toHaveNoViolations();
});
```

Run axe in component tests for every interactive component. Catches:

- Missing labels on form inputs
- Invalid ARIA usage
- Poor color contrast (limited — JSDOM has no real CSS engine, so this works for inline styles only; visual contrast belongs in Playwright)
- Missing alt text on images
- Heading order violations

Cross-link: [skills/accessibility/SKILL.md](../accessibility/SKILL.md) for the broader a11y testing playbook.

## When NOT to Use Snapshot Tests

Snapshots of rendered output:

- Break on every styling change
- Get rubber-stamped during review
- Test implementation detail (DOM structure), not behavior

Acceptable snapshot uses:

- Pure data serialization functions (`formatInvoice(invoice)` -> stable string)
- Generated config files (e.g., webpack config output)

For visual regression on components, use Playwright/Cypress screenshots or Percy/Chromatic — actual visual diffs, not DOM strings.

## When to Reach for Playwright / Cypress

JSDOM (used by Vitest/Jest) cannot:

- Render real layout (flexbox, grid, viewport queries)
- Run native browser animation, CSS transitions
- Test scrolling behavior, drag-and-drop, paste from clipboard
- Handle iframes, popups, downloads, cross-origin flows
- Run real network in a controlled environment with full DevTools support

For any of those, use Playwright Component Testing (component test in real browser) or full E2E. See [e2e-testing skill](../e2e-testing/SKILL.md).

Decision boundary:

- A hook, a presentational component, a form with logic -> RTL
- A component whose layout matters or that uses browser APIs not in JSDOM -> Playwright CT
- A full user flow across multiple pages -> Playwright/Cypress E2E

## Coverage Targets

| Layer | Target |
|---|---|
| Pure utilities | >=90% |
| Custom hooks | >=85% |
| Presentational components | >=80% — behavior, not lines |
| Container components | >=70% — golden paths + error states |
| Pages | E2E covered separately; smoke test minimum |

Configure via `vitest.config.ts` / `jest.config.js`:

```ts
// vitest.config.ts
test: {
  coverage: {
    provider: "v8",
    reporter: ["text", "html", "lcov"],
    thresholds: {
      lines: 80,
      functions: 80,
      branches: 70,
      statements: 80,
    },
  },
}
```

## Anti-Patterns

- `container.querySelector("...")` — bypasses accessibility queries, lets tests pass when real users would fail
- Asserting on number of renders — implementation detail
- `jest.mock("react", ...)` — never mock React. Refactor the component instead
- Mocking child components by default — tests the integration, not isolation. Mock only when the child has heavy side effects
- Ignoring `act()` warnings — they signal real bugs (state update after unmount, missing async wrapping)
- Sharing mutable state across tests — flakes when test order changes
- Tests that pass with `it.skip()` removed — your test does not actually assert what you think

## TDD Workflow

```
RED     -> Write failing test for the next requirement
GREEN   -> Write minimal component code to pass
REFACTOR -> Improve the component, tests stay green
REPEAT  -> Next requirement
```

For new components:

1. Define the component's prop type and signature
2. Write the first test for the simplest case
3. Verify it fails for the right reason
4. Implement just enough to pass
5. Add the next test case
6. Refactor when the third similar test reveals a pattern

## Test Commands

```bash
# Vitest
vitest                            # watch
vitest run                        # one-shot
vitest run --coverage             # with coverage
vitest run path/to/file.test.tsx  # single file

# Jest
jest --watch
jest --coverage
jest path/to/file.test.tsx

# CI mode
CI=true vitest run --coverage
```

## Related

- Rules: [rules/react/testing.md](../../rules/react/testing.md)
- Skills: [react-patterns](../react-patterns/SKILL.md), [accessibility](../accessibility/SKILL.md), [e2e-testing](../e2e-testing/SKILL.md), [tdd-workflow](../tdd-workflow/SKILL.md)
- Agents: `react-reviewer` (reviews test quality during code review), `tdd-guide` (enforces TDD process)
- Commands: `/react-test`, `/react-review`

## Examples

### Form submission with MSW and userEvent

```tsx
test("submits user form and shows success", async () => {
  server.use(
    http.post("/api/users", () =>
      HttpResponse.json({ id: "1", name: "Alice" }, { status: 201 }),
    ),
  );

  const user = userEvent.setup();
  renderWithProviders(<UserForm />);

  await user.type(screen.getByLabelText("Name"), "Alice");
  await user.type(screen.getByLabelText("Email"), "alice@example.com");
  await user.click(screen.getByRole("button", { name: /save/i }));

  expect(await screen.findByText(/saved successfully/i)).toBeInTheDocument();
});
```

### Testing an error boundary

```tsx
function Broken() {
  throw new Error("boom");
}

test("error boundary renders fallback", () => {
  // Suppress React's console.error noise for the expected throw, then restore so
  // the spy does not leak across tests and hide real errors elsewhere.
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    render(
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <Broken />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  } finally {
    errorSpy.mockRestore();
  }
});
```

### Testing a Suspense boundary

```tsx
test("shows loading then content", async () => {
  renderWithProviders(
    <Suspense fallback={<div>Loading...</div>}>
      <UserDetail id="1" />
    </Suspense>,
  );

  expect(screen.getByText("Loading...")).toBeInTheDocument();
  expect(await screen.findByText("Alice")).toBeInTheDocument();
});
```
