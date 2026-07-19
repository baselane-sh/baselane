# AGENTS.md

<!-- generated from workflow-pack full-harness v1.0.0 -->
<!-- adapted from affaan-m/ECC (Everything Claude Code) (MIT) — https://github.com/affaan-m/ECC -->

# Full harness — the complete engineering toolkit

<!-- adapted from affaan-m/ECC (MIT) — https://github.com/affaan-m/ECC -->

The maximal harness: 278 skills, 67 agents, 94 commands, and the full rules corpus below — every discipline, role, and command in one installable pack. Non-portable plugin-bootstrap hooks are intentionally omitted (they wrap a node -e loader that only runs inside its origin install); everything else is included unabridged.

## Rules corpus


### README

# Rules

## Structure

Rules are organized into a **common** layer plus **language-specific** directories:

```
rules/
├── common/          # Language-agnostic principles (always install)
│   ├── coding-style.md
│   ├── git-workflow.md
│   ├── testing.md
│   ├── performance.md
│   ├── patterns.md
│   ├── hooks.md
│   ├── agents.md
│   └── security.md
├── typescript/      # TypeScript/JavaScript specific
├── angular/         # Angular specific
├── vue/             # Vue 3 specific
├── nuxt/            # Nuxt 4 specific
├── python/          # Python specific
├── golang/          # Go specific
├── web/             # Web and frontend specific
├── react-native/    # React Native / Expo specific
├── swift/           # Swift specific
├── php/             # PHP specific
├── ruby/            # Ruby / Rails specific
└── arkts/           # HarmonyOS / ArkTS specific
```

- **common/** contains universal principles — no language-specific code examples.
- **Language directories** extend the common rules with framework-specific patterns, tools, and code examples. Each file references its common counterpart.

## Installation

### Option 1: Install Script (Recommended)

```bash
# Install common + one or more language-specific rule sets
./install.sh typescript
./install.sh angular
./install.sh vue
./install.sh nuxt
./install.sh python
./install.sh golang
./install.sh web
./install.sh react-native
./install.sh swift
./install.sh php
./install.sh ruby
./install.sh arkts

# Install multiple languages at once
./install.sh typescript python
```

### Option 2: Manual Installation

> **Important:** Copy entire directories — do NOT flatten with `/*`.
> Common and language-specific directories contain files with the same names.
> Flattening them into one directory causes language-specific files to overwrite
> common rules, and breaks the relative `../common/` references used by
> language-specific files.
>
> Use the ECC-owned namespace below for user-level Claude installs. Flat
> package-level destinations can collide with non-ECC rule packs and do not
> match the main README guidance.

```bash
# Create the ECC rule namespace once.
mkdir -p ~/.claude/rules/ecc

# Install common rules (required for all projects)
cp -r rules/common ~/.claude/rules/ecc/

# Install language-specific rules based on your project's tech stack
cp -r rules/typescript ~/.claude/rules/ecc/
cp -r rules/angular ~/.claude/rules/ecc/
cp -r rules/vue ~/.claude/rules/ecc/
cp -r rules/nuxt ~/.claude/rules/ecc/
cp -r rules/python ~/.claude/rules/ecc/
cp -r rules/golang ~/.claude/rules/ecc/
cp -r rules/web ~/.claude/rules/ecc/
cp -r rules/react-native ~/.claude/rules/ecc/
cp -r rules/swift ~/.claude/rules/ecc/
cp -r rules/php ~/.claude/rules/ecc/
cp -r rules/ruby ~/.claude/rules/ecc/
cp -r rules/arkts ~/.claude/rules/ecc/

# Attention ! ! ! Configure according to your actual project requirements; the configuration here is for reference only.
```

For project-local rules, use the same namespace under the project root:

```bash
mkdir -p .claude/rules/ecc
cp -r rules/common .claude/rules/ecc/
cp -r rules/typescript .claude/rules/ecc/
```

## Rules vs Skills

- **Rules** define standards, conventions, and checklists that apply broadly (e.g., "80% test coverage", "no hardcoded secrets").
- **Skills** (`skills/` directory) provide deep, actionable reference material for specific tasks (e.g., `python-patterns`, `golang-testing`).

Language-specific rule files reference relevant skills where appropriate. Rules tell you _what_ to do; skills tell you _how_ to do it.

## Adding a New Language

To add support for a new language (e.g., `rust/`):

1. Create a `rules/rust/` directory
2. Add files that extend the common rules:
   - `coding-style.md` — formatting tools, idioms, error handling patterns
   - `testing.md` — test framework, coverage tools, test organization
   - `patterns.md` — language-specific design patterns
   - `hooks.md` — PostToolUse hooks for formatters, linters, type checkers
   - `security.md` — secret management, security scanning tools
3. Each file should start with:
   ```
   > This file extends [common/xxx.md](../common/xxx.md) with <Language> specific content.
   ```
4. Reference existing skills if available, or create new ones under `skills/`.

For non-language domains like `web/`, follow the same layered pattern when there is enough reusable domain-specific guidance to justify a standalone ruleset.

## Rule Priority

When language-specific rules and common rules conflict, **language-specific rules take precedence** (specific overrides general). This follows the standard layered configuration pattern (similar to CSS specificity or `.gitignore` precedence).

- `rules/common/` defines universal defaults applicable to all projects.
- `rules/golang/`, `rules/python/`, `rules/swift/`, `rules/php/`, `rules/typescript/`, `rules/react-native/`, etc. override those defaults where language idioms differ.

### Example

`common/coding-style.md` recommends immutability as a default principle. A language-specific `golang/coding-style.md` can override this:

> Idiomatic Go uses pointer receivers for struct mutation — see [common/coding-style.md](../common/coding-style.md) for the general principle, but Go-idiomatic mutation is preferred here.

### Common rules with override notes

Rules in `rules/common/` that may be overridden by language-specific files are marked with:

> **Language note**: This rule may be overridden by language-specific rules for languages where this pattern is not idiomatic.

### angular/coding-style

# Angular Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with Angular specific content.

## Version Awareness

Always check the project's Angular version before writing code — features differ significantly between versions. Run `ng version` or inspect `package.json`. When creating a new project, do not pin a version unless the user specifies one.

After generating or modifying Angular code, always run `ng build` to catch errors before finishing.

## File Naming

Follow Angular CLI conventions — one artifact per file:

- `user-profile.component.ts` + `user-profile.component.html` + `user-profile.component.spec.ts`
- `user.service.ts`, `auth.guard.ts`, `date-format.pipe.ts`
- Feature folders: `features/users/`, `features/auth/`
- Generate with the CLI: `ng generate component features/users/user-card`

## Components

Prefer standalone components (v17+ default). Use `OnPush` change detection on all new components.

```typescript
@Component({
  selector: 'app-user-card',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './user-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserCardComponent {
  user = input.required<User>();
  select = output<string>();
}
```

## Dependency Injection

Use `inject()` over constructor injection. Keep constructors empty or remove them entirely.

```typescript
// CORRECT
@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private router = inject(Router);
}

// WRONG: Constructor injection is verbose and harder to tree-shake
constructor(private http: HttpClient, private router: Router) {}
```

Use `InjectionToken` for non-class dependencies:

```typescript
const API_URL = new InjectionToken<string>('API_URL');

// Provide:
{ provide: API_URL, useValue: 'https://api.example.com' }

// Consume:
private apiUrl = inject(API_URL);
```

## Signals

### Core Primitives

```typescript
count = signal(0);
doubled = computed(() => this.count() * 2);

increment() {
  this.count.update(n => n + 1);
}
```

### `linkedSignal` — Writable Derived State

Use `linkedSignal` when a signal must reset or adapt when a source changes, but also be independently writable:

```typescript
selectedOption = linkedSignal(() => this.options()[0]);
// Resets to first option when options changes, but user can override
```

### `resource` — Async Data into Signals

Use `resource()` to fetch async data reactively without manual subscriptions:

```typescript
userResource = resource({
  request: () => ({ id: this.userId() }),
  loader: ({ request }) => fetch(`/api/users/${request.id}`).then(r => r.json()),
});

// Access: userResource.value(), userResource.isLoading(), userResource.error()
```

### `effect` Usage

Use `effect()` only for side effects that must react to signal changes (logging, third-party DOM manipulation). Never use effects to synchronize signals — use `computed` or `linkedSignal` instead. For DOM work after render, use `afterRenderEffect`.

```typescript
// CORRECT: Side effect
effect(() => console.log('User changed:', this.user()));

// WRONG: Use computed instead
effect(() => { this.fullName.set(`${this.first()} ${this.last()}`); });
```

## Templates

Use v17+ block syntax. Always provide `track` in `@for`:

```html
@for (item of items(); track item.id) {
  <app-item [item]="item" />
}

@if (isLoading()) {
  <app-spinner />
} @else if (error()) {
  <app-error [message]="error()" />
} @else {
  <app-content [data]="data()" />
}
```

No logic in templates beyond simple conditionals — move to component methods or pipes.

## Forms

Choose the form strategy that matches the project's existing approach:

- **Signal Forms** (v21+): Preferred for new projects on v21+. Signal-based form state.
- **Reactive Forms**: `FormBuilder` + `FormGroup` + `FormControl`. Best for complex forms with dynamic validation.
- **Template-Driven Forms**: `ngModel`. Suitable for simple forms only.

```typescript
// Reactive Forms — standard approach for most apps
export class LoginComponent {
  private fb = inject(FormBuilder);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit() {
    if (this.form.valid) {
      // use this.form.value
    }
  }
}
```

## Component Styles

Use component-level styles with `ViewEncapsulation.Emulated` (default). Avoid `ViewEncapsulation.None` unless building a design system that intentionally bleeds styles.

- Scope styles to the component — do not use global class names inside component stylesheets
- Use `:host` for host element styling
- Prefer CSS custom properties for themeable values

## Change Detection

- Default to `ChangeDetectionStrategy.OnPush` on all new components
- Signals and `async` pipe handle detection automatically — avoid `markForCheck()` and `detectChanges()`
- Never mutate `@Input()` objects in place when using OnPush

### angular/hooks

# Angular Hooks

> This file extends [common/hooks.md](../common/hooks.md) with Angular specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **Prettier**: Auto-format `.ts` and `.html` files after edit
- **ESLint / ng lint**: Run `ng lint` after editing Angular source files to catch decorator misuse, template errors, and style violations
- **TypeScript check**: Run `tsc --noEmit` after editing `.ts` files
- **Build check**: Run `ng build` after generating or significantly changing Angular code to catch template and type errors early

## Stop Hooks

- **Lint audit**: Run `ng lint` across modified files before session ends to catch any outstanding violations

### angular/patterns

# Angular Patterns

> This file extends [common/patterns.md](../common/patterns.md) with Angular specific content.

## Smart / Dumb Component Split

Smart (container) components own data fetching and state. Dumb (presentational) components receive inputs and emit outputs only — no service injection.

```typescript
// Smart — owns data
@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush })
export class UserPageComponent {
  private userService = inject(UserService);
  user = toSignal(this.userService.getUser(this.userId));
}
```

```html
<!-- Dumb — pure presentation -->
<app-user-card [user]="user()" (select)="onSelect($event)" />
```

## Service Layer

Services own all data access and business logic. Components delegate — no `HttpClient` in components.

```typescript
@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>('/api/users');
  }
}
```

## Async Data with `resource`

Use `resource()` for reactive async fetching. Prefer over manual RxJS pipelines for simple data loading:

```typescript
export class UserDetailComponent {
  userId = input.required<string>();

  userResource = resource({
    request: () => ({ id: this.userId() }),
    loader: ({ request }) =>
      firstValueFrom(inject(UserService).getUser(request.id)),
  });
}
```

Access state: `userResource.value()`, `userResource.isLoading()`, `userResource.error()`, `userResource.reload()`.

## Signal State Patterns

```typescript
// Local mutable state
count = signal(0);

// Derived (never duplicated)
doubled = computed(() => this.count() * 2);

// Writable derived state that resets with source
selectedItem = linkedSignal(() => this.items()[0]);

// Bridge Observable to signal
users = toSignal(this.userService.getUsers(), { initialValue: [] });
```

Never store derived values in separate signals — use `computed`. Never use `effect` to sync signals — use `computed` or `linkedSignal`.

## Subscription Cleanup

Use `takeUntilDestroyed()` for all manual subscriptions. Never use manual `ngOnDestroy` + `Subject` + `takeUntil` on new code.

```typescript
export class UserComponent {
  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    this.userService.updates$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(update => this.handleUpdate(update));
  }
}
```

## Routing

### Route Definition

```typescript
// app.routes.ts
export const routes: Routes = [
  { path: '', component: HomeComponent },
  {
    path: 'admin',
    canMatch: [authGuard],           // CanMatch prevents loading the chunk at all
    loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES),
  },
  {
    path: 'users/:id',
    resolve: { user: userResolver },
    component: UserDetailComponent,
  },
];
```

- Use `canMatch` over `canActivate` when the route module should not load for unauthorized users
- Lazy-load all feature modules with `loadChildren`
- Pre-fetch data with `resolve` to avoid loading states in components

### Functional Guards

```typescript
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isAuthenticated()
    ? true
    : inject(Router).createUrlTree(['/login']);
};
```

### Data Resolvers

```typescript
export const userResolver: ResolveFn<User> = (route) => {
  return inject(UserService).getUser(route.paramMap.get('id')!);
};
```

### View Transitions

Enable smooth route transitions with the View Transitions API:

```typescript
// app.config.ts
provideRouter(routes, withViewTransitions())
```

## Dependency Injection Patterns

### Scoped Providers

Provide services at component or route level when they should not be singletons:

```typescript
@Component({
  providers: [UserEditService],   // scoped to this component subtree
})
export class UserEditComponent {}
```

### `InjectionToken`

```typescript
export const CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

// In providers:
{ provide: CONFIG, useValue: appConfig }
{ provide: CONFIG, useFactory: () => loadConfig(), deps: [] }

// Consume:
private config = inject(CONFIG);
```

### `viewProviders` vs `providers`

- `providers`: Available to the component and all its content children
- `viewProviders`: Available only to the component's own view (not projected content)

## HTTP Interceptors

Use functional interceptors (v15+) for auth, error handling, and retries:

```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  if (!token) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
```

Register in `app.config.ts`:

```typescript
provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))
```

## RxJS Operators

- `switchMap` — search, navigation (cancels previous)
- `mergeMap` — independent parallel requests
- `exhaustMap` — form submissions (ignores until complete)
- Always handle errors with `catchError` — never let streams die silently

```typescript
search$ = this.query$.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(q => this.service.search(q).pipe(catchError(() => of([])))),
);
```

## Forms

Match the project's existing form strategy. For new v21+ apps, prefer signal forms.

```typescript
// Reactive Forms — standard for complex forms
export class UserFormComponent {
  private fb = inject(FormBuilder);

  form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
  });
}
```

## Rendering Strategies

- **CSR** (default): Standard SPA
- **SSR + Hydration**: `ng add @angular/ssr` — improves FCP and SEO
- **SSG (Prerendering)**: Static pages at build time for content-heavy routes

When using SSR, avoid `window`, `document`, `localStorage` directly — use `isPlatformBrowser` or `DOCUMENT` token.

## Accessibility

Use Angular CDK for headless, accessible components (Accordion, Listbox, Combobox, Menu, Tabs, Toolbar, Tree, Grid). Style ARIA attributes rather than managing them manually:

```css
[aria-selected="true"] { background: var(--color-selected); }
```

## Skill Reference

See skill: `angular-developer` for deep guidance on signals, forms, routing, DI, SSR, and accessibility patterns.

### angular/security

# Angular Security

> This file extends [common/security.md](../common/security.md) with Angular specific content.

## XSS Prevention

Angular auto-sanitizes bound values. Never bypass the sanitizer on user-controlled input.

```typescript
// WRONG: Bypasses sanitization — XSS risk
this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(userInput);

// CORRECT: Sanitize explicitly before trusting
this.safeHtml = this.sanitizer.sanitize(SecurityContext.HTML, userInput);
```

- Never use `bypassSecurityTrust*` methods without a documented, reviewed reason
- Avoid `[innerHTML]` with untrusted content — use `innerText` or a sanitizing pipe
- Never bind `[href]` to user input — Angular does not block `javascript:` URLs in all contexts
- Never construct template strings from user data

## HTTP Security

Use `HttpClient` exclusively — never raw `fetch()` or `XHR` unless no alternative exists.

```typescript
// WRONG: Bypasses interceptors (auth headers, error handling, logging)
const res = await fetch('/api/users');

// CORRECT
users$ = this.http.get<User[]>('/api/users');
```

- Attach auth tokens via interceptors — never hardcode in individual service calls
- Type and validate API responses — treat external data as `unknown` at the boundary
- Never log HTTP responses that may contain tokens, PII, or credentials

## Secret Management

```typescript
// WRONG: Hardcoded secret in source
const apiKey = 'sk-live-xxxx';

// CORRECT: Injected via environment
import { environment } from '../environments/environment';
const apiKey = environment.apiKey;
```

- Treat `environment.ts` as a config shape — never store real secrets in source-controlled environment files
- Inject production secrets via CI/CD (environment variables, secret managers)

## Route Guards

Every authenticated or role-restricted route must have a guard. Never rely on hiding UI elements alone.

```typescript
{
  path: 'admin',
  canMatch: [authGuard, roleGuard('admin')],
  loadChildren: () => import('./admin/admin.routes'),
}
```

Use `canMatch` for sensitive routes — it prevents the route module from loading at all for unauthorized users.

## SSR Security

When using Angular SSR:

- Never expose server-side environment variables to the client via `TransferState` unless they are intentionally public
- Sanitize all inputs before server-side rendering — DOM-based XSS can occur server-side too
- Avoid `window`, `document`, `localStorage` on the server — gate with `isPlatformBrowser` or inject via `DOCUMENT` token

## Content Security Policy

Configure CSP headers server-side. Avoid `unsafe-inline` in `script-src`. When using SSR with inline scripts, use nonces via Angular's CSP support.

## Agent Support

- Use **security-reviewer** skill for comprehensive security audits

### angular/testing

# Angular Testing

> This file extends [common/testing.md](../common/testing.md) with Angular specific content.

## Test Runner

Use the test runner configured by the project. Check `angular.json` and `package.json`; Angular projects commonly use Vitest, Jest, or Jasmine + Karma.

```bash
ng test               # watch mode
ng test --no-watch    # CI mode
```

## TestBed Setup

For standalone components, import the component directly. Call `compileComponents()` for components with external templates.

```typescript
describe('UserCardComponent', () => {
  let fixture: ComponentFixture<UserCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UserCardComponent);
  });
});
```

## Signal Inputs

Set signal-based inputs via `fixture.componentRef.setInput()`:

```typescript
fixture.componentRef.setInput('user', mockUser);
fixture.detectChanges();
```

## Component Harnesses

Prefer Angular CDK component harnesses over direct DOM queries for UI interaction. Harnesses are more resilient to markup changes.

```typescript
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonHarness } from '@angular/material/button/testing';

let loader: HarnessLoader;

beforeEach(() => {
  loader = TestbedHarnessEnvironment.loader(fixture);
});

it('triggers save on button click', async () => {
  const button = await loader.getHarness(MatButtonHarness.with({ text: 'Save' }));
  await button.click();
  expect(saveSpy).toHaveBeenCalled();
});
```

## Router Testing

Use `RouterTestingHarness` for components that depend on the router:

```typescript
import { RouterTestingHarness } from '@angular/router/testing';

it('renders user on navigation', async () => {
  const harness = await RouterTestingHarness.create();
  const component = await harness.navigateByUrl('/users/1', UserDetailComponent);
  expect(component.userId()).toBe('1');
});
```

## Async Testing

Use `fakeAsync` + `tick` for controlled async. Use `waitForAsync` for real async with `fixture.whenStable()`.

```typescript
it('loads user after delay', fakeAsync(() => {
  const service = TestBed.inject(UserService);
  vi.spyOn(service, 'getUser').mockReturnValue(of(mockUser));

  fixture.detectChanges();
  tick();
  fixture.detectChanges();

  expect(fixture.nativeElement.querySelector('.name').textContent).toBe(mockUser.name);
}));
```

## HTTP Testing

```typescript
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpTestingController } from '@angular/common/http/testing';

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  httpMock = TestBed.inject(HttpTestingController);
});

afterEach(() => httpMock.verify());
```

## Service Testing

Inject services directly without a component fixture:

```typescript
describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UserService);
  });
});
```

## What to Test

- **Services**: All public methods, error paths, HTTP interactions
- **Components**: Input/output bindings, rendered output for key states, user interactions via harnesses
- **Pipes**: Pure transformation — plain unit tests, no TestBed needed
- **Guards/Resolvers**: Return values for allowed and denied states using `RouterTestingHarness`

## E2E Testing

Use the project's configured E2E framework, such as Cypress or Playwright, for critical user flows.

```typescript
describe('Login flow', () => {
  it('redirects to dashboard on valid credentials', () => {
    cy.visit('/login');
    cy.get('[data-cy=email]').type('user@example.com');
    cy.get('[data-cy=password]').type('password123');
    cy.get('[data-cy=submit]').click();
    cy.url().should('include', '/dashboard');
  });
});
```

- Add `data-cy` attributes to interactive elements for stable selectors
- Do not rely on CSS classes or text content for selectors in E2E tests

## Coverage

Target ≥80% for services and pipes. Components: test behaviour, not implementation details.

## Skill Reference

See skill: `angular-developer` for comprehensive testing patterns, harness usage, and async best practices.

### arkts/coding-style

# HarmonyOS / ArkTS Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with HarmonyOS and ArkTS-specific content.

## ArkTS Language Constraints

ArkTS is a strict, statically-typed subset of TypeScript. Violating these constraints causes **compilation failures**.

### Type System

- No `any` or `unknown` types - always use explicit types
- No index access types - use type names directly
- No conditional type aliases or `infer` keyword
- No intersection types - use inheritance
- No mapped types - use classes and regular idioms
- No `typeof` for type annotations - use explicit type declarations
- No `as const` assertions - use explicit type annotations
- No structural typing - use inheritance, interfaces, or type aliases
- No TypeScript utility types except `Partial`, `Required`, `Readonly`, `Record`
- For `Record<K, V>`, index expression type is `V | undefined`
- Omit type annotations in `catch` clauses (ArkTS does not support `any`/`unknown`)

### Functions & Classes

- No function expressions - use arrow functions
- No nested functions - use lambdas
- No generator functions - use `async`/`await` for multitasking
- No `Function.apply`, `Function.call`, `Function.bind` - follow traditional OOP for `this`
- No constructor type expressions - use lambdas
- No constructor signatures in interfaces or object types - use methods or classes
- No declaring class fields in constructors - declare in class body
- No `this` in standalone functions or static methods - only in instance methods
- No `new.target`
- No definite assignment assertions (`let v!: T`) - use initialized declarations
- No class literals - introduce named class types
- No using classes as objects (assigning to variables) - class declarations introduce types, not values
- Only one static block per class - merge all static statements

### Object & Property Access

- No dynamic field declaration or `obj["field"]` access - use `obj.field` syntax
- No `delete` operator - use nullable type with `null` to mark absence
- No prototype assignment - use classes and interfaces
- No `in` operator - use `instanceof`
- No reassigning object methods - use wrapper functions or inheritance
- No `Symbol()` API (except `Symbol.iterator`)
- No `globalThis` or global scope - use explicit module exports/imports
- No namespaces as objects - use classes or modules
- No statements inside namespaces - use functions

### Destructuring & Spread

- No destructuring assignments or variable declarations - use intermediate objects and field-by-field access
- No destructuring parameter declarations - pass parameters directly, assign local names manually
- Spread operator only for expanding arrays (or array-derived classes) into rest parameters or array literals

### Modules & Imports

- No `require()` - use regular `import` syntax
- No `export = ...` - use normal export/import
- No import assertions - imports are compile-time in ArkTS
- No UMD modules
- No wildcards in module names
- All `import` statements must appear before all other statements
- TypeScript codebases must not depend on ArkTS codebases via import (reverse is supported)

### Other Restrictions

- No `var` - use `let`
- No `for...in` loops - use regular `for` loops for arrays
- No `with` statements
- No JSX expressions
- No `#` private identifiers - use `private` keyword
- No declaration merging (classes, interfaces, enums) - keep definitions compact
- No index signatures - use arrays
- Comma operator only in `for` loops
- Unary operators `+`, `-`, `~` only for numeric types (no implicit string conversion)
- Enum members: only same-type compile-time expressions for explicit initializers
- Function return type inference is limited - specify return types explicitly when calling functions with omitted return types

### Object Literals

- Supported only when compiler can infer the corresponding class or interface
- NOT supported for: `any`/`Object`/`object` types, classes/interfaces with methods, classes with parameterized constructors, classes with `readonly` fields

## Naming Conventions

- Variables / functions: `camelCase` (e.g., `getUserInfo`, `goodsList`)
- Classes / interfaces: `PascalCase` (e.g., `UserViewModel`, `IGoodsModel`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_PAGE_SIZE`, `COLOR_PRIMARY`)
- File names: `PascalCase` for components (e.g., `HomePage.ets`), `camelCase` for utilities

## Formatting

- Prefer double quotes for strings
- Semicolons at end of statements
- Never use `var` - prefer `const`, then `let`
- All methods, parameters, return values must have complete type annotations

## File Organization

- Component files (`.ets`): one `@ComponentV2` per file
- ViewModel files: one ViewModel class per file
- Model files: related data models may share a file
- Keep files under 400 lines; extract helpers for files approaching 800 lines

## Comments

- File header: `@file` (file purpose) + `@author` (developer), if the project already uses file headers
- Public methods: JSDoc with `@param`, `@returns`; add `@example` for complex methods
- Match the project's existing documentation language; use English unless the repository has already standardized on Chinese comments

## Error Handling

```typescript
// Use try/catch with proper error handling
try {
  const result = await riskyOperation()
  return result
} catch (error) {
  hilog.error(0x0000, 'TAG', 'Operation failed: %{public}s', error)
  throw new Error('User-friendly error message')
}
```

## Immutability

Follow the common immutability principles - create new objects instead of mutating:

```typescript
// BAD: mutation
function updateUser(user: UserModel, name: string): UserModel {
  user.name = name  // direct mutation
  return user
}

// GOOD: immutable - create new instance
function updateUser(user: UserModel, name: string): UserModel {
  const updated = new UserModel()
  updated.id = user.id
  updated.name = name
  updated.email = user.email
  return updated
}
```

### arkts/hooks

# HarmonyOS / ArkTS Hooks

> This file extends [common/hooks.md](../common/hooks.md) with HarmonyOS-specific build and validation hooks.

## Build Commands

### HAP Package Build

```bash
# Build HAP package (global hvigor environment)
hvigorw assembleHap -p product=default

# Build with specific module
hvigorw assembleHap -p module=entry -p product=default

# Clean build
hvigorw clean
```

### DevEco Studio CLI

```bash
# Check project structure
hvigorw --version

# Install dependencies
ohpm install

# Update dependencies
ohpm update
```

## Recommended PostToolUse Hooks

### After Editing .ets/.ts Files

Run hvigor build to check for ArkTS compilation errors:

```json
{
  "type": "PostToolUse",
  "matcher": {
    "tool": ["Edit", "Write"],
    "filePath": ["**/*.ets", "**/*.ts"]
  },
  "hooks": [
    {
      "command": "hvigorw assembleHap -p product=default 2>&1 | tail -20",
      "async": true,
      "timeout": 60000
    }
  ]
}
```

### After Editing module.json5

Validate permission and ability declarations:

```json
{
  "type": "PostToolUse",
  "matcher": {
    "tool": "Edit",
    "filePath": "**/module.json5"
  },
  "hooks": [
    {
      "command": "echo '[HarmonyOS] module.json5 modified - verify permissions and abilities'",
      "async": false
    }
  ]
}
```

### After Editing oh-package.json5

Reinstall dependencies:

```json
{
  "type": "PostToolUse",
  "matcher": {
    "tool": "Edit",
    "filePath": "**/oh-package.json5"
  },
  "hooks": [
    {
      "command": "ohpm install 2>&1 | tail -10",
      "async": true,
      "timeout": 30000
    }
  ]
}
```

## PreToolUse Hooks

### V1 Decorator Guard

Warn when code contains V1 state management decorators:

```json
{
  "type": "PreToolUse",
  "matcher": {
    "tool": ["Write", "Edit"],
    "filePath": "**/*.ets"
  },
  "hooks": [
    {
      "command": "echo '[HarmonyOS] Reminder: Use @ComponentV2 / @Local / @Param - V1 decorators (@State, @Prop, @Link) are prohibited'"
    }
  ]
}
```

## Validation Checklist

After each implementation cycle, verify:

- [ ] `hvigorw assembleHap` completes without errors
- [ ] No V1 decorators in new or modified `.ets` files
- [ ] No `@ohos.router` imports in new or modified files
- [ ] All API permissions declared in `module.json5`
- [ ] All dependencies listed in `oh-package.json5`
- [ ] Resource strings added to all i18n directories
- [ ] Dark theme colors provided for new color resources

### arkts/patterns

# HarmonyOS / ArkTS Patterns

> This file extends [common/patterns.md](../common/patterns.md) with HarmonyOS and ArkTS-specific patterns.

## State Management: V2 Only

**MUST use** ArkUI State Management V2. V1 decorators are deprecated and must not be used.

### V2 Decorators

| Decorator | Purpose |
|-----------|---------|
| `@ComponentV2` | Marks a struct as a V2 component |
| `@Local` | Local state within a component |
| `@Param` | Props received from parent (read-only) |
| `@Event` | Callback events from child to parent |
| `@Provider` | Provides state to descendant components |
| `@Consumer` | Consumes state from ancestor `@Provider` |
| `@Monitor` | Watches for state changes (replaces V1 `@Watch`) |
| `@Computed` | Derived/computed values |
| `@ObservedV2` | Makes a class observable for V2 state management |
| `@Trace` | Marks observable properties in `@ObservedV2` classes |

### Prohibited V1 Decorators

Never use: `@State`, `@Prop`, `@Link`, `@ObjectLink`, `@Observed`, `@Provide`, `@Consume`, `@Watch`, `@Component` (use `@ComponentV2` instead).

### V2 Component Example

```typescript
@ObservedV2
class UserModel {
  @Trace name: string = ''
  @Trace age: number = 0
}

@ComponentV2
struct UserCard {
  @Param user: UserModel = new UserModel()
  @Event onDelete: () => void = () => {}

  build() {
    Column() {
      Text(this.user.name)
        .fontSize($r('app.float.font_size_title'))
      Text(`${this.user.age}`)
        .fontSize($r('app.float.font_size_body'))
      Button($r('app.string.delete'))
        .onClick(() => this.onDelete())
    }
  }
}
```

### State Synchronization

```typescript
@ComponentV2
struct ParentPage {
  @Provider('userState') userModel: UserModel = new UserModel()

  build() {
    Column() {
      ChildComponent()  // automatically receives @Consumer('userState')
    }
  }
}

@ComponentV2
struct ChildComponent {
  @Consumer('userState') userModel: UserModel = new UserModel()

  build() {
    Text(this.userModel.name)
  }
}
```

## Routing: Navigation Only

**MUST use** `Navigation` component with `NavPathStack`. Never use `@ohos.router`.

### Navigation Setup

```typescript
@ComponentV2
struct MainPage {
  @Local navPathStack: NavPathStack = new NavPathStack()

  build() {
    Navigation(this.navPathStack) {
      // Home content
    }
    .navDestination(this.routerMap)
  }

  @Builder
  routerMap(name: string, param: ESObject) {
    if (name === 'detail') {
      DetailPage()
    } else if (name === 'settings') {
      SettingsPage()
    }
  }
}
```

### Page Navigation

```typescript
// Push a new page
this.navPathStack.pushPath({ name: 'detail', param: { id: '123' } })

// Replace current page
this.navPathStack.replacePath({ name: 'settings' })

// Pop back
this.navPathStack.pop()

// Pop to root
this.navPathStack.clear()
```

### NavDestination Sub-page

```typescript
@ComponentV2
struct DetailPage {
  build() {
    NavDestination() {
      Column() {
        Text($r('app.string.detail_title'))
      }
    }
    .title($r('app.string.detail_nav_title'))
  }
}
```

## Architecture Pattern: MVVM

Recommended architecture for HarmonyOS applications:

```
feature/
  |-- model/           # Data models (@ObservedV2 classes)
  |-- viewmodel/       # Business logic (ViewModel classes)
  |-- view/            # UI components (@ComponentV2 structs)
  |-- service/         # API calls, data access
```

- **View**: Only rendering logic, no business logic in `build()`
- **ViewModel**: All business logic encapsulated here
- **Model**: Pure data classes with `@ObservedV2` and `@Trace`
- **Service**: Network requests, database operations, file I/O

## ArkUI Animation Patterns

### State-Driven Animation

```typescript
@ComponentV2
struct AnimatedCard {
  @Local isExpanded: boolean = false
  @Local cardScale: number = 0.8

  build() {
    Column() {
      // Content
    }
    .scale({ x: this.cardScale, y: this.cardScale })
    .animation({ duration: 300, curve: Curve.EaseInOut })
    .onClick(() => {
      this.isExpanded = !this.isExpanded
      this.cardScale = this.isExpanded ? 1.0 : 0.8
    })
  }
}
```

### Animation Rules

- Prefer native HarmonyOS animation APIs and advanced templates
- Use declarative UI with state-driven animations (change state variables to trigger animations)
- Set `renderGroup(true)` for complex sub-component animations to reduce render batches
- **NEVER** frequently change `width`, `height`, `padding`, `margin` during animations - severe performance impact
- Use `animateTo` for explicit animation control
- Prefer `transform` (translate, scale, rotate) and `opacity` for performant animations

## Performance Patterns

### LazyForEach for Large Lists

```typescript
@ComponentV2
struct LargeList {
  @Local dataSource: MyDataSource = new MyDataSource()

  build() {
    List() {
      LazyForEach(this.dataSource, (item: ItemModel) => {
        ListItem() {
          ItemComponent({ item: item })
        }
      }, (item: ItemModel) => item.id)
    }
  }
}
```

### Component Reuse

- Extract reusable components into separate files
- Use `@Builder` for lightweight UI fragments within a component
- Use `@Param` for configurable components

## Resource References

Always define UI constants as resources and reference via `$r()`:

```typescript
// BAD: hardcoded values
Text('Hello')
  .fontSize(16)
  .fontColor('#333333')

// GOOD: resource references
Text($r('app.string.greeting'))
  .fontSize($r('app.float.font_size_body'))
  .fontColor($r('app.color.text_primary'))
```

### arkts/security

# HarmonyOS / ArkTS Security

> This file extends [common/security.md](../common/security.md) with HarmonyOS-specific security practices.

## Permission Management

### Declare Permissions in module.json5

All system API calls requiring permissions must be declared:

```json5
{
  "module": {
    "requestPermissions": [
      {
        "name": "ohos.permission.INTERNET",
        "reason": "$string:internet_permission_reason",
        "usedScene": {
          "abilities": ["EntryAbility"],
          "when": "always"
        }
      }
    ]
  }
}
```

### Permission Checklist

Before calling system APIs, verify:

- [ ] Permission declared in `module.json5`
- [ ] Permission reason string defined in resources (for user-facing permissions)
- [ ] Runtime permission request implemented for sensitive permissions (camera, location, etc.)
- [ ] Permission check before API call with graceful fallback on denial

### Runtime Permission Request

```typescript
import { abilityAccessCtrl, bundleManager, Permissions } from '@kit.AbilityKit';

async function checkAndRequestPermission(permission: Permissions): Promise<boolean> {
  const atManager = abilityAccessCtrl.createAtManager();
  const bundleInfo = await bundleManager.getBundleInfoForSelf(
    bundleManager.BundleFlag.GET_BUNDLE_INFO_WITH_APPLICATION
  );
  const tokenId = bundleInfo.appInfo.accessTokenId;
  const grantStatus = await atManager.checkAccessToken(tokenId, permission);

  if (grantStatus === abilityAccessCtrl.GrantStatus.PERMISSION_GRANTED) {
    return true;
  }

  const result = await atManager.requestPermissionsFromUser(getContext(), [permission]);
  return result.authResults[0] === abilityAccessCtrl.GrantStatus.PERMISSION_GRANTED;
}
```

## Secret Management

- **NEVER** hardcode API keys, tokens, or passwords in `.ets`/`.ts` source files
- Use HarmonyOS Preferences API for non-sensitive configuration
- Use HarmonyOS Keystore for sensitive credentials
- Environment-specific configs should be managed via build profiles

```typescript
// BAD: hardcoded secret
const API_KEY: string = 'sk-xxxxxxxxxxxx';

// GOOD: from build profile config (non-sensitive)
import { BuildProfile } from 'BuildProfile';
const endpoint = BuildProfile.API_ENDPOINT;

// GOOD: use HUKS to encrypt/decrypt data without exposing key material
import { huks } from '@kit.UniversalKeystoreKit';
async function decryptWithKeystore(alias: string, nonce: Uint8Array, aad: Uint8Array, cipherData: Uint8Array): Promise<Uint8Array> {
  const options: huks.HuksOptions = {
    properties: [
      { tag: huks.HuksTag.HUKS_TAG_ALGORITHM, value: huks.HuksKeyAlg.HUKS_ALG_AES },
      { tag: huks.HuksTag.HUKS_TAG_PURPOSE, value: huks.HuksKeyPurpose.HUKS_KEY_PURPOSE_DECRYPT },
      { tag: huks.HuksTag.HUKS_TAG_BLOCK_MODE, value: huks.HuksCipherMode.HUKS_MODE_GCM },
      { tag: huks.HuksTag.HUKS_TAG_PADDING, value: huks.HuksKeyPadding.HUKS_PADDING_NONE },
      { tag: huks.HuksTag.HUKS_TAG_NONCE, value: nonce },
      { tag: huks.HuksTag.HUKS_TAG_ASSOCIATED_DATA, value: aad }
    ],
    inData: cipherData
  };
  const handle = await huks.initSession(alias, options);
  const result = await huks.finishSession(handle.handle, options);
  return result.outData;
}
```

## Input Validation

- Validate all user input before processing
- Sanitize data before displaying in UI to prevent injection
- Validate deep link parameters before navigation

```typescript
// Validate before navigation
function handleDeepLink(uri: string): void {
  const allowedPaths: string[] = ['detail', 'settings', 'profile'];
  const parsed = new URL(uri);
  const path = parsed.pathname.replace('/', '');

  if (!allowedPaths.includes(path)) {
    hilog.warn(0x0000, 'DeepLink', 'Invalid deep link path: %{public}s', path);
    return;
  }

  navPathStack.pushPath({ name: path });
}
```

## Network Security

- Always use HTTPS for network requests
- Validate server certificates
- Implement request timeout and retry policies
- Never log sensitive data (tokens, user credentials) in network request/response logs

## Data Storage Security

- Use encrypted preferences for sensitive local data
- Clear sensitive data from memory when no longer needed
- Implement proper data lifecycle management
- Consider data classification (public, internal, confidential) when choosing storage mechanisms

## Dependency Security

- Only use dependencies from trusted sources (official ohpm registry)
- Verify dependency versions in `oh-package.json5`
- Regularly check for known vulnerabilities in third-party libraries
- Pin dependency versions to avoid unexpected updates

### arkts/testing

# HarmonyOS / ArkTS Testing

> This file extends [common/testing.md](../common/testing.md) with HarmonyOS-specific testing practices.

## Test Framework

HarmonyOS uses the built-in test framework with `@ohos.test` capabilities:

- **Unit tests**: Located in `src/ohosTest/ets/test/`
- **UI tests**: Use `@ohos.UiTest` for component testing
- **Instrument tests**: Run on device/emulator

## Test Directory Structure

```
module/
  |-- src/
  |   |-- main/ets/          # Production code
  |   |-- ohosTest/ets/      # Test code
  |       |-- test/
  |       |   |-- Ability.test.ets
  |       |   |-- List.test.ets
  |       |-- TestAbility.ets
  |       |-- TestRunner.ets
```

## Running Tests

```bash
# Run all tests for a module
hvigorw testHap -p product=default

# Run tests on connected device
hdc shell aa test -b com.example.app -m entry_test -s unittest /ets/TestRunner/OpenHarmonyTestRunner
```

## Unit Test Example

```typescript
import { describe, it, expect } from '@ohos/hypium';

export default function UserViewModelTest() {
  describe('UserViewModel', () => {
    it('should_initialize_with_empty_state', 0, () => {
      const vm = new UserViewModel();
      expect(vm.userName).assertEqual('');
      expect(vm.isLoading).assertFalse();
    });

    it('should_update_user_name', 0, () => {
      const vm = new UserViewModel();
      vm.updateUserName('Alice');
      expect(vm.userName).assertEqual('Alice');
    });

    it('should_handle_empty_input', 0, () => {
      const vm = new UserViewModel();
      vm.updateUserName('');
      expect(vm.userName).assertEqual('');
      expect(vm.hasError).assertFalse();
    });
  });
}
```

## UI Test Example

```typescript
import { describe, it, expect } from '@ohos/hypium';
import { Driver, ON } from '@ohos.UiTest';

export default function HomePageUITest() {
  describe('HomePage_UI', () => {
    it('should_display_title', 0, async () => {
      const driver = Driver.create();
      await driver.delayMs(1000);

      const title = await driver.findComponent(ON.text('Home'));
      expect(title !== null).assertTrue();
    });

    it('should_navigate_to_detail_on_click', 0, async () => {
      const driver = Driver.create();
      const button = await driver.findComponent(ON.id('detailButton'));
      await button.click();
      await driver.delayMs(500);

      const detailTitle = await driver.findComponent(ON.text('Detail'));
      expect(detailTitle !== null).assertTrue();
    });
  });
}
```

## TDD Workflow for HarmonyOS

Follow the standard TDD cycle adapted for HarmonyOS:

1. **RED**: Write a failing test in `ohosTest/ets/test/`
2. **GREEN**: Implement minimal code in `main/ets/` to pass
3. **REFACTOR**: Clean up while keeping tests green
4. **BUILD**: Run `hvigorw assembleHap` to verify compilation
5. **VERIFY**: Run tests on device/emulator

## Test Coverage Requirements

- Minimum 80% coverage for all critical application code (ViewModels, services, utilities)
- **Unit tests**: All utility functions, ViewModel logic, data models
- **Integration tests**: API calls, database operations, cross-module interactions
- **E2E / UI tests**: Critical user flows (login, navigation, data submission)
- Test edge cases: empty data, network errors, permission denials

## Testing Best Practices

- Keep tests independent - no shared mutable state between tests
- Mock network calls and system APIs in unit tests
- Use meaningful test names: `should_[expected_behavior]_when_[condition]`
- Test V2 state management reactivity: verify `@Trace` properties trigger UI updates
- Test Navigation flows: verify `NavPathStack` push/pop/replace operations
- Avoid testing framework internals - focus on business logic and user-visible behavior

### common/agents

# Agent Orchestration

## Available Agents

Located in `~/.claude/agents/`:

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| planner | Implementation planning | Complex features, refactoring |
| architect | System design | Architectural decisions |
| tdd-guide | Test-driven development | New features, bug fixes |
| code-reviewer | Code review | After writing code |
| security-reviewer | Security analysis | Before commits |
| build-error-resolver | Fix build errors | When build fails |
| e2e-runner | E2E testing | Critical user flows |
| refactor-cleaner | Dead code cleanup | Code maintenance |
| doc-updater | Documentation | Updating docs |
| rust-reviewer | Rust code review | Rust projects |
| harmonyos-app-resolver | HarmonyOS app development | HarmonyOS/ArkTS projects |

## Immediate Agent Usage

No user prompt needed:
1. Complex feature requests - Use **planner** agent
2. Code just written/modified - Use **code-reviewer** agent
3. Bug fix or new feature - Use **tdd-guide** agent
4. Architectural decision - Use **architect** agent

## Parallel Task Execution

ALWAYS use parallel Task execution for independent operations:

```markdown
# GOOD: Parallel execution
Launch 3 agents in parallel:
1. Agent 1: Security analysis of auth module
2. Agent 2: Performance review of cache system
3. Agent 3: Type checking of utilities

# BAD: Sequential when unnecessary
First agent 1, then agent 2, then agent 3
```

## Multi-Perspective Analysis

For complex problems, use split role sub-agents:
- Factual reviewer
- Senior engineer
- Security expert
- Consistency reviewer
- Redundancy checker

### common/code-review

# Code Review Standards

## Purpose

Code review ensures quality, security, and maintainability before code is merged. This rule defines when and how to conduct code reviews.

## When to Review

**MANDATORY review triggers:**

- After writing or modifying code
- Before any commit to shared branches
- When security-sensitive code is changed (auth, payments, user data)
- When architectural changes are made
- Before merging pull requests

**Pre-Review Requirements:**

Before requesting review, ensure:

- All automated checks (CI/CD) are passing
- Merge conflicts are resolved
- Branch is up to date with target branch

## Review Checklist

Before marking code complete:

- [ ] Code is readable and well-named
- [ ] Functions are focused (<50 lines)
- [ ] Files are cohesive (<800 lines)
- [ ] No deep nesting (>4 levels)
- [ ] Errors are handled explicitly
- [ ] No hardcoded secrets or credentials
- [ ] No console.log or debug statements
- [ ] Tests exist for new functionality
- [ ] Test coverage meets 80% minimum

## Security Review Triggers

**STOP and use security-reviewer agent when:**

- Authentication or authorization code
- User input handling
- Database queries
- File system operations
- External API calls
- Cryptographic operations
- Payment or financial code

## Review Severity Levels

| Level | Meaning | Action |
|-------|---------|--------|
| CRITICAL | Security vulnerability or data loss risk | **BLOCK** - Must fix before merge |
| HIGH | Bug or significant quality issue | **WARN** - Should fix before merge |
| MEDIUM | Maintainability concern | **INFO** - Consider fixing |
| LOW | Style or minor suggestion | **NOTE** - Optional |

## Agent Usage

Use these agents for code review:

| Agent | Purpose |
|-------|---------|
| **code-reviewer** | General code quality, patterns, best practices |
| **security-reviewer** | Security vulnerabilities, OWASP Top 10 |
| **typescript-reviewer** | TypeScript/JavaScript specific issues |
| **python-reviewer** | Python specific issues |
| **go-reviewer** | Go specific issues |
| **rust-reviewer** | Rust specific issues |

## Review Workflow

```
1. Run git diff to understand changes
2. Check security checklist first
3. Review code quality checklist
4. Run relevant tests
5. Verify coverage >= 80%
6. Use appropriate agent for detailed review
```

## Common Issues to Catch

### Security

- Hardcoded credentials (API keys, passwords, tokens)
- SQL injection (string concatenation in queries)
- XSS vulnerabilities (unescaped user input)
- Path traversal (unsanitized file paths)
- CSRF protection missing
- Authentication bypasses

### Code Quality

- Large functions (>50 lines) - split into smaller
- Large files (>800 lines) - extract modules
- Deep nesting (>4 levels) - use early returns
- Missing error handling - handle explicitly
- Mutation patterns - prefer immutable operations
- Missing tests - add test coverage

### Performance

- N+1 queries - use JOINs or batching
- Missing pagination - add LIMIT to queries
- Unbounded queries - add constraints
- Missing caching - cache expensive operations

## Approval Criteria

- **Approve**: No CRITICAL or HIGH issues
- **Warning**: Only HIGH issues (merge with caution)
- **Block**: CRITICAL issues found

## Integration with Other Rules

This rule works with:

- [testing.md](testing.md) - Test coverage requirements
- [security.md](security.md) - Security checklist
- [git-workflow.md](git-workflow.md) - Commit standards
- [agents.md](agents.md) - Agent delegation

### common/coding-style

# Coding Style

## Immutability (CRITICAL)

ALWAYS create new objects, NEVER mutate existing ones:

```
// Pseudocode
WRONG:  modify(original, field, value) → changes original in-place
CORRECT: update(original, field, value) → returns new copy with change
```

Rationale: Immutable data prevents hidden side effects, makes debugging easier, and enables safe concurrency.

## Core Principles

### KISS (Keep It Simple)

- Prefer the simplest solution that actually works
- Avoid premature optimization
- Optimize for clarity over cleverness

### DRY (Don't Repeat Yourself)

- Extract repeated logic into shared functions or utilities
- Avoid copy-paste implementation drift
- Introduce abstractions when repetition is real, not speculative

### YAGNI (You Aren't Gonna Need It)

- Do not build features or abstractions before they are needed
- Avoid speculative generality
- Start simple, then refactor when the pressure is real

## File Organization

MANY SMALL FILES > FEW LARGE FILES:
- High cohesion, low coupling
- 200-400 lines typical, 800 max
- Extract utilities from large modules
- Organize by feature/domain, not by type

## Error Handling

ALWAYS handle errors comprehensively:
- Handle errors explicitly at every level
- Provide user-friendly error messages in UI-facing code
- Log detailed error context on the server side
- Never silently swallow errors

## Input Validation

ALWAYS validate at system boundaries:
- Validate all user input before processing
- Use schema-based validation where available
- Fail fast with clear error messages
- Never trust external data (API responses, user input, file content)

## Naming Conventions

- Variables and functions: `camelCase` with descriptive names
- Booleans: prefer `is`, `has`, `should`, or `can` prefixes
- Interfaces, types, and components: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Custom hooks: `camelCase` with a `use` prefix

## Code Smells to Avoid

### Deep Nesting

Prefer early returns over nested conditionals once the logic starts stacking.

### Magic Numbers

Use named constants for meaningful thresholds, delays, and limits.

### Long Functions

Split large functions into focused pieces with clear responsibilities.

## Code Quality Checklist

Before marking work complete:
- [ ] Code is readable and well-named
- [ ] Functions are small (<50 lines)
- [ ] Files are focused (<800 lines)
- [ ] No deep nesting (>4 levels)
- [ ] Proper error handling
- [ ] No hardcoded values (use constants or config)
- [ ] No mutation (immutable patterns used)

### common/development-workflow

# Development Workflow

> This file extends [common/git-workflow.md](./git-workflow.md) with the full feature development process that happens before git operations.

The Feature Implementation Workflow describes the development pipeline: research, planning, TDD, code review, and then committing to git.

## Feature Implementation Workflow

0. **Research & Reuse** _(mandatory before any new implementation)_
   - **GitHub code search first:** Run `gh search repos` and `gh search code` to find existing implementations, templates, and patterns before writing anything new.
   - **Library docs second:** Use Context7 or primary vendor docs to confirm API behavior, package usage, and version-specific details before implementing.
   - **Exa only when the first two are insufficient:** Use Exa for broader web research or discovery after GitHub search and primary docs.
   - **Check package registries:** Search npm, PyPI, crates.io, and other registries before writing utility code. Prefer battle-tested libraries over hand-rolled solutions.
   - **Search for adaptable implementations:** Look for open-source projects that solve 80%+ of the problem and can be forked, ported, or wrapped.
   - Prefer adopting or porting a proven approach over writing net-new code when it meets the requirement.

1. **Plan First**
   - Use **planner** agent to create implementation plan
   - Generate planning docs before coding: PRD, architecture, system_design, tech_doc, task_list
   - Identify dependencies and risks
   - Break down into phases

2. **TDD Approach**
   - Use **tdd-guide** agent
   - Write tests first (RED)
   - Implement to pass tests (GREEN)
   - Refactor (IMPROVE)
   - Verify 80%+ coverage

3. **Code Review**
   - Use **code-reviewer** agent immediately after writing code
   - Address CRITICAL and HIGH issues
   - Fix MEDIUM issues when possible

4. **Commit & Push**
   - Detailed commit messages
   - Follow conventional commits format
   - See [git-workflow.md](./git-workflow.md) for commit message format and PR process

5. **Pre-Review Checks**
   - Verify all automated checks (CI/CD) are passing
   - Resolve any merge conflicts
   - Ensure branch is up to date with target branch
   - Only request review after these checks pass

### common/git-workflow

# Git Workflow

## Commit Message Format
```
<type>: <description>

<optional body>
```

Types: feat, fix, refactor, docs, test, chore, perf, ci

Note: To disable co-author attribution on commits, set `"includeCoAuthoredBy": false` in `~/.claude/settings.json` (Claude Code appends `Co-Authored-By` by default; ECC does not ship this setting).

## Pull Request Workflow

When creating PRs:
1. Analyze full commit history (not just latest commit)
2. Use `git diff [base-branch]...HEAD` to see all changes
3. Draft comprehensive PR summary
4. Include test plan with TODOs
5. Push with `-u` flag if new branch

> For the full development process (planning, TDD, code review) before git operations,
> see [development-workflow.md](./development-workflow.md).

### common/hooks

# Hooks System

## Hook Types

- **PreToolUse**: Before tool execution (validation, parameter modification)
- **PostToolUse**: After tool execution (auto-format, checks)
- **Stop**: When session ends (final verification)

## Auto-Accept Permissions

Use with caution:
- Enable for trusted, well-defined plans
- Disable for exploratory work
- Never use dangerously-skip-permissions flag
- Configure `allowedTools` in `~/.claude.json` instead

## TodoWrite Best Practices

Use TodoWrite tool to:
- Track progress on multi-step tasks
- Verify understanding of instructions
- Enable real-time steering
- Show granular implementation steps

Todo list reveals:
- Out of order steps
- Missing items
- Extra unnecessary items
- Wrong granularity
- Misinterpreted requirements

### common/patterns

# Common Patterns

## Skeleton Projects

When implementing new functionality:
1. Search for battle-tested skeleton projects
2. Use parallel agents to evaluate options:
   - Security assessment
   - Extensibility analysis
   - Relevance scoring
   - Implementation planning
3. Clone best match as foundation
4. Iterate within proven structure

## Design Patterns

### Repository Pattern

Encapsulate data access behind a consistent interface:
- Define standard operations: findAll, findById, create, update, delete
- Concrete implementations handle storage details (database, API, file, etc.)
- Business logic depends on the abstract interface, not the storage mechanism
- Enables easy swapping of data sources and simplifies testing with mocks

### API Response Format

Use a consistent envelope for all API responses:
- Include a success/status indicator
- Include the data payload (nullable on error)
- Include an error message field (nullable on success)
- Include metadata for paginated responses (total, page, limit)

### common/performance

# Performance Optimization

## Model Selection Strategy

**Haiku** (90% of Sonnet capability, 3x cost savings):
- Lightweight agents with frequent invocation
- Pair programming and code generation
- Worker agents in multi-agent systems

**Sonnet** (Best coding model):
- Main development work
- Orchestrating multi-agent workflows
- Complex coding tasks

**Opus** (Deepest reasoning):
- Complex architectural decisions
- Maximum reasoning requirements
- Research and analysis tasks

## Context Window Management

Avoid last 20% of context window for:
- Large-scale refactoring
- Feature implementation spanning multiple files
- Debugging complex interactions

Lower context sensitivity tasks:
- Single-file edits
- Independent utility creation
- Documentation updates
- Simple bug fixes

## Extended Thinking + Plan Mode

Extended thinking is enabled by default, reserving up to 31,999 tokens for internal reasoning.

Control extended thinking via:
- **Toggle**: Option+T (macOS) / Alt+T (Windows/Linux)
- **Config**: Set `alwaysThinkingEnabled` in `~/.claude/settings.json`
- **Budget cap**: `export MAX_THINKING_TOKENS=10000` (bash) or `$env:MAX_THINKING_TOKENS = "10000"` (PowerShell)
- **Verbose mode**: Ctrl+O to see thinking output

For complex tasks requiring deep reasoning:
1. Ensure extended thinking is enabled (on by default)
2. Enable **Plan Mode** for structured approach
3. Use multiple critique rounds for thorough analysis
4. Use split role sub-agents for diverse perspectives

## Build Troubleshooting

If build fails:
1. Use **build-error-resolver** agent
2. Analyze error messages
3. Fix incrementally
4. Verify after each fix

### common/security

# Security Guidelines

## Mandatory Security Checks

Before ANY commit:
- [ ] No hardcoded secrets (API keys, passwords, tokens)
- [ ] All user inputs validated
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitized HTML)
- [ ] CSRF protection enabled
- [ ] Authentication/authorization verified
- [ ] Rate limiting on all endpoints
- [ ] Error messages don't leak sensitive data

## Secret Management

- NEVER hardcode secrets in source code
- ALWAYS use environment variables or a secret manager
- Validate that required secrets are present at startup
- Rotate any secrets that may have been exposed

## Security Response Protocol

If security issue found:
1. STOP immediately
2. Use **security-reviewer** agent
3. Fix CRITICAL issues before continuing
4. Rotate any exposed secrets
5. Review entire codebase for similar issues

### common/testing

# Testing Requirements

## Minimum Test Coverage: 80%

Test Types (ALL required):
1. **Unit Tests** - Individual functions, utilities, components
2. **Integration Tests** - API endpoints, database operations
3. **E2E Tests** - Critical user flows (framework chosen per language)

## Test-Driven Development

MANDATORY workflow:
1. Write test first (RED)
2. Run test - it should FAIL
3. Write minimal implementation (GREEN)
4. Run test - it should PASS
5. Refactor (IMPROVE)
6. Verify coverage (80%+)

## Troubleshooting Test Failures

1. Use **tdd-guide** agent
2. Check test isolation
3. Verify mocks are correct
4. Fix implementation, not tests (unless tests are wrong)

## Agent Support

- **tdd-guide** - Use PROACTIVELY for new features, enforces write-tests-first

## Test Structure (AAA Pattern)

Prefer Arrange-Act-Assert structure for tests:

```typescript
test('calculates similarity correctly', () => {
  // Arrange
  const vector1 = [1, 0, 0]
  const vector2 = [0, 1, 0]

  // Act
  const similarity = calculateCosineSimilarity(vector1, vector2)

  // Assert
  expect(similarity).toBe(0)
})
```

### Test Naming

Use descriptive names that explain the behavior under test:

```typescript
test('returns empty array when no markets match query', () => {})
test('throws error when API key is missing', () => {})
test('falls back to substring search when Redis is unavailable', () => {})
```

### cpp/coding-style

# C++ Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with C++ specific content.

## Modern C++ (C++17/20/23)

- Prefer **modern C++ features** over C-style constructs
- Use `auto` when the type is obvious from context
- Use `constexpr` for compile-time constants
- Use structured bindings: `auto [key, value] = map_entry;`

## Resource Management

- **RAII everywhere** — no manual `new`/`delete`
- Use `std::unique_ptr` for exclusive ownership
- Use `std::shared_ptr` only when shared ownership is truly needed
- Use `std::make_unique` / `std::make_shared` over raw `new`

## Naming Conventions

- Types/Classes: `PascalCase`
- Functions/Methods: `snake_case` or `camelCase` (follow project convention)
- Constants: `kPascalCase` or `UPPER_SNAKE_CASE`
- Namespaces: `lowercase`
- Member variables: `snake_case_` (trailing underscore) or `m_` prefix

## Formatting

- Use **clang-format** — no style debates
- Run `clang-format -i <file>` before committing

## Reference

See skill: `cpp-coding-standards` for comprehensive C++ coding standards and guidelines.

### cpp/hooks

# C++ Hooks

> This file extends [common/hooks.md](../common/hooks.md) with C++ specific content.

## Build Hooks

Run these checks before committing C++ changes:

```bash
# Format check
clang-format --dry-run --Werror src/*.cpp src/*.hpp

# Static analysis
clang-tidy src/*.cpp -- -std=c++17

# Build
cmake --build build

# Tests
ctest --test-dir build --output-on-failure
```

## Recommended CI Pipeline

1. **clang-format** — formatting check
2. **clang-tidy** — static analysis
3. **cppcheck** — additional analysis
4. **cmake build** — compilation
5. **ctest** — test execution with sanitizers

### cpp/patterns

# C++ Patterns

> This file extends [common/patterns.md](../common/patterns.md) with C++ specific content.

## RAII (Resource Acquisition Is Initialization)

Tie resource lifetime to object lifetime:

```cpp
class FileHandle {
public:
    explicit FileHandle(const std::string& path) : file_(std::fopen(path.c_str(), "r")) {}
    ~FileHandle() { if (file_) std::fclose(file_); }
    FileHandle(const FileHandle&) = delete;
    FileHandle& operator=(const FileHandle&) = delete;
private:
    std::FILE* file_;
};
```

## Rule of Five/Zero

- **Rule of Zero**: Prefer classes that need no custom destructor, copy/move constructors, or assignments
- **Rule of Five**: If you define any of destructor/copy-ctor/copy-assign/move-ctor/move-assign, define all five

## Value Semantics

- Pass small/trivial types by value
- Pass large types by `const&`
- Return by value (rely on RVO/NRVO)
- Use move semantics for sink parameters

## Error Handling

- Use exceptions for exceptional conditions
- Use `std::optional` for values that may not exist
- Use `std::expected` (C++23) or result types for expected failures

## Reference

See skill: `cpp-coding-standards` for comprehensive C++ patterns and anti-patterns.

### cpp/security

# C++ Security

> This file extends [common/security.md](../common/security.md) with C++ specific content.

## Memory Safety

- Never use raw `new`/`delete` — use smart pointers
- Never use C-style arrays — use `std::array` or `std::vector`
- Never use `malloc`/`free` — use C++ allocation
- Avoid `reinterpret_cast` unless absolutely necessary

## Buffer Overflows

- Use `std::string` over `char*`
- Use `.at()` for bounds-checked access when safety matters
- Never use `strcpy`, `strcat`, `sprintf` — use `std::string` or `fmt::format`

## Undefined Behavior

- Always initialize variables
- Avoid signed integer overflow
- Never dereference null or dangling pointers
- Use sanitizers in CI:
  ```bash
  cmake -DCMAKE_CXX_FLAGS="-fsanitize=address,undefined" ..
  ```

## Static Analysis

- Use **clang-tidy** for automated checks:
  ```bash
  clang-tidy --checks='*' src/*.cpp
  ```
- Use **cppcheck** for additional analysis:
  ```bash
  cppcheck --enable=all src/
  ```

## Reference

See skill: `cpp-coding-standards` for detailed security guidelines.

### cpp/testing

# C++ Testing

> This file extends [common/testing.md](../common/testing.md) with C++ specific content.

## Framework

Use **GoogleTest** (gtest/gmock) with **CMake/CTest**.

## Running Tests

```bash
cmake --build build && ctest --test-dir build --output-on-failure
```

## Coverage

```bash
cmake -DCMAKE_CXX_FLAGS="--coverage" -DCMAKE_EXE_LINKER_FLAGS="--coverage" ..
cmake --build .
ctest --output-on-failure
lcov --capture --directory . --output-file coverage.info
```

## Sanitizers

Always run tests with sanitizers in CI:

```bash
cmake -DCMAKE_CXX_FLAGS="-fsanitize=address,undefined" ..
```

## Reference

See skill: `cpp-testing` for detailed C++ testing patterns, TDD workflow, and GoogleTest/GMock usage.

### csharp/coding-style

# C# Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with C#-specific content.

## Standards

- Follow current .NET conventions and enable nullable reference types
- Prefer explicit access modifiers on public and internal APIs
- Keep files aligned with the primary type they define

## Types and Models

- Prefer `record` or `record struct` for immutable value-like models
- Use `class` for entities or types with identity and lifecycle
- Use `interface` for service boundaries and abstractions
- Avoid `dynamic` in application code; prefer generics or explicit models

```csharp
public sealed record UserDto(Guid Id, string Email);

public interface IUserRepository
{
    Task<UserDto?> FindByIdAsync(Guid id, CancellationToken cancellationToken);
}
```

## Immutability

- Prefer `init` setters, constructor parameters, and immutable collections for shared state
- Do not mutate input models in-place when producing updated state

```csharp
public sealed record UserProfile(string Name, string Email);

public static UserProfile Rename(UserProfile profile, string name) =>
    profile with { Name = name };
```

## Async and Error Handling

- Prefer `async`/`await` over blocking calls like `.Result` or `.Wait()`
- Pass `CancellationToken` through public async APIs
- Throw specific exceptions and log with structured properties

```csharp
public async Task<Order> LoadOrderAsync(
    Guid orderId,
    CancellationToken cancellationToken)
{
    try
    {
        return await repository.FindAsync(orderId, cancellationToken)
            ?? throw new InvalidOperationException($"Order {orderId} was not found.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Failed to load order {OrderId}", orderId);
        throw;
    }
}
```

## Formatting

- Use `dotnet format` for formatting and analyzer fixes
- Keep `using` directives organized and remove unused imports
- Prefer expression-bodied members only when they stay readable

### csharp/hooks

# C# Hooks

> This file extends [common/hooks.md](../common/hooks.md) with C#-specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **dotnet format**: Auto-format edited C# files and apply analyzer fixes
- **dotnet build**: Verify the solution or project still compiles after edits
- **dotnet test --no-build**: Re-run the nearest relevant test project after behavior changes

## Stop Hooks

- Run a final `dotnet build` before ending a session with broad C# changes
- Warn on modified `appsettings*.json` files so secrets do not get committed

### csharp/patterns

# C# Patterns

> This file extends [common/patterns.md](../common/patterns.md) with C#-specific content.

## API Response Pattern

```csharp
public sealed record ApiResponse<T>(
    bool Success,
    T? Data = default,
    string? Error = null,
    object? Meta = null);
```

## Repository Pattern

```csharp
public interface IRepository<T>
{
    Task<IReadOnlyList<T>> FindAllAsync(CancellationToken cancellationToken);
    Task<T?> FindByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<T> CreateAsync(T entity, CancellationToken cancellationToken);
    Task<T> UpdateAsync(T entity, CancellationToken cancellationToken);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken);
}
```

## Options Pattern

Use strongly typed options for config instead of reading raw strings throughout the codebase.

```csharp
public sealed class PaymentsOptions
{
    public const string SectionName = "Payments";
    public required string BaseUrl { get; init; }
    public required string ApiKeySecretName { get; init; }
}
```

## Dependency Injection

- Depend on interfaces at service boundaries
- Keep constructors focused; if a service needs too many dependencies, split responsibilities
- Register lifetimes intentionally: singleton for stateless/shared services, scoped for request data, transient for lightweight pure workers

### csharp/security

# C# Security

> This file extends [common/security.md](../common/security.md) with C#-specific content.

## Secret Management

- Never hardcode API keys, tokens, or connection strings in source code
- Use environment variables, user secrets for local development, and a secret manager in production
- Keep `appsettings.*.json` free of real credentials

```csharp
// BAD
const string ApiKey = "sk-live-123";

// GOOD
var apiKey = builder.Configuration["OpenAI:ApiKey"]
    ?? throw new InvalidOperationException("OpenAI:ApiKey is not configured.");
```

## SQL Injection Prevention

- Always use parameterized queries with ADO.NET, Dapper, or EF Core
- Never concatenate user input into SQL strings
- Validate sort fields and filter operators before using dynamic query composition

```csharp
const string sql = "SELECT * FROM Orders WHERE CustomerId = @customerId";
await connection.QueryAsync<Order>(sql, new { customerId });
```

## Input Validation

- Validate DTOs at the application boundary
- Use data annotations, FluentValidation, or explicit guard clauses
- Reject invalid model state before running business logic

## Authentication and Authorization

- Prefer framework auth handlers instead of custom token parsing
- Enforce authorization policies at endpoint or handler boundaries
- Never log raw tokens, passwords, or PII

## Error Handling

- Return safe client-facing messages
- Log detailed exceptions with structured context server-side
- Do not expose stack traces, SQL text, or filesystem paths in API responses

## References

See skill: `security-review` for broader application security review checklists.

### csharp/testing

# C# Testing

> This file extends [common/testing.md](../common/testing.md) with C#-specific content.

## Test Framework

- Prefer **xUnit** for unit and integration tests
- Use **FluentAssertions** for readable assertions
- Use **Moq** or **NSubstitute** for mocking dependencies
- Use **Testcontainers** when integration tests need real infrastructure

## Test Organization

- Mirror `src/` structure under `tests/`
- Separate unit, integration, and end-to-end coverage clearly
- Name tests by behavior, not implementation details

```csharp
public sealed class OrderServiceTests
{
    [Fact]
    public async Task FindByIdAsync_ReturnsOrder_WhenOrderExists()
    {
        // Arrange
        // Act
        // Assert
    }
}
```

## ASP.NET Core Integration Tests

- Use `WebApplicationFactory<TEntryPoint>` for API integration coverage
- Test auth, validation, and serialization through HTTP, not by bypassing middleware

## Coverage

- Target 80%+ line coverage
- Focus coverage on domain logic, validation, auth, and failure paths
- Run `dotnet test` in CI with coverage collection enabled where available

### dart/coding-style

# Dart/Flutter Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with Dart and Flutter-specific content.

## Formatting

- **dart format** for all `.dart` files — enforced in CI (`dart format --set-exit-if-changed .`)
- Line length: 80 characters (dart format default)
- Trailing commas on multi-line argument/parameter lists to improve diffs and formatting

## Immutability

- Prefer `final` for local variables and `const` for compile-time constants
- Use `const` constructors wherever all fields are `final`
- Return unmodifiable collections from public APIs (`List.unmodifiable`, `Map.unmodifiable`)
- Use `copyWith()` for state mutations in immutable state classes

```dart
// BAD
var count = 0;
List<String> items = ['a', 'b'];

// GOOD
final count = 0;
const items = ['a', 'b'];
```

## Naming

Follow Dart conventions:
- `camelCase` for variables, parameters, and named constructors
- `PascalCase` for classes, enums, typedefs, and extensions
- `snake_case` for file names and library names
- `SCREAMING_SNAKE_CASE` for constants declared with `const` at top level
- Prefix private members with `_`
- Extension names describe the type they extend: `StringExtensions`, not `MyHelpers`

## Null Safety

- Avoid `!` (bang operator) — prefer `?.`, `??`, `if (x != null)`, or Dart 3 pattern matching; reserve `!` only where a null value is a programming error and crashing is the right behaviour
- Avoid `late` unless initialization is guaranteed before first use (prefer nullable or constructor init)
- Use `required` for constructor parameters that must always be provided

```dart
// BAD — crashes at runtime if user is null
final name = user!.name;

// GOOD — null-aware operators
final name = user?.name ?? 'Unknown';

// GOOD — Dart 3 pattern matching (exhaustive, compiler-checked)
final name = switch (user) {
  User(:final name) => name,
  null => 'Unknown',
};

// GOOD — early-return null guard
String getUserName(User? user) {
  if (user == null) return 'Unknown';
  return user.name; // promoted to non-null after the guard
}
```

## Sealed Types and Pattern Matching (Dart 3+)

Use sealed classes to model closed state hierarchies:

```dart
sealed class AsyncState<T> {
  const AsyncState();
}

final class Loading<T> extends AsyncState<T> {
  const Loading();
}

final class Success<T> extends AsyncState<T> {
  const Success(this.data);
  final T data;
}

final class Failure<T> extends AsyncState<T> {
  const Failure(this.error);
  final Object error;
}
```

Always use exhaustive `switch` with sealed types — no default/wildcard:

```dart
// BAD
if (state is Loading) { ... }

// GOOD
return switch (state) {
  Loading() => const CircularProgressIndicator(),
  Success(:final data) => DataWidget(data),
  Failure(:final error) => ErrorWidget(error.toString()),
};
```

## Error Handling

- Specify exception types in `on` clauses — never use bare `catch (e)`
- Never catch `Error` subtypes — they indicate programming bugs
- Use `Result`-style types or sealed classes for recoverable errors
- Avoid using exceptions for control flow

```dart
// BAD
try {
  await fetchUser();
} catch (e) {
  log(e.toString());
}

// GOOD
try {
  await fetchUser();
} on NetworkException catch (e) {
  log('Network error: ${e.message}');
} on NotFoundException {
  handleNotFound();
}
```

## Async / Futures

- Always `await` Futures or explicitly call `unawaited()` to signal intentional fire-and-forget
- Never mark a function `async` if it never `await`s anything
- Use `Future.wait` / `Future.any` for concurrent operations
- Check `context.mounted` before using `BuildContext` after any `await` (Flutter 3.7+)

```dart
// BAD — ignoring Future
fetchData(); // fire-and-forget without marking intent

// GOOD
unawaited(fetchData()); // explicit fire-and-forget
await fetchData();      // or properly awaited
```

## Imports

- Use `package:` imports throughout — never relative imports (`../`) for cross-feature or cross-layer code
- Order: `dart:` → external `package:` → internal `package:` (same package)
- No unused imports — `dart analyze` enforces this with `unused_import`

## Code Generation

- Generated files (`.g.dart`, `.freezed.dart`, `.gr.dart`) must be committed or gitignored consistently — pick one strategy per project
- Never manually edit generated files
- Keep generator annotations (`@JsonSerializable`, `@freezed`, `@riverpod`, etc.) on the canonical source file only

### dart/hooks

# Dart/Flutter Hooks

> This file extends [common/hooks.md](../common/hooks.md) with Dart and Flutter-specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **dart format**: Auto-format `.dart` files after edit
- **dart analyze**: Run static analysis after editing Dart files and surface warnings
- **flutter test**: Optionally run affected tests after significant changes

## Recommended Hook Configuration

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": { "tool_name": "Edit", "file_paths": ["**/*.dart"] },
        "hooks": [
          { "type": "command", "command": "dart format $CLAUDE_FILE_PATHS" }
        ]
      }
    ]
  }
}
```

## Pre-commit Checks

Run before committing Dart/Flutter changes:

```bash
dart format --set-exit-if-changed .
dart analyze --fatal-infos
flutter test
```

## Useful One-liners

```bash
# Format all Dart files
dart format .

# Analyze and report issues
dart analyze

# Run all tests with coverage
flutter test --coverage

# Regenerate code-gen files
dart run build_runner build --delete-conflicting-outputs

# Check for outdated packages
flutter pub outdated

# Upgrade packages within constraints
flutter pub upgrade
```

### dart/patterns

# Dart/Flutter Patterns

> This file extends [common/patterns.md](../common/patterns.md) with Dart, Flutter, and common ecosystem-specific content.

## Repository Pattern

```dart
abstract interface class UserRepository {
  Future<User?> getById(String id);
  Future<List<User>> getAll();
  Stream<List<User>> watchAll();
  Future<void> save(User user);
  Future<void> delete(String id);
}

class UserRepositoryImpl implements UserRepository {
  const UserRepositoryImpl(this._remote, this._local);

  final UserRemoteDataSource _remote;
  final UserLocalDataSource _local;

  @override
  Future<User?> getById(String id) async {
    final local = await _local.getById(id);
    if (local != null) return local;
    final remote = await _remote.getById(id);
    if (remote != null) await _local.save(remote);
    return remote;
  }

  @override
  Future<List<User>> getAll() async {
    final remote = await _remote.getAll();
    for (final user in remote) {
      await _local.save(user);
    }
    return remote;
  }

  @override
  Stream<List<User>> watchAll() => _local.watchAll();

  @override
  Future<void> save(User user) => _local.save(user);

  @override
  Future<void> delete(String id) async {
    await _remote.delete(id);
    await _local.delete(id);
  }
}
```

## State Management: BLoC/Cubit

```dart
// Cubit — simple state transitions
class CounterCubit extends Cubit<int> {
  CounterCubit() : super(0);

  void increment() => emit(state + 1);
  void decrement() => emit(state - 1);
}

// BLoC — event-driven
@immutable
sealed class CartEvent {}
class CartItemAdded extends CartEvent { CartItemAdded(this.item); final Item item; }
class CartItemRemoved extends CartEvent { CartItemRemoved(this.id); final String id; }
class CartCleared extends CartEvent {}

@immutable
class CartState {
  const CartState({this.items = const []});
  final List<Item> items;
  CartState copyWith({List<Item>? items}) => CartState(items: items ?? this.items);
}

class CartBloc extends Bloc<CartEvent, CartState> {
  CartBloc() : super(const CartState()) {
    on<CartItemAdded>((event, emit) =>
        emit(state.copyWith(items: [...state.items, event.item])));
    on<CartItemRemoved>((event, emit) =>
        emit(state.copyWith(items: state.items.where((i) => i.id != event.id).toList())));
    on<CartCleared>((_, emit) => emit(const CartState()));
  }
}
```

## State Management: Riverpod

```dart
// Simple provider
@riverpod
Future<List<User>> users(Ref ref) async {
  final repo = ref.watch(userRepositoryProvider);
  return repo.getAll();
}

// Notifier for mutable state
@riverpod
class CartNotifier extends _$CartNotifier {
  @override
  List<Item> build() => [];

  void add(Item item) => state = [...state, item];
  void remove(String id) => state = state.where((i) => i.id != id).toList();
  void clear() => state = [];
}

// ConsumerWidget
class CartPage extends ConsumerWidget {
  const CartPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = ref.watch(cartNotifierProvider);
    return ListView(
      children: items.map((item) => CartItemTile(item: item)).toList(),
    );
  }
}
```

## Dependency Injection

Constructor injection is preferred. Use `get_it` or Riverpod providers at composition root:

```dart
// get_it registration (in a setup file)
void setupDependencies() {
  final di = GetIt.instance;
  di.registerSingleton<ApiClient>(ApiClient(baseUrl: Env.apiUrl));
  di.registerSingleton<UserRepository>(
    UserRepositoryImpl(di<ApiClient>(), di<LocalDatabase>()),
  );
  di.registerFactory(() => UserListViewModel(di<UserRepository>()));
}
```

## ViewModel Pattern (without BLoC/Riverpod)

```dart
class UserListViewModel extends ChangeNotifier {
  UserListViewModel(this._repository);

  final UserRepository _repository;

  AsyncState<List<User>> _state = const Loading();
  AsyncState<List<User>> get state => _state;

  Future<void> load() async {
    _state = const Loading();
    notifyListeners();
    try {
      final users = await _repository.getAll();
      _state = Success(users);
    } on Exception catch (e) {
      _state = Failure(e);
    }
    notifyListeners();
  }
}
```

## UseCase Pattern

```dart
class GetUserUseCase {
  const GetUserUseCase(this._repository);
  final UserRepository _repository;

  Future<User?> call(String id) => _repository.getById(id);
}

class CreateUserUseCase {
  const CreateUserUseCase(this._repository, this._idGenerator);
  final UserRepository _repository;
  final IdGenerator _idGenerator; // injected — domain layer must not depend on uuid package directly

  Future<void> call(CreateUserInput input) async {
    // Validate, apply business rules, then persist
    final user = User(id: _idGenerator.generate(), name: input.name, email: input.email);
    await _repository.save(user);
  }
}
```

## Immutable State with freezed

```dart
@freezed
class UserState with _$UserState {
  const factory UserState({
    @Default([]) List<User> users,
    @Default(false) bool isLoading,
    String? errorMessage,
  }) = _UserState;
}
```

## Clean Architecture Layer Boundaries

```
lib/
├── domain/              # Pure Dart — no Flutter, no external packages
│   ├── entities/
│   ├── repositories/    # Abstract interfaces
│   └── usecases/
├── data/                # Implements domain interfaces
│   ├── datasources/
│   ├── models/          # DTOs with fromJson/toJson
│   └── repositories/
└── presentation/        # Flutter widgets + state management
    ├── pages/
    ├── widgets/
    └── providers/ (or blocs/ or viewmodels/)
```

- Domain must not import `package:flutter` or any data-layer package
- Data layer maps DTOs to domain entities at repository boundaries
- Presentation calls use cases, not repositories directly

## Navigation (GoRouter)

```dart
final router = GoRouter(
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const HomePage(),
    ),
    GoRoute(
      path: '/users/:id',
      builder: (context, state) {
        final id = state.pathParameters['id']!;
        return UserDetailPage(userId: id);
      },
    ),
  ],
  // refreshListenable re-evaluates redirect whenever auth state changes
  refreshListenable: GoRouterRefreshStream(authCubit.stream),
  redirect: (context, state) {
    final isLoggedIn = context.read<AuthCubit>().state is AuthAuthenticated;
    if (!isLoggedIn && !state.matchedLocation.startsWith('/login')) {
      return '/login';
    }
    return null;
  },
);
```

## References

See skill: `flutter-dart-code-review` for the comprehensive review checklist.
See skill: `compose-multiplatform-patterns` for Kotlin Multiplatform/Flutter interop patterns.

### dart/security

# Dart/Flutter Security

> This file extends [common/security.md](../common/security.md) with Dart, Flutter, and mobile-specific content.

## Secrets Management

- Never hardcode API keys, tokens, or credentials in Dart source
- Use `--dart-define` or `--dart-define-from-file` for compile-time config (values are not truly secret — use a backend proxy for server-side secrets)
- Use `flutter_dotenv` or equivalent, with `.env` files listed in `.gitignore`
- Store runtime secrets in platform-secure storage: `flutter_secure_storage` (Keychain on iOS, EncryptedSharedPreferences on Android)

```dart
// BAD
const apiKey = 'sk-abc123...';

// GOOD — compile-time config (not secret, just configurable)
const apiKey = String.fromEnvironment('API_KEY');

// GOOD — runtime secret from secure storage
final token = await secureStorage.read(key: 'auth_token');
```

## Network Security

- Enforce HTTPS — no `http://` calls in production
- Configure Android `network_security_config.xml` to block cleartext traffic
- Set `NSAppTransportSecurity` in `Info.plist` to disallow arbitrary loads
- Set request timeouts on all HTTP clients — never leave defaults
- Consider certificate pinning for high-security endpoints

```dart
// Dio with timeout and HTTPS enforcement
final dio = Dio(BaseOptions(
  baseUrl: 'https://api.example.com',
  connectTimeout: const Duration(seconds: 10),
  receiveTimeout: const Duration(seconds: 30),
));
```

## Input Validation

- Validate and sanitize all user input before sending to API or storage
- Never pass unsanitized input to SQL queries — use parameterized queries (sqflite, drift)
- Sanitize deep link URLs before navigation — validate scheme, host, and path parameters
- Use `Uri.tryParse` and validate before navigating

```dart
// BAD — SQL injection
await db.rawQuery("SELECT * FROM users WHERE email = '$userInput'");

// GOOD — parameterized
await db.query('users', where: 'email = ?', whereArgs: [userInput]);

// BAD — unvalidated deep link
final uri = Uri.parse(incomingLink);
context.go(uri.path); // could navigate to any route

// GOOD — validated deep link
final uri = Uri.tryParse(incomingLink);
if (uri != null && uri.host == 'myapp.com' && _allowedPaths.contains(uri.path)) {
  context.go(uri.path);
}
```

## Data Protection

- Store tokens, PII, and credentials only in `flutter_secure_storage`
- Never write sensitive data to `SharedPreferences` or local files in plaintext
- Clear auth state on logout: tokens, cached user data, cookies
- Use biometric authentication (`local_auth`) for sensitive operations
- Avoid logging sensitive data — no `print(token)` or `debugPrint(password)`

## Android-Specific

- Declare only required permissions in `AndroidManifest.xml`
- Export Android components (`Activity`, `Service`, `BroadcastReceiver`) only when necessary; add `android:exported="false"` where not needed
- Review intent filters — exported components with implicit intent filters are accessible by any app
- Use `FLAG_SECURE` for screens displaying sensitive data (prevents screenshots)

```xml
<!-- AndroidManifest.xml — restrict exported components -->
<activity android:name=".MainActivity" android:exported="true">
    <!-- Only the launcher activity needs exported=true -->
</activity>
<activity android:name=".SensitiveActivity" android:exported="false" />
```

## iOS-Specific

- Declare only required usage descriptions in `Info.plist` (`NSCameraUsageDescription`, etc.)
- Store secrets in Keychain — `flutter_secure_storage` uses Keychain on iOS
- Use App Transport Security (ATS) — disallow arbitrary loads
- Enable data protection entitlement for sensitive files

## WebView Security

- Use `webview_flutter` v4+ (`WebViewController` / `WebViewWidget`) — the legacy `WebView` widget is removed
- Disable JavaScript unless explicitly required (`JavaScriptMode.disabled`)
- Validate URLs before loading — never load arbitrary URLs from deep links
- Never expose Dart callbacks to JavaScript unless absolutely needed and carefully sandboxed
- Use `NavigationDelegate.onNavigationRequest` to intercept and validate navigation requests

```dart
// webview_flutter v4+ API (WebViewController + WebViewWidget)
final controller = WebViewController()
  ..setJavaScriptMode(JavaScriptMode.disabled) // disabled unless required
  ..setNavigationDelegate(
    NavigationDelegate(
      onNavigationRequest: (request) {
        final uri = Uri.tryParse(request.url);
        if (uri == null || uri.host != 'trusted.example.com') {
          return NavigationDecision.prevent;
        }
        return NavigationDecision.navigate;
      },
    ),
  );

// In your widget tree:
WebViewWidget(controller: controller)
```

## Obfuscation and Build Security

- Enable obfuscation in release builds: `flutter build apk --obfuscate --split-debug-info=./debug-info/`
- Keep `--split-debug-info` output out of version control (used for crash symbolication only)
- Ensure ProGuard/R8 rules don't inadvertently expose serialized classes
- Run `flutter analyze` and address all warnings before release

### dart/testing

# Dart/Flutter Testing

> This file extends [common/testing.md](../common/testing.md) with Dart and Flutter-specific content.

## Test Framework

- **flutter_test** / **dart:test** — built-in test runner
- **mockito** (with `@GenerateMocks`) or **mocktail** (no codegen) for mocking
- **bloc_test** for BLoC/Cubit unit tests
- **fake_async** for controlling time in unit tests
- **integration_test** for end-to-end device tests

## Test Types

| Type | Tool | Location | When to Write |
|------|------|----------|---------------|
| Unit | `dart:test` | `test/unit/` | All domain logic, state managers, repositories |
| Widget | `flutter_test` | `test/widget/` | All widgets with meaningful behavior |
| Golden | `flutter_test` | `test/golden/` | Design-critical UI components |
| Integration | `integration_test` | `integration_test/` | Critical user flows on real device/emulator |

## Unit Tests: State Managers

### BLoC with `bloc_test`

```dart
group('CartBloc', () {
  late CartBloc bloc;
  late MockCartRepository repository;

  setUp(() {
    repository = MockCartRepository();
    bloc = CartBloc(repository);
  });

  tearDown(() => bloc.close());

  blocTest<CartBloc, CartState>(
    'emits updated items when CartItemAdded',
    build: () => bloc,
    act: (b) => b.add(CartItemAdded(testItem)),
    expect: () => [CartState(items: [testItem])],
  );

  blocTest<CartBloc, CartState>(
    'emits empty cart when CartCleared',
    seed: () => CartState(items: [testItem]),
    build: () => bloc,
    act: (b) => b.add(CartCleared()),
    expect: () => [const CartState()],
  );
});
```

### Riverpod with `ProviderContainer`

```dart
test('usersProvider loads users from repository', () async {
  final container = ProviderContainer(
    overrides: [userRepositoryProvider.overrideWithValue(FakeUserRepository())],
  );
  addTearDown(container.dispose);

  final result = await container.read(usersProvider.future);
  expect(result, isNotEmpty);
});
```

## Widget Tests

```dart
testWidgets('CartPage shows item count badge', (tester) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        cartNotifierProvider.overrideWith(() => FakeCartNotifier([testItem])),
      ],
      child: const MaterialApp(home: CartPage()),
    ),
  );

  await tester.pump();
  expect(find.text('1'), findsOneWidget);
  expect(find.byType(CartItemTile), findsOneWidget);
});

testWidgets('shows empty state when cart is empty', (tester) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [cartNotifierProvider.overrideWith(() => FakeCartNotifier([]))],
      child: const MaterialApp(home: CartPage()),
    ),
  );

  await tester.pump();
  expect(find.text('Your cart is empty'), findsOneWidget);
});
```

## Fakes Over Mocks

Prefer hand-written fakes for complex dependencies:

```dart
class FakeUserRepository implements UserRepository {
  final _users = <String, User>{};
  Object? fetchError;

  @override
  Future<User?> getById(String id) async {
    if (fetchError != null) throw fetchError!;
    return _users[id];
  }

  @override
  Future<List<User>> getAll() async {
    if (fetchError != null) throw fetchError!;
    return _users.values.toList();
  }

  @override
  Stream<List<User>> watchAll() => Stream.value(_users.values.toList());

  @override
  Future<void> save(User user) async {
    _users[user.id] = user;
  }

  @override
  Future<void> delete(String id) async {
    _users.remove(id);
  }

  void addUser(User user) => _users[user.id] = user;
}
```

## Async Testing

```dart
// Use fake_async for controlling timers and Futures
test('debounce triggers after 300ms', () {
  fakeAsync((async) {
    final debouncer = Debouncer(delay: const Duration(milliseconds: 300));
    var callCount = 0;
    debouncer.run(() => callCount++);
    expect(callCount, 0);
    async.elapse(const Duration(milliseconds: 200));
    expect(callCount, 0);
    async.elapse(const Duration(milliseconds: 200));
    expect(callCount, 1);
  });
});
```

## Golden Tests

```dart
testWidgets('UserCard golden test', (tester) async {
  await tester.pumpWidget(
    MaterialApp(home: UserCard(user: testUser)),
  );

  await expectLater(
    find.byType(UserCard),
    matchesGoldenFile('goldens/user_card.png'),
  );
});
```

Run `flutter test --update-goldens` when intentional visual changes are made.

## Test Naming

Use descriptive, behavior-focused names:

```dart
test('returns null when user does not exist', () { ... });
test('throws NotFoundException when id is empty string', () { ... });
testWidgets('disables submit button while form is invalid', (tester) async { ... });
```

## Test Organization

```
test/
├── unit/
│   ├── domain/
│   │   └── usecases/
│   └── data/
│       └── repositories/
├── widget/
│   └── presentation/
│       └── pages/
└── golden/
    └── widgets/

integration_test/
└── flows/
    ├── login_flow_test.dart
    └── checkout_flow_test.dart
```

## Coverage

- Target 80%+ line coverage for business logic (domain + state managers)
- All state transitions must have tests: loading → success, loading → error, retry
- Run `flutter test --coverage` and inspect `lcov.info` with a coverage reporter
- Coverage failures should block CI when below threshold

### fsharp/coding-style

# F# Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with F#-specific content.

## Standards

- Follow standard F# conventions and leverage the type system for correctness
- Prefer immutability by default; use `mutable` only when justified by performance
- Keep modules focused and cohesive

## Types and Models

- Prefer discriminated unions for domain modeling over class hierarchies
- Use records for data with named fields
- Use single-case unions for type-safe wrappers around primitives
- Avoid classes unless interop or mutable state requires them

```fsharp
type EmailAddress = EmailAddress of string

type OrderStatus =
    | Pending
    | Confirmed of confirmedAt: DateTimeOffset
    | Shipped of trackingNumber: string
    | Cancelled of reason: string

type Order =
    { Id: Guid
      CustomerId: string
      Status: OrderStatus
      Items: OrderItem list }
```

## Immutability

- Records are immutable by default; use `with` expressions for updates
- Prefer `list`, `map`, `set` over mutable collections
- Avoid `ref` cells and mutable fields in domain logic

```fsharp
let rename (profile: UserProfile) newName =
    { profile with Name = newName }
```

## Function Style

- Prefer small, composable functions over large methods
- Use the pipe operator `|>` to build readable data pipelines
- Prefer pattern matching over if/else chains
- Use `Option` instead of null; use `Result` for operations that can fail

```fsharp
let processOrder order =
    order
    |> validateItems
    |> Result.bind calculateTotal
    |> Result.map applyDiscount
    |> Result.mapError OrderError
```

## Async and Error Handling

- Use `task { }` for interop with .NET async APIs
- Use `async { }` for F#-native async workflows
- Propagate `CancellationToken` through public async APIs
- Prefer `Result` and railway-oriented programming over exceptions for expected failures

```fsharp
let loadOrderAsync (orderId: Guid) (ct: CancellationToken) =
    task {
        let! order = repository.FindAsync(orderId, ct)
        return
            order
            |> Option.defaultWith (fun () ->
                failwith $"Order {orderId} was not found.")
    }
```

## Formatting

- Use `fantomas` for automatic formatting
- Prefer significant whitespace; avoid unnecessary parentheses
- Remove unused `open` declarations

### Open Declaration Order

Group `open` statements into four sections separated by a blank line, each section sorted lexically within itself:

1. `System.*`
2. `Microsoft.*`
3. Third-party namespaces
4. First-party / project namespaces

```fsharp
open System
open System.Collections.Generic
open System.Threading.Tasks

open Microsoft.AspNetCore.Http
open Microsoft.Extensions.Logging

open FsCheck.Xunit
open Swensen.Unquote

open MyApp.Domain
open MyApp.Infrastructure
```

### fsharp/hooks

# F# Hooks

> This file extends [common/hooks.md](../common/hooks.md) with F#-specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **fantomas**: Auto-format edited F# files
- **dotnet build**: Verify the solution or project still compiles after edits
- **dotnet test --no-build**: Re-run the nearest relevant test project after behavior changes

## Stop Hooks

- Run a final `dotnet build` before ending a session with broad F# changes
- Warn on modified `appsettings*.json` files so secrets do not get committed

### fsharp/patterns

# F# Patterns

> This file extends [common/patterns.md](../common/patterns.md) with F#-specific content.

## Result Type for Error Handling

Use `Result<'T, 'TError>` with railway-oriented programming instead of exceptions for expected failures.

```fsharp
type OrderError =
    | InvalidCustomer of string
    | EmptyItems
    | ItemOutOfStock of sku: string

let validateOrder (request: CreateOrderRequest) : Result<ValidatedOrder, OrderError> =
    if String.IsNullOrWhiteSpace request.CustomerId then
        Error(InvalidCustomer "CustomerId is required")
    elif request.Items |> List.isEmpty then
        Error EmptyItems
    else
        Ok { CustomerId = request.CustomerId; Items = request.Items }
```

## Option for Missing Values

Prefer `Option<'T>` over null. Use `Option.map`, `Option.bind`, and `Option.defaultValue` to transform.

```fsharp
let findUser (id: Guid) : User option =
    users |> Map.tryFind id

let getUserEmail userId =
    findUser userId
    |> Option.map (fun u -> u.Email)
    |> Option.defaultValue "unknown@example.com"
```

## Discriminated Unions for Domain Modeling

Model business states explicitly. The compiler enforces exhaustive handling.

```fsharp
type PaymentState =
    | AwaitingPayment of amount: decimal
    | Paid of paidAt: DateTimeOffset * transactionId: string
    | Refunded of refundedAt: DateTimeOffset * reason: string
    | Failed of error: string

let describePayment = function
    | AwaitingPayment amount -> $"Awaiting payment of {amount:C}"
    | Paid (at, txn) -> $"Paid at {at} (txn: {txn})"
    | Refunded (at, reason) -> $"Refunded at {at}: {reason}"
    | Failed error -> $"Payment failed: {error}"
```

## Computation Expressions

Use computation expressions to simplify sequential operations that may fail.

```fsharp
let placeOrder request =
    result {
        let! validated = validateOrder request
        let! inventory = checkInventory validated.Items
        let! order = createOrder validated inventory
        return order
    }
```

## Module Organization

- Group related functions in modules rather than classes
- Use `[<RequireQualifiedAccess>]` to prevent name collisions
- Keep modules small and focused on a single responsibility

```fsharp
[<RequireQualifiedAccess>]
module Order =
    let create customerId items = { Id = Guid.NewGuid(); CustomerId = customerId; Items = items; Status = Pending }
    let confirm order = { order with Status = Confirmed(DateTimeOffset.UtcNow) }
    let cancel reason order = { order with Status = Cancelled reason }
```

## Dependency Injection

- Define dependencies as function parameters or record-of-functions
- Use interfaces sparingly, primarily at the boundary with .NET libraries
- Prefer partial application for injecting dependencies into pipelines

```fsharp
type OrderDeps =
    { FindOrder: Guid -> Task<Order option>
      SaveOrder: Order -> Task<unit>
      SendNotification: Order -> Task<unit> }

let processOrder (deps: OrderDeps) orderId =
    task {
        match! deps.FindOrder orderId with
        | None -> return Error "Order not found"
        | Some order ->
            let confirmed = Order.confirm order
            do! deps.SaveOrder confirmed
            do! deps.SendNotification confirmed
            return Ok confirmed
    }
```

### fsharp/security

# F# Security

> This file extends [common/security.md](../common/security.md) with F#-specific content.

## Secret Management

- Never hardcode API keys, tokens, or connection strings in source code
- Use environment variables, user secrets for local development, and a secret manager in production
- Keep `appsettings.*.json` free of real credentials

```fsharp
// BAD
let apiKey = "sk-live-123"

// GOOD
let apiKey =
    configuration["OpenAI:ApiKey"]
    |> Option.ofObj
    |> Option.defaultWith (fun () -> failwith "OpenAI:ApiKey is not configured.")
```

## SQL Injection Prevention

- Always use parameterized queries with ADO.NET, Dapper, or EF Core
- Never concatenate user input into SQL strings
- Validate sort fields and filter operators before using dynamic query composition

```fsharp
let findByCustomer (connection: IDbConnection) customerId =
    task {
        let sql = "SELECT * FROM Orders WHERE CustomerId = @customerId"
        return! connection.QueryAsync<Order>(sql, {| customerId = customerId |})
    }
```

## Input Validation

- Validate inputs at the application boundary using types
- Use single-case discriminated unions for validated values
- Reject invalid input before it enters domain logic

```fsharp
type ValidatedEmail = private ValidatedEmail of string

module ValidatedEmail =
    let create (input: string) =
        if System.Text.RegularExpressions.Regex.IsMatch(input, @"^[^@]+@[^@]+\.[^@]+$") then
            Ok(ValidatedEmail input)
        else
            Error "Invalid email address"

    let value (ValidatedEmail v) = v
```

## Authentication and Authorization

- Prefer framework auth handlers instead of custom token parsing
- Enforce authorization policies at endpoint or handler boundaries
- Never log raw tokens, passwords, or PII

## Error Handling

- Return safe client-facing messages
- Log detailed exceptions with structured context server-side
- Do not expose stack traces, SQL text, or filesystem paths in API responses

## References

See skill: `security-review` for broader application security review checklists.

### fsharp/testing

# F# Testing

> This file extends [common/testing.md](../common/testing.md) with F#-specific content.

## Test Framework

- Prefer **xUnit** with **FsUnit.xUnit** for F#-friendly assertions
- Use **Unquote** for quotation-based assertions with clear failure messages
- Use **FsCheck.xUnit** for property-based testing
- Use **NSubstitute** or function stubs for mocking dependencies
- Use **Testcontainers** when integration tests need real infrastructure

## Test Organization

- Mirror `src/` structure under `tests/`
- Separate unit, integration, and end-to-end coverage clearly
- Name tests by behavior, not implementation details

```fsharp
open Xunit
open Swensen.Unquote

[<Fact>]
let ``PlaceOrder returns success when request is valid`` () =
    let request = { CustomerId = "cust-123"; Items = [ validItem ] }
    let result = OrderService.placeOrder request
    test <@ Result.isOk result @>

[<Fact>]
let ``PlaceOrder returns error when items are empty`` () =
    let request = { CustomerId = "cust-123"; Items = [] }
    let result = OrderService.placeOrder request
    test <@ Result.isError result @>
```

## Property-Based Testing with FsCheck

```fsharp
open FsCheck.Xunit

[<Property>]
let ``order total is never negative`` (items: OrderItem list) =
    let total = Order.calculateTotal items
    total >= 0m
```

## ASP.NET Core Integration Tests

- Use `WebApplicationFactory<TEntryPoint>` for API integration coverage
- Test auth, validation, and serialization through HTTP, not by bypassing middleware

## Coverage

- Target 80%+ line coverage
- Focus coverage on domain logic, validation, auth, and failure paths
- Run `dotnet test` in CI with coverage collection enabled where available

### golang/coding-style

# Go Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with Go specific content.

## Formatting

- **gofmt** and **goimports** are mandatory — no style debates

## Design Principles

- Accept interfaces, return structs
- Keep interfaces small (1-3 methods)

## Error Handling

Always wrap errors with context:

```go
if err != nil {
    return fmt.Errorf("failed to create user: %w", err)
}
```

## Reference

See skill: `golang-patterns` for comprehensive Go idioms and patterns.

### golang/hooks

# Go Hooks

> This file extends [common/hooks.md](../common/hooks.md) with Go specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **gofmt/goimports**: Auto-format `.go` files after edit
- **go vet**: Run static analysis after editing `.go` files
- **staticcheck**: Run extended static checks on modified packages

### golang/patterns

# Go Patterns

> This file extends [common/patterns.md](../common/patterns.md) with Go specific content.

## Functional Options

```go
type Option func(*Server)

func WithPort(port int) Option {
    return func(s *Server) { s.port = port }
}

func NewServer(opts ...Option) *Server {
    s := &Server{port: 8080}
    for _, opt := range opts {
        opt(s)
    }
    return s
}
```

## Small Interfaces

Define interfaces where they are used, not where they are implemented.

## Dependency Injection

Use constructor functions to inject dependencies:

```go
func NewUserService(repo UserRepository, logger Logger) *UserService {
    return &UserService{repo: repo, logger: logger}
}
```

## Reference

See skill: `golang-patterns` for comprehensive Go patterns including concurrency, error handling, and package organization.

### golang/security

# Go Security

> This file extends [common/security.md](../common/security.md) with Go specific content.

## Secret Management

```go
apiKey := os.Getenv("OPENAI_API_KEY")
if apiKey == "" {
    log.Fatal("OPENAI_API_KEY not configured")
}
```

## Security Scanning

- Use **gosec** for static security analysis:
  ```bash
  gosec ./...
  ```

## Context & Timeouts

Always use `context.Context` for timeout control:

```go
ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
defer cancel()
```

### golang/testing

# Go Testing

> This file extends [common/testing.md](../common/testing.md) with Go specific content.

## Framework

Use the standard `go test` with **table-driven tests**.

## Race Detection

Always run with the `-race` flag:

```bash
go test -race ./...
```

## Coverage

```bash
go test -cover ./...
```

## Reference

See skill: `golang-testing` for detailed Go testing patterns and helpers.

### java/coding-style

# Java Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with Java-specific content.

## Formatting

- **google-java-format** or **Checkstyle** (Google or Sun style) for enforcement
- One public top-level type per file
- Consistent indent: 2 or 4 spaces (match project standard)
- Member order: constants, fields, constructors, public methods, protected, private

## Immutability

- Prefer `record` for value types (Java 16+)
- Mark fields `final` by default — use mutable state only when required
- Return defensive copies from public APIs: `List.copyOf()`, `Map.copyOf()`, `Set.copyOf()`
- Copy-on-write: return new instances rather than mutating existing ones

```java
// GOOD — immutable value type
public record OrderSummary(Long id, String customerName, BigDecimal total) {}

// GOOD — final fields, no setters
public class Order {
    private final Long id;
    private final List<LineItem> items;

    public List<LineItem> getItems() {
        return List.copyOf(items);
    }
}
```

## Naming

Follow standard Java conventions:
- `PascalCase` for classes, interfaces, records, enums
- `camelCase` for methods, fields, parameters, local variables
- `SCREAMING_SNAKE_CASE` for `static final` constants
- Packages: all lowercase, reverse domain (`com.example.app.service`)

## Modern Java Features

Use modern language features where they improve clarity:
- **Records** for DTOs and value types (Java 16+)
- **Sealed classes** for closed type hierarchies (Java 17+)
- **Pattern matching** with `instanceof` — no explicit cast (Java 16+)
- **Text blocks** for multi-line strings — SQL, JSON templates (Java 15+)
- **Switch expressions** with arrow syntax (Java 14+)
- **Pattern matching in switch** — exhaustive sealed type handling (Java 21+)

```java
// Pattern matching instanceof
if (shape instanceof Circle c) {
    return Math.PI * c.radius() * c.radius();
}

// Sealed type hierarchy
public sealed interface PaymentMethod permits CreditCard, BankTransfer, Wallet {}

// Switch expression
String label = switch (status) {
    case ACTIVE -> "Active";
    case SUSPENDED -> "Suspended";
    case CLOSED -> "Closed";
};
```

## Optional Usage

- Return `Optional<T>` from finder methods that may have no result
- Use `map()`, `flatMap()`, `orElseThrow()` — never call `get()` without `isPresent()`
- Never use `Optional` as a field type or method parameter

```java
// GOOD
return repository.findById(id)
    .map(ResponseDto::from)
    .orElseThrow(() -> new OrderNotFoundException(id));

// BAD — Optional as parameter
public void process(Optional<String> name) {}
```

## Error Handling

- Prefer unchecked exceptions for domain errors
- Create domain-specific exceptions extending `RuntimeException`
- Avoid broad `catch (Exception e)` unless at top-level handlers
- Include context in exception messages

```java
public class OrderNotFoundException extends RuntimeException {
    public OrderNotFoundException(Long id) {
        super("Order not found: id=" + id);
    }
}
```

## Streams

- Use streams for transformations; keep pipelines short (3-4 operations max)
- Prefer method references when readable: `.map(Order::getTotal)`
- Avoid side effects in stream operations
- For complex logic, prefer a loop over a convoluted stream pipeline

## References

See skill: `java-coding-standards` for full coding standards with examples.
See skill: `jpa-patterns` for JPA/Hibernate entity design patterns.

### java/hooks

# Java Hooks

> This file extends [common/hooks.md](../common/hooks.md) with Java-specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **google-java-format**: Auto-format `.java` files after edit
- **checkstyle**: Run style checks after editing Java files
- **./mvnw compile** or **./gradlew compileJava**: Verify compilation after changes

### java/patterns

# Java Patterns

> This file extends [common/patterns.md](../common/patterns.md) with Java-specific content.

## Repository Pattern

Encapsulate data access behind an interface:

```java
public interface OrderRepository {
    Optional<Order> findById(Long id);
    List<Order> findAll();
    Order save(Order order);
    void deleteById(Long id);
}
```

Concrete implementations handle storage details (JPA, JDBC, in-memory for tests).

## Service Layer

Business logic in service classes; keep controllers and repositories thin:

```java
public class OrderService {
    private final OrderRepository orderRepository;
    private final PaymentGateway paymentGateway;

    public OrderService(OrderRepository orderRepository, PaymentGateway paymentGateway) {
        this.orderRepository = orderRepository;
        this.paymentGateway = paymentGateway;
    }

    public OrderSummary placeOrder(CreateOrderRequest request) {
        var order = Order.from(request);
        paymentGateway.charge(order.total());
        var saved = orderRepository.save(order);
        return OrderSummary.from(saved);
    }
}
```

## Constructor Injection

Always use constructor injection — never field injection:

```java
// GOOD — constructor injection (testable, immutable)
public class NotificationService {
    private final EmailSender emailSender;

    public NotificationService(EmailSender emailSender) {
        this.emailSender = emailSender;
    }
}

// BAD — field injection (untestable without reflection, requires framework magic)
public class NotificationService {
    @Inject // or @Autowired
    private EmailSender emailSender;
}
```

## DTO Mapping

Use records for DTOs. Map at service/controller boundaries:

```java
public record OrderResponse(Long id, String customer, BigDecimal total) {
    public static OrderResponse from(Order order) {
        return new OrderResponse(order.getId(), order.getCustomerName(), order.getTotal());
    }
}
```

## Builder Pattern

Use for objects with many optional parameters:

```java
public class SearchCriteria {
    private final String query;
    private final int page;
    private final int size;
    private final String sortBy;

    private SearchCriteria(Builder builder) {
        this.query = builder.query;
        this.page = builder.page;
        this.size = builder.size;
        this.sortBy = builder.sortBy;
    }

    public static class Builder {
        private String query = "";
        private int page = 0;
        private int size = 20;
        private String sortBy = "id";

        public Builder query(String query) { this.query = query; return this; }
        public Builder page(int page) { this.page = page; return this; }
        public Builder size(int size) { this.size = size; return this; }
        public Builder sortBy(String sortBy) { this.sortBy = sortBy; return this; }
        public SearchCriteria build() { return new SearchCriteria(this); }
    }
}
```

## Sealed Types for Domain Models

```java
public sealed interface PaymentResult permits PaymentSuccess, PaymentFailure {
    record PaymentSuccess(String transactionId, BigDecimal amount) implements PaymentResult {}
    record PaymentFailure(String errorCode, String message) implements PaymentResult {}
}

// Exhaustive handling (Java 21+)
String message = switch (result) {
    case PaymentSuccess s -> "Paid: " + s.transactionId();
    case PaymentFailure f -> "Failed: " + f.errorCode();
};
```

## API Response Envelope

Consistent API responses:

```java
public record ApiResponse<T>(boolean success, T data, String error) {
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null);
    }
    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>(false, null, message);
    }
}
```

## References

See skill: `springboot-patterns` for Spring Boot architecture patterns.
See skill: `quarkus-patterns` for Quarkus architecture patterns with REST, Panache, and messaging.
See skill: `jpa-patterns` for entity design and query optimization.

### java/security

# Java Security

> This file extends [common/security.md](../common/security.md) with Java-specific content.

## Secrets Management

- Never hardcode API keys, tokens, or credentials in source code
- Use environment variables: `System.getenv("API_KEY")`
- Use a secret manager (Vault, AWS Secrets Manager) for production secrets
- Keep local config files with secrets in `.gitignore`

```java
// BAD
private static final String API_KEY = "sk-abc123...";

// GOOD — environment variable
String apiKey = System.getenv("PAYMENT_API_KEY");
Objects.requireNonNull(apiKey, "PAYMENT_API_KEY must be set");
```

## SQL Injection Prevention

- Always use parameterized queries — never concatenate user input into SQL
- Use `PreparedStatement` or your framework's parameterized query API
- Validate and sanitize any input used in native queries

```java
// BAD — SQL injection via string concatenation
Statement stmt = conn.createStatement();
String sql = "SELECT * FROM orders WHERE name = '" + name + "'";
stmt.executeQuery(sql);

// GOOD — PreparedStatement with parameterized query
PreparedStatement ps = conn.prepareStatement("SELECT * FROM orders WHERE name = ?");
ps.setString(1, name);

// GOOD — JDBC template
jdbcTemplate.query("SELECT * FROM orders WHERE name = ?", mapper, name);
```

## Input Validation

- Validate all user input at system boundaries before processing
- Use Bean Validation (`@NotNull`, `@NotBlank`, `@Size`) on DTOs when using a validation framework
- Sanitize file paths and user-provided strings before use
- Reject input that fails validation with clear error messages

```java
// Validate manually in plain Java
public Order createOrder(String customerName, BigDecimal amount) {
    if (customerName == null || customerName.isBlank()) {
        throw new IllegalArgumentException("Customer name is required");
    }
    if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
        throw new IllegalArgumentException("Amount must be positive");
    }
    return new Order(customerName, amount);
}
```

## Authentication and Authorization

- Never implement custom auth crypto — use established libraries
- Store passwords with bcrypt or Argon2, never MD5/SHA1
- Enforce authorization checks at service boundaries
- Clear sensitive data from logs — never log passwords, tokens, or PII

## Dependency Security

- Run `mvn dependency:tree` or `./gradlew dependencies` to audit transitive dependencies
- Use OWASP Dependency-Check or Snyk to scan for known CVEs
- Keep dependencies updated — set up Dependabot or Renovate

## Error Messages

- Never expose stack traces, internal paths, or SQL errors in API responses
- Map exceptions to safe, generic client messages at handler boundaries
- Log detailed errors server-side; return generic messages to clients

```java
// Log the detail, return a generic message
try {
    return orderService.findById(id);
} catch (OrderNotFoundException ex) {
    log.warn("Order not found: id={}", id);
    return ApiResponse.error("Resource not found");  // generic, no internals
} catch (Exception ex) {
    log.error("Unexpected error processing order id={}", id, ex);
    return ApiResponse.error("Internal server error");  // never expose ex.getMessage()
}
```

## References

See skill: `springboot-security` for Spring Security authentication and authorization patterns.
See skill: `quarkus-security` for Quarkus security with JWT/OIDC, RBAC, and CDI.
See skill: `security-review` for general security checklists.

### java/testing

# Java Testing

> This file extends [common/testing.md](../common/testing.md) with Java-specific content.

## Test Framework

- **JUnit 5** (`@Test`, `@ParameterizedTest`, `@Nested`, `@DisplayName`)
- **AssertJ** for fluent assertions (`assertThat(result).isEqualTo(expected)`)
- **Mockito** for mocking dependencies
- **Testcontainers** for integration tests requiring databases or services

## Test Organization

```
src/test/java/com/example/app/
  service/           # Unit tests for service layer
  controller/        # Web layer / API tests
  repository/        # Data access tests
  integration/       # Cross-layer integration tests
```

Mirror the `src/main/java` package structure in `src/test/java`.

## Unit Test Pattern

```java
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    private OrderService orderService;

    @BeforeEach
    void setUp() {
        orderService = new OrderService(orderRepository);
    }

    @Test
    @DisplayName("findById returns order when exists")
    void findById_existingOrder_returnsOrder() {
        var order = new Order(1L, "Alice", BigDecimal.TEN);
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));

        var result = orderService.findById(1L);

        assertThat(result.customerName()).isEqualTo("Alice");
        verify(orderRepository).findById(1L);
    }

    @Test
    @DisplayName("findById throws when order not found")
    void findById_missingOrder_throws() {
        when(orderRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.findById(99L))
            .isInstanceOf(OrderNotFoundException.class)
            .hasMessageContaining("99");
    }
}
```

## Parameterized Tests

```java
@ParameterizedTest
@CsvSource({
    "100.00, 10, 90.00",
    "50.00, 0, 50.00",
    "200.00, 25, 150.00"
})
@DisplayName("discount applied correctly")
void applyDiscount(BigDecimal price, int pct, BigDecimal expected) {
    assertThat(PricingUtils.discount(price, pct)).isEqualByComparingTo(expected);
}
```

## Integration Tests

Use Testcontainers for real database integration:

```java
@Testcontainers
class OrderRepositoryIT {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    private OrderRepository repository;

    @BeforeEach
    void setUp() {
        var dataSource = new PGSimpleDataSource();
        dataSource.setUrl(postgres.getJdbcUrl());
        dataSource.setUser(postgres.getUsername());
        dataSource.setPassword(postgres.getPassword());
        repository = new JdbcOrderRepository(dataSource);
    }

    @Test
    void save_and_findById() {
        var saved = repository.save(new Order(null, "Bob", BigDecimal.ONE));
        var found = repository.findById(saved.getId());
        assertThat(found).isPresent();
    }
}
```

For Spring Boot integration tests, see skill: `springboot-tdd`.
For Quarkus integration tests, see skill: `quarkus-tdd`.

## Test Naming

Use descriptive names with `@DisplayName`:
- `methodName_scenario_expectedBehavior()` for method names
- `@DisplayName("human-readable description")` for reports

## Coverage

- Target 80%+ line coverage
- Use JaCoCo for coverage reporting
- Focus on service and domain logic — skip trivial getters/config classes

## References

See skill: `springboot-tdd` for Spring Boot TDD patterns with MockMvc and Testcontainers.
See skill: `quarkus-tdd` for Quarkus TDD patterns with REST Assured and Dev Services.
See skill: `java-coding-standards` for testing expectations.

### kotlin/coding-style

# Kotlin Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with Kotlin-specific content.

## Formatting

- **ktlint** or **Detekt** for style enforcement
- Official Kotlin code style (`kotlin.code.style=official` in `gradle.properties`)

## Immutability

- Prefer `val` over `var` — default to `val` and only use `var` when mutation is required
- Use `data class` for value types; use immutable collections (`List`, `Map`, `Set`) in public APIs
- Copy-on-write for state updates: `state.copy(field = newValue)`

## Naming

Follow Kotlin conventions:
- `camelCase` for functions and properties
- `PascalCase` for classes, interfaces, objects, and type aliases
- `SCREAMING_SNAKE_CASE` for constants (`const val` or `@JvmStatic`)
- Prefix interfaces with behavior, not `I`: `Clickable` not `IClickable`

## Null Safety

- Never use `!!` — prefer `?.`, `?:`, `requireNotNull()`, or `checkNotNull()`
- Use `?.let {}` for scoped null-safe operations
- Return nullable types from functions that can legitimately have no result

```kotlin
// BAD
val name = user!!.name

// GOOD
val name = user?.name ?: "Unknown"
val name = requireNotNull(user) { "User must be set before accessing name" }.name
```

## Sealed Types

Use sealed classes/interfaces to model closed state hierarchies:

```kotlin
sealed interface UiState<out T> {
    data object Loading : UiState<Nothing>
    data class Success<T>(val data: T) : UiState<T>
    data class Error(val message: String) : UiState<Nothing>
}
```

Always use exhaustive `when` with sealed types — no `else` branch.

## Extension Functions

Use extension functions for utility operations, but keep them discoverable:
- Place in a file named after the receiver type (`StringExt.kt`, `FlowExt.kt`)
- Keep scope limited — don't add extensions to `Any` or overly generic types

## Scope Functions

Use the right scope function:
- `let` — null check + transform: `user?.let { greet(it) }`
- `run` — compute a result using receiver: `service.run { fetch(config) }`
- `apply` — configure an object: `builder.apply { timeout = 30 }`
- `also` — side effects: `result.also { log(it) }`
- Avoid deep nesting of scope functions (max 2 levels)

## Error Handling

- Use `Result<T>` or custom sealed types
- Use `runCatching {}` for wrapping throwable code
- Never catch `CancellationException` — always rethrow it
- Avoid `try-catch` for control flow

```kotlin
// BAD — using exceptions for control flow
val user = try { repository.getUser(id) } catch (e: NotFoundException) { null }

// GOOD — nullable return
val user: User? = repository.findUser(id)
```

### kotlin/hooks

# Kotlin Hooks

> This file extends [common/hooks.md](../common/hooks.md) with Kotlin-specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **ktfmt/ktlint**: Auto-format `.kt` and `.kts` files after edit
- **detekt**: Run static analysis after editing Kotlin files
- **./gradlew build**: Verify compilation after changes

### kotlin/patterns

# Kotlin Patterns

> This file extends [common/patterns.md](../common/patterns.md) with Kotlin and Android/KMP-specific content.

## Dependency Injection

Prefer constructor injection. Use Koin (KMP) or Hilt (Android-only):

```kotlin
// Koin — declare modules
val dataModule = module {
    single<ItemRepository> { ItemRepositoryImpl(get(), get()) }
    factory { GetItemsUseCase(get()) }
    viewModelOf(::ItemListViewModel)
}

// Hilt — annotations
@HiltViewModel
class ItemListViewModel @Inject constructor(
    private val getItems: GetItemsUseCase
) : ViewModel()
```

## ViewModel Pattern

Single state object, event sink, one-way data flow:

```kotlin
data class ScreenState(
    val items: List<Item> = emptyList(),
    val isLoading: Boolean = false
)

class ScreenViewModel(private val useCase: GetItemsUseCase) : ViewModel() {
    private val _state = MutableStateFlow(ScreenState())
    val state = _state.asStateFlow()

    fun onEvent(event: ScreenEvent) {
        when (event) {
            is ScreenEvent.Load -> load()
            is ScreenEvent.Delete -> delete(event.id)
        }
    }
}
```

## Repository Pattern

- `suspend` functions return `Result<T>` or custom error type
- `Flow` for reactive streams
- Coordinate local + remote data sources

```kotlin
interface ItemRepository {
    suspend fun getById(id: String): Result<Item>
    suspend fun getAll(): Result<List<Item>>
    fun observeAll(): Flow<List<Item>>
}
```

## UseCase Pattern

Single responsibility, `operator fun invoke`:

```kotlin
class GetItemUseCase(private val repository: ItemRepository) {
    suspend operator fun invoke(id: String): Result<Item> {
        return repository.getById(id)
    }
}

class GetItemsUseCase(private val repository: ItemRepository) {
    suspend operator fun invoke(): Result<List<Item>> {
        return repository.getAll()
    }
}
```

## expect/actual (KMP)

Use for platform-specific implementations:

```kotlin
// commonMain
expect fun platformName(): String
expect class SecureStorage {
    fun save(key: String, value: String)
    fun get(key: String): String?
}

// androidMain
actual fun platformName(): String = "Android"
actual class SecureStorage {
    actual fun save(key: String, value: String) { /* EncryptedSharedPreferences */ }
    actual fun get(key: String): String? = null /* ... */
}

// iosMain
actual fun platformName(): String = "iOS"
actual class SecureStorage {
    actual fun save(key: String, value: String) { /* Keychain */ }
    actual fun get(key: String): String? = null /* ... */
}
```

## Coroutine Patterns

- Use `viewModelScope` in ViewModels, `coroutineScope` for structured child work
- Use `stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), initialValue)` for StateFlow from cold Flows
- Use `supervisorScope` when child failures should be independent

## Builder Pattern with DSL

```kotlin
class HttpClientConfig {
    var baseUrl: String = ""
    var timeout: Long = 30_000
    private val interceptors = mutableListOf<Interceptor>()

    fun interceptor(block: () -> Interceptor) {
        interceptors.add(block())
    }
}

fun httpClient(block: HttpClientConfig.() -> Unit): HttpClient {
    val config = HttpClientConfig().apply(block)
    return HttpClient(config)
}

// Usage
val client = httpClient {
    baseUrl = "https://api.example.com"
    timeout = 15_000
    interceptor { AuthInterceptor(tokenProvider) }
}
```

## References

See skill: `kotlin-coroutines-flows` for detailed coroutine patterns.
See skill: `android-clean-architecture` for module and layer patterns.

### kotlin/security

# Kotlin Security

> This file extends [common/security.md](../common/security.md) with Kotlin and Android/KMP-specific content.

## Secrets Management

- Never hardcode API keys, tokens, or credentials in source code
- Use `local.properties` (git-ignored) for local development secrets
- Use `BuildConfig` fields generated from CI secrets for release builds
- Use `EncryptedSharedPreferences` (Android) or Keychain (iOS) for runtime secret storage

```kotlin
// BAD
val apiKey = "sk-abc123..."

// GOOD — from BuildConfig (generated at build time)
val apiKey = BuildConfig.API_KEY

// GOOD — from secure storage at runtime
val token = secureStorage.get("auth_token")
```

## Network Security

- Use HTTPS exclusively — configure `network_security_config.xml` to block cleartext
- Pin certificates for sensitive endpoints using OkHttp `CertificatePinner` or Ktor equivalent
- Set timeouts on all HTTP clients — never leave defaults (which may be infinite)
- Validate and sanitize all server responses before use

```xml
<!-- res/xml/network_security_config.xml -->
<network-security-config>
    <base-config cleartextTrafficPermitted="false" />
</network-security-config>
```

## Input Validation

- Validate all user input before processing or sending to API
- Use parameterized queries for Room/SQLDelight — never concatenate user input into SQL
- Sanitize file paths from user input to prevent path traversal

```kotlin
// BAD — SQL injection
@Query("SELECT * FROM items WHERE name = '$input'")

// GOOD — parameterized
@Query("SELECT * FROM items WHERE name = :input")
fun findByName(input: String): List<ItemEntity>
```

## Data Protection

- Use `EncryptedSharedPreferences` for sensitive key-value data on Android
- Use `@Serializable` with explicit field names — don't leak internal property names
- Clear sensitive data from memory when no longer needed
- Use `@Keep` or ProGuard rules for serialized classes to prevent name mangling

## Authentication

- Store tokens in secure storage, not in plain SharedPreferences
- Implement token refresh with proper 401/403 handling
- Clear all auth state on logout (tokens, cached user data, cookies)
- Use biometric authentication (`BiometricPrompt`) for sensitive operations

## ProGuard / R8

- Keep rules for all serialized models (`@Serializable`, Gson, Moshi)
- Keep rules for reflection-based libraries (Koin, Retrofit)
- Test release builds — obfuscation can break serialization silently

## WebView Security

- Disable JavaScript unless explicitly needed: `settings.javaScriptEnabled = false`
- Validate URLs before loading in WebView
- Never expose `@JavascriptInterface` methods that access sensitive data
- Use `WebViewClient.shouldOverrideUrlLoading()` to control navigation

### kotlin/testing

# Kotlin Testing

> This file extends [common/testing.md](../common/testing.md) with Kotlin and Android/KMP-specific content.

## Test Framework

- **kotlin.test** for multiplatform (KMP) — `@Test`, `assertEquals`, `assertTrue`
- **JUnit 4/5** for Android-specific tests
- **Turbine** for testing Flows and StateFlow
- **kotlinx-coroutines-test** for coroutine testing (`runTest`, `TestDispatcher`)

## ViewModel Testing with Turbine

```kotlin
@Test
fun `loading state emitted then data`() = runTest {
    val repo = FakeItemRepository()
    repo.addItem(testItem)
    val viewModel = ItemListViewModel(GetItemsUseCase(repo))

    viewModel.state.test {
        assertEquals(ItemListState(), awaitItem())     // initial state
        viewModel.onEvent(ItemListEvent.Load)
        assertTrue(awaitItem().isLoading)               // loading
        assertEquals(listOf(testItem), awaitItem().items) // loaded
    }
}
```

## Fakes Over Mocks

Prefer hand-written fakes over mocking frameworks:

```kotlin
class FakeItemRepository : ItemRepository {
    private val items = mutableListOf<Item>()
    var fetchError: Throwable? = null

    override suspend fun getAll(): Result<List<Item>> {
        fetchError?.let { return Result.failure(it) }
        return Result.success(items.toList())
    }

    override fun observeAll(): Flow<List<Item>> = flowOf(items.toList())

    fun addItem(item: Item) { items.add(item) }
}
```

## Coroutine Testing

```kotlin
@Test
fun `parallel operations complete`() = runTest {
    val repo = FakeRepository()
    val result = loadDashboard(repo)
    advanceUntilIdle()
    assertNotNull(result.items)
    assertNotNull(result.stats)
}
```

Use `runTest` — it auto-advances virtual time and provides `TestScope`.

## Ktor MockEngine

```kotlin
val mockEngine = MockEngine { request ->
    when (request.url.encodedPath) {
        "/api/items" -> respond(
            content = Json.encodeToString(testItems),
            headers = headersOf(HttpHeaders.ContentType, ContentType.Application.Json.toString())
        )
        else -> respondError(HttpStatusCode.NotFound)
    }
}

val client = HttpClient(mockEngine) {
    install(ContentNegotiation) { json() }
}
```

## Room/SQLDelight Testing

- Room: Use `Room.inMemoryDatabaseBuilder()` for in-memory testing
- SQLDelight: Use `JdbcSqliteDriver(JdbcSqliteDriver.IN_MEMORY)` for JVM tests

```kotlin
@Test
fun `insert and query items`() = runTest {
    val driver = JdbcSqliteDriver(JdbcSqliteDriver.IN_MEMORY)
    Database.Schema.create(driver)
    val db = Database(driver)

    db.itemQueries.insert("1", "Sample Item", "description")
    val items = db.itemQueries.getAll().executeAsList()
    assertEquals(1, items.size)
}
```

## Test Naming

Use backtick-quoted descriptive names:

```kotlin
@Test
fun `search with empty query returns all items`() = runTest { }

@Test
fun `delete item emits updated list without deleted item`() = runTest { }
```

## Test Organization

```
src/
├── commonTest/kotlin/     # Shared tests (ViewModel, UseCase, Repository)
├── androidUnitTest/kotlin/ # Android unit tests (JUnit)
├── androidInstrumentedTest/kotlin/  # Instrumented tests (Room, UI)
└── iosTest/kotlin/        # iOS-specific tests
```

Minimum test coverage: ViewModel + UseCase for every feature.

### nuxt/coding-style

# Nuxt Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with Nuxt specific content.

## Directory layout

- Default `srcDir` is `app/`. Framework files live at `app/pages/`, `app/layouts/`, `app/middleware/`, `app/plugins/`, `app/app.config.ts`. `nuxt.config.ts` and `server/` stay at project root.
- Some projects override `srcDir` to `src/` for a Feature-Sliced Design layout, remapping `dir.pages` (for example to `src/app/routes`), `dir.layouts`, and the `@`/`~` aliases. Always check `nuxt.config.ts` before assuming a path.

## Auto-imports discipline

- Composables in `app/composables/` and `server/utils/` auto-import. Do NOT manually import Nuxt composables (`useFetch`, `useState`, `navigateTo`) or `defineStore` / `storeToRefs`.
- Do NOT add a standalone `vue-router` dep (Nuxt bundles v5) or hand-mount `createApp` / `createPinia` / `createRouter`. The framework wires these.

## Compiler macros

- `definePageMeta` is a compile-time macro. Static values only, no reactive data and no side-effect calls inside it.
- Augment typed `PageMeta` via `declare module '#app'` rather than casting.

## Config file separation

Three distinct files, do not conflate.

- `nuxt.config.ts` = build-time only (`routeRules`, `modules`, `nitro`, `ssr` flag). Not reactive.
- `runtimeConfig` (inside nuxt.config) = per-env runtime values, env-overridable via `NUXT_*`. Root keys are server-only, `public` keys are client-visible.
- `app/app.config.ts` = public build-fixed reactive settings (theme tokens, feature flags). No env override. NEVER secrets.

## Head and meta

- `app.head` in `nuxt.config.ts` takes static values only.
- Reactive meta goes through `useHead` / `useSeoMeta` in component setup, never via `app.head`.

## Reference

- ECC skills: `nuxt4-patterns`, `vite-patterns`, `frontend-patterns`.
- [Nuxt directory structure](https://nuxt.com/docs/guide/directory-structure/app)
- [Nuxt configuration](https://nuxt.com/docs/api/nuxt-config)

### nuxt/hooks

# Nuxt Hooks

> This file extends [common/hooks.md](../common/hooks.md) with Nuxt specific content.

These are Claude Code harness hooks for Nuxt work. They run via the harness, not Claude.

## Typecheck

- `nuxi typecheck` wraps `vue-tsc`. Requires `vue-tsc` + `typescript` dev deps.
- Run on `.vue` / `.ts` edit or pre-commit. Typecheck is project-wide, so debounce it and wrap it in a timeout (mirror `web/hooks.md`, for example `timeout 60 nuxi typecheck`) so a hung type-check is reaped instead of accumulating across fast edits.

## Lint

- Use the `@nuxt/eslint` module (flat-config, project-aware, generates `.nuxt/eslint.config.mjs`).
- Run `eslint .` or `eslint --fix`. This is the Nuxt-official ESLint integration, prefer it over hand-rolled configs.

## Format

- `prettier --write`, or enable stylistic rules in `@nuxt/eslint` to avoid a Prettier/ESLint conflict.
- Pick one formatting authority. Do not run both Prettier and ESLint stylistic at once.

## Suggested PostToolUse chain

- On Edit to `app/**` and `server/**`: run `eslint --fix` then `timeout 60 nuxi typecheck`.
- Order matters: lint-fix first (mutates the file), the timed typecheck second (verifies the result). Debouncing still applies.

## Reference

- ECC skills: `nuxt4-patterns`, `vite-patterns`.
- [@nuxt/eslint module](https://eslint.nuxt.com/)
- [nuxi typecheck](https://nuxt.com/docs/api/commands/typecheck)

### nuxt/patterns

# Nuxt Patterns

> This file extends [common/patterns.md](../common/patterns.md) with Nuxt specific content.

## Data-fetch selection

Load-bearing. Pick by render timing, not habit.

- `useFetch(url)` = SSR-safe, URL-first initial/first-paint data. The default. Forwards the server result through the payload so there is no hydration double-fetch.
- `useAsyncData(key, fn)` = SSR-safe, custom async logic (SDK / GraphQL / combined calls). The explicit key shares the result across components.
- `$fetch` = client interactions only (form submit, button click, POST/PUT/DELETE). NOT SSR-safe, double-fetches if used for first paint.
- Rule: `useFetch` / `useAsyncData` for anything rendered on first paint, `$fetch` only for event-driven mutations.

## Shared state

- `useState('key', () => init)` for SSR-safe shared state. Values must be JSON-serializable.
- NEVER `export const x = ref()` at module scope. One shared instance leaks across concurrent SSR requests and causes a memory leak.
- With `@pinia/nuxt`: Pinia for domain state, `useState` for small cross-component primitives.
- Async server-side init goes in `callOnce(async () => {...})`, not as a side effect inside `useAsyncData`.

## Nitro server routes

- `server/api/*.{get,post}.ts` auto-register by path + method. Handler is `defineEventHandler((event) => ...)`.
- Errors via `throw createError({ status, statusText })`. Prefer the Web-API `status` / `statusText` over deprecated `statusCode` / `statusMessage`.
- `server/middleware/` must NOT return a response. Only mutate `event.context` or set headers.

## Route middleware

- `app/middleware/*.ts` with `defineNuxtRouteMiddleware((to, from) => ...)`.
- Use the `to` / `from` args. Do NOT call `useRoute()` inside middleware.
- `.global` suffix runs on every route. Return `navigateTo()` to redirect, `abortNavigation()` to stop.

## Hydration-safe rendering

- Route off `status` (`idle | pending | success | error`) for lazy fetches.
- `useAsyncData` payload uses `devalue` (Date/Map/Set/refs survive). A `server/api` response is `JSON.stringify`-only, so define `toJSON()` for non-JSON types.
- Shrink payload with `pick` / `transform`. This reduces serialized size, it does not skip the fetch.

## Reference

- ECC skills: `nuxt4-patterns`, `vite-patterns`, `frontend-patterns`.
- [Nuxt data fetching](https://nuxt.com/docs/getting-started/data-fetching)
- [Nuxt state management](https://nuxt.com/docs/getting-started/state-management)
- [Nuxt server engine (Nitro)](https://nuxt.com/docs/guide/directory-structure/server)

### nuxt/security

# Nuxt Security

> This file extends [common/security.md](../common/security.md) with Nuxt specific content.

## runtimeConfig public vs private

- Root `runtimeConfig` keys are server-only. `runtimeConfig.public` serializes into EVERY page payload (client-visible).
- Secrets go at root only. Never put secrets in `app.config.ts` or `runtimeConfig.public`, both ship to the client bundle.
- Official warning: "Be careful not to expose runtime config keys to the client-side by either rendering them or passing them to `useState`."

## Server-route input validation

- Use h3 validating readers. Do NOT trust raw `readBody` / `getQuery` / `getRouterParam`.
  - `readValidatedBody(event, schema)` validates the body.
  - `getValidatedQuery(event, schema)` validates the query.
  - `getValidatedRouterParams(event, schema)` validates route params.
- All accept a validation function or a Zod schema and throw on failure.

## SSR payload leakage

- Anything in `useState`, `useFetch` / `useAsyncData` results, or `runtimeConfig.public` is serialized into the client payload. Never write a secret into those.
- Use `useServerSeoMeta` for server-only meta with no client cost.

## Cookie and auth passthrough on SSR

- Nuxt does NOT auto-attach the incoming user's cookies to outbound server-side `$fetch`.
- Forward explicitly with `useRequestFetch()` (cleanest, pre-bound to request headers) or `useRequestHeaders(['cookie'])`.
- Relay a backend `Set-Cookie` to the browser via `$fetch.raw` + `appendResponseHeader(event, 'set-cookie', ...)`.
- socket.io is client-only (`.client.ts` plugin), never SSR.

## SSRF on server $fetch

- Server routes run with full network egress. Never pass user-controlled input directly into a server-side `$fetch` URL or host.
- Validate the param first (h3 utilities above), allowlist the target, pin to `runtimeConfig.public.apiBase`, reject user-supplied absolute URLs.
- Auto-trigger `/security-review` only for routes that make external network requests (server `$fetch`), handle auth tokens or credentials, or perform sensitive mutations or authorization checks. Examples: SSRF-prone proxy endpoints, token exchange or password reset, admin actions. Skip benign read-only routes that only accept validated query params.

## Reference

- ECC skills: `security-review`, `nuxt4-patterns`.
- [Nuxt runtime config](https://nuxt.com/docs/guide/going-further/runtime-config)
- [h3 request utils](https://v1.h3.dev/utils/request)

### nuxt/testing

# Nuxt Testing

> This file extends [common/testing.md](../common/testing.md) with Nuxt specific content.

Package: `@nuxt/test-utils`. Vitest-first for unit and component tests, with built-in Playwright browser E2E support. nuxt-vitest and vitest-environment-nuxt are superseded and folded into it.

## Setup

- Install dev deps: `@nuxt/test-utils vitest @vue/test-utils happy-dom playwright-core`.
- Config: `defineVitestConfig({ test: { environment: 'nuxt' } })` from `@nuxt/test-utils/config`. Use `defineVitestProject` for multi-project (separate unit / nuxt / e2e environments).
- Add `@nuxt/test-utils/module` to `nuxt.config`. Per-file opt-in via `// @vitest-environment nuxt`.

## Runtime helpers

Import from `@nuxt/test-utils/runtime`.

- `mountSuspended(component, opts)` mounts in the Nuxt env with async setup + plugin injection (accepts `@vue/test-utils` mount options + `route`).
- `renderSuspended(component, opts)` is the Testing Library variant (needs `@testing-library/vue`).
- `mockNuxtImport(name, factory)` mocks auto-imports (e.g. `useState`). Once per import per file, use `vi.hoisted()`.
- `mockComponent(name, factory)` mocks by PascalCase name or path.
- `registerEndpoint(path, handler|opts)` mocks a Nitro endpoint to test server routes or stub the backend. Supports method + `once`.

## E2E helpers

Import from `@nuxt/test-utils/e2e`.

- `await setup({ rootDir, server, browser, ... })` inside the describe block (manages beforeAll/afterAll).
- Then `$fetch(url)` (rendered HTML), `fetch(url)` (response object), `url(path)` (full URL with port), `createPage(url)` (Playwright).
- Playwright integration: import `expect` / `test` from `@nuxt/test-utils/playwright`.

## What to test how

- Composables: mock auto-imports with `mockNuxtImport`, mount a host component via `mountSuspended` to exercise `useState` / `useFetch` in the Nuxt runtime.
- Server routes: `registerEndpoint` to stub, or e2e `$fetch` / `fetch` against the real Nitro server.

## Reference

- ECC skills: `nuxt4-patterns`, `e2e-testing`, `vite-patterns`.
- [Nuxt testing docs](https://nuxt.com/docs/getting-started/testing)
- [@nuxt/test-utils npm](https://www.npmjs.com/package/@nuxt/test-utils)

### perl/coding-style

# Perl Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with Perl-specific content.

## Standards

- Always `use v5.36` (enables `strict`, `warnings`, `say`, subroutine signatures)
- Use subroutine signatures — never unpack `@_` manually
- Prefer `say` over `print` with explicit newlines

## Immutability

- Use **Moo** with `is => 'ro'` and `Types::Standard` for all attributes
- Never use blessed hashrefs directly — always use Moo/Moose accessors
- **OO override note**: Moo `has` attributes with `builder` or `default` are acceptable for computed read-only values

## Formatting

Use **perltidy** with these settings:

```
-i=4    # 4-space indent
-l=100  # 100 char line length
-ce     # cuddled else
-bar    # opening brace always right
```

## Linting

Use **perlcritic** at severity 3 with themes: `core`, `pbp`, `security`.

```bash
perlcritic --severity 3 --theme 'core || pbp || security' lib/
```

## Reference

See skill: `perl-patterns` for comprehensive modern Perl idioms and best practices.

### perl/hooks

# Perl Hooks

> This file extends [common/hooks.md](../common/hooks.md) with Perl-specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **perltidy**: Auto-format `.pl` and `.pm` files after edit
- **perlcritic**: Run lint check after editing `.pm` files

## Warnings

- Warn about `print` in non-script `.pm` files — use `say` or a logging module (e.g., `Log::Any`)

### perl/patterns

# Perl Patterns

> This file extends [common/patterns.md](../common/patterns.md) with Perl-specific content.

## Repository Pattern

Use **DBI** or **DBIx::Class** behind an interface:

```perl
package MyApp::Repo::User;
use Moo;

has dbh => (is => 'ro', required => 1);

sub find_by_id ($self, $id) {
    my $sth = $self->dbh->prepare('SELECT * FROM users WHERE id = ?');
    $sth->execute($id);
    return $sth->fetchrow_hashref;
}
```

## DTOs / Value Objects

Use **Moo** classes with **Types::Standard** (equivalent to Python dataclasses):

```perl
package MyApp::DTO::User;
use Moo;
use Types::Standard qw(Str Int);

has name  => (is => 'ro', isa => Str, required => 1);
has email => (is => 'ro', isa => Str, required => 1);
has age   => (is => 'ro', isa => Int);
```

## Resource Management

- Always use **three-arg open** with `autodie`
- Use **Path::Tiny** for file operations

```perl
use autodie;
use Path::Tiny;

my $content = path('config.json')->slurp_utf8;
```

## Module Interface

Use `Exporter 'import'` with `@EXPORT_OK` — never `@EXPORT`:

```perl
use Exporter 'import';
our @EXPORT_OK = qw(parse_config validate_input);
```

## Dependency Management

Use **cpanfile** + **carton** for reproducible installs:

```bash
carton install
carton exec prove -lr t/
```

## Reference

See skill: `perl-patterns` for comprehensive modern Perl patterns and idioms.

### perl/security

# Perl Security

> This file extends [common/security.md](../common/security.md) with Perl-specific content.

## Taint Mode

- Use `-T` flag on all CGI/web-facing scripts
- Sanitize `%ENV` (`$ENV{PATH}`, `$ENV{CDPATH}`, etc.) before any external command

## Input Validation

- Use allowlist regex for untainting — never `/(.*)/s`
- Validate all user input with explicit patterns:

```perl
if ($input =~ /\A([a-zA-Z0-9_-]+)\z/) {
    my $clean = $1;
}
```

## File I/O

- **Three-arg open only** — never two-arg open
- Prevent path traversal with `Cwd::realpath`:

```perl
use Cwd 'realpath';
my $safe_path = realpath($user_path);
die "Path traversal" unless $safe_path =~ m{\A/allowed/directory/};
```

## Process Execution

- Use **list-form `system()`** — never single-string form
- Use **IPC::Run3** for capturing output
- Never use backticks with variable interpolation

```perl
system('grep', '-r', $pattern, $directory);  # safe
```

## SQL Injection Prevention

Always use DBI placeholders — never interpolate into SQL:

```perl
my $sth = $dbh->prepare('SELECT * FROM users WHERE email = ?');
$sth->execute($email);
```

## Security Scanning

Run **perlcritic** with the security theme at severity 4+:

```bash
perlcritic --severity 4 --theme security lib/
```

## Reference

See skill: `perl-security` for comprehensive Perl security patterns, taint mode, and safe I/O.

### perl/testing

# Perl Testing

> This file extends [common/testing.md](../common/testing.md) with Perl-specific content.

## Framework

Use **Test2::V0** for new projects (not Test::More):

```perl
use Test2::V0;

is($result, 42, 'answer is correct');

done_testing;
```

## Runner

```bash
prove -l t/              # adds lib/ to @INC
prove -lr -j8 t/         # recursive, 8 parallel jobs
```

Always use `-l` to ensure `lib/` is on `@INC`.

## Coverage

Use **Devel::Cover** — target 80%+:

```bash
cover -test
```

## Mocking

- **Test::MockModule** — mock methods on existing modules
- **Test::MockObject** — create test doubles from scratch

## Pitfalls

- Always end test files with `done_testing`
- Never forget the `-l` flag with `prove`

## Reference

See skill: `perl-testing` for detailed Perl TDD patterns with Test2::V0, prove, and Devel::Cover.

### php/coding-style

# PHP Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with PHP specific content.

## Standards

- Follow **PSR-12** formatting and naming conventions.
- Prefer `declare(strict_types=1);` in application code.
- Use scalar type hints, return types, and typed properties everywhere new code permits.

## Immutability

- Prefer immutable DTOs and value objects for data crossing service boundaries.
- Use `readonly` properties or immutable constructors for request/response payloads where possible.
- Keep arrays for simple maps; promote business-critical structures into explicit classes.

## Formatting

- Use **PHP-CS-Fixer** or **Laravel Pint** for formatting.
- Use **PHPStan** or **Psalm** for static analysis.
- Keep Composer scripts checked in so the same commands run locally and in CI.

## Imports

- Add `use` statements for all referenced classes, interfaces, and traits.
- Avoid relying on the global namespace unless the project explicitly prefers fully qualified names.

## Error Handling

- Throw exceptions for exceptional states; avoid returning `false`/`null` as hidden error channels in new code.
- Convert framework/request input into validated DTOs before it reaches domain logic.

## Reference

See skill: `backend-patterns` for broader service/repository layering guidance.

### php/hooks

# PHP Hooks

> This file extends [common/hooks.md](../common/hooks.md) with PHP specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **Pint / PHP-CS-Fixer**: Auto-format edited `.php` files.
- **PHPStan / Psalm**: Run static analysis after PHP edits in typed codebases.
- **PHPUnit / Pest**: Run targeted tests for touched files or modules when edits affect behavior.

## Warnings

- Warn on `var_dump`, `dd`, `dump`, or `die()` left in edited files.
- Warn when edited PHP files add raw SQL or disable CSRF/session protections.

### php/patterns

# PHP Patterns

> This file extends [common/patterns.md](../common/patterns.md) with PHP specific content.

## Thin Controllers, Explicit Services

- Keep controllers focused on transport: auth, validation, serialization, status codes.
- Move business rules into application/domain services that are easy to test without HTTP bootstrapping.

## DTOs and Value Objects

- Replace shape-heavy associative arrays with DTOs for requests, commands, and external API payloads.
- Use value objects for money, identifiers, date ranges, and other constrained concepts.

## Dependency Injection

- Depend on interfaces or narrow service contracts, not framework globals.
- Pass collaborators through constructors so services are testable without service-locator lookups.

## Boundaries

- Isolate ORM models from domain decisions when the model layer is doing more than persistence.
- Wrap third-party SDKs behind small adapters so the rest of the codebase depends on your contract, not theirs.

## Reference

See skill: `api-design` for endpoint conventions and response-shape guidance.
See skill: `laravel-patterns` for Laravel-specific architecture guidance.

### php/security

# PHP Security

> This file extends [common/security.md](../common/security.md) with PHP specific content.

## Input and Output

- Validate request input at the framework boundary (`FormRequest`, Symfony Validator, or explicit DTO validation).
- Escape output in templates by default; treat raw HTML rendering as an exception that must be justified.
- Never trust query params, cookies, headers, or uploaded file metadata without validation.

## Database Safety

- Use prepared statements (`PDO`, Doctrine, Eloquent query builder) for all dynamic queries.
- Avoid string-building SQL in controllers/views.
- Scope ORM mass-assignment carefully and whitelist writable fields.

## Secrets and Dependencies

- Load secrets from environment variables or a secret manager, never from committed config files.
- Run `composer audit` in CI and review new package maintainer trust before adding dependencies.
- Pin major versions deliberately and remove abandoned packages quickly.

## Auth and Session Safety

- Use `password_hash()` / `password_verify()` for password storage.
- Regenerate session identifiers after authentication and privilege changes.
- Enforce CSRF protection on state-changing web requests.

## Reference

See skill: `laravel-security` for Laravel-specific security guidance.

### php/testing

# PHP Testing

> This file extends [common/testing.md](../common/testing.md) with PHP specific content.

## Framework

Use **PHPUnit** as the default test framework. If **Pest** is configured in the project, prefer Pest for new tests and avoid mixing frameworks.

## Coverage

```bash
vendor/bin/phpunit --coverage-text
# or
vendor/bin/pest --coverage
```

Prefer **pcov** or **Xdebug** in CI, and keep coverage thresholds in CI rather than as tribal knowledge.

## Test Organization

- Separate fast unit tests from framework/database integration tests.
- Use factory/builders for fixtures instead of large hand-written arrays.
- Keep HTTP/controller tests focused on transport and validation; move business rules into service-level tests.

## Inertia

If the project uses Inertia.js, prefer `assertInertia` with `AssertableInertia` to verify component names and props instead of raw JSON assertions.

## Reference

See skill: `tdd-workflow` for the repo-wide RED -> GREEN -> REFACTOR loop.
See skill: `laravel-tdd` for Laravel-specific testing patterns (PHPUnit and Pest).

### python/coding-style

# Python Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with Python specific content.

## Standards

- Follow **PEP 8** conventions
- Use **type annotations** on all function signatures

## Immutability

Prefer immutable data structures:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class User:
    name: str
    email: str

from typing import NamedTuple

class Point(NamedTuple):
    x: float
    y: float
```

## Formatting

- **black** for code formatting
- **isort** for import sorting
- **ruff** for linting

## Reference

See skill: `python-patterns` for comprehensive Python idioms and patterns.

### python/fastapi

# FastAPI Rules

Use these rules for FastAPI projects alongside the general Python rules.

## Structure

- Put app construction in `create_app()`.
- Keep routers thin; move persistence and business behavior into services or CRUD helpers.
- Keep request schemas, update schemas, and response schemas separate.
- Keep database sessions and auth in dependencies.

## Async

- Use `async def` for endpoints that perform I/O.
- Use async database and HTTP clients from async endpoints.
- Do not call `requests`, sync SQLAlchemy sessions, or blocking file/network operations from async routes.

## Dependency Injection

```python
@router.get("/users/{user_id}")
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ...
```

Do not create `SessionLocal()` or long-lived clients inside route handlers.

## Schemas

- Never include passwords, password hashes, access tokens, refresh tokens, or internal auth state in response models.
- Use `response_model` on endpoints that return application data.
- Use field constraints instead of hand-written validation when Pydantic can express the rule.

## Security

- Keep CORS origins environment-specific.
- Do not combine wildcard origins with credentialed CORS.
- Validate JWT expiry, issuer, audience, and algorithm.
- Rate-limit auth and write-heavy endpoints.
- Redact credentials, cookies, authorization headers, and tokens from logs.

## Testing

- Override the exact dependency used by `Depends`.
- Clear `app.dependency_overrides` after tests.
- Prefer async test clients for async applications.

See skill: `fastapi-patterns`.

### python/hooks

# Python Hooks

> This file extends [common/hooks.md](../common/hooks.md) with Python specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **black/ruff**: Auto-format `.py` files after edit
- **mypy/pyright**: Run type checking after editing `.py` files

## Warnings

- Warn about `print()` statements in edited files (use `logging` module instead)

### python/patterns

# Python Patterns

> This file extends [common/patterns.md](../common/patterns.md) with Python specific content.

## Protocol (Duck Typing)

```python
from typing import Protocol

class Repository(Protocol):
    def find_by_id(self, id: str) -> dict | None: ...
    def save(self, entity: dict) -> dict: ...
```

## Dataclasses as DTOs

```python
from dataclasses import dataclass

@dataclass
class CreateUserRequest:
    name: str
    email: str
    age: int | None = None
```

## Context Managers & Generators

- Use context managers (`with` statement) for resource management
- Use generators for lazy evaluation and memory-efficient iteration

## Reference

See skill: `python-patterns` for comprehensive patterns including decorators, concurrency, and package organization.

### python/security

# Python Security

> This file extends [common/security.md](../common/security.md) with Python specific content.

## Secret Management

```python
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.environ["OPENAI_API_KEY"]  # Raises KeyError if missing
```

## Security Scanning

- Use **bandit** for static security analysis:
  ```bash
  bandit -r src/
  ```

## Reference

See skill: `django-security` for Django-specific security guidelines (if applicable).

### python/testing

# Python Testing

> This file extends [common/testing.md](../common/testing.md) with Python specific content.

## Framework

Use **pytest** as the testing framework.

## Coverage

```bash
pytest --cov=src --cov-report=term-missing
```

## Test Organization

Use `pytest.mark` for test categorization:

```python
import pytest

@pytest.mark.unit
def test_calculate_total():
    ...

@pytest.mark.integration
def test_database_connection():
    ...
```

## Reference

See skill: `python-testing` for detailed pytest patterns and fixtures.

### react-native/accessibility

# React Native / Expo Accessibility

> Extends the ECC quality bar to accessibility (a11y). Treat a11y as a release requirement, not an afterthought.
> Target: usable with screen readers (VoiceOver on iOS, TalkBack on Android) and at large font sizes.

## Labeling

- Every interactive element has an `accessibilityRole` and an `accessibilityLabel` (or readable child text).
- Icon-only buttons MUST have an `accessibilityLabel` — there is no visible text for the reader to announce.
- Use `accessibilityHint` only when the action is non-obvious; keep it short.
- Group related elements with `accessible` on the container so they're announced as one unit when appropriate.

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Delete item"
  onPress={onDelete}
>
  <TrashIcon />
</Pressable>
```

## State & Live Regions

- Communicate state with `accessibilityState` (e.g. `{ disabled, selected, checked, expanded }`).
- Announce async/transient changes (toasts, validation errors) via `accessibilityLiveRegion` (Android) and `AccessibilityInfo.announceForAccessibility` where needed.
- Reflect loading/error/empty states in text the reader can reach — not just spinners or color.

## Touch Targets & Layout

- Minimum touch target ~44x44pt (iOS) / 48x48dp (Android); use `hitSlop` to enlarge small controls.
- Respect Dynamic Type / font scaling — avoid fixed heights that clip scaled text; test at the largest accessibility font size.
- Honor `prefers-reduced-motion` (`AccessibilityInfo.isReduceMotionEnabled`) — gate non-essential animation.

## Color & Contrast

- Do not convey meaning by color alone; pair with text, icon, or shape.
- Meet WCAG AA contrast: 4.5:1 for body text, 3:1 for large text and meaningful UI/graphical elements.
- Verify both light and dark themes.

## Focus & Navigation

- Logical focus order; move focus to new content (modals, screens) on open and restore on close.
- Ensure custom components are reachable and operable by the screen reader, not just by touch.

## Testing

- Manually test with VoiceOver and TalkBack on real devices — automated checks do not catch everything.
- In component tests, query by role/label (see testing.md) so a11y and tests reinforce each other.
- Add a11y to the pre-release gate: key flows pass a screen-reader walkthrough.

### react-native/coding-style

# React Native / Expo Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with React Native / Expo specific content.

## Components

- Define props with a named `interface` or `type`; do not use `React.FC`.
- Keep screens thin: a screen composes hooks + presentational components, it does not hold heavy logic.
- One component per file for anything reusable; co-locate small private subcomponents.
- Prefer function components and hooks. No class components.

```tsx
interface AvatarProps {
  uri: string
  size?: number
  onPress?: () => void
}

export function Avatar({ uri, size = 40, onPress }: AvatarProps) {
  return (
    <Pressable onPress={onPress}>
      <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
    </Pressable>
  )
}
```

## Styling

Pick ONE styling system per project and stay consistent. `StyleSheet.create()` is the framework-native option; utility-class libraries (e.g. NativeWind) are a common alternative. This rule is library-agnostic — what matters is consistency and avoiding inline allocations.

- StyleSheet: define styles with `StyleSheet.create()` at module scope — never build style objects inline inside `render`/JSX on hot paths (it allocates on every render).
- Utility-class approach: extract repeated class strings into shared constants or a variant helper.
- Never hardcode raw colors, spacing, or font sizes scattered across files. Centralize design tokens (theme file or config).

```tsx
// WRONG: inline style object recreated every render
<View style={{ padding: 16, backgroundColor: '#fff' }} />

// CORRECT (StyleSheet)
const styles = StyleSheet.create({ card: { padding: 16, backgroundColor: '#fff' } })
<View style={styles.card} />

// CORRECT (NativeWind)
<View className="p-4 bg-white" />
```

## Platform Differences

- Use platform-specific files (`Component.ios.tsx`, `Component.android.tsx`) for substantial divergence.
- Use `Platform.select()` / `Platform.OS` for small differences only.
- Account for safe areas with `react-native-safe-area-context`; do not hardcode status bar / notch offsets.

## Imports & Project Layout

- Use the Expo/TS path alias (e.g. `@/components/...`) instead of long relative chains.
- Organize by feature/domain, not by type. Keep files focused (200-400 lines typical, 800 max).

## Logging

- No `console.log` in shipped code. Use a logger and strip logs in production builds.
- Surface user-facing errors through UI state, not console.

## TypeScript

All TypeScript rules from `rules/typescript/` apply (explicit types on public APIs, avoid `any`, Zod for validation, immutable updates). This file only adds RN-specific guidance on top.

### react-native/hooks

# React Native / Expo Hooks

> This file extends [common/hooks.md](../common/hooks.md) with React Native / Expo-specific automation guidance.

These are recommended PostToolUse automations to keep RN/Expo code healthy. Wire them in your hook runtime (or run manually); adapt commands to your package manager.

## Suggested PostToolUse checks (on edit of *.ts/*.tsx)

- **Type check:** `tsc --noEmit` — catch type errors early.
- **Lint:** `npx expo lint` (uses `eslint-config-expo`; flat config `eslint.config.js` is the default from SDK 53+).
- **Format:** `prettier --write` on changed files.

## Pre-release / periodic

- `npx expo-doctor` — validates Expo/native dependency health and config.
- `npx expo install --check` — keeps native deps aligned with the installed Expo SDK.
- `npm audit` — dependency vulnerability scan.

## Notes

- Do not run heavy native builds inside fast edit hooks; keep edit-time hooks to typecheck/lint/format.
- Reserve `eas build` / E2E for explicit commands or CI, not per-edit automation.
- Keep these consistent with ECC hook runtime controls (`ECC_HOOK_PROFILE`, `ECC_DISABLED_HOOKS`).

### react-native/patterns

# React Native / Expo Patterns

> This file extends [common/patterns.md](../common/patterns.md) with React Native / Expo specific patterns.
> Note: Do NOT install the `web/` ruleset in a React Native project — those patterns assume the DOM (e.g. URL-as-state) and do not apply here.

## Navigation (Expo Router)

Expo Router is Expo's built-in, file-based router (`app/` directory); React Navigation is the established alternative. The examples below use Expo Router; the principles apply either way.

- Keep route files (`app/**`) thin — they wire params + hooks to a screen component that lives in `components/` or `features/`.
- Type route params; validate untrusted params (e.g. from deep links) with Zod before use.
- Use typed navigation helpers (`useLocalSearchParams`, `Link`, `router.push`).
- Centralize linking config; never trust deep-link params without validation.

```tsx
// app/user/[id].tsx
import { useLocalSearchParams, router } from 'expo-router'
import { z } from 'zod'

const Params = z.object({ id: z.string().uuid() })

export default function UserScreen() {
  // Use safeParse, not parse: a malformed deep link would otherwise throw
  // during render and crash the screen. Redirect instead of throwing.
  const parsed = Params.safeParse(useLocalSearchParams())
  if (!parsed.success) {
    router.replace('/not-found')
    return null
  }
  return <UserProfile userId={parsed.data.id} />
}
```

## State Management

The rule is to keep these concerns separate and not duplicate server data into client stores. The tools listed are common choices, not requirements — pick what fits your project.

| Concern | Common choices |
|---------|---------|
| Server state | a server-cache library (TanStack Query, SWR) |
| Client/UI state | a lightweight store (Zustand, Jotai) or Context |
| Navigation/route state | Expo Router params (NOT a global store) |
| Form state | a form library (e.g. React Hook Form) with schema validation |
| Secure persistence | `expo-secure-store` |
| Non-secure persistence | `AsyncStorage` / MMKV |

- Derive values instead of storing redundant computed state.
- Keep global client state minimal; prefer local `useState` until sharing is actually needed.

## Data Fetching

Use a server-cache library (TanStack Query, SWR) instead of ad-hoc fetch-in-`useEffect`. The examples use TanStack Query.

- Route server reads through the cache (e.g. `useQuery`) and mutations through it (e.g. `useMutation`) with cache invalidation.
- Validate API responses with Zod at the boundary; infer types from the schema. (Zod is already the validation default in ECC's `typescript/` rules.)
- Handle the three states explicitly in UI: loading, error, empty.
- Use optimistic updates for fast interactions: snapshot, apply, roll back on failure with visible feedback.
- Fetch independent data in parallel; avoid request waterfalls between parent and child.

```tsx
function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: async () => userSchema.parse(await api.getUser(id)),
  })
}
```

## Lists

- Use `FlatList`/`SectionList` (or `FlashList` for large/heavy lists) — never `.map()` a large array inside a `ScrollView`.
- Provide a stable `keyExtractor`; memoize `renderItem`.
- Paginate or virtualize long data sets.

## Custom Hooks

- Extract reusable logic (data, permissions, device APIs) into `use*` hooks.
- Keep side effects (Expo SDK calls, subscriptions) inside hooks, not in JSX.

## Async & Effects

- Clean up subscriptions, timers, and listeners in the effect's return function.
- Cancel or ignore stale async results on unmount to avoid setState-after-unmount.

### react-native/performance

# React Native / Expo Performance

> This file extends [common/performance.md](../common/performance.md) with React Native / Expo specific content.

## Rendering

- Memoize expensive components with `React.memo`; memoize callbacks/values passed to children with `useCallback`/`useMemo` only where they prevent real re-renders.
- Keep component state local and narrow — lifting state too high re-renders large subtrees.
- Avoid creating new objects/arrays/functions inline in props on hot paths; they break memoization.
- Split large screens so a state change re-renders the smallest possible subtree.

## Lists

- Use `FlatList`/`SectionList`, or `FlashList` (Shopify) for large or heterogeneous lists.
- Provide `keyExtractor`, a memoized `renderItem`, and stable item heights when possible (`getItemLayout`).
- Tune `initialNumToRender`, `windowSize`, `maxToRenderPerBatch` for heavy rows.
- Never render large data sets with `.map()` inside a `ScrollView`.

## Images & Assets

- Use `expo-image` for caching, priority, and placeholders; serve appropriately sized images.
- Avoid loading full-resolution images into small thumbnails.

## Animations

- Prefer `react-native-reanimated` (runs on the UI thread) over the JS-driven `Animated` API.
- For legacy `Animated`, set `useNativeDriver: true` where supported.
- Keep heavy computation off the JS thread; offload to Reanimated worklets or native modules.

## Runtime & Build

- Build on the **New Architecture** (Fabric + TurboModules). It is the default in recent Expo SDKs (opt-out still available on SDK 53–54) and is mandatory — cannot be disabled — from SDK 55+. Verify every native dependency is New-Arch compatible before shipping.
- Ensure **Hermes** is enabled (default in modern Expo) for faster startup and lower memory.
- Defer non-critical work after first paint; lazy-load heavy screens/modules.
- Use `InteractionManager.runAfterInteractions` for work that can wait until animations finish.

## Measuring

- Profile with the React DevTools profiler, the Hermes sampling profiler, and the in-app performance monitor. (Avoid Flipper — it is deprecated and not supported on the New Architecture.)
- Watch for: long lists without virtualization, oversized images, frequent full-tree re-renders, and synchronous work on the JS thread.

### react-native/production-readiness

# React Native / Expo Production Readiness

> Extends the ECC philosophy to ship-grade concerns that style/pattern rules cannot encode by themselves.
> A clean codebase is necessary but not sufficient for production — these items are mandatory before release.

## Architecture

- Ship on the **New Architecture** (Fabric + TurboModules). It is the default in recent Expo SDKs and is mandatory (cannot be disabled) from SDK 55+. Audit native deps for compatibility.
- Pin the Expo SDK version; upgrade deliberately with `npx expo install --check` and test on both platforms.

## Build & Release (EAS)

- Use **EAS Build** for production binaries and **EAS Submit** for store delivery. Do not rely on local ad-hoc builds for release.
- Keep separate build profiles (`development`, `preview`, `production`) in `eas.json`.
- Manage signing credentials via EAS; never commit keystores or provisioning profiles.

## Over-the-Air Updates

- Use **EAS Update** (`expo-updates`) for JS-only fixes, with a defined runtime version policy.
- Never push native changes via OTA — those require a new store build.
- Roll out gradually and keep the ability to roll back.

## Observability

- Integrate crash + error reporting (e.g. **Sentry** via `@sentry/react-native`) in production builds.
- Add structured logging and, where useful, analytics — but strip verbose logs from release.
- Capture and surface failed network/mutation states; do not fail silently.

## Configuration & Versioning

- Bump `version` and `ios.buildNumber` / `android.versionCode` per release.
- Public config via `EXPO_PUBLIC_*`; real secrets via EAS secrets only.
- Validate required config at startup and fail fast with a clear message.

## Pre-Release Gate

Before shipping, all must pass:

- [ ] `tsc --noEmit` clean
- [ ] `npx expo lint` clean
- [ ] Tests green, coverage >= 80% (see testing.md)
- [ ] `npx expo-doctor` healthy
- [ ] Critical-flow E2E (Maestro/Detox) pass on a real build
- [ ] No secrets in bundle (see security.md)
- [ ] Crash reporting active and verified
- [ ] Tested on physical iOS and Android devices, not just simulators

### react-native/security

# React Native / Expo Security

> This file extends [common/security.md](../common/security.md) with React Native / Expo specific content.
> The mandatory pre-commit checklist and Security Response Protocol from common/security.md still apply.

## The Bundle Is Public

Treat everything shipped in the app as readable by an attacker. A mobile binary can be unpacked.

- NEVER ship real secrets (private API keys, service-role keys, signing secrets) in the JS bundle or `app.config`.
- Public/anon keys (e.g. Supabase anon key, Firebase config) are acceptable ONLY when protected by server-side rules (RLS, security rules). Enforce authorization on the backend, never in the client.
- Keep privileged operations behind your own server / edge functions.

## Secret & Token Storage

- Store auth tokens and sensitive values in `expo-secure-store` (Keychain / Keystore) — never in `AsyncStorage` or plain MMKV.
- Do not persist secrets in Redux/Zustand state that may be serialized to disk.

## Configuration

- Read environment via `expo-constants` / `app.config.ts` `extra`, and `EXPO_PUBLIC_*` only for genuinely public values.
- Keep build secrets in EAS secrets, not in the repo.

## Network & Data

- HTTPS only; reject cleartext. Consider certificate pinning for high-risk apps.
- Validate ALL external data (API responses, deep-link params, push payloads) with Zod before use.
- Validate and sanitize deep links and universal links — never route or grant access based on unvalidated params.

## Permissions & Privacy

- Request the minimum device permissions, at the moment they are needed, with clear rationale.
- Declare data collection accurately for App Store / Play Store privacy disclosures.

## Dependencies

- Run `expo-doctor` and `npm audit` regularly; keep the Expo SDK and native deps current.
- Use `/security-scan` (AgentShield) on the agent configuration itself.

### react-native/testing

# React Native / Expo Testing

> This file extends [common/testing.md](../common/testing.md) with React Native / Expo specific content.
> Coverage target and TDD workflow are inherited from common/testing.md (80% minimum, RED-GREEN-REFACTOR).

## Tooling

| Layer | Tool |
|-------|------|
| Unit / component | Jest + `@testing-library/react-native` (via `jest-expo` preset) |
| Hooks | `@testing-library/react-native` `renderHook` |
| E2E | Maestro (recommended, simple YAML flows) or Detox |
| Type safety | `tsc --noEmit` in CI |

## Component Tests

- Query by accessible role/label/text, not by `testID` unless necessary — this also enforces accessibility.
- Assert on user-visible behavior, not implementation details.
- Follow Arrange-Act-Assert.

```tsx
import { render, screen, fireEvent } from '@testing-library/react-native'

test('calls onSelect with the user id when pressed', () => {
  const onSelect = jest.fn()
  render(<UserCard user={{ id: '1', email: 'a@b.com' }} onSelect={onSelect} />)

  fireEvent.press(screen.getByText('a@b.com'))

  expect(onSelect).toHaveBeenCalledWith('1')
})
```

## Mocking

- Mock Expo SDK modules (camera, location, notifications, secure-store) at the test boundary.
- Wrap components that use TanStack Query in a `QueryClientProvider` with a fresh client per test.
- Mock navigation (`expo-router`) so screens render in isolation.

## E2E

- Cover critical flows only: auth, primary navigation, core transactions.
- Run E2E on CI against a built app (EAS Build) before release.

## What to test first

Use the `tdd-guide` agent proactively for new features: write a failing test that captures the behavior, then implement.

### react/coding-style

# React Coding Style

> This file extends [typescript/coding-style.md](../typescript/coding-style.md) and [common/coding-style.md](../common/coding-style.md) with React specific content.

## File Extensions

- `.tsx` for any file containing JSX, even one-liner snippets
- `.ts` for pure logic, custom hooks without JSX, type definitions, utilities
- `.test.tsx` / `.test.ts` mirroring the source file
- Use `.jsx` only when the project intentionally avoids TypeScript — flag every new untyped React file in review

## Naming

- Components: `PascalCase` for both the symbol and the file (`UserCard.tsx`, default export `UserCard`)
- Custom hooks: `useCamelCase` for the symbol, kebab-case for the file when the project convention is kebab-case (`use-debounce.ts` exports `useDebounce`)
- Context: `<Domain>Context` symbol, `<Domain>Provider` provider component, `use<Domain>` consumer hook
- Event handlers: `handleClick`, `handleSubmit` inside the component; the prop that receives it is `onClick`, `onSubmit`
- Boolean props: `isLoading`, `hasError`, `canSubmit` — never `loading` or `error` alone for booleans

## Component Shape

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

- Prefer `type Props = {}` for closed component prop shapes
- Use `interface` only when the prop type is extended via declaration merging or exported as a public API extension point
- Always destructure props in the parameter list — no `props.user` access inside the body
- Type the return implicitly through JSX (`function Foo(): JSX.Element` only when the function returns conditionally and the union confuses inference)

## JSX

- Self-close tags with no children: `<img />`, `<UserCard user={u} />`
- Use fragments `<>...</>` over wrapper `<div>` when no DOM element is needed
- Conditional rendering: `{condition && <Foo />}` for booleans, ternary for either/or, early return for guard clauses
- Never put logic inline in JSX when it reads as multi-line — extract to a const above the return or a function

```tsx
// Prefer
const greeting = user.isAdmin ? "Welcome, admin" : `Hello ${user.name}`;
return <h1>{greeting}</h1>;

// Over
return <h1>{user.isAdmin ? "Welcome, admin" : `Hello ${user.name}`}</h1>;
```

## Server / Client Boundary (Next.js App Router, RSC)

- Default a new file to Server Component — only add `"use client"` when the file uses state, effects, refs, browser APIs, or event handlers
- Place the `"use client"` directive on line 1, before any imports
- Never import a Client Component file from inside a `"use server"` action file
- Never re-export server-only code through a client module — the bundler will silently include it

## Imports

- React imports first: `import { useState } from "react"`
- Then third-party libs, then absolute project imports, then relative
- Type-only imports: `import type { ReactNode } from "react"` — never mix runtime and type imports in one statement when ESLint's `consistent-type-imports` is configured

## Hooks Discipline

See [hooks.md](./hooks.md) for the full ruleset. Style highlights:

- Custom hooks must start with `use` — enforced by `eslint-plugin-react-hooks`
- Group all hook calls at the top of the component, before any conditional logic
- Avoid creating ad-hoc hooks for one-line wrappers — inline the call instead

## State

- Local first (`useState`), lift only when shared
- Context for cross-cutting state read by many components (theme, auth, i18n) — not for high-frequency updates
- External store (Zustand, Jotai, Redux Toolkit) when state must persist across route changes, sync across tabs, or be debugged via devtools
- Never duplicate state that can be derived — compute during render

## Class Components

Forbidden in new code. Convert legacy class components to function components when touching them for non-trivial changes.

## File Layout per Component

```
components/UserCard/
  UserCard.tsx
  UserCard.module.css   # or styled-components, or Tailwind classes inline
  UserCard.test.tsx
  index.ts              # re-export only
```

Inline single-file components are fine for trivial presentational pieces.

### react/hooks

# React Hooks

> This file covers **React hooks** (`useState`, `useEffect`, `useMemo`, `useCallback`, custom hooks) — NOT the Claude Code `hooks/` runtime system. Naming matches the per-language convention `rules/<lang>/hooks.md` used across this repo.
>
> Extends [typescript/patterns.md](../typescript/patterns.md) and [common/patterns.md](../common/patterns.md).

## Rules of Hooks

Enforce `eslint-plugin-react-hooks` with `react-hooks/rules-of-hooks` set to error.

1. Hooks only at the top level of a function component or another hook
2. Never in loops, conditionals, nested functions, or after early returns
3. Always called in the same order on every render
4. Only inside React function components or custom hooks (functions starting with `use`)

```tsx
// WRONG: conditional hook
function Foo({ enabled }: { enabled: boolean }) {
  if (enabled) {
    const [x, setX] = useState(0); // rule violation
  }
}

// CORRECT: hook unconditional, condition inside
function Foo({ enabled }: { enabled: boolean }) {
  const [x, setX] = useState(0);
  if (!enabled) return null;
  return <span>{x}</span>;
}
```

## `useEffect` — When NOT to Use

`useEffect` is for synchronizing with external systems (subscriptions, browser APIs, third-party libraries). It is **not** the right tool for:

- Derived state — compute it during render
- Transforming data for rendering — compute it during render
- Resetting state when a prop changes — use a `key` on the parent or derive from props
- Notifying parents of state changes — call the callback in the event handler
- Initializing app-level singletons — call the function module-side or in `main.tsx`

```tsx
// WRONG: effect for derived state
const [fullName, setFullName] = useState("");
useEffect(() => {
  setFullName(`${first} ${last}`);
}, [first, last]);

// CORRECT: derive during render
const fullName = `${first} ${last}`;
```

## Dependency Arrays

- Always include every reactive value referenced inside the effect/callback
- Enable `react-hooks/exhaustive-deps` lint rule — never silence it without a comment explaining why
- If the dep array grows unwieldy, the effect is doing too much — split it
- Stable identity for functions passed in deps: wrap in `useCallback` only when the function is itself a dependency of another hook or passed to a memoized child

## Cleanup

Every subscription, interval, listener, or in-flight request must clean up.

```tsx
useEffect(() => {
  const controller = new AbortController();
  fetch(url, { signal: controller.signal }).then(handleResponse);
  return () => controller.abort();
}, [url]);
```

```tsx
useEffect(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
}, []);
```

Missing cleanup = race conditions when deps change, memory leaks on unmount.

## `useMemo` and `useCallback` — When Worth It

Default position: **do not memoize**. Add `useMemo` / `useCallback` only when:

1. The value is passed to a `React.memo`-wrapped child as a prop, and identity matters
2. The value is a dependency of another `useEffect` / `useMemo` / `useCallback`
3. The computation is measurably expensive (profile before assuming)

Premature memoization adds noise, hides bugs, and can be slower than the recompute it replaces.

## Custom Hooks

Extract a custom hook when:

- The same hook sequence (state + effect + computed) appears in 2+ components
- The logic has a clear, nameable purpose (`useDebounce`, `useOnClickOutside`, `useLocalStorage`)
- You want to test the logic independently of any component

Do NOT extract when:

- It would have a single caller — inline it
- The "hook" is just `useState` with a different name — adds indirection, no value

```tsx
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
```

## `useState` Patterns

- Initial state from prop only at mount: pass a function `useState(() => computeInitial(prop))` when computation is expensive
- Functional updater when the new state depends on the old: `setCount(c => c + 1)` — never `setCount(count + 1)` inside async or batched contexts
- Group related state into one object only when they always change together; otherwise split into multiple `useState` calls
- Use `useReducer` once state transitions are conditional on the previous state or there are 3+ related values

## `useRef` Patterns

- DOM refs for imperative APIs (focus, scroll, third-party libs)
- Mutable container that does not trigger re-render (timer ids, previous values, "is mounted" flags)
- Never read or write `ref.current` during render — only inside effects or event handlers
- `useImperativeHandle` only when exposing a child API to a parent ref — last-resort escape hatch

## `useSyncExternalStore`

Use this hook to subscribe to any external store (browser API, third-party state lib, custom event emitter). It is the supported way to make external state safe with concurrent rendering.

```tsx
const isOnline = useSyncExternalStore(
  (cb) => {
    window.addEventListener("online", cb);
    window.addEventListener("offline", cb);
    return () => {
      window.removeEventListener("online", cb);
      window.removeEventListener("offline", cb);
    };
  },
  () => navigator.onLine,
  () => true,
);
```

## React 19 Additions

- `use()` — unwrap promises and contexts inline; usable conditionally (only hook with that property)
- `useFormStatus()` / `useFormState()` (or `useActionState`) — form submission state without prop drilling
- `useOptimistic()` — optimistic UI updates while a server action is pending
- `useTransition()` — mark non-urgent state updates so urgent ones stay responsive

When the project targets React 19+, prefer these over hand-rolled equivalents.

## Stale Closure Trap

Async handlers and intervals capture the values from the render where they were created. Fix by:

1. Using the functional updater form of `setState`
2. Putting the changing value in the dep array of `useEffect` and rebuilding the handler
3. Reading from a ref that is kept in sync

## Lint Configuration

Required rules:

```json
{
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

Treat `exhaustive-deps` warnings as errors in CI for new code.

### react/patterns

# React Patterns

> This file extends [typescript/patterns.md](../typescript/patterns.md) and [common/patterns.md](../common/patterns.md) with React specific content. For hook-specific rules see [hooks.md](./hooks.md).

## Container / Presentational Split

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

## State Location Decision Tree

1. Used by one component → `useState` inside it
2. Used by parent + a few children → lift to nearest common ancestor, pass via props
3. Used across distant branches → React Context **for low-frequency reads only** (theme, auth, locale)
4. High-frequency updates shared across the tree → external store (Zustand, Jotai, Redux Toolkit)
5. Server-derived data → server-state library (TanStack Query, SWR, RSC fetch) — not application state

Context misused for frequently changing values causes every consumer to re-render on every update.

## Server / Client Component Boundary (RSC, Next.js App Router)

- Server Components are the default — they run on the server, do not ship to the client, and can `await` directly
- Client Components opt in with `"use client"` at the top of the file
- Data flows down: a Server Component can render a Client Component and pass serializable props
- A Client Component cannot import a Server Component, but it can receive one via `children` or named slots

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

- Never import `"server-only"` packages (DB clients, secrets) from a Client Component file — wrap them in a Server Component or Server Action
- Mark sensitive modules with `import "server-only"` so the bundler errors if a client file imports them

## Suspense + Error Boundaries

Every Suspense boundary needs an Error Boundary above it. The pair handles both states.

```tsx
<ErrorBoundary fallback={<ErrorView />}>
  <Suspense fallback={<Skeleton />}>
    <UserDetails id={id} />
  </Suspense>
</ErrorBoundary>
```

- Place Suspense boundaries close to where data is needed, not at the route root
- Multiple narrower boundaries reveal loaded content progressively
- Error Boundary must be a Class Component (React 19 has no functional equivalent yet) OR use a library wrapper such as `react-error-boundary`

## Forms

### Uncontrolled (React 19 + form actions)

Prefer uncontrolled inputs with form actions when the form has a clear submit step. The browser owns the value; React reads it via `FormData` on submit.

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

### Controlled

Use controlled inputs when the value drives other UI, requires real-time validation, or formatting.

```tsx
const [email, setEmail] = useState("");
return <input value={email} onChange={(e) => setEmail(e.target.value)} />;
```

### Form Libraries

For complex forms (multi-step, dynamic field arrays, cross-field validation), use a library:

- React Hook Form — minimal re-renders, uncontrolled-first
- TanStack Form — typed, framework-agnostic
- Final Form — when subscription-based re-renders matter

## Data Fetching

| Strategy | When |
|---|---|
| RSC fetch (`await` in Server Component) | Per-request data in Next.js App Router, no client-side cache needed |
| TanStack Query | Client-side cache, mutations, optimistic updates, polling |
| SWR | Lightweight cache + revalidation, simpler than TanStack Query |
| `fetch` in `useEffect` | Avoid — race conditions, no cache, no retry. Only acceptable for one-off fire-and-forget |

Never fetch in a `useEffect` when a real cache library is available — they handle deduping, cache invalidation, error retry, and Suspense integration.

## Lists and Keys

- `key` must be stable across renders — never `index` for any list that can reorder, insert, or delete
- `key` must be unique among siblings, not globally
- A reordered list with index keys causes state in child components to attach to the wrong row

## Composition over Inheritance

- Pass `children` for slot-style composition
- Pass render-prop functions for parameterized rendering
- Pass component types for plug-in points: `renderItem={UserRow}`
- Never extend a component class to specialize behavior

## Compound Components

For related controls (Tabs, Accordion, Menu), use compound components sharing state via Context:

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

## Refs and Forwarding (React 19+)

React 19 lets function components accept `ref` as a regular prop — `forwardRef` is no longer required.

```tsx
export function Input({ ref, ...rest }: { ref?: React.Ref<HTMLInputElement> } & InputProps) {
  return <input ref={ref} {...rest} />;
}
```

Older codebases on React 18 still need `forwardRef`.

## Out of Scope (Pointer Sections)

### Next.js (App Router)

- Server Actions, Route Handlers, Middleware, Parallel/Intercepted Routes, streaming Metadata
- Treated as a separate framework concern — when adding deep Next-specific patterns, propose a dedicated `rules/nextjs/` track
- For now follow Next.js official docs for App Router specifics

### React Native

- Platform-specific imports (`Platform.OS`, `.ios.tsx` / `.android.tsx`), `StyleSheet`, navigation libraries (React Navigation, Expo Router)
- Treated as a separate track — `rules/react-native/` is not yet present
- React core hooks/patterns from this file still apply

## Skill Reference

For React-specific deep dives see `skills/react-patterns/SKILL.md`. For cross-framework frontend concerns see `skills/frontend-patterns/SKILL.md`. For accessibility see `skills/accessibility/SKILL.md`.

### react/security

# React Security

> This file extends [typescript/security.md](../typescript/security.md) and [common/security.md](../common/security.md) with React specific content.

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

Audit checklist for every `dangerouslySetInnerHTML` call:

- Is the input always under our control? Document the source.
- If user-derived: is it sanitized at the **same call site**? (Sanitization at the API boundary is acceptable only if every consumer is verified.)
- Is the sanitizer config allowlisting tags, not denylisting?

## Unsafe URL Schemes

`javascript:` and `data:` URLs in `href`, `src`, and `xlink:href` execute arbitrary code.

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

React warns about `javascript:` URLs in `href` in development mode, but does not block them at runtime. `data:` URLs and other schemes also slip through. Always validate.

## `target="_blank"` Without `rel`

`<a target="_blank">` without `rel="noopener noreferrer"` lets the target page access `window.opener` and run navigation hijacks.

```tsx
// WRONG
<a href={externalUrl} target="_blank">External</a>

// CORRECT
<a href={externalUrl} target="_blank" rel="noopener noreferrer">External</a>
```

Modern browsers default to `noopener` when `target="_blank"`, but do not rely on browser defaults — be explicit.

## Server Action Input Validation

Server Actions (`"use server"`) run with the same trust level as a public API endpoint. Validate every input.

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

- Authenticate inside the action — do not trust the client-side route gate
- Authorize: confirm the current user has permission for the specific record they are mutating
- Rate limit sensitive actions

## Secret Exposure via Env Vars

Prefixed env vars are bundled into the client. Treat them as public.

| Framework | Public prefix | Private |
|---|---|---|
| Next.js | `NEXT_PUBLIC_*` | All others |
| Vite | `VITE_*` | `.env` server-side only |
| Create React App | `REACT_APP_*`, plus `NODE_ENV` and `PUBLIC_URL` | All others (anything without the `REACT_APP_` prefix is server-side only) |
| Remix | `process.env` access in `loader`/`action` only | Same |

```ts
// CRITICAL: secret leaked to client bundle
const apiKey = process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY;
```

Audit on every PR that touches env vars: would this string in the public bundle be a problem?

## Authentication / Authorization

- Never store sessions in `localStorage` — accessible to any XSS. Use httpOnly secure cookies.
- Never trust client-set state to gate sensitive UI. Render-gating in JSX prevents display, not access — the API must enforce.
- CSRF: cookie-based auth requires CSRF tokens or `SameSite=Strict`/`Lax` cookies
- Use double-submit cookies or origin verification for form actions when not using framework defaults

## Content Security Policy (CSP)

Configure server-side. The minimum acceptable CSP for a React app:

```
default-src 'self';
script-src 'self' 'nonce-{REQUEST_NONCE}';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
connect-src 'self' https://api.example.com;
frame-ancestors 'none';
```

- Avoid `unsafe-inline` and `unsafe-eval` in `script-src`
- For SSR with inline scripts (Next.js streaming, hydration data), use per-request nonces — both Next.js and Remix support nonce injection
- `style-src 'unsafe-inline'` is often unavoidable for CSS-in-JS libraries — document the tradeoff

## Prototype Pollution via Object Spread

```tsx
// WRONG: untrusted JSON spread directly into state
const update = await req.json();
setState({ ...state, ...update });    // attacker controls __proto__

// CORRECT: parse with a schema, or guard keys
const Allowed = z.object({ name: z.string(), email: z.string().email() });
const parsed = Allowed.parse(await req.json());
setState({ ...state, ...parsed });
```

## SSR Template Injection

When using `renderToString` or `renderToPipeableStream`:

- All values rendered inside JSX are escaped by React — safe
- Values passed to `dangerouslySetInnerHTML` are NOT escaped — same rules as client
- Manually constructed HTML wrappers around the React output must be escaped or sanitized — never concatenate user input into the surrounding HTML template

## Third-Party Components

- Audit `npm audit` before adding any UI library
- Check that the library does not internally use `dangerouslySetInnerHTML` on its input (e.g., rich text editors)
- Pin versions, review changelogs before major upgrades
- Be wary of components that accept HTML strings as props

## Source Map Exposure in Production

Production builds should ship without source maps, or with sourcemaps uploaded to an error tracker (Sentry) and stripped from the public bundle. Public source maps leak internal logic and file structure.

## Agent Support

- Use `security-reviewer` agent for comprehensive security audits across the codebase
- Use `react-reviewer` agent for React-specific patterns and the above rules in active code review

### react/testing

# React Testing

> This file extends [typescript/testing.md](../typescript/testing.md) and [common/testing.md](../common/testing.md) with React specific content.

## Library Choice

- **React Testing Library (RTL)** — the standard for component testing. Tests behavior through the rendered DOM.
- **Vitest** — preferred runner for new Vite-based projects. Faster than Jest, native ESM, same API.
- **Jest** — still the default for Next.js / CRA projects. RTL works identically.
- **Playwright Component Testing** — when component tests need a real browser engine (animation, layout, complex events)
- **Cypress Component Testing** — alternative real-browser component runner

Pick one component test runner per project — do not mix RTL + Playwright CT in the same repo.

## Core Principle

Test what the user sees and does, not implementation details.

- Query by accessible role first, then label, then text — fall back to `data-testid` only when nothing else fits
- Never assert on internal state, props passed to children, or which hooks were called
- Refactor without breaking tests = the test was testing behavior; that is the goal

## Query Priority

RTL exposes queries in three families. Use this priority order top-down:

1. **Accessible to everyone**
   - `getByRole(role, { name })` — primary choice
   - `getByLabelText` — for form inputs
   - `getByPlaceholderText` — when no label is available (and add a label)
   - `getByText` — for non-interactive text
   - `getByDisplayValue` — for form fields with a current value

2. **Semantic queries**
   - `getByAltText` — for images
   - `getByTitle` — last resort, low accessibility value

3. **Test IDs**
   - `getByTestId("some-id")` — escape hatch only, when none of the above work

`getBy*` throws when no match. `queryBy*` returns null (use for asserting absence). `findBy*` returns a promise (use for async).

## User Interaction

Prefer `userEvent` over `fireEvent`. `userEvent` simulates real browser sequences (focus, keydown, beforeinput, input, keyup) — `fireEvent` dispatches a single synthetic event.

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

- Always `await` `userEvent` calls — they are async
- Call `userEvent.setup()` once at the top of each test, then reuse the returned `user`

## Async Assertions

```tsx
// WRONG: synchronous query for async-rendered content
expect(screen.getByText("Loaded")).toBeInTheDocument();   // throws — not in DOM yet

// CORRECT: findBy* (returns a promise, retries)
expect(await screen.findByText("Loaded")).toBeInTheDocument();

// CORRECT: waitFor for non-element assertions
await waitFor(() => expect(saveSpy).toHaveBeenCalled());
```

- `findBy*` for async element appearance
- `waitFor` for async expectations on side effects or other matchers
- Never `setTimeout` + assertion — flaky

## Network Mocking with MSW

Use Mock Service Worker for any test that hits a network boundary. MSW runs at the network layer, so the component, hooks, and fetch library all behave as in production.

```tsx
// test setup
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

const server = setupServer(
  http.get("/api/users/:id", ({ params }) =>
    HttpResponse.json({ id: params.id, name: "Alice" }),
  ),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

Per-test override:

```tsx
test("renders error on 500", async () => {
  server.use(http.get("/api/users/:id", () => new HttpResponse(null, { status: 500 })));
  render(<UserPage id="1" />);
  expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
});
```

## Avoid Snapshot Tests for Components

Snapshots of rendered output are brittle, hard to review, and rubber-stamped by reviewers. Use them only for:

- Pure data serialization (e.g., a transformer that produces a stable string)
- Catching unintended regressions in non-visual output

For component visual regression, use Playwright / Cypress / Percy screenshots — actual visual diffs, not DOM diffs.

## Test Setup Helpers

Wrap providers once:

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

Export from `test-utils.tsx` and use everywhere.

## Custom Hook Testing

Use `renderHook` from RTL:

```tsx
import { renderHook, act } from "@testing-library/react";

test("useCounter increments", () => {
  const { result } = renderHook(() => useCounter());
  act(() => result.current.increment());
  expect(result.current.count).toBe(1);
});
```

- Always wrap state-changing calls in `act`
- Always test through the public hook API, not internal implementation

## Accessibility Assertions

```tsx
import { axe } from "vitest-axe";   // or jest-axe

test("UserCard has no a11y violations", async () => {
  const { container } = render(<UserCard user={mockUser} />);
  expect(await axe(container)).toHaveNoViolations();
});
```

Run axe assertions in component tests — catches missing labels, ARIA misuse, color contrast (limited).

## When to Reach for Playwright / Cypress

Component test with RTL + JSDOM cannot:

- Test real layout (flexbox, grid, viewport-dependent rendering)
- Test scrolling, drag-and-drop, paste from clipboard
- Test browser-native animation, CSS transitions
- Test cross-frame interactions (iframes, popups)

For those, use Playwright Component Testing or end-to-end Playwright/Cypress runs. See [e2e-testing skill](../../skills/e2e-testing/SKILL.md).

## Coverage Targets

| Layer | Target |
|---|---|
| Pure utility functions | ≥90% |
| Custom hooks | ≥85% |
| Components (presentational) | ≥80% — behavior, not lines |
| Container components | ≥70% — golden paths + error states |
| Pages (E2E covered separately) | Smoke test per route minimum |

## Anti-Patterns

- Asserting on `container.querySelector` — bypasses accessibility queries
- Asserting on number of renders — implementation detail
- Mocking React hooks (`jest.mock("react", ...)`) — refactor the component instead
- Mocking child components by default — tests the integration, not the parent in isolation
- Manual `act()` warnings ignored — they indicate real bugs

## Skill Reference

See `skills/react-testing/SKILL.md` for end-to-end test examples, MSW patterns, and accessibility test scaffolding.

### ruby/coding-style

# Ruby Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with Ruby and Rails specific content.

## Standards

- Target **Ruby 3.3+** for new Rails work unless the project already pins an older supported runtime.
- Enable **YJIT** in production only after measuring boot time, memory, and request/job throughput.
- Add `# frozen_string_literal: true` to new Ruby files when the project uses that convention.
- Prefer clear Ruby over clever metaprogramming; isolate DSL-heavy code behind narrow, tested boundaries.

## Formatting And Linting

- Use the project's checked-in RuboCop config. For Rails 8+ apps, start from `rubocop-rails-omakase` and customize only where the codebase has a real convention.
- Keep formatter/linter commands behind binstubs or scripts so CI and local runs match:

```bash
bundle exec rubocop
bundle exec rubocop -A
```

- Do not silence cops inline unless the exception is narrow, documented, and harder to express cleanly in code.

## Rails Style

- Follow Rails naming and directory conventions before adding custom structure.
- Keep controllers transport-focused: authentication, authorization, parameter handling, response shape.
- Put reusable domain behavior in models, concerns, service objects, query objects, or form objects based on actual complexity, not as default ceremony.
- Prefer `bin/rails`, `bin/rake`, and checked-in binstubs over globally installed commands.

## Error Handling

- Rescue specific exceptions. Avoid broad `rescue StandardError` blocks unless they re-raise or preserve enough context for operators.
- Use `ActiveSupport::Notifications` or the app's logger for operational events; do not leave `puts`, `pp`, or `debugger` in committed application code.

## Reference

See skill: `backend-patterns` for broader service/repository layering guidance.

### ruby/hooks

# Ruby Hooks

> This file extends [common/hooks.md](../common/hooks.md) with Ruby and Rails specific content.

## PostToolUse Hooks

Configure project-local hooks to prefer binstubs and checked-in tooling:

- **RuboCop**: run `bundle exec rubocop -A <file>` or the project's safer formatter command after Ruby edits.
- **Brakeman**: run `bundle exec brakeman --no-progress` after security-sensitive Rails changes.
- **Tests**: run the narrowest matching `bin/rails test ...` or `bundle exec rspec ...` command for touched files.
- **Bundler audit**: run `bundle exec bundle-audit check --update` when `Gemfile` or `Gemfile.lock` changes and the project has bundler-audit installed.

## Warnings

- Warn on committed `debugger`, `binding.irb`, `binding.pry`, `puts`, `pp`, or `p` calls in application code.
- Warn when an edit disables CSRF protection, expands mass-assignment, or adds raw SQL without parameterization.
- Warn when a migration changes data destructively without a reversible path or documented rollout plan.

## CI Gate Suggestions

```bash
bundle exec rubocop
bundle exec brakeman --no-progress
bin/rails test
bundle exec rspec
```

Use only the commands that are present in the project; do not install new hook dependencies without maintainer approval.

### ruby/patterns

# Ruby Patterns

> This file extends [common/patterns.md](../common/patterns.md) with Ruby and Rails specific content.

## Rails Way First

- Start with plain Rails MVC and Active Record conventions for small and medium features.
- Introduce service objects, query objects, form objects, decorators, or presenters when the model/controller boundary is carrying multiple responsibilities.
- Name extracted objects after the business operation they perform, not after generic layers like `Manager` or `Processor`.

## Persistence

- Prefer PostgreSQL for multi-host production Rails apps unless the existing platform has a clear reason for MySQL or SQLite.
- Treat Rails 8 SQLite-backed defaults as viable for single-host or modest deployments, not as an automatic fit for shared multi-service systems.
- Keep raw SQL behind query objects or model scopes and parameterize every dynamic value.

## Background Jobs And Runtime Services

- Use **Solid Queue** for greenfield Rails 8 apps with modest throughput and simple deployment needs.
- Use **Sidekiq** when the app needs mature observability, high throughput, existing Redis infrastructure, or Pro/Enterprise features.
- Use **Solid Cache** and **Solid Cable** when their deployment model matches the app; use Redis when shared cross-service behavior, high fanout, or advanced data structures matter.

## Frontend

- Prefer **Hotwire** with Turbo, Stimulus, Importmap, and Propshaft for server-rendered Rails apps.
- Use React, Vue, Inertia.js, or a separate SPA when interaction complexity, existing product architecture, or team ownership justifies the extra client surface.
- Keep view components, partials, and presenters focused on rendering decisions; keep persistence and authorization out of templates.

## Authentication

- Use the Rails 8 authentication generator for straightforward session auth and password reset needs.
- Use Devise or another established auth system when requirements include OAuth, MFA, confirmable/lockable flows, multi-model auth, or a large existing Devise footprint.

## Reference

See skill: `backend-patterns` for service boundaries and adapter patterns.

### ruby/security

# Ruby Security

> This file extends [common/security.md](../common/security.md) with Ruby and Rails specific content.

## Rails Defaults

- Keep CSRF protection enabled for state-changing browser requests.
- Use strong parameters or typed boundary objects before mass assignment.
- Store secrets in Rails credentials, environment variables, or a secret manager. Never commit plaintext keys, tokens, private credentials, or copied `.env` values.

## SQL And Active Record

- Prefer Active Record query APIs and parameterized SQL.
- Never interpolate request, cookie, header, job, or webhook values into SQL strings.
- Scope model callbacks carefully; security-sensitive side effects should be explicit and covered by tests.

## Authentication And Sessions

- Use the Rails 8 authentication generator for simple session auth, or Devise when OAuth, MFA, confirmable, lockable, multi-model auth, or existing Devise conventions are required.
- Rotate sessions after sign-in and privilege changes.
- Protect account recovery flows with expiry, single-use tokens, rate limiting, and audit logging.

## Dependencies

- Run dependency checks when the lockfile changes:

```bash
bundle exec bundle-audit check --update
bundle exec brakeman --no-progress
```

- Review new gems for maintainer activity, native extension risk, transitive dependencies, and whether the same behavior can be implemented with Rails core.

## Web Safety

- Escape template output by default. Treat `html_safe`, `raw`, and custom sanitizers as security-sensitive code.
- Validate file uploads by content type, extension, size, and storage destination.
- Treat background jobs, webhooks, Action Cable messages, and Turbo Stream inputs as untrusted boundaries.

## Reference

See skill: `security-review` for secure-by-default review patterns.

### ruby/testing

# Ruby Testing

> This file extends [common/testing.md](../common/testing.md) with Ruby and Rails specific content.

## Framework

- Use **Minitest** when the Rails app follows the default Rails test stack.
- Use **RSpec** when it is already established in the project or the team has explicit production conventions around it.
- Do not mix Minitest and RSpec inside the same feature area without a migration reason.

## Test Pyramid

- Put fast domain behavior in model, service, query, policy, and job tests.
- Use request/controller tests for HTTP contracts, auth behavior, redirects, status codes, and response shapes.
- Use system tests with Capybara for browser-critical flows only; keep them focused and stable.
- Cover background jobs with unit tests for behavior and integration tests for queue/enqueue contracts.

## Fixtures And Factories

- Use Rails fixtures when they are the project default and the data graph is small.
- Use `factory_bot` when scenarios need explicit object construction or complex traits.
- Keep test data close to the behavior being asserted; avoid global fixtures that hide setup cost.

## Commands

Prefer project-local commands:

```bash
bin/rails test
bin/rails test test/models/user_test.rb
bundle exec rspec
bundle exec rspec spec/models/user_spec.rb
```

## Coverage

- Use SimpleCov when coverage is enforced; keep thresholds in CI and avoid gaming branch coverage with low-value tests.
- Add regression tests for bug fixes before changing production code.

## Reference

See skill: `tdd-workflow` for the repo-wide RED -> GREEN -> REFACTOR loop.

### rust/coding-style

# Rust Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with Rust-specific content.

## Formatting

- **rustfmt** for enforcement — always run `cargo fmt` before committing
- **clippy** for lints — `cargo clippy -- -D warnings` (treat warnings as errors)
- 4-space indent (rustfmt default)
- Max line width: 100 characters (rustfmt default)

## Immutability

Rust variables are immutable by default — embrace this:

- Use `let` by default; only use `let mut` when mutation is required
- Prefer returning new values over mutating in place
- Use `Cow<'_, T>` when a function may or may not need to allocate

```rust
use std::borrow::Cow;

// GOOD — immutable by default, new value returned
fn normalize(input: &str) -> Cow<'_, str> {
    if input.contains(' ') {
        Cow::Owned(input.replace(' ', "_"))
    } else {
        Cow::Borrowed(input)
    }
}

// BAD — unnecessary mutation
fn normalize_bad(input: &mut String) {
    *input = input.replace(' ', "_");
}
```

## Naming

Follow standard Rust conventions:
- `snake_case` for functions, methods, variables, modules, crates
- `PascalCase` (UpperCamelCase) for types, traits, enums, type parameters
- `SCREAMING_SNAKE_CASE` for constants and statics
- Lifetimes: short lowercase (`'a`, `'de`) — descriptive names for complex cases (`'input`)

## Ownership and Borrowing

- Borrow (`&T`) by default; take ownership only when you need to store or consume
- Never clone to satisfy the borrow checker without understanding the root cause
- Accept `&str` over `String`, `&[T]` over `Vec<T>` in function parameters
- Use `impl Into<String>` for constructors that need to own a `String`

```rust
// GOOD — borrows when ownership isn't needed
fn word_count(text: &str) -> usize {
    text.split_whitespace().count()
}

// GOOD — takes ownership in constructor via Into
fn new(name: impl Into<String>) -> Self {
    Self { name: name.into() }
}

// BAD — takes String when &str suffices
fn word_count_bad(text: String) -> usize {
    text.split_whitespace().count()
}
```

## Error Handling

- Use `Result<T, E>` and `?` for propagation — never `unwrap()` in production code
- **Libraries**: define typed errors with `thiserror`
- **Applications**: use `anyhow` for flexible error context
- Add context with `.with_context(|| format!("failed to ..."))?`
- Reserve `unwrap()` / `expect()` for tests and truly unreachable states

```rust
// GOOD — library error with thiserror
#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("failed to read config: {0}")]
    Io(#[from] std::io::Error),
    #[error("invalid config format: {0}")]
    Parse(String),
}

// GOOD — application error with anyhow
use anyhow::Context;

fn load_config(path: &str) -> anyhow::Result<Config> {
    let content = std::fs::read_to_string(path)
        .with_context(|| format!("failed to read {path}"))?;
    toml::from_str(&content)
        .with_context(|| format!("failed to parse {path}"))
}
```

## Iterators Over Loops

Prefer iterator chains for transformations; use loops for complex control flow:

```rust
// GOOD — declarative and composable
let active_emails: Vec<&str> = users.iter()
    .filter(|u| u.is_active)
    .map(|u| u.email.as_str())
    .collect();

// GOOD — loop for complex logic with early returns
for user in &users {
    if let Some(verified) = verify_email(&user.email)? {
        send_welcome(&verified)?;
    }
}
```

## Module Organization

Organize by domain, not by type:

```text
src/
├── main.rs
├── lib.rs
├── auth/           # Domain module
│   ├── mod.rs
│   ├── token.rs
│   └── middleware.rs
├── orders/         # Domain module
│   ├── mod.rs
│   ├── model.rs
│   └── service.rs
└── db/             # Infrastructure
    ├── mod.rs
    └── pool.rs
```

## Visibility

- Default to private; use `pub(crate)` for internal sharing
- Only mark `pub` what is part of the crate's public API
- Re-export public API from `lib.rs`

## References

See skill: `rust-patterns` for comprehensive Rust idioms and patterns.

### rust/hooks

# Rust Hooks

> This file extends [common/hooks.md](../common/hooks.md) with Rust-specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **cargo fmt**: Auto-format `.rs` files after edit
- **cargo clippy**: Run lint checks after editing Rust files
- **cargo check**: Verify compilation after changes (faster than `cargo build`)

### rust/patterns

# Rust Patterns

> This file extends [common/patterns.md](../common/patterns.md) with Rust-specific content.

## Repository Pattern with Traits

Encapsulate data access behind a trait:

```rust
pub trait OrderRepository: Send + Sync {
    fn find_by_id(&self, id: u64) -> Result<Option<Order>, StorageError>;
    fn find_all(&self) -> Result<Vec<Order>, StorageError>;
    fn save(&self, order: &Order) -> Result<Order, StorageError>;
    fn delete(&self, id: u64) -> Result<(), StorageError>;
}
```

Concrete implementations handle storage details (Postgres, SQLite, in-memory for tests).

## Service Layer

Business logic in service structs; inject dependencies via constructor:

```rust
pub struct OrderService {
    repo: Box<dyn OrderRepository>,
    payment: Box<dyn PaymentGateway>,
}

impl OrderService {
    pub fn new(repo: Box<dyn OrderRepository>, payment: Box<dyn PaymentGateway>) -> Self {
        Self { repo, payment }
    }

    pub fn place_order(&self, request: CreateOrderRequest) -> anyhow::Result<OrderSummary> {
        let order = Order::from(request);
        self.payment.charge(order.total())?;
        let saved = self.repo.save(&order)?;
        Ok(OrderSummary::from(saved))
    }
}
```

## Newtype Pattern for Type Safety

Prevent argument mix-ups with distinct wrapper types:

```rust
struct UserId(u64);
struct OrderId(u64);

fn get_order(user: UserId, order: OrderId) -> anyhow::Result<Order> {
    // Can't accidentally swap user and order IDs at call sites
    todo!()
}
```

## Enum State Machines

Model states as enums — make illegal states unrepresentable:

```rust
enum ConnectionState {
    Disconnected,
    Connecting { attempt: u32 },
    Connected { session_id: String },
    Failed { reason: String, retries: u32 },
}

fn handle(state: &ConnectionState) {
    match state {
        ConnectionState::Disconnected => connect(),
        ConnectionState::Connecting { attempt } if *attempt > 3 => abort(),
        ConnectionState::Connecting { .. } => wait(),
        ConnectionState::Connected { session_id } => use_session(session_id),
        ConnectionState::Failed { retries, .. } if *retries < 5 => retry(),
        ConnectionState::Failed { reason, .. } => log_failure(reason),
    }
}
```

Always match exhaustively — no wildcard `_` for business-critical enums.

## Builder Pattern

Use for structs with many optional parameters:

```rust
pub struct ServerConfig {
    host: String,
    port: u16,
    max_connections: usize,
}

impl ServerConfig {
    pub fn builder(host: impl Into<String>, port: u16) -> ServerConfigBuilder {
        ServerConfigBuilder {
            host: host.into(),
            port,
            max_connections: 100,
        }
    }
}

pub struct ServerConfigBuilder {
    host: String,
    port: u16,
    max_connections: usize,
}

impl ServerConfigBuilder {
    pub fn max_connections(mut self, n: usize) -> Self {
        self.max_connections = n;
        self
    }

    pub fn build(self) -> ServerConfig {
        ServerConfig {
            host: self.host,
            port: self.port,
            max_connections: self.max_connections,
        }
    }
}
```

## Sealed Traits for Extensibility Control

Use a private module to seal a trait, preventing external implementations:

```rust
mod private {
    pub trait Sealed {}
}

pub trait Format: private::Sealed {
    fn encode(&self, data: &[u8]) -> Vec<u8>;
}

pub struct Json;
impl private::Sealed for Json {}
impl Format for Json {
    fn encode(&self, data: &[u8]) -> Vec<u8> { todo!() }
}
```

## API Response Envelope

Consistent API responses using a generic enum:

```rust
#[derive(Debug, serde::Serialize)]
#[serde(tag = "status")]
pub enum ApiResponse<T: serde::Serialize> {
    #[serde(rename = "ok")]
    Ok { data: T },
    #[serde(rename = "error")]
    Error { message: String },
}
```

## References

See skill: `rust-patterns` for comprehensive patterns including ownership, traits, generics, concurrency, and async.

### rust/security

# Rust Security

> This file extends [common/security.md](../common/security.md) with Rust-specific content.

## Secrets Management

- Never hardcode API keys, tokens, or credentials in source code
- Use environment variables: `std::env::var("API_KEY")`
- Fail fast if required secrets are missing at startup
- Keep `.env` files in `.gitignore`

```rust
// BAD
const API_KEY: &str = "sk-abc123...";

// GOOD — environment variable with early validation
fn load_api_key() -> anyhow::Result<String> {
    std::env::var("PAYMENT_API_KEY")
        .context("PAYMENT_API_KEY must be set")
}
```

## SQL Injection Prevention

- Always use parameterized queries — never format user input into SQL strings
- Use query builder or ORM (sqlx, diesel, sea-orm) with bind parameters

```rust
// BAD — SQL injection via format string
let query = format!("SELECT * FROM users WHERE name = '{name}'");
sqlx::query(&query).fetch_one(&pool).await?;

// GOOD — parameterized query with sqlx
// Placeholder syntax varies by backend: Postgres: $1  |  MySQL: ?  |  SQLite: $1
sqlx::query("SELECT * FROM users WHERE name = $1")
    .bind(&name)
    .fetch_one(&pool)
    .await?;
```

## Input Validation

- Validate all user input at system boundaries before processing
- Use the type system to enforce invariants (newtype pattern)
- Parse, don't validate — convert unstructured data to typed structs at the boundary
- Reject invalid input with clear error messages

```rust
// Parse, don't validate — invalid states are unrepresentable
pub struct Email(String);

impl Email {
    pub fn parse(input: &str) -> Result<Self, ValidationError> {
        let trimmed = input.trim();
        let at_pos = trimmed.find('@')
            .filter(|&p| p > 0 && p < trimmed.len() - 1)
            .ok_or_else(|| ValidationError::InvalidEmail(input.to_string()))?;
        let domain = &trimmed[at_pos + 1..];
        if trimmed.len() > 254 || !domain.contains('.') {
            return Err(ValidationError::InvalidEmail(input.to_string()));
        }
        // For production use, prefer a validated email crate (e.g., `email_address`)
        Ok(Self(trimmed.to_string()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}
```

## Unsafe Code

- Minimize `unsafe` blocks — prefer safe abstractions
- Every `unsafe` block must have a `// SAFETY:` comment explaining the invariant
- Never use `unsafe` to bypass the borrow checker for convenience
- Audit all `unsafe` code during review — it is a red flag without justification
- Prefer `safe` FFI wrappers around C libraries

```rust
// GOOD — safety comment documents ALL required invariants
let widget: &Widget = {
    // SAFETY: `ptr` is non-null, aligned, points to an initialized Widget,
    // and no mutable references or mutations exist for its lifetime.
    unsafe { &*ptr }
};

// BAD — no safety justification
unsafe { &*ptr }
```

## Dependency Security

- Run `cargo audit` to scan for known CVEs in dependencies
- Run `cargo deny check` for license and advisory compliance
- Use `cargo tree` to audit transitive dependencies
- Keep dependencies updated — set up Dependabot or Renovate
- Minimize dependency count — evaluate before adding new crates

```bash
# Security audit
cargo audit

# Deny advisories, duplicate versions, and restricted licenses
cargo deny check

# Inspect dependency tree
cargo tree
cargo tree -d  # Show duplicates only
```

## Error Messages

- Never expose internal paths, stack traces, or database errors in API responses
- Log detailed errors server-side; return generic messages to clients
- Use `tracing` or `log` for structured server-side logging

```rust
// Map errors to appropriate status codes and generic messages
// (Example uses axum; adapt the response type to your framework)
match order_service.find_by_id(id) {
    Ok(order) => Ok((StatusCode::OK, Json(order))),
    Err(ServiceError::NotFound(_)) => {
        tracing::info!(order_id = id, "order not found");
        Err((StatusCode::NOT_FOUND, "Resource not found"))
    }
    Err(e) => {
        tracing::error!(order_id = id, error = %e, "unexpected error");
        Err((StatusCode::INTERNAL_SERVER_ERROR, "Internal server error"))
    }
}
```

## References

See skill: `rust-patterns` for unsafe code guidelines and ownership patterns.
See skill: `security-review` for general security checklists.

### rust/testing

# Rust Testing

> This file extends [common/testing.md](../common/testing.md) with Rust-specific content.

## Test Framework

- **`#[test]`** with `#[cfg(test)]` modules for unit tests
- **rstest** for parameterized tests and fixtures
- **proptest** for property-based testing
- **mockall** for trait-based mocking
- **`#[tokio::test]`** for async tests

## Test Organization

```text
my_crate/
├── src/
│   ├── lib.rs           # Unit tests in #[cfg(test)] modules
│   ├── auth/
│   │   └── mod.rs       # #[cfg(test)] mod tests { ... }
│   └── orders/
│       └── service.rs   # #[cfg(test)] mod tests { ... }
├── tests/               # Integration tests (each file = separate binary)
│   ├── api_test.rs
│   ├── db_test.rs
│   └── common/          # Shared test utilities
│       └── mod.rs
└── benches/             # Criterion benchmarks
    └── benchmark.rs
```

Unit tests go inside `#[cfg(test)]` modules in the same file. Integration tests go in `tests/`.

## Unit Test Pattern

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creates_user_with_valid_email() {
        let user = User::new("Alice", "alice@example.com").unwrap();
        assert_eq!(user.name, "Alice");
    }

    #[test]
    fn rejects_invalid_email() {
        let result = User::new("Bob", "not-an-email");
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("invalid email"));
    }
}
```

## Parameterized Tests

```rust
use rstest::rstest;

#[rstest]
#[case("hello", 5)]
#[case("", 0)]
#[case("rust", 4)]
fn test_string_length(#[case] input: &str, #[case] expected: usize) {
    assert_eq!(input.len(), expected);
}
```

## Async Tests

```rust
#[tokio::test]
async fn fetches_data_successfully() {
    let client = TestClient::new().await;
    let result = client.get("/data").await;
    assert!(result.is_ok());
}
```

## Mocking with mockall

Define traits in production code; generate mocks in test modules:

```rust
// Production trait — pub so integration tests can import it
pub trait UserRepository {
    fn find_by_id(&self, id: u64) -> Option<User>;
}

#[cfg(test)]
mod tests {
    use super::*;
    use mockall::predicate::eq;

    mockall::mock! {
        pub Repo {}
        impl UserRepository for Repo {
            fn find_by_id(&self, id: u64) -> Option<User>;
        }
    }

    #[test]
    fn service_returns_user_when_found() {
        let mut mock = MockRepo::new();
        mock.expect_find_by_id()
            .with(eq(42))
            .times(1)
            .returning(|_| Some(User { id: 42, name: "Alice".into() }));

        let service = UserService::new(Box::new(mock));
        let user = service.get_user(42).unwrap();
        assert_eq!(user.name, "Alice");
    }
}
```

## Test Naming

Use descriptive names that explain the scenario:
- `creates_user_with_valid_email()`
- `rejects_order_when_insufficient_stock()`
- `returns_none_when_not_found()`

## Coverage

- Target 80%+ line coverage
- Use **cargo-llvm-cov** for coverage reporting
- Focus on business logic — exclude generated code and FFI bindings

```bash
cargo llvm-cov                       # Summary
cargo llvm-cov --html                # HTML report
cargo llvm-cov --fail-under-lines 80 # Fail if below threshold
```

## Testing Commands

```bash
cargo test                       # Run all tests
cargo test -- --nocapture        # Show println output
cargo test test_name             # Run tests matching pattern
cargo test --lib                 # Unit tests only
cargo test --test api_test       # Specific integration test (tests/api_test.rs)
cargo test --doc                 # Doc tests only
```

## References

See skill: `rust-testing` for comprehensive testing patterns including property-based testing, fixtures, and benchmarking with Criterion.

### swift/coding-style

# Swift Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with Swift specific content.

## Formatting

- **SwiftFormat** for auto-formatting, **SwiftLint** for style enforcement
- `swift-format` is bundled with Xcode 16+ as an alternative

## Immutability

- Prefer `let` over `var` — define everything as `let` and only change to `var` if the compiler requires it
- Use `struct` with value semantics by default; use `class` only when identity or reference semantics are needed

## Naming

Follow [Apple API Design Guidelines](https://www.swift.org/documentation/api-design-guidelines/):

- Clarity at the point of use — omit needless words
- Name methods and properties for their roles, not their types
- Use `static let` for constants over global constants

## Error Handling

Use typed throws (Swift 6+) and pattern matching:

```swift
func load(id: String) throws(LoadError) -> Item {
    guard let data = try? read(from: path) else {
        throw .fileNotFound(id)
    }
    return try decode(data)
}
```

## Concurrency

Enable Swift 6 strict concurrency checking. Prefer:

- `Sendable` value types for data crossing isolation boundaries
- Actors for shared mutable state
- Structured concurrency (`async let`, `TaskGroup`) over unstructured `Task {}`

### swift/hooks

# Swift Hooks

> This file extends [common/hooks.md](../common/hooks.md) with Swift specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **SwiftFormat**: Auto-format `.swift` files after edit
- **SwiftLint**: Run lint checks after editing `.swift` files
- **swift build**: Type-check modified packages after edit

## Warning

Flag `print()` statements — use `os.Logger` or structured logging instead for production code.

### swift/patterns

# Swift Patterns

> This file extends [common/patterns.md](../common/patterns.md) with Swift specific content.

## Protocol-Oriented Design

Define small, focused protocols. Use protocol extensions for shared defaults:

```swift
protocol Repository: Sendable {
    associatedtype Item: Identifiable & Sendable
    func find(by id: Item.ID) async throws -> Item?
    func save(_ item: Item) async throws
}
```

## Value Types

- Use structs for data transfer objects and models
- Use enums with associated values to model distinct states:

```swift
enum LoadState<T: Sendable>: Sendable {
    case idle
    case loading
    case loaded(T)
    case failed(Error)
}
```

## Actor Pattern

Use actors for shared mutable state instead of locks or dispatch queues:

```swift
actor Cache<Key: Hashable & Sendable, Value: Sendable> {
    private var storage: [Key: Value] = [:]

    func get(_ key: Key) -> Value? { storage[key] }
    func set(_ key: Key, value: Value) { storage[key] = value }
}
```

## Dependency Injection

Inject protocols with default parameters — production uses defaults, tests inject mocks:

```swift
struct UserService {
    private let repository: any UserRepository

    init(repository: any UserRepository = DefaultUserRepository()) {
        self.repository = repository
    }
}
```

## References

See skill: `swift-actor-persistence` for actor-based persistence patterns.
See skill: `swift-protocol-di-testing` for protocol-based DI and testing.

### swift/security

# Swift Security

> This file extends [common/security.md](../common/security.md) with Swift specific content.

## Secret Management

- Use **Keychain Services** for sensitive data (tokens, passwords, keys) — never `UserDefaults`
- Use environment variables or `.xcconfig` files for build-time secrets
- Never hardcode secrets in source — decompilation tools extract them trivially

```swift
let apiKey = ProcessInfo.processInfo.environment["API_KEY"]
guard let apiKey, !apiKey.isEmpty else {
    fatalError("API_KEY not configured")
}
```

## Transport Security

- App Transport Security (ATS) is enforced by default — do not disable it
- Use certificate pinning for critical endpoints
- Validate all server certificates

## Input Validation

- Sanitize all user input before display to prevent injection
- Use `URL(string:)` with validation rather than force-unwrapping
- Validate data from external sources (APIs, deep links, pasteboard) before processing

### swift/testing

# Swift Testing

> This file extends [common/testing.md](../common/testing.md) with Swift specific content.

## Framework

Use **Swift Testing** (`import Testing`) for new tests. Use `@Test` and `#expect`:

```swift
@Test("User creation validates email")
func userCreationValidatesEmail() throws {
    #expect(throws: ValidationError.invalidEmail) {
        try User(email: "not-an-email")
    }
}
```

## Test Isolation

Each test gets a fresh instance — set up in `init`, tear down in `deinit`. No shared mutable state between tests.

## Parameterized Tests

```swift
@Test("Validates formats", arguments: ["json", "xml", "csv"])
func validatesFormat(format: String) throws {
    let parser = try Parser(format: format)
    #expect(parser.isValid)
}
```

## Coverage

```bash
swift test --enable-code-coverage
```

## Reference

See skill: `swift-protocol-di-testing` for protocol-based dependency injection and mock patterns with Swift Testing.

### typescript/coding-style

# TypeScript/JavaScript Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with TypeScript/JavaScript specific content.

## Types and Interfaces

Use types to make public APIs, shared models, and component props explicit, readable, and reusable.

### Public APIs

- Add parameter and return types to exported functions, shared utilities, and public class methods
- Let TypeScript infer obvious local variable types
- Extract repeated inline object shapes into named types or interfaces

```typescript
// WRONG: Exported function without explicit types
export function formatUser(user) {
  return `${user.firstName} ${user.lastName}`
}

// CORRECT: Explicit types on public APIs
interface User {
  firstName: string
  lastName: string
}

export function formatUser(user: User): string {
  return `${user.firstName} ${user.lastName}`
}
```

### Interfaces vs. Type Aliases

- Use `interface` for object shapes that may be extended or implemented
- Use `type` for unions, intersections, tuples, mapped types, and utility types
- Prefer string literal unions over `enum` unless an `enum` is required for interoperability

```typescript
interface User {
  id: string
  email: string
}

type UserRole = 'admin' | 'member'
type UserWithRole = User & {
  role: UserRole
}
```

### Avoid `any`

- Avoid `any` in application code
- Use `unknown` for external or untrusted input, then narrow it safely
- Use generics when a value's type depends on the caller

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

### React Props

- Define component props with a named `interface` or `type`
- Type callback props explicitly
- Do not use `React.FC` unless there is a specific reason to do so

```typescript
interface User {
  id: string
  email: string
}

interface UserCardProps {
  user: User
  onSelect: (id: string) => void
}

function UserCard({ user, onSelect }: UserCardProps) {
  return <button onClick={() => onSelect(user.id)}>{user.email}</button>
}
```

### JavaScript Files

- In `.js` and `.jsx` files, use JSDoc when types improve clarity and a TypeScript migration is not practical
- Keep JSDoc aligned with runtime behavior

```javascript
/**
 * @param {{ firstName: string, lastName: string }} user
 * @returns {string}
 */
export function formatUser(user) {
  return `${user.firstName} ${user.lastName}`
}
```

## Immutability

Use spread operator for immutable updates:

```typescript
interface User {
  id: string
  name: string
}

// WRONG: Mutation
function updateUser(user: User, name: string): User {
  user.name = name // MUTATION!
  return user
}

// CORRECT: Immutability
function updateUser(user: Readonly<User>, name: string): User {
  return {
    ...user,
    name
  }
}
```

## Error Handling

Use async/await with try-catch and narrow unknown errors safely:

```typescript
interface User {
  id: string
  email: string
}

declare function riskyOperation(userId: string): Promise<User>

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'Unexpected error'
}

const logger = {
  error: (message: string, error: unknown) => {
    // Replace with your production logger (for example, pino or winston).
  }
}

async function loadUser(userId: string): Promise<User> {
  try {
    const result = await riskyOperation(userId)
    return result
  } catch (error: unknown) {
    logger.error('Operation failed', error)
    throw new Error(getErrorMessage(error))
  }
}
```

## Input Validation

Use Zod for schema-based validation and infer types from the schema:

```typescript
import { z } from 'zod'

const userSchema = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(150)
})

type UserInput = z.infer<typeof userSchema>

const validated: UserInput = userSchema.parse(input)
```

## Console.log

- No `console.log` statements in production code
- Use proper logging libraries instead
- See hooks for automatic detection

### typescript/hooks

# TypeScript/JavaScript Hooks

> This file extends [common/hooks.md](../common/hooks.md) with TypeScript/JavaScript specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **Prettier**: Auto-format JS/TS files after edit
- **TypeScript check**: Run `tsc` after editing `.ts`/`.tsx` files
- **console.log warning**: Warn about `console.log` in edited files

## Stop Hooks

- **console.log audit**: Check all modified files for `console.log` before session ends

### typescript/patterns

# TypeScript/JavaScript Patterns

> This file extends [common/patterns.md](../common/patterns.md) with TypeScript/JavaScript specific content.

## API Response Format

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    total: number
    page: number
    limit: number
  }
}
```

## Custom Hooks Pattern

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

## Repository Pattern

```typescript
interface Repository<T> {
  findAll(filters?: Filters): Promise<T[]>
  findById(id: string): Promise<T | null>
  create(data: CreateDto): Promise<T>
  update(id: string, data: UpdateDto): Promise<T>
  delete(id: string): Promise<void>
}
```

### typescript/security

# TypeScript/JavaScript Security

> This file extends [common/security.md](../common/security.md) with TypeScript/JavaScript specific content.

## Secret Management

```typescript
// NEVER: Hardcoded secrets
const apiKey = "sk-proj-xxxxx"

// ALWAYS: Environment variables
const apiKey = process.env.API_KEY

if (!apiKey) {
  throw new Error('API_KEY not configured')
}
```

## Agent Support

- Use **security-reviewer** skill for comprehensive security audits

### typescript/testing

# TypeScript/JavaScript Testing

> This file extends [common/testing.md](../common/testing.md) with TypeScript/JavaScript specific content.

## E2E Testing

Use **Playwright** as the E2E testing framework for critical user flows.

## Agent Support

- **e2e-runner** - Playwright E2E testing specialist

### vue/coding-style

# Vue Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with Vue specific content.

## SFC Structure

- Always `<script setup lang="ts">` with the Composition API. No Options API in new code.
- Block order inside a `.vue` file: `<script setup>`, then `<template>`, then `<style scoped>`. One component per file.
- Naming: component files PascalCase (`AuctionCard.vue`), composables camelCase prefixed `useXxx` (`useAuctionTimer`).
- Format with Prettier plus ESLint flat config using `eslint-plugin-vue` (`vue/vue3-recommended`). Type-check with `vue-tsc`.

## Reactivity Discipline

- `ref` is the primary state API. Mutate via `.value` in script, auto-unwrapped only at template top level.
- Nested `ref` inside arrays, `Map`, or `Set` still needs `.value` to read.
- Reach for `reactive` only for grouped object state. Never reassign a whole `reactive` object.
- Never destructure a `reactive` object or a Pinia store without `toRefs` / `storeToRefs`. Plain destructure silently drops reactivity.

## Computed and Watchers

- `computed` getters must be pure: no side effects, no async, no DOM access.
- 3.4+ `computed` only triggers when the returned value changes. Return the prior object unchanged when equal to skip downstream updates.
- `watch` is lazy. Pass a getter for a reactive property (`watch(() => x.value, ...)`), not the bare reactive object.
- `watchEffect` is eager and stops tracking dependencies after its first `await`.

## Lifecycle and DOM

- Register lifecycle hooks synchronously inside `setup` (`onMounted`, `onUnmounted`).
- Clean up timers, listeners, and subscriptions in `onUnmounted`.
- Read or measure the DOM only after `await nextTick()`.

## Macros and Templates

- Macros: `defineProps` / `defineEmits` (tuple form `change: [id: number]`), `defineModel` (3.4+) for `v-model`, `withDefaults` or 3.5+ reactive-props-destructure for defaults, `defineExpose` for the public ref API.
- Put a `:key` on every `v-for`, a stable unique primitive. Never the array index, never an object.
- Never put `v-if` and `v-for` on the same element. Wrap with `<template v-for>` plus an inner `v-if`, or precompute a filtered list.

```vue
<script setup lang="ts">
const props = defineProps<{ id: number }>()
const emit = defineEmits<{ change: [id: number] }>()
const open = defineModel<boolean>('open', { default: false })
</script>
```

## Reference

- ECC skills: `frontend-patterns`, `vite-patterns`.
- Docs: <https://vuejs.org/api/sfc-script-setup.html> · <https://vuejs.org/guide/essentials/reactivity-fundamentals.html> · <https://eslint.vuejs.org/>

### vue/hooks

# Vue Hooks

> This file extends [common/hooks.md](../common/hooks.md) with Vue specific content.

## PostToolUse Targets

Run on `*.vue`, `*.ts`, and `*.tsx` after edits. Scope to changed files where possible.

## Typecheck

- Use `vue-tsc --noEmit` for SFC plus TypeScript checking. Plain `tsc` cannot read `.vue` single-file components, so it must not be the typecheck hook for this project.
- Typecheck is project-wide. Debounce or scope it so a save-on-every-keystroke loop does not stall the editor.

## Lint and Format

- `eslint --fix` with `eslint-plugin-vue` (flat-config `vue/vue3-recommended`) covers both template and script lint.
- `prettier --write` for formatting. Prefer Prettier-via-ESLint over a separate Prettier pass to avoid double formatting and fight loops.

## Architecture Boundaries

- Optional: enforce Feature-Sliced Design slice boundaries with `@feature-sliced/steiger` or `eslint-plugin-boundaries` to block deep cross-slice imports.

## Sequencing

```bash
# changed files only
eslint --fix "$FILE"
prettier --write "$FILE"
# project-wide, debounced
vue-tsc --noEmit
```

- Run lint and format per-file first, then the project-wide typecheck last so type errors reflect the formatted source.

## Reference

- ECC skills: `frontend-patterns`, `vite-patterns`.
- Docs: <https://github.com/vuejs/language-tools> (vue-tsc) · <https://eslint.vuejs.org/> · <https://github.com/feature-sliced/steiger>

### vue/patterns

# Vue Patterns

> This file extends [common/patterns.md](../common/patterns.md) with Vue specific content.

## Composables

- The composable (`useXxx`) is the reusable-logic unit. In Feature-Sliced Design it lives in the slice `model` segment.
- Accept `MaybeRefOrGetter<T>` inputs and normalize with `toValue`, so callers can pass a ref, a getter, or a raw value.
- Return `toRefs(reactive(...))` so consumers can destructure without losing reactivity.
- A composable that uses lifecycle hooks or `provide` / `inject` must be called inside a component `setup`, not lazily or conditionally.

## Props, Emits, v-model

- Type-based `defineProps<Props>()` and tuple-form `defineEmits<{ change: [id: number] }>()`.
- `defineModel<T>('name', { default })` for two-way binding. It compiles to a prop plus an `update:*` emit.

## Provide / Inject

- Use `provide` / `inject` for tree-scoped data without prop drilling.
- Type-safe collision-free keys: `const key = Symbol() as InjectionKey<T>`.
- The provider owns mutations. Expose a `readonly` ref plus an explicit updater function, never a raw mutable ref.

## Pinia (FSD model segment)

- Prefer setup stores: `ref` is state, `computed` is getters, `function` is actions.
- Setup stores do not get `$reset` for free. Define your own.
- Use `storeToRefs` for state and getters. Destructure actions directly off the store.
- Never persist raw auth tokens to `localStorage`.

## vue-router

- Lazy-load route components with dynamic `import()`.
- A global `beforeEach` auth gate keyed on `meta.requiresAuth`. Guards return `false` (cancel), a route location (redirect), or `undefined` / `true` (continue).
- Watch `() => route.params.id`, not the whole `route` object.

## vue-query (server cache)

- `@tanstack/vue-query` owns server-cache state. Pinia owns client state.
- Put request functions plus `queryOptions` factories in the FSD `api` segment.
- Critical: put the ref or computed ITSELF in the query key, never `.value`. Passing `.value` freezes the key and kills reactive refetch.

```ts
useQuery({ queryKey: ['auction', id], queryFn: () => fetchAuction(toValue(id)) })
// after a mutation
queryClient.invalidateQueries({ queryKey: ['auction', id] })
```

## Reference

- ECC skills: `frontend-patterns`, `vite-patterns`.
- Docs: <https://pinia.vuejs.org/> · <https://router.vuejs.org/> · <https://tanstack.com/query/latest/docs/framework/vue/overview> · <https://vuejs.org/guide/reusability/composables.html>

### vue/security

# Vue Security

> This file extends [common/security.md](../common/security.md) with Vue specific content.

## What Vue Escapes Automatically

- Text interpolation `{{ }}` and dynamic attribute bindings (`:title`) are auto-escaped. The vectors below are NOT protected.

## Rule No.1: Templates from Trusted Sources Only

- Never use non-trusted content as a component template. No runtime template compilation from user input.
- No user-controlled `:is` that resolves a component from an arbitrary string.

## v-html and Render Functions

- `v-html` bypasses escaping and is a direct XSS vector. Avoid it on user content.
- If unavoidable, sanitize with DOMPurify (allowlist config) before binding, or render in a sandboxed iframe. Vue itself recommends sanitizing on the backend before persisting.
- Render-function and scoped-slot output carry the same risk. Passing user HTML through `h()` with `innerHTML` is `v-html` by another name. Sanitize first.

## URL, Style, and Event Injection

- `:href` and `:src` are not escaped. `javascript:` URLs execute. Validate the scheme, allow `http` / `https` / `mailto` only. Vue docs reference `@braintree/sanitize-url`, but sanitize on the backend before persisting.
- `:style` with user input is unsafe (CSS exfiltration). Use object syntax with whitelisted properties, never a raw user string.
- Never bind user input to `onclick`, `onfocus`, or any event attribute.

## Client Bundle Secrets

- Anything in `import.meta.env.VITE_*` ships to the browser. Keep API keys and tokens server-side.
- Use httpOnly cookies for session tokens. Never bundle credentials into the client.

```vue
<!-- unsafe -->
<div v-html="userBio" />
<!-- safe -->
<div v-html="sanitize(userBio)" />
```

## Reference

- ECC skills: `frontend-patterns`, `vite-patterns`.
- Docs: <https://vuejs.org/guide/best-practices/security.html> · <https://github.com/cure53/DOMPurify> · <https://github.com/braintree/sanitize-url>

### vue/testing

# Vue Testing

> This file extends [common/testing.md](../common/testing.md) with Vue specific content.

## Stack

- Vitest (Vite-native runner) plus `@vue/test-utils`. `create-vue` scaffolds `@vitejs/plugin-vue`.
- DOM environment via `happy-dom` or `jsdom`, set in `vite.config.ts` under `test.environment`.

## Rendering and Async

- `mount` for a full render. `shallowMount` to stub all child components.
- `trigger` and `setValue` return promises, `await` them.
- `flushPromises` flushes resolved promise handlers. `nextTick` settles the DOM after a state change.

## What to Test

- Test the public interface only: props, emitted events, slots, rendered output.
- Do not assert private state or internal methods, and do not rely solely on snapshots.

## Composables

- Composables that use only reactivity APIs unit-test directly: call the function, assert on the returned refs.
- Composables that use lifecycle hooks or `inject` must be tested through a host component.

## Pinia

- In components: `createTestingPinia()` from `@pinia/testing`, passed via `global.plugins`. Actions are stubbed by default, set `stubActions: false` to run them. `createSpy: vi.fn` is required under Vitest (no Jest globals).
- In isolation: `beforeEach(() => setActivePinia(createPinia()))` gives a fresh store per test and prevents state leakage.

## Mount Config

- `global.plugins`, `global.stubs` (stubs `Transition` / `TransitionGroup` by default), `global.mocks` (e.g. `$router`), `global.provide` (for `inject`, Symbol keys supported).
- `RouterLinkStub` stubs `router-link` without mounting a full router.

```ts
const wrapper = mount(AuctionCard, {
  props: { id: 1 },
  global: { plugins: [createTestingPinia({ createSpy: vi.fn })] },
})
await wrapper.find('button').trigger('click')
expect(wrapper.emitted('bid')).toBeTruthy()
```

## Reference

- ECC skills: `frontend-patterns`, `vite-patterns`.
- Docs: <https://test-utils.vuejs.org/api/> · <https://pinia.vuejs.org/cookbook/testing.html> · <https://vitest.dev/>

### web/coding-style

> This file extends [common/coding-style.md](../common/coding-style.md) with web-specific frontend content.

# Web Coding Style

## File Organization

Organize by feature or surface area, not by file type:

```text
src/
├── components/
│   ├── hero/
│   │   ├── Hero.tsx
│   │   ├── HeroVisual.tsx
│   │   └── hero.css
│   ├── scrolly-section/
│   │   ├── ScrollySection.tsx
│   │   ├── StickyVisual.tsx
│   │   └── scrolly.css
│   └── ui/
│       ├── Button.tsx
│       ├── SurfaceCard.tsx
│       └── AnimatedText.tsx
├── hooks/
│   ├── useReducedMotion.ts
│   └── useScrollProgress.ts
├── lib/
│   ├── animation.ts
│   └── color.ts
└── styles/
    ├── tokens.css
    ├── typography.css
    └── global.css
```

## CSS Custom Properties

Define design tokens as variables. Do not hardcode palette, typography, or spacing repeatedly:

```css
:root {
  --color-surface: oklch(98% 0 0);
  --color-text: oklch(18% 0 0);
  --color-accent: oklch(68% 0.21 250);

  --text-base: clamp(1rem, 0.92rem + 0.4vw, 1.125rem);
  --text-hero: clamp(3rem, 1rem + 7vw, 8rem);

  --space-section: clamp(4rem, 3rem + 5vw, 10rem);

  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
}
```

## Animation-Only Properties

Prefer compositor-friendly motion:
- `transform`
- `opacity`
- `clip-path`
- `filter` (sparingly)

Avoid animating layout-bound properties:
- `width`
- `height`
- `top`
- `left`
- `margin`
- `padding`
- `border`
- `font-size`

## Semantic HTML First

```html
<header>
  <nav aria-label="Main navigation">...</nav>
</header>
<main>
  <section aria-labelledby="hero-heading">
    <h1 id="hero-heading">...</h1>
  </section>
</main>
<footer>...</footer>
```

Do not reach for generic wrapper `div` stacks when a semantic element exists.

## Naming

- Components: PascalCase (`ScrollySection`, `SurfaceCard`)
- Hooks: `use` prefix (`useReducedMotion`)
- CSS classes: kebab-case or utility classes
- Animation timelines: camelCase with intent (`heroRevealTl`)

### web/design-quality

> This file extends [common/patterns.md](../common/patterns.md) with web-specific design-quality guidance.

# Web Design Quality Standards

## Anti-Template Policy

Do not ship generic template-looking UI. Frontend output should look intentional, opinionated, and specific to the product.

### Banned Patterns

- Default card grids with uniform spacing and no hierarchy
- Stock hero section with centered headline, gradient blob, and generic CTA
- Unmodified library defaults passed off as finished design
- Flat layouts with no layering, depth, or motion
- Uniform radius, spacing, and shadows across every component
- Safe gray-on-white styling with one decorative accent color
- Dashboard-by-numbers layouts with sidebar + cards + charts and no point of view
- Default font stacks used without a deliberate reason

### Required Qualities

Every meaningful frontend surface should demonstrate at least four of these:

1. Clear hierarchy through scale contrast
2. Intentional rhythm in spacing, not uniform padding everywhere
3. Depth or layering through overlap, shadows, surfaces, or motion
4. Typography with character and a real pairing strategy
5. Color used semantically, not just decoratively
6. Hover, focus, and active states that feel designed
7. Grid-breaking editorial or bento composition where appropriate
8. Texture, grain, or atmosphere when it fits the visual direction
9. Motion that clarifies flow instead of distracting from it
10. Data visualization treated as part of the design system, not an afterthought

## Before Writing Frontend Code

1. Pick a specific style direction. Avoid vague defaults like "clean minimal".
2. Define a palette intentionally.
3. Choose typography deliberately.
4. Gather at least a small set of real references.
5. Use ECC design/frontend skills where relevant.

## Worthwhile Style Directions

- Editorial / magazine
- Neo-brutalism
- Glassmorphism with real depth
- Dark luxury or light luxury with disciplined contrast
- Bento layouts
- Scrollytelling
- 3D integration
- Swiss / International
- Retro-futurism

Do not default to dark mode automatically. Choose the visual direction the product actually wants.

## Component Checklist

- [ ] Does it avoid looking like a default Tailwind or shadcn template?
- [ ] Does it have intentional hover/focus/active states?
- [ ] Does it use hierarchy rather than uniform emphasis?
- [ ] Would this look believable in a real product screenshot?
- [ ] If it supports both themes, do both light and dark feel intentional?

### web/hooks

> This file extends [common/hooks.md](../common/hooks.md) with web-specific hook recommendations.

# Web Hooks

## Recommended PostToolUse Hooks

Prefer project-local tooling. Do not wire hooks to remote one-off package execution.

### Format on Save

Use the project's existing formatter entrypoint after edits:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "command": "pnpm prettier --write \"$FILE_PATH\"",
        "description": "Format edited frontend files"
      }
    ]
  }
}
```

Equivalent local commands via `yarn prettier` or `npm exec prettier --` are fine when they use repo-owned dependencies.

### Lint Check

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "command": "pnpm eslint --fix \"$FILE_PATH\"",
        "description": "Run ESLint on edited frontend files"
      }
    ]
  }
}
```

### Type Check

Use `--incremental` so re-runs reuse the previous `.tsbuildinfo` (1-3s on unchanged code instead of 30-60s every time). Wrap in `timeout` so a stuck tsc gets reaped by the OS instead of accumulating across edits — this prevents the multi-process buildup that happens when edits fire faster than tsc finishes.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "command": "timeout 60 pnpm tsc --noEmit --pretty false --incremental --tsBuildInfoFile node_modules/.cache/tsc-hook.tsbuildinfo",
        "description": "Type-check after frontend edits (incremental + timeout-capped)"
      }
    ]
  }
}
```

**Why both flags matter:**
- Without `--incremental`, every edit re-checks the entire program from scratch. On a real Next.js project this stacks fast: edits at 5-10s intervals + 30-60s tsc runs = N concurrent tsc processes.
- Without `timeout`, a tsc that hangs (transitive dep change, type-checker stuck on a recursive type) never exits and orphans when the parent shell does.
- `--tsBuildInfoFile` is required because `--noEmit` normally suppresses the buildinfo write; specifying the path explicitly keeps incremental working.

If you're on Windows without GNU coreutils, swap `timeout 60` for a PowerShell wrapper or rely on a Stop/SessionEnd hook to sweep stale tsc processes.

### CSS Lint

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "command": "pnpm stylelint --fix \"$FILE_PATH\"",
        "description": "Lint edited stylesheets"
      }
    ]
  }
}
```

## PreToolUse Hooks

### Guard File Size

Block oversized writes from tool input content, not from a file that may not exist yet:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write",
        "command": "node -e \"let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const i=JSON.parse(d);const c=i.tool_input?.content||'';const lines=c.split('\\n').length;if(lines>800){console.error('[Hook] BLOCKED: File exceeds 800 lines ('+lines+' lines)');console.error('[Hook] Split into smaller modules');process.exit(2)}console.log(d)})\"",
        "description": "Block writes that exceed 800 lines"
      }
    ]
  }
}
```

## Stop Hooks

### Final Build Verification

```json
{
  "hooks": {
    "Stop": [
      {
        "command": "pnpm build",
        "description": "Verify the production build at session end"
      }
    ]
  }
}
```

## Ordering

Recommended order:
1. format
2. lint
3. type check
4. build verification

### web/patterns

> This file extends [common/patterns.md](../common/patterns.md) with web-specific patterns.

# Web Patterns

## Component Composition

### Compound Components

Use compound components when related UI shares state and interaction semantics:

```tsx
<Tabs defaultValue="overview">
  <Tabs.List>
    <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
    <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="overview">...</Tabs.Content>
  <Tabs.Content value="settings">...</Tabs.Content>
</Tabs>
```

- Parent owns state
- Children consume via context
- Prefer this over prop drilling for complex widgets

### Render Props / Slots

- Use render props or slot patterns when behavior is shared but markup must vary
- Keep keyboard handling, ARIA, and focus logic in the headless layer

### Container / Presentational Split

- Container components own data loading and side effects
- Presentational components receive props and render UI
- Presentational components should stay pure

## State Management

Treat these separately:

| Concern | Tooling |
|---------|---------|
| Server state | TanStack Query, SWR, tRPC |
| Client state | Zustand, Jotai, signals |
| URL state | search params, route segments |
| Form state | React Hook Form or equivalent |

- Do not duplicate server state into client stores
- Derive values instead of storing redundant computed state

## URL As State

Persist shareable state in the URL:
- filters
- sort order
- pagination
- active tab
- search query

## Data Fetching

### Stale-While-Revalidate

- Return cached data immediately
- Revalidate in the background
- Prefer existing libraries instead of rolling this by hand

### Optimistic Updates

- Snapshot current state
- Apply optimistic update
- Roll back on failure
- Emit visible error feedback when rolling back

### Parallel Loading

- Fetch independent data in parallel
- Avoid parent-child request waterfalls
- Prefetch likely next routes or states when justified

### web/performance

> This file extends [common/performance.md](../common/performance.md) with web-specific performance content.

# Web Performance Rules

## Core Web Vitals Targets

| Metric | Target |
|--------|--------|
| LCP | < 2.5s |
| INP | < 200ms |
| CLS | < 0.1 |
| FCP | < 1.5s |
| TBT | < 200ms |

## Bundle Budget

| Page Type | JS Budget (gzipped) | CSS Budget |
|-----------|---------------------|------------|
| Landing page | < 150kb | < 30kb |
| App page | < 300kb | < 50kb |
| Microsite | < 80kb | < 15kb |

## Loading Strategy

1. Inline critical above-the-fold CSS where justified
2. Preload the hero image and primary font only
3. Defer non-critical CSS or JS
4. Dynamically import heavy libraries

```js
const gsapModule = await import('gsap');
const { ScrollTrigger } = await import('gsap/ScrollTrigger');
```

## Image Optimization

- Explicit `width` and `height`
- `loading="eager"` plus `fetchpriority="high"` for hero media only
- `loading="lazy"` for below-the-fold assets
- Prefer AVIF or WebP with fallbacks
- Never ship source images far beyond rendered size

## Font Loading

- Max two font families unless there is a clear exception
- `font-display: swap`
- Subset where possible
- Preload only the truly critical weight/style

## Animation Performance

- Animate compositor-friendly properties only
- Use `will-change` narrowly and remove it when done
- Prefer CSS for simple transitions
- Use `requestAnimationFrame` or established animation libraries for JS motion
- Avoid scroll handler churn; use IntersectionObserver or well-behaved libraries

## Performance Checklist

- [ ] All images have explicit dimensions
- [ ] No accidental render-blocking resources
- [ ] No layout shifts from dynamic content
- [ ] Motion stays on compositor-friendly properties
- [ ] Third-party scripts load async/defer and only when needed

### web/security

> This file extends [common/security.md](../common/security.md) with web-specific security content.

# Web Security Rules

## Content Security Policy

Always configure a production CSP.

### Nonce-Based CSP

Use a per-request nonce for scripts instead of `'unsafe-inline'`.

```text
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{RANDOM}' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://*.example.com;
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
```

Adjust origins to the project. Do not cargo-cult this block unchanged.

## XSS Prevention

- Never inject unsanitized HTML
- Avoid `innerHTML` / `dangerouslySetInnerHTML` unless sanitized first
- Escape dynamic template values
- Sanitize user HTML with a vetted local sanitizer when absolutely necessary

## Third-Party Scripts

- Load asynchronously
- Use SRI when serving from a CDN
- Audit quarterly
- Prefer self-hosting for critical dependencies when practical

## HTTPS and Headers

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## Forms

- CSRF protection on state-changing forms
- Rate limiting on submission endpoints
- Validate client and server side
- Prefer honeypots or light anti-abuse controls over heavy-handed CAPTCHA defaults

### web/testing

> This file extends [common/testing.md](../common/testing.md) with web-specific testing content.

# Web Testing Rules

## Priority Order

### 1. Visual Regression

- Screenshot key breakpoints: 320, 768, 1024, 1440
- Test hero sections, scrollytelling sections, and meaningful states
- Use Playwright screenshots for visual-heavy work
- If both themes exist, test both

### 2. Accessibility

- Run automated accessibility checks
- Test keyboard navigation
- Verify reduced-motion behavior
- Verify color contrast

### 3. Performance

- Run Lighthouse or equivalent against meaningful pages
- Keep CWV targets from [performance.md](performance.md)

### 4. Cross-Browser

- Minimum: Chrome, Firefox, Safari
- Test scrolling, motion, and fallback behavior

### 5. Responsive

- Test 320, 375, 768, 1024, 1440, 1920
- Verify no overflow
- Verify touch interactions

## E2E Shape

```ts
import { test, expect } from '@playwright/test';

test('landing hero loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
});
```

- Avoid flaky timeout-based assertions
- Prefer deterministic waits

## Unit Tests

- Test utilities, data transforms, and custom hooks
- For highly visual components, visual regression often carries more signal than brittle markup assertions
- Visual regression supplements coverage targets; it does not replace them

## Workflow pack: Full harness

The maximal engineering harness in one pack: 278 skills, 67 agents, 94 commands, and the full rules corpus — every discipline, role, and command, unabridged.

### Roles

- **a11y-architect** — Accessibility Architect specializing in WCAG 2.2 compliance for Web and Native platforms. Use PROACTIVELY when designing UI components, establishing design systems, or auditing code for inclusive user experiences.
- **agent-evaluator** — Evaluates agent output against 5-axis quality rubric (accuracy, completeness, clarity, actionability, conciseness). Use after any non-trivial task when the user wants a quality assessment, or when the agent-self-evaluation skill is active. Produces structured scorecard with evidence and improvement suggestions.
- **architect** — Software architecture specialist for system design, scalability, and technical decision-making. Use PROACTIVELY when planning new features, refactoring large systems, or making architectural decisions.
- **build-error-resolver** — Build and TypeScript error resolution specialist. Use PROACTIVELY when build fails or type errors occur. Fixes build/type errors only with minimal diffs, no architectural edits. Focuses on getting the build green quickly.
- **chief-of-staff** — Personal communication chief of staff that triages email, Slack, LINE, and Messenger. Classifies messages into 4 tiers (skip/info_only/meeting_info/action_required), generates draft replies, and enforces post-send follow-through via hooks. Use when managing multi-channel communication workflows.
- **code-architect** — Designs feature architectures by analyzing existing codebase patterns and conventions, then providing implementation blueprints with concrete files, interfaces, data flow, and build order.
- **code-explorer** — Deeply analyzes existing codebase features by tracing execution paths, mapping architecture layers, and documenting dependencies to inform new development.
- **code-reviewer** — Expert code review specialist. Proactively reviews code for quality, security, and maintainability. Use immediately after writing or modifying code. MUST BE USED for all code changes.
- **code-simplifier** — Simplifies and refines code for clarity, consistency, and maintainability while preserving behavior. Focus on recently modified code unless instructed otherwise.
- **comment-analyzer** — Analyze code comments for accuracy, completeness, maintainability, and comment rot risk.
- **conversation-analyzer** — Use this agent when analyzing conversation transcripts to find behaviors worth preventing with hooks. Triggered by /hookify without arguments.
- **cpp-build-resolver** — C++ build, CMake, and compilation error resolution specialist. Fixes build errors, linker issues, and template errors with minimal changes. Use when C++ builds fail.
- **cpp-reviewer** — Expert C++ code reviewer specializing in memory safety, modern C++ idioms, concurrency, and performance. Use for all C++ code changes. MUST BE USED for C++ projects.
- **csharp-reviewer** — Expert C# code reviewer specializing in .NET conventions, async patterns, security, nullable reference types, and performance. Use for all C# code changes. MUST BE USED for C# projects.
- **dart-build-resolver** — Dart/Flutter build, analysis, and dependency error resolution specialist. Fixes `dart analyze` errors, Flutter compilation failures, pub dependency conflicts, and build_runner issues with minimal, surgical changes. Use when Dart/Flutter builds fail.
- **database-reviewer** — PostgreSQL database specialist for query optimization, schema design, security, and performance. Use PROACTIVELY when writing SQL, creating migrations, designing schemas, or troubleshooting database performance. Incorporates Supabase best practices.
- **django-build-resolver** — Django/Python build, migration, and dependency error resolution specialist. Fixes pip/Poetry errors, migration conflicts, import errors, Django configuration issues, and collectstatic failures with minimal changes. Use when Django setup or startup fails.
- **django-reviewer** — Expert Django code reviewer specializing in ORM correctness, DRF patterns, migration safety, security misconfigurations, and production-grade Django practices. Use for all Django code changes. MUST BE USED for Django projects.
- **doc-updater** — Documentation and codemap specialist. Use PROACTIVELY for updating codemaps and documentation. Runs /update-codemaps and /update-docs, generates docs/CODEMAPS/*, updates READMEs and guides.
- **docs-lookup** — When the user asks how to use a library, framework, or API or needs up-to-date code examples, use Context7 MCP to fetch current documentation and return answers with examples. Invoke for docs/API/setup questions.
- **e2e-runner** — End-to-end testing specialist using Vercel Agent Browser (preferred) with Playwright fallback. Use PROACTIVELY for generating, maintaining, and running E2E tests. Manages test journeys, quarantines flaky tests, uploads artifacts (screenshots, videos, traces), and ensures critical user flows work.
- **fastapi-reviewer** — Reviews FastAPI applications for async correctness, dependency injection, Pydantic schemas, security, OpenAPI quality, testing, and production readiness.
- **flutter-reviewer** — Flutter and Dart code reviewer. Reviews Flutter code for widget best practices, state management patterns, Dart idioms, performance pitfalls, accessibility, and clean architecture violations. Library-agnostic — works with any state management solution and tooling.
- **fsharp-reviewer** — Expert F# code reviewer specializing in functional idioms, type safety, pattern matching, computation expressions, and performance. Use for all F# code changes. MUST BE USED for F# projects.
- **gan-evaluator** — GAN Harness — Evaluator agent. Tests the live running application via Playwright, scores against rubric, and provides actionable feedback to the Generator.
- **gan-generator** — GAN Harness — Generator agent. Implements features according to the spec, reads evaluator feedback, and iterates until quality threshold is met.
- **gan-planner** — GAN Harness — Planner agent. Expands a one-line prompt into a full product specification with features, sprints, evaluation criteria, and design direction.
- **go-build-resolver** — Go build, vet, and compilation error resolution specialist. Fixes build errors, go vet issues, and linter warnings with minimal changes. Use when Go builds fail.
- **go-reviewer** — Expert Go code reviewer specializing in idiomatic Go, concurrency patterns, error handling, and performance. Use for all Go code changes. MUST BE USED for Go projects.
- **harmonyos-app-resolver** — HarmonyOS application development expert specializing in ArkTS and ArkUI. Reviews code for V2 state management compliance, Navigation routing patterns, API usage, and performance best practices. Use for HarmonyOS/OpenHarmony projects.
- **harness-optimizer** — Analyze and improve the local agent harness configuration for reliability, cost, and throughput.
- **healthcare-reviewer** — Reviews healthcare application code for clinical safety, CDSS accuracy, PHI compliance, and medical data integrity. Specialized for EMR/EHR, clinical decision support, and health information systems.
- **homelab-architect** — Designs home and small-lab network plans from hardware inventory, goals, and operator experience level, with safe staged changes and rollback guidance.
- **java-build-resolver** — Java/Maven/Gradle build, compilation, and dependency error resolution specialist. Automatically detects Spring Boot or Quarkus and applies framework-specific fixes. Fixes build errors, Java compiler errors, and Maven/Gradle issues with minimal changes. Use when Java builds fail.
- **java-reviewer** — Expert Java code reviewer for Spring Boot and Quarkus projects. Automatically detects the framework and applies the appropriate review rules. Covers layered architecture, JPA/Panache, MongoDB, security, and concurrency. MUST BE USED for all Java code changes.
- **kotlin-build-resolver** — Kotlin/Gradle build, compilation, and dependency error resolution specialist. Fixes build errors, Kotlin compiler errors, and Gradle issues with minimal changes. Use when Kotlin builds fail.
- **kotlin-reviewer** — Kotlin and Android/KMP code reviewer. Reviews Kotlin code for idiomatic patterns, coroutine safety, Compose best practices, clean architecture violations, and common Android pitfalls.
- **loop-operator** — Operate autonomous agent loops, monitor progress, and intervene safely when loops stall.
- **marketing-agent** — Marketing strategist and copywriter for campaign planning, audience research, positioning, copy creation, and content review. Covers landing pages, email sequences, social posts, ad copy, short-form video scripts, and content calendars. Use when the user wants to plan or execute a product launch or marketing campaign.
- **mle-reviewer** — Production machine-learning engineering reviewer for data contracts, feature pipelines, training reproducibility, offline/online evaluation, model serving, monitoring, and rollback. Use when ML, MLOps, model training, inference, feature store, or evaluation code changes.
- **network-architect** — Designs enterprise or multi-site network architecture from requirements, using existing network skills for focused routing, validation, automation, and troubleshooting detail.
- **network-config-reviewer** — Reviews router and switch configurations for security, correctness, stale references, risky change-window commands, and missing operational guardrails.
- **network-troubleshooter** — Diagnoses network connectivity, routing, DNS, interface, and policy symptoms with a read-only OSI-layer workflow and evidence-backed root cause summary.
- **opensource-forker** — Fork any project for open-sourcing. Copies files, strips secrets and credentials (20+ patterns), replaces internal references with placeholders, generates .env.example, and cleans git history. First stage of the opensource-pipeline skill.
- **opensource-packager** — Generate complete open-source packaging for a sanitized project. Produces CLAUDE.md, setup.sh, README.md, LICENSE, CONTRIBUTING.md, and GitHub issue templates. Makes any repo immediately usable with Claude Code. Third stage of the opensource-pipeline skill.
- **opensource-sanitizer** — Verify an open-source fork is fully sanitized before release. Scans for leaked secrets, PII, internal references, and dangerous files using 20+ regex patterns. Generates a PASS/FAIL/PASS-WITH-WARNINGS report. Second stage of the opensource-pipeline skill. Use PROACTIVELY before any public release.
- **performance-optimizer** — Performance analysis and optimization specialist. Use PROACTIVELY for identifying bottlenecks, optimizing slow code, reducing bundle sizes, and improving runtime performance. Profiling, memory leaks, render optimization, and algorithmic improvements.
- **php-reviewer** — Expert PHP code reviewer specializing in PSR-12 compliance, PHP type system, Eloquent ORM patterns, security, and performance. Use for all PHP code changes. MUST BE USED for PHP projects.
- **planner** — Expert planning specialist for complex features and refactoring. Use PROACTIVELY when users request feature implementation, architectural changes, or complex refactoring. Automatically activated for planning tasks.
- **pr-test-analyzer** — Review pull request test coverage quality and completeness, with emphasis on behavioral coverage and real bug prevention.
- **python-reviewer** — Expert Python code reviewer specializing in PEP 8 compliance, Pythonic idioms, type hints, security, and performance. Use for all Python code changes. MUST BE USED for Python projects.
- **pytorch-build-resolver** — PyTorch runtime, CUDA, and training error resolution specialist. Fixes tensor shape mismatches, device errors, gradient issues, DataLoader problems, and mixed precision failures with minimal changes. Use when PyTorch training or inference crashes.
- **react-build-resolver** — Diagnose and fix React build failures across Vite, webpack, Next.js, CRA, Parcel, esbuild, and Bun. Handles JSX/TSX compile errors, hydration mismatches, server/client component boundary failures, missing types, and bundler-specific configuration issues with minimal, surgical changes. MUST BE USED when a React build fails.
- **react-reviewer** — Expert React/JSX code reviewer specializing in hook correctness, render performance, server/client component boundaries, accessibility, and React-specific security. Use for any change touching .tsx/.jsx files or React component logic. MUST BE USED for React projects.
- **refactor-cleaner** — Dead code cleanup and consolidation specialist. Use PROACTIVELY for removing unused code, duplicates, and refactoring. Runs analysis tools (knip, depcheck, ts-prune) to identify dead code and safely removes it.
- **rust-build-resolver** — Rust build, compilation, and dependency error resolution specialist. Fixes cargo build errors, borrow checker issues, and Cargo.toml problems with minimal changes. Use when Rust builds fail.
- **rust-reviewer** — Expert Rust code reviewer specializing in ownership, lifetimes, error handling, unsafe usage, and idiomatic patterns. Use for all Rust code changes. MUST BE USED for Rust projects.
- **security-reviewer** — Security vulnerability detection and remediation specialist. Use PROACTIVELY after writing code that handles user input, authentication, API endpoints, or sensitive data. Flags secrets, SSRF, injection, unsafe crypto, and OWASP Top 10 vulnerabilities.
- **seo-specialist** — SEO specialist for technical SEO audits, on-page optimization, structured data, Core Web Vitals, and content/keyword mapping. Use for site audits, meta tag reviews, schema markup, sitemap and robots issues, and SEO remediation plans.
- **silent-failure-hunter** — Review code for silent failures, swallowed errors, bad fallbacks, and missing error propagation.
- **spec-miner** — Extracts behavioral specs from existing codebases for OpenSpec. Produces flat Requirement and Invariant blocks with structured metadata (entities, enforced, id, test anchors). Outputs openspec/specs//spec.md. Fully self-bootstrapping — no dependency on codebase-onboarding. Use when onboarding a brownfield project to spec-driven development.
- **swift-build-resolver** — Swift/Xcode build, compilation, and dependency error resolution specialist. Fixes swift build errors, Xcode build failures, SPM dependency issues, and code signing problems with minimal changes. Use when Swift builds fail.
- **swift-reviewer** — Expert Swift code reviewer specializing in protocol-oriented design, value semantics, ARC memory management, Swift Concurrency, and idiomatic patterns. Use for all Swift code changes. MUST BE USED for Swift projects.
- **tdd-guide** — Test-Driven Development specialist enforcing write-tests-first methodology. Use PROACTIVELY when writing new features, fixing bugs, or refactoring code. Ensures 80%+ test coverage.
- **type-design-analyzer** — Analyze type design for encapsulation, invariant expression, usefulness, and enforcement.
- **typescript-reviewer** — Expert TypeScript/JavaScript code reviewer specializing in type safety, async correctness, Node/web security, and idiomatic patterns. Use for all TypeScript and JavaScript code changes. MUST BE USED for TypeScript/JavaScript projects.
- **vue-reviewer** — Expert Vue.js code reviewer specializing in Composition API correctness, reactivity pitfalls, component architecture, template security, and Vue-specific performance. Use for any change touching .vue, .ts/.js files with Vue imports, or Vue ecosystem code (Pinia, Vue Router, Nuxt). MUST BE USED for Vue projects.

### Commands

- **/aside** `[optional arguments]` — Answer a quick side question without interrupting or losing context from the current task. Resume work automatically after answering.
  - How it runs: # Aside Command Ask a question mid-task and get an immediate, focused answer — then continue right where you left off. The current task, files, and context are never modified. ## When to Use - You're curious about something while Claude is working and don't want to lose momentum - You need a quick explanation of code Claude is currently editing - You want a second opinion or clarification on a decision without derailing the task - You need to understand an error, concept, or pattern before Claude proceeds - You want to ask something unrelated to the current task without starting a new session ## Usage ``` /aside <your question> /aside what does this function actually return? /aside is this pattern thread-safe? /aside why are we using X instead of Y here? /aside what's the difference between foo() and bar()? /aside should we be worried about the N+1 query we just added? ``` ## Process ### Step 1: Freeze the current task state Before answering anything, mentally note: - What is the active task? (what file, feature, or problem was being worked on) - What step was in progress at the moment `/aside` was invoked? - What was about to happen next? Do NOT touch, edit, create, or delete any files during the aside. ### Step 2: Answer the question directly Answer the question in the most concise form that is still complete and useful. - Lead with the answer, not the reasoning - Keep it short — if a full explanation is needed, offer to go deeper after the task - If the question is about the current file or code being worked on, reference it precisely (file path and line number if relevant) - If answering requires reading a file, read it — but read only, never write Format the response as: ``` ASIDE: [restate the question briefly] [Your answer here] — Back to task: [one-line description of what was being done] ``` ### Step 3: Resume the main task After delivering the answer, immediately continue the active task from the exact point it was paused. Do not ask for permission to resume unless the aside answer revealed a blocker or a reason to reconsider the current approach (see Edge Cases). --- ## Edge Cases **No question provided (`/aside` with nothing after it):** Respond: ``` ASIDE: no question provided What would you like to know? (ask your question and I'll answer without losing the current task context) — Back to task: [one-line description of what was being done] ``` **Question reveals a potential problem with the current task:** Flag it clearly before resuming: ``` ASIDE: [answer] WARNING: Note: This answer suggests [issue] with the current approach. Want to address this before continuing, or proceed as planned? ``` Wait for the user's decision before resuming. **Question is actually a task redirect (not a side question):** If the question implies changing what is being built (e.g., `/aside actually, let's use Redis instead`), clarify: ``` ASIDE: That sounds like a direction change, not just a side question. Do you want to: (a) Answer this as information only and keep the current plan (b) Pause the current task and change approach ``` Wait for the user's answer — do not make assumptions. **Question is about the currently open file or code:** Answer from the live context. If the file was read earlier in the session, reference it directly. If not, read it now (read-only) and answer with a file:line reference. **No active task (nothing in progress when `/aside` is invoked):** Still use the standard wrapper so the response shape stays consistent: ``` ASIDE: [restate the question briefly] [Your answer here] — Back to task: no active task to resume ``` **Question requires a long answer:** Give the essential answer concisely, then offer: ``` That's the short version. Want a deeper explanation after we finish [current task]? ``` **Multiple `/aside` questions in a row:** Answer each one in sequence. After the last answer, resume the main task. Do not lose task state across a chain of asides. **Aside answer implies a code change is needed:** Note the change needed but do not make it during the aside: ``` ASIDE: [answer] Worth fixing: [what should be changed]. I'll flag this after the current task unless you want to address it now. ``` **Question is ambiguous or too vague:** Ask one clarifying question — the shortest question that gets the information needed to answer. Do not ask multiple questions. --- ## Example Output ``` User: /aside what does fetchWithRetry() actually do? ASIDE: what does fetchWithRetry() do? fetchWithRetry() (src/api/retry.ts:12) attempts the request up to 3 times with exponential backoff (250ms → 500ms → 1s). It only retries on 5xx responses and network errors — 4xx errors are treated as final and not retried. — Back to task: refactoring the auth middleware in src/middleware/auth.ts ``` ``` User: /aside is the approach we're taking thread-safe? ASIDE: is the current approach thread-safe? No — the shared cache object in src/cache/store.ts:34 is mutated without locking. Under concurrent requests this is a race condition. It's low risk in a single-process Node.js server but would be a real problem with worker threads or clustering. WARNING: Note: This could affect the feature we're building. Want to address this now or continue and fix it in a follow-up? ``` --- ## Notes - Never modify files during an aside — read-only access only - The aside is a conversation pause, not a new task — the original task must always resume - Keep answers focused: the goal is to unblock the user quickly, not to deliver a lecture - If an aside sparks a larger discussion, finish the current task first unless the aside reveals a blocker - Asides are not saved to session files unless explicitly relevant to the task outcome
- **/auto-update** `[optional arguments]` — Pull the latest ECC repo changes and reinstall the current managed targets.
  - How it runs: # Auto Update Update ECC from its upstream repo and regenerate the current context's managed install using the original install-state request. ## Usage ```bash # Preview the update without mutating anything ECC_ROOT="${CLAUDE_PLUGIN_ROOT:-$(node -e "var r=(function(){var p=require('path'),f=require('fs'),o=require('os');var e=process.env.CLAUDE_PLUGIN_ROOT;if(e&&e.trim())return e.trim();var d=p.join(o.homedir(),'.claude');function L(x){try{return require(p.join(x,'scripts','lib','resolve-ecc-root')).resolveEccRoot()}catch(_){return null}}var r=L(d);if(r)return r;var s=['ecc','ecc@ecc','marketplaces/ecc','everything-claude-code','everything-claude-code@everything-claude-code','marketplaces/everything-claude-code'];for(var i=0;i<s.length;i++){r=L(p.join(d,'plugins',s[i]));if(r)return r}try{var g=['ecc','everything-claude-code'];for(var j=0;j<g.length;j++){var c=p.join(d,'plugins','cache',g[j]);var O=f.readdirSync(c);for(var k=0;k<O.length;k++){var q=p.join(c,O[k]);var V=f.readdirSync(q);for(var m=0;m<V.length;m++){r=L(p.join(q,V[m]));if(r)return r}}}}catch(_){}return d})();console.log(r)")}" node "$ECC_ROOT/scripts/auto-update.js" --dry-run # Update only Cursor-managed files in the current project node "$ECC_ROOT/scripts/auto-update.js" --target cursor # Override the ECC repo root explicitly node "$ECC_ROOT/scripts/auto-update.js" --repo-root /path/to/everything-claude-code ``` ## Notes - This command uses the recorded install-state request and reruns `install-apply.js` after pulling the latest repo changes. - Reinstall is intentional: it handles upstream renames and deletions that `repair.js` cannot safely reconstruct from stale operations alone. - Use `--dry-run` first if you want to see the reconstructed reinstall plan before mutating anything.
- **/build-fix** `[optional arguments]` — Detect the project build system and incrementally fix build/type errors with minimal safe changes.
  - How it runs: # Build and Fix Incrementally fix build and type errors with minimal, safe changes. ## Step 1: Detect Build System Identify the project's build tool and run the build: | Indicator | Build Command | |-----------|---------------| | `package.json` with `build` script | `npm run build` or `pnpm build` | | `tsconfig.json` (TypeScript only) | `npx tsc --noEmit` | | `Cargo.toml` | `cargo build 2>&1` | | `pom.xml` | `mvn compile` | | `build.gradle` | `./gradlew compileJava` | | `go.mod` | `go build ./...` | | `pyproject.toml` | `python -m compileall -q .` or `mypy .` | ## Step 2: Parse and Group Errors 1. Run the build command and capture stderr 2. Group errors by file path 3. Sort by dependency order (fix imports/types before logic errors) 4. Count total errors for progress tracking ## Step 3: Fix Loop (One Error at a Time) For each error: 1. **Read the file** — Use Read tool to see error context (10 lines around the error) 2. **Diagnose** — Identify root cause (missing import, wrong type, syntax error) 3. **Fix minimally** — Use Edit tool for the smallest change that resolves the error 4. **Re-run build** — Verify the error is gone and no new errors introduced 5. **Move to next** — Continue with remaining errors ## Step 4: Guardrails Stop and ask the user if: - A fix introduces **more errors than it resolves** - The **same error persists after 3 attempts** (likely a deeper issue) - The fix requires **architectural changes** (not just a build fix) - Build errors stem from **missing dependencies** (need `npm install`, `cargo add`, etc.) ## Step 5: Summary Show results: - Errors fixed (with file paths) - Errors remaining (if any) - New errors introduced (should be zero) - Suggested next steps for unresolved issues ## Recovery Strategies | Situation | Action | |-----------|--------| | Missing module/import | Check if package is installed; suggest install command | | Type mismatch | Read both type definitions; fix the narrower type | | Circular dependency | Identify cycle with import graph; suggest extraction | | Version conflict | Check `package.json` / `Cargo.toml` for version constraints | | Build tool misconfiguration | Read config file; compare with working defaults | Fix one error at a time for safety. Prefer minimal diffs over refactoring.
- **/checkpoint** `[optional arguments]` — Create, verify, or list workflow checkpoints after running verification checks.
  - How it runs: # Checkpoint Command Create or verify a checkpoint in your workflow. ## Usage `/checkpoint [create|verify|list] [name]` ## Create Checkpoint When creating a checkpoint: 1. Run `/verify quick` to ensure current state is clean 2. Create a git stash or commit with checkpoint name 3. Log checkpoint to `.claude/checkpoints.log`: ```bash echo "$(date +%Y-%m-%d-%H:%M) | $CHECKPOINT_NAME | $(git rev-parse --short HEAD)" >> .claude/checkpoints.log ``` 4. Report checkpoint created ## Verify Checkpoint When verifying against a checkpoint: 1. Read checkpoint from log 2. Compare current state to checkpoint: - Files added since checkpoint - Files modified since checkpoint - Test pass rate now vs then - Coverage now vs then 3. Report: ``` CHECKPOINT COMPARISON: $NAME ============================ Files changed: X Tests: +Y passed / -Z failed Coverage: +X% / -Y% Build: [PASS/FAIL] ``` ## List Checkpoints Show all checkpoints with: - Name - Timestamp - Git SHA - Status (current, behind, ahead) ## Workflow Typical checkpoint flow: ``` [Start] --> /checkpoint create "feature-start" | [Implement] --> /checkpoint create "core-done" | [Test] --> /checkpoint verify "core-done" | [Refactor] --> /checkpoint create "refactor-done" | [PR] --> /checkpoint verify "feature-start" ``` ## Arguments $ARGUMENTS: - `create <name>` - Create named checkpoint - `verify <name>` - Verify against named checkpoint - `list` - Show all checkpoints - `clear` - Remove old checkpoints (keeps last 5)
- **/code-review** `pr-number | pr-url | blank for local review` — Code review — local uncommitted changes or GitHub PR (pass PR number/URL for PR mode)
  - How it runs: # Code Review > PR review mode adapted from PRPs-agentic-eng by Wirasm. Part of the PRP workflow series. **Input**: $ARGUMENTS --- ## Mode Selection If `$ARGUMENTS` contains a PR number, PR URL, or `--pr`: → Jump to **PR Review Mode** below. Otherwise: → Use **Local Review Mode**. --- ## Local Review Mode Comprehensive security and quality review of uncommitted changes. ### Phase 1 — GATHER ```bash git diff --name-only HEAD ``` If no changed files, stop: "Nothing to review." ### Phase 2 — REVIEW Read each changed file in full. Check for: **Security Issues (CRITICAL):** - Hardcoded credentials, API keys, tokens - SQL injection vulnerabilities - XSS vulnerabilities - Missing input validation - Insecure dependencies - Path traversal risks **Code Quality (HIGH):** - Functions > 50 lines - Files > 800 lines - Nesting depth > 4 levels - Missing error handling - console.log statements - TODO/FIXME comments - Missing JSDoc for public APIs **Best Practices (MEDIUM):** - Mutation patterns (use immutable instead) - Emoji usage in code/comments - Missing tests for new code - Accessibility issues (a11y) ### Phase 3 — REPORT Generate report with: - Severity: CRITICAL, HIGH, MEDIUM, LOW - File location and line numbers - Issue description - Suggested fix Block commit if CRITICAL or HIGH issues found. Never approve code with security vulnerabilities. --- ## PR Review Mode Comprehensive GitHub PR review — fetches diff, reads full files, runs validation, posts review. ### Phase 1 — FETCH Parse input to determine PR: | Input | Action | |---|---| | Number (e.g. `42`) | Use as PR number | | URL (`github.com/.../pull/42`) | Extract PR number | | Branch name | Find PR via `gh pr list --head <branch>` | ```bash gh pr view <NUMBER> --json number,title,body,author,baseRefName,headRefName,changedFiles,additions,deletions gh pr diff <NUMBER> ``` If PR not found, stop with error. Store PR metadata for later phases. ### Phase 2 — CONTEXT Build review context: 1. **Project rules** — Read `CLAUDE.md`, `.claude/docs/`, and any contributing guidelines 2. **Planning artifacts** — Check `.claude/prds/`, `.claude/plans/`, `.claude/reviews/`, and legacy `.claude/PRPs/{prds,plans,reports,reviews}/` for context related to this PR 3. **PR intent** — Parse PR description for goals, linked issues, test plans 4. **Changed files** — List all modified files and categorize by type (source, test, config, docs) ### Phase 3 — REVIEW Read each changed file **in full** (not just the diff hunks — you need surrounding context). For PR reviews, fetch the full file contents at the PR head revision: ```bash gh pr diff <NUMBER> --name-only | while IFS= read -r file; do gh api "repos/{owner}/{repo}/contents/$file?ref=<head-branch>" --jq '.content' | base64 -d done ``` Apply the review checklist across 7 categories: | Category | What to Check | |---|---| | **Correctness** | Logic errors, off-by-ones, null handling, edge cases, race conditions | | **Type Safety** | Type mismatches, unsafe casts, `any` usage, missing generics | | **Pattern Compliance** | Matches project conventions (naming, file structure, error handling, imports) | | **Security** | Injection, auth gaps, secret exposure, SSRF, path traversal, XSS | | **Performance** | N+1 queries, missing indexes, unbounded loops, memory leaks, large payloads | | **Completeness** | Missing tests, missing error handling, incomplete migrations, missing docs | | **Maintainability** | Dead code, magic numbers, deep nesting, unclear naming, missing types | Assign severity to each finding: | Severity | Meaning | Action | |---|---|---| | **CRITICAL** | Security vulnerability or data loss risk | Must fix before merge | | **HIGH** | Bug or logic error likely to cause issues | Should fix before merge | | **MEDIUM** | Code quality issue or missing best practice | Fix recommended | | **LOW** | Style nit or minor suggestion | Optional | ### Phase 4 — VALIDATE Run available validation commands: Detect the project type from config files (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, etc.), then run the appropriate commands: **Node.js / TypeScript** (has `package.json`): ```bash npm run typecheck 2>/dev/null || npx tsc --noEmit 2>/dev/null # Type check npm run lint # Lint npm test # Tests npm run build # Build ``` **Rust** (has `Cargo.toml`): ```bash cargo clippy -- -D warnings # Lint cargo test # Tests cargo build # Build ``` **Go** (has `go.mod`): ```bash go vet ./... # Lint go test ./... # Tests go build ./... # Build ``` **Python** (has `pyproject.toml` / `setup.py`): ```bash pytest # Tests ``` Run only the commands that apply to the detected project type. Record pass/fail for each. ### Phase 5 — DECIDE Form recommendation based on findings: | Condition | Decision | |---|---| | Zero CRITICAL/HIGH issues, validation passes | **APPROVE** | | Only MEDIUM/LOW issues, validation passes | **APPROVE** with comments | | Any HIGH issues or validation failures | **REQUEST CHANGES** | | Any CRITICAL issues | **BLOCK** — must fix before merge | Special cases: - Draft PR → Always use **COMMENT** (not approve/block) - Only docs/config changes → Lighter review, focus on correctness - Explicit `--approve` or `--request-changes` flag → Override decision (but still report all findings) ### Phase 6 — REPORT Create review artifact at `.claude/reviews/pr-<NUMBER>-review.md` unless the repo already uses legacy `.claude/PRPs/reviews/` for this workstream: ```markdown # PR Review: #<NUMBER> — <TITLE> **Reviewed**: <date> **Author**: <author> **Branch**: <head> → <base> **Decision**: APPROVE | REQUEST CHANGES | BLOCK ## Summary <1-2 sentence overall assessment> ## Findings ### CRITICAL <findings or "None"> ### HIGH <findings or "None"> ### MEDIUM <findings or "None"> ### LOW <findings or "None"> ## Validation Results | Check | Result | |---|---| | Type check | Pass / Fail / Skipped | | Lint | Pass / Fail / Skipped | | Tests | Pass / Fail / Skipped | | Build | Pass / Fail / Skipped | ## Files Reviewed <list of files with change type: Added/Modified/Deleted> ``` ### Phase 7 — PUBLISH Post the review to GitHub: ```bash # If APPROVE gh pr review <NUMBER> --approve --body "<summary of review>" # If REQUEST CHANGES gh pr review <NUMBER> --request-changes --body "<summary with required fixes>" # If COMMENT only (draft PR or informational) gh pr review <NUMBER> --comment --body "<summary>" ``` For inline comments on specific lines, use the GitHub review comments API: ```bash gh api "repos/{owner}/{repo}/pulls/<NUMBER>/comments" \ -f body="<comment>" \ -f path="<file>" \ -F line=<line-number> \ -f side="RIGHT" \ -f commit_id="$(gh pr view <NUMBER> --json headRefOid --jq .headRefOid)" ``` Alternatively, post a single review with multiple inline comments at once: ```bash gh api "repos/{owner}/{repo}/pulls/<NUMBER>/reviews" \ -f event="COMMENT" \ -f body="<overall summary>" \ --input comments.json # [{"path": "file", "line": N, "body": "comment"}, ...] ``` ### Phase 8 — OUTPUT Report to user: ``` PR #<NUMBER>: <TITLE> Decision: <APPROVE|REQUEST_CHANGES|BLOCK> Issues: <critical_count> critical, <high_count> high, <medium_count> medium, <low_count> low Validation: <pass_count>/<total_count> checks passed Artifacts: Review: .claude/reviews/pr-<NUMBER>-review.md GitHub: <PR URL> Next steps: - <contextual suggestions based on decision> ``` --- ## Edge Cases - **No `gh` CLI**: Fall back to local-only review (read the diff, skip GitHub publish). Warn user. - **Diverged branches**: Suggest `git fetch origin && git rebase origin/<base>` before review. - **Large PRs (>50 files)**: Warn about review scope. Focus on source changes first, then tests, then config/docs.
- **/cost-report** `csv` — Generate a local Claude Code cost report from the ECC cost-tracker metrics log.
  - How it runs: # Cost Report Summarize local Claude Code spend by day, model, and session from the metrics log that ECC's `stop:cost-tracker` hook writes. ## Where the data lives The tracker appends one JSON object per session-stop to `~/.claude/metrics/costs.jsonl`. Each row is a **cumulative snapshot for that session**, so the report takes the **latest row per `session_id`** and sums across sessions (summing every row would multiply-count). Row schema: `{ timestamp, session_id, transcript_path, model, input_tokens, output_tokens, cache_write_tokens, cache_read_tokens, estimated_cost_usd }` ## What this command does 1. Check that `~/.claude/metrics/costs.jsonl` exists. If it does not, tell the user the tracker is not set up yet (it populates after the first session ends with the `stop:cost-tracker` hook enabled). 2. Reduce rows to the latest snapshot per session and aggregate. 3. Present a compact report, or export recent rows as CSV when the argument is `csv`. `node` is used instead of `sqlite3`/`jq` so this works identically on macOS, Linux, and Windows. ## Report ```bash node -e ' const fs=require("fs"),os=require("os"),path=require("path"); const f=path.join(os.homedir(),".claude","metrics","costs.jsonl"); if(!fs.existsSync(f)){console.log("Cost tracker not set up: "+f+" not found. Enable the stop:cost-tracker hook and finish a session first.");process.exit(0);} const rows=fs.readFileSync(f,"utf8").split(/\r?\n/).filter(Boolean).map(l=>{try{return JSON.parse(l)}catch{return null}}).filter(Boolean); const bySession=new Map(); for(const r of rows){const k=r.session_id||r.transcript_path||r.timestamp;const p=bySession.get(k);if(!p||String(r.timestamp)>String(p.timestamp))bySession.set(k,r);} const latest=[...bySession.values()]; const cost=r=>Number(r.estimated_cost_usd)||0; const day=r=>String(r.timestamp||"").slice(0,10); const today=new Date().toISOString().slice(0,10); const d=new Date(Date.now()-864e5).toISOString().slice(0,10); const sum=a=>a.reduce((s,r)=>s+cost(r),0); const f4=n=>"$"+n.toFixed(4); console.log("=== Cost summary ==="); console.log("today: "+f4(sum(latest.filter(r=>day(r)===today)))); console.log("yesterday: "+f4(sum(latest.filter(r=>day(r)===d)))); console.log("total: "+f4(sum(latest))+" ("+latest.length+" sessions)"); const by=(key)=>{const m=new Map();for(const r of latest){const k=key(r)||"(unknown)";m.set(k,(m.get(k)||0)+cost(r));}return [...m.entries()].sort((a,b)=>b[1]-a[1]);}; console.log("\n=== By model ===");for(const [k,v] of by(r=>r.model))console.log(f4(v).padStart(12)+" "+k); console.log("\n=== Last 7 days ==="); const days=new Map();for(const r of latest){const k=day(r);days.set(k,(days.get(k)||0)+cost(r));} [...days.entries()].sort((a,b)=>b[0]<a[0]?-1:1).slice(0,7).forEach(([k,v])=>console.log(k+" "+f4(v))); ' ``` ## CSV export (`/cost-report csv`) ```bash node -e ' const fs=require("fs"),os=require("os"),path=require("path"); const f=path.join(os.homedir(),".claude","metrics","costs.jsonl"); if(!fs.existsSync(f)){console.error("no data");process.exit(0);} const rows=fs.readFileSync(f,"utf8").split(/\r?\n/).filter(Boolean).map(l=>{try{return JSON.parse(l)}catch{return null}}).filter(Boolean).slice(-100); console.log("timestamp,session_id,model,input_tokens,output_tokens,cache_write_tokens,cache_read_tokens,estimated_cost_usd"); for(const r of rows)console.log([r.timestamp,r.session_id,r.model,r.input_tokens,r.output_tokens,r.cache_write_tokens,r.cache_read_tokens,r.estimated_cost_usd].join(",")); ' ``` ## Report format 1. Summary: today, yesterday, total, session count. 2. By model: models ranked by total cost. 3. Last seven days: date and cost. Rely on the precomputed `estimated_cost_usd` values written by the tracker; do not re-estimate pricing from raw tokens here.
- **/cpp-build** `[optional arguments]` — Fix C++ build errors, CMake issues, and linker problems incrementally. Invokes the cpp-build-resolver agent for minimal, surgical fixes.
  - How it runs: # C++ Build and Fix This command invokes the **cpp-build-resolver** agent to incrementally fix C++ build errors with minimal changes. ## What This Command Does 1. **Run Diagnostics**: Execute `cmake --build`, `clang-tidy`, `cppcheck` 2. **Parse Errors**: Group by file and sort by severity 3. **Fix Incrementally**: One error at a time 4. **Verify Each Fix**: Re-run build after each change 5. **Report Summary**: Show what was fixed and what remains ## When to Use Use `/cpp-build` when: - `cmake --build build` fails with errors - Linker errors (undefined references, multiple definitions) - Template instantiation failures - Include/dependency issues - After pulling changes that break the build ## Diagnostic Commands Run ```bash # CMake configure cmake -B build -S . # Build cmake --build build 2>&1 | head -100 # Static analysis (if available) clang-tidy src/*.cpp -- -std=c++17 cppcheck --enable=all src/ ``` ## Example Session ```text User: /cpp-build Agent: # C++ Build Resolution ## Initial Diagnostics ```bash $ cmake --build build src/service/user.cpp:25:15: error: use of undeclared identifier 'UserRepository' src/handler/api.cpp:42:9: error: no matching function for call to 'process' src/handler/api.cpp:58:1: error: non-void function does not return a value ``` Errors found: 3 ## Fix 1: Undeclared Identifier File: src/service/user.cpp:25 Error: use of undeclared identifier 'UserRepository' Cause: Missing include ```cpp // Added include #include "repository/user_repository.hpp" ``` ```bash $ cmake --build build # 2 errors remaining ``` ## Fix 2: No Matching Function File: src/handler/api.cpp:42 Error: no matching function for call to 'process' ```cpp // Changed process(params.get("count")); // To process(std::stoi(params.get("count"))); ``` ```bash $ cmake --build build # 1 error remaining ``` ## Fix 3: Missing Return File: src/handler/api.cpp:58 Error: non-void function does not return a value ```cpp std::optional<User> getUser(const std::string& id) { if (id.empty()) { return std::nullopt; } auto user = findUser(id); // Added missing return return user; } ``` ```bash $ cmake --build build # Build successful! ``` ## Final Verification ```bash $ ctest --test-dir build --output-on-failure Test project build 1/5 Test #1: unit_tests ........ Passed 0.02 sec 2/5 Test #2: integration_tests Passed 0.15 sec All tests passed. ``` ## Summary | Metric | Count | |--------|-------| | Build errors fixed | 3 | | Linker errors fixed | 0 | | Files modified | 2 | | Remaining issues | 0 | Build Status: PASS: SUCCESS ``` ## Common Errors Fixed | Error | Typical Fix | |-------|-------------| | `undeclared identifier` | Add `#include` or fix typo | | `no matching function` | Fix argument types or add overload | | `undefined reference` | Link library or add implementation | | `multiple definition` | Use `inline` or move to .cpp | | `incomplete type` | Replace forward decl with `#include` | | `no member named X` | Fix member name or include | | `cannot convert X to Y` | Add appropriate cast | | `CMake Error` | Fix CMakeLists.txt configuration | ## Fix Strategy 1. **Compilation errors first** - Code must compile 2. **Linker errors second** - Resolve undefined references 3. **Warnings third** - Fix with `-Wall -Wextra` 4. **One fix at a time** - Verify each change 5. **Minimal changes** - Don't refactor, just fix ## Stop Conditions The agent will stop and report if: - Same error persists after 3 attempts - Fix introduces more errors - Requires architectural changes - Missing external dependencies ## Related Commands - `/cpp-test` - Run tests after build succeeds - `/cpp-review` - Review code quality - `verification-loop` skill - Full verification loop ## Related - Agent: `agents/cpp-build-resolver.md` - Skill: `skills/cpp-coding-standards/`
- **/cpp-review** `[optional arguments]` — Comprehensive C++ code review for memory safety, modern C++ idioms, concurrency, and security. Invokes the cpp-reviewer agent.
  - How it runs: # C++ Code Review This command invokes the **cpp-reviewer** agent for comprehensive C++-specific code review. ## What This Command Does 1. **Identify C++ Changes**: Find modified `.cpp`, `.hpp`, `.cc`, `.h` files via `git diff` 2. **Run Static Analysis**: Execute `clang-tidy` and `cppcheck` 3. **Memory Safety Scan**: Check for raw new/delete, buffer overflows, use-after-free 4. **Concurrency Review**: Analyze thread safety, mutex usage, data races 5. **Modern C++ Check**: Verify code follows C++17/20 conventions and best practices 6. **Generate Report**: Categorize issues by severity ## When to Use Use `/cpp-review` when: - After writing or modifying C++ code - Before committing C++ changes - Reviewing pull requests with C++ code - Onboarding to a new C++ codebase - Checking for memory safety issues ## Review Categories ### CRITICAL (Must Fix) - Raw `new`/`delete` without RAII - Buffer overflows and use-after-free - Data races without synchronization - Command injection via `system()` - Uninitialized variable reads - Null pointer dereferences ### HIGH (Should Fix) - Rule of Five violations - Missing `std::lock_guard` / `std::scoped_lock` - Detached threads without proper lifetime management - C-style casts instead of `static_cast`/`dynamic_cast` - Missing `const` correctness ### MEDIUM (Consider) - Unnecessary copies (pass by value instead of `const&`) - Missing `reserve()` on known-size containers - `using namespace std;` in headers - Missing `[[nodiscard]]` on important return values - Overly complex template metaprogramming ## Automated Checks Run ```bash # Static analysis clang-tidy --checks='*,-llvmlibc-*' src/*.cpp -- -std=c++17 # Additional analysis cppcheck --enable=all --suppress=missingIncludeSystem src/ # Build with warnings cmake --build build -- -Wall -Wextra -Wpedantic ``` ## Example Usage ```text User: /cpp-review Agent: # C++ Code Review Report ## Files Reviewed - src/handler/user.cpp (modified) - src/service/auth.cpp (modified) ## Static Analysis Results ✓ clang-tidy: 2 warnings ✓ cppcheck: No issues ## Issues Found [CRITICAL] Memory Leak File: src/service/auth.cpp:45 Issue: Raw `new` without matching `delete` ```cpp auto* session = new Session(userId); // Memory leak! cache[userId] = session; ``` Fix: Use `std::unique_ptr` ```cpp auto session = std::make_unique<Session>(userId); cache[userId] = std::move(session); ``` [HIGH] Missing const Reference File: src/handler/user.cpp:28 Issue: Large object passed by value ```cpp void processUser(User user) { // Unnecessary copy ``` Fix: Pass by const reference ```cpp void processUser(const User& user) { ``` ## Summary - CRITICAL: 1 - HIGH: 1 - MEDIUM: 0 Recommendation: FAIL: Block merge until CRITICAL issue is fixed ``` ## Approval Criteria | Status | Condition | |--------|-----------| | PASS: Approve | No CRITICAL or HIGH issues | | WARNING: Warning | Only MEDIUM issues (merge with caution) | | FAIL: Block | CRITICAL or HIGH issues found | ## Integration with Other Commands - Use `/cpp-test` first to ensure tests pass - Use `/cpp-build` if build errors occur - Use `/cpp-review` before committing - Use `/code-review` for non-C++ specific concerns ## Related - Agent: `agents/cpp-reviewer.md` - Skills: `skills/cpp-coding-standards/`, `skills/cpp-testing/`
- **/cpp-test** `[optional arguments]` — Enforce TDD workflow for C++. Write GoogleTest tests first, then implement. Verify coverage with gcov/lcov.
  - How it runs: # C++ TDD Command This command enforces test-driven development methodology for C++ code using GoogleTest/GoogleMock with CMake/CTest. ## What This Command Does 1. **Define Interfaces**: Scaffold class/function signatures first 2. **Write Tests**: Create comprehensive GoogleTest test cases (RED) 3. **Run Tests**: Verify tests fail for the right reason 4. **Implement Code**: Write minimal code to pass (GREEN) 5. **Refactor**: Improve while keeping tests green 6. **Check Coverage**: Ensure 80%+ coverage ## When to Use Use `/cpp-test` when: - Implementing new C++ functions or classes - Adding test coverage to existing code - Fixing bugs (write failing test first) - Building critical business logic - Learning TDD workflow in C++ ## TDD Cycle ``` RED → Write failing GoogleTest test GREEN → Implement minimal code to pass REFACTOR → Improve code, tests stay green REPEAT → Next test case ``` ## Example Session ```` User: /cpp-test I need a function to validate email addresses Agent: # TDD Session: Email Validator ## Step 1: Define Interface ```cpp // validator/email.hpp #pragma once #include <string> #include <expected> enum class EmailError { Empty, InvalidFormat }; std::expected<void, EmailError> validate_email(const std::string& email); ``` ## Step 2: Write Tests (RED) ```cpp // validator/email_test.cpp #include <gtest/gtest.h> #include "email.hpp" TEST(ValidateEmail, AcceptsSimpleEmail) { auto result = validate_email("user@example.com"); EXPECT_TRUE(result.has_value()); } TEST(ValidateEmail, AcceptsSubdomain) { EXPECT_TRUE(validate_email("user@mail.example.com").has_value()); } TEST(ValidateEmail, AcceptsPlus) { EXPECT_TRUE(validate_email("user+tag@example.com").has_value()); } TEST(ValidateEmail, RejectsEmpty) { auto result = validate_email(""); ASSERT_FALSE(result.has_value()); EXPECT_EQ(result.error(), EmailError::Empty); } TEST(ValidateEmail, RejectsNoAtSign) { EXPECT_FALSE(validate_email("userexample.com").has_value()); } TEST(ValidateEmail, RejectsNoDomain) { EXPECT_FALSE(validate_email("user@").has_value()); } TEST(ValidateEmail, RejectsNoLocalPart) { EXPECT_FALSE(validate_email("@example.com").has_value()); } ``` ## Step 3: Run Tests - Verify FAIL ```bash $ cmake --build build && ctest --test-dir build --output-on-failure 1/1 Test #1: email_validator_test .....***Failed --- undefined reference to `validate_email` FAIL ``` ✓ Tests fail as expected (unimplemented). ## Step 4: Implement Minimal Code (GREEN) ```cpp // validator/email.cpp #include "email.hpp" #include <regex> std::expected<void, EmailError> validate_email(const std::string& email) { if (email.empty()) { return std::unexpected(EmailError::Empty); } static const std::regex pattern(R"([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})"); if (!std::regex_match(email, pattern)) { return std::unexpected(EmailError::InvalidFormat); } return {}; } ``` ## Step 5: Run Tests - Verify PASS ```bash $ cmake --build build && ctest --test-dir build --output-on-failure 1/1 Test #1: email_validator_test ..... Passed 0.01 sec 100% tests passed. ``` ✓ All tests passing! ## Step 6: Check Coverage ```bash $ cmake -DCMAKE_CXX_FLAGS="--coverage" -B build && cmake --build build $ ctest --test-dir build $ lcov --capture --directory build --output-file coverage.info $ lcov --list coverage.info validator/email.cpp | 100% ``` ✓ Coverage: 100% ## TDD Complete! ```` ## Test Patterns ### Basic Tests ```cpp TEST(SuiteName, TestName) { EXPECT_EQ(add(2, 3), 5); EXPECT_NE(result, nullptr); EXPECT_TRUE(is_valid); EXPECT_THROW(func(), std::invalid_argument); } ``` ### Fixtures ```cpp class DatabaseTest : public ::testing::Test { protected: void SetUp() override { db_ = create_test_db(); } void TearDown() override { db_.reset(); } std::unique_ptr<Database> db_; }; TEST_F(DatabaseTest, InsertsRecord) { db_->insert("key", "value"); EXPECT_EQ(db_->get("key"), "value"); } ``` ### Parameterized Tests ```cpp class PrimeTest : public ::testing::TestWithParam<std::pair<int, bool>> {}; TEST_P(PrimeTest, ChecksPrimality) { auto [input, expected] = GetParam(); EXPECT_EQ(is_prime(input), expected); } INSTANTIATE_TEST_SUITE_P(Primes, PrimeTest, ::testing::Values( std::make_pair(2, true), std::make_pair(4, false), std::make_pair(7, true) )); ``` ## Coverage Commands ```bash # Build with coverage cmake -DCMAKE_CXX_FLAGS="--coverage" -DCMAKE_EXE_LINKER_FLAGS="--coverage" -B build # Run tests cmake --build build && ctest --test-dir build # Generate coverage report lcov --capture --directory build --output-file coverage.info lcov --remove coverage.info '/usr/*' --output-file coverage.info genhtml coverage.info --output-directory coverage_html ``` ## Coverage Targets | Code Type | Target | |-----------|--------| | Critical business logic | 100% | | Public APIs | 90%+ | | General code | 80%+ | | Generated code | Exclude | ## TDD Best Practices **DO:** - Write test FIRST, before any implementation - Run tests after each change - Use `EXPECT_*` (continues) over `ASSERT_*` (stops) when appropriate - Test behavior, not implementation details - Include edge cases (empty, null, max values, boundary conditions) **DON'T:** - Write implementation before tests - Skip the RED phase - Test private methods directly (test through public API) - Use `sleep` in tests - Ignore flaky tests ## Related Commands - `/cpp-build` - Fix build errors - `/cpp-review` - Review code after implementation - `verification-loop` skill - Run full verification loop ## Related - Skill: `skills/cpp-testing/` - Skill: `skills/tdd-workflow/`
- **/ecc-guide** `[optional arguments]` — Navigate ECC's current agents, skills, commands, hooks, install profiles, and docs from the live repository surface.
  - How it runs: # /ecc-guide Use this command as a conversational map of Everything Claude Code. It should help the user discover the right ECC surface for their task without dumping the entire README or stale catalog counts. ## Usage ```text /ecc-guide /ecc-guide setup /ecc-guide skills /ecc-guide commands /ecc-guide hooks /ecc-guide install /ecc-guide find: <query> /ecc-guide <feature-or-file-name> ``` ## Operating Rules 1. Read current repository files before answering when the checkout is available. 2. Prefer current filesystem/catalog data over hard-coded counts. 3. Keep the first answer short, then offer specific drill-down paths. 4. Link users to canonical files instead of copying long sections. 5. Do not invent commands, skills, agents, or install profiles that are not present. ## What To Inspect Use these files as the canonical map: - `README.md` for install paths, reset/uninstall guidance, and high-level positioning - `AGENTS.md` for contributor and project-structure guidance - `agent.yaml` for exported agent and command surface - `commands/` for maintained slash-command shims - `skills/*/SKILL.md` for reusable skill workflows - `agents/*.md` for delegated agent roles - `hooks/README.md` and `hooks/hooks.json` for hook behavior - `manifests/install-*.json` for selective install modules, components, and profiles - `scripts/ci/catalog.js --json` for live catalog counts when running inside ECC ## Response Patterns ### No Arguments Give a compact menu: - setup and install - choosing skills - command compatibility shims - agents and delegation - hooks and safety - troubleshooting an install - finding a specific feature Then ask what they want to do next. ### Topic Lookup For topics like `skills`, `commands`, `hooks`, `install`, or `agents`: 1. Summarize the current surface in 3-6 bullets. 2. Point to the canonical directories/files. 3. Suggest one or two commands that can verify the state. 4. Avoid exhaustive lists unless the user asks for one. ### Search Mode For `find: <query>`: 1. Search the relevant files with `rg`. 2. Group results by surface: skills, commands, agents, rules, docs, hooks. 3. Return the strongest matches first with file paths. 4. Recommend the next action for each match. ### Feature Lookup For a specific feature name: 1. Check exact paths first, such as `skills/<name>/SKILL.md`, `commands/<name>.md`, and `agents/<name>.md`. 2. If exact lookup fails, search with `rg`. 3. Explain what the feature does, when to use it, and what file is canonical. 4. Mention adjacent features only when they reduce confusion. ## Related Commands - `/project-init` for stack-aware ECC onboarding of a target project - `/harness-audit` for deterministic repo readiness scoring - `/skill-health` for skill quality checks - `/skill-create` for extracting a new skill from local git history - `/security-scan` for Claude/OpenCode configuration security review
- **/epic-claim** `[optional arguments]` — Claim an epic issue, stamp coordination state, and sync local ownership.
  - How it runs: # /epic-claim Claim one epic issue as the source of truth for a unit of work. Use the coordination script: ```bash node scripts/github-coordination.js claim <issue-number> --repo <owner/repo> --actor <login> ``` What this does: 1. Loads the issue body and coordination block. 2. Marks the epic as claimed in GitHub issue state. 3. Updates labels and the local SQLite cache. 4. Appends an audit comment for the claim. Compatibility aliases: - `/orch-add-feature` - `/orch-change-feature` - `/prp-implement`
- **/epic-decompose** `[optional arguments]` — Break an epic into task children without creating task branches.
  - How it runs: # /epic-decompose Reconcile the task breakdown for one epic issue. ```bash node scripts/github-coordination.js decompose <issue-number> --repo <owner/repo> ``` What this does: 1. Reads the epic issue body for task checklists and dependency references. 2. Stores the decomposition in the coordination block. 3. Leaves task branches out of the workflow. 4. Appends a concise audit comment. Compatibility aliases: - `/plan` - `/prp-plan`
- **/epic-publish** `[optional arguments]` — Publish a validated epic update back to the issue and local cache.
  - How it runs: # /epic-publish Publish a validated coordination update to GitHub. ```bash node scripts/github-coordination.js publish <issue-number> --repo <owner/repo> ``` What this does: 1. Re-validates the epic before publishing. 2. Updates the coordination block in the issue body. 3. Appends a concise publish comment. 4. Records the final local snapshot. Compatibility aliases: - `/pr` - `/prp-pr`
- **/epic-review** `[optional arguments]` — Mark epic review requested, approved, or changes requested.
  - How it runs: # /epic-review Coordinate review state for an epic issue. ```bash node scripts/github-coordination.js review <issue-number> --repo <owner/repo> --review approved ``` What this does: 1. Updates the review state in the coordination block. 2. Syncs review labels to GitHub. 3. Records the review outcome in an audit comment. 4. Keeps the local cache aligned with the issue body. Compatibility aliases: - `/review-pr` - `/code-review`
- **/epic-sync** `[optional arguments]` — Sync epic issue bodies, labels, and local coordination snapshots from GitHub.
  - How it runs: # /epic-sync Run a deterministic sync for epic issues. ```bash node scripts/github-coordination.js sync --repo <owner/repo> ``` What this does: 1. Reads issue bodies as the canonical epic state. 2. Reconciles the coordination block with labels. 3. Writes a fresh local snapshot for each epic issue. 4. Keeps the SQLite cache aligned with GitHub. Compatibility aliases: - `/projects` - `/work-items sync-github`
- **/epic-unblock** `[optional arguments]` — Sweep blocked epic issues and reopen anything whose dependencies are closed.
  - How it runs: # /epic-unblock Sweep blocked epics whose declared dependencies are complete. ```bash node scripts/github-coordination.js unblock --repo <owner/repo> ``` What this does: 1. Scans epic issues in the repository. 2. Checks each blocked epic's dependency list. 3. Moves fully unblocked epics to ready. 4. Updates labels, comments, and local snapshots. Compatibility aliases: - `/loop-status`
- **/epic-validate** `[optional arguments]` — Validate epic readiness, dependencies, and coordination policy.
  - How it runs: # /epic-validate Validate a single epic issue before publishing or review handoff. ```bash node scripts/github-coordination.js validate <issue-number> --repo <owner/repo> ``` What this checks: 1. Coordination state exists and is parseable. 2. Validation state is satisfied by policy. 3. Declared dependencies are closed. 4. The epic is ready for the next workflow stage. Compatibility aliases: - `/quality-gate`
- **/evolve** `[optional arguments]` — Analyze instincts and suggest or generate evolved structures
  - How it runs: # Evolve Command ## Implementation Run the instinct CLI using the plugin root path: ```bash python3 "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/scripts/instinct-cli.py" evolve [--generate] ``` Or if `CLAUDE_PLUGIN_ROOT` is not set (manual installation): ```bash python3 ~/.claude/skills/continuous-learning-v2/scripts/instinct-cli.py evolve [--generate] ``` Analyzes instincts and clusters related ones into higher-level structures: - **Commands**: When instincts describe user-invoked actions - **Skills**: When instincts describe auto-triggered behaviors - **Agents**: When instincts describe complex, multi-step processes ## Usage ``` /evolve # Analyze all instincts and suggest evolutions /evolve --generate # Also generate files under evolved/{skills,commands,agents} ``` ## Evolution Rules ### → Command (User-Invoked) When instincts describe actions a user would explicitly request: - Multiple instincts about "when user asks to..." - Instincts with triggers like "when creating a new X" - Instincts that follow a repeatable sequence Example: - `new-table-step1`: "when adding a database table, create migration" - `new-table-step2`: "when adding a database table, update schema" - `new-table-step3`: "when adding a database table, regenerate types" → Creates: **new-table** command ### → Skill (Auto-Triggered) When instincts describe behaviors that should happen automatically: - Pattern-matching triggers - Error handling responses - Code style enforcement Example: - `prefer-functional`: "when writing functions, prefer functional style" - `use-immutable`: "when modifying state, use immutable patterns" - `avoid-classes`: "when designing modules, avoid class-based design" → Creates: `functional-patterns` skill ### → Agent (Needs Depth/Isolation) When instincts describe complex, multi-step processes that benefit from isolation: - Debugging workflows - Refactoring sequences - Research tasks Example: - `debug-step1`: "when debugging, first check logs" - `debug-step2`: "when debugging, isolate the failing component" - `debug-step3`: "when debugging, create minimal reproduction" - `debug-step4`: "when debugging, verify fix with test" → Creates: **debugger** agent ## What to Do 1. Detect current project context 2. Read project + global instincts (project takes precedence on ID conflicts) 3. Group instincts by trigger/domain patterns 4. Identify: - Skill candidates (trigger clusters with 2+ instincts) - Command candidates (high-confidence workflow instincts) - Agent candidates (larger, high-confidence clusters) 5. Show promotion candidates (project -> global) when applicable 6. If `--generate` is passed, write files to: - Project scope: `~/.claude/homunculus/projects/<project-id>/evolved/` - Global fallback: `~/.claude/homunculus/evolved/` ## Output Format ``` ============================================================ EVOLVE ANALYSIS - 12 instincts Project: my-app (a1b2c3d4e5f6) Project-scoped: 8 | Global: 4 ============================================================ High confidence instincts (>=80%): 5 ## SKILL CANDIDATES 1. Cluster: "adding tests" Instincts: 3 Avg confidence: 82% Domains: testing Scopes: project ## COMMAND CANDIDATES (2) /adding-tests From: test-first-workflow [project] Confidence: 84% ## AGENT CANDIDATES (1) adding-tests-agent Covers 3 instincts Avg confidence: 82% ``` ## Flags - `--generate`: Generate evolved files in addition to analysis output ## Generated File Format ### Command ```markdown --- name: new-table description: Create a new database table with migration, schema update, and type generation command: /new-table evolved_from: - new-table-migration - update-schema - regenerate-types --- # New Table Command [Generated content based on clustered instincts] ## Steps 1. ... 2. ... ``` ### Skill ```markdown --- name: functional-patterns description: Enforce functional programming patterns evolved_from: - prefer-functional - use-immutable - avoid-classes --- # Functional Patterns Skill [Generated content based on clustered instincts] ``` ### Agent ```markdown --- name: debugger description: Systematic debugging agent model: sonnet evolved_from: - debug-check-logs - debug-isolate - debug-reproduce --- # Debugger Agent [Generated content based on clustered instincts] ```
- **/fastapi-review** `[optional arguments]` — Review a FastAPI application for architecture, async correctness, dependency injection, Pydantic schemas, security, performance, and testability.
  - How it runs: # FastAPI Review Invoke the `fastapi-reviewer` agent for a focused FastAPI review. ## Usage ```text /fastapi-review [file-or-directory] ``` ## Review Areas - App factory, router boundaries, middleware, and exception handlers. - Pydantic request and response schema separation. - Dependency injection for database sessions, auth, pagination, and settings. - Async database and external HTTP patterns. - CORS, auth, rate limits, logging, and secret handling. - OpenAPI metadata and documented response models. - Test client setup and dependency overrides. ## Expected Output ```text [SEVERITY] Short issue title File: path/to/file.py:42 Issue: What is wrong and why it matters. Fix: Concrete change to make. ``` ## Related - Agent: `fastapi-reviewer` - Skill: `fastapi-patterns` - Command: `/python-review` - Skill: `security-scan`
- **/feature-dev** `[optional arguments]` — Guided feature development with codebase understanding and architecture focus
  - How it runs: A structured feature-development workflow that emphasizes understanding existing code before writing new code. ## Phases ### 1. Discovery - read the feature request carefully - identify requirements, constraints, and acceptance criteria - ask clarifying questions if the request is ambiguous ### 2. Codebase Exploration - use `code-explorer` to analyze the relevant existing code - trace execution paths and architecture layers - understand integration points and conventions ### 3. Clarifying Questions - present findings from exploration - ask targeted design and edge-case questions - wait for user response before proceeding ### 4. Architecture Design - use `code-architect` to design the feature - provide the implementation blueprint - wait for approval before implementing ### 5. Implementation - implement the feature following the approved design - prefer TDD where appropriate - keep commits small and focused ### 6. Quality Review - use `code-reviewer` to review the implementation - address critical and important issues - verify test coverage ### 7. Summary - summarize what was built - list follow-up items or limitations - provide testing instructions
- **/flutter-build** `[optional arguments]` — Fix Dart analyzer errors and Flutter build failures incrementally. Invokes the dart-build-resolver agent for minimal, surgical fixes.
  - How it runs: # Flutter Build and Fix This command invokes the **dart-build-resolver** agent to incrementally fix Dart/Flutter build errors with minimal changes. ## What This Command Does 1. **Run Diagnostics**: Execute `flutter analyze`, `flutter pub get` 2. **Parse Errors**: Group by file and sort by severity 3. **Fix Incrementally**: One error at a time 4. **Verify Each Fix**: Re-run analysis after each change 5. **Report Summary**: Show what was fixed and what remains ## When to Use Use `/flutter-build` when: - `flutter analyze` reports errors - `flutter build` fails for any platform - `dart pub get` / `flutter pub get` fails with version conflicts - `build_runner` fails to generate code - After pulling changes that break the build ## Diagnostic Commands Run ```bash # Analysis flutter analyze 2>&1 # Dependencies flutter pub get 2>&1 # Code generation (if project uses build_runner) dart run build_runner build --delete-conflicting-outputs 2>&1 # Platform builds flutter build apk 2>&1 flutter build web 2>&1 ``` ## Example Session ````text User: /flutter-build Agent: # Flutter Build Resolution ## Initial Diagnostics ``` $ flutter analyze Analyzing project... error • lib/features/user/data/user_repository_impl.dart:34:16 • A value of type 'String?' can't be assigned to a variable of type 'String'. • invalid_assignment error • lib/features/cart/presentation/cart_page.dart:58:5 • The method 'add' isn't defined for the type 'List<Item>'. Try correcting the name to the name of an existing method, or defining a method named 'add'. • undefined_method 2 errors found. ``` ## Fix 1: Null Safety File: lib/features/user/data/user_repository_impl.dart:34 Error: A value of type 'String?' can't be assigned to type 'String' Changed: ```dart final id = response.id; ``` To: ```dart final id = response.id ?? ''; ``` ``` $ flutter analyze 1 error found. ``` ## Fix 2: Immutable List File: lib/features/cart/presentation/cart_page.dart:58 Error: The method 'add' isn't defined for the type 'List<Item>' Cause: State holds an unmodifiable list; mutation goes through Cubit Changed: ```dart state.items.add(item); ``` To: ```dart context.read<CartCubit>().addItem(item); // Note: Cubit exposes named methods (addItem, removeItem); // .add(event) is the BLoC event API — don't mix them. ``` ``` $ flutter analyze No issues found! ``` ## Final Verification ``` $ flutter test All tests passed. ``` ## Summary | Metric | Count | |--------|-------| | Analysis errors fixed | 2 | | Files modified | 2 | | Remaining issues | 0 | Build Status: PASS ✓ ```` ## Common Errors Fixed | Error | Typical Fix | |-------|-------------| | `A value of type 'X?' can't be assigned to 'X'` | Add `?? default` or null guard | | `The name 'X' isn't defined` | Add import or fix typo | | `Non-nullable instance field must be initialized` | Add initializer or `late` | | `Version solving failed` | Adjust version constraints in pubspec.yaml | | `Missing concrete implementation of 'X'` | Implement missing interface method | | `build_runner: Part of X expected` | Delete stale `.g.dart` and rebuild | ## Fix Strategy 1. **Analysis errors first** — code must be error-free 2. **Warning triage second** — fix warnings that could cause runtime bugs 3. **pub conflicts third** — fix dependency resolution 4. **One fix at a time** — verify each change 5. **Minimal changes** — don't refactor, just fix ## Stop Conditions The agent will stop and report if: - Same error persists after 3 attempts - Fix introduces more errors - Requires architectural changes - Package upgrade conflicts need user decision ## Related Commands - `/flutter-test` — Run tests after build succeeds - `/flutter-review` — Review code quality - `verification-loop` skill — Full verification loop ## Related - Agent: `agents/dart-build-resolver.md` - Skill: `skills/flutter-dart-code-review/`
- **/flutter-review** `[optional arguments]` — Review Flutter/Dart code for idiomatic patterns, widget best practices, state management, performance, accessibility, and security. Invokes the flutter-reviewer agent.
  - How it runs: # Flutter Code Review This command invokes the **flutter-reviewer** agent to review Flutter/Dart code changes. ## What This Command Does 1. **Gather Context**: Review `git diff --staged` and `git diff` 2. **Inspect Project**: Check `pubspec.yaml`, `analysis_options.yaml`, state management solution 3. **Security Pre-scan**: Check for hardcoded secrets and critical security issues 4. **Full Review**: Apply the complete review checklist 5. **Report Findings**: Output issues grouped by severity with fix guidance ## Prerequisites Before running `/flutter-review`, ensure: 1. **Build passes** — run `/flutter-build` first; a review on broken code is incomplete 2. **Tests pass** — run `/flutter-test` to confirm no regressions 3. **No merge conflicts** — resolve all conflicts so the diff reflects only intentional changes 4. **`flutter analyze` is clean** — fix analyzer warnings before review ## When to Use Use `/flutter-review` when: - Before submitting a PR with Flutter/Dart changes (after build and tests pass) - After implementing a new feature to catch issues early - When reviewing someone else's Flutter code - To audit a widget, state management component, or service class - Before a production release ## Review Areas | Area | Severity | |------|----------| | Hardcoded secrets, cleartext HTTP | CRITICAL | | Architecture violations, state management anti-patterns | CRITICAL | | Widget rebuild issues, resource leaks | HIGH | | Missing `dispose()`, `BuildContext` after await | HIGH | | Dart null safety, missing error/loading states | HIGH | | Const propagation, widget composition | HIGH | | Performance: expensive work in `build()` | HIGH | | Accessibility, semantic labels | MEDIUM | | Missing tests for state transitions | HIGH | | Hardcoded strings (l10n) | MEDIUM | | Pub dependency hygiene | LOW | ## Example Session ````text User: /flutter-review Agent: # Flutter Code Review ## Context Changed files: - lib/features/auth/presentation/login_page.dart - lib/features/auth/data/auth_repository_impl.dart State management: Riverpod (detected from pubspec.yaml) Architecture: feature-first ## Security Pre-scan ✓ No hardcoded secrets detected ✓ No cleartext HTTP calls ## Review Findings [HIGH] BuildContext used after async gap without mounted check File: lib/features/auth/presentation/login_page.dart:67 Issue: `context.go('/home')` called after `await auth.login(...)` with no `mounted` check. Fix: Add `if (!context.mounted) return;` before any navigation after awaits (Flutter 3.7+). [HIGH] AsyncValue error state not handled File: lib/features/auth/presentation/login_page.dart:42 Issue: `ref.watch(authProvider)` switches on loading/data but has no `error` branch. Fix: Add error case to the switch expression or `when()` call to show a user-facing error message. [MEDIUM] Hardcoded string not localized File: lib/features/auth/presentation/login_page.dart:89 Issue: `Text('Login')` — user-visible string not using localization system. Fix: Use the project's l10n accessor: `Text(context.l10n.loginButton)`. ## Review Summary | Severity | Count | Status | |----------|-------|--------| | CRITICAL | 0 | pass | | HIGH | 2 | block | | MEDIUM | 1 | info | | LOW | 0 | note | Verdict: BLOCK — HIGH issues must be fixed before merge. ```` ## Approval Criteria - **Approve**: No CRITICAL or HIGH issues - **Block**: Any CRITICAL or HIGH issues must be fixed before merge ## Related Commands - `/flutter-build` — Fix build errors first - `/flutter-test` — Run tests before reviewing - `/code-review` — General code review (language-agnostic) ## Related - Agent: `agents/flutter-reviewer.md` - Skill: `skills/flutter-dart-code-review/` - Rules: `rules/dart/`
- **/flutter-test** `[optional arguments]` — Run Flutter/Dart tests, report failures, and incrementally fix test issues. Covers unit, widget, golden, and integration tests.
  - How it runs: # Flutter Test This command runs the Flutter test suite and reports results. When failures occur, it diagnoses and fixes issues incrementally. ## What This Command Does 1. **Run Tests**: Execute `flutter test` (or scope to changed files) 2. **Parse Failures**: Identify failing tests by type and cause 3. **Fix Incrementally**: One failure at a time where possible 4. **Verify**: Re-run after each fix 5. **Report**: Show coverage summary and remaining failures ## When to Use Use `/flutter-test` when: - After implementing a feature to verify nothing broke - After running `/flutter-build` to ensure tests pass - To check test coverage on new code - When a specific test file is failing - Before submitting a PR ## Commands Run ```bash # Run all tests flutter test 2>&1 # Run with coverage flutter test --coverage 2>&1 # Run specific test file flutter test test/unit/domain/usecases/get_user_test.dart 2>&1 # Run tests matching a name pattern flutter test --name "CartBloc" 2>&1 # Run integration tests (requires device/emulator) flutter test integration_test/ 2>&1 # Update golden files when intentional visual changes are made flutter test --update-goldens 2>&1 ``` ## Example Session ````text User: /flutter-test Agent: # Flutter Test Run ## Test Execution ``` $ flutter test 00:05 +42 -2: Some tests failed. FAILED: test/unit/data/user_repository_test.dart UserRepository getById returns null when user not found Expected: null Actual: User(id: 'test-id', name: 'Test User') FAILED: test/widget/cart_page_test.dart CartPage shows empty state when cart is empty Expected: exactly one widget with text 'Your cart is empty' Found: no widget with text 'Your cart is empty' ``` ## Fix 1: Repository Test File: test/unit/data/user_repository_test.dart Failure: `getById` returns a user when it should return null for missing ID Root cause: Test setup adds a user with ID 'test-id' but queries with 'missing-id'. Fix: Updated test to query with 'missing-id' — setup was correct, query was wrong. ``` $ flutter test test/unit/data/user_repository_test.dart 1 test passed. ``` ## Fix 2: Widget Test File: test/widget/cart_page_test.dart Failure: Empty state text widget not found Root cause: Empty state message was renamed from 'Your cart is empty' to 'Cart is empty' in the widget. Fix: Updated test string to match current widget copy. ``` $ flutter test test/widget/cart_page_test.dart 1 test passed. ``` ## Final Run ``` $ flutter test --coverage All 44 tests passed. Coverage: 84.2% (target: 80%) ``` ## Summary | Metric | Value | |--------|-------| | Total tests | 44 | | Passed | 44 | | Failed | 0 | | Coverage | 84.2% | Test Status: PASS ✓ ```` ## Common Test Failures | Failure | Typical Fix | |---------|-------------| | `Expected: <X> Actual: <Y>` | Update assertion or fix implementation | | `Widget not found` | Fix finder selector or update test after widget rename | | `Golden file not found` | Run `flutter test --update-goldens` to generate | | `Golden mismatch` | Inspect diff; run `--update-goldens` if change was intentional | | `MissingPluginException` | Mock platform channel in test setup | | `LateInitializationError` | Initialize `late` fields in `setUp()` | | `pumpAndSettle timed out` | Replace with explicit `pump(Duration)` calls | ## Related Commands - `/flutter-build` — Fix build errors before running tests - `/flutter-review` — Review code after tests pass - `tdd-workflow` skill — Test-driven development workflow ## Related - Agent: `agents/flutter-reviewer.md` - Agent: `agents/dart-build-resolver.md` - Skill: `skills/flutter-dart-code-review/` - Rules: `rules/dart/testing.md`
- **/gan-build** `[optional arguments]` — Run a generator/evaluator build loop for implementation tasks with bounded iterations and scoring.
  - How it runs: Parse the following from $ARGUMENTS: 1. `brief` — the user's one-line description of what to build 2. `--max-iterations N` — (optional, default 15) maximum generator-evaluator cycles 3. `--pass-threshold N` — (optional, default 7.0) weighted score to pass 4. `--skip-planner` — (optional) skip planner, assume spec.md already exists 5. `--eval-mode MODE` — (optional, default "playwright") one of: playwright, screenshot, code-only ## GAN-Style Harness Build This command orchestrates a three-agent build loop inspired by Anthropic's March 2026 harness design paper. ### Phase 0: Setup 1. Create `gan-harness/` directory in project root 2. Create subdirectories: `gan-harness/feedback/`, `gan-harness/screenshots/` 3. Initialize git if not already initialized 4. Log start time and configuration ### Phase 1: Planning (Planner Agent) Unless `--skip-planner` is set: 1. Launch the `gan-planner` agent via Task tool with the user's brief 2. Wait for it to produce `gan-harness/spec.md` and `gan-harness/eval-rubric.md` 3. Display the spec summary to the user 4. Proceed to Phase 2 ### Phase 2: Generator-Evaluator Loop ``` iteration = 1 while iteration <= max_iterations: # GENERATE Launch gan-generator agent via Task tool: - Read spec.md - If iteration > 1: read feedback/feedback-{iteration-1}.md - Build/improve the application - Ensure dev server is running - Commit changes # Wait for generator to finish # EVALUATE Launch gan-evaluator agent via Task tool: - Read eval-rubric.md and spec.md - Test the live application (mode: playwright/screenshot/code-only) - Score against rubric - Write feedback to feedback/feedback-{iteration}.md # Wait for evaluator to finish # CHECK SCORE Read feedback/feedback-{iteration}.md Extract weighted total score if score >= pass_threshold: Log "PASSED at iteration {iteration} with score {score}" Break if iteration >= 3 and score has not improved in last 2 iterations: Log "PLATEAU detected — stopping early" Break iteration += 1 ``` ### Phase 3: Summary 1. Read all feedback files 2. Display final scores and iteration history 3. Show score progression: `iteration 1: 4.2 → iteration 2: 5.8 → ... → iteration N: 7.5` 4. List any remaining issues from the final evaluation 5. Report total time and estimated cost ### Output ```markdown ## GAN Harness Build Report **Brief:** [original prompt] **Result:** PASS/FAIL **Iterations:** N / max **Final Score:** X.X / 10 ### Score Progression | Iter | Design | Originality | Craft | Functionality | Total | |------|--------|-------------|-------|---------------|-------| | 1 | ... | ... | ... | ... | X.X | | 2 | ... | ... | ... | ... | X.X | | N | ... | ... | ... | ... | X.X | ### Remaining Issues - [Any issues from final evaluation] ### Files Created - gan-harness/spec.md - gan-harness/eval-rubric.md - gan-harness/feedback/feedback-001.md through feedback-NNN.md - gan-harness/generator-state.md - gan-harness/build-report.md ``` Write the full report to `gan-harness/build-report.md`.
- **/gan-design** `[optional arguments]` — Run a generator/evaluator design loop for frontend or visual work with bounded iterations and scoring.
  - How it runs: Parse the following from $ARGUMENTS: 1. `brief` — the user's description of the design to create 2. `--max-iterations N` — (optional, default 10) maximum design-evaluate cycles 3. `--pass-threshold N` — (optional, default 7.5) weighted score to pass (higher default for design) ## GAN-Style Design Harness A two-agent loop (Generator + Evaluator) focused on frontend design quality. No planner — the brief IS the spec. This is the same mode Anthropic used for their frontend design experiments, where they saw creative breakthroughs like the 3D Dutch art museum with CSS perspective and doorway navigation. ### Setup 1. Create `gan-harness/` directory 2. Write the brief directly as `gan-harness/spec.md` 3. Write a design-focused `gan-harness/eval-rubric.md` with extra weight on Design Quality and Originality ### Design-Specific Eval Rubric ```markdown ### Design Quality (weight: 0.35) ### Originality (weight: 0.30) ### Craft (weight: 0.25) ### Functionality (weight: 0.10) ``` Note: Originality weight is higher (0.30 vs 0.20) to push for creative breakthroughs. Functionality weight is lower since design mode focuses on visual quality. ### Loop Same as `/project:gan-build` Phase 2, but: - Skip the planner - Use the design-focused rubric - Generator prompt emphasizes visual quality over feature completeness - Evaluator prompt emphasizes "would this win a design award?" over "do all features work?" ### Key Difference from gan-build The Generator is told: "Your PRIMARY goal is visual excellence. A stunning half-finished app beats a functional ugly one. Push for creative leaps — unusual layouts, custom animations, distinctive color work."
- **/go-build** `[optional arguments]` — Fix Go build errors, go vet warnings, and linter issues incrementally. Invokes the go-build-resolver agent for minimal, surgical fixes.
  - How it runs: # Go Build and Fix This command invokes the **go-build-resolver** agent to incrementally fix Go build errors with minimal changes. ## What This Command Does 1. **Run Diagnostics**: Execute `go build`, `go vet`, `staticcheck` 2. **Parse Errors**: Group by file and sort by severity 3. **Fix Incrementally**: One error at a time 4. **Verify Each Fix**: Re-run build after each change 5. **Report Summary**: Show what was fixed and what remains ## When to Use Use `/go-build` when: - `go build ./...` fails with errors - `go vet ./...` reports issues - `golangci-lint run` shows warnings - Module dependencies are broken - After pulling changes that break the build ## Diagnostic Commands Run ```bash # Primary build check go build ./... # Static analysis go vet ./... # Extended linting (if available) staticcheck ./... golangci-lint run # Module issues go mod verify go mod tidy -v ``` ## Example Session ```text User: /go-build Agent: # Go Build Resolution ## Initial Diagnostics ```bash $ go build ./... internal/service/user.go:25:15: undefined: UserRepository internal/handler/api.go:42:9: cannot use x (type string) as type int internal/handler/api.go:58:2: missing return at end of function ``` Errors found: 3 ## Fix 1: Undefined Identifier File: internal/service/user.go:25 Error: undefined: UserRepository Cause: Missing import ```go // Added import import "project/internal/repository" // Changed var repo UserRepository // To var repo repository.UserRepository ``` ```bash $ go build ./... # 2 errors remaining ``` ## Fix 2: Type Mismatch File: internal/handler/api.go:42 Error: cannot use x (type string) as type int ```go // Changed count := params.Get("count") // To countStr := params.Get("count") count, _ := strconv.Atoi(countStr) ``` ```bash $ go build ./... # 1 error remaining ``` ## Fix 3: Missing Return File: internal/handler/api.go:58 Error: missing return at end of function ```go func GetUser(id string) (*User, error) { if id == "" { return nil, ErrInvalidID } user := findUser(id) // Added missing return return user, nil } ``` ```bash $ go build ./... # Build successful! ``` ## Final Verification ```bash $ go vet ./... # No issues $ go test ./... ok project/internal/service 0.015s ok project/internal/handler 0.023s ``` ## Summary | Metric | Count | |--------|-------| | Build errors fixed | 3 | | Vet warnings fixed | 0 | | Files modified | 2 | | Remaining issues | 0 | Build Status: PASS: SUCCESS ``` ## Common Errors Fixed | Error | Typical Fix | |-------|-------------| | `undefined: X` | Add import or fix typo | | `cannot use X as Y` | Type conversion or fix assignment | | `missing return` | Add return statement | | `X does not implement Y` | Add missing method | | `import cycle` | Restructure packages | | `declared but not used` | Remove or use variable | | `cannot find package` | `go get` or `go mod tidy` | ## Fix Strategy 1. **Build errors first** - Code must compile 2. **Vet warnings second** - Fix suspicious constructs 3. **Lint warnings third** - Style and best practices 4. **One fix at a time** - Verify each change 5. **Minimal changes** - Don't refactor, just fix ## Stop Conditions The agent will stop and report if: - Same error persists after 3 attempts - Fix introduces more errors - Requires architectural changes - Missing external dependencies ## Related Commands - `/go-test` - Run tests after build succeeds - `/go-review` - Review code quality - `verification-loop` skill - Full verification loop ## Related - Agent: `agents/go-build-resolver.md` - Skill: `skills/golang-patterns/`
- **/go-review** `[optional arguments]` — Comprehensive Go code review for idiomatic patterns, concurrency safety, error handling, and security. Invokes the go-reviewer agent.
  - How it runs: # Go Code Review This command invokes the **go-reviewer** agent for comprehensive Go-specific code review. ## What This Command Does 1. **Identify Go Changes**: Find modified `.go` files via `git diff` 2. **Run Static Analysis**: Execute `go vet`, `staticcheck`, and `golangci-lint` 3. **Security Scan**: Check for SQL injection, command injection, race conditions 4. **Concurrency Review**: Analyze goroutine safety, channel usage, mutex patterns 5. **Idiomatic Go Check**: Verify code follows Go conventions and best practices 6. **Generate Report**: Categorize issues by severity ## When to Use Use `/go-review` when: - After writing or modifying Go code - Before committing Go changes - Reviewing pull requests with Go code - Onboarding to a new Go codebase - Learning idiomatic Go patterns ## Review Categories ### CRITICAL (Must Fix) - SQL/Command injection vulnerabilities - Race conditions without synchronization - Goroutine leaks - Hardcoded credentials - Unsafe pointer usage - Ignored errors in critical paths ### HIGH (Should Fix) - Missing error wrapping with context - Panic instead of error returns - Context not propagated - Unbuffered channels causing deadlocks - Interface not satisfied errors - Missing mutex protection ### MEDIUM (Consider) - Non-idiomatic code patterns - Missing godoc comments on exports - Inefficient string concatenation - Slice not preallocated - Table-driven tests not used ## Automated Checks Run ```bash # Static analysis go vet ./... # Advanced checks (if installed) staticcheck ./... golangci-lint run # Race detection go build -race ./... # Security vulnerabilities govulncheck ./... ``` ## Example Usage ```text User: /go-review Agent: # Go Code Review Report ## Files Reviewed - internal/handler/user.go (modified) - internal/service/auth.go (modified) ## Static Analysis Results ✓ go vet: No issues ✓ staticcheck: No issues ## Issues Found [CRITICAL] Race Condition File: internal/service/auth.go:45 Issue: Shared map accessed without synchronization ```go var cache = map[string]*Session{} // Concurrent access! func GetSession(id string) *Session { return cache[id] // Race condition } ``` Fix: Use sync.RWMutex or sync.Map ```go var ( cache = map[string]*Session{} cacheMu sync.RWMutex ) func GetSession(id string) *Session { cacheMu.RLock() defer cacheMu.RUnlock() return cache[id] } ``` [HIGH] Missing Error Context File: internal/handler/user.go:28 Issue: Error returned without context ```go return err // No context ``` Fix: Wrap with context ```go return fmt.Errorf("get user %s: %w", userID, err) ``` ## Summary - CRITICAL: 1 - HIGH: 1 - MEDIUM: 0 Recommendation: FAIL: Block merge until CRITICAL issue is fixed ``` ## Approval Criteria | Status | Condition | |--------|-----------| | PASS: Approve | No CRITICAL or HIGH issues | | WARNING: Warning | Only MEDIUM issues (merge with caution) | | FAIL: Block | CRITICAL or HIGH issues found | ## Integration with Other Commands - Use `/go-test` first to ensure tests pass - Use `/go-build` if build errors occur - Use `/go-review` before committing - Use `/code-review` for non-Go specific concerns ## Related - Agent: `agents/go-reviewer.md` - Skills: `skills/golang-patterns/`, `skills/golang-testing/`
- **/go-test** `[optional arguments]` — Enforce TDD workflow for Go. Write table-driven tests first, then implement. Verify 80%+ coverage with go test -cover.
  - How it runs: # Go TDD Command This command enforces test-driven development methodology for Go code using idiomatic Go testing patterns. ## What This Command Does 1. **Define Types/Interfaces**: Scaffold function signatures first 2. **Write Table-Driven Tests**: Create comprehensive test cases (RED) 3. **Run Tests**: Verify tests fail for the right reason 4. **Implement Code**: Write minimal code to pass (GREEN) 5. **Refactor**: Improve while keeping tests green 6. **Check Coverage**: Ensure 80%+ coverage ## When to Use Use `/go-test` when: - Implementing new Go functions - Adding test coverage to existing code - Fixing bugs (write failing test first) - Building critical business logic - Learning TDD workflow in Go ## TDD Cycle ``` RED → Write failing table-driven test GREEN → Implement minimal code to pass REFACTOR → Improve code, tests stay green REPEAT → Next test case ``` ## Example Session ```` User: /go-test I need a function to validate email addresses Agent: # TDD Session: Email Validator ## Step 1: Define Interface ```go // validator/email.go package validator // ValidateEmail checks if the given string is a valid email address. // Returns nil if valid, error describing the issue otherwise. func ValidateEmail(email string) error { panic("not implemented") } ``` ## Step 2: Write Table-Driven Tests (RED) ```go // validator/email_test.go package validator import ( "testing" ) func TestValidateEmail(t *testing.T) { tests := []struct { name string email string wantErr bool }{ // Valid emails {"simple email", "user@example.com", false}, {"with subdomain", "user@mail.example.com", false}, {"with plus", "user+tag@example.com", false}, {"with dots", "first.last@example.com", false}, // Invalid emails {"empty string", "", true}, {"no at sign", "userexample.com", true}, {"no domain", "user@", true}, {"no local part", "@example.com", true}, {"double at", "user@@example.com", true}, {"spaces", "user @example.com", true}, {"no tld", "user@example", true}, } for _, tt := range tests { t.Run(tt.name, func(t *testing.T) { err := ValidateEmail(tt.email) if tt.wantErr && err == nil { t.Errorf("ValidateEmail(%q) = nil; want error", tt.email) } if !tt.wantErr && err != nil { t.Errorf("ValidateEmail(%q) = %v; want nil", tt.email, err) } }) } } ``` ## Step 3: Run Tests - Verify FAIL ```bash $ go test ./validator/... --- FAIL: TestValidateEmail (0.00s) --- FAIL: TestValidateEmail/simple_email (0.00s) panic: not implemented FAIL ``` ✓ Tests fail as expected (panic). ## Step 4: Implement Minimal Code (GREEN) ```go // validator/email.go package validator import ( "errors" "regexp" ) var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`) var ( ErrEmailEmpty = errors.New("email cannot be empty") ErrEmailInvalid = errors.New("email format is invalid") ) func ValidateEmail(email string) error { if email == "" { return ErrEmailEmpty } if !emailRegex.MatchString(email) { return ErrEmailInvalid } return nil } ``` ## Step 5: Run Tests - Verify PASS ```bash $ go test ./validator/... PASS ok project/validator 0.003s ``` ✓ All tests passing! ## Step 6: Check Coverage ```bash $ go test -cover ./validator/... PASS coverage: 100.0% of statements ok project/validator 0.003s ``` ✓ Coverage: 100% ## TDD Complete! ```` ## Test Patterns ### Table-Driven Tests ```go tests := []struct { name string input InputType want OutputType wantErr bool }{ {"case 1", input1, want1, false}, {"case 2", input2, want2, true}, } for _, tt := range tests { t.Run(tt.name, func(t *testing.T) { got, err := Function(tt.input) // assertions }) } ``` ### Parallel Tests ```go for _, tt := range tests { tt := tt // Capture t.Run(tt.name, func(t *testing.T) { t.Parallel() // test body }) } ``` ### Test Helpers ```go func setupTestDB(t *testing.T) *sql.DB { t.Helper() db := createDB() t.Cleanup(func() { db.Close() }) return db } ``` ## Coverage Commands ```bash # Basic coverage go test -cover ./... # Coverage profile go test -coverprofile=coverage.out ./... # View in browser go tool cover -html=coverage.out # Coverage by function go tool cover -func=coverage.out # With race detection go test -race -cover ./... ``` ## Coverage Targets | Code Type | Target | |-----------|--------| | Critical business logic | 100% | | Public APIs | 90%+ | | General code | 80%+ | | Generated code | Exclude | ## TDD Best Practices **DO:** - Write test FIRST, before any implementation - Run tests after each change - Use table-driven tests for comprehensive coverage - Test behavior, not implementation details - Include edge cases (empty, nil, max values) **DON'T:** - Write implementation before tests - Skip the RED phase - Test private functions directly - Use `time.Sleep` in tests - Ignore flaky tests ## Related Commands - `/go-build` - Fix build errors - `/go-review` - Review code after implementation - `verification-loop` skill - Run full verification loop ## Related - Skill: `skills/golang-testing/` - Skill: `skills/tdd-workflow/`
- **/gradle-build** `[optional arguments]` — Fix Gradle build errors for Android and KMP projects
  - How it runs: # Gradle Build Fix Incrementally fix Gradle build and compilation errors for Android and Kotlin Multiplatform projects. ## Step 1: Detect Build Configuration Identify the project type and run the appropriate build: | Indicator | Build Command | |-----------|---------------| | `build.gradle.kts` + `composeApp/` (KMP) | `./gradlew composeApp:compileKotlinMetadata 2>&1` | | `build.gradle.kts` + `app/` (Android) | `./gradlew app:compileDebugKotlin 2>&1` | | `settings.gradle.kts` with modules | `./gradlew assemble 2>&1` | | Detekt configured | `./gradlew detekt 2>&1` | Also check `gradle.properties` and `local.properties` for configuration. ## Step 2: Parse and Group Errors 1. Run the build command and capture output 2. Separate Kotlin compilation errors from Gradle configuration errors 3. Group by module and file path 4. Sort: configuration errors first, then compilation errors by dependency order ## Step 3: Fix Loop For each error: 1. **Read the file** — Full context around the error line 2. **Diagnose** — Common categories: - Missing import or unresolved reference - Type mismatch or incompatible types - Missing dependency in `build.gradle.kts` - Expect/actual mismatch (KMP) - Compose compiler error 3. **Fix minimally** — Smallest change that resolves the error 4. **Re-run build** — Verify fix and check for new errors 5. **Continue** — Move to next error ## Step 4: Guardrails Stop and ask the user if: - Fix introduces more errors than it resolves - Same error persists after 3 attempts - Error requires adding new dependencies or changing module structure - Gradle sync itself fails (configuration-phase error) - Error is in generated code (Room, SQLDelight, KSP) ## Step 5: Summary Report: - Errors fixed (module, file, description) - Errors remaining - New errors introduced (should be zero) - Suggested next steps ## Common Gradle/KMP Fixes | Error | Fix | |-------|-----| | Unresolved reference in `commonMain` | Check if the dependency is in `commonMain.dependencies {}` | | Expect declaration without actual | Add `actual` implementation in each platform source set | | Compose compiler version mismatch | Align Kotlin and Compose compiler versions in `libs.versions.toml` | | Duplicate class | Check for conflicting dependencies with `./gradlew dependencies` | | KSP error | Run `./gradlew kspCommonMainKotlinMetadata` to regenerate | | Configuration cache issue | Check for non-serializable task inputs |
- **/harness-audit** `[optional arguments]` — Run a deterministic repository harness audit and return a prioritized scorecard.
  - How it runs: # Harness Audit Command Run a deterministic repository harness audit and return a prioritized scorecard. ## Usage `/harness-audit [scope] [--format text|json] [--root path]` - `scope` (optional): `repo` (default), `hooks`, `skills`, `commands`, `agents` - `--format`: output style (`text` default, `json` for automation) - `--root`: audit a specific path instead of the current working directory ## Deterministic Engine Always run: ```bash node scripts/harness-audit.js <scope> --format <text|json> [--root <path>] ``` This script is the source of truth for scoring and checks. Do not invent additional dimensions or ad-hoc points. Rubric version: `2026-05-19`. The script computes up to 12 fixed categories (`0-10` normalized each). The first seven are always applicable; GitHub Integration is always applicable; deploy-target categories are applicable only when a matching marker is detected. 1. Tool Coverage 2. Context Efficiency 3. Quality Gates 4. Memory Persistence 5. Eval Coverage 6. Security Guardrails 7. Cost Efficiency 8. GitHub Integration 9. Vercel Integration *(when `vercel.json` or `.vercel/` is present)* 10. Netlify Integration *(when `netlify.toml` or `.netlify/` is present)* 11. Cloudflare Integration *(when `wrangler.toml` or `wrangler.jsonc` is present)* 12. Fly Integration *(when `fly.toml` is present)* Scores are derived from explicit file/rule checks and are reproducible for the same commit. The script audits the current working directory by default and auto-detects whether the target is the ECC repo itself or a consumer project using ECC. ## Output Contract Return: 1. `overall_score` out of `max_score`. `max_score` depends on which categories are applicable to the target; never assume a fixed total. 2. `applicable_categories[]` and `category_count` describing which categories contributed. 3. Category scores and concrete findings. 4. Failed checks with exact file paths. 5. Top 3 actions from the deterministic output (`top_actions`). 6. Suggested ECC skills to apply next. ## Checklist - Use script output directly; do not rescore manually. - If `--format json` is requested, return the script JSON unchanged. - If text is requested, summarize failing checks and top actions. - Include exact file paths from `checks[]` and `top_actions[]`. ## Example Result ```text Harness Audit (repo, repo): 71/80 - Tool Coverage: 10/10 (10/10 pts) - Context Efficiency: 9/10 (9/10 pts) - Quality Gates: 10/10 (10/10 pts) - GitHub Integration: 2/10 (2/10 pts) Top 3 Actions: 1) [GitHub Integration] Add at least one workflow under .github/workflows/. (.github/workflows/) 2) [Security Guardrails] Add prompt/tool preflight security guards in hooks/hooks.json. (hooks/hooks.json) 3) [Eval Coverage] Increase automated test coverage across scripts/hooks/lib. (tests/) ``` ## Arguments $ARGUMENTS: - `repo|hooks|skills|commands|agents` (optional scope) - `--format text|json` (optional output format)
- **/hookify-configure** `[optional arguments]` — Enable or disable hookify rules interactively
  - How it runs: Interactively enable or disable existing hookify rules. ## Steps 1. Find all `.claude/hookify.*.local.md` files 2. Read the current state of each rule 3. Present the list with current enabled / disabled status 4. Ask which rules to toggle 5. Update the `enabled:` field in the selected rule files 6. Confirm the changes
- **/hookify-help** `[optional arguments]` — Get help with the hookify system
  - How it runs: Display comprehensive hookify documentation. ## Hook System Overview Hookify creates rule files that integrate with Claude Code's hook system to prevent unwanted behaviors. ### Event Types - `bash`: triggers on Bash tool use and matches command patterns - `file`: triggers on Write/Edit tool use and matches file paths - `stop`: triggers when a session ends - `prompt`: triggers on user message submission and matches input patterns - `all`: triggers on all events ### Rule File Format Files are stored as `.claude/hookify.{name}.local.md`: ```yaml --- name: descriptive-name enabled: true event: bash|file|stop|prompt|all action: block|warn pattern: "regex pattern to match" --- Message to display when rule triggers. Supports multiple lines. ``` ### Commands - `/hookify [description]` creates new rules and auto-analyzes the conversation when no description is given - `/hookify-list` lists configured rules - `/hookify-configure` toggles rules on or off ### Pattern Tips - use regex syntax - for `bash`, match against the full command string - for `file`, match against the file path - test patterns before deploying
- **/hookify-list** `[optional arguments]` — List all configured hookify rules
  - How it runs: Find and display all hookify rules in a formatted table. ## Steps 1. Find all `.claude/hookify.*.local.md` files 2. Read each file's frontmatter: - `name` - `enabled` - `event` - `action` - `pattern` 3. Display them as a table: | Rule | Enabled | Event | Pattern | File | |------|---------|-------|---------|------| 4. Show the rule count and remind the user that `/hookify-configure` can change state later.
- **/hookify** `[optional arguments]` — Create hooks to prevent unwanted behaviors from conversation analysis or explicit instructions
  - How it runs: Create hook rules to prevent unwanted Claude Code behaviors by analyzing conversation patterns or explicit user instructions. ## Usage `/hookify [description of behavior to prevent]` If no arguments are provided, analyze the current conversation to find behaviors worth preventing. ## Workflow ### Step 1: Gather Behavior Info - With arguments: parse the user's description of the unwanted behavior - Without arguments: use the `conversation-analyzer` agent to find: - explicit corrections - frustrated reactions to repeated mistakes - reverted changes - repeated similar issues ### Step 2: Present Findings Show the user: - behavior description - proposed event type - proposed pattern or matcher - proposed action ### Step 3: Generate Rule Files For each approved rule, create a file at `.claude/hookify.{name}.local.md`: ```yaml --- name: rule-name enabled: true event: bash|file|stop|prompt|all action: block|warn pattern: "regex pattern" --- Message shown when rule triggers. ``` ### Step 4: Confirm Report created rules and how to manage them with `/hookify-list` and `/hookify-configure`.
- **/instinct-export** `[optional arguments]` — Export instincts from project/global scope to a file
  - How it runs: # Instinct Export Command Exports instincts to a shareable format. Perfect for: - Sharing with teammates - Transferring to a new machine - Contributing to project conventions ## Usage ``` /instinct-export # Export all personal instincts /instinct-export --domain testing # Export only testing instincts /instinct-export --min-confidence 0.7 # Only export high-confidence instincts /instinct-export --output team-instincts.yaml /instinct-export --scope project --output project-instincts.yaml ``` ## What to Do 1. Detect current project context 2. Load instincts by selected scope: - `project`: current project only - `global`: global only - `all`: project + global merged (default) 3. Apply filters (`--domain`, `--min-confidence`) 4. Write YAML-style export to file (or stdout if no output path provided) ## Output Format Creates a YAML file: ```yaml # Instincts Export # Generated: 2025-01-22 # Source: personal # Count: 12 instincts --- id: prefer-functional-style trigger: "when writing new functions" confidence: 0.8 domain: code-style source: session-observation scope: project project_id: a1b2c3d4e5f6 project_name: my-app --- # Prefer Functional Style ## Action Use functional patterns over classes. ``` ## Flags - `--domain <name>`: Export only specified domain - `--min-confidence <n>`: Minimum confidence threshold - `--output <file>`: Output file path (prints to stdout when omitted) - `--scope <project|global|all>`: Export scope (default: `all`)
- **/instinct-import** `[optional arguments]` — Import instincts from file or URL into project/global scope
  - How it runs: # Instinct Import Command ## Implementation Run the instinct CLI using the plugin root path: ```bash python3 "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/scripts/instinct-cli.py" import <file-or-url> [--dry-run] [--force] [--min-confidence 0.7] [--scope project|global] ``` Or if `CLAUDE_PLUGIN_ROOT` is not set (manual installation): ```bash python3 ~/.claude/skills/continuous-learning-v2/scripts/instinct-cli.py import <file-or-url> ``` Import instincts from local file paths or HTTP(S) URLs. ## Usage ``` /instinct-import team-instincts.yaml /instinct-import https://github.com/org/repo/instincts.yaml /instinct-import team-instincts.yaml --dry-run /instinct-import team-instincts.yaml --scope global --force ``` ## What to Do 1. Fetch the instinct file (local path or URL) 2. Parse and validate the format 3. Check for duplicates with existing instincts 4. Merge or add new instincts 5. Save to inherited instincts directory: - Project scope: `~/.claude/homunculus/projects/<project-id>/instincts/inherited/` - Global scope: `~/.claude/homunculus/instincts/inherited/` ## Import Process ``` Importing instincts from: team-instincts.yaml ================================================ Found 12 instincts to import. Analyzing conflicts... ## New Instincts (8) These will be added: ✓ use-zod-validation (confidence: 0.7) ✓ prefer-named-exports (confidence: 0.65) ✓ test-async-functions (confidence: 0.8) ... ## Duplicate Instincts (3) Already have similar instincts: WARNING: prefer-functional-style Local: 0.8 confidence, 12 observations Import: 0.7 confidence → Keep local (higher confidence) WARNING: test-first-workflow Local: 0.75 confidence Import: 0.9 confidence → Update to import (higher confidence) Import 8 new, update 1? ``` ## Merge Behavior When importing an instinct with an existing ID: - Higher-confidence import becomes an update candidate - Equal/lower-confidence import is skipped - User confirms unless `--force` is used ## Source Tracking Imported instincts are marked with: ```yaml source: inherited scope: project imported_from: "team-instincts.yaml" project_id: "a1b2c3d4e5f6" project_name: "my-project" ``` ## Flags - `--dry-run`: Preview without importing - `--force`: Skip confirmation prompt - `--min-confidence <n>`: Only import instincts above threshold - `--scope <project|global>`: Select target scope (default: `project`) ## Output After import: ``` PASS: Import complete! Added: 8 instincts Updated: 1 instinct Skipped: 3 instincts (equal/higher confidence already exists) New instincts saved to: ~/.claude/homunculus/instincts/inherited/ Run /instinct-status to see all instincts. ```
- **/instinct-status** `[optional arguments]` — Show learned instincts (project + global) with confidence
  - How it runs: # Instinct Status Command Shows learned instincts for the current project plus global instincts, grouped by domain. ## Implementation Run the instinct CLI, resolving the active ECC plugin root the same way `hooks/hooks.json` and the other slash commands (`/sessions`, `/skill-health`) do — env var → standard install → known plugin roots → plugin cache → fallback. This avoids the divergence that happens when `CLAUDE_PLUGIN_ROOT` is unset while a legacy `~/.claude/skills/continuous-learning-v2/` directory still exists (#2037). ```bash ECC_ROOT="${CLAUDE_PLUGIN_ROOT:-$(node -e "var r=(function(){var p=require('path'),f=require('fs'),o=require('os');var e=process.env.CLAUDE_PLUGIN_ROOT;if(e&&e.trim())return e.trim();var d=p.join(o.homedir(),'.claude');function L(x){try{return require(p.join(x,'scripts','lib','resolve-ecc-root')).resolveEccRoot()}catch(_){return null}}var r=L(d);if(r)return r;var s=['ecc','ecc@ecc','marketplaces/ecc','everything-claude-code','everything-claude-code@everything-claude-code','marketplaces/everything-claude-code'];for(var i=0;i<s.length;i++){r=L(p.join(d,'plugins',s[i]));if(r)return r}try{var g=['ecc','everything-claude-code'];for(var j=0;j<g.length;j++){var c=p.join(d,'plugins','cache',g[j]);var O=f.readdirSync(c);for(var k=0;k<O.length;k++){var q=p.join(c,O[k]);var V=f.readdirSync(q);for(var m=0;m<V.length;m++){r=L(p.join(q,V[m]));if(r)return r}}}}catch(_){}return d})();console.log(r)")}" python3 "$ECC_ROOT/skills/continuous-learning-v2/scripts/instinct-cli.py" status ``` ## Usage ``` /instinct-status ``` ## What to Do 1. Detect current project context (git remote/path hash) 2. Read project instincts from `~/.claude/homunculus/projects/<project-id>/instincts/` 3. Read global instincts from `~/.claude/homunculus/instincts/` 4. Merge with precedence rules (project overrides global when IDs collide) 5. Display grouped by domain with confidence bars and observation stats ## Output Format ``` ============================================================ INSTINCT STATUS - 12 total ============================================================ Project: my-app (a1b2c3d4e5f6) Project instincts: 8 Global instincts: 4 ## PROJECT-SCOPED (my-app) ### WORKFLOW (3) ███████░░░ 70% grep-before-edit [project] trigger: when modifying code ## GLOBAL (apply to all projects) ### SECURITY (2) █████████░ 85% validate-user-input [global] trigger: when handling user input ```
- **/jira** `[optional arguments]` — Retrieve a Jira ticket, analyze requirements, update status, or add comments. Uses the jira-integration skill and MCP or REST API.
  - How it runs: # Jira Command Interact with Jira tickets directly from your workflow — fetch tickets, analyze requirements, add comments, and transition status. ## Usage ``` /jira get <TICKET-KEY> # Fetch and analyze a ticket /jira comment <TICKET-KEY> # Add a progress comment /jira transition <TICKET-KEY> # Change ticket status /jira search <JQL> # Search issues with JQL ``` ## What This Command Does 1. **Get & Analyze** — Fetch a Jira ticket and extract requirements, acceptance criteria, test scenarios, and dependencies 2. **Comment** — Add structured progress updates to a ticket 3. **Transition** — Move a ticket through workflow states (To Do → In Progress → Done) 4. **Search** — Find issues using JQL queries ## How It Works ### `/jira get <TICKET-KEY>` 1. Fetch the ticket from Jira (via MCP `jira_get_issue` or REST API) 2. Extract all fields: summary, description, acceptance criteria, priority, labels, linked issues 3. Optionally fetch comments for additional context 4. Produce a structured analysis: ``` Ticket: PROJ-1234 Summary: [title] Status: [status] Priority: [priority] Type: [Story/Bug/Task] Requirements: 1. [extracted requirement] 2. [extracted requirement] Acceptance Criteria: - [ ] [criterion from ticket] Test Scenarios: - Happy Path: [description] - Error Case: [description] - Edge Case: [description] Dependencies: - [linked issues, APIs, services] Recommended Next Steps: - /plan to create implementation plan - `tdd-workflow` skill to implement with tests first ``` ### `/jira comment <TICKET-KEY>` 1. Summarize current session progress (what was built, tested, committed) 2. Format as a structured comment 3. Post to the Jira ticket ### `/jira transition <TICKET-KEY>` 1. Fetch available transitions for the ticket 2. Show options to user 3. Execute the selected transition ### `/jira search <JQL>` 1. Execute the JQL query against Jira 2. Return a summary table of matching issues ## Prerequisites This command requires Jira credentials. Choose one: **Option A — MCP Server (recommended):** Add `jira` to your `mcpServers` config (see `mcp-configs/mcp-servers.json` for the template). **Option B — Environment variables:** ```bash export JIRA_URL="https://yourorg.atlassian.net" export JIRA_EMAIL="your.email@example.com" export JIRA_API_TOKEN="your-api-token" ``` If credentials are missing, stop and direct the user to set them up. ## Integration with Other Commands After analyzing a ticket: - Use `/plan` to create an implementation plan from the requirements - Use the `tdd-workflow` skill to implement with test-driven development - Use `/code-review` after implementation - Use `/jira comment` to post progress back to the ticket - Use `/jira transition` to move the ticket when work is complete ## Related - **Skill:** `skills/jira-integration/` - **MCP config:** `mcp-configs/mcp-servers.json` → `jira`
- **/kotlin-build** `[optional arguments]` — Fix Kotlin/Gradle build errors, compiler warnings, and dependency issues incrementally. Invokes the kotlin-build-resolver agent for minimal, surgical fixes.
  - How it runs: # Kotlin Build and Fix This command invokes the **kotlin-build-resolver** agent to incrementally fix Kotlin build errors with minimal changes. ## What This Command Does 1. **Run Diagnostics**: Execute `./gradlew build`, `detekt`, `ktlintCheck` 2. **Parse Errors**: Group by file and sort by severity 3. **Fix Incrementally**: One error at a time 4. **Verify Each Fix**: Re-run build after each change 5. **Report Summary**: Show what was fixed and what remains ## When to Use Use `/kotlin-build` when: - `./gradlew build` fails with errors - Kotlin compiler reports errors - `./gradlew detekt` reports violations - Gradle dependency resolution fails - After pulling changes that break the build ## Diagnostic Commands Run ```bash # Primary build check ./gradlew build 2>&1 # Static analysis ./gradlew detekt 2>&1 || echo "detekt not configured" ./gradlew ktlintCheck 2>&1 || echo "ktlint not configured" # Dependency issues ./gradlew dependencies --configuration runtimeClasspath 2>&1 | head -100 # Optional deep refresh when caches or dependency metadata are suspect ./gradlew build --refresh-dependencies ``` ## Example Session ````text User: /kotlin-build Agent: # Kotlin Build Resolution ## Initial Diagnostics ```bash $ ./gradlew build e: src/main/kotlin/com/example/service/UserService.kt:25:15 Unresolved reference: UserRepository e: src/main/kotlin/com/example/routes/UserRoutes.kt:42:9 Type mismatch: inferred type is String but Int was expected e: src/main/kotlin/com/example/routes/UserRoutes.kt:58:5 'when' expression must be exhaustive ``` Errors found: 3 ## Fix 1: Unresolved Reference File: src/main/kotlin/com/example/service/UserService.kt:25 Error: Unresolved reference: UserRepository Cause: Missing import ```kotlin // Added import import com.example.repository.UserRepository ``` ```bash $ ./gradlew build # 2 errors remaining ``` ## Fix 2: Type Mismatch File: src/main/kotlin/com/example/routes/UserRoutes.kt:42 Error: Type mismatch: inferred type is String but Int was expected ```kotlin // Changed val count = call.parameters["count"] // To val count = call.parameters["count"]?.toIntOrNull() ?: return@get call.respond(HttpStatusCode.BadRequest, "Invalid count") ``` ```bash $ ./gradlew build # 1 error remaining ``` ## Fix 3: Non-Exhaustive When File: src/main/kotlin/com/example/routes/UserRoutes.kt:58 Error: 'when' expression must be exhaustive ```kotlin // Added missing branch when (user.role) { Role.ADMIN -> handleAdmin(user) Role.USER -> handleUser(user) Role.MODERATOR -> handleModerator(user) // Added } ``` ```bash $ ./gradlew build # Build successful! ``` ## Final Verification ```bash $ ./gradlew detekt # No issues $ ./gradlew test # All tests passed ``` ## Summary | Metric | Count | |--------|-------| | Build errors fixed | 3 | | Detekt issues fixed | 0 | | Files modified | 2 | | Remaining issues | 0 | Build Status: PASS: SUCCESS ```` ## Common Errors Fixed | Error | Typical Fix | |-------|-------------| | `Unresolved reference: X` | Add import or dependency | | `Type mismatch` | Fix type conversion or assignment | | `'when' must be exhaustive` | Add missing sealed class branches | | `Suspend function can only be called from coroutine` | Add `suspend` modifier | | `Smart cast impossible` | Use local `val` or `let` | | `None of the following candidates is applicable` | Fix argument types | | `Could not resolve dependency` | Fix version or add repository | ## Fix Strategy 1. **Build errors first** - Code must compile 2. **Detekt violations second** - Fix code quality issues 3. **ktlint warnings third** - Fix formatting 4. **One fix at a time** - Verify each change 5. **Minimal changes** - Don't refactor, just fix ## Stop Conditions The agent will stop and report if: - Same error persists after 3 attempts - Fix introduces more errors - Requires architectural changes - Missing external dependencies ## Related Commands - `/kotlin-test` - Run tests after build succeeds - `/kotlin-review` - Review code quality - `verification-loop` skill - Full verification loop ## Related - Agent: `agents/kotlin-build-resolver.md` - Skill: `skills/kotlin-patterns/`
- **/kotlin-review** `[optional arguments]` — Comprehensive Kotlin code review for idiomatic patterns, null safety, coroutine safety, and security. Invokes the kotlin-reviewer agent.
  - How it runs: # Kotlin Code Review This command invokes the **kotlin-reviewer** agent for comprehensive Kotlin-specific code review. ## What This Command Does 1. **Identify Kotlin Changes**: Find modified `.kt` and `.kts` files via `git diff` 2. **Run Build & Static Analysis**: Execute `./gradlew build`, `detekt`, `ktlintCheck` 3. **Security Scan**: Check for SQL injection, command injection, hardcoded secrets 4. **Null Safety Review**: Analyze `!!` usage, platform type handling, unsafe casts 5. **Coroutine Review**: Check structured concurrency, dispatcher usage, cancellation 6. **Generate Report**: Categorize issues by severity ## When to Use Use `/kotlin-review` when: - After writing or modifying Kotlin code - Before committing Kotlin changes - Reviewing pull requests with Kotlin code - Onboarding to a new Kotlin codebase - Learning idiomatic Kotlin patterns ## Review Categories ### CRITICAL (Must Fix) - SQL/Command injection vulnerabilities - Force-unwrap `!!` without justification - Platform type null safety violations - GlobalScope usage (structured concurrency violation) - Hardcoded credentials - Unsafe deserialization ### HIGH (Should Fix) - Mutable state where immutable suffices - Blocking calls inside coroutine context - Missing cancellation checks in long loops - Non-exhaustive `when` on sealed types - Large functions (>50 lines) - Deep nesting (>4 levels) ### MEDIUM (Consider) - Non-idiomatic Kotlin (Java-style patterns) - Missing trailing commas - Scope function misuse or nesting - Missing sequence for large collection chains - Redundant explicit types ## Automated Checks Run ```bash # Build check ./gradlew build # Static analysis ./gradlew detekt # Formatting check ./gradlew ktlintCheck # Tests ./gradlew test ``` ## Example Usage ````text User: /kotlin-review Agent: # Kotlin Code Review Report ## Files Reviewed - src/main/kotlin/com/example/service/UserService.kt (modified) - src/main/kotlin/com/example/routes/UserRoutes.kt (modified) ## Static Analysis Results ✓ Build: Successful ✓ detekt: No issues WARNING: ktlint: 2 formatting warnings ## Issues Found [CRITICAL] Force-Unwrap Null Safety File: src/main/kotlin/com/example/service/UserService.kt:28 Issue: Using !! on nullable repository result ```kotlin val user = repository.findById(id)!! // NPE risk ``` Fix: Use safe call with error handling ```kotlin val user = repository.findById(id) ?: throw UserNotFoundException("User $id not found") ``` [HIGH] GlobalScope Usage File: src/main/kotlin/com/example/routes/UserRoutes.kt:45 Issue: Using GlobalScope breaks structured concurrency ```kotlin GlobalScope.launch { notificationService.sendWelcome(user) } ``` Fix: Use the call's coroutine scope ```kotlin launch { notificationService.sendWelcome(user) } ``` ## Summary - CRITICAL: 1 - HIGH: 1 - MEDIUM: 0 Recommendation: FAIL: Block merge until CRITICAL issue is fixed ```` ## Approval Criteria | Status | Condition | |--------|-----------| | PASS: Approve | No CRITICAL or HIGH issues | | WARNING: Warning | Only MEDIUM issues (merge with caution) | | FAIL: Block | CRITICAL or HIGH issues found | ## Integration with Other Commands - Use `/kotlin-test` first to ensure tests pass - Use `/kotlin-build` if build errors occur - Use `/kotlin-review` before committing - Use `/code-review` for non-Kotlin-specific concerns ## Related - Agent: `agents/kotlin-reviewer.md` - Skills: `skills/kotlin-patterns/`, `skills/kotlin-testing/`
- **/kotlin-test** `[optional arguments]` — Enforce TDD workflow for Kotlin. Write Kotest tests first, then implement. Verify 80%+ coverage with Kover.
  - How it runs: # Kotlin TDD Command This command enforces test-driven development methodology for Kotlin code using Kotest, MockK, and Kover. ## What This Command Does 1. **Define Types/Interfaces**: Scaffold function signatures first 2. **Write Kotest Tests**: Create comprehensive test specs (RED) 3. **Run Tests**: Verify tests fail for the right reason 4. **Implement Code**: Write minimal code to pass (GREEN) 5. **Refactor**: Improve while keeping tests green 6. **Check Coverage**: Ensure 80%+ coverage with Kover ## When to Use Use `/kotlin-test` when: - Implementing new Kotlin functions or classes - Adding test coverage to existing Kotlin code - Fixing bugs (write failing test first) - Building critical business logic - Learning TDD workflow in Kotlin ## TDD Cycle ``` RED -> Write failing Kotest test GREEN -> Implement minimal code to pass REFACTOR -> Improve code, tests stay green REPEAT -> Next test case ``` ## Example Session ````text User: /kotlin-test I need a function to validate user registration requests Agent: # TDD Session: Registration Validator ## Step 1: Define Interface ```kotlin // validator/RegistrationValidator.kt package com.example.validator data class RegistrationRequest( val name: String, val email: String, val password: String, ) sealed class ValidationResult { data object Valid : ValidationResult() data class Invalid(val errors: List<String>) : ValidationResult() } fun validateRegistration(request: RegistrationRequest): ValidationResult { TODO("not implemented") } ``` ## Step 2: Write Kotest Tests (RED) ```kotlin // validator/RegistrationValidatorTest.kt package com.example.validator import io.kotest.core.spec.style.FunSpec import io.kotest.matchers.shouldBe import io.kotest.matchers.types.shouldBeInstanceOf class RegistrationValidatorTest : FunSpec({ test("valid registration returns Valid") { val request = RegistrationRequest( name = "Alice", email = "alice@example.com", password = "SecureP@ss1", ) val result = validateRegistration(request) result.shouldBeInstanceOf<ValidationResult.Valid>() } test("blank name returns Invalid") { val request = RegistrationRequest( name = "", email = "alice@example.com", password = "SecureP@ss1", ) val result = validateRegistration(request) val invalid = result.shouldBeInstanceOf<ValidationResult.Invalid>() invalid.errors shouldBe listOf("Name is required") } test("invalid email returns Invalid") { val request = RegistrationRequest( name = "Alice", email = "not-an-email", password = "SecureP@ss1", ) val result = validateRegistration(request) val invalid = result.shouldBeInstanceOf<ValidationResult.Invalid>() invalid.errors shouldBe listOf("Invalid email format") } test("short password returns Invalid") { val request = RegistrationRequest( name = "Alice", email = "alice@example.com", password = "short", ) val result = validateRegistration(request) val invalid = result.shouldBeInstanceOf<ValidationResult.Invalid>() invalid.errors shouldBe listOf("Password must be at least 8 characters") } test("multiple errors returns all errors") { val request = RegistrationRequest( name = "", email = "bad", password = "short", ) val result = validateRegistration(request) val invalid = result.shouldBeInstanceOf<ValidationResult.Invalid>() invalid.errors.size shouldBe 3 } }) ``` ## Step 3: Run Tests - Verify FAIL ```bash $ ./gradlew test RegistrationValidatorTest > valid registration returns Valid FAILED kotlin.NotImplementedError: An operation is not implemented FAILED (5 tests, 0 passed, 5 failed) ``` ✓ Tests fail as expected (NotImplementedError). ## Step 4: Implement Minimal Code (GREEN) ```kotlin // validator/RegistrationValidator.kt package com.example.validator private val EMAIL_REGEX = Regex("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$") private const val MIN_PASSWORD_LENGTH = 8 fun validateRegistration(request: RegistrationRequest): ValidationResult { val errors = buildList { if (request.name.isBlank()) add("Name is required") if (!EMAIL_REGEX.matches(request.email)) add("Invalid email format") if (request.password.length < MIN_PASSWORD_LENGTH) add("Password must be at least $MIN_PASSWORD_LENGTH characters") } return if (errors.isEmpty()) ValidationResult.Valid else ValidationResult.Invalid(errors) } ``` ## Step 5: Run Tests - Verify PASS ```bash $ ./gradlew test RegistrationValidatorTest > valid registration returns Valid PASSED RegistrationValidatorTest > blank name returns Invalid PASSED RegistrationValidatorTest > invalid email returns Invalid PASSED RegistrationValidatorTest > short password returns Invalid PASSED RegistrationValidatorTest > multiple errors returns all errors PASSED PASSED (5 tests, 5 passed, 0 failed) ``` ✓ All tests passing! ## Step 6: Check Coverage ```bash $ ./gradlew koverHtmlReport Coverage: 100.0% of statements ``` ✓ Coverage: 100% ## TDD Complete! ```` ## Test Patterns ### StringSpec (Simplest) ```kotlin class CalculatorTest : StringSpec({ "add two positive numbers" { Calculator.add(2, 3) shouldBe 5 } }) ``` ### BehaviorSpec (BDD) ```kotlin class OrderServiceTest : BehaviorSpec({ Given("a valid order") { When("placed") { Then("should be confirmed") { /* ... */ } } } }) ``` ### Data-Driven Tests ```kotlin class ParserTest : FunSpec({ context("valid inputs") { withData("2026-01-15", "2026-12-31", "2000-01-01") { input -> parseDate(input).shouldNotBeNull() } } }) ``` ### Coroutine Testing ```kotlin class AsyncServiceTest : FunSpec({ test("concurrent fetch completes") { runTest { val result = service.fetchAll() result.shouldNotBeEmpty() } } }) ``` ## Coverage Commands ```bash # Run tests with coverage ./gradlew koverHtmlReport # Verify coverage thresholds ./gradlew koverVerify # XML report for CI ./gradlew koverXmlReport # Open HTML report open build/reports/kover/html/index.html # Run specific test class ./gradlew test --tests "com.example.UserServiceTest" # Run with verbose output ./gradlew test --info ``` ## Coverage Targets | Code Type | Target | |-----------|--------| | Critical business logic | 100% | | Public APIs | 90%+ | | General code | 80%+ | | Generated code | Exclude | ## TDD Best Practices **DO:** - Write test FIRST, before any implementation - Run tests after each change - Use Kotest matchers for expressive assertions - Use MockK's `coEvery`/`coVerify` for suspend functions - Test behavior, not implementation details - Include edge cases (empty, null, max values) **DON'T:** - Write implementation before tests - Skip the RED phase - Test private functions directly - Use `Thread.sleep()` in coroutine tests - Ignore flaky tests ## Related Commands - `/kotlin-build` - Fix build errors - `/kotlin-review` - Review code after implementation - `verification-loop` skill - Run full verification loop ## Related - Skill: `skills/kotlin-testing/` - Skill: `skills/tdd-workflow/`
- **/learn-eval** `[optional arguments]` — Extract reusable patterns from the session, self-evaluate quality before saving, and determine the right save location (Global vs Project).
  - How it runs: # /learn-eval - Extract, Evaluate, then Save Extends `/learn` with a quality gate, save-location decision, and knowledge-placement awareness before writing any skill file. ## What to Extract Look for: 1. **Error Resolution Patterns** — root cause + fix + reusability 2. **Debugging Techniques** — non-obvious steps, tool combinations 3. **Workarounds** — library quirks, API limitations, version-specific fixes 4. **Project-Specific Patterns** — conventions, architecture decisions, integration patterns ## Process 1. Review the session for extractable patterns 2. Identify the most valuable/reusable insight 3. **Determine save location:** - Ask: "Would this pattern be useful in a different project?" - **Global** (`~/.claude/skills/learned/`): Generic patterns usable across 2+ projects (bash compatibility, LLM API behavior, debugging techniques, etc.) - **Project** (`.claude/skills/learned/` in current project): Project-specific knowledge (quirks of a particular config file, project-specific architecture decisions, etc.) - When in doubt, choose Global (moving Global → Project is easier than the reverse) 4. Draft the skill file using this format: ```markdown --- name: pattern-name description: "Under 130 characters" user-invocable: false origin: auto-extracted --- # [Descriptive Pattern Name] **Extracted:** [Date] **Context:** [Brief description of when this applies] ## Problem [What problem this solves - be specific] ## Solution [The pattern/technique/workaround - with code examples] ## When to Use [Trigger conditions] ``` 5. **Quality gate — Checklist + Holistic verdict** ### 5a. Required checklist (verify by actually reading files) Execute **all** of the following before evaluating the draft: - [ ] Grep `~/.claude/skills/` and relevant project `.claude/skills/` files by keyword to check for content overlap - [ ] Check MEMORY.md (both project and global) for overlap - [ ] Consider whether appending to an existing skill would suffice - [ ] Confirm this is a reusable pattern, not a one-off fix ### 5b. Holistic verdict Synthesize the checklist results and draft quality, then choose **one** of the following (Step 6 defines the action each verdict triggers): | Verdict | Meaning | |---------|---------| | **Save** | Unique, specific, well-scoped | | **Improve then Save** | Valuable but needs refinement | | **Absorb into [X]** | Should be appended to an existing skill | | **Drop** | Trivial, redundant, or too abstract | **Guideline dimensions** (informing the verdict, not scored): - **Specificity & Actionability**: Contains code examples or commands that are immediately usable - **Scope Fit**: Name, trigger conditions, and content are aligned and focused on a single pattern - **Uniqueness**: Provides value not covered by existing skills (informed by checklist results) - **Reusability**: Realistic trigger scenarios exist in future sessions 6. **Verdict-specific confirmation flow** - **Improve then Save**: Present the required improvements + revised draft + updated checklist/verdict after one re-evaluation; if the revised verdict is **Save**, save after user confirmation, otherwise follow the new verdict - **Save**: Present save path + checklist results + 1-line verdict rationale + full draft → save after user confirmation - **Absorb into [X]**: Present target path + additions (diff format) + checklist results + verdict rationale → append after user confirmation - **Drop**: Show checklist results + reasoning only (no confirmation needed) 7. Save / Absorb to the determined location ## Output Format for Step 5 ``` ### Checklist - [x] skills/ grep: no overlap (or: overlap found → details) - [x] MEMORY.md: no overlap (or: overlap found → details) - [x] Existing skill append: new file appropriate (or: should append to [X]) - [x] Reusability: confirmed (or: one-off → Drop) ### Verdict: Save / Improve then Save / Absorb into [X] / Drop **Rationale:** (1-2 sentences explaining the verdict) ``` ## Design Rationale This version replaces the previous 5-dimension numeric scoring rubric (Specificity, Actionability, Scope Fit, Non-redundancy, Coverage scored 1-5) with a checklist-based holistic verdict system. Modern frontier models (Opus 4.6+) have strong contextual judgment — forcing rich qualitative signals into numeric scores loses nuance and can produce misleading totals. The holistic approach lets the model weigh all factors naturally, producing more accurate save/drop decisions while the explicit checklist ensures no critical check is skipped. ## Notes - Don't extract trivial fixes (typos, simple syntax errors) - Don't extract one-time issues (specific API outages, etc.) - Focus on patterns that will save time in future sessions - Keep skills focused — one pattern per skill - When the verdict is Absorb, append to the existing skill rather than creating a new file
- **/learn** `[optional arguments]` — Extract reusable patterns from the current session and save them as candidate skills or guidance.
  - How it runs: # /learn - Extract Reusable Patterns Analyze the current session and extract any patterns worth saving as skills. ## Trigger Run `/learn` at any point during a session when you've solved a non-trivial problem. ## What to Extract Look for: 1. **Error Resolution Patterns** - What error occurred? - What was the root cause? - What fixed it? - Is this reusable for similar errors? 2. **Debugging Techniques** - Non-obvious debugging steps - Tool combinations that worked - Diagnostic patterns 3. **Workarounds** - Library quirks - API limitations - Version-specific fixes 4. **Project-Specific Patterns** - Codebase conventions discovered - Architecture decisions made - Integration patterns ## Output Format Create a skill file at `~/.claude/skills/learned/[pattern-name].md`: ```markdown # [Descriptive Pattern Name] **Extracted:** [Date] **Context:** [Brief description of when this applies] ## Problem [What problem this solves - be specific] ## Solution [The pattern/technique/workaround] ## Example [Code example if applicable] ## When to Use [Trigger conditions - what should activate this skill] ``` ## Process 1. Review the session for extractable patterns 2. Identify the most valuable/reusable insight 3. Draft the skill file 4. Ask user to confirm before saving 5. Save to `~/.claude/skills/learned/` ## Notes - Don't extract trivial fixes (typos, simple syntax errors) - Don't extract one-time issues (specific API outages, etc.) - Focus on patterns that will save time in future sessions - Keep skills focused - one pattern per skill
- **/loop-start** `[optional arguments]` — Start a managed autonomous loop pattern with safety defaults and explicit stop conditions.
  - How it runs: # Loop Start Command Start a managed autonomous loop pattern with safety defaults. ## Usage `/loop-start [pattern] [--mode safe|fast]` - `pattern`: `sequential`, `continuous-pr`, `rfc-dag`, `infinite` - `--mode`: - `safe` (default): strict quality gates and checkpoints - `fast`: reduced gates for speed ## Flow 1. Confirm repository state and branch strategy. 2. Select loop pattern and model tier strategy. 3. Enable required hooks/profile for the chosen mode. 4. Create loop plan and write runbook under `.claude/plans/`. 5. Print commands to start and monitor the loop. ## Required Safety Checks - Verify tests pass before first loop iteration. - Ensure `ECC_HOOK_PROFILE` is not disabled globally. - Ensure loop has explicit stop condition. ## Arguments $ARGUMENTS: - `<pattern>` optional (`sequential|continuous-pr|rfc-dag|infinite`) - `--mode safe|fast` optional
- **/loop-status** `[optional arguments]` — Inspect active loop state, progress, failure signals, and recommended intervention.
  - How it runs: # Loop Status Command Inspect active loop state, progress, and failure signals. This slash command can only run after the current session dequeues it. If you need to inspect a wedged or sibling session, run the packaged CLI from another terminal: ```bash npx --package ecc-universal ecc loop-status --json ``` The CLI scans local Claude transcript JSONL files under `~/.claude/projects/**` and reports stale `ScheduleWakeup` calls or `Bash` tool calls that have no matching `tool_result`. ## Usage `/loop-status [--watch]` ## What to Report - active loop pattern - current phase and last successful checkpoint - failing checks (if any) - estimated time/cost drift - recommended intervention (continue/pause/stop) ## Cross-Session CLI - `ecc loop-status --json` emits machine-readable status for recent local Claude transcripts. - `ecc loop-status --home <dir>` scans a different home directory when inspecting another local profile or mounted workspace. - `ecc loop-status --transcript <session.jsonl>` inspects one transcript directly. - `ecc loop-status --bash-timeout-seconds 1800` adjusts the stale Bash threshold. - `ecc loop-status --exit-code` exits `2` when stale loop or tool signals are found, or `1` when transcripts cannot be scanned. - `--exit-code` with `--watch` requires `--watch-count` so watchdog scripts do not wait forever for a process exit. - `ecc loop-status --watch` refreshes status until interrupted. - `ecc loop-status --watch --watch-count 3 --exit-code` refreshes a bounded number of times, then exits with the highest status seen. - `ecc loop-status --watch --watch-count 3` emits a bounded watch stream for scripts and handoffs. - `ecc loop-status --watch --write-dir ~/.claude/loops` maintains `index.json` and per-session JSON snapshots for sibling terminals or watchdog scripts. ## Watch Mode When `--watch` is present, refresh status periodically. With `--json`, each refresh is emitted as one JSON object per line so another terminal or script can consume the stream. ## Snapshot Files Use `--write-dir <dir>` when a separate process needs to inspect loop state without waiting for the current Claude session to dequeue `/loop-status`. The CLI writes: - `index.json` with one row per inspected session. - `<session-id>.json` with the full status payload for that session. These files are snapshots of local transcript analysis. They do not control or timeout Claude Code runtime tool calls. ## Arguments $ARGUMENTS: - `--watch` optional
- **/marketing-campaign** `[optional arguments]` — Plan and execute a full marketing campaign. Accepts a product brief and returns positioning, landing page copy, email sequence, social posts, ad variants, video scripts, and a content calendar. Can also review existing copy for conversion quality.
  - How it runs: # /marketing-campaign Plan and execute a marketing campaign from brief to full content suite. ## Usage ``` /marketing-campaign # Prompt for brief interactively /marketing-campaign [product brief] # Full campaign from inline brief /marketing-campaign copy [type] # Single deliverable only /marketing-campaign review [file-or-brief] # Copy audit for conversion and brand consistency ``` ## What It Does 1. **Research** — Profiles the target audience and maps competitors before writing anything 2. **Positioning** — Locks the campaign angle and tone profile first 3. **Copy production** — Generates the full content suite in the right order (landing page → emails → social → ads → video scripts → calendar) 4. **Review** — Gates all output through a conversion and brand consistency checklist ## Modes ### Full Campaign Mode Provide a product brief containing: - Product name and description - Target audience (specific, not generic) - Core problem the product solves - Core benefit / outcome - Tone guidance - Channels required - Launch goal or timeline The agent returns all campaign deliverables in order, with a copy review summary at the end. ### Single Deliverable Mode ``` /marketing-campaign copy landing-page /marketing-campaign copy email-sequence /marketing-campaign copy social-posts /marketing-campaign copy ads /marketing-campaign copy video-scripts ``` Requires positioning to be defined first. Run full mode or provide the angle before requesting a single deliverable. ### Copy Review Mode ``` /marketing-campaign review path/to/copy.md /marketing-campaign review "paste copy here" ``` Returns a structured audit against: - 5-second clarity test (above-fold copy) - CTA quality (specific, earned, one per piece) - Brand tone consistency - Claim specificity and supportability - Platform-native fit - Cross-channel consistency ## Brief Template ```markdown Product: [name] Description: [1-3 sentences on what it does] Audience: [who, specifically] Problem: [the specific pain the product solves] Benefit: [the outcome the user gets] Tone: [adjectives + what to avoid] Channels: [landing page, email, LinkedIn, X, ads, video] Goal: [launch, waitlist, signups, awareness — and timeline] ``` ## Output Location When saving campaign assets, the convention is `.claude/campaigns/{campaign-name}/`: ``` .claude/campaigns/product-launch/ ├── positioning.md ├── landing-page.md ├── email-sequence.md ├── social-posts.md ├── ad-copy.md ├── video-scripts.md └── content-calendar.md ``` Confirm the save location before writing files. ## Examples ``` /marketing-campaign Build a 7-day launch campaign for an AI career platform for UK university students. ``` ``` /marketing-campaign copy landing-page ``` ``` /marketing-campaign review .claude/campaigns/the-key/landing-page.md ``` ## Agent Delegation This command invokes: - `marketing-agent` — campaign planning and copy production - `brand-voice` — voice capture when tone needs locking across multiple outputs - `content-engine` — platform-native social content production - `crosspost` — multi-platform distribution - `market-research` — deep audience or competitive intelligence ## Related Commands - `/plan` — Strategic planning before a campaign - `/plan-prd` — Product requirements document before briefing a campaign - `/code-review` — Review code behind a landing page implementation --- *Part of [Everything Claude Code](https://github.com/affaan-m/everything-claude-code)*
- **/model-route** `[optional arguments]` — Recommend the best model tier for the current task based on complexity, risk, and budget.
  - How it runs: # Model Route Command Recommend the best model tier for the current task by complexity and budget. ## Usage `/model-route [task-description] [--budget low|med|high]` ## Routing Heuristic - `haiku`: deterministic, low-risk mechanical changes - `sonnet`: default for implementation and refactors - `opus`: architecture, deep review, ambiguous requirements ## Required Output - recommended model - confidence level - why this model fits - fallback model if first attempt fails ## Arguments $ARGUMENTS: - `[task-description]` optional free-text - `--budget low|med|high` optional
- **/multi-backend** `[optional arguments]` — Run a backend-focused multi-model workflow for APIs, algorithms, data, and business logic.
  - How it runs: # Backend - Backend-Focused Development Backend-focused workflow (Research → Ideation → Plan → Execute → Optimize → Review), Codex-led. > **Prerequisite:** Requires the external `ccg-workflow` runtime, which is **not** part of the base ECC install. Initialize it with `npx ccg-workflow` to provision `~/.claude/bin/codeagent-wrapper` and the `~/.claude/.ccg/prompts/*` role files this command depends on. Without that runtime, this command will not run correctly. ## Usage ```bash /backend <backend task description> ``` ## Context - Backend task: $ARGUMENTS - Codex-led, Gemini for auxiliary reference - Applicable: API design, algorithm implementation, database optimization, business logic ## Your Role You are the **Backend Orchestrator**, coordinating multi-model collaboration for server-side tasks (Research → Ideation → Plan → Execute → Optimize → Review). **Collaborative Models**: - **Codex** – Backend logic, algorithms (**Backend authority, trustworthy**) - **Gemini** – Frontend perspective (**Backend opinions for reference only**) - **Claude (self)** – Orchestration, planning, execution, delivery --- ## Multi-Model Call Specification **Call Syntax**: ``` # New session call Bash({ command: "~/.claude/bin/codeagent-wrapper {{LITE_MODE_FLAG}}--backend codex - \"$PWD\" <<'EOF' ROLE_FILE: <role prompt path> <TASK> Requirement: <enhanced requirement (or $ARGUMENTS if not enhanced)> Context: <project context and analysis from previous phases> </TASK> OUTPUT: Expected output format EOF", run_in_background: false, timeout: 3600000, description: "Brief description" }) # Resume session call Bash({ command: "~/.claude/bin/codeagent-wrapper {{LITE_MODE_FLAG}}--backend codex resume <SESSION_ID> - \"$PWD\" <<'EOF' ROLE_FILE: <role prompt path> <TASK> Requirement: <enhanced requirement (or $ARGUMENTS if not enhanced)> Context: <project context and analysis from previous phases> </TASK> OUTPUT: Expected output format EOF", run_in_background: false, timeout: 3600000, description: "Brief description" }) ``` **Role Prompts**: | Phase | Codex | |-------|-------| | Analysis | `~/.claude/.ccg/prompts/codex/analyzer.md` | | Planning | `~/.claude/.ccg/prompts/codex/architect.md` | | Review | `~/.claude/.ccg/prompts/codex/reviewer.md` | **Session Reuse**: Each call returns `SESSION_ID: xxx`, use `resume xxx` for subsequent phases. Save `CODEX_SESSION` in Phase 2, use `resume` in Phases 3 and 5. --- ## Communication Guidelines 1. Start responses with mode label `[Mode: X]`, initial is `[Mode: Research]` 2. Follow strict sequence: `Research → Ideation → Plan → Execute → Optimize → Review` 3. Use `AskUserQuestion` tool for user interaction when needed (e.g., confirmation/selection/approval) --- ## Core Workflow ### Phase 0: Prompt Enhancement (Optional) `[Mode: Prepare]` - If ace-tool MCP available, call `mcp__ace-tool__enhance_prompt`, **replace original $ARGUMENTS with enhanced result for subsequent Codex calls**. If unavailable, use `$ARGUMENTS` as-is. ### Phase 1: Research `[Mode: Research]` - Understand requirements and gather context 1. **Code Retrieval** (if ace-tool MCP available): Call `mcp__ace-tool__search_context` to retrieve existing APIs, data models, service architecture. If unavailable, use built-in tools: `Glob` for file discovery, `Grep` for symbol/API search, `Read` for context gathering, `Task` (Explore agent) for deeper exploration. 2. Requirement completeness score (0-10): >=7 continue, <7 stop and supplement ### Phase 2: Ideation `[Mode: Ideation]` - Codex-led analysis **MUST call Codex** (follow call specification above): - ROLE_FILE: `~/.claude/.ccg/prompts/codex/analyzer.md` - Requirement: Enhanced requirement (or $ARGUMENTS if not enhanced) - Context: Project context from Phase 1 - OUTPUT: Technical feasibility analysis, recommended solutions (at least 2), risk assessment **Save SESSION_ID** (`CODEX_SESSION`) for subsequent phase reuse. Output solutions (at least 2), wait for user selection. ### Phase 3: Planning `[Mode: Plan]` - Codex-led planning **MUST call Codex** (use `resume <CODEX_SESSION>` to reuse session): - ROLE_FILE: `~/.claude/.ccg/prompts/codex/architect.md` - Requirement: User's selected solution - Context: Analysis results from Phase 2 - OUTPUT: File structure, function/class design, dependency relationships Claude synthesizes plan, save to `.claude/plan/task-name.md` after user approval. ### Phase 4: Implementation `[Mode: Execute]` - Code development - Strictly follow approved plan - Follow existing project code standards - Ensure error handling, security, performance optimization ### Phase 5: Optimization `[Mode: Optimize]` - Codex-led review **MUST call Codex** (follow call specification above): - ROLE_FILE: `~/.claude/.ccg/prompts/codex/reviewer.md` - Requirement: Review the following backend code changes - Context: git diff or code content - OUTPUT: Security, performance, error handling, API compliance issues list Integrate review feedback, execute optimization after user confirmation. ### Phase 6: Quality Review `[Mode: Review]` - Final evaluation - Check completion against plan - Run tests to verify functionality - Report issues and recommendations --- ## Key Rules 1. **Codex backend opinions are trustworthy** 2. **Gemini backend opinions for reference only** 3. External models have **zero filesystem write access** 4. Claude handles all code writes and file operations
- **/multi-execute** `[optional arguments]` — Execute a multi-model implementation plan while preserving Claude as the only filesystem writer.
  - How it runs: # Execute - Multi-Model Collaborative Execution Multi-model collaborative execution - Get prototype from plan → Claude refactors and implements → Multi-model audit and delivery. > **Prerequisite:** Requires the external `ccg-workflow` runtime, which is **not** part of the base ECC install. Initialize it with `npx ccg-workflow` to provision `~/.claude/bin/codeagent-wrapper` and the `~/.claude/.ccg/prompts/*` role files this command depends on. Without that runtime, this command will not run correctly. $ARGUMENTS --- ## Core Protocols - **Language Protocol**: Use **English** when interacting with tools/models, communicate with user in their language - **Code Sovereignty**: External models have **zero filesystem write access**, all modifications by Claude - **Dirty Prototype Refactoring**: Treat Codex/Gemini Unified Diff as "dirty prototype", must refactor to production-grade code - **Stop-Loss Mechanism**: Do not proceed to next phase until current phase output is validated - **Prerequisite**: Only execute after user explicitly replies "Y" to `/ccg:plan` output (if missing, must confirm first) --- ## Multi-Model Call Specification **Call Syntax** (parallel: use `run_in_background: true`): ``` # Resume session call (recommended) - Implementation Prototype Bash({ command: "~/.claude/bin/codeagent-wrapper {{LITE_MODE_FLAG}}--backend <codex|gemini> {{GEMINI_MODEL_FLAG}}resume <SESSION_ID> - \"$PWD\" <<'EOF' ROLE_FILE: <role prompt path> <TASK> Requirement: <task description> Context: <plan content + target files> </TASK> OUTPUT: Unified Diff Patch ONLY. Strictly prohibit any actual modifications. EOF", run_in_background: true, timeout: 3600000, description: "Brief description" }) # New session call - Implementation Prototype Bash({ command: "~/.claude/bin/codeagent-wrapper {{LITE_MODE_FLAG}}--backend <codex|gemini> {{GEMINI_MODEL_FLAG}}- \"$PWD\" <<'EOF' ROLE_FILE: <role prompt path> <TASK> Requirement: <task description> Context: <plan content + target files> </TASK> OUTPUT: Unified Diff Patch ONLY. Strictly prohibit any actual modifications. EOF", run_in_background: true, timeout: 3600000, description: "Brief description" }) ``` **Audit Call Syntax** (Code Review / Audit): ``` Bash({ command: "~/.claude/bin/codeagent-wrapper {{LITE_MODE_FLAG}}--backend <codex|gemini> {{GEMINI_MODEL_FLAG}}resume <SESSION_ID> - \"$PWD\" <<'EOF' ROLE_FILE: <role prompt path> <TASK> Scope: Audit the final code changes. Inputs: - The applied patch (git diff / final unified diff) - The touched files (relevant excerpts if needed) Constraints: - Do NOT modify any files. - Do NOT output tool commands that assume filesystem access. </TASK> OUTPUT: 1) A prioritized list of issues (severity, file, rationale) 2) Concrete fixes; if code changes are needed, include a Unified Diff Patch in a fenced code block. EOF", run_in_background: true, timeout: 3600000, description: "Brief description" }) ``` **Model Parameter Notes**: - `{{GEMINI_MODEL_FLAG}}`: When using `--backend gemini`, replace with `--gemini-model gemini-3-pro-preview` (note trailing space); use empty string for codex **Role Prompts**: | Phase | Codex | Gemini | |-------|-------|--------| | Implementation | `~/.claude/.ccg/prompts/codex/architect.md` | `~/.claude/.ccg/prompts/gemini/frontend.md` | | Review | `~/.claude/.ccg/prompts/codex/reviewer.md` | `~/.claude/.ccg/prompts/gemini/reviewer.md` | **Session Reuse**: If `/ccg:plan` provided SESSION_ID, use `resume <SESSION_ID>` to reuse context. **Wait for Background Tasks** (max timeout 600000ms = 10 minutes): ``` TaskOutput({ task_id: "<task_id>", block: true, timeout: 600000 }) ``` **IMPORTANT**: - Must specify `timeout: 600000`, otherwise default 30 seconds will cause premature timeout - If still incomplete after 10 minutes, continue polling with `TaskOutput`, **NEVER kill the process** - If waiting is skipped due to timeout, **MUST call `AskUserQuestion` to ask user whether to continue waiting or kill task** --- ## Execution Workflow **Execute Task**: $ARGUMENTS ### Phase 0: Read Plan `[Mode: Prepare]` 1. **Identify Input Type**: - Plan file path (e.g., `.claude/plan/xxx.md`) - Direct task description 2. **Read Plan Content**: - If plan file path provided, read and parse - Extract: task type, implementation steps, key files, SESSION_ID 3. **Pre-Execution Confirmation**: - If input is "direct task description" or plan missing `SESSION_ID` / key files: confirm with user first - If cannot confirm user replied "Y" to plan: must confirm again before proceeding 4. **Task Type Routing**: | Task Type | Detection | Route | |-----------|-----------|-------| | **Frontend** | Pages, components, UI, styles, layout | Gemini | | **Backend** | API, interfaces, database, logic, algorithms | Codex | | **Fullstack** | Contains both frontend and backend | Codex ∥ Gemini parallel | --- ### Phase 1: Quick Context Retrieval `[Mode: Retrieval]` **If ace-tool MCP is available**, use it for quick context retrieval: Based on "Key Files" list in plan, call `mcp__ace-tool__search_context`: ``` mcp__ace-tool__search_context({ query: "<semantic query based on plan content, including key files, modules, function names>", project_root_path: "$PWD" }) ``` **Retrieval Strategy**: - Extract target paths from plan's "Key Files" table - Build semantic query covering: entry files, dependency modules, related type definitions - If results insufficient, add 1-2 recursive retrievals **If ace-tool MCP is NOT available**, use Claude Code built-in tools as fallback: 1. **Glob**: Find target files from plan's "Key Files" table (e.g., `Glob("src/components/**/*.tsx")`) 2. **Grep**: Search for key symbols, function names, type definitions across the codebase 3. **Read**: Read the discovered files to gather complete context 4. **Task (Explore agent)**: For broader exploration, use `Task` with `subagent_type: "Explore"` **After Retrieval**: - Organize retrieved code snippets - Confirm complete context for implementation - Proceed to Phase 3 --- ### Phase 3: Prototype Acquisition `[Mode: Prototype]` **Route Based on Task Type**: #### Route A: Frontend/UI/Styles → Gemini **Limit**: Context < 32k tokens 1. Call Gemini (use `~/.claude/.ccg/prompts/gemini/frontend.md`) 2. Input: Plan content + retrieved context + target files 3. OUTPUT: `Unified Diff Patch ONLY. Strictly prohibit any actual modifications.` 4. **Gemini is frontend design authority, its CSS/React/Vue prototype is the final visual baseline** 5. **WARNING**: Ignore Gemini's backend logic suggestions 6. If plan contains `GEMINI_SESSION`: prefer `resume <GEMINI_SESSION>` #### Route B: Backend/Logic/Algorithms → Codex 1. Call Codex (use `~/.claude/.ccg/prompts/codex/architect.md`) 2. Input: Plan content + retrieved context + target files 3. OUTPUT: `Unified Diff Patch ONLY. Strictly prohibit any actual modifications.` 4. **Codex is backend logic authority, leverage its logical reasoning and debug capabilities** 5. If plan contains `CODEX_SESSION`: prefer `resume <CODEX_SESSION>` #### Route C: Fullstack → Parallel Calls 1. **Parallel Calls** (`run_in_background: true`): - Gemini: Handle frontend part - Codex: Handle backend part 2. Wait for both models' complete results with `TaskOutput` 3. Each uses corresponding `SESSION_ID` from plan for `resume` (create new session if missing) **Follow the `IMPORTANT` instructions in `Multi-Model Call Specification` above** --- ### Phase 4: Code Implementation `[Mode: Implement]` **Claude as Code Sovereign executes the following steps**: 1. **Read Diff**: Parse Unified Diff Patch returned by Codex/Gemini 2. **Mental Sandbox**: - Simulate applying Diff to target files - Check logical consistency - Identify potential conflicts or side effects 3. **Refactor and Clean**: - Refactor "dirty prototype" to **highly readable, maintainable, enterprise-grade code** - Remove redundant code - Ensure compliance with project's existing code standards - **Do not generate comments/docs unless necessary**, code should be self-explanatory 4. **Minimal Scope**: - Changes limited to requirement scope only - **Mandatory review** for side effects - Make targeted corrections 5. **Apply Changes**: - Use Edit/Write tools to execute actual modifications - **Only modify necessary code**, never affect user's other existing functionality 6. **Self-Verification** (strongly recommended): - Run project's existing lint / typecheck / tests (prioritize minimal related scope) - If failed: fix regressions first, then proceed to Phase 5 --- ### Phase 5: Audit and Delivery `[Mode: Audit]` #### 5.1 Automatic Audit **After changes take effect, MUST immediately parallel call** Codex and Gemini for Code Review: 1. **Codex Review** (`run_in_background: true`): - ROLE_FILE: `~/.claude/.ccg/prompts/codex/reviewer.md` - Input: Changed Diff + target files - Focus: Security, performance, error handling, logic correctness 2. **Gemini Review** (`run_in_background: true`): - ROLE_FILE: `~/.claude/.ccg/prompts/gemini/reviewer.md` - Input: Changed Diff + target files - Focus: Accessibility, design consistency, user experience Wait for both models' complete review results with `TaskOutput`. Prefer reusing Phase 3 sessions (`resume <SESSION_ID>`) for context consistency. #### 5.2 Integrate and Fix 1. Synthesize Codex + Gemini review feedback 2. Weigh by trust rules: Backend follows Codex, Frontend follows Gemini 3. Execute necessary fixes 4. Repeat Phase 5.1 as needed (until risk is acceptable) #### 5.3 Delivery Confirmation After audit passes, report to user: ```markdown ## Execution Complete ### Change Summary | File | Operation | Description | |------|-----------|-------------| | path/to/file.ts | Modified | Description | ### Audit Results - Codex: <Passed/Found N issues> - Gemini: <Passed/Found N issues> ### Recommendations 1. [ ] <Suggested test steps> 2. [ ] <Suggested verification steps> ``` --- ## Key Rules 1. **Code Sovereignty** – All file modifications by Claude, external models have zero write access 2. **Dirty Prototype Refactoring** – Codex/Gemini output treated as draft, must refactor 3. **Trust Rules** – Backend follows Codex, Frontend follows Gemini 4. **Minimal Changes** – Only modify necessary code, no side effects 5. **Mandatory Audit** – Must perform multi-model Code Review after changes --- ## Usage ```bash # Execute plan file /ccg:execute .claude/plan/feature-name.md # Execute task directly (for plans already discussed in context) /ccg:execute implement user authentication based on previous plan ``` --- ## Relationship with /ccg:plan 1. `/ccg:plan` generates plan + SESSION_ID 2. User confirms with "Y" 3. `/ccg:execute` reads plan, reuses SESSION_ID, executes implementation
- **/multi-frontend** `[optional arguments]` — Run a frontend-focused multi-model workflow for components, layouts, animation, and UI polish.
  - How it runs: # Frontend - Frontend-Focused Development Frontend-focused workflow (Research → Ideation → Plan → Execute → Optimize → Review), Gemini-led. > **Prerequisite:** Requires the external `ccg-workflow` runtime, which is **not** part of the base ECC install. Initialize it with `npx ccg-workflow` to provision `~/.claude/bin/codeagent-wrapper` and the `~/.claude/.ccg/prompts/*` role files this command depends on. Without that runtime, this command will not run correctly. ## Usage ```bash /frontend <UI task description> ``` ## Context - Frontend task: $ARGUMENTS - Gemini-led, Codex for auxiliary reference - Applicable: Component design, responsive layout, UI animations, style optimization ## Your Role You are the **Frontend Orchestrator**, coordinating multi-model collaboration for UI/UX tasks (Research → Ideation → Plan → Execute → Optimize → Review). **Collaborative Models**: - **Gemini** – Frontend UI/UX (**Frontend authority, trustworthy**) - **Codex** – Backend perspective (**Frontend opinions for reference only**) - **Claude (self)** – Orchestration, planning, execution, delivery --- ## Multi-Model Call Specification **Call Syntax**: ``` # New session call Bash({ command: "~/.claude/bin/codeagent-wrapper {{LITE_MODE_FLAG}}--backend gemini --gemini-model gemini-3-pro-preview - \"$PWD\" <<'EOF' ROLE_FILE: <role prompt path> <TASK> Requirement: <enhanced requirement (or $ARGUMENTS if not enhanced)> Context: <project context and analysis from previous phases> </TASK> OUTPUT: Expected output format EOF", run_in_background: false, timeout: 3600000, description: "Brief description" }) # Resume session call Bash({ command: "~/.claude/bin/codeagent-wrapper {{LITE_MODE_FLAG}}--backend gemini --gemini-model gemini-3-pro-preview resume <SESSION_ID> - \"$PWD\" <<'EOF' ROLE_FILE: <role prompt path> <TASK> Requirement: <enhanced requirement (or $ARGUMENTS if not enhanced)> Context: <project context and analysis from previous phases> </TASK> OUTPUT: Expected output format EOF", run_in_background: false, timeout: 3600000, description: "Brief description" }) ``` **Role Prompts**: | Phase | Gemini | |-------|--------| | Analysis | `~/.claude/.ccg/prompts/gemini/analyzer.md` | | Planning | `~/.claude/.ccg/prompts/gemini/architect.md` | | Review | `~/.claude/.ccg/prompts/gemini/reviewer.md` | **Session Reuse**: Each call returns `SESSION_ID: xxx`, use `resume xxx` for subsequent phases. Save `GEMINI_SESSION` in Phase 2, use `resume` in Phases 3 and 5. --- ## Communication Guidelines 1. Start responses with mode label `[Mode: X]`, initial is `[Mode: Research]` 2. Follow strict sequence: `Research → Ideation → Plan → Execute → Optimize → Review` 3. Use `AskUserQuestion` tool for user interaction when needed (e.g., confirmation/selection/approval) --- ## Core Workflow ### Phase 0: Prompt Enhancement (Optional) `[Mode: Prepare]` - If ace-tool MCP available, call `mcp__ace-tool__enhance_prompt`, **replace original $ARGUMENTS with enhanced result for subsequent Gemini calls**. If unavailable, use `$ARGUMENTS` as-is. ### Phase 1: Research `[Mode: Research]` - Understand requirements and gather context 1. **Code Retrieval** (if ace-tool MCP available): Call `mcp__ace-tool__search_context` to retrieve existing components, styles, design system. If unavailable, use built-in tools: `Glob` for file discovery, `Grep` for component/style search, `Read` for context gathering, `Task` (Explore agent) for deeper exploration. 2. Requirement completeness score (0-10): >=7 continue, <7 stop and supplement ### Phase 2: Ideation `[Mode: Ideation]` - Gemini-led analysis **MUST call Gemini** (follow call specification above): - ROLE_FILE: `~/.claude/.ccg/prompts/gemini/analyzer.md` - Requirement: Enhanced requirement (or $ARGUMENTS if not enhanced) - Context: Project context from Phase 1 - OUTPUT: UI feasibility analysis, recommended solutions (at least 2), UX evaluation **Save SESSION_ID** (`GEMINI_SESSION`) for subsequent phase reuse. Output solutions (at least 2), wait for user selection. ### Phase 3: Planning `[Mode: Plan]` - Gemini-led planning **MUST call Gemini** (use `resume <GEMINI_SESSION>` to reuse session): - ROLE_FILE: `~/.claude/.ccg/prompts/gemini/architect.md` - Requirement: User's selected solution - Context: Analysis results from Phase 2 - OUTPUT: Component structure, UI flow, styling approach Claude synthesizes plan, save to `.claude/plan/task-name.md` after user approval. ### Phase 4: Implementation `[Mode: Execute]` - Code development - Strictly follow approved plan - Follow existing project design system and code standards - Ensure responsiveness, accessibility ### Phase 5: Optimization `[Mode: Optimize]` - Gemini-led review **MUST call Gemini** (follow call specification above): - ROLE_FILE: `~/.claude/.ccg/prompts/gemini/reviewer.md` - Requirement: Review the following frontend code changes - Context: git diff or code content - OUTPUT: Accessibility, responsiveness, performance, design consistency issues list Integrate review feedback, execute optimization after user confirmation. ### Phase 6: Quality Review `[Mode: Review]` - Final evaluation - Check completion against plan - Verify responsiveness and accessibility - Report issues and recommendations --- ## Key Rules 1. **Gemini frontend opinions are trustworthy** 2. **Codex frontend opinions for reference only** 3. External models have **zero filesystem write access** 4. Claude handles all code writes and file operations
- **/multi-plan** `[optional arguments]` — Create a multi-model implementation plan without modifying production code.
  - How it runs: # Plan - Multi-Model Collaborative Planning Multi-model collaborative planning - Context retrieval + Dual-model analysis → Generate step-by-step implementation plan. > **Prerequisite:** Requires the external `ccg-workflow` runtime, which is **not** part of the base ECC install. Initialize it with `npx ccg-workflow` to provision `~/.claude/bin/codeagent-wrapper` and the `~/.claude/.ccg/prompts/*` role files this command depends on. Without that runtime, this command will not run correctly. $ARGUMENTS --- ## Core Protocols - **Language Protocol**: Use **English** when interacting with tools/models, communicate with user in their language - **Mandatory Parallel**: Codex/Gemini calls MUST use `run_in_background: true` (including single model calls, to avoid blocking main thread) - **Code Sovereignty**: External models have **zero filesystem write access**, all modifications by Claude - **Stop-Loss Mechanism**: Do not proceed to next phase until current phase output is validated - **Planning Only**: This command allows reading context and writing to `.claude/plan/*` plan files, but **NEVER modify production code** --- ## Multi-Model Call Specification **Call Syntax** (parallel: use `run_in_background: true`): ``` Bash({ command: "~/.claude/bin/codeagent-wrapper {{LITE_MODE_FLAG}}--backend <codex|gemini> {{GEMINI_MODEL_FLAG}}- \"$PWD\" <<'EOF' ROLE_FILE: <role prompt path> <TASK> Requirement: <enhanced requirement> Context: <retrieved project context> </TASK> OUTPUT: Step-by-step implementation plan with pseudo-code. DO NOT modify any files. EOF", run_in_background: true, timeout: 3600000, description: "Brief description" }) ``` **Model Parameter Notes**: - `{{GEMINI_MODEL_FLAG}}`: When using `--backend gemini`, replace with `--gemini-model gemini-3-pro-preview` (note trailing space); use empty string for codex **Role Prompts**: | Phase | Codex | Gemini | |-------|-------|--------| | Analysis | `~/.claude/.ccg/prompts/codex/analyzer.md` | `~/.claude/.ccg/prompts/gemini/analyzer.md` | | Planning | `~/.claude/.ccg/prompts/codex/architect.md` | `~/.claude/.ccg/prompts/gemini/architect.md` | **Session Reuse**: Each call returns `SESSION_ID: xxx` (typically output by wrapper), **MUST save** for subsequent `/ccg:execute` use. **Wait for Background Tasks** (max timeout 600000ms = 10 minutes): ``` TaskOutput({ task_id: "<task_id>", block: true, timeout: 600000 }) ``` **IMPORTANT**: - Must specify `timeout: 600000`, otherwise default 30 seconds will cause premature timeout - If still incomplete after 10 minutes, continue polling with `TaskOutput`, **NEVER kill the process** - If waiting is skipped due to timeout, **MUST call `AskUserQuestion` to ask user whether to continue waiting or kill task** --- ## Execution Workflow **Planning Task**: $ARGUMENTS ### Phase 1: Full Context Retrieval `[Mode: Research]` #### 1.1 Prompt Enhancement (MUST execute first) **If ace-tool MCP is available**, call `mcp__ace-tool__enhance_prompt` tool: ``` mcp__ace-tool__enhance_prompt({ prompt: "$ARGUMENTS", conversation_history: "<last 5-10 conversation turns>", project_root_path: "$PWD" }) ``` Wait for enhanced prompt, **replace original $ARGUMENTS with enhanced result** for all subsequent phases. **If ace-tool MCP is NOT available**: Skip this step and use the original `$ARGUMENTS` as-is for all subsequent phases. #### 1.2 Context Retrieval **If ace-tool MCP is available**, call `mcp__ace-tool__search_context` tool: ``` mcp__ace-tool__search_context({ query: "<semantic query based on enhanced requirement>", project_root_path: "$PWD" }) ``` - Build semantic query using natural language (Where/What/How) - **NEVER answer based on assumptions** **If ace-tool MCP is NOT available**, use Claude Code built-in tools as fallback: 1. **Glob**: Find relevant files by pattern (e.g., `Glob("**/*.ts")`, `Glob("src/**/*.py")`) 2. **Grep**: Search for key symbols, function names, class definitions (e.g., `Grep("className|functionName")`) 3. **Read**: Read the discovered files to gather complete context 4. **Task (Explore agent)**: For deeper exploration, use `Task` with `subagent_type: "Explore"` to search across the codebase #### 1.3 Completeness Check - Must obtain **complete definitions and signatures** for relevant classes, functions, variables - If context insufficient, trigger **recursive retrieval** - Prioritize output: entry file + line number + key symbol name; add minimal code snippets only when necessary to resolve ambiguity #### 1.4 Requirement Alignment - If requirements still have ambiguity, **MUST** output guiding questions for user - Until requirement boundaries are clear (no omissions, no redundancy) ### Phase 2: Multi-Model Collaborative Analysis `[Mode: Analysis]` #### 2.1 Distribute Inputs **Parallel call** Codex and Gemini (`run_in_background: true`): Distribute **original requirement** (without preset opinions) to both models: 1. **Codex Backend Analysis**: - ROLE_FILE: `~/.claude/.ccg/prompts/codex/analyzer.md` - Focus: Technical feasibility, architecture impact, performance considerations, potential risks - OUTPUT: Multi-perspective solutions + pros/cons analysis 2. **Gemini Frontend Analysis**: - ROLE_FILE: `~/.claude/.ccg/prompts/gemini/analyzer.md` - Focus: UI/UX impact, user experience, visual design - OUTPUT: Multi-perspective solutions + pros/cons analysis Wait for both models' complete results with `TaskOutput`. **Save SESSION_ID** (`CODEX_SESSION` and `GEMINI_SESSION`). #### 2.2 Cross-Validation Integrate perspectives and iterate for optimization: 1. **Identify consensus** (strong signal) 2. **Identify divergence** (needs weighing) 3. **Complementary strengths**: Backend logic follows Codex, Frontend design follows Gemini 4. **Logical reasoning**: Eliminate logical gaps in solutions #### 2.3 (Optional but Recommended) Dual-Model Plan Draft To reduce risk of omissions in Claude's synthesized plan, can parallel have both models output "plan drafts" (still **NOT allowed** to modify files): 1. **Codex Plan Draft** (Backend authority): - ROLE_FILE: `~/.claude/.ccg/prompts/codex/architect.md` - OUTPUT: Step-by-step plan + pseudo-code (focus: data flow/edge cases/error handling/test strategy) 2. **Gemini Plan Draft** (Frontend authority): - ROLE_FILE: `~/.claude/.ccg/prompts/gemini/architect.md` - OUTPUT: Step-by-step plan + pseudo-code (focus: information architecture/interaction/accessibility/visual consistency) Wait for both models' complete results with `TaskOutput`, record key differences in their suggestions. #### 2.4 Generate Implementation Plan (Claude Final Version) Synthesize both analyses, generate **Step-by-step Implementation Plan**: ```markdown ## Implementation Plan: <Task Name> ### Task Type - [ ] Frontend (→ Gemini) - [ ] Backend (→ Codex) - [ ] Fullstack (→ Parallel) ### Technical Solution <Optimal solution synthesized from Codex + Gemini analysis> ### Implementation Steps 1. <Step 1> - Expected deliverable 2. <Step 2> - Expected deliverable ... ### Key Files | File | Operation | Description | |------|-----------|-------------| | path/to/file.ts:L10-L50 | Modify | Description | ### Risks and Mitigation | Risk | Mitigation | |------|------------| ### SESSION_ID (for /ccg:execute use) - CODEX_SESSION: <session_id> - GEMINI_SESSION: <session_id> ``` ### Phase 2 End: Plan Delivery (Not Execution) **`/ccg:plan` responsibilities end here, MUST execute the following actions**: 1. Present complete implementation plan to user (including pseudo-code) 2. Save plan to `.claude/plan/<feature-name>.md` (extract feature name from requirement, e.g., `user-auth`, `payment-module`) 3. Output prompt in **bold text** (MUST use actual saved file path): --- **Plan generated and saved to `.claude/plan/actual-feature-name.md`** **Please review the plan above. You can:** - **Modify plan**: Tell me what needs adjustment, I'll update the plan - **Execute plan**: Copy the following command to a new session ``` /ccg:execute .claude/plan/actual-feature-name.md ``` --- **NOTE**: The `actual-feature-name.md` above MUST be replaced with the actual saved filename! 4. **Immediately terminate current response** (Stop here. No more tool calls.) **ABSOLUTELY FORBIDDEN**: - Ask user "Y/N" then auto-execute (execution is `/ccg:execute`'s responsibility) - Any write operations to production code - Automatically call `/ccg:execute` or any implementation actions - Continue triggering model calls when user hasn't explicitly requested modifications --- ## Plan Saving After planning completes, save plan to: - **First planning**: `.claude/plan/<feature-name>.md` - **Iteration versions**: `.claude/plan/<feature-name>-v2.md`, `.claude/plan/<feature-name>-v3.md`... Plan file write should complete before presenting plan to user. --- ## Plan Modification Flow If user requests plan modifications: 1. Adjust plan content based on user feedback 2. Update `.claude/plan/<feature-name>.md` file 3. Re-present modified plan 4. Prompt user to review or execute again --- ## Next Steps After user approves, **manually** execute: ```bash /ccg:execute .claude/plan/<feature-name>.md ``` --- ## Key Rules 1. **Plan only, no implementation** – This command does not execute any code changes 2. **No Y/N prompts** – Only present plan, let user decide next steps 3. **Trust Rules** – Backend follows Codex, Frontend follows Gemini 4. External models have **zero filesystem write access** 5. **SESSION_ID Handoff** – Plan must include `CODEX_SESSION` / `GEMINI_SESSION` at end (for `/ccg:execute resume <SESSION_ID>` use)
- **/multi-workflow** `[optional arguments]` — Run a full multi-model development workflow with research, planning, execution, optimization, and review.
  - How it runs: # Workflow - Multi-Model Collaborative Development Multi-model collaborative development workflow (Research → Ideation → Plan → Execute → Optimize → Review), with intelligent routing: Frontend → Gemini, Backend → Codex. > **Prerequisite:** Requires the external `ccg-workflow` runtime, which is **not** part of the base ECC install. Initialize it with `npx ccg-workflow` to provision `~/.claude/bin/codeagent-wrapper` and the `~/.claude/.ccg/prompts/*` role files this command depends on. Without that runtime, this command will not run correctly. Structured development workflow with quality gates, MCP services, and multi-model collaboration. ## Usage ```bash /workflow <task description> ``` ## Context - Task to develop: $ARGUMENTS - Structured 6-phase workflow with quality gates - Multi-model collaboration: Codex (backend) + Gemini (frontend) + Claude (orchestration) - MCP service integration (ace-tool, optional) for enhanced capabilities ## Your Role You are the **Orchestrator**, coordinating a multi-model collaborative system (Research → Ideation → Plan → Execute → Optimize → Review). Communicate concisely and professionally for experienced developers. **Collaborative Models**: - **ace-tool MCP** (optional) – Code retrieval + Prompt enhancement - **Codex** – Backend logic, algorithms, debugging (**Backend authority, trustworthy**) - **Gemini** – Frontend UI/UX, visual design (**Frontend expert, backend opinions for reference only**) - **Claude (self)** – Orchestration, planning, execution, delivery --- ## Multi-Model Call Specification **Call syntax** (parallel: `run_in_background: true`, sequential: `false`): ``` # New session call Bash({ command: "~/.claude/bin/codeagent-wrapper {{LITE_MODE_FLAG}}--backend <codex|gemini> {{GEMINI_MODEL_FLAG}}- \"$PWD\" <<'EOF' ROLE_FILE: <role prompt path> <TASK> Requirement: <enhanced requirement (or $ARGUMENTS if not enhanced)> Context: <project context and analysis from previous phases> </TASK> OUTPUT: Expected output format EOF", run_in_background: true, timeout: 3600000, description: "Brief description" }) # Resume session call Bash({ command: "~/.claude/bin/codeagent-wrapper {{LITE_MODE_FLAG}}--backend <codex|gemini> {{GEMINI_MODEL_FLAG}}resume <SESSION_ID> - \"$PWD\" <<'EOF' ROLE_FILE: <role prompt path> <TASK> Requirement: <enhanced requirement (or $ARGUMENTS if not enhanced)> Context: <project context and analysis from previous phases> </TASK> OUTPUT: Expected output format EOF", run_in_background: true, timeout: 3600000, description: "Brief description" }) ``` **Model Parameter Notes**: - `{{GEMINI_MODEL_FLAG}}`: When using `--backend gemini`, replace with `--gemini-model gemini-3-pro-preview` (note trailing space); use empty string for codex **Role Prompts**: | Phase | Codex | Gemini | |-------|-------|--------| | Analysis | `~/.claude/.ccg/prompts/codex/analyzer.md` | `~/.claude/.ccg/prompts/gemini/analyzer.md` | | Planning | `~/.claude/.ccg/prompts/codex/architect.md` | `~/.claude/.ccg/prompts/gemini/architect.md` | | Review | `~/.claude/.ccg/prompts/codex/reviewer.md` | `~/.claude/.ccg/prompts/gemini/reviewer.md` | **Session Reuse**: Each call returns `SESSION_ID: xxx`, use `resume xxx` subcommand for subsequent phases (note: `resume`, not `--resume`). **Parallel Calls**: Use `run_in_background: true` to start, wait for results with `TaskOutput`. **Must wait for all models to return before proceeding to next phase**. **Wait for Background Tasks** (use max timeout 600000ms = 10 minutes): ``` TaskOutput({ task_id: "<task_id>", block: true, timeout: 600000 }) ``` **IMPORTANT**: - Must specify `timeout: 600000`, otherwise default 30 seconds will cause premature timeout. - If still incomplete after 10 minutes, continue polling with `TaskOutput`, **NEVER kill the process**. - If waiting is skipped due to timeout, **MUST call `AskUserQuestion` to ask user whether to continue waiting or kill task. Never kill directly.** --- ## Communication Guidelines 1. Start responses with mode label `[Mode: X]`, initial is `[Mode: Research]`. 2. Follow strict sequence: `Research → Ideation → Plan → Execute → Optimize → Review`. 3. Request user confirmation after each phase completion. 4. Force stop when score < 7 or user does not approve. 5. Use `AskUserQuestion` tool for user interaction when needed (e.g., confirmation/selection/approval). ## When to Use External Orchestration Use external tmux/worktree orchestration when the work must be split across parallel workers that need isolated git state, independent terminals, or separate build/test execution. Use in-process subagents for lightweight analysis, planning, or review where the main session remains the only writer. ```bash node scripts/orchestrate-worktrees.js .claude/plan/workflow-e2e-test.json --execute ``` --- ## Execution Workflow **Task Description**: $ARGUMENTS ### Phase 1: Research & Analysis `[Mode: Research]` - Understand requirements and gather context: 1. **Prompt Enhancement** (if ace-tool MCP available): Call `mcp__ace-tool__enhance_prompt`, **replace original $ARGUMENTS with enhanced result for all subsequent Codex/Gemini calls**. If unavailable, use `$ARGUMENTS` as-is. 2. **Context Retrieval** (if ace-tool MCP available): Call `mcp__ace-tool__search_context`. If unavailable, use built-in tools: `Glob` for file discovery, `Grep` for symbol search, `Read` for context gathering, `Task` (Explore agent) for deeper exploration. 3. **Requirement Completeness Score** (0-10): - Goal clarity (0-3), Expected outcome (0-3), Scope boundaries (0-2), Constraints (0-2) - ≥7: Continue | <7: Stop, ask clarifying questions ### Phase 2: Solution Ideation `[Mode: Ideation]` - Multi-model parallel analysis: **Parallel Calls** (`run_in_background: true`): - Codex: Use analyzer prompt, output technical feasibility, solutions, risks - Gemini: Use analyzer prompt, output UI feasibility, solutions, UX evaluation Wait for results with `TaskOutput`. **Save SESSION_ID** (`CODEX_SESSION` and `GEMINI_SESSION`). **Follow the `IMPORTANT` instructions in `Multi-Model Call Specification` above** Synthesize both analyses, output solution comparison (at least 2 options), wait for user selection. ### Phase 3: Detailed Planning `[Mode: Plan]` - Multi-model collaborative planning: **Parallel Calls** (resume session with `resume <SESSION_ID>`): - Codex: Use architect prompt + `resume $CODEX_SESSION`, output backend architecture - Gemini: Use architect prompt + `resume $GEMINI_SESSION`, output frontend architecture Wait for results with `TaskOutput`. **Follow the `IMPORTANT` instructions in `Multi-Model Call Specification` above** **Claude Synthesis**: Adopt Codex backend plan + Gemini frontend plan, save to `.claude/plan/task-name.md` after user approval. ### Phase 4: Implementation `[Mode: Execute]` - Code development: - Strictly follow approved plan - Follow existing project code standards - Request feedback at key milestones ### Phase 5: Code Optimization `[Mode: Optimize]` - Multi-model parallel review: **Parallel Calls**: - Codex: Use reviewer prompt, focus on security, performance, error handling - Gemini: Use reviewer prompt, focus on accessibility, design consistency Wait for results with `TaskOutput`. Integrate review feedback, execute optimization after user confirmation. **Follow the `IMPORTANT` instructions in `Multi-Model Call Specification` above** ### Phase 6: Quality Review `[Mode: Review]` - Final evaluation: - Check completion against plan - Run tests to verify functionality - Report issues and recommendations - Request final user confirmation --- ## Key Rules 1. Phase sequence cannot be skipped (unless user explicitly instructs) 2. External models have **zero filesystem write access**, all modifications by Claude 3. **Force stop** when score < 7 or user does not approve
- **/orch-add-feature** `[optional arguments]` — Orchestrate building a brand-new feature end to end — research, plan, TDD, review, gated commit. Wrapper that kicks off the orch-add-feature skill.
  - How it runs: # /orch-add-feature Manually launch the **orch-add-feature** orchestrator: a gated Research → Plan → TDD → Review → Commit pipeline for net-new capability. ## Usage ``` /orch-add-feature <what to add> ``` Examples: ``` /orch-add-feature add OAuth2 login to nws-poller /orch-add-feature support CSV export in the dashboard ``` ## What It Does Invoke the `orch-add-feature` skill with `$ARGUMENTS` as the request. The skill (via the shared `orch-pipeline` engine) will: 1. Classify size and state the tier in one line. 2. Research existing libraries/patterns, then plan a `task_list`. → **GATE 1** (approve plan). 3. TDD each task (new failing tests → green), then `code-reviewer` (+ `security-reviewer` if a security trigger is touched). 4. Commit as conventional `feat:` commits. → **GATE 2** (confirm before commit). Honor both gates — do not write implementation before Gate 1, do not commit before Gate 2. If `$ARGUMENTS` is empty, ask the user what capability to add.
- **/orch-build-mvp** `[optional arguments]` — Orchestrate bootstrapping a working MVP from a design/spec doc — ingest, slice, scaffold, TDD, review, gated commit (reuses the GAN harness). Wrapper for the orch-build-mvp skill.
  - How it runs: # /orch-build-mvp Manually launch the **orch-build-mvp** orchestrator: turn an SDD/PRD/system-design document into a running vertical slice. ## Usage ``` /orch-build-mvp <path to design/spec doc> ``` Examples: ``` /orch-build-mvp civicpulse/docs/SDD-v0.6.md ``` ## What It Does Invoke the `orch-build-mvp` skill with `$ARGUMENTS` as the doc path. The skill (via the shared `orch-pipeline` engine, full pipeline incl. Scaffold) will: 1. Read the spec; extract scope, locked decisions, and a feature list ordered as **thin vertical slices** (one end-to-end path first). → **GATE 1** (approve slice plan). 2. Scaffold the first end-to-end slice. 3. Reuse the GAN harness: translate the SDD into `gan-harness/spec.md` + `eval-rubric.md`, then drive `/gan-build "<brief>" --skip-planner` (generator → evaluator loop) until the score passes or plateaus. 4. `code-reviewer` (+ `security-reviewer` on any security-trigger slice), then commit the scaffold and each slice as separate `feat:` commits. → **GATE 2**. If `$ARGUMENTS` is empty, ask the user for the path to the design/spec doc.
- **/orch-change-feature** `[optional arguments]` — Orchestrate altering an existing, working feature to new desired behavior — update tests to the new spec, change impl, review, gated commit. Wrapper for the orch-change-feature skill.
  - How it runs: # /orch-change-feature Manually launch the **orch-change-feature** orchestrator: change behavior that already works to a new desired spec, tests-first. ## Usage ``` /orch-change-feature <the new desired behavior> ``` Examples: ``` /orch-change-feature make nws-poller alert at 2 warnings instead of 3 /orch-change-feature instead of sorting by date, sort by priority ``` ## What It Does Invoke the `orch-change-feature` skill with `$ARGUMENTS` as the request. The skill (via the shared `orch-pipeline` engine) will: 1. Classify size (default floor: small) and state the tier. 2. Light plan only if the new behavior needs research. → **GATE 1** (approve changed-test plan). 3. **Update the existing tests** to express the new behavior, then change the implementation until green. (Changing the tests first is what makes this a tweak, not a fix.) 4. `code-reviewer` (+ `security-reviewer` on a security trigger), then commit. → **GATE 2**. Use this only when the feature **works** but should behave differently — not for bugs (`/orch-fix-defect`) or net-new capability (`/orch-add-feature`). If `$ARGUMENTS` is empty, ask the user what behavior should change.
- **/orch-fix-defect** `[optional arguments]` — Orchestrate fixing a bug — reproduce it as a failing regression test, fix to green, review, gated commit. Wrapper for the orch-fix-defect skill.
  - How it runs: # /orch-fix-defect Manually launch the **orch-fix-defect** orchestrator: prove the bug with a red test, then fix to green. ## Usage ``` /orch-fix-defect <what is broken> ``` Examples: ``` /orch-fix-defect poller crashes on empty NWS response /orch-fix-defect login returns 500 when email has a plus sign ``` ## What It Does Invoke the `orch-fix-defect` skill with `$ARGUMENTS` as the request. The skill (via the shared `orch-pipeline` engine) will: 1. Classify size (default floor: small, often trivial); scope root cause with `code-explorer` if unclear. 2. **Write a new failing regression test** reproducing the bug, then fix until it goes green. (Proving the bug first is what makes this a fix, not a tweak.) 3. `code-reviewer` (+ `security-reviewer` if the defect sits in a sensitive path). 4. Commit as a conventional `fix:` commit. → **GATE 2** (confirm before commit). Use this only when behavior is **broken/wrong** — not for intentional changes (`/orch-change-feature`) or new capability (`/orch-add-feature`). If `$ARGUMENTS` is empty, ask the user to describe the defect.
- **/orch-refine-code** `[optional arguments]` — Orchestrate a behavior-preserving refactor — confirm tests green, restructure without changing behavior, keep green, review, gated commit. Wrapper for the orch-refine-code skill.
  - How it runs: # /orch-refine-code Manually launch the **orch-refine-code** orchestrator: improve structure while behavior stays identical, with the existing test suite as the safety net. ## Usage ``` /orch-refine-code <what to restructure> ``` Examples: ``` /orch-refine-code extract the NWS HTTP client out of poller.py /orch-refine-code remove dead code and duplication in the dashboard module ``` ## What It Does Invoke the `orch-refine-code` skill with `$ARGUMENTS` as the request. The skill (via the shared `orch-pipeline` engine) will: 1. Classify size (default floor: standard — restructures touch multiple files). 2. Confirm the relevant tests exist and are **green before** touching code; add characterization tests first if coverage is thin. Plan the restructure. → **GATE 1**. 3. Restructure in small steps, re-running tests after each (no new behavior tests — the existing suite proves behavior is unchanged). Dead-code/dup sweeps delegate to `refactor-cleaner`. 4. `code-reviewer`, then commit as `refactor:` (the diff must be behavior-neutral). → **GATE 2**. Use this only when behavior must **not** change. If behavior should change at all, use `/orch-change-feature` or `/orch-fix-defect`. If `$ARGUMENTS` is empty, ask the user what to refine.
- **/orch-review** `pr-number | pr-url | blank for local uncommitted changes` — Run the orch-review native Workflow over a diff (local changes or a GitHub PR) and report blocking vs advisory findings. Surface for the orch-review workflow.
  - How it runs: # /orch-review Surface for `workflows/orch-review.workflow.js` — the native Workflow port of orch-pipeline Phase 5 (Review). This command computes a diff, hands it to the workflow, and presents the result. The workflow owns the fan-out (one reviewer per dimension, dedup, adversarial verify); this command owns input and output. **Input**: $ARGUMENTS --- ## Mode Selection | Input | Mode | |---|---| | Blank | **Local Mode** — review uncommitted changes | | Number (e.g. `42`) or PR URL | **PR Mode** — review a GitHub PR | --- ## Phase 1 — GATHER Build the unified diff and the metadata the workflow needs. **Local Mode:** ```bash git diff --name-only HEAD # changedFiles git diff HEAD # diff text ``` If the diff is empty, stop: "Nothing to review." **PR Mode:** First derive a **safe numeric PR id** from `$ARGUMENTS` — never pass the raw argument to the shell. Accept either a bare integer, or the trailing number of a `https://github.com/<owner>/<repo>/pull/<N>` URL. Reject anything else (extra text, shell metacharacters, a non-PR URL) and stop with an error. Use only the extracted integer `<NUMBER>` below: ```bash gh pr diff <NUMBER> # diff text gh pr view <NUMBER> --json files \ --jq '.files[].path' # changedFiles ``` If the PR is not found, stop with an error. Then derive `language` from the dominant changed-file extension (for example `.ts`/`.tsx` to `typescript`, `.py` to `python`, `.go` to `go`). Leave it unset when the change is mixed or non-code — the workflow simply skips the language-specific reviewer. ## Phase 2 — INVOKE Call the Workflow tool. The workflow validates its own input and fails closed on a missing or empty diff, so always pass a non-empty `diff`. ```jsonc Workflow({ scriptPath: "workflows/orch-review.workflow.js", args: { diff: "<unified diff text from Phase 1>", // required language: "typescript", // optional changedFiles: ["src/auth.ts"] // optional — feeds the security trigger } }) ``` The workflow fans out reviewers in parallel, dedups findings on the normalized evidence snippet, and runs an adversarial verifier on every unique CRITICAL/HIGH finding. It returns: ```jsonc { "verdict": "APPROVE" | "CHANGES_REQUESTED", "incomplete": false, // true if a review dimension failed to run "failedDimensions": [ /* { dimension, error } */ ], "blocking": [ /* confirmed CRITICAL/HIGH + unverifiable findings */ ], "advisory": [ /* MEDIUM/LOW + adversarially-refuted findings */ ], "stats": { "dimensions": 3, "failed": 0, "raw": 11, "unique": 4, "confirmed": 3, "unverified": 0, "uncertain": 0, "refuted": 1 } } ``` ## Phase 3 — REPORT Present the result to the user (this is the human review gate; the workflow does not commit anything): - Lead with `verdict` and the `stats` line (dimensions, raw to unique collapse). - List every `blocking` finding with file, severity, and evidence — these must clear before a commit. Findings tagged "could not be verified" stay in `blocking` by design; call them out as needing manual confirmation. - List `advisory` findings briefly (MEDIUM/LOW and verifier-refuted items). - If `incomplete` is true, state which dimensions in `failedDimensions` did not run and that the verdict is therefore not a clean approval. ## Fail-Closed Contract This command must never present a clean APPROVE when the review could not fully run. If the Workflow tool itself errors, report the failure — do not fall back to a hand-rolled review and do not imply the diff was approved. --- ## Edge Cases - **No `gh` CLI (PR Mode)**: stop and tell the user PR Mode needs `gh`; suggest Local Mode against a checked-out branch instead. - **Large diff**: the workflow caps reviewer concurrency automatically, so a large diff is slower but safe; warn the user it may take longer. - **Binary or generated files**: drop them from `changedFiles` before invoking — they add noise to the security trigger without reviewable content.
- **/plan-canvas** `[path/to/artifact.plan.md | path/to/artifact.html]` — Open a plan or HTML artifact in the browser Plan Canvas for annotate-and-approve review
  - How it runs: # Plan Canvas Command Opens a local artifact in the Plan Canvas — ECC's browser review surface — where the user annotates elements, chats with you, and approves the plan or requests changes without leaving the page. This command is a thin entry point over the `plan-canvas` skill. Follow that skill for the full workflow and rules. ## What This Command Does 1. Resolve the artifact: the given path, else the most recently modified `.claude/plans/*.plan.md`, else ask what to review. 2. `ecc-plan-canvas open <artifact>` — opens the user's browser. 3. `ecc-plan-canvas await <artifact>` — block until feedback, verdict, or session end; leave it running. 4. Apply feedback to the artifact file (the canvas live-reloads), answer with `await <artifact> --reply "..."`, and repeat until the user approves or ends the session. An `approve` verdict counts as plan confirmation for `/plan`-style gates: stop polling, `end` the session, and begin implementation. ## Example ``` User: /plan-canvas .claude/plans/notifications.plan.md Assistant: (runs open + await, browser opens) ...user clicks "Request changes" with two annotations... Assistant: (edits the plan, replies in-canvas, awaits again) ...user clicks "Approve plan"... Assistant: Plan approved in the canvas — starting implementation. ``` ## Related - `plan-canvas` skill — full workflow, feedback JSON shapes, rules - `/plan` — produces the plan artifacts this reviews - Source: `scripts/plan-canvas.js`, `scripts/lib/plan-canvas/`
- **/plan-prd** `[product/feature idea] (blank = start with questions)` — Generate a lean, problem-first PRD and hand off to /plan for implementation planning.
  - How it runs: # PRD Command Produces a **Product Requirements Document** — the requirements-phase artifact of the SDLC. Captures *what* must be true for success and *why*, and stops before *how*. Implementation decomposition is delegated to `/plan`. **Input**: `$ARGUMENTS` ## Scope of this command | This command does | This command does NOT do | |---|---| | Frame the problem and users | Design the architecture | | Capture success criteria and scope | Pick files or write patterns | | List open questions and risks | Enumerate implementation tasks | | Write `.claude/prds/{name}.prd.md` | Produce an implementation plan — that's `/plan` | If you find yourself writing implementation detail, stop and cut it. It belongs in `/plan`. **Anti-fluff rule**: When information is missing, write `TBD — needs validation via {method}`. Never invent plausible-sounding requirements. ## Workflow Four phases. Each phase is a single gate — ask the questions, wait for the user, then move on. No nested loops, no parallel research ceremony. ### Phase 1 — FRAME If `$ARGUMENTS` is empty, ask: > What do you want to build? One or two sentences. If provided, restate in one sentence and ask: > I understand: *{restated}*. Correct, or should I adjust? Then ask the framing questions in a single set: > 1. **Who** has this problem? (specific role or segment) > 2. **What** is the observable pain? (describe behavior, not assumed needs) > 3. **Why** can't they solve it with what exists today? > 4. **Why now?** — what changed that makes this worth doing? Wait for the user. Do not proceed without answers (or explicit "skip"). ### Phase 2 — GROUND Ask for evidence. This is the shortest phase and the most load-bearing: > What evidence do you have that this problem is real and worth solving? (user quotes, support tickets, metrics, observed behavior, failed workarounds — anything concrete) If the user has none, record the PRD's Evidence section as `Assumption — needs validation via {user research | analytics | prototype}`. This keeps the PRD honest. ### Phase 3 — DECIDE Scope and hypothesis in a single set: > 1. **Hypothesis** — Complete: *We believe **{capability}** will **{solve problem}** for **{users}**. We'll know we're right when **{measurable outcome}**.* > 2. **MVP** — The minimum needed to test the hypothesis? > 3. **Out of scope** — What are you explicitly **not** building (even if users ask)? > 4. **Open questions** — Uncertainties that could change the approach? Wait for responses. ### Phase 4 — GENERATE & HAND OFF Create the directory if needed, write the PRD, and report. ```bash mkdir -p .claude/prds ``` **Output path**: `.claude/prds/{kebab-case-name}.prd.md` #### PRD Template ```markdown # {Product / Feature Name} ## Problem {2–3 sentences: who has what problem, and what's the cost of leaving it unsolved?} ## Evidence - {User quote, data point, or observation} - {OR: "Assumption — needs validation via {method}"} ## Users - **Primary**: {role, context, what triggers the need} - **Not for**: {who this explicitly excludes} ## Hypothesis We believe **{capability}** will **{solve problem}** for **{users}**. We'll know we're right when **{measurable outcome}**. ## Success Metrics | Metric | Target | How measured | |---|---|---| | {primary} | {number} | {method} | ## Scope **MVP** — {the minimum to test the hypothesis} **Out of scope** - {item} — {why deferred} ## Delivery Milestones <!-- Business outcomes, not engineering tasks. /plan turns each into a plan. --> <!-- Status: pending | in-progress | complete --> | # | Milestone | Outcome | Status | Plan | |---|---|---|---|---| | 1 | {name} | {user-visible change} | pending | — | | 2 | {name} | {user-visible change} | pending | — | ## Open Questions - [ ] {question that could change scope or approach} ## Risks | Risk | Likelihood | Impact | Mitigation | |---|---|---|---| --- *Status: DRAFT — requirements only. Implementation planning pending via /plan.* ``` #### Report to user ``` PRD created: .claude/prds/{name}.prd.md Problem: {one line} Hypothesis: {one line} MVP: {one line} Validation status: Problem {validated | assumption} Users {concrete | generic — refine} Metrics {defined | TBD} Open questions: {count} Next step: /plan .claude/prds/{name}.prd.md → /plan will pick the next pending milestone and produce an implementation plan. ``` ## Integration - `/plan <prd-path>` — consume the PRD and produce an implementation plan for the next pending milestone. - `tdd-workflow` skill — implement the plan test-first. - `/pr` — open a PR that references the PRD and plan. ## Success criteria - **PROBLEM_CLEAR**: problem is specific and evidenced (or flagged as assumption). - **USER_CONCRETE**: primary user is a specific role, not "users". - **HYPOTHESIS_TESTABLE**: measurable outcome included. - **SCOPE_BOUNDED**: explicit MVP and explicit out-of-scope. - **NO_IMPLEMENTATION_DETAIL**: file paths, libraries, or task breakdowns are absent — if they appeared, move them to the `/plan` step.
- **/plan** `[feature description | path/to/*.prd.md]` — Restate requirements, assess risks, and create step-by-step implementation plan. WAIT for user CONFIRM before touching any code.
  - How it runs: # Plan Command This command creates a comprehensive implementation plan before writing any code. It accepts either free-form requirements or a PRD markdown file. Run inline by default. Do not call the Task tool or any subagent by default. This keeps `/plan` usable from plugin installs that ship commands without agent files. ## What This Command Does 1. **Restate Requirements** - Clarify what needs to be built 2. **Identify Risks** - Surface potential issues and blockers 3. **Create Step Plan** - Break down implementation into phases 4. **Wait for Confirmation** - MUST receive user approval before proceeding ## When to Use Use `/plan` when: - Starting a new feature - Making significant architectural changes - Working on complex refactoring - Multiple files/components will be affected - Requirements are unclear or ambiguous ## How It Works The assistant will: 1. **Analyze the request** and restate requirements in clear terms 2. **Ground the plan** in relevant codebase patterns when the repo is available 3. **Break down into phases** with specific, actionable steps 4. **Identify dependencies** between components 5. **Assess risks** and potential blockers 6. **Estimate complexity** (High/Medium/Low) 7. **Present the plan** and WAIT for your explicit confirmation ## Input Modes | Input | Mode | Behavior | |---|---|---| | `path/to/name.prd.md` | PRD artifact mode | Read the PRD, pick the next pending delivery milestone or implementation phase, and write `.claude/plans/{name}.plan.md` | | Any other markdown path | Reference mode | Read the file as context and produce an inline plan | | Free-form text | Conversational mode | Produce an inline plan | | Empty input | Clarification mode | Ask what should be planned | In PRD artifact mode, create `.claude/plans/` if needed. If the PRD contains a `Delivery Milestones` table, update only the selected row from `pending` to `in-progress` and set its `Plan` cell to the generated plan path. If the PRD uses the legacy `.claude/PRPs/prds/` format with `Implementation Phases`, read it without migrating paths. ## Pattern Grounding Before writing the plan, search the codebase for conventions the implementation should mirror. Capture the top example for each relevant category with file references: | Category | What to capture | |---|---| | Naming | File, function, type, command, or script naming in the affected area | | Error handling | How failures are raised, returned, logged, or handled gracefully | | Logging | Levels, format, and what gets logged | | Data access | Repository, service, query, or filesystem patterns | | Tests | Test file location, framework, fixtures, and assertion style | If no similar code exists, state that explicitly. Do not invent a pattern. ## PRD Artifact Output When called with a `.prd.md` file, write the plan to `.claude/plans/{kebab-case-name}.plan.md` using this structure: ````markdown # Plan: {Feature Name} **Source PRD**: {path} **Selected Milestone**: {milestone or phase name} **Complexity**: {Small | Medium | Large} ## Summary {2-3 sentences} ## Patterns to Mirror | Category | Source | Pattern | |---|---|---| | Naming | `path:line` | {short description} | | Errors | `path:line` | {short description} | | Tests | `path:line` | {short description} | ## Files to Change | File | Action | Why | |---|---|---| | `path` | CREATE / UPDATE / DELETE | {reason} | ## Tasks ### Task 1: {name} - **Action**: {what to do} - **Mirror**: {pattern to follow} - **Validate**: {command that proves correctness} ## Validation ```bash {project-specific validation commands} ``` ## Risks | Risk | Likelihood | Mitigation | |---|---|---| ## Acceptance - [ ] All tasks complete - [ ] Validation passes - [ ] Patterns mirrored, not reinvented ```` After writing the artifact, report its path and WAIT for confirmation before writing code. > **Visual review:** instead of asking for a typed confirmation, you can open the > artifact in the browser Plan Canvas (`/plan-canvas`, or the `plan-canvas` skill): > the user annotates the plan in place and clicks **Approve plan** or **Request > changes**, which arrives as your confirmation signal. ## Example Usage ``` User: /plan I need to add real-time notifications when markets resolve Assistant: # Implementation Plan: Real-Time Market Resolution Notifications ## Requirements Restatement - Send notifications to users when markets they're watching resolve - Support multiple notification channels (in-app, email, webhook) - Ensure notifications are delivered reliably - Include market outcome and user's position result ## Implementation Phases ### Phase 1: Database Schema - Add notifications table with columns: id, user_id, market_id, type, status, created_at - Add user_notification_preferences table for channel preferences - Create indexes on user_id and market_id for performance ### Phase 2: Notification Service - Create notification service in lib/notifications.ts - Implement notification queue using BullMQ/Redis - Add retry logic for failed deliveries - Create notification templates ### Phase 3: Integration Points - Hook into market resolution logic (when status changes to "resolved") - Query all users with positions in market - Enqueue notifications for each user ### Phase 4: Frontend Components - Create NotificationBell component in header - Add NotificationList modal - Implement real-time updates via Supabase subscriptions - Add notification preferences page ## Dependencies - Redis (for queue) - Email service (SendGrid/Resend) - Supabase real-time subscriptions ## Risks - HIGH: Email deliverability (SPF/DKIM required) - MEDIUM: Performance with 1000+ users per market - MEDIUM: Notification spam if markets resolve frequently - LOW: Real-time subscription overhead ## Estimated Complexity: MEDIUM - Backend: 4-6 hours - Frontend: 3-4 hours - Testing: 2-3 hours - Total: 9-13 hours **WAITING FOR CONFIRMATION**: Proceed with this plan? (yes/no/modify) ``` ## Important Notes **CRITICAL**: This command will **NOT** write any code until you explicitly confirm the plan with "yes" or "proceed" or similar affirmative response. If you want changes, respond with: - "modify: [your changes]" - "different approach: [alternative]" - "skip phase 2 and do phase 3 first" ## Integration with Other Commands After planning: - Use `/plan-canvas` to run the confirmation gate visually in the browser (annotate + approve) - Use the `tdd-workflow` skill to implement with test-driven development - Use `/build-fix` if build errors occur - Use `/code-review` to review completed implementation - Use `/pr` or `/prp-pr` to open a pull request > **Need requirements first?** Use `/plan-prd` for a lean PRD at `.claude/prds/{name}.prd.md`. > > **Need the legacy PRP flow?** Use `/prp-plan` for deep PRP planning with `.claude/PRPs/` artifacts. Use `/prp-implement` to execute those plans with rigorous validation loops. ## Optional Planner Agent ECC also provides a `planner` agent for manual installs that include agent files. Use it only when the local runtime already exposes that subagent and the user explicitly asks you to delegate planning. If the `planner` subagent is unavailable, continue planning inline instead of surfacing an "Agent type 'planner' not found" error. For manual installs, the source file lives at: `agents/planner.md`
- **/pm2** `[optional arguments]` — Analyze a project and generate PM2 service commands for detected frontend, backend, or database services.
  - How it runs: # PM2 Init Auto-analyze project and generate PM2 service commands. **Command**: `$ARGUMENTS` --- ## Workflow 1. Check PM2 (install via `npm install -g pm2` if missing) 2. Scan project to identify services (frontend/backend/database) 3. Generate config files and individual command files --- ## Service Detection | Type | Detection | Default Port | |------|-----------|--------------| | Vite | vite.config.* | 5173 | | Next.js | next.config.* | 3000 | | Nuxt | nuxt.config.* | 3000 | | CRA | react-scripts in package.json | 3000 | | Express/Node | server/backend/api directory + package.json | 3000 | | FastAPI/Flask | requirements.txt / pyproject.toml | 8000 | | Go | go.mod / main.go | 8080 | **Port Detection Priority**: User specified > .env > config file > scripts args > default port --- ## Generated Files ``` project/ ├── ecosystem.config.cjs # PM2 config ├── {backend}/start.cjs # Python wrapper (if applicable) └── .claude/ ├── commands/ │ ├── pm2-all.md # Start all + monit │ ├── pm2-all-stop.md # Stop all │ ├── pm2-all-restart.md # Restart all │ ├── pm2-{port}.md # Start single + logs │ ├── pm2-{port}-stop.md # Stop single │ ├── pm2-{port}-restart.md # Restart single │ ├── pm2-logs.md # View all logs │ └── pm2-status.md # View status └── scripts/ ├── pm2-logs-{port}.ps1 # Single service logs └── pm2-monit.ps1 # PM2 monitor ``` --- ## Windows Configuration (IMPORTANT) ### ecosystem.config.cjs **Must use `.cjs` extension** ```javascript module.exports = { apps: [ // Node.js (Vite/Next/Nuxt) { name: 'project-3000', cwd: './packages/web', script: 'node_modules/vite/bin/vite.js', args: '--port 3000', interpreter: 'C:/Program Files/nodejs/node.exe', env: { NODE_ENV: 'development' } }, // Python { name: 'project-8000', cwd: './backend', script: 'start.cjs', interpreter: 'C:/Program Files/nodejs/node.exe', env: { PYTHONUNBUFFERED: '1' } } ] } ``` **Framework script paths:** | Framework | script | args | |-----------|--------|------| | Vite | `node_modules/vite/bin/vite.js` | `--port {port}` | | Next.js | `node_modules/next/dist/bin/next` | `dev -p {port}` | | Nuxt | `node_modules/nuxt/bin/nuxt.mjs` | `dev --port {port}` | | Express | `src/index.js` or `server.js` | - | ### Python Wrapper Script (start.cjs) ```javascript const { spawn } = require('child_process'); const proc = spawn('python', ['-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8000', '--reload'], { cwd: __dirname, stdio: 'inherit', windowsHide: true }); proc.on('close', (code) => process.exit(code)); ``` --- ## Command File Templates (Minimal Content) ### pm2-all.md (Start all + monit) ````markdown Start all services and open PM2 monitor. ```bash cd "{PROJECT_ROOT}" && pm2 start ecosystem.config.cjs && start wt.exe -d "{PROJECT_ROOT}" pwsh -NoExit -c "pm2 monit" ``` ```` ### pm2-all-stop.md ````markdown Stop all services. ```bash cd "{PROJECT_ROOT}" && pm2 stop all ``` ```` ### pm2-all-restart.md ````markdown Restart all services. ```bash cd "{PROJECT_ROOT}" && pm2 restart all ``` ```` ### pm2-{port}.md (Start single + logs) ````markdown Start {name} ({port}) and open logs. ```bash cd "{PROJECT_ROOT}" && pm2 start ecosystem.config.cjs --only {name} && start wt.exe -d "{PROJECT_ROOT}" pwsh -NoExit -c "pm2 logs {name}" ``` ```` ### pm2-{port}-stop.md ````markdown Stop {name} ({port}). ```bash cd "{PROJECT_ROOT}" && pm2 stop {name} ``` ```` ### pm2-{port}-restart.md ````markdown Restart {name} ({port}). ```bash cd "{PROJECT_ROOT}" && pm2 restart {name} ``` ```` ### pm2-logs.md ````markdown View all PM2 logs. ```bash cd "{PROJECT_ROOT}" && pm2 logs ``` ```` ### pm2-status.md ````markdown View PM2 status. ```bash cd "{PROJECT_ROOT}" && pm2 status ``` ```` ### PowerShell Scripts (pm2-logs-{port}.ps1) ```powershell Set-Location "{PROJECT_ROOT}" pm2 logs {name} ``` ### PowerShell Scripts (pm2-monit.ps1) ```powershell Set-Location "{PROJECT_ROOT}" pm2 monit ``` --- ## Key Rules 1. **Config file**: `ecosystem.config.cjs` (not .js) 2. **Node.js**: Specify bin path directly + interpreter 3. **Python**: Node.js wrapper script + `windowsHide: true` 4. **Open new window**: `start wt.exe -d "{path}" pwsh -NoExit -c "command"` 5. **Minimal content**: Each command file has only 1-2 lines description + bash block 6. **Direct execution**: No AI parsing needed, just run the bash command --- ## Execute Based on `$ARGUMENTS`, execute init: 1. Scan project for services 2. Generate `ecosystem.config.cjs` 3. Generate `{backend}/start.cjs` for Python services (if applicable) 4. Generate command files in `.claude/commands/` 5. Generate script files in `.claude/scripts/` 6. **Update project CLAUDE.md** with PM2 info (see below) 7. **Display completion summary** with terminal commands --- ## Post-Init: Update CLAUDE.md After generating files, append PM2 section to project's `CLAUDE.md` (create if not exists): ````markdown ## PM2 Services | Port | Name | Type | |------|------|------| | {port} | {name} | {type} | **Terminal Commands:** ```bash pm2 start ecosystem.config.cjs # First time pm2 start all # After first time pm2 stop all / pm2 restart all pm2 start {name} / pm2 stop {name} pm2 logs / pm2 status / pm2 monit pm2 save # Save process list pm2 resurrect # Restore saved list ``` ```` **Rules for CLAUDE.md update:** - If PM2 section exists, replace it - If not exists, append to end - Keep content minimal and essential --- ## Post-Init: Display Summary After all files generated, output: ``` ## PM2 Init Complete **Services:** | Port | Name | Type | |------|------|------| | {port} | {name} | {type} | **Claude Commands:** /pm2-all, /pm2-all-stop, /pm2-{port}, /pm2-{port}-stop, /pm2-logs, /pm2-status **Terminal Commands:** ## First time (with config file) pm2 start ecosystem.config.cjs && pm2 save ## After first time (simplified) pm2 start all # Start all pm2 stop all # Stop all pm2 restart all # Restart all pm2 start {name} # Start single pm2 stop {name} # Stop single pm2 logs # View logs pm2 monit # Monitor panel pm2 resurrect # Restore saved processes **Tip:** Run `pm2 save` after first start to enable simplified commands. ```
- **/pr** `[base-branch] (default: main)` — Create a GitHub PR from current branch with unpushed commits — discovers templates, analyzes changes, pushes
  - How it runs: # Create Pull Request **Input**: `$ARGUMENTS` — optional, may contain a base branch name and/or flags (e.g., `--draft`). **Parse `$ARGUMENTS`**: - Extract any recognized flags (`--draft`) - Treat remaining non-flag text as the base branch name - Default base branch to `main` if none specified --- ## Phase 1 — VALIDATE Check preconditions: ```bash git branch --show-current git status --short git log origin/<base>..HEAD --oneline ``` | Check | Condition | Action if Failed | |---|---|---| | Not on base branch | Current branch ≠ base | Stop: "Switch to a feature branch first." | | Clean working directory | No uncommitted changes | Warn: "You have uncommitted changes. Commit or stash first." | | Has commits ahead | `git log origin/<base>..HEAD` not empty | Stop: "No commits ahead of `<base>`. Nothing to PR." | | No existing PR | `gh pr list --head <branch> --json number` is empty | Stop: "PR already exists: #<number>. Use `gh pr view <number> --web` to open it." | If all checks pass, proceed. --- ## Phase 2 — DISCOVER ### PR Template Search for PR template in order: 1. `.github/PULL_REQUEST_TEMPLATE/` directory — if exists, list files and let user choose (or use `default.md`) 2. `.github/PULL_REQUEST_TEMPLATE.md` 3. `.github/pull_request_template.md` 4. `docs/pull_request_template.md` If found, read it and use its structure for the PR body. ### Commit Analysis ```bash git log origin/<base>..HEAD --format="%h %s" --reverse ``` Analyze commits to determine: - **PR title**: Use conventional commit format with type prefix — `feat: ...`, `fix: ...`, etc. - If multiple types, use the dominant one - If single commit, use its message as-is - **Change summary**: Group commits by type/area ### File Analysis ```bash git diff origin/<base>..HEAD --stat git diff origin/<base>..HEAD --name-only ``` Categorize changed files: source, tests, docs, config, migrations. ### Planning Artifacts Check for related artifacts produced by `/plan-prd`, `/plan`, or the legacy PRP workflow: - `.claude/prds/` — PRDs this PR implements a milestone of - `.claude/plans/` — Plans executed by this PR - `.claude/PRPs/prds/` — legacy PRP PRDs - `.claude/PRPs/plans/` — legacy PRP implementation plans - `.claude/PRPs/reports/` — legacy PRP implementation reports Reference these in the PR body if they exist. --- ## Phase 3 — PUSH ```bash git push -u origin HEAD ``` If push fails due to divergence: ```bash git fetch origin git rebase origin/<base> git push -u origin HEAD ``` If rebase conflicts occur, stop and inform the user. --- ## Phase 4 — CREATE ### With Template If a PR template was found in Phase 2, fill in each section using the commit and file analysis. Preserve all template sections — leave sections as "N/A" if not applicable rather than removing them. ### Without Template Use this default format: ```markdown ## Summary <1-2 sentence description of what this PR does and why> ## Changes <bulleted list of changes grouped by area> ## Files Changed <table or list of changed files with change type: Added/Modified/Deleted> ## Testing <description of how changes were tested, or "Needs testing"> ## Related Issues <linked issues with Closes/Fixes/Relates to #N, or "None"> ``` ### Create the PR ```bash gh pr create \ --title "<PR title>" \ --base <base-branch> \ --body "<PR body>" # Add --draft if the --draft flag was parsed from $ARGUMENTS ``` --- ## Phase 5 — VERIFY ```bash gh pr view --json number,url,title,state,baseRefName,headRefName,additions,deletions,changedFiles gh pr checks --json name,status,conclusion 2>/dev/null || true ``` --- ## Phase 6 — OUTPUT Report to user: ``` PR #<number>: <title> URL: <url> Branch: <head> → <base> Changes: +<additions> -<deletions> across <changedFiles> files CI Checks: <status summary or "pending" or "none configured"> Artifacts referenced: - <any PRDs/plans linked in PR body> Next steps: - gh pr view <number> --web → open in browser - /code-review <number> → review the PR - gh pr merge <number> → merge when ready ``` --- ## Edge Cases - **No `gh` CLI**: Stop with: "GitHub CLI (`gh`) is required. Install: <https://cli.github.com/>" - **Not authenticated**: Stop with: "Run `gh auth login` first." - **Force push needed**: If remote has diverged and rebase was done, use `git push --force-with-lease` (never `--force`). - **Multiple PR templates**: If `.github/PULL_REQUEST_TEMPLATE/` has multiple files, list them and ask user to choose. - **Large PR (>20 files)**: Warn about PR size. Suggest splitting if changes are logically separable.
- **/project-init** `[optional arguments]` — Detect a project's stack and produce a dry-run ECC onboarding plan using the repository's install manifests and stack mappings.
  - How it runs: # /project-init Create a safe, reviewable ECC onboarding plan for the current project. This command should start in dry-run mode and only write files after explicit user approval. ## Usage ```text /project-init /project-init --dry-run /project-init --target claude /project-init --target cursor /project-init --skills continuous-learning-v2,security-review /project-init --config ecc-install.json ``` ## Safety Rules 1. Default to dry-run. Do not modify `CLAUDE.md`, settings files, rules, skills, or install state until the user approves the concrete plan. 2. Preserve existing project guidance. If `CLAUDE.md`, `.claude/settings.local.json`, `.cursor/`, `.codex/`, `.gemini/`, `.opencode/`, `.codebuddy/`, `.joycode/`, or `.qwen/` already exists, inspect it and propose a merge/append plan instead of overwriting. 3. Use ECC's installer and manifest tooling. Do not hand-copy files or clone arbitrary remotes as an install shortcut. 4. Keep permissions narrow. Any generated settings should match detected build/test/lint tools and avoid broad shell access. 5. Report exactly what would change before applying anything. ## Detection Inputs Read the current project root and detect stack signals from: - package manager files: `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lockb` - language manifests: `pyproject.toml`, `requirements.txt`, `go.mod`, `Cargo.toml`, `pom.xml`, `build.gradle`, `build.gradle.kts` - framework files: `next.config.*`, `vite.config.*`, `tailwind.config.*`, `Dockerfile`, `docker-compose.yml` - ECC config: `ecc-install.json` - optional stack map: `config/project-stack-mappings.json` in the ECC repo When the ECC checkout is available, use `config/project-stack-mappings.json` as the stack-to-rules/skills reference. If the file is unavailable, fall back to the installed ECC manifests and explicit user choices. ## Planning Flow 1. Identify the target harness. Default to `claude` unless the user asks for `cursor`, `codex`, `gemini`, `opencode`, `codebuddy`, `joycode`, or `qwen`. 2. Detect stacks from project files and show the evidence for each match. 3. Resolve the smallest useful ECC plan: - project has an `ecc-install.json`: `node scripts/install-plan.js --config ecc-install.json --json` - user named a profile: `node scripts/install-plan.js --profile <profile> --target <target> --json` - user named skills: `node scripts/install-plan.js --skills <skill-ids> --target <target> --json` - only language stacks are detected: use the legacy language install dry-run with those language names 4. Run a dry-run apply command before writing: ```bash node scripts/install-apply.js --target <target> --dry-run --json <language-or-profile-args> ``` 5. Summarize detected stacks, selected modules/components/skills, target paths, skipped unsupported modules, and files that would be changed. 6. Ask for approval before applying the non-dry-run command. ## Output Contract Return: 1. detected stack evidence 2. proposed target harness 3. exact dry-run command used 4. exact apply command to run after approval 5. files/directories that would be created or changed 6. warnings about existing files, broad permissions, missing scripts, or unsupported targets ## CLAUDE.md Guidance If the user wants a `CLAUDE.md` starter, generate it separately from the installer plan and keep it minimal: - build command, if detected - test command, if detected - lint/typecheck command, if detected - dev server command, if detected - repo-specific notes from existing package scripts or manifests Never replace an existing `CLAUDE.md` without showing a diff and receiving approval. ## Related - `config/project-stack-mappings.json` for stack-to-surface hints - `scripts/install-plan.js` for deterministic plan resolution - `scripts/install-apply.js` for dry-run and apply operations - `/ecc-guide` for interactive feature discovery before installing
- **/projects** `[optional arguments]` — List known projects and their instinct statistics
  - How it runs: # Projects Command List project registry entries and per-project instinct/observation counts for continuous-learning-v2. ## Implementation Run the instinct CLI using the plugin root path: ```bash python3 "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/scripts/instinct-cli.py" projects ``` Or if `CLAUDE_PLUGIN_ROOT` is not set (manual installation): ```bash python3 ~/.claude/skills/continuous-learning-v2/scripts/instinct-cli.py projects ``` ## Usage ```bash /projects ``` ## What to Do 1. Read `~/.claude/homunculus/projects.json` 2. For each project, display: - Project name, id, root, remote - Personal and inherited instinct counts - Observation event count - Last seen timestamp 3. Also display global instinct totals
- **/promote** `[optional arguments]` — Promote project-scoped instincts to global scope
  - How it runs: # Promote Command Promote instincts from project scope to global scope in continuous-learning-v2. ## Implementation Run the instinct CLI using the plugin root path: ```bash python3 "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/scripts/instinct-cli.py" promote [instinct-id] [--force] [--dry-run] ``` Or if `CLAUDE_PLUGIN_ROOT` is not set (manual installation): ```bash python3 ~/.claude/skills/continuous-learning-v2/scripts/instinct-cli.py promote [instinct-id] [--force] [--dry-run] ``` ## Usage ```bash /promote # Auto-detect promotion candidates /promote --dry-run # Preview auto-promotion candidates /promote --force # Promote all qualified candidates without prompt /promote grep-before-edit # Promote one specific instinct from current project ``` ## What to Do 1. Detect current project 2. If `instinct-id` is provided, promote only that instinct (if present in current project) 3. Otherwise, find cross-project candidates that: - Appear in at least 2 projects - Meet confidence threshold 4. Write promoted instincts to `~/.claude/homunculus/instincts/personal/` with `scope: global`
- **/prp-commit** `[target description] (blank = all changes)` — Quick commit with natural language file targeting — describe what to commit in plain English
  - How it runs: # Smart Commit > Adapted from PRPs-agentic-eng by Wirasm. Part of the PRP workflow series. **Input**: $ARGUMENTS --- ## Phase 1 — ASSESS ```bash git status --short ``` If output is empty → stop: "Nothing to commit." Show the user a summary of what's changed (added, modified, deleted, untracked). --- ## Phase 2 — INTERPRET & STAGE Interpret `$ARGUMENTS` to determine what to stage: | Input | Interpretation | Git Command | |---|---|---| | *(blank / empty)* | Stage everything | `git add -A` | | `staged` | Use whatever is already staged | *(no git add)* | | `*.ts` or `*.py` etc. | Stage matching glob | `git add '*.ts'` | | `except tests` | Stage all, then unstage tests | `git add -A && git reset -- '**/*.test.*' '**/*.spec.*' '**/test_*' 2>/dev/null \|\| true` | | `only new files` | Stage untracked files only | `git ls-files --others --exclude-standard \| grep . && git ls-files --others --exclude-standard \| xargs git add` | | `the auth changes` | Interpret from status/diff — find auth-related files | `git add <matched files>` | | Specific filenames | Stage those files | `git add <files>` | For natural language inputs (like "the auth changes"), cross-reference the `git status` output and `git diff` to identify relevant files. Show the user which files you're staging and why. ```bash git add <determined files> ``` After staging, verify: ```bash git diff --cached --stat ``` If nothing staged, stop: "No files matched your description." --- ## Phase 3 — COMMIT Craft a single-line commit message in imperative mood: ``` {type}: {description} ``` Types: - `feat` — New feature or capability - `fix` — Bug fix - `refactor` — Code restructuring without behavior change - `docs` — Documentation changes - `test` — Adding or updating tests - `chore` — Build, config, dependencies - `perf` — Performance improvement - `ci` — CI/CD changes Rules: - Imperative mood ("add feature" not "added feature") - Lowercase after the type prefix - No period at the end - Under 72 characters - Describe WHAT changed, not HOW ```bash git commit -m "{type}: {description}" ``` --- ## Phase 4 — OUTPUT Report to user: ``` Committed: {hash_short} Message: {type}: {description} Files: {count} file(s) changed Next steps: - git push → push to remote - /prp-pr → create a pull request - /code-review → review before pushing ``` --- ## Examples | You say | What happens | |---|---| | `/prp-commit` | Stages all, auto-generates message | | `/prp-commit staged` | Commits only what's already staged | | `/prp-commit *.ts` | Stages all TypeScript files, commits | | `/prp-commit except tests` | Stages everything except test files | | `/prp-commit the database migration` | Finds DB migration files from status, stages them | | `/prp-commit only new files` | Stages untracked files only |
- **/prp-implement** `<path/to/plan.md>` — Execute an implementation plan with rigorous validation loops
  - How it runs: > Adapted from PRPs-agentic-eng by Wirasm. Part of the PRP workflow series. # PRP Implement Execute a plan file step-by-step with continuous validation. Every change is verified immediately — never accumulate broken state. **Core Philosophy**: Validation loops catch mistakes early. Run checks after every change. Fix issues immediately. **Golden Rule**: If a validation fails, fix it before moving on. Never accumulate broken state. --- ## Phase 0 — DETECT ### Package Manager Detection | File Exists | Package Manager | Runner | |---|---|---| | `bun.lockb` | bun | `bun run` | | `pnpm-lock.yaml` | pnpm | `pnpm run` | | `yarn.lock` | yarn | `yarn` | | `package-lock.json` | npm | `npm run` | | `pyproject.toml` or `requirements.txt` | uv / pip | `uv run` or `python -m` | | `Cargo.toml` | cargo | `cargo` | | `go.mod` | go | `go` | ### Validation Scripts Check `package.json` (or equivalent) for available scripts: ```bash # For Node.js projects cat package.json | grep -A 20 '"scripts"' ``` Note available commands for: type-check, lint, test, build. --- ## Phase 1 — LOAD Read the plan file: ```bash cat "$ARGUMENTS" ``` Extract these sections from the plan: - **Summary** — What is being built - **Patterns to Mirror** — Code conventions to follow - **Files to Change** — What to create or modify - **Step-by-Step Tasks** — Implementation sequence - **Validation Commands** — How to verify correctness - **Acceptance Criteria** — Definition of done If the file doesn't exist or isn't a valid plan: ``` Error: Plan file not found or invalid. Run /prp-plan <feature-description> to create a plan first. ``` **CHECKPOINT**: Plan loaded. All sections identified. Tasks extracted. --- ## Phase 2 — PREPARE ### Git State ```bash git branch --show-current git status --porcelain ``` ### Branch Decision | Current State | Action | |---|---| | On feature branch | Use current branch | | On main, clean working tree | Create feature branch: `git checkout -b feat/{plan-name}` | | On main, dirty working tree | **STOP** — Ask user to stash or commit first | | In a git worktree for this feature | Use the worktree | ### Sync Remote ```bash git pull --rebase origin $(git branch --show-current) 2>/dev/null || true ``` **CHECKPOINT**: On correct branch. Working tree ready. Remote synced. --- ## Phase 3 — EXECUTE Process each task from the plan sequentially. ### Per-Task Loop For each task in **Step-by-Step Tasks**: 1. **Read MIRROR reference** — Open the pattern file referenced in the task's MIRROR field. Understand the convention before writing code. 2. **Implement** — Write the code following the pattern exactly. Apply GOTCHA warnings. Use specified IMPORTS. 3. **Validate immediately** — After EVERY file change: ```bash # Run type-check (adjust command per project) [type-check command from Phase 0] ``` If type-check fails → fix the error before moving to the next file. 4. **Track progress** — Log: `[done] Task N: [task name] — complete` ### Handling Deviations If implementation must deviate from the plan: - Note **WHAT** changed - Note **WHY** it changed - Continue with the corrected approach - These deviations will be captured in the report **CHECKPOINT**: All tasks executed. Deviations logged. --- ## Phase 4 — VALIDATE Run all validation levels from the plan. Fix issues at each level before proceeding. ### Level 1: Static Analysis ```bash # Type checking — zero errors required [project type-check command] # Linting — fix automatically where possible [project lint command] [project lint-fix command] ``` If lint errors remain after auto-fix, fix manually. ### Level 2: Unit Tests Write tests for every new function (as specified in the plan's Testing Strategy). ```bash [project test command for affected area] ``` - Every function needs at least one test - Cover edge cases listed in the plan - If a test fails → fix the implementation (not the test, unless the test is wrong) ### Level 3: Build Check ```bash [project build command] ``` Build must succeed with zero errors. ### Level 4: Integration Testing (if applicable) ```bash # Start server, run tests, stop server [project dev server command] & SERVER_PID=$! # Wait for server to be ready (adjust port as needed) SERVER_READY=0 for i in $(seq 1 30); do if curl -sf http://localhost:PORT/health >/dev/null 2>&1; then SERVER_READY=1 break fi sleep 1 done if [ "$SERVER_READY" -ne 1 ]; then kill "$SERVER_PID" 2>/dev/null || true echo "ERROR: Server failed to start within 30s" >&2 exit 1 fi [integration test command] TEST_EXIT=$? kill "$SERVER_PID" 2>/dev/null || true wait "$SERVER_PID" 2>/dev/null || true exit "$TEST_EXIT" ``` ### Level 5: Edge Case Testing Run through edge cases from the plan's Testing Strategy checklist. **CHECKPOINT**: All 5 validation levels pass. Zero errors. --- ## Phase 5 — REPORT ### Create Implementation Report ```bash mkdir -p .claude/PRPs/reports ``` Write report to `.claude/PRPs/reports/{plan-name}-report.md`: ```markdown # Implementation Report: [Feature Name] ## Summary [What was implemented] ## Assessment vs Reality | Metric | Predicted (Plan) | Actual | |---|---|---| | Complexity | [from plan] | [actual] | | Confidence | [from plan] | [actual] | | Files Changed | [from plan] | [actual count] | ## Tasks Completed | # | Task | Status | Notes | |---|---|---|---| | 1 | [task name] | [done] Complete | | | 2 | [task name] | [done] Complete | Deviated — [reason] | ## Validation Results | Level | Status | Notes | |---|---|---| | Static Analysis | [done] Pass | | | Unit Tests | [done] Pass | N tests written | | Build | [done] Pass | | | Integration | [done] Pass | or N/A | | Edge Cases | [done] Pass | | ## Files Changed | File | Action | Lines | |---|---|---| | `path/to/file` | CREATED | +N | | `path/to/file` | UPDATED | +N / -M | ## Deviations from Plan [List any deviations with WHAT and WHY, or "None"] ## Issues Encountered [List any problems and how they were resolved, or "None"] ## Tests Written | Test File | Tests | Coverage | |---|---|---| | `path/to/test` | N tests | [area covered] | ## Next Steps - [ ] Code review via `/code-review` - [ ] Create PR via `/prp-pr` ``` ### Update PRD (if applicable) If this implementation was for a PRD phase: 1. Update the phase status from `in-progress` to `complete` 2. Add report path as reference ### Archive Plan ```bash mkdir -p .claude/PRPs/plans/completed mv "$ARGUMENTS" .claude/PRPs/plans/completed/ ``` **CHECKPOINT**: Report created. PRD updated. Plan archived. --- ## Phase 6 — OUTPUT Report to user: ``` ## Implementation Complete - **Plan**: [plan file path] → archived to completed/ - **Branch**: [current branch name] - **Status**: [done] All tasks complete ### Validation Summary | Check | Status | |---|---| | Type Check | [done] | | Lint | [done] | | Tests | [done] (N written) | | Build | [done] | | Integration | [done] or N/A | ### Files Changed - [N] files created, [M] files updated ### Deviations [Summary or "None — implemented exactly as planned"] ### Artifacts - Report: `.claude/PRPs/reports/{name}-report.md` - Archived Plan: `.claude/PRPs/plans/completed/{name}.plan.md` ### PRD Progress (if applicable) | Phase | Status | |---|---| | Phase 1 | [done] Complete | | Phase 2 | [next] | | ... | ... | > Next step: Run `/prp-pr` to create a pull request, or `/code-review` to review changes first. ``` --- ## Handling Failures ### Type Check Fails 1. Read the error message carefully 2. Fix the type error in the source file 3. Re-run type-check 4. Continue only when clean ### Tests Fail 1. Identify whether the bug is in the implementation or the test 2. Fix the root cause (usually the implementation) 3. Re-run tests 4. Continue only when green ### Lint Fails 1. Run auto-fix first 2. If errors remain, fix manually 3. Re-run lint 4. Continue only when clean ### Build Fails 1. Usually a type or import issue — check error message 2. Fix the offending file 3. Re-run build 4. Continue only when successful ### Integration Test Fails 1. Check server started correctly 2. Verify endpoint/route exists 3. Check request format matches expected 4. Fix and re-run --- ## Success Criteria - **TASKS_COMPLETE**: All tasks from the plan executed - **TYPES_PASS**: Zero type errors - **LINT_PASS**: Zero lint errors - **TESTS_PASS**: All tests green, new tests written - **BUILD_PASS**: Build succeeds - **REPORT_CREATED**: Implementation report saved - **PLAN_ARCHIVED**: Plan moved to `completed/` --- ## Next Steps - Run `/code-review` to review changes before committing - Run `/prp-commit` to commit with a descriptive message - Run `/prp-pr` to create a pull request - Run `/prp-plan <next-phase>` if the PRD has more phases
- **/prp-plan** `<feature description | path/to/prd.md>` — Create comprehensive feature implementation plan with codebase analysis and pattern extraction
  - How it runs: > Adapted from PRPs-agentic-eng by Wirasm. Part of the PRP workflow series. # PRP Plan Create a detailed, self-contained implementation plan that captures all codebase patterns, conventions, and context needed to implement a feature in a single pass. **Core Philosophy**: A great plan contains everything needed to implement without asking further questions. Every pattern, every convention, every gotcha — captured once, referenced throughout. **Golden Rule**: If you would need to search the codebase during implementation, capture that knowledge NOW in the plan. --- ## Phase 0 — DETECT Determine input type from `$ARGUMENTS`: | Input Pattern | Detection | Action | |---|---|---| | Path ending in `.prd.md` | File path to PRD | Parse PRD, find next pending phase | | Path to `.md` with "Implementation Phases" | PRD-like document | Parse phases, find next pending | | Path to any other file | Reference file | Read file for context, treat as free-form | | Free-form text | Feature description | Proceed directly to Phase 1 | | Empty / blank | No input | Ask user what feature to plan | ### PRD Parsing (when input is a PRD) 1. Read the PRD file with `cat "$PRD_PATH"` 2. Parse the **Implementation Phases** section 3. Find phases by status: - Look for `pending` phases - Check dependency chains (a phase may depend on prior phases being `complete`) - Select the **next eligible pending phase** 4. Extract from the selected phase: - Phase name and description - Acceptance criteria - Dependencies on prior phases - Any scope notes or constraints 5. Use the phase description as the feature to plan If no pending phases remain, report that all phases are complete. --- ## Phase 1 — PARSE Extract and clarify the feature requirements. ### Feature Understanding From the input (PRD phase or free-form description), identify: - **What** is being built (concrete deliverable) - **Why** it matters (user value) - **Who** uses it (target user/system) - **Where** it fits (which part of the codebase) ### User Story Format as: ``` As a [type of user], I want [capability], So that [benefit]. ``` ### Complexity Assessment | Level | Indicators | Typical Scope | |---|---|---| | **Small** | Single file, isolated change, no new dependencies | 1-3 files, <100 lines | | **Medium** | Multiple files, follows existing patterns, minor new concepts | 3-10 files, 100-500 lines | | **Large** | Cross-cutting concerns, new patterns, external integrations | 10+ files, 500+ lines | | **XL** | Architectural changes, new subsystems, migration needed | 20+ files, consider splitting | ### Ambiguity Gate If any of these are unclear, **STOP and ask the user** before proceeding: - The core deliverable is vague - Success criteria are undefined - There are multiple valid interpretations - Technical approach has major unknowns Do NOT guess. Ask. A plan built on assumptions fails during implementation. --- ## Phase 2 — EXPLORE Gather deep codebase intelligence. Search the codebase directly for each category below. ### Codebase Search (8 Categories) For each category, search using grep, find, and file reading: 1. **Similar Implementations** — Find existing features that resemble the planned one. Look for analogous patterns, endpoints, components, or modules. 2. **Naming Conventions** — Identify how files, functions, variables, classes, and exports are named in the relevant area of the codebase. 3. **Error Handling** — Find how errors are caught, propagated, logged, and returned to users in similar code paths. 4. **Logging Patterns** — Identify what gets logged, at what level, and in what format. 5. **Type Definitions** — Find relevant types, interfaces, schemas, and how they're organized. 6. **Test Patterns** — Find how similar features are tested. Note test file locations, naming, setup/teardown patterns, and assertion styles. 7. **Configuration** — Find relevant config files, environment variables, and feature flags. 8. **Dependencies** — Identify packages, imports, and internal modules used by similar features. ### Codebase Analysis (5 Traces) Read relevant files to trace: 1. **Entry Points** — How does a request/action enter the system and reach the area you're modifying? 2. **Data Flow** — How does data move through the relevant code paths? 3. **State Changes** — What state is modified and where? 4. **Contracts** — What interfaces, APIs, or protocols must be honored? 5. **Patterns** — What architectural patterns are used (repository, service, controller, etc.)? ### Unified Discovery Table Compile findings into a single reference: | Category | File:Lines | Pattern | Key Snippet | |---|---|---|---| | Naming | `src/services/userService.ts:1-5` | camelCase services, PascalCase types | `export class UserService` | | Error | `src/middleware/errorHandler.ts:10-25` | Custom AppError class | `throw new AppError(...)` | | ... | ... | ... | ... | --- ## Phase 3 — RESEARCH If the feature involves external libraries, APIs, or unfamiliar technology: 1. Search the web for official documentation 2. Find usage examples and best practices 3. Identify version-specific gotchas Format each finding as: ``` KEY_INSIGHT: [what you learned] APPLIES_TO: [which part of the plan this affects] GOTCHA: [any warnings or version-specific issues] ``` If the feature uses only well-understood internal patterns, skip this phase and note: "No external research needed — feature uses established internal patterns." --- ## Phase 4 — DESIGN ### UX Transformation (if applicable) Document the before/after user experience: **Before:** ``` ┌─────────────────────────────┐ │ [Current user experience] │ │ Show the current flow, │ │ what the user sees/does │ └─────────────────────────────┘ ``` **After:** ``` ┌─────────────────────────────┐ │ [New user experience] │ │ Show the improved flow, │ │ what changes for the user │ └─────────────────────────────┘ ``` ### Interaction Changes | Touchpoint | Before | After | Notes | |---|---|---|---| | ... | ... | ... | ... | If the feature is purely backend/internal with no UX change, note: "Internal change — no user-facing UX transformation." --- ## Phase 5 — ARCHITECT ### Strategic Design Define the implementation approach: - **Approach**: High-level strategy (e.g., "Add new service layer following existing repository pattern") - **Alternatives Considered**: What other approaches were evaluated and why they were rejected - **Scope**: Concrete boundaries of what WILL be built - **NOT Building**: Explicit list of what is OUT OF SCOPE (prevents scope creep during implementation) --- ## Phase 6 — GENERATE Write the full plan document using the template below. Save to `.claude/PRPs/plans/{kebab-case-feature-name}.plan.md`. Create the directory if it doesn't exist: ```bash mkdir -p .claude/PRPs/plans ``` ### Plan Template ````markdown # Plan: [Feature Name] ## Summary [2-3 sentence overview] ## User Story As a [user], I want [capability], so that [benefit]. ## Problem → Solution [Current state] → [Desired state] ## Metadata - **Complexity**: [Small | Medium | Large | XL] - **Source PRD**: [path or "N/A"] - **PRD Phase**: [phase name or "N/A"] - **Estimated Files**: [count] --- ## UX Design ### Before [ASCII diagram or "N/A — internal change"] ### After [ASCII diagram or "N/A — internal change"] ### Interaction Changes | Touchpoint | Before | After | Notes | |---|---|---|---| --- ## Mandatory Reading Files that MUST be read before implementing: | Priority | File | Lines | Why | |---|---|---|---| | P0 (critical) | `path/to/file` | 1-50 | Core pattern to follow | | P1 (important) | `path/to/file` | 10-30 | Related types | | P2 (reference) | `path/to/file` | all | Similar implementation | ## External Documentation | Topic | Source | Key Takeaway | |---|---|---| | ... | ... | ... | --- ## Patterns to Mirror Code patterns discovered in the codebase. Follow these exactly. ### NAMING_CONVENTION // SOURCE: [file:lines] [actual code snippet showing the naming pattern] ### ERROR_HANDLING // SOURCE: [file:lines] [actual code snippet showing error handling] ### LOGGING_PATTERN // SOURCE: [file:lines] [actual code snippet showing logging] ### REPOSITORY_PATTERN // SOURCE: [file:lines] [actual code snippet showing data access] ### SERVICE_PATTERN // SOURCE: [file:lines] [actual code snippet showing service layer] ### TEST_STRUCTURE // SOURCE: [file:lines] [actual code snippet showing test setup] --- ## Files to Change | File | Action | Justification | |---|---|---| | `path/to/file.ts` | CREATE | New service for feature | | `path/to/existing.ts` | UPDATE | Add new method | ## NOT Building - [Explicit item 1 that is out of scope] - [Explicit item 2 that is out of scope] --- ## Step-by-Step Tasks ### Task 1: [Name] - **ACTION**: [What to do] - **IMPLEMENT**: [Specific code/logic to write] - **MIRROR**: [Pattern from Patterns to Mirror section to follow] - **IMPORTS**: [Required imports] - **GOTCHA**: [Known pitfall to avoid] - **VALIDATE**: [How to verify this task is correct] ### Task 2: [Name] - **ACTION**: ... - **IMPLEMENT**: ... - **MIRROR**: ... - **IMPORTS**: ... - **GOTCHA**: ... - **VALIDATE**: ... [Continue for all tasks...] --- ## Testing Strategy ### Unit Tests | Test | Input | Expected Output | Edge Case? | |---|---|---|---| | ... | ... | ... | ... | ### Edge Cases Checklist - [ ] Empty input - [ ] Maximum size input - [ ] Invalid types - [ ] Concurrent access - [ ] Network failure (if applicable) - [ ] Permission denied --- ## Validation Commands ### Static Analysis ```bash # Run type checker [project-specific type check command] ``` EXPECT: Zero type errors ### Unit Tests ```bash # Run tests for affected area [project-specific test command] ``` EXPECT: All tests pass ### Full Test Suite ```bash # Run complete test suite [project-specific full test command] ``` EXPECT: No regressions ### Database Validation (if applicable) ```bash # Verify schema/migrations [project-specific db command] ``` EXPECT: Schema up to date ### Browser Validation (if applicable) ```bash # Start dev server and verify [project-specific dev server command] ``` EXPECT: Feature works as designed ### Manual Validation - [ ] [Step-by-step manual verification checklist] --- ## Acceptance Criteria - [ ] All tasks completed - [ ] All validation commands pass - [ ] Tests written and passing - [ ] No type errors - [ ] No lint errors - [ ] Matches UX design (if applicable) ## Completion Checklist - [ ] Code follows discovered patterns - [ ] Error handling matches codebase style - [ ] Logging follows codebase conventions - [ ] Tests follow test patterns - [ ] No hardcoded values - [ ] Documentation updated (if needed) - [ ] No unnecessary scope additions - [ ] Self-contained — no questions needed during implementation ## Risks | Risk | Likelihood | Impact | Mitigation | |---|---|---|---| | ... | ... | ... | ... | ## Notes [Any additional context, decisions, or observations] ``` --- ## Output ### Save the Plan Write the generated plan to: ``` .claude/PRPs/plans/{kebab-case-feature-name}.plan.md ``` ### Update PRD (if input was a PRD) If this plan was generated from a PRD phase: 1. Update the phase status from `pending` to `in-progress` 2. Add the plan file path as a reference in the phase ### Report to User ``` ## Plan Created - **File**: .claude/PRPs/plans/{kebab-case-feature-name}.plan.md - **Source PRD**: [path or "N/A"] - **Phase**: [phase name or "standalone"] - **Complexity**: [level] - **Scope**: [N files, M tasks] - **Key Patterns**: [top 3 discovered patterns] - **External Research**: [topics researched or "none needed"] - **Risks**: [top risk or "none identified"] - **Confidence Score**: [1-10] — likelihood of single-pass implementation > Next step: Run `/prp-implement .claude/PRPs/plans/{name}.plan.md` to execute this plan. ``` --- ## Verification Before finalizing, verify the plan against these checklists: ### Context Completeness - [ ] All relevant files discovered and documented - [ ] Naming conventions captured with examples - [ ] Error handling patterns documented - [ ] Test patterns identified - [ ] Dependencies listed ### Implementation Readiness - [ ] Every task has ACTION, IMPLEMENT, MIRROR, and VALIDATE - [ ] No task requires additional codebase searching - [ ] Import paths are specified - [ ] GOTCHAs documented where applicable ### Pattern Faithfulness - [ ] Code snippets are actual codebase examples (not invented) - [ ] SOURCE references point to real files and line numbers - [ ] Patterns cover naming, errors, logging, data access, and tests - [ ] New code will be indistinguishable from existing code ### Validation Coverage - [ ] Static analysis commands specified - [ ] Test commands specified - [ ] Build verification included ### UX Clarity - [ ] Before/after states documented (or marked N/A) - [ ] Interaction changes listed - [ ] Edge cases for UX identified ### No Prior Knowledge Test A developer unfamiliar with this codebase should be able to implement the feature using ONLY this plan, without searching the codebase or asking questions. If not, add the missing context. --- ## Next Steps - Run `/prp-implement <plan-path>` to execute this plan - Run `/plan` for quick conversational planning without artifacts - Run `/prp-prd` to create a PRD first if scope is unclear ````
- **/prp-pr** `[base-branch] (default: main)` — Create a GitHub PR from current branch with unpushed commits — discovers templates, analyzes changes, pushes
  - How it runs: # Create Pull Request > Adapted from PRPs-agentic-eng by Wirasm. Part of the PRP workflow series. **Input**: `$ARGUMENTS` — optional, may contain a base branch name and/or flags (e.g., `--draft`). **Parse `$ARGUMENTS`**: - Extract any recognized flags (`--draft`) - Treat remaining non-flag text as the base branch name - Default base branch to `main` if none specified --- ## Phase 1 — VALIDATE Check preconditions: ```bash git branch --show-current git status --short git log origin/<base>..HEAD --oneline ``` | Check | Condition | Action if Failed | |---|---|---| | Not on base branch | Current branch ≠ base | Stop: "Switch to a feature branch first." | | Clean working directory | No uncommitted changes | Warn: "You have uncommitted changes. Commit or stash first. Use `/prp-commit` to commit." | | Has commits ahead | `git log origin/<base>..HEAD` not empty | Stop: "No commits ahead of `<base>`. Nothing to PR." | | No existing PR | `gh pr list --head <branch> --json number` is empty | Stop: "PR already exists: #<number>. Use `gh pr view <number> --web` to open it." | If all checks pass, proceed. --- ## Phase 2 — DISCOVER ### PR Template Search for PR template in order: 1. `.github/PULL_REQUEST_TEMPLATE/` directory — if exists, list files and let user choose (or use `default.md`) 2. `.github/PULL_REQUEST_TEMPLATE.md` 3. `.github/pull_request_template.md` 4. `docs/pull_request_template.md` If found, read it and use its structure for the PR body. ### Commit Analysis ```bash git log origin/<base>..HEAD --format="%h %s" --reverse ``` Analyze commits to determine: - **PR title**: Use conventional commit format with type prefix — `feat: ...`, `fix: ...`, etc. - If multiple types, use the dominant one - If single commit, use its message as-is - **Change summary**: Group commits by type/area ### File Analysis ```bash git diff origin/<base>..HEAD --stat git diff origin/<base>..HEAD --name-only ``` Categorize changed files: source, tests, docs, config, migrations. ### PRP Artifacts Check for related PRP artifacts: - `.claude/PRPs/reports/` — Implementation reports - `.claude/PRPs/plans/` — Plans that were executed - `.claude/PRPs/prds/` — Related PRDs Reference these in the PR body if they exist. --- ## Phase 3 — PUSH ```bash git push -u origin HEAD ``` If push fails due to divergence: ```bash git fetch origin git rebase origin/<base> git push -u origin HEAD ``` If rebase conflicts occur, stop and inform the user. --- ## Phase 4 — CREATE ### With Template If a PR template was found in Phase 2, fill in each section using the commit and file analysis. Preserve all template sections — leave sections as "N/A" if not applicable rather than removing them. ### Without Template Use this default format: ```markdown ## Summary <1-2 sentence description of what this PR does and why> ## Changes <bulleted list of changes grouped by area> ## Files Changed <table or list of changed files with change type: Added/Modified/Deleted> ## Testing <description of how changes were tested, or "Needs testing"> ## Related Issues <linked issues with Closes/Fixes/Relates to #N, or "None"> ``` ### Create the PR ```bash gh pr create \ --title "<PR title>" \ --base <base-branch> \ --body "<PR body>" # Add --draft if the --draft flag was parsed from $ARGUMENTS ``` --- ## Phase 5 — VERIFY ```bash gh pr view --json number,url,title,state,baseRefName,headRefName,additions,deletions,changedFiles gh pr checks --json name,status,conclusion 2>/dev/null || true ``` --- ## Phase 6 — OUTPUT Report to user: ``` PR #<number>: <title> URL: <url> Branch: <head> → <base> Changes: +<additions> -<deletions> across <changedFiles> files CI Checks: <status summary or "pending" or "none configured"> Artifacts referenced: - <any PRP reports/plans linked in PR body> Next steps: - gh pr view <number> --web → open in browser - /code-review <number> → review the PR - gh pr merge <number> → merge when ready ``` --- ## Edge Cases - **No `gh` CLI**: Stop with: "GitHub CLI (`gh`) is required. Install: <https://cli.github.com/>" - **Not authenticated**: Stop with: "Run `gh auth login` first." - **Force push needed**: If remote has diverged and rebase was done, use `git push --force-with-lease` (never `--force`). - **Multiple PR templates**: If `.github/PULL_REQUEST_TEMPLATE/` has multiple files, list them and ask user to choose. - **Large PR (>20 files)**: Warn about PR size. Suggest splitting if changes are logically separable.
- **/prp-prd** `[feature/product idea] (blank = start with questions)` — Interactive PRD generator - problem-first, hypothesis-driven product spec with back-and-forth questioning
  - How it runs: # Product Requirements Document Generator > Adapted from PRPs-agentic-eng by Wirasm. Part of the PRP workflow series. **Input**: $ARGUMENTS --- ## Your Role You are a sharp product manager who: - Starts with PROBLEMS, not solutions - Demands evidence before building - Thinks in hypotheses, not specs - Asks clarifying questions before assuming - Acknowledges uncertainty honestly **Anti-pattern**: Don't fill sections with fluff. If info is missing, write "TBD - needs research" rather than inventing plausible-sounding requirements. --- ## Process Overview ``` QUESTION SET 1 → GROUNDING → QUESTION SET 2 → RESEARCH → QUESTION SET 3 → GENERATE ``` Each question set builds on previous answers. Grounding phases validate assumptions. --- ## Phase 1: INITIATE - Core Problem **If no input provided**, ask: > **What do you want to build?** > Describe the product, feature, or capability in a few sentences. **If input provided**, confirm understanding by restating: > I understand you want to build: {restated understanding} > Is this correct, or should I adjust my understanding? **GATE**: Wait for user response before proceeding. --- ## Phase 2: FOUNDATION - Problem Discovery Ask these questions (present all at once, user can answer together): > **Foundation Questions:** > > 1. **Who** has this problem? Be specific - not just "users" but what type of person/role? > > 2. **What** problem are they facing? Describe the observable pain, not the assumed need. > > 3. **Why** can't they solve it today? What alternatives exist and why do they fail? > > 4. **Why now?** What changed that makes this worth building? > > 5. **How** will you know if you solved it? What would success look like? **GATE**: Wait for user responses before proceeding. --- ## Phase 3: GROUNDING - Market & Context Research After foundation answers, conduct research: **Research market context:** 1. Find similar products/features in the market 2. Identify how competitors solve this problem 3. Note common patterns and anti-patterns 4. Check for recent trends or changes in this space Compile findings with direct links, key insights, and any gaps in available information. **If a codebase exists, explore it in parallel:** 1. Find existing functionality relevant to the product/feature idea 2. Identify patterns that could be leveraged 3. Note technical constraints or opportunities Record file locations, code patterns, and conventions observed. **Summarize findings to user:** > **What I found:** > - {Market insight 1} > - {Competitor approach} > - {Relevant pattern from codebase, if applicable} > > Does this change or refine your thinking? **GATE**: Brief pause for user input (can be "continue" or adjustments). --- ## Phase 4: DEEP DIVE - Vision & Users Based on foundation + research, ask: > **Vision & Users:** > > 1. **Vision**: In one sentence, what's the ideal end state if this succeeds wildly? > > 2. **Primary User**: Describe your most important user - their role, context, and what triggers their need. > > 3. **Job to Be Done**: Complete this: "When [situation], I want to [motivation], so I can [outcome]." > > 4. **Non-Users**: Who is explicitly NOT the target? Who should we ignore? > > 5. **Constraints**: What limitations exist? (time, budget, technical, regulatory) **GATE**: Wait for user responses before proceeding. --- ## Phase 5: GROUNDING - Technical Feasibility **If a codebase exists, perform two parallel investigations:** Investigation 1 — Explore feasibility: 1. Identify existing infrastructure that can be leveraged 2. Find similar patterns already implemented 3. Map integration points and dependencies 4. Locate relevant configuration and type definitions Record file locations, code patterns, and conventions observed. Investigation 2 — Analyze constraints: 1. Trace how existing related features are implemented end-to-end 2. Map data flow through potential integration points 3. Identify architectural patterns and boundaries 4. Estimate complexity based on similar features Document what exists with precise file:line references. No suggestions. **If no codebase, research technical approaches:** 1. Find technical approaches others have used 2. Identify common implementation patterns 3. Note known technical challenges and pitfalls Compile findings with citations and gap analysis. **Summarize to user:** > **Technical Context:** > - Feasibility: {HIGH/MEDIUM/LOW} because {reason} > - Can leverage: {existing patterns/infrastructure} > - Key technical risk: {main concern} > > Any technical constraints I should know about? **GATE**: Brief pause for user input. --- ## Phase 6: DECISIONS - Scope & Approach Ask final clarifying questions: > **Scope & Approach:** > > 1. **MVP Definition**: What's the absolute minimum to test if this works? > > 2. **Must Have vs Nice to Have**: What 2-3 things MUST be in v1? What can wait? > > 3. **Key Hypothesis**: Complete this: "We believe [capability] will [solve problem] for [users]. We'll know we're right when [measurable outcome]." > > 4. **Out of Scope**: What are you explicitly NOT building (even if users ask)? > > 5. **Open Questions**: What uncertainties could change the approach? **GATE**: Wait for user responses before generating. --- ## Phase 7: GENERATE - Write PRD **Output path**: `.claude/PRPs/prds/{kebab-case-name}.prd.md` Create directory if needed: `mkdir -p .claude/PRPs/prds` ### PRD Template ```markdown # {Product/Feature Name} ## Problem Statement {2-3 sentences: Who has what problem, and what's the cost of not solving it?} ## Evidence - {User quote, data point, or observation that proves this problem exists} - {Another piece of evidence} - {If none: "Assumption - needs validation through [method]"} ## Proposed Solution {One paragraph: What we're building and why this approach over alternatives} ## Key Hypothesis We believe {capability} will {solve problem} for {users}. We'll know we're right when {measurable outcome}. ## What We're NOT Building - {Out of scope item 1} - {why} - {Out of scope item 2} - {why} ## Success Metrics | Metric | Target | How Measured | |--------|--------|--------------| | {Primary metric} | {Specific number} | {Method} | | {Secondary metric} | {Specific number} | {Method} | ## Open Questions - [ ] {Unresolved question 1} - [ ] {Unresolved question 2} --- ## Users & Context **Primary User** - **Who**: {Specific description} - **Current behavior**: {What they do today} - **Trigger**: {What moment triggers the need} - **Success state**: {What "done" looks like} **Job to Be Done** When {situation}, I want to {motivation}, so I can {outcome}. **Non-Users** {Who this is NOT for and why} --- ## Solution Detail ### Core Capabilities (MoSCoW) | Priority | Capability | Rationale | |----------|------------|-----------| | Must | {Feature} | {Why essential} | | Must | {Feature} | {Why essential} | | Should | {Feature} | {Why important but not blocking} | | Could | {Feature} | {Nice to have} | | Won't | {Feature} | {Explicitly deferred and why} | ### MVP Scope {What's the minimum to validate the hypothesis} ### User Flow {Critical path - shortest journey to value} --- ## Technical Approach **Feasibility**: {HIGH/MEDIUM/LOW} **Architecture Notes** - {Key technical decision and why} - {Dependency or integration point} **Technical Risks** | Risk | Likelihood | Mitigation | |------|------------|------------| | {Risk} | {H/M/L} | {How to handle} | --- ## Implementation Phases <!-- STATUS: pending | in-progress | complete PARALLEL: phases that can run concurrently (e.g., "with 3" or "-") DEPENDS: phases that must complete first (e.g., "1, 2" or "-") PRP: link to generated plan file once created --> | # | Phase | Description | Status | Parallel | Depends | PRP Plan | |---|-------|-------------|--------|----------|---------|----------| | 1 | {Phase name} | {What this phase delivers} | pending | - | - | - | | 2 | {Phase name} | {What this phase delivers} | pending | - | 1 | - | | 3 | {Phase name} | {What this phase delivers} | pending | with 4 | 2 | - | | 4 | {Phase name} | {What this phase delivers} | pending | with 3 | 2 | - | | 5 | {Phase name} | {What this phase delivers} | pending | - | 3, 4 | - | ### Phase Details **Phase 1: {Name}** - **Goal**: {What we're trying to achieve} - **Scope**: {Bounded deliverables} - **Success signal**: {How we know it's done} **Phase 2: {Name}** - **Goal**: {What we're trying to achieve} - **Scope**: {Bounded deliverables} - **Success signal**: {How we know it's done} {Continue for each phase...} ### Parallelism Notes {Explain which phases can run in parallel and why} --- ## Decisions Log | Decision | Choice | Alternatives | Rationale | |----------|--------|--------------|-----------| | {Decision} | {Choice} | {Options considered} | {Why this one} | --- ## Research Summary **Market Context** {Key findings from market research} **Technical Context** {Key findings from technical exploration} --- *Generated: {timestamp}* *Status: DRAFT - needs validation* ``` --- ## Phase 8: OUTPUT - Summary After generating, report: ```markdown ## PRD Created **File**: `.claude/PRPs/prds/{name}.prd.md` ### Summary **Problem**: {One line} **Solution**: {One line} **Key Metric**: {Primary success metric} ### Validation Status | Section | Status | |---------|--------| | Problem Statement | {Validated/Assumption} | | User Research | {Done/Needed} | | Technical Feasibility | {Assessed/TBD} | | Success Metrics | {Defined/Needs refinement} | ### Open Questions ({count}) {List the open questions that need answers} ### Recommended Next Step {One of: user research, technical spike, prototype, stakeholder review, etc.} ### Implementation Phases | # | Phase | Status | Can Parallel | |---|-------|--------|--------------| {Table of phases from PRD} ### To Start Implementation Run: `/prp-plan .claude/PRPs/prds/{name}.prd.md` This will automatically select the next pending phase and create an implementation plan. ``` --- ## Question Flow Summary ``` ┌─────────────────────────────────────────────────────────┐ │ INITIATE: "What do you want to build?" │ └─────────────────────────────────────────────────────────┘ ↓ ┌─────────────────────────────────────────────────────────┐ │ FOUNDATION: Who, What, Why, Why now, How to measure │ └─────────────────────────────────────────────────────────┘ ↓ ┌─────────────────────────────────────────────────────────┐ │ GROUNDING: Market research, competitor analysis │ └─────────────────────────────────────────────────────────┘ ↓ ┌─────────────────────────────────────────────────────────┐ │ DEEP DIVE: Vision, Primary user, JTBD, Constraints │ └─────────────────────────────────────────────────────────┘ ↓ ┌─────────────────────────────────────────────────────────┐ │ GROUNDING: Technical feasibility, codebase exploration │ └─────────────────────────────────────────────────────────┘ ↓ ┌─────────────────────────────────────────────────────────┐ │ DECISIONS: MVP, Must-haves, Hypothesis, Out of scope │ └─────────────────────────────────────────────────────────┘ ↓ ┌─────────────────────────────────────────────────────────┐ │ GENERATE: Write PRD to .claude/PRPs/prds/ │ └─────────────────────────────────────────────────────────┘ ``` --- ## Integration with ECC After PRD generation: - Use `/prp-plan` to create implementation plans from PRD phases - Use `/plan` for simpler planning without PRD structure - Use `/save-session` to preserve PRD context across sessions ## Success Criteria - **PROBLEM_VALIDATED**: Problem is specific and evidenced (or marked as assumption) - **USER_DEFINED**: Primary user is concrete, not generic - **HYPOTHESIS_CLEAR**: Testable hypothesis with measurable outcome - **SCOPE_BOUNDED**: Clear must-haves and explicit out-of-scope - **QUESTIONS_ACKNOWLEDGED**: Uncertainties are listed, not hidden - **ACTIONABLE**: A skeptic could understand why this is worth building
- **/prune** `[optional arguments]` — Delete pending instincts older than 30 days that were never promoted
  - How it runs: # Prune Pending Instincts Remove expired pending instincts that were auto-generated but never reviewed or promoted. ## Implementation Run the instinct CLI using the plugin root path: ```bash python3 "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/scripts/instinct-cli.py" prune ``` Or if `CLAUDE_PLUGIN_ROOT` is not set (manual installation): ```bash python3 ~/.claude/skills/continuous-learning-v2/scripts/instinct-cli.py prune ``` ## Usage ``` /prune # Delete instincts older than 30 days /prune --max-age 60 # Custom age threshold (days) /prune --dry-run # Preview without deleting ```
- **/python-review** `[optional arguments]` — Comprehensive Python code review for PEP 8 compliance, type hints, security, and Pythonic idioms. Invokes the python-reviewer agent.
  - How it runs: # Python Code Review This command invokes the **python-reviewer** agent for comprehensive Python-specific code review. ## What This Command Does 1. **Identify Python Changes**: Find modified `.py` files via `git diff` 2. **Run Static Analysis**: Execute `ruff`, `mypy`, `pylint`, `black --check` 3. **Security Scan**: Check for SQL injection, command injection, unsafe deserialization 4. **Type Safety Review**: Analyze type hints and mypy errors 5. **Pythonic Code Check**: Verify code follows PEP 8 and Python best practices 6. **Generate Report**: Categorize issues by severity ## When to Use Use `/python-review` when: - After writing or modifying Python code - Before committing Python changes - Reviewing pull requests with Python code - Onboarding to a new Python codebase - Learning Pythonic patterns and idioms ## Review Categories ### CRITICAL (Must Fix) - SQL/Command injection vulnerabilities - Unsafe eval/exec usage - Pickle unsafe deserialization - Hardcoded credentials - YAML unsafe load - Bare except clauses hiding errors ### HIGH (Should Fix) - Missing type hints on public functions - Mutable default arguments - Swallowing exceptions silently - Not using context managers for resources - C-style looping instead of comprehensions - Using type() instead of isinstance() - Race conditions without locks ### MEDIUM (Consider) - PEP 8 formatting violations - Missing docstrings on public functions - Print statements instead of logging - Inefficient string operations - Magic numbers without named constants - Not using f-strings for formatting - Unnecessary list creation ## Automated Checks Run ```bash # Type checking mypy . # Linting and formatting ruff check . black --check . isort --check-only . # Security scanning bandit -r . # Dependency audit pip-audit safety check # Testing pytest --cov=app --cov-report=term-missing ``` ## Example Usage ```text User: /python-review Agent: # Python Code Review Report ## Files Reviewed - app/routes/user.py (modified) - app/services/auth.py (modified) ## Static Analysis Results ✓ ruff: No issues ✓ mypy: No errors WARNING: black: 2 files need reformatting ✓ bandit: No security issues ## Issues Found [CRITICAL] SQL Injection vulnerability File: app/routes/user.py:42 Issue: User input directly interpolated into SQL query ```python query = f"SELECT * FROM users WHERE id = {user_id}" # Bad ``` Fix: Use parameterized query ```python query = "SELECT * FROM users WHERE id = %s" # Good cursor.execute(query, (user_id,)) ``` [HIGH] Mutable default argument File: app/services/auth.py:18 Issue: Mutable default argument causes shared state ```python def process_items(items=[]): # Bad items.append("new") return items ``` Fix: Use None as default ```python def process_items(items=None): # Good if items is None: items = [] items.append("new") return items ``` [MEDIUM] Missing type hints File: app/services/auth.py:25 Issue: Public function without type annotations ```python def get_user(user_id): # Bad return db.find(user_id) ``` Fix: Add type hints ```python def get_user(user_id: str) -> Optional[User]: # Good return db.find(user_id) ``` [MEDIUM] Not using context manager File: app/routes/user.py:55 Issue: File not closed on exception ```python f = open("config.json") # Bad data = f.read() f.close() ``` Fix: Use context manager ```python with open("config.json") as f: # Good data = f.read() ``` ## Summary - CRITICAL: 1 - HIGH: 1 - MEDIUM: 2 Recommendation: FAIL: Block merge until CRITICAL issue is fixed ## Formatting Required Run: `black app/routes/user.py app/services/auth.py` ``` ## Approval Criteria | Status | Condition | |--------|-----------| | PASS: Approve | No CRITICAL or HIGH issues | | WARNING: Warning | Only MEDIUM issues (merge with caution) | | FAIL: Block | CRITICAL or HIGH issues found | ## Integration with Other Commands - Use the `tdd-workflow` skill first to ensure tests pass - Use `/code-review` for non-Python specific concerns - Use `/python-review` before committing - Use `/build-fix` if static analysis tools fail ## Framework-Specific Reviews ### Django Projects The reviewer checks for: - N+1 query issues (use `select_related` and `prefetch_related`) - Missing migrations for model changes - Raw SQL usage when ORM could work - Missing `transaction.atomic()` for multi-step operations ### FastAPI Projects The reviewer checks for: - CORS misconfiguration - Pydantic models for request validation - Response models correctness - Proper async/await usage - Dependency injection patterns ### Flask Projects The reviewer checks for: - Context management (app context, request context) - Proper error handling - Blueprint organization - Configuration management ## Related - Agent: `agents/python-reviewer.md` - Skills: `skills/python-patterns/`, `skills/python-testing/` ## Common Fixes ### Add Type Hints ```python # Before def calculate(x, y): return x + y # After from typing import Union def calculate(x: Union[int, float], y: Union[int, float]) -> Union[int, float]: return x + y ``` ### Use Context Managers ```python # Before f = open("file.txt") data = f.read() f.close() # After with open("file.txt") as f: data = f.read() ``` ### Use List Comprehensions ```python # Before result = [] for item in items: if item.active: result.append(item.name) # After result = [item.name for item in items if item.active] ``` ### Fix Mutable Defaults ```python # Before def append(value, items=[]): items.append(value) return items # After def append(value, items=None): if items is None: items = [] items.append(value) return items ``` ### Use f-strings (Python 3.6+) ```python # Before name = "Alice" greeting = "Hello, " + name + "!" greeting2 = "Hello, {}".format(name) # After greeting = f"Hello, {name}!" ``` ### Fix String Concatenation in Loops ```python # Before result = "" for item in items: result += str(item) # After result = "".join(str(item) for item in items) ``` ## Python Version Compatibility The reviewer notes when code uses features from newer Python versions: | Feature | Minimum Python | |---------|----------------| | Type hints | 3.5+ | | f-strings | 3.6+ | | Walrus operator (`:=`) | 3.8+ | | Position-only parameters | 3.8+ | | Match statements | 3.10+ | | Type unions (&#96;x &#124; None&#96;) | 3.10+ | Ensure your project's `pyproject.toml` or `setup.py` specifies the correct minimum Python version.
- **/quality-gate** `[optional arguments]` — Run the ECC formatter quality gate for a single file and report remediation steps.
  - How it runs: # Quality Gate Command Operator entry point for the formatter quality gate that normally runs as the `post:quality-gate` PostToolUse hook (`scripts/hooks/quality-gate.js`). ## How it actually works The gate is a single-file formatter check driven by hook input, not CLI flags: - The script reads the target from the hook's stdin JSON (`tool_input.file_path`); it does not take a path argument. - Behavior toggles are environment variables: - `ECC_QUALITY_GATE_FIX=true` - apply formatting fixes instead of check-only - `ECC_QUALITY_GATE_STRICT=true` - log formatter failures as gate failures - Coverage by file type: - `.ts/.tsx/.js/.jsx/.json/.md` - Biome `check` or Prettier `--check`, whichever the project ships (JS/TS under Biome is skipped here because `post-edit-format` already runs `biome check --write`) - `.go` - `gofmt` - `.py` - `ruff format` - Lint and type checks are not part of this gate. Use the `verification-loop` skill or the language verification skills for lint/type/test pipelines. ## Usage To run the gate manually against one file, pipe hook-style JSON into the script (set the env toggles first if you want fix or strict behavior): ```bash echo '{"tool_input":{"file_path":"src/example.ts"}}' \ | ECC_QUALITY_GATE_FIX=true node scripts/hooks/quality-gate.js ``` Then report formatter findings and concrete remediation steps. ## Notes Hook wiring lives in `hooks/hooks.json` (`post:quality-gate`, profiles `standard`/`strict` via `run-with-flags.js`). ## Arguments $ARGUMENTS: - `[path]` optional file to check. The script itself takes no CLI arguments - when a path is given, substitute it as `tool_input.file_path` in the stdin JSON shown above before running the command
- **/react-build** `[optional arguments]` — Fix React build failures (Vite, webpack, Next.js, CRA, Parcel, esbuild, Bun) incrementally — JSX/TSX compile errors, hydration mismatches, server/client component boundary failures, missing types. Invokes the react-build-resolver agent for minimal, surgical fixes.
  - How it runs: # React Build and Fix This command invokes the **react-build-resolver** agent to incrementally fix React build errors with minimal changes. ## What This Command Does 1. **Detect Build System**: Identify Vite, webpack, Next.js, CRA, Parcel, esbuild, or Bun 2. **Run Build**: Execute the project's build script 3. **Parse Errors**: Group by layer (TypeScript / bundler config / runtime / hydration) 4. **Fix Incrementally**: One error at a time, re-running build after each change 5. **Report Summary**: Show what was fixed and what remains ## When to Use Use `/react-build` when: - `npm run build` (or pnpm/yarn/bun equivalent) fails - JSX/TSX compile errors after a TypeScript or React upgrade - Next.js hydration mismatch errors at runtime - Server/Client Component boundary errors in App Router - After installing or upgrading `react`, `react-dom`, `@types/react`, or a bundler - Missing types or "module not found" errors involving React ## Scope This command owns **React build/bundler/runtime hydration** failures. For pure TypeScript type errors with no React involvement, use `/build-fix` (generic) instead. ## Diagnostic Commands Run ```bash # Project build script (preferred) npm run build --if-present pnpm build 2>/dev/null yarn build 2>/dev/null bun run build 2>/dev/null # Standalone typecheck npm run typecheck --if-present tsc --noEmit -p tsconfig.json # Bundler-specific fallback next build # Next.js vite build # Vite react-scripts build # CRA webpack --mode=production # webpack parcel build src/index.html # Parcel bun build ./src/index.tsx --outdir=dist ``` ## Example Session ````text User: /react-build Agent: # React Build Resolution ## Build System Detected Vite (vite.config.ts present, @vitejs/plugin-react in deps) ## Initial Diagnostics ```bash $ npm run build > tsc -b && vite build src/components/UserCard.tsx:1:8 - error TS6133: 'React' is declared but its value is never read. src/components/Modal.tsx:12:15 - error TS7016: Could not find a declaration file for module 'react-portal'. src/pages/Home.tsx:42:5 - error: 'useState' is not defined ``` Errors found: 3 ## Fix 1: Old JSX transform leftover File: src/components/UserCard.tsx:1 Cause: `tsconfig.json` already uses `"jsx": "react-jsx"`; the explicit `import React` is unused. ```tsx // Removed - import React from 'react'; ``` ```bash $ npm run build # 2 errors remaining ``` ## Fix 2: Missing types File: src/components/Modal.tsx Cause: `@types/react-portal` not installed. ```bash $ npm i -D @types/react-portal added 1 package ``` ```bash $ npm run build # 1 error remaining ``` ## Fix 3: Missing hook import File: src/pages/Home.tsx Cause: `useState` referenced but not imported. ```tsx - import { useEffect } from "react"; + import { useEffect, useState } from "react"; ``` ```bash $ npm run build # Build successful! ``` ## Final Verification ```bash $ npm run build ✓ built in 2.34s $ npm test ✓ 47 tests passed ``` ## Summary | Metric | Count | |--------|-------| | Build errors fixed | 3 | | Files modified | 2 | | Dependencies added | 1 (@types/react-portal) | | Remaining issues | 0 | Build Status: PASS: SUCCESS ```` ## Common Errors Fixed | Error | Typical Fix | |---|---| | `'React' is not defined` | Set `"jsx": "react-jsx"` in tsconfig (React 17+) | | Missing `@types/react` | `npm i -D @types/react @types/react-dom` | | `Unexpected token '<'` | Add `@vitejs/plugin-react` / `babel-loader` | | `You're importing a component that needs useState` (Next.js) | Add `"use client"` or move hook to a Client Component child | | `Module not found: Can't resolve 'fs'` (Next.js) | Remove `fs` import or move logic into Server Component / API route | | `Hydration failed because the initial UI does not match` | Move `Date.now()`/`Math.random()`/`window.*` to `useEffect` | | `Invalid hook call` | Multiple React copies — dedupe via `resolutions`/`overrides` | | `Element type is invalid` | Default vs named import mismatch | ## Fix Strategy 1. **Compile errors first** — code must build 2. **Hydration errors second** — affects production correctness 3. **Bundler config third** — restore plugin/loader correctness 4. **One fix at a time** — verify each change 5. **Minimal changes** — never `// @ts-ignore` without explanation 6. **Re-run after each fix** — surface new errors immediately ## Stop Conditions The agent will stop and report if: - Same error persists after 3 attempts - Fix introduces more errors than it resolves - Requires architectural change beyond build resolution (e.g., redesigning the RSC boundary) - Bundler version no longer supports the installed React major ## Related Commands - `/react-test` — run tests after the build is green - `/react-review` — review code quality after the build succeeds - `/build-fix` — generic build fixer (non-React) - `verification-loop` skill — full verification loop ## Related - Agent: `agents/react-build-resolver.md` - Skills: `skills/react-patterns/`, `skills/frontend-patterns/` - Rules: `rules/react/coding-style.md`, `rules/react/patterns.md`
- **/react-review** `[optional arguments]` — Comprehensive React/JSX code review for hook correctness, render performance, server/client component boundaries, accessibility, and React-specific security. Invokes the react-reviewer agent (and typescript-reviewer alongside on TSX/JSX changes).
  - How it runs: # React Code Review This command invokes the **react-reviewer** agent for React-specific code review. For pull requests touching `.tsx`/`.jsx` files, both `react-reviewer` and `typescript-reviewer` should run — each owns a distinct lane. ## What This Command Does 1. **Identify React Changes**: Find modified `.tsx`/`.jsx` files (and React-containing `.ts`/`.js` files) via `git diff` 2. **Run Lint**: Execute `eslint` with `eslint-plugin-react-hooks` and `eslint-plugin-jsx-a11y` 3. **Typecheck**: Run `tsc --noEmit` or the project's canonical typecheck command 4. **Review React Lanes Only**: Hook rules, RSC boundaries, accessibility, render performance, React-specific security 5. **Generate Report**: Categorize issues by severity (CRITICAL / HIGH / MEDIUM) ## When to Use Use `/react-review` when: - A PR or commit touches `.tsx`/`.jsx` files - After writing or modifying React components, custom hooks, or pages - Before merging React code - Auditing accessibility on UI components - Reviewing a new hook for rules-of-hooks and dependency correctness - Auditing a Next.js App Router server/client component boundary For pure `.ts`/`.js` changes with no React imports, use `/code-review` (general) or invoke `typescript-reviewer` directly. ## Scope vs `/code-review` and TypeScript Review | Tool | Scope | |---|---| | `react-reviewer` (this command) | Hooks rules, JSX, RSC, a11y, React-specific security, render perf | | `typescript-reviewer` | Generic TS/JS — `any` abuse, async correctness, Node security | | `security-reviewer` | Project-wide security audit | | `/code-review` | Generic uncommitted-changes or PR review | On a TSX/JSX PR, invoke both `react-reviewer` and `typescript-reviewer`. Findings from each are non-overlapping by design. ## Review Categories ### CRITICAL (Must Fix) - `dangerouslySetInnerHTML` with unsanitized input - `href`/`src` with unvalidated user URLs (`javascript:`, `data:`) - Server Action without input validation - Secret in client bundle (`NEXT_PUBLIC_*`, `VITE_*`, `REACT_APP_*`) - `localStorage`/`sessionStorage` for session tokens - Conditional hook calls (violates Rules of Hooks) - Direct state mutation - Hook called outside a component or custom hook ### HIGH (Should Fix) - Missing `useEffect`/`useMemo`/`useCallback` deps (disabled `exhaustive-deps` without justification) - Effect for derived state - Effect missing cleanup - Stale closures in handlers/intervals - Server-only imports in Client Components - Sensitive data leaked via props to Client Components - Server Actions without auth checks - Accessibility violations (missing labels, non-semantic interactive elements, ARIA misuse) - `key={index}` in dynamic lists - Duplicated state, useEffect chains ### MEDIUM (Consider) - Over-memoization without measured win - Inline new object/function as prop to memoized child - Suspense at route root only (no progressive reveal) - Long lists without virtualization - High-frequency value via `useContext` - Roll-your-own validation in non-trivial forms - Prop drilling beyond 3 levels - Component over 200 lines - Class components in new code ## Automated Checks Run ```bash # Lint (required for any meaningful review) npx eslint . --ext .tsx,.jsx,.ts,.js # Typecheck (skip cleanly for JS-only projects) npm run typecheck --if-present [ -f tsconfig.json ] && tsc --noEmit -p tsconfig.json # Targeted a11y rules npx eslint . --rule 'jsx-a11y/alt-text: error' \ --rule 'jsx-a11y/anchor-is-valid: error' \ --rule 'jsx-a11y/click-events-have-key-events: error' # Supply-chain npm audit ``` If `eslint-plugin-react-hooks` or `eslint-plugin-jsx-a11y` is not configured, the review will flag the gap as a HIGH config issue and continue. ## Example Usage ````text User: /react-review Agent: # React Code Review Report ## Files Reviewed - src/components/UserCard.tsx (modified) - src/hooks/useUser.ts (new) ## Lint Results PASS: eslint clean PASS: typecheck clean ## Issues Found [CRITICAL] Unsanitized dangerouslySetInnerHTML File: src/components/UserCard.tsx:42 Issue: User-controlled bio rendered as raw HTML. Why: XSS via stored script tags in user input. Fix: Sanitize with DOMPurify or render as text: ```tsx import DOMPurify from "isomorphic-dompurify"; <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(user.bio) }} /> ``` [HIGH] Effect cleanup missing File: src/hooks/useUser.ts:18 Issue: `fetch` call without AbortController; setState on unmounted component possible. Fix: Add AbortController and cleanup: ```ts useEffect(() => { const ac = new AbortController(); fetch(`/api/users/${id}`, { signal: ac.signal }) .then(r => r.json()) .then(setUser); return () => ac.abort(); }, [id]); ``` ## Summary - CRITICAL: 1 - HIGH: 1 - MEDIUM: 0 Recommendation: FAIL: Block merge until CRITICAL issue is fixed ```` ## Approval Criteria | Status | Condition | |---|---| | PASS: Approve | No CRITICAL or HIGH issues | | WARNING: Warning | Only MEDIUM issues (merge with caution) | | FAIL: Block | CRITICAL or HIGH issues found | ## Integration with Other Commands - Run `/react-build` first if the build is broken - Run `/react-test` to ensure component tests pass - Run `/react-review` before merging - Use `/code-review` for non-React-specific concerns on the same PR ## Related - Agent: `agents/react-reviewer.md` - Companion agent: `agents/typescript-reviewer.md` (run alongside for TSX/JSX PRs) - Skills: `skills/react-patterns/`, `skills/react-testing/`, `skills/accessibility/` - Rules: `rules/react/`
- **/react-test** `[optional arguments]` — Enforce TDD workflow for React. Write React Testing Library tests first (behavior-focused, accessibility-first), then implement components. Detects Vitest or Jest and verifies coverage targets.
  - How it runs: # React TDD Command This command enforces test-driven development for React using React Testing Library plus Vitest or Jest, detected at runtime. ## What This Command Does 1. **Define Component Signature**: Scaffold the component, prop type, and exports 2. **Write Behavior Tests First**: RTL queries (role-first), `userEvent`, MSW for network — RED 3. **Run Tests**: Verify they fail for the right reason 4. **Implement Minimal Code**: Just enough to pass — GREEN 5. **Refactor**: Improve while keeping tests green 6. **Check Coverage**: Hit the targets in [rules/react/testing.md](../rules/react/testing.md) ## When to Use Use `/react-test` when: - Implementing a new React component or custom hook - Adding test coverage to an untested component - Fixing a bug (write failing test first that reproduces it) - Building forms, state machines, or accessibility-critical UI - Onboarding to RTL + Vitest/Jest workflow ## TDD Cycle ``` RED -> Write failing test for the next behavior GREEN -> Implement minimal component code to pass REFACTOR -> Improve component, tests stay green REPEAT -> Next behavior ``` ## Runner Detection ```bash test -f vitest.config.ts -o -f vitest.config.js -o -f vite.config.ts # Vitest grep -l '"jest"' package.json # Jest ``` Prefer Vitest for new Vite-based projects; respect Jest for existing setups. ## Example Session ````text User: /react-test I need a SearchInput component with debounced search Agent: # TDD Session: SearchInput ## Step 1: Define Signature ```tsx // src/components/SearchInput.tsx type Props = { onSearch: (query: string) => void; placeholder?: string; debounceMs?: number; }; export function SearchInput({ onSearch, placeholder, debounceMs }: Props) { throw new Error("not implemented"); } ``` ## Step 2: Write Behavior Tests (RED) ```tsx // src/components/SearchInput.test.tsx import { describe, expect, test, vi } from "vitest"; import { render, screen } from "@testing-library/react"; import userEvent from "@testing-library/user-event"; import { SearchInput } from "./SearchInput"; describe("SearchInput", () => { test("renders with placeholder", () => { render(<SearchInput onSearch={() => {}} placeholder="Search users" />); expect(screen.getByPlaceholderText("Search users")).toBeInTheDocument(); }); test("calls onSearch after typing", async () => { vi.useFakeTimers(); const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime }); const onSearch = vi.fn(); render(<SearchInput onSearch={onSearch} debounceMs={300} />); await user.type(screen.getByRole("textbox"), "alice"); expect(onSearch).not.toHaveBeenCalled(); // before debounce vi.advanceTimersByTime(300); expect(onSearch).toHaveBeenCalledWith("alice"); // after debounce vi.useRealTimers(); }); test("does not call onSearch when typing pauses then continues", async () => { vi.useFakeTimers(); const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime }); const onSearch = vi.fn(); render(<SearchInput onSearch={onSearch} debounceMs={300} />); await user.type(screen.getByRole("textbox"), "ali"); vi.advanceTimersByTime(200); // mid-debounce await user.type(screen.getByRole("textbox"), "ce"); vi.advanceTimersByTime(300); expect(onSearch).toHaveBeenCalledTimes(1); expect(onSearch).toHaveBeenCalledWith("alice"); vi.useRealTimers(); }); test("is keyboard reachable and accessible", () => { render(<SearchInput onSearch={() => {}} />); const input = screen.getByRole("textbox"); input.focus(); expect(input).toHaveFocus(); }); }); ``` ## Step 3: Run Tests — Verify FAIL ```bash $ vitest run src/components/SearchInput.test.tsx × src/components/SearchInput.test.tsx (4 tests) ✘ Error: not implemented ``` ✓ Tests fail as expected. ## Step 4: Implement Minimal Code (GREEN) ```tsx import { useEffect, useState } from "react"; export function SearchInput({ onSearch, placeholder, debounceMs = 300 }: Props) { const [query, setQuery] = useState(""); useEffect(() => { const id = setTimeout(() => onSearch(query), debounceMs); return () => clearTimeout(id); }, [query, onSearch, debounceMs]); return ( <input type="text" value={query} placeholder={placeholder} onChange={(e) => setQuery(e.target.value)} /> ); } ``` ## Step 5: Run Tests — Verify PASS ```bash $ vitest run src/components/SearchInput.test.tsx ✓ src/components/SearchInput.test.tsx (4 tests) 47ms ``` ## Step 6: Coverage ```bash $ vitest run --coverage src/components/SearchInput.test.tsx % Stmts: 100 % Branch: 100 % Funcs: 100 % Lines: 100 ``` ## TDD Complete! ```` ## Test Patterns ### Behavior, not implementation Use `getByRole`, `getByLabelText`, `getByText`. Avoid `container.querySelector` and asserting on component state. ### `userEvent.setup()` per test ```tsx const user = userEvent.setup(); await user.click(screen.getByRole("button", { name: /save/i })); ``` ### MSW for network ```tsx beforeAll(() => server.listen({ onUnhandledRequest: "error" })); afterEach(() => server.resetHandlers()); afterAll(() => server.close()); server.use(http.post("/api/users", () => HttpResponse.json({ id: "1" }, { status: 201 }))); ``` ### Custom hooks ```tsx const { result } = renderHook(() => useCounter(0)); act(() => result.current.increment()); expect(result.current.count).toBe(1); ``` ### Accessibility ```tsx import { axe } from "vitest-axe"; expect(await axe(container)).toHaveNoViolations(); ``` ## Coverage Targets | Layer | Target | |---|---| | Pure utilities | >=90% | | Custom hooks | >=85% | | Presentational components | >=80% | | Container components | >=70% | | Pages | E2E covered separately | Configure in `vitest.config.ts` / `jest.config.js` to enforce thresholds in CI. ## Anti-Patterns to Avoid - `container.querySelector(...)` — bypasses accessibility queries - Asserting on render count - Mocking `react` itself (`jest.mock("react", ...)`) - Mocking child components by default (mock only when child has heavy side effects) - Ignoring `act()` warnings — they signal real bugs - Snapshot tests of rendered components (brittle, rubber-stamped) — use Playwright/Cypress visual diff instead ## Test Commands ```bash # Vitest vitest # watch vitest run # one-shot vitest run --coverage # with coverage vitest run path/to/file.test.tsx # single file # Jest jest --watch jest --coverage jest path/to/file.test.tsx # CI mode CI=true vitest run --coverage ``` ## Related Commands - `/react-build` — fix build errors before running tests - `/react-review` — review after implementation - `verification-loop` skill — full verification loop ## Related - Skills: `skills/react-testing/`, `skills/tdd-workflow/`, `skills/accessibility/`, `skills/e2e-testing/` - Rules: `rules/react/testing.md` - Agents: `react-reviewer` (reviews test quality), `tdd-guide` (enforces TDD process)
- **/refactor-clean** `[optional arguments]` — Safely identify and remove dead code with verification after each change.
  - How it runs: # Refactor Clean Safely identify and remove dead code with test verification at every step. ## Step 1: Detect Dead Code Run analysis tools based on project type: | Tool | What It Finds | Command | |------|--------------|---------| | knip | Unused exports, files, dependencies | `npx knip` | | depcheck | Unused npm dependencies | `npx depcheck` | | ts-prune | Unused TypeScript exports | `npx ts-prune` | | vulture | Unused Python code | `vulture src/` | | deadcode | Unused Go code | `deadcode ./...` | | cargo-udeps | Unused Rust dependencies | `cargo +nightly udeps` | If no tool is available, use Grep to find exports with zero imports: ``` # Find exports, then check if they're imported anywhere ``` ## Step 2: Categorize Findings Sort findings into safety tiers: | Tier | Examples | Action | |------|----------|--------| | **SAFE** | Unused utilities, test helpers, internal functions | Delete with confidence | | **CAUTION** | Components, API routes, middleware | Verify no dynamic imports or external consumers | | **DANGER** | Config files, entry points, type definitions | Investigate before touching | ## Step 3: Safe Deletion Loop For each SAFE item: 1. **Run full test suite** — Establish baseline (all green) 2. **Delete the dead code** — Use Edit tool for surgical removal 3. **Re-run test suite** — Verify nothing broke 4. **If tests fail** — Immediately revert with `git checkout -- <file>` and skip this item 5. **If tests pass** — Move to next item ## Step 4: Handle CAUTION Items Before deleting CAUTION items: - Search for dynamic imports: `import()`, `require()`, `__import__` - Search for string references: route names, component names in configs - Check if exported from a public package API - Verify no external consumers (check dependents if published) ## Step 5: Consolidate Duplicates After removing dead code, look for: - Near-duplicate functions (>80% similar) — merge into one - Redundant type definitions — consolidate - Wrapper functions that add no value — inline them - Re-exports that serve no purpose — remove indirection ## Step 6: Summary Report results: ``` Dead Code Cleanup ────────────────────────────── Deleted: 12 unused functions 3 unused files 5 unused dependencies Skipped: 2 items (tests failed) Saved: ~450 lines removed ────────────────────────────── All tests passing PASS: ``` ## Rules - **Never delete without running tests first** - **One deletion at a time** — Atomic changes make rollback easy - **Skip if uncertain** — Better to keep dead code than break production - **Don't refactor while cleaning** — Separate concerns (clean first, refactor later)
- **/resume-session** `[optional arguments]` — Load the most recent session file from ~/.claude/session-data/ and resume work with full context from where the last session ended.
  - How it runs: # Resume Session Command Load the last saved session state and orient fully before doing any work. This command is the counterpart to `/save-session`. ## When to Use - Starting a new session to continue work from a previous day - After starting a fresh session due to context limits - When handing off a session file from another source (just provide the file path) - Any time you have a session file and want Claude to fully absorb it before proceeding ## Usage ``` /resume-session # loads most recent file in ~/.claude/session-data/ /resume-session 2024-01-15 # loads most recent session for that date /resume-session ~/.claude/session-data/2024-01-15-abc123de-session.tmp # loads a current short-id session file /resume-session ~/.claude/sessions/2024-01-15-session.tmp # loads a specific legacy-format file ``` ## Process ### Step 1: Find the session file If no argument provided: 1. Check `~/.claude/session-data/` 2. Pick the most recently modified `*-session.tmp` file 3. If the folder does not exist or has no matching files, tell the user: ``` No session files found in ~/.claude/session-data/ Run /save-session at the end of a session to create one. ``` Then stop. If an argument is provided: - If it looks like a date (`YYYY-MM-DD`), search `~/.claude/session-data/` first, then the legacy `~/.claude/sessions/`, for files matching `YYYY-MM-DD-session.tmp` (legacy format) or `YYYY-MM-DD-<shortid>-session.tmp` (current format) and load the most recently modified variant for that date - If it looks like a file path, read that file directly - If not found, report clearly and stop ### Step 2: Read the entire session file Read the complete file. Do not summarize yet. ### Step 3: Confirm understanding Respond with a structured briefing in this exact format: ``` SESSION LOADED: [actual resolved path to the file] ════════════════════════════════════════════════ PROJECT: [project name / topic from file] WHAT WE'RE BUILDING: [2-3 sentence summary in your own words] CURRENT STATE: PASS: Working: [count] items confirmed In Progress: [list files that are in progress] Not Started: [list planned but untouched] WHAT NOT TO RETRY: [list every failed approach with its reason — this is critical] OPEN QUESTIONS / BLOCKERS: [list any blockers or unanswered questions] NEXT STEP: [exact next step if defined in the file] [if not defined: "No next step defined — recommend reviewing 'What Has NOT Been Tried Yet' together before starting"] ════════════════════════════════════════════════ Ready to continue. What would you like to do? ``` ### Step 4: Wait for the user Do NOT start working automatically. Do NOT touch any files. Wait for the user to say what to do next. If the next step is clearly defined in the session file and the user says "continue" or "yes" or similar — proceed with that exact next step. If no next step is defined — ask the user where to start, and optionally suggest an approach from the "What Has NOT Been Tried Yet" section. --- ## Edge Cases **Multiple sessions for the same date** (`2024-01-15-session.tmp`, `2024-01-15-abc123de-session.tmp`): Load the most recently modified matching file for that date, regardless of whether it uses the legacy no-id format or the current short-id format. **Session file references files that no longer exist:** Note this during the briefing — "WARNING: `path/to/file.ts` referenced in session but not found on disk." **Session file is from more than 7 days ago:** Note the gap — "WARNING: This session is from N days ago (threshold: 7 days). Things may have changed." — then proceed normally. **User provides a file path directly (e.g., forwarded from a teammate):** Read it and follow the same briefing process — the format is the same regardless of source. **Session file is empty or malformed:** Report: "Session file found but appears empty or unreadable. You may need to create a new one with /save-session." --- ## Example Output ``` SESSION LOADED: /Users/you/.claude/session-data/2024-01-15-abc123de-session.tmp ════════════════════════════════════════════════ PROJECT: my-app — JWT Authentication WHAT WE'RE BUILDING: User authentication with JWT tokens stored in httpOnly cookies. Register and login endpoints are partially done. Route protection via middleware hasn't been started yet. CURRENT STATE: PASS: Working: 3 items (register endpoint, JWT generation, password hashing) In Progress: app/api/auth/login/route.ts (token works, cookie not set yet) Not Started: middleware.ts, app/login/page.tsx WHAT NOT TO RETRY: FAIL: Next-Auth — conflicts with custom Prisma adapter, threw adapter error on every request FAIL: localStorage for JWT — causes SSR hydration mismatch, incompatible with Next.js OPEN QUESTIONS / BLOCKERS: - Does cookies().set() work inside a Route Handler or only Server Actions? NEXT STEP: In app/api/auth/login/route.ts — set the JWT as an httpOnly cookie using cookies().set('token', jwt, { httpOnly: true, secure: true, sameSite: 'strict' }) then test with Postman for a Set-Cookie header in the response. ════════════════════════════════════════════════ Ready to continue. What would you like to do? ``` --- ## Notes - Never modify the session file when loading it — it's a read-only historical record - The briefing format is fixed — do not skip sections even if they are empty - "What Not To Retry" must always be shown, even if it just says "None" — it's too important to miss - After resuming, the user may want to run `/save-session` again at the end of the new session to create a new dated file
- **/review-pr** `[optional arguments]` — Comprehensive PR review using specialized agents
  - How it runs: Run a comprehensive multi-perspective review of a pull request. ## Usage `/review-pr [PR-number-or-URL] [--focus=comments|tests|errors|types|code|simplify]` If no PR is specified, review the current branch's PR. If no focus is specified, run the full review stack. ## Steps 1. Identify the PR: - use `gh pr view` to get PR details, changed files, and diff 2. Find project guidance: - look for `CLAUDE.md`, lint config, TypeScript config, repo conventions 3. Run specialized review agents: - `code-reviewer` - `comment-analyzer` - `pr-test-analyzer` - `silent-failure-hunter` - `type-design-analyzer` - `code-simplifier` 4. Aggregate results: - dedupe overlapping findings - rank by severity 5. Report findings grouped by severity ## Confidence Rule Only report issues with confidence >= 80: - Critical: bugs, security, data loss - Important: missing tests, quality problems, style violations - Advisory: suggestions only when explicitly requested
- **/rust-build** `[optional arguments]` — Fix Rust build errors, borrow checker issues, and dependency problems incrementally. Invokes the rust-build-resolver agent for minimal, surgical fixes.
  - How it runs: # Rust Build and Fix This command invokes the **rust-build-resolver** agent to incrementally fix Rust build errors with minimal changes. ## What This Command Does 1. **Run Diagnostics**: Execute `cargo check`, `cargo clippy`, `cargo fmt --check` 2. **Parse Errors**: Identify error codes and affected files 3. **Fix Incrementally**: One error at a time 4. **Verify Each Fix**: Re-run `cargo check` after each change 5. **Report Summary**: Show what was fixed and what remains ## When to Use Use `/rust-build` when: - `cargo build` or `cargo check` fails with errors - `cargo clippy` reports warnings - Borrow checker or lifetime errors block compilation - Cargo dependency resolution fails - After pulling changes that break the build ## Diagnostic Commands Run ```bash # Primary build check cargo check 2>&1 # Lints and suggestions cargo clippy -- -D warnings 2>&1 # Formatting check cargo fmt --check 2>&1 # Dependency issues cargo tree --duplicates # Security audit (if available) if command -v cargo-audit >/dev/null; then cargo audit; else echo "cargo-audit not installed"; fi ``` ## Example Session ````text User: /rust-build Agent: # Rust Build Resolution ## Initial Diagnostics ```bash $ cargo check error[E0502]: cannot borrow `map` as mutable because it is also borrowed as immutable --> src/service/cache.rs:25:5 error[E0308]: mismatched types --> src/handler/api.rs:42:12 error[E0425]: cannot find value `db` in this scope --> src/handler/api.rs:58:9 ``` Errors found: 3 ## Fix 1: Borrow Checker Error File: src/service/cache.rs:25 Error: E0502 — cannot borrow `map` as mutable because also borrowed as immutable Cause: Immutable borrow still active during mutable insert ```rust // Changed: restructured to end immutable borrow before mutable access if !map.contains_key("key") { map.insert("key".into(), default); } ``` ```bash $ cargo check # 2 errors remaining ``` ## Fix 2: Type Mismatch File: src/handler/api.rs:42 Error: E0308 — mismatched types: expected `usize`, found `&str` ```rust // Changed let count = params.get("count"); // To let count: usize = params.get("count") .and_then(|s| s.parse().ok()) .unwrap_or(0); ``` ```bash $ cargo check # 1 error remaining ``` ## Fix 3: Unresolved Name File: src/handler/api.rs:58 Error: E0425 — cannot find value `db` in this scope Cause: Missing import ```rust // Added use crate::db; ``` ```bash $ cargo check # Build successful! ``` ## Final Verification ```bash $ cargo clippy -- -D warnings # No warnings $ cargo test running 6 tests test service::cache::tests::test_insert ... ok test service::cache::tests::test_get ... ok test handler::api::tests::test_parse_count ... ok test handler::api::tests::test_missing_count ... ok test handler::api::tests::test_db_import ... ok test handler::api::tests::test_response ... ok test result: ok. 6 passed; 0 failed; 0 ignored ``` ## Summary | Metric | Count | |--------|-------| | Build errors fixed | 3 | | Clippy warnings fixed | 0 | | Files modified | 2 | | Remaining issues | 0 | Build Status: SUCCESS ```` ## Common Errors Fixed | Error | Typical Fix | |-------|-------------| | `cannot borrow as mutable` | Restructure to end immutable borrow first; clone only if justified | | `does not live long enough` | Use owned type or add lifetime annotation | | `cannot move out of` | Restructure to take ownership; clone only as last resort | | `mismatched types` | Add `.into()`, `as`, or explicit conversion | | `trait X not implemented` | Add `#[derive(Trait)]` or implement manually | | `unresolved import` | Add to Cargo.toml or fix `use` path | | `cannot find value` | Add import or fix path | ## Fix Strategy 1. **Build errors first** - Code must compile 2. **Clippy warnings second** - Fix suspicious constructs 3. **Formatting third** - `cargo fmt` compliance 4. **One fix at a time** - Verify each change 5. **Minimal changes** - Don't refactor, just fix ## Stop Conditions The agent will stop and report if: - Same error persists after 3 attempts - Fix introduces more errors - Requires architectural changes - Borrow checker error requires redesigning data ownership ## Related Commands - `/rust-test` - Run tests after build succeeds - `/rust-review` - Review code quality - `verification-loop` skill - Full verification loop ## Related - Agent: `agents/rust-build-resolver.md` - Skill: `skills/rust-patterns/`
- **/rust-review** `[optional arguments]` — Comprehensive Rust code review for ownership, lifetimes, error handling, unsafe usage, and idiomatic patterns. Invokes the rust-reviewer agent.
  - How it runs: # Rust Code Review This command invokes the **rust-reviewer** agent for comprehensive Rust-specific code review. ## What This Command Does 1. **Verify Automated Checks**: Run `cargo check`, `cargo clippy -- -D warnings`, `cargo fmt --check`, and `cargo test` — stop if any fail 2. **Identify Rust Changes**: Find modified `.rs` files via `git diff HEAD~1` (or `git diff main...HEAD` for PRs) 3. **Run Security Audit**: Execute `cargo audit` if available 4. **Security Scan**: Check for unsafe usage, command injection, hardcoded secrets 5. **Ownership Review**: Analyze unnecessary clones, lifetime issues, borrowing patterns 6. **Generate Report**: Categorize issues by severity ## When to Use Use `/rust-review` when: - After writing or modifying Rust code - Before committing Rust changes - Reviewing pull requests with Rust code - Onboarding to a new Rust codebase - Learning idiomatic Rust patterns ## Review Categories ### CRITICAL (Must Fix) - Unchecked `unwrap()`/`expect()` in production code paths - `unsafe` without `// SAFETY:` comment documenting invariants - SQL injection via string interpolation in queries - Command injection via unvalidated input in `std::process::Command` - Hardcoded credentials - Use-after-free via raw pointers ### HIGH (Should Fix) - Unnecessary `.clone()` to satisfy borrow checker - `String` parameter where `&str` or `impl AsRef<str>` suffices - Blocking in async context (`std::thread::sleep`, `std::fs`) - Missing `Send`/`Sync` bounds on shared types - Wildcard `_ =>` match on business-critical enums - Large functions (>50 lines) ### MEDIUM (Consider) - Unnecessary allocation in hot paths - Missing `with_capacity` when size is known - Suppressed clippy warnings without justification - Public API without `///` documentation - Consider `#[must_use]` on non-`must_use` return types where ignoring values is likely a bug ## Automated Checks Run ```bash # Build gate (must pass before review) cargo check # Lints and suggestions cargo clippy -- -D warnings # Formatting cargo fmt --check # Tests cargo test # Security audit (if available) if command -v cargo-audit >/dev/null; then cargo audit; else echo "cargo-audit not installed"; fi ``` ## Example Usage ````text User: /rust-review Agent: # Rust Code Review Report ## Files Reviewed - src/service/user.rs (modified) - src/handler/api.rs (modified) ## Static Analysis Results - Build: Successful - Clippy: No warnings - Formatting: Passed - Tests: All passing ## Issues Found [CRITICAL] Unchecked unwrap in Production Path File: src/service/user.rs:28 Issue: Using `.unwrap()` on database query result ```rust let user = db.find_by_id(id).unwrap(); // Panics on missing user ``` Fix: Propagate error with context ```rust let user = db.find_by_id(id) .context("failed to fetch user")?; ``` [HIGH] Unnecessary Clone File: src/handler/api.rs:45 Issue: Cloning String to satisfy borrow checker ```rust let name = user.name.clone(); process(&user, &name); ``` Fix: Restructure to avoid clone ```rust let result = process_name(&user.name); use_user(&user, result); ``` ## Summary - CRITICAL: 1 - HIGH: 1 - MEDIUM: 0 Recommendation: Block merge until CRITICAL issue is fixed ```` ## Approval Criteria | Status | Condition | |--------|-----------| | Approve | No CRITICAL or HIGH issues | | Warning | Only MEDIUM issues (merge with caution) | | Block | CRITICAL or HIGH issues found | ## Integration with Other Commands - Use `/rust-test` first to ensure tests pass - Use `/rust-build` if build errors occur - Use `/rust-review` before committing - Use `/code-review` for non-Rust-specific concerns ## Related - Agent: `agents/rust-reviewer.md` - Skills: `skills/rust-patterns/`, `skills/rust-testing/`
- **/rust-test** `[optional arguments]` — Enforce TDD workflow for Rust. Write tests first, then implement. Verify 80%+ coverage with cargo-llvm-cov.
  - How it runs: # Rust TDD Command This command enforces test-driven development methodology for Rust code using `#[test]`, rstest, proptest, and mockall. ## What This Command Does 1. **Define Types/Traits**: Scaffold function signatures with `todo!()` 2. **Write Tests**: Create comprehensive test module (RED) 3. **Run Tests**: Verify tests fail for the right reason 4. **Implement Code**: Write minimal code to pass (GREEN) 5. **Refactor**: Improve while keeping tests green 6. **Check Coverage**: Ensure 80%+ coverage with cargo-llvm-cov ## When to Use Use `/rust-test` when: - Implementing new Rust functions, methods, or traits - Adding test coverage to existing Rust code - Fixing bugs (write failing test first) - Building critical business logic - Learning TDD workflow in Rust ## TDD Cycle ``` RED -> Write failing test first GREEN -> Implement minimal code to pass REFACTOR -> Improve code, tests stay green REPEAT -> Next test case ``` ## Example Session ````text User: /rust-test I need a function to validate user registration Agent: # TDD Session: Registration Validator ## Step 1: Define Interface ```rust // src/validator.rs pub struct RegistrationRequest { pub name: String, pub email: String, pub password: String, } pub enum ValidationResult { Valid, Invalid(Vec<String>), } pub fn validate_registration(request: &RegistrationRequest) -> ValidationResult { todo!() } ``` ## Step 2: Write Tests (RED) ```rust #[cfg(test)] mod tests { use super::*; #[test] fn valid_registration_returns_valid() { let request = RegistrationRequest { name: "Alice".into(), email: "alice@example.com".into(), password: "SecureP@ss1".into(), }; assert!(matches!(validate_registration(&request), ValidationResult::Valid)); } #[test] fn blank_name_returns_invalid() { let request = RegistrationRequest { name: "".into(), email: "alice@example.com".into(), password: "SecureP@ss1".into(), }; match validate_registration(&request) { ValidationResult::Invalid(errors) => { assert!(errors.contains(&"Name is required".to_string())); } ValidationResult::Valid => panic!("expected Invalid"), } } #[test] fn invalid_email_returns_invalid() { let request = RegistrationRequest { name: "Alice".into(), email: "not-an-email".into(), password: "SecureP@ss1".into(), }; assert!(matches!( validate_registration(&request), ValidationResult::Invalid(_) )); } #[test] fn short_password_returns_invalid() { let request = RegistrationRequest { name: "Alice".into(), email: "alice@example.com".into(), password: "short".into(), }; assert!(matches!( validate_registration(&request), ValidationResult::Invalid(_) )); } } ``` ## Step 3: Run Tests — Verify FAIL ```bash $ cargo test running 4 tests test tests::valid_registration_returns_valid ... FAILED (not yet implemented) test tests::blank_name_returns_invalid ... FAILED test tests::invalid_email_returns_invalid ... FAILED test tests::short_password_returns_invalid ... FAILED ``` Tests fail as expected (todo! panic). ## Step 4: Implement Minimal Code (GREEN) ```rust pub fn validate_registration(request: &RegistrationRequest) -> ValidationResult { let mut errors = Vec::new(); if request.name.trim().is_empty() { errors.push("Name is required".into()); } if !request.email.contains('@') { errors.push("Invalid email format".into()); } if request.password.len() < 8 { errors.push("Password must be at least 8 characters".into()); } if errors.is_empty() { ValidationResult::Valid } else { ValidationResult::Invalid(errors) } } ``` ## Step 5: Run Tests — Verify PASS ```bash $ cargo test running 4 tests test tests::valid_registration_returns_valid ... ok test tests::blank_name_returns_invalid ... ok test tests::invalid_email_returns_invalid ... ok test tests::short_password_returns_invalid ... ok test result: ok. 4 passed; 0 failed ``` All tests passing! ## Step 6: Check Coverage ```bash $ cargo llvm-cov Coverage: 100.0% of lines ``` Coverage: 100% ## TDD Complete! ```` ## Test Patterns ### Unit Tests ```rust #[cfg(test)] mod tests { use super::*; #[test] fn adds_two_numbers() { assert_eq!(add(2, 3), 5); } #[test] fn handles_error() -> Result<(), Box<dyn std::error::Error>> { let result = parse_config(r#"port = 8080"#)?; assert_eq!(result.port, 8080); Ok(()) } } ``` ### Parameterized Tests with rstest ```rust use rstest::{rstest, fixture}; #[rstest] #[case("hello", 5)] #[case("", 0)] #[case("rust", 4)] fn test_string_length(#[case] input: &str, #[case] expected: usize) { assert_eq!(input.len(), expected); } ``` ### Async Tests ```rust #[tokio::test] async fn fetches_data_successfully() { let client = TestClient::new().await; let result = client.get("/data").await; assert!(result.is_ok()); } ``` ### Property-Based Tests ```rust use proptest::prelude::*; proptest! { #[test] fn encode_decode_roundtrip(input in ".*") { let encoded = encode(&input); let decoded = decode(&encoded).unwrap(); assert_eq!(input, decoded); } } ``` ## Coverage Commands ```bash # Summary report cargo llvm-cov # HTML report cargo llvm-cov --html # Fail if below threshold cargo llvm-cov --fail-under-lines 80 # Run specific test cargo test test_name # Run with output cargo test -- --nocapture # Run without stopping on first failure cargo test --no-fail-fast ``` ## Coverage Targets | Code Type | Target | |-----------|--------| | Critical business logic | 100% | | Public API | 90%+ | | General code | 80%+ | | Generated / FFI bindings | Exclude | ## TDD Best Practices **DO:** - Write test FIRST, before any implementation - Run tests after each change - Use `assert_eq!` over `assert!` for better error messages - Use `?` in tests that return `Result` for cleaner output - Test behavior, not implementation - Include edge cases (empty, boundary, error paths) **DON'T:** - Write implementation before tests - Skip the RED phase - Use `#[should_panic]` when `Result::is_err()` works - Use `sleep()` in tests — use channels or `tokio::time::pause()` - Mock everything — prefer integration tests when feasible ## Related Commands - `/rust-build` - Fix build errors - `/rust-review` - Review code after implementation - `verification-loop` skill - Run full verification loop ## Related - Skill: `skills/rust-testing/` - Skill: `skills/rust-patterns/`
- **/santa-loop** `[optional arguments]` — Adversarial dual-review convergence loop — two independent model reviewers must both approve before code ships.
  - How it runs: # Santa Loop Adversarial dual-review convergence loop using the santa-method skill. Two independent reviewers — different models, no shared context — must both return NICE before code ships. ## Purpose Run two independent reviewers (Claude Opus + an external model) against the current task output. Both must return NICE before the code is pushed. If either returns NAUGHTY, fix all flagged issues, commit, and re-run fresh reviewers — up to 3 rounds. ## Usage ``` /santa-loop [file-or-glob | description] ``` ## Workflow ### Step 1: Identify What to Review Determine the scope from `$ARGUMENTS` or fall back to uncommitted changes: ```bash git diff --name-only HEAD ``` Read all changed files to build the full review context. If `$ARGUMENTS` specifies a path, file, or description, use that as the scope instead. ### Step 2: Build the Rubric Construct a rubric appropriate to the file types under review. Every criterion must have an objective PASS/FAIL condition. Include at minimum: | Criterion | Pass Condition | |-----------|---------------| | Correctness | Logic is sound, no bugs, handles edge cases | | Security | No secrets, injection, XSS, or OWASP Top 10 issues | | Error handling | Errors handled explicitly, no silent swallowing | | Completeness | All requirements addressed, no missing cases | | Internal consistency | No contradictions between files or sections | | No regressions | Changes don't break existing behavior | Add domain-specific criteria based on file types (e.g., type safety for TS, memory safety for Rust, migration safety for SQL). ### Step 3: Dual Independent Review Launch two reviewers **in parallel** using the Agent tool (both in a single message for concurrent execution). Both must complete before proceeding to the verdict gate. Each reviewer evaluates every rubric criterion as PASS or FAIL, then returns structured JSON: ```json { "verdict": "PASS" | "FAIL", "checks": [ {"criterion": "...", "result": "PASS|FAIL", "detail": "..."} ], "critical_issues": ["..."], "suggestions": ["..."] } ``` The verdict gate (Step 4) maps these to NICE/NAUGHTY: both PASS → NICE, either FAIL → NAUGHTY. #### Reviewer A: Claude Agent (always runs) Launch an Agent (subagent_type: `code-reviewer`, model: `opus`) with the full rubric + all files under review. The prompt must include: - The complete rubric - All file contents under review - "You are an independent quality reviewer. You have NOT seen any other review. Your job is to find problems, not to approve." - Return the structured JSON verdict above #### Reviewer B: External Model (Claude fallback only if no external CLI installed) First, detect which CLIs are available: ```bash command -v codex >/dev/null 2>&1 && echo "codex" || true command -v gemini >/dev/null 2>&1 && echo "gemini" || true ``` Build the reviewer prompt (identical rubric + instructions as Reviewer A) and write it to a unique temp file: ```bash PROMPT_FILE=$(mktemp /tmp/santa-reviewer-b-XXXXXX.txt) cat > "$PROMPT_FILE" << 'EOF' ... full rubric + file contents + reviewer instructions ... EOF ``` Use the first available CLI: **Codex CLI** (if installed) ```bash codex exec --sandbox read-only -m gpt-5.4 -C "$(pwd)" - < "$PROMPT_FILE" rm -f "$PROMPT_FILE" ``` **Gemini CLI** (if installed and codex is not) ```bash gemini -p "$(cat "$PROMPT_FILE")" -m gemini-2.5-pro rm -f "$PROMPT_FILE" ``` **Claude Agent fallback** (only if neither `codex` nor `gemini` is installed) Launch a second Claude Agent (subagent_type: `code-reviewer`, model: `opus`). Log a warning that both reviewers share the same model family — true model diversity was not achieved but context isolation is still enforced. In all cases, the reviewer must return the same structured JSON verdict as Reviewer A. ### Step 4: Verdict Gate - **Both PASS** → **NICE** — proceed to Step 6 (push) - **Either FAIL** → **NAUGHTY** — merge all critical issues from both reviewers, deduplicate, proceed to Step 5 ### Step 5: Fix Cycle (NAUGHTY path) 1. Display all critical issues from both reviewers 2. Fix every flagged issue — change only what was flagged, no drive-by refactors 3. Commit all fixes in a single commit: ``` fix: address santa-loop review findings (round N) ``` 4. Re-run Step 3 with **fresh reviewers** (no memory of previous rounds) 5. Repeat until both return PASS **Maximum 3 iterations.** If still NAUGHTY after 3 rounds, stop and present remaining issues: ``` SANTA LOOP ESCALATION (exceeded 3 iterations) Remaining issues after 3 rounds: - [list all unresolved critical issues from both reviewers] Manual review required before proceeding. ``` Do NOT push. ### Step 6: Push (NICE path) When both reviewers return PASS: ```bash git push -u origin HEAD ``` ### Step 7: Final Report Print the output report (see Output section below). ## Output ``` SANTA VERDICT: [NICE / NAUGHTY (escalated)] Reviewer A (Claude Opus): [PASS/FAIL] Reviewer B ([model used]): [PASS/FAIL] Agreement: Both flagged: [issues caught by both] Reviewer A only: [issues only A caught] Reviewer B only: [issues only B caught] Iterations: [N]/3 Result: [PUSHED / ESCALATED TO USER] ``` ## Notes - Reviewer A (Claude Opus) always runs — guarantees at least one strong reviewer regardless of tooling. - Model diversity is the goal for Reviewer B. GPT-5.4 or Gemini 2.5 Pro gives true independence — different training data, different biases, different blind spots. The Claude-only fallback still provides value via context isolation but loses model diversity. - Strongest available models are used: Opus for Reviewer A, GPT-5.4 or Gemini 2.5 Pro for Reviewer B. - External reviewers run with `--sandbox read-only` (Codex) to prevent repo mutation during review. - Fresh reviewers each round prevents anchoring bias from prior findings. - The rubric is the most important input. Tighten it if reviewers rubber-stamp or flag subjective style issues. - Commits happen on NAUGHTY rounds so fixes are preserved even if the loop is interrupted. - Push only happens after NICE — never mid-loop.
- **/save-session** `[optional arguments]` — Save current session state to a dated file in ~/.claude/session-data/ so work can be resumed in a future session with full context.
  - How it runs: # Save Session Command Capture everything that happened in this session — what was built, what worked, what failed, what's left — and write it to a dated file so the next session can pick up exactly where this one left off. ## When to Use - End of a work session before closing Claude Code - Before hitting context limits (run this first, then start a fresh session) - After solving a complex problem you want to remember - Any time you need to hand off context to a future session ## Process ### Step 1: Gather context Before writing the file, collect: - Read all files modified during this session (use git diff or recall from conversation) - Review what was discussed, attempted, and decided - Note any errors encountered and how they were resolved (or not) - Check current test/build status if relevant ### Step 2: Create the sessions folder if it doesn't exist Create the canonical sessions folder in the user's Claude home directory: ```bash mkdir -p ~/.claude/session-data ``` ### Step 3: Write the session file Create `~/.claude/session-data/YYYY-MM-DD-<short-id>-session.tmp`, using today's actual date and a short-id that satisfies the rules enforced by `SESSION_FILENAME_REGEX` in `session-manager.js`: - Compatibility characters: letters `a-z` / `A-Z`, digits `0-9`, hyphens `-`, underscores `_` - Compatibility minimum length: 1 character - Recommended style for new files: lowercase letters, digits, and hyphens with 8+ characters to avoid collisions Valid examples: `abc123de`, `a1b2c3d4`, `frontend-worktree-1`, `ChezMoi_2` Avoid for new files: `A`, `test_id1`, `ABC123de` Full valid filename example: `2024-01-15-abc123de-session.tmp` The legacy filename `YYYY-MM-DD-session.tmp` is still valid, but new session files should prefer the short-id form to avoid same-day collisions. ### Step 4: Populate the file with all sections below Write every section honestly. Do not skip sections — write "Nothing yet" or "N/A" if a section genuinely has no content. An incomplete file is worse than an honest empty section. ### Step 5: Show the file to the user After writing, display the full contents and ask: ``` Session saved to [actual resolved path to the session file] Does this look accurate? Anything to correct or add before we close? ``` Wait for confirmation. Make edits if requested. --- ## Session File Format ```markdown # Session: YYYY-MM-DD **Started:** [approximate time if known] **Last Updated:** [current time] **Project:** [project name or path] **Topic:** [one-line summary of what this session was about] --- ## What We Are Building [1-3 paragraphs describing the feature, bug fix, or task. Include enough context that someone with zero memory of this session can understand the goal. Include: what it does, why it's needed, how it fits into the larger system.] --- ## What WORKED (with evidence) [List only things that are confirmed working. For each item include WHY you know it works — test passed, ran in browser, Postman returned 200, etc. Without evidence, move it to "Not Tried Yet" instead.] - **[thing that works]** — confirmed by: [specific evidence] - **[thing that works]** — confirmed by: [specific evidence] If nothing is confirmed working yet: "Nothing confirmed working yet — all approaches still in progress or untested." --- ## What Did NOT Work (and why) [This is the most important section. List every approach tried that failed. For each failure write the EXACT reason so the next session doesn't retry it. Be specific: "threw X error because Y" is useful. "didn't work" is not.] - **[approach tried]** — failed because: [exact reason / error message] - **[approach tried]** — failed because: [exact reason / error message] If nothing failed: "No failed approaches yet." --- ## What Has NOT Been Tried Yet [Approaches that seem promising but haven't been attempted. Ideas from the conversation. Alternative solutions worth exploring. Be specific enough that the next session knows exactly what to try.] - [approach / idea] - [approach / idea] If nothing is queued: "No specific untried approaches identified." --- ## Current State of Files [Every file touched this session. Be precise about what state each file is in.] | File | Status | Notes | | ----------------- | -------------- | -------------------------- | | `path/to/file.ts` | PASS: Complete | [what it does] | | `path/to/file.ts` | In Progress | [what's done, what's left] | | `path/to/file.ts` | FAIL: Broken | [what's wrong] | | `path/to/file.ts` | Not Started | [planned but not touched] | If no files were touched: "No files modified this session." --- ## Decisions Made [Architecture choices, tradeoffs accepted, approaches chosen and why. These prevent the next session from relitigating settled decisions.] - **[decision]** — reason: [why this was chosen over alternatives] If no significant decisions: "No major decisions made this session." --- ## Blockers & Open Questions [Anything unresolved that the next session needs to address or investigate. Questions that came up but weren't answered. External dependencies waiting on.] - [blocker / open question] If none: "No active blockers." --- ## Exact Next Step [If known: The single most important thing to do when resuming. Be precise enough that resuming requires zero thinking about where to start.] [If not known: "Next step not determined — review 'What Has NOT Been Tried Yet' and 'Blockers' sections to decide on direction before starting."] --- ## Environment & Setup Notes [Only fill this if relevant — commands needed to run the project, env vars required, services that need to be running, etc. Skip if standard setup.] [If none: omit this section entirely.] ``` --- ## Example Output ```markdown # Session: 2024-01-15 **Started:** ~2pm **Last Updated:** 5:30pm **Project:** my-app **Topic:** Building JWT authentication with httpOnly cookies --- ## What We Are Building User authentication system for the Next.js app. Users register with email/password, receive a JWT stored in an httpOnly cookie (not localStorage), and protected routes check for a valid token via middleware. The goal is session persistence across browser refreshes without exposing the token to JavaScript. --- ## What WORKED (with evidence) - **`/api/auth/register` endpoint** — confirmed by: Postman POST returns 200 with user object, row visible in Supabase dashboard, bcrypt hash stored correctly - **JWT generation in `lib/auth.ts`** — confirmed by: unit test passes (`npm test -- auth.test.ts`), decoded token at jwt.io shows correct payload - **Password hashing** — confirmed by: `bcrypt.compare()` returns true in test --- ## What Did NOT Work (and why) - **Next-Auth library** — failed because: conflicts with our custom Prisma adapter, threw "Cannot use adapter with credentials provider in this configuration" on every request. Not worth debugging — too opinionated for our setup. - **Storing JWT in localStorage** — failed because: SSR renders happen before localStorage is available, caused React hydration mismatch error on every page load. This approach is fundamentally incompatible with Next.js SSR. --- ## What Has NOT Been Tried Yet - Store JWT as httpOnly cookie in the login route response (most likely solution) - Use `cookies()` from `next/headers` to read token in server components - Write middleware.ts to protect routes by checking cookie existence --- ## Current State of Files | File | Status | Notes | | -------------------------------- | -------------- | ----------------------------------------------- | | `app/api/auth/register/route.ts` | PASS: Complete | Works, tested | | `app/api/auth/login/route.ts` | In Progress | Token generates but not setting cookie yet | | `lib/auth.ts` | PASS: Complete | JWT helpers, all tested | | `middleware.ts` | Not Started | Route protection, needs cookie read logic first | | `app/login/page.tsx` | Not Started | UI not started | --- ## Decisions Made - **httpOnly cookie over localStorage** — reason: prevents XSS token theft, works with SSR - **Custom auth over Next-Auth** — reason: Next-Auth conflicts with our Prisma setup, not worth the fight --- ## Blockers & Open Questions - Does `cookies().set()` work inside a Route Handler or only in Server Actions? Need to verify. --- ## Exact Next Step In `app/api/auth/login/route.ts`, after generating the JWT, set it as an httpOnly cookie using `cookies().set('token', jwt, { httpOnly: true, secure: true, sameSite: 'strict' })`. Then test with Postman — the response should include a `Set-Cookie` header. ``` --- ## Notes - Each session gets its own file — never append to a previous session's file - The "What Did NOT Work" section is the most critical — future sessions will blindly retry failed approaches without it - If the user asks to save mid-session (not just at the end), save what's known so far and mark in-progress items clearly - The file is meant to be read by Claude at the start of the next session via `/resume-session` - Use the canonical global session store: `~/.claude/session-data/` - Prefer the short-id filename form (`YYYY-MM-DD-<short-id>-session.tmp`) for any new session file
- **/security-scan** `[optional arguments]` — Run AgentShield against agent, hook, MCP, permission, and secret surfaces.
  - How it runs: # Security Scan Command Run AgentShield against the current project or a target path, then turn the findings into a prioritized remediation plan. ## Usage `/security-scan [path] [--format text|json|markdown|html] [--min-severity low|medium|high|critical] [--fix]` - `path` (optional): defaults to the current project. Use a `.claude/` path, a repo root, or a checked-in template directory. - `--format`: output format. Use `json` for CI, `markdown` for handoffs, and `html` for standalone review reports. - `--min-severity`: filters lower-priority findings. - `--fix`: applies only AgentShield fixes explicitly marked as safe and auto-fixable. ## Deterministic Engine Prefer the packaged scanner: ```bash npx ecc-agentshield scan --path "${TARGET_PATH:-.}" --format text ``` For local AgentShield development, run from the AgentShield checkout: ```bash npm run scan -- --path "${TARGET_PATH:-.}" --format text ``` Do not invent findings. Use AgentShield output as the source of truth and separate scanner facts from follow-up judgment. ## Review Checklist 1. Identify active runtime findings first: - hardcoded secrets - broad permissions - executable hooks - MCP servers with shell, filesystem, remote transport, or unpinned `npx` - agent prompts that handle untrusted content without defenses 2. Separate lower-confidence inventory: - docs examples - template examples - plugin manifests - project-local optional settings 3. For each critical or high finding, return: - file path - severity - runtime confidence - why it matters - exact remediation - whether it is safe to auto-fix 4. If `--fix` is requested, state the planned edits before applying fixes. 5. Re-run the scan after fixes and report the before/after score. ## Output Contract Return: 1. Security grade and score. 2. Counts by severity and runtime confidence. 3. Critical/high findings with exact paths. 4. Lower-confidence findings grouped separately. 5. A remediation order. 6. Commands run and whether the scan was local, CI, or npx-backed. ## CI Pattern Use AgentShield in GitHub Actions for enforced gates: ```yaml - uses: affaan-m/agentshield@v1 with: path: "." min-severity: "medium" fail-on-findings: true ``` ## Links - Skill: `skills/security-scan/SKILL.md` - Agent: `agents/security-reviewer.md` - Scanner: <https://github.com/affaan-m/agentshield> ## Arguments $ARGUMENTS: - optional target path - optional AgentShield flags
- **/sessions** `[optional arguments]` — Manage Claude Code session history, aliases, and session metadata.
  - How it runs: # Sessions Command Manage Claude Code session history - list, load, alias, and edit sessions stored in `~/.claude/session-data/` with legacy reads from `~/.claude/sessions/`. ## Usage `/sessions [list|load|alias|info|help] [options]` ## Actions ### List Sessions Display all sessions with metadata, filtering, and pagination. Use `/sessions info` when you need operator-surface context for a swarm: branch, worktree path, and session recency. ```bash /sessions # List all sessions (default) /sessions list # Same as above /sessions list --limit 10 # Show 10 sessions /sessions list --date 2026-02-01 # Filter by date /sessions list --search abc # Search by session ID ``` **Script:** ```bash node -e " const _r = (function(){var p=require('path'),f=require('fs'),o=require('os');var e=process.env.CLAUDE_PLUGIN_ROOT;if(e&&e.trim())return e.trim();var d=p.join(o.homedir(),'.claude');function L(x){try{return require(p.join(x,'scripts','lib','resolve-ecc-root')).resolveEccRoot()}catch(_){return null}}var r=L(d);if(r)return r;var s=['ecc','ecc@ecc','marketplaces/ecc','everything-claude-code','everything-claude-code@everything-claude-code','marketplaces/everything-claude-code'];for(var i=0;i<s.length;i++){r=L(p.join(d,'plugins',s[i]));if(r)return r}try{var g=['ecc','everything-claude-code'];for(var j=0;j<g.length;j++){var c=p.join(d,'plugins','cache',g[j]);var O=f.readdirSync(c);for(var k=0;k<O.length;k++){var q=p.join(c,O[k]);var V=f.readdirSync(q);for(var m=0;m<V.length;m++){r=L(p.join(q,V[m]));if(r)return r}}}}catch(_){}return d})(); const sm = require(_r + '/scripts/lib/session-manager'); const aa = require(_r + '/scripts/lib/session-aliases'); const path = require('path'); const result = sm.getAllSessions({ limit: 20 }); const aliases = aa.listAliases(); const aliasMap = {}; for (const a of aliases) aliasMap[a.sessionPath] = a.name; console.log('Sessions (showing ' + result.sessions.length + ' of ' + result.total + '):'); console.log(''); console.log('ID Date Time Branch Worktree Alias'); console.log('────────────────────────────────────────────────────────────────────'); for (const s of result.sessions) { const alias = aliasMap[s.filename] || ''; const metadata = sm.parseSessionMetadata(sm.getSessionContent(s.sessionPath)); const id = s.shortId === 'no-id' ? '(none)' : s.shortId.slice(0, 8); const time = s.modifiedTime.toTimeString().slice(0, 5); const branch = (metadata.branch || '-').slice(0, 12); const worktree = metadata.worktree ? path.basename(metadata.worktree).slice(0, 18) : '-'; console.log(id.padEnd(8) + ' ' + s.date + ' ' + time + ' ' + branch.padEnd(12) + ' ' + worktree.padEnd(18) + ' ' + alias); } " ``` ### Load Session Load and display a session's content (by ID or alias). ```bash /sessions load <id|alias> # Load session /sessions load 2026-02-01 # By date (for no-id sessions) /sessions load a1b2c3d4 # By short ID /sessions load my-alias # By alias name ``` **Script:** ```bash node -e " const _r = (function(){var p=require('path'),f=require('fs'),o=require('os');var e=process.env.CLAUDE_PLUGIN_ROOT;if(e&&e.trim())return e.trim();var d=p.join(o.homedir(),'.claude');function L(x){try{return require(p.join(x,'scripts','lib','resolve-ecc-root')).resolveEccRoot()}catch(_){return null}}var r=L(d);if(r)return r;var s=['ecc','ecc@ecc','marketplaces/ecc','everything-claude-code','everything-claude-code@everything-claude-code','marketplaces/everything-claude-code'];for(var i=0;i<s.length;i++){r=L(p.join(d,'plugins',s[i]));if(r)return r}try{var g=['ecc','everything-claude-code'];for(var j=0;j<g.length;j++){var c=p.join(d,'plugins','cache',g[j]);var O=f.readdirSync(c);for(var k=0;k<O.length;k++){var q=p.join(c,O[k]);var V=f.readdirSync(q);for(var m=0;m<V.length;m++){r=L(p.join(q,V[m]));if(r)return r}}}}catch(_){}return d})(); const sm = require(_r + '/scripts/lib/session-manager'); const aa = require(_r + '/scripts/lib/session-aliases'); const id = process.argv[1]; // First try to resolve as alias const resolved = aa.resolveAlias(id); const sessionId = resolved ? resolved.sessionPath : id; const session = sm.getSessionById(sessionId, true); if (!session) { console.log('Session not found: ' + id); process.exit(1); } const stats = sm.getSessionStats(session.sessionPath); const size = sm.getSessionSize(session.sessionPath); const aliases = aa.getAliasesForSession(session.filename); console.log('Session: ' + session.filename); console.log('Path: ' + session.sessionPath); console.log(''); console.log('Statistics:'); console.log(' Lines: ' + stats.lineCount); console.log(' Total items: ' + stats.totalItems); console.log(' Completed: ' + stats.completedItems); console.log(' In progress: ' + stats.inProgressItems); console.log(' Size: ' + size); console.log(''); if (aliases.length > 0) { console.log('Aliases: ' + aliases.map(a => a.name).join(', ')); console.log(''); } if (session.metadata.title) { console.log('Title: ' + session.metadata.title); console.log(''); } if (session.metadata.started) { console.log('Started: ' + session.metadata.started); } if (session.metadata.lastUpdated) { console.log('Last Updated: ' + session.metadata.lastUpdated); } if (session.metadata.project) { console.log('Project: ' + session.metadata.project); } if (session.metadata.branch) { console.log('Branch: ' + session.metadata.branch); } if (session.metadata.worktree) { console.log('Worktree: ' + session.metadata.worktree); } " "$ARGUMENTS" ``` ### Create Alias Create a memorable alias for a session. ```bash /sessions alias <id> <name> # Create alias /sessions alias 2026-02-01 today-work # Create alias named "today-work" ``` **Script:** ```bash node -e " const _r = (function(){var p=require('path'),f=require('fs'),o=require('os');var e=process.env.CLAUDE_PLUGIN_ROOT;if(e&&e.trim())return e.trim();var d=p.join(o.homedir(),'.claude');function L(x){try{return require(p.join(x,'scripts','lib','resolve-ecc-root')).resolveEccRoot()}catch(_){return null}}var r=L(d);if(r)return r;var s=['ecc','ecc@ecc','marketplaces/ecc','everything-claude-code','everything-claude-code@everything-claude-code','marketplaces/everything-claude-code'];for(var i=0;i<s.length;i++){r=L(p.join(d,'plugins',s[i]));if(r)return r}try{var g=['ecc','everything-claude-code'];for(var j=0;j<g.length;j++){var c=p.join(d,'plugins','cache',g[j]);var O=f.readdirSync(c);for(var k=0;k<O.length;k++){var q=p.join(c,O[k]);var V=f.readdirSync(q);for(var m=0;m<V.length;m++){r=L(p.join(q,V[m]));if(r)return r}}}}catch(_){}return d})(); const sm = require(_r + '/scripts/lib/session-manager'); const aa = require(_r + '/scripts/lib/session-aliases'); const sessionId = process.argv[1]; const aliasName = process.argv[2]; if (!sessionId || !aliasName) { console.log('Usage: /sessions alias <id> <name>'); process.exit(1); } // Get session filename const session = sm.getSessionById(sessionId); if (!session) { console.log('Session not found: ' + sessionId); process.exit(1); } const result = aa.setAlias(aliasName, session.filename); if (result.success) { console.log('✓ Alias created: ' + aliasName + ' → ' + session.filename); } else { console.log('✗ Error: ' + result.error); process.exit(1); } " "$ARGUMENTS" ``` ### Remove Alias Delete an existing alias. ```bash /sessions alias --remove <name> # Remove alias /sessions unalias <name> # Same as above ``` **Script:** ```bash node -e " const _r = (function(){var p=require('path'),f=require('fs'),o=require('os');var e=process.env.CLAUDE_PLUGIN_ROOT;if(e&&e.trim())return e.trim();var d=p.join(o.homedir(),'.claude');function L(x){try{return require(p.join(x,'scripts','lib','resolve-ecc-root')).resolveEccRoot()}catch(_){return null}}var r=L(d);if(r)return r;var s=['ecc','ecc@ecc','marketplaces/ecc','everything-claude-code','everything-claude-code@everything-claude-code','marketplaces/everything-claude-code'];for(var i=0;i<s.length;i++){r=L(p.join(d,'plugins',s[i]));if(r)return r}try{var g=['ecc','everything-claude-code'];for(var j=0;j<g.length;j++){var c=p.join(d,'plugins','cache',g[j]);var O=f.readdirSync(c);for(var k=0;k<O.length;k++){var q=p.join(c,O[k]);var V=f.readdirSync(q);for(var m=0;m<V.length;m++){r=L(p.join(q,V[m]));if(r)return r}}}}catch(_){}return d})(); const aa = require(_r + '/scripts/lib/session-aliases'); const aliasName = process.argv[1]; if (!aliasName) { console.log('Usage: /sessions alias --remove <name>'); process.exit(1); } const result = aa.deleteAlias(aliasName); if (result.success) { console.log('✓ Alias removed: ' + aliasName); } else { console.log('✗ Error: ' + result.error); process.exit(1); } " "$ARGUMENTS" ``` ### Session Info Show detailed information about a session. ```bash /sessions info <id|alias> # Show session details ``` **Script:** ```bash node -e " const _r = (function(){var p=require('path'),f=require('fs'),o=require('os');var e=process.env.CLAUDE_PLUGIN_ROOT;if(e&&e.trim())return e.trim();var d=p.join(o.homedir(),'.claude');function L(x){try{return require(p.join(x,'scripts','lib','resolve-ecc-root')).resolveEccRoot()}catch(_){return null}}var r=L(d);if(r)return r;var s=['ecc','ecc@ecc','marketplaces/ecc','everything-claude-code','everything-claude-code@everything-claude-code','marketplaces/everything-claude-code'];for(var i=0;i<s.length;i++){r=L(p.join(d,'plugins',s[i]));if(r)return r}try{var g=['ecc','everything-claude-code'];for(var j=0;j<g.length;j++){var c=p.join(d,'plugins','cache',g[j]);var O=f.readdirSync(c);for(var k=0;k<O.length;k++){var q=p.join(c,O[k]);var V=f.readdirSync(q);for(var m=0;m<V.length;m++){r=L(p.join(q,V[m]));if(r)return r}}}}catch(_){}return d})(); const sm = require(_r + '/scripts/lib/session-manager'); const aa = require(_r + '/scripts/lib/session-aliases'); const id = process.argv[1]; const resolved = aa.resolveAlias(id); const sessionId = resolved ? resolved.sessionPath : id; const session = sm.getSessionById(sessionId, true); if (!session) { console.log('Session not found: ' + id); process.exit(1); } const stats = sm.getSessionStats(session.sessionPath); const size = sm.getSessionSize(session.sessionPath); const aliases = aa.getAliasesForSession(session.filename); console.log('Session Information'); console.log('════════════════════'); console.log('ID: ' + (session.shortId === 'no-id' ? '(none)' : session.shortId)); console.log('Filename: ' + session.filename); console.log('Date: ' + session.date); console.log('Modified: ' + session.modifiedTime.toISOString().slice(0, 19).replace('T', ' ')); console.log('Project: ' + (session.metadata.project || '-')); console.log('Branch: ' + (session.metadata.branch || '-')); console.log('Worktree: ' + (session.metadata.worktree || '-')); console.log(''); console.log('Content:'); console.log(' Lines: ' + stats.lineCount); console.log(' Total items: ' + stats.totalItems); console.log(' Completed: ' + stats.completedItems); console.log(' In progress: ' + stats.inProgressItems); console.log(' Size: ' + size); if (aliases.length > 0) { console.log('Aliases: ' + aliases.map(a => a.name).join(', ')); } " "$ARGUMENTS" ``` ### List Aliases Show all session aliases. ```bash /sessions aliases # List all aliases ``` **Script:** ```bash node -e " const _r = (function(){var p=require('path'),f=require('fs'),o=require('os');var e=process.env.CLAUDE_PLUGIN_ROOT;if(e&&e.trim())return e.trim();var d=p.join(o.homedir(),'.claude');function L(x){try{return require(p.join(x,'scripts','lib','resolve-ecc-root')).resolveEccRoot()}catch(_){return null}}var r=L(d);if(r)return r;var s=['ecc','ecc@ecc','marketplaces/ecc','everything-claude-code','everything-claude-code@everything-claude-code','marketplaces/everything-claude-code'];for(var i=0;i<s.length;i++){r=L(p.join(d,'plugins',s[i]));if(r)return r}try{var g=['ecc','everything-claude-code'];for(var j=0;j<g.length;j++){var c=p.join(d,'plugins','cache',g[j]);var O=f.readdirSync(c);for(var k=0;k<O.length;k++){var q=p.join(c,O[k]);var V=f.readdirSync(q);for(var m=0;m<V.length;m++){r=L(p.join(q,V[m]));if(r)return r}}}}catch(_){}return d})(); const aa = require(_r + '/scripts/lib/session-aliases'); const aliases = aa.listAliases(); console.log('Session Aliases (' + aliases.length + '):'); console.log(''); if (aliases.length === 0) { console.log('No aliases found.'); } else { console.log('Name Session File Title'); console.log('─────────────────────────────────────────────────────────────'); for (const a of aliases) { const name = a.name.padEnd(12); const file = (a.sessionPath.length > 30 ? a.sessionPath.slice(0, 27) + '...' : a.sessionPath).padEnd(30); const title = a.title || ''; console.log(name + ' ' + file + ' ' + title); } } " ``` ## Operator Notes - Session files persist `Project`, `Branch`, and `Worktree` in the header so `/sessions info` can disambiguate parallel tmux/worktree runs. - For command-center style monitoring, combine `/sessions info`, `git diff --stat`, and the cost metrics emitted by `scripts/hooks/cost-tracker.js`. ## Arguments $ARGUMENTS: - `list [options]` - List sessions - `--limit <n>` - Max sessions to show (default: 50) - `--date <YYYY-MM-DD>` - Filter by date - `--search <pattern>` - Search in session ID - `load <id|alias>` - Load session content - `alias <id> <name>` - Create alias for session - `alias --remove <name>` - Remove alias - `unalias <name>` - Same as `--remove` - `info <id|alias>` - Show session statistics - `aliases` - List all aliases - `help` - Show this help ## Examples ```bash # List all sessions /sessions list # Create an alias for today's session /sessions alias 2026-02-01 today # Load session by alias /sessions load today # Show session info /sessions info today # Remove alias /sessions alias --remove today # List all aliases /sessions aliases ``` ## Notes - Sessions are stored as markdown files in `~/.claude/session-data/` with legacy reads from `~/.claude/sessions/` - Aliases are stored in `~/.claude/session-aliases.json` - Session IDs can be shortened (first 4-8 characters usually unique enough) - Use aliases for frequently referenced sessions
- **/setup-pm** `[optional arguments]` — Configure your preferred package manager (npm/pnpm/yarn/bun)
  - How it runs: # Package Manager Setup Configure your preferred package manager for this project or globally. ## Usage ```bash # Detect current package manager node scripts/setup-package-manager.js --detect # Set global preference node scripts/setup-package-manager.js --global pnpm # Set project preference node scripts/setup-package-manager.js --project bun # List available package managers node scripts/setup-package-manager.js --list ``` ## Detection Priority When determining which package manager to use, the following order is checked: 1. **Environment variable**: `CLAUDE_PACKAGE_MANAGER` 2. **Project config**: `.claude/package-manager.json` 3. **package.json**: `packageManager` field 4. **Lock file**: Presence of package-lock.json, yarn.lock, pnpm-lock.yaml, or bun.lockb 5. **Global config**: `~/.claude/package-manager.json` 6. **Fallback**: First available package manager (pnpm > bun > yarn > npm) ## Configuration Files ### Global Configuration ```json // ~/.claude/package-manager.json { "packageManager": "pnpm" } ``` ### Project Configuration ```json // .claude/package-manager.json { "packageManager": "bun" } ``` ### package.json ```json { "packageManager": "pnpm@8.6.0" } ``` ## Environment Variable Set `CLAUDE_PACKAGE_MANAGER` to override all other detection methods: ```bash # Windows (PowerShell) $env:CLAUDE_PACKAGE_MANAGER = "pnpm" # macOS/Linux export CLAUDE_PACKAGE_MANAGER=pnpm ``` ## Run the Detection To see current package manager detection results, run: ```bash node scripts/setup-package-manager.js --detect ```
- **/skill-create** `[optional arguments]` — Analyze local git history to extract coding patterns and generate SKILL.md files. Local version of the Skill Creator GitHub App.
  - How it runs: # /skill-create - Local Skill Generation Analyze your repository's git history to extract coding patterns and generate SKILL.md files that teach Claude your team's practices. ## Usage ```bash /skill-create # Analyze current repo /skill-create --commits 100 # Analyze last 100 commits /skill-create --output ./skills # Custom output directory /skill-create --instincts # Also generate instincts for continuous-learning-v2 ``` ## What It Does 1. **Parses Git History** - Analyzes commits, file changes, and patterns 2. **Detects Patterns** - Identifies recurring workflows and conventions 3. **Generates SKILL.md** - Creates valid Claude Code skill files 4. **Optionally Creates Instincts** - For the continuous-learning-v2 system ## Analysis Steps ### Step 1: Gather Git Data ```bash # Get recent commits with file changes git log --oneline -n ${COMMITS:-200} --name-only --pretty=format:"%H|%s|%ad" --date=short # Get commit frequency by file git log --oneline -n 200 --name-only | grep -v "^$" | grep -v "^[a-f0-9]" | sort | uniq -c | sort -rn | head -20 # Get commit message patterns git log --oneline -n 200 | cut -d' ' -f2- | head -50 ``` ### Step 2: Detect Patterns Look for these pattern types: | Pattern | Detection Method | |---------|-----------------| | **Commit conventions** | Regex on commit messages (feat:, fix:, chore:) | | **File co-changes** | Files that always change together | | **Workflow sequences** | Repeated file change patterns | | **Architecture** | Folder structure and naming conventions | | **Testing patterns** | Test file locations, naming, coverage | ### Step 3: Generate SKILL.md Output format: ```markdown --- name: {repo-name}-patterns description: Coding patterns extracted from {repo-name} version: 1.0.0 source: local-git-analysis analyzed_commits: {count} --- # {Repo Name} Patterns ## Commit Conventions {detected commit message patterns} ## Code Architecture {detected folder structure and organization} ## Workflows {detected repeating file change patterns} ## Testing Patterns {detected test conventions} ``` ### Step 4: Generate Instincts (if --instincts) For continuous-learning-v2 integration: ```yaml --- id: {repo}-commit-convention trigger: "when writing a commit message" confidence: 0.8 domain: git source: local-repo-analysis --- # Use Conventional Commits ## Action Prefix commits with: feat:, fix:, chore:, docs:, test:, refactor: ## Evidence - Analyzed {n} commits - {percentage}% follow conventional commit format ``` ## GitHub App Integration For advanced features (10k+ commits, team sharing, auto-PRs), use the [Skill Creator GitHub App](https://github.com/apps/skill-creator): - Install: [github.com/apps/skill-creator](https://github.com/apps/skill-creator) - Comment `/skill-creator analyze` on any issue - Receives PR with generated skills ## Related Commands - `/instinct-import` - Import generated instincts - `/instinct-status` - View learned instincts - `/evolve` - Cluster instincts into skills/agents --- *Part of [Everything Claude Code](https://github.com/affaan-m/everything-claude-code)*
- **/skill-health** `[optional arguments]` — Show skill portfolio health dashboard with charts and analytics
  - How it runs: # Skill Health Dashboard Shows a comprehensive health dashboard for all skills in the portfolio with success rate sparklines, failure pattern clustering, pending amendments, and version history. ## Implementation Run the skill health CLI in dashboard mode: ```bash ECC_ROOT="${CLAUDE_PLUGIN_ROOT:-$(node -e "var r=(function(){var p=require('path'),f=require('fs'),o=require('os');var e=process.env.CLAUDE_PLUGIN_ROOT;if(e&&e.trim())return e.trim();var d=p.join(o.homedir(),'.claude');function L(x){try{return require(p.join(x,'scripts','lib','resolve-ecc-root')).resolveEccRoot()}catch(_){return null}}var r=L(d);if(r)return r;var s=['ecc','ecc@ecc','marketplaces/ecc','everything-claude-code','everything-claude-code@everything-claude-code','marketplaces/everything-claude-code'];for(var i=0;i<s.length;i++){r=L(p.join(d,'plugins',s[i]));if(r)return r}try{var g=['ecc','everything-claude-code'];for(var j=0;j<g.length;j++){var c=p.join(d,'plugins','cache',g[j]);var O=f.readdirSync(c);for(var k=0;k<O.length;k++){var q=p.join(c,O[k]);var V=f.readdirSync(q);for(var m=0;m<V.length;m++){r=L(p.join(q,V[m]));if(r)return r}}}}catch(_){}return d})();console.log(r)")}" node "$ECC_ROOT/scripts/skills-health.js" --dashboard ``` For a specific panel only: ```bash ECC_ROOT="${CLAUDE_PLUGIN_ROOT:-$(node -e "var r=(function(){var p=require('path'),f=require('fs'),o=require('os');var e=process.env.CLAUDE_PLUGIN_ROOT;if(e&&e.trim())return e.trim();var d=p.join(o.homedir(),'.claude');function L(x){try{return require(p.join(x,'scripts','lib','resolve-ecc-root')).resolveEccRoot()}catch(_){return null}}var r=L(d);if(r)return r;var s=['ecc','ecc@ecc','marketplaces/ecc','everything-claude-code','everything-claude-code@everything-claude-code','marketplaces/everything-claude-code'];for(var i=0;i<s.length;i++){r=L(p.join(d,'plugins',s[i]));if(r)return r}try{var g=['ecc','everything-claude-code'];for(var j=0;j<g.length;j++){var c=p.join(d,'plugins','cache',g[j]);var O=f.readdirSync(c);for(var k=0;k<O.length;k++){var q=p.join(c,O[k]);var V=f.readdirSync(q);for(var m=0;m<V.length;m++){r=L(p.join(q,V[m]));if(r)return r}}}}catch(_){}return d})();console.log(r)")}" node "$ECC_ROOT/scripts/skills-health.js" --dashboard --panel failures ``` For machine-readable output: ```bash ECC_ROOT="${CLAUDE_PLUGIN_ROOT:-$(node -e "var r=(function(){var p=require('path'),f=require('fs'),o=require('os');var e=process.env.CLAUDE_PLUGIN_ROOT;if(e&&e.trim())return e.trim();var d=p.join(o.homedir(),'.claude');function L(x){try{return require(p.join(x,'scripts','lib','resolve-ecc-root')).resolveEccRoot()}catch(_){return null}}var r=L(d);if(r)return r;var s=['ecc','ecc@ecc','marketplaces/ecc','everything-claude-code','everything-claude-code@everything-claude-code','marketplaces/everything-claude-code'];for(var i=0;i<s.length;i++){r=L(p.join(d,'plugins',s[i]));if(r)return r}try{var g=['ecc','everything-claude-code'];for(var j=0;j<g.length;j++){var c=p.join(d,'plugins','cache',g[j]);var O=f.readdirSync(c);for(var k=0;k<O.length;k++){var q=p.join(c,O[k]);var V=f.readdirSync(q);for(var m=0;m<V.length;m++){r=L(p.join(q,V[m]));if(r)return r}}}}catch(_){}return d})();console.log(r)")}" node "$ECC_ROOT/scripts/skills-health.js" --dashboard --json ``` ## Usage ``` /skill-health # Full dashboard view /skill-health --panel failures # Only failure clustering panel /skill-health --json # Machine-readable JSON output ``` ## What to Do 1. Run the skills-health.js script with --dashboard flag 2. Display the output to the user 3. If any skills are declining, highlight them and suggest running /evolve 4. If there are pending amendments, suggest reviewing them ## Panels - **Success Rate (30d)** — Sparkline charts showing daily success rates per skill - **Failure Patterns** — Clustered failure reasons with horizontal bar chart - **Pending Amendments** — Amendment proposals awaiting review - **Version History** — Timeline of version snapshots per skill
- **/test-coverage** `[optional arguments]` — Analyze coverage, identify gaps, and generate missing tests toward the target threshold.
  - How it runs: # Test Coverage Analyze test coverage, identify gaps, and generate missing tests to reach 80%+ coverage. ## Step 1: Detect Test Framework | Indicator | Coverage Command | |-----------|-----------------| | `jest.config.*` or `package.json` jest | `npx jest --coverage --coverageReporters=json-summary` | | `vitest.config.*` | `npx vitest run --coverage` | | `pytest.ini` / `pyproject.toml` pytest | `pytest --cov=src --cov-report=json` | | `Cargo.toml` | `cargo llvm-cov --json` | | `pom.xml` with JaCoCo | `mvn test jacoco:report` | | `go.mod` | `go test -coverprofile=coverage.out ./...` | ## Step 2: Analyze Coverage Report 1. Run the coverage command 2. Parse the output (JSON summary or terminal output) 3. List files **below 80% coverage**, sorted worst-first 4. For each under-covered file, identify: - Untested functions or methods - Missing branch coverage (if/else, switch, error paths) - Dead code that inflates the denominator ## Step 3: Generate Missing Tests For each under-covered file, generate tests following this priority: 1. **Happy path** — Core functionality with valid inputs 2. **Error handling** — Invalid inputs, missing data, network failures 3. **Edge cases** — Empty arrays, null/undefined, boundary values (0, -1, MAX_INT) 4. **Branch coverage** — Each if/else, switch case, ternary ### Test Generation Rules - Place tests adjacent to source: `foo.ts` → `foo.test.ts` (or project convention) - Use existing test patterns from the project (import style, assertion library, mocking approach) - Mock external dependencies (database, APIs, file system) - Each test should be independent — no shared mutable state between tests - Name tests descriptively: `test_create_user_with_duplicate_email_returns_409` ## Step 4: Verify 1. Run the full test suite — all tests must pass 2. Re-run coverage — verify improvement 3. If still below 80%, repeat Step 3 for remaining gaps ## Step 5: Report Show before/after comparison: ``` Coverage Report ────────────────────────────── File Before After src/services/auth.ts 45% 88% src/utils/validation.ts 32% 82% ────────────────────────────── Overall: 67% 84% PASS: ``` ## Focus Areas - Functions with complex branching (high cyclomatic complexity) - Error handlers and catch blocks - Utility functions used across the codebase - API endpoint handlers (request → response flow) - Edge cases: null, undefined, empty string, empty array, zero, negative numbers
- **/update-codemaps** `[optional arguments]` — Scan project structure and generate token-lean architecture codemaps.
  - How it runs: # Update Codemaps Analyze the codebase structure and generate token-lean architecture documentation. ## Step 1: Scan Project Structure 1. Identify the project type (monorepo, single app, library, microservice) 2. Find all source directories (src/, lib/, app/, packages/) 3. Map entry points (main.ts, index.ts, app.py, main.go, etc.) ## Step 2: Generate Codemaps Create or update codemaps in `docs/CODEMAPS/` (or `.reports/codemaps/`): | File | Contents | |------|----------| | `architecture.md` | High-level system diagram, service boundaries, data flow | | `backend.md` | API routes, middleware chain, service → repository mapping | | `frontend.md` | Page tree, component hierarchy, state management flow | | `data.md` | Database tables, relationships, migration history | | `dependencies.md` | External services, third-party integrations, shared libraries | ### Codemap Format Each codemap should be token-lean — optimized for AI context consumption: ```markdown # Backend Architecture ## Routes POST /api/users → UserController.create → UserService.create → UserRepo.insert GET /api/users/:id → UserController.get → UserService.findById → UserRepo.findById ## Key Files src/services/user.ts (business logic, 120 lines) src/repos/user.ts (database access, 80 lines) ## Dependencies - PostgreSQL (primary data store) - Redis (session cache, rate limiting) - Stripe (payment processing) ``` ## Step 3: Diff Detection 1. If previous codemaps exist, calculate the diff percentage 2. If changes > 30%, show the diff and request user approval before overwriting 3. If changes <= 30%, update in place ## Step 4: Add Metadata Add a freshness header to each codemap: ```markdown <!-- Generated: 2026-02-11 | Files scanned: 142 | Token estimate: ~800 --> ``` ## Step 5: Save Analysis Report Write a summary to `.reports/codemap-diff.txt`: - Files added/removed/modified since last scan - New dependencies detected - Architecture changes (new routes, new services, etc.) - Staleness warnings for docs not updated in 90+ days ## Tips - Focus on **high-level structure**, not implementation details - Prefer **file paths and function signatures** over full code blocks - Keep each codemap under **1000 tokens** for efficient context loading - Use ASCII diagrams for data flow instead of verbose descriptions - Run after major feature additions or refactoring sessions
- **/update-docs** `[optional arguments]` — Sync documentation from source-of-truth files such as scripts, schemas, routes, and exports.
  - How it runs: # Update Documentation Sync documentation with the codebase, generating from source-of-truth files. ## Step 1: Identify Sources of Truth | Source | Generates | |--------|-----------| | `package.json` scripts | Available commands reference | | `.env.example` | Environment variable documentation | | `openapi.yaml` / route files | API endpoint reference | | Source code exports | Public API documentation | | `Dockerfile` / `docker-compose.yml` | Infrastructure setup docs | ## Step 2: Generate Script Reference 1. Read `package.json` (or `Makefile`, `Cargo.toml`, `pyproject.toml`) 2. Extract all scripts/commands with their descriptions 3. Generate a reference table: ```markdown | Command | Description | |---------|-------------| | `npm run dev` | Start development server with hot reload | | `npm run build` | Production build with type checking | | `npm test` | Run test suite with coverage | ``` ## Step 3: Generate Environment Documentation 1. Read `.env.example` (or `.env.template`, `.env.sample`) 2. Extract all variables with their purposes 3. Categorize as required vs optional 4. Document expected format and valid values ```markdown | Variable | Required | Description | Example | |----------|----------|-------------|---------| | `DATABASE_URL` | Yes | PostgreSQL connection string | `postgres://user:pass@host:5432/db` | | `LOG_LEVEL` | No | Logging verbosity (default: info) | `debug`, `info`, `warn`, `error` | ``` ## Step 4: Update Contributing Guide Generate or update `docs/CONTRIBUTING.md` with: - Development environment setup (prerequisites, install steps) - Available scripts and their purposes - Testing procedures (how to run, how to write new tests) - Code style enforcement (linter, formatter, pre-commit hooks) - PR submission checklist ## Step 5: Update Runbook Generate or update `docs/RUNBOOK.md` with: - Deployment procedures (step-by-step) - Health check endpoints and monitoring - Common issues and their fixes - Rollback procedures - Alerting and escalation paths ## Step 6: Staleness Check 1. Find documentation files not modified in 90+ days 2. Cross-reference with recent source code changes 3. Flag potentially outdated docs for manual review ## Step 7: Show Summary ``` Documentation Update ────────────────────────────── Updated: docs/CONTRIBUTING.md (scripts table) Updated: docs/ENV.md (3 new variables) Flagged: docs/DEPLOY.md (142 days stale) Skipped: docs/API.md (no changes detected) ────────────────────────────── ``` ## Rules - **Single source of truth**: Always generate from code, never manually edit generated sections - **Preserve manual sections**: Only update generated sections; leave hand-written prose intact - **Mark generated content**: Use `<!-- AUTO-GENERATED -->` markers around generated sections - **Don't create docs unprompted**: Only create new doc files if the command explicitly requests it
- **/vue-review** `[optional arguments]` — Comprehensive Vue.js code review for Composition API correctness, reactivity, composable patterns, template security, accessibility, and Vue-specific performance. Invokes the vue-reviewer agent (and typescript-reviewer alongside on .vue/.ts changes).
  - How it runs: # Vue Code Review This command invokes the **vue-reviewer** agent for Vue-specific code review. For pull requests touching `.vue` files or Vue-containing `.ts`/`.js` files, both `vue-reviewer` and `typescript-reviewer` should run — each owns a distinct lane. ## What This Command Does 1. **Identify Vue Changes**: Find modified `.vue` files and Vue-related `.ts`/`.js` files via `git diff` 2. **Run Lint**: Execute `eslint` with `eslint-plugin-vue` 3. **Typecheck**: Run `vue-tsc --noEmit` or the project's canonical typecheck command 4. **Review Vue Lanes Only**: Reactivity, composables, template security, accessibility, Vue-specific performance 5. **Generate Report**: Categorize issues by severity (CRITICAL / HIGH / MEDIUM) ## When to Use Use `/vue-review` when: - A PR or commit touches `.vue` files - After writing or modifying Vue components, composables, or Pinia stores - Before merging Vue code - Auditing template security (`v-html`, URL bindings) - Reviewing a new composable for correctness - Auditing Vue Router guards and navigation - Reviewing Nuxt server routes or SSR-specific code For pure `.ts`/`.js` changes with no Vue imports, use `/code-review` (general) or invoke `typescript-reviewer` directly. ## Scope vs `/code-review` and TypeScript Review | Tool | Scope | |---|---| | `vue-reviewer` (this command) | Reactivity, composables, template security, a11y, Vue performance, Pinia/Router | | `typescript-reviewer` | Generic TS/JS — `any` abuse, async correctness, Node security | | `security-reviewer` | Project-wide security audit | | `/code-review` | Generic uncommitted-changes or PR review | On a `.vue` / Vue-related PR, invoke both `vue-reviewer` and `typescript-reviewer`. Findings from each are non-overlapping by design. ## Review Categories ### CRITICAL (Must Fix) - `v-html` with unsanitized input - `:href`/`:src` with unvalidated user URLs (`javascript:`, `data:`) - Secret in client bundle (`VITE_*`, Nuxt `public` runtimeConfig) - Server endpoint without input validation (Nuxt Nitro) - `localStorage`/`sessionStorage` for session tokens - Destructuring reactive props in Vue < 3.5 (breaks reactivity) - `reactive()` object replacement (breaks watchers) - Watcher source tracking a ref object instead of `.value` ### HIGH (Should Fix) - Composable with module-scope side effects - Missing cleanup in composable (watcher, interval, listener) - `v-for` without `:key` or with `key={index}` - `v-if` + `v-for` on same element - Props mutation - Missing prop validation - Route guard returning false without redirect - `useRoute().params` destructured at top-level (snapshot) - `v-model` bound to computed without setter - Accessibility violations (missing labels, non-semantic interactive elements) - Direct store property mutation outside actions ### MEDIUM (Consider) - Options API in new Vue 3 code - Component over 300 lines - `v-show` where `v-if` is more appropriate (or vice versa) - Missing `:max` on `<KeepAlive>` - Missing `shallowRef` for large replaced data - Custom validation instead of vetted form library - `defineExpose` exposing more than necessary - `inheritAttrs` not disabled when using `v-bind="$attrs"` ## Automated Checks Run ```bash # Lint (required) npx eslint . --ext .vue,.ts,.js # Vue-specific typecheck vue-tsc --noEmit # Targeted security rules npx eslint . --rule 'vue/no-v-html: warn' \ --rule 'vue/no-template-target-blank: error' # Supply-chain npm audit ``` If `eslint-plugin-vue` or `vue-tsc` is not configured, the review will flag the gap as a HIGH config issue and continue. ## Example Usage ````text User: /vue-review Agent: # Vue Code Review Report ## Files Reviewed - src/components/UserCard.vue (modified) - src/composables/useUser.ts (new) - src/stores/useUserStore.ts (modified) ## Lint Results PASS: eslint clean PASS: vue-tsc clean ## Issues Found [CRITICAL] Unsanitized v-html File: src/components/UserCard.vue:15 Issue: User-controlled bio rendered as raw HTML via v-html. Why: XSS via stored script tags in user input. Fix: Sanitize with DOMPurify or render as text: ```vue <script setup> import DOMPurify from "dompurify"; const safeBio = computed(() => DOMPurify.sanitize(user.bio)); </script> <template> <div v-html="safeBio" /> </template> ``` [HIGH] Watcher in composable missing cleanup File: src/composables/useUser.ts:22 Issue: `watch` callback fires fetch without AbortController; stale responses can overwrite newer data. Fix: Use onCleanup to abort: ```ts watch(userId, async (newId, _old, onCleanup) => { const controller = new AbortController(); onCleanup(() => controller.abort()); const data = await fetch(`/api/users/${newId}`, { signal: controller.signal }); user.value = await data.json(); }); ``` ## Summary - CRITICAL: 1 - HIGH: 1 - MEDIUM: 0 Recommendation: FAIL: Block merge until CRITICAL issue is fixed ```` ## Approval Criteria | Status | Condition | |---|---| | PASS: Approve | No CRITICAL or HIGH issues | | WARNING: Warning | Only MEDIUM issues (merge with caution) | | FAIL: Block | CRITICAL or HIGH issues found | ## Integration with Other Commands - Run your project's build command first if the build is broken - Run tests to ensure component tests pass - Run `/vue-review` before merging Vue code - Use `/code-review` for non-Vue-specific concerns on the same PR ## Related - Agent: `agents/vue-reviewer.md` - Companion agent: `agents/typescript-reviewer.md` (run alongside for Vue-related TS/JS) - Skills: `skills/vue-patterns/` - Rules: `rules/vue/`

### Skills

- **accessibility** — Design, implement, and audit inclusive digital products using WCAG 2.2 Level AA
- **agent-architecture-audit** — Full-stack diagnostic for agent and LLM applications. Audits the 12-layer agent stack for wrapper regression, memory pollution, tool discipline failures, hidden repair loops, and rendering corruption. Produces severity-ranked findings with code-first fixes. Essential for developers building agent applications, autonomous loops, or any LLM-powered feature.
- **agent-eval** — Head-to-head comparison of coding agents (Claude Code, Aider, Codex, etc.) on custom tasks with pass rate, cost, time, and consistency metrics
- **agent-harness-construction** — Design and optimize AI agent action spaces, tool definitions, and observation formatting for higher completion rates.
- **agent-introspection-debugging** — Structured self-debugging workflow for AI agent failures using capture, diagnosis, contained recovery, and introspection reports.
- **agent-payment-x402** — Add x402 payment execution to AI agents with per-task budgets, spending controls, and non-custodial wallets. Supports Base through agentwallet-sdk and X Layer through OKX Payments / OKX Agent Payments Protocol.
- **agent-self-evaluation** — Use after completing any non-trivial task. The agent self-rates its output on 5 axes — accuracy, completeness, clarity, actionability, conciseness — with concrete evidence per criterion. Produces a structured 1-5 scorecard with specific improvement suggestions.
- **agent-sort** — Build an evidence-backed ECC install plan for a specific repo by sorting skills, commands, rules, hooks, and extras into DAILY vs LIBRARY buckets using parallel repo-aware review passes. Use when ECC should be trimmed to what a project actually needs instead of loading the full bundle.
- **agentic-engineering** — Operate as an agentic engineer using eval-first execution, decomposition, and cost-aware model routing.
- **agentic-os** — Build persistent multi-agent operating systems on Claude Code. Covers kernel architecture, specialist agents, slash commands, file-based memory, scheduled automation, and state management without external databases.
- **ai-first-engineering** — Engineering operating model for teams where AI agents generate a large share of implementation output.
- **ai-regression-testing** — Regression testing strategies for AI-assisted development. Sandbox-mode API testing without database dependencies, automated bug-check workflows, and patterns to catch AI blind spots where the same model writes and reviews code.
- **android-clean-architecture** — Clean Architecture patterns for Android and Kotlin Multiplatform projects — module structure, dependency rules, UseCases, Repositories, and data layer patterns.
- **angular-developer** — Generates Angular code and provides architectural guidance. Trigger when creating projects, components, or services, or for best practices on reactivity (signals, linkedSignal, resource), forms, dependency injection, routing, SSR, accessibility (ARIA), animations, styling (component styles, Tailwind CSS), testing, or CLI tooling.
- **api-connector-builder** — Build a new API connector or provider by matching the target repo's existing integration pattern exactly. Use when adding one more integration without inventing a second architecture.
- **api-design** — REST API design patterns including resource naming, status codes, pagination, filtering, error responses, versioning, and rate limiting for production APIs.
- **architecture-decision-records** — Capture architectural decisions made during Claude Code sessions as structured ADRs. Auto-detects decision moments, records context, alternatives considered, and rationale. Maintains an ADR log so future developers understand why the codebase is shaped the way it is.
- **article-writing** — Write articles, guides, blog posts, tutorials, newsletter issues, and other long-form content in a distinctive voice derived from supplied examples or brand guidance. Use when the user wants polished written content longer than a paragraph, especially when voice consistency, structure, and credibility matter.
- **automation-audit-ops** — Evidence-first automation inventory and overlap audit workflow for ECC. Use when the user wants to know which jobs, hooks, connectors, MCP servers, or wrappers are live, broken, redundant, or missing before fixing anything.
- **autonomous-agent-harness** — Transform Claude Code into a fully autonomous agent system with persistent memory, scheduled operations, computer use, and task queuing. Replaces standalone agent frameworks (Hermes, AutoGPT) by leveraging Claude Code's native crons, dispatch, MCP tools, and memory. Use when the user wants continuous autonomous operation, scheduled tasks, or a self-directing agent loop.
- **autonomous-loops** — Patterns and architectures for autonomous Claude Code loops — from simple sequential pipelines to RFC-driven multi-agent DAG systems.
- **backend-patterns** — Backend architecture patterns, API design, database optimization, and server-side best practices for Node.js, Express, and Next.js API routes.
- **benchmark** — Use this skill to measure performance baselines, detect regressions before/after PRs, and compare stack alternatives.
- **benchmark-methodology** — >-
- **benchmark-optimization-loop** — Use when the user asks to make something faster, try many variants, run recursive optimization, benchmark latency/throughput/cost, or choose the best implementation by repeated measured tests.
- **blender-motion-state-inspection** — Use this skill when inspecting Blender characters, rigs, poses, animation retargeting, ground contact, facing direction, or model-vs-motion alignment where screenshots alone are not enough.
- **blueprint** — >-
- **brand-discovery** — >-
- **brand-voice** — Build a source-derived writing style profile from real posts, essays, launch notes, docs, or site copy, then reuse that profile across content, outreach, and social workflows. Use when the user wants voice consistency without generic AI writing tropes.
- **browser-qa** — Use this skill to automate visual testing and UI interaction verification using browser automation after deploying features.
- **bun-runtime** — Bun as runtime, package manager, bundler, and test runner. When to choose Bun vs Node, migration notes, and Vercel support.
- **canary-watch** — Use this skill to monitor and verify a deployed URL after releases — checks HTTP endpoints, SSE streams, static assets, console errors, and performance regressions after deploys, merges, or dependency upgrades. Smoke / canary / post-deploy verification.
- **carrier-relationship-management** — >
- **cisco-ios-patterns** — Cisco IOS and IOS-XE review patterns for show commands, config hierarchy, wildcard masks, ACL placement, interface hygiene, and safe change-window verification.
- **ck** — Persistent per-project memory for Claude Code. Auto-loads project context on session start, tracks sessions with git activity, and writes to native memory. Commands run deterministic Node.js scripts — behavior is consistent across model versions.
- **claude-devfleet** — Orchestrate multi-agent coding tasks via Claude DevFleet — plan projects, dispatch parallel agents in isolated worktrees, monitor progress, and read structured reports.
- **click-path-audit** — Trace every user-facing button/touchpoint through its full state change sequence to find bugs where functions individually work but cancel each other out, produce wrong final state, or leave the UI in an inconsistent state. Use when: systematic debugging found no bugs but users report broken buttons, or after any major refactor touching shared state stores.
- **clickhouse-io** — ClickHouse database patterns, query optimization, analytics, and data engineering best practices for high-performance analytical workloads.
- **code-tour** — Create CodeTour `.tour` files — persona-targeted, step-by-step walkthroughs with real file and line anchors. Use for onboarding tours, architecture walkthroughs, PR tours, RCA tours, and structured "explain how this works" requests.
- **codebase-onboarding** — Analyze an unfamiliar codebase and generate a structured onboarding guide with architecture map, key entry points, conventions, and a starter CLAUDE.md. Use when joining a new project or setting up Claude Code for the first time in a repo.
- **codehealth-mcp** — Real-time structural Code Health via CodeScene MCP — review before edits, verify score deltas after changes, gate commits and PRs. Use when reviewing code quality, refactoring, checking if AI changes degraded a file, or before commit/PR.
- **coding-standards** — Baseline cross-project coding conventions for naming, readability, immutability, and code-quality review. Use detailed frontend or backend skills for framework-specific patterns.
- **competitive-platform-analysis** — >-
- **competitive-report-structure** — >-
- **compose-multiplatform-patterns** — Compose Multiplatform and Jetpack Compose patterns for KMP projects — state management, navigation, theming, performance, and platform-specific UI.
- **config-gc** — Garbage collection for your Claude Code configuration. Periodically scans ~/.claude (skills, memory, hooks, permissions, MCP servers, caches) for redundant, stale, orphaned, or low-value items, then walks the user through a confirm-each-deletion cleanup. Use when the user says "clean up my config", "config GC", "too many skills", "audit my setup", "my .claude is bloated", or asks for a periodic config review.
- **configure-ecc** — Interactive installer for Everything Claude Code — guides users through selecting and installing skills and rules to user-level or project-level directories, verifies paths, and optionally optimizes installed files.
- **connections-optimizer** — Reorganize the user's X and LinkedIn network with review-first pruning, add/follow recommendations, and channel-specific warm outreach drafted in the user's real voice. Use when the user wants to clean up following lists, grow toward current priorities, or rebalance a social graph around higher-signal relationships.
- **content-engine** — Create platform-native content systems for X, LinkedIn, TikTok, YouTube, newsletters, and repurposed multi-platform campaigns. Use when the user wants social posts, threads, scripts, content calendars, or one source asset adapted cleanly across platforms.
- **content-hash-cache-pattern** — Cache expensive file processing results using SHA-256 content hashes — path-independent, auto-invalidating, with service layer separation.
- **context-budget** — Audits Claude Code context window consumption across agents, skills, MCP servers, and rules. Identifies bloat, redundant components, and produces prioritized token-savings recommendations.
- **continuous-agent-loop** — Patterns for continuous autonomous agent loops with quality gates, evals, and recovery controls.
- **continuous-learning** — [DEPRECATED - use continuous-learning-v2] Legacy v1 stop-hook skill extractor. v2 is a strict superset with instinct-based, project-scoped, hook-reliable learning. Do not invoke v1; route continuous learning, session learning, and pattern extraction requests to continuous-learning-v2.
- **continuous-learning-v2** — Instinct-based learning system that observes sessions via hooks, creates atomic instincts with confidence scoring, and evolves them into skills/commands/agents. v2.1 adds project-scoped instincts to prevent cross-project contamination.
- **cost-aware-llm-pipeline** — Cost optimization patterns for LLM API usage — model routing by task complexity, budget tracking, retry logic, and prompt caching.
- **cost-tracking** — Track and report Claude Code token usage, spending, and budgets from the local ECC cost-tracker metrics log. Use when the user asks about costs, spending, usage, tokens, budgets, or cost breakdowns by model, session, or date.
- **council** — Convene a four-voice council for ambiguous decisions, tradeoffs, and go/no-go calls. Use when multiple valid paths exist and you need structured disagreement before choosing.
- **cpp-coding-standards** — C++ coding standards based on the C++ Core Guidelines (isocpp.github.io). Use when writing, reviewing, or refactoring C++ code to enforce modern, safe, and idiomatic practices.
- **cpp-testing** — Use only when writing/updating/fixing C++ tests, configuring GoogleTest/CTest, diagnosing failing or flaky tests, or adding coverage/sanitizers.
- **crosspost** — Multi-platform content distribution across X, LinkedIn, Threads, and Bluesky. Adapts content per platform using content-engine patterns. Never posts identical content cross-platform. Use when the user wants to distribute content across social platforms.
- **csharp-testing** — C# and .NET testing patterns with xUnit, FluentAssertions, mocking, integration tests, and test organization best practices.
- **customer-billing-ops** — Operate customer billing workflows such as subscriptions, refunds, churn triage, billing-portal recovery, and plan analysis using connected billing tools like Stripe. Use when the user needs to help a customer, inspect subscription state, or manage revenue-impacting billing operations.
- **customs-trade-compliance** — >
- **dart-flutter-patterns** — Production-ready Dart and Flutter patterns covering null safety, immutable state, async composition, widget architecture, popular state management frameworks (BLoC, Riverpod, Provider), GoRouter navigation, Dio networking, Freezed code generation, and clean architecture.
- **dashboard-builder** — Build monitoring dashboards that answer real operator questions for Grafana, SigNoz, and similar platforms. Use when turning metrics into a working dashboard instead of a vanity board.
- **data-scraper-agent** — Build a fully automated AI-powered data collection agent for any public source — job boards, prices, news, GitHub, sports, anything. Runs on a schedule, enriches data with a free LLM (Gemini Flash), stores results in Notion/Sheets/Supabase, and learns from user feedback. Runs 100% free on GitHub Actions. Use when the user wants to monitor, collect, or track any public data automatically.
- **data-throughput-accelerator** — Use when large data ingestion, backfill, export, ETL, warehouse loading, manifest catch-up, or table synchronization needs to become much faster while preserving data correctness.
- **database-migrations** — Database migration best practices for schema changes, data migrations, rollbacks, and zero-downtime deployments across PostgreSQL, MySQL, and common ORMs (Prisma, Drizzle, Kysely, Django, TypeORM, golang-migrate).
- **deep-research** — Multi-source deep research using firecrawl and exa MCPs. Searches the web, synthesizes findings, and delivers cited reports with source attribution. Use when the user wants thorough research on any topic with evidence and citations.
- **defi-amm-security** — Security checklist for Solidity AMM contracts, liquidity pools, and swap flows. Covers reentrancy, CEI ordering, donation or inflation attacks, oracle manipulation, slippage, admin controls, and integer math.
- **delivery-gate** — Stop hook that blocks Claude from finishing until quality checks pass. Detects rationalization patterns (surface text heuristics), stale learning logs (filesystem mtime), and low disk space. Complements self-audit by mechanically enforcing learning capture habits.
- **deployment-patterns** — Deployment workflows, CI/CD pipeline patterns, Docker containerization, health checks, rollback strategies, and production readiness checklists for web applications.
- **design-system** — Use this skill to generate or audit design systems, check visual consistency, and review PRs that touch styling.
- **django-celery** — Django + Celery async task patterns — configuration, task design, beat scheduling, retries, canvas workflows, monitoring, and testing. Use when adding background jobs, scheduled tasks, or async processing to a Django app.
- **django-patterns** — Django architecture patterns, REST API design with DRF, ORM best practices, caching, signals, middleware, and production-grade Django apps.
- **django-security** — Django security best practices, authentication, authorization, CSRF protection, SQL injection prevention, XSS prevention, and secure deployment configurations.
- **django-tdd** — Django testing strategies with pytest-django, TDD methodology, factory_boy, mocking, coverage, and testing Django REST Framework APIs.
- **django-verification** — Verification loop for Django projects: migrations, linting, tests with coverage, security scans, and deployment readiness checks before release or PR.
- **dmux-workflows** — Multi-agent orchestration using dmux (tmux pane manager for AI agents). Patterns for parallel agent workflows across Claude Code, Codex, OpenCode, and other harnesses. Use when running multiple agent sessions in parallel or coordinating multi-agent development workflows.
- **docker-patterns** — Docker and Docker Compose patterns for local development, container security, networking, volume strategies, and multi-service orchestration.
- **documentation-lookup** — Use up-to-date library and framework docs via Context7 MCP instead of training data. Activates for setup questions, API references, code examples, or when the user names a framework (e.g. React, Next.js, Prisma).
- **dotnet-patterns** — Idiomatic C# and .NET patterns, conventions, dependency injection, async/await, and best practices for building robust, maintainable .NET applications.
- **dynamic-workflow-mode** — Design task-local harnesses, eval gates, and reusable skill extraction for Claude dynamic workflow mode and other adaptive agent harnesses.
- **e2e-testing** — Playwright E2E testing patterns, Page Object Model, configuration, CI/CD integration, artifact management, and flaky test strategies.
- **ecc-guide** — Guide users through ECC's current agents, skills, commands, hooks, rules, install profiles, and project onboarding by reading the live repository surface before answering.
- **ecc-recipes** — Map a described workflow to the right ECC command-GROUP with run-order and stop condition, and browse all command-group recipe families. Adds a family-grouping + run-order + when-to-stop layer on top of the flat command catalog. Advisory only. TRIGGER when the user says which commands for X, what command group runs X, show ECC recipes, list ECC pipelines, or how do I run a workflow with ECC. DO NOT TRIGGER when the user wants the task executed directly, wants a single-command deep doc (use ecc-guide), or wants a draft prompt rewritten (use prompt-optimizer).
- **ecc-tools-cost-audit** — Evidence-first ECC Tools burn and billing audit workflow. Use when investigating runaway PR creation, quota bypass, premium-model leakage, duplicate jobs, or GitHub App cost spikes in the ECC Tools repo.
- **email-ops** — Evidence-first mailbox triage, drafting, send verification, and sent-mail-safe follow-up workflow for ECC. Use when the user wants to organize email, draft or send through the real mail surface, or prove what landed in Sent.
- **energy-procurement** — >
- **enterprise-agent-ops** — Operate long-lived agent workloads with observability, security boundaries, and lifecycle management.
- **error-handling** — Patterns for robust error handling across TypeScript, Python, and Go. Covers typed errors, error boundaries, retries, circuit breakers, and user-facing error messages.
- **eval-harness** — Formal evaluation framework for Claude Code sessions implementing eval-driven development (EDD) principles
- **evm-token-decimals** — Prevent silent decimal mismatch bugs across EVM chains. Covers runtime decimal lookup, chain-aware caching, bridged-token precision drift, and safe normalization for bots, dashboards, and DeFi tools.
- **exa-search** — Neural search via Exa MCP for web, code, and company research. Use when the user needs web search, code examples, company intel, people lookup, or AI-powered deep research with Exa's neural search engine.
- **fal-ai-media** — Unified media generation via fal.ai MCP — image, video, and audio. Covers text-to-image (Nano Banana), text/image-to-video (Seedance, Kling, Veo 3), text-to-speech (CSM-1B), and video-to-audio (ThinkSound). Use when the user wants to generate images, videos, or audio with AI.
- **fastapi-patterns** — FastAPI best practices covering project structure, Pydantic v2 schemas, dependency injection, async handlers, authentication, authorization, transactional service layers, and testing with httpx and pytest.
- **finance-billing-ops** — Evidence-first revenue, pricing, refunds, team-billing, and billing-model truth workflow for ECC. Use when the user wants a sales snapshot, pricing comparison, duplicate-charge diagnosis, or code-backed billing reality instead of generic payments advice.
- **flox-environments** — Create reproducible, cross-platform (macOS/Linux) development environments with Flox, a declarative Nix-based environment manager. Use when setting up project toolchains for any language, installing system-level dependencies (compilers, databases, native libs like openssl/BLAS), pinning exact package versions for a team, running local services (PostgreSQL, Redis, Kafka), onboarding developers with one command, or solving 'works on my machine' problems — including agent/vibe-coding setups that need project-scoped tools without sudo. Also use when the user mentions .flox/, manifest.toml, flox activate, or FloxHub.
- **flutter-dart-code-review** — Library-agnostic Flutter/Dart code review checklist covering widget best practices, state management patterns (BLoC, Riverpod, Provider, GetX, MobX, Signals), Dart idioms, performance, accessibility, security, and clean architecture.
- **foundation-models-on-device** — Apple FoundationModels framework for on-device LLM — text generation, guided generation with @Generable, tool calling, and snapshot streaming in iOS 26+.
- **frontend-a11y** — >
- **frontend-design-direction** — Set an ECC-specific frontend design direction for production UI work. Use when building or improving websites, dashboards, applications, components, landing pages, visual tools, or any web UI that needs stronger product-specific design judgment.
- **frontend-patterns** — Frontend development patterns for React, Next.js, state management, performance optimization, and UI best practices.
- **frontend-slides** — Create stunning, animation-rich HTML presentations from scratch or by converting PowerPoint files. Use when the user wants to build a presentation, convert a PPT/PPTX to web, or create slides for a talk/pitch. Helps non-designers discover their aesthetic through visual exploration rather than abstract choices.
- **fsharp-testing** — F# testing patterns with xUnit, FsUnit, Unquote, FsCheck property-based testing, integration tests, and test organization best practices.
- **gan-style-harness** — GAN-inspired Generator-Evaluator agent harness for building high-quality applications autonomously. Based on Anthropic's March 2026 harness design paper.
- **gateguard** — Fact-forcing gate that blocks Edit/Write/Bash (including MultiEdit) and demands concrete investigation (importers, data schemas, user instruction) before allowing the action. Measurably improves output quality by +2.25 points vs ungated agents.
- **generating-python-installer** — Commercial-grade Python installer expert for Windows: Nuitka extreme compilation, dist slimming, DLL footprint analysis, and Inno Setup packaging to ship the smallest, fastest installers. Use only for advanced packaging/optimization (minimal size, fast startup), not basic script-to-exe conversion. 中文触发：Nuitka 极限优化、Python 商业打包、极限编译 Python、dist 瘦身、DLL 分析、最小安装包、最快启动、商业级打包风格
- **git-workflow** — Git workflow patterns including branching strategies, commit conventions, merge vs rebase, conflict resolution, and collaborative development best practices for teams of all sizes.
- **github-ops** — GitHub repository operations, automation, and management. Issue triage, PR management, CI/CD operations, release management, and security monitoring using the gh CLI. Use when the user wants to manage GitHub issues, PRs, CI status, releases, contributors, stale items, or any GitHub operational task beyond simple git commands.
- **golang-patterns** — Idiomatic Go patterns, best practices, and conventions for building robust, efficient, and maintainable Go applications.
- **golang-testing** — Go testing patterns including table-driven tests, subtests, benchmarks, fuzzing, and test coverage. Follows TDD methodology with idiomatic Go practices.
- **google-workspace-ops** — Operate across Google Drive, Docs, Sheets, and Slides as one workflow surface for plans, trackers, decks, and shared documents. Use when the user needs to find, summarize, edit, migrate, or clean up Google Workspace assets without dropping to raw tool calls.
- **growth-log** — Use after a complex task, failure, or when reviewing what was learned. Teaches how to write growth logs that extract reusable patterns — not diary entries.
- **healthcare-cdss-patterns** — Clinical Decision Support System (CDSS) development patterns. Drug interaction checking, dose validation, clinical scoring (NEWS2, qSOFA), alert severity classification, and integration into EMR workflows.
- **healthcare-emr-patterns** — EMR/EHR development patterns for healthcare applications. Clinical safety, encounter workflows, prescription generation, clinical decision support integration, and accessibility-first UI for medical data entry.
- **healthcare-eval-harness** — Patient safety evaluation harness for healthcare application deployments. Automated test suites for CDSS accuracy, PHI exposure, clinical workflow integrity, and integration compliance. Blocks deployments on safety failures.
- **healthcare-phi-compliance** — Protected Health Information (PHI) and Personally Identifiable Information (PII) compliance patterns for healthcare applications. Covers data classification, access control, audit trails, encryption, and common leak vectors.
- **hermes-imports** — Convert local Hermes operator workflows into sanitized ECC skills and release-pack artifacts. Use when preparing a Hermes workflow for public ECC reuse without leaking private workspace state, credentials, or local-only paths.
- **hexagonal-architecture** — Design, implement, and refactor Ports & Adapters systems with clear domain boundaries, dependency inversion, and testable use-case orchestration across TypeScript, Java, Kotlin, and Go services.
- **hipaa-compliance** — HIPAA-specific entrypoint for healthcare privacy and security work. Use when a task is explicitly framed around HIPAA, PHI handling, covered entities, BAAs, breach posture, or US healthcare compliance requirements.
- **homelab-network-readiness** — Readiness checklist for homelab VLAN segmentation, local DNS filtering, and WireGuard-style remote access before changing router, firewall, DHCP, or VPN configuration.
- **homelab-network-setup** — Practical home and homelab network planning for gateways, switches, access points, IP ranges, DHCP reservations, DNS, cabling, and common beginner mistakes.
- **homelab-pihole-dns** — Pi-hole installation, blocklist management, DNS-over-HTTPS setup, DHCP integration, local DNS records, and troubleshooting broken DNS resolution on a home network.
- **homelab-vlan-segmentation** — Segmenting home networks into VLANs for IoT, guest, trusted, and server traffic using UniFi, pfSense/OPNsense, and MikroTik — including switch trunk config, firewall rules, and wireless SSID mapping.
- **homelab-wireguard-vpn** — WireGuard VPN server setup, peer configuration, key generation, split tunneling vs full tunnel routing, and remote access to a home network from mobile and laptop clients.
- **hookify-rules** — This skill should be used when the user asks to create a hookify rule, write a hook rule, configure hookify, add a hookify rule, or needs guidance on hookify rule syntax and patterns.
- **inherit-legacy-style** — Legacy-project style inheritance skill. Use when the user types /inherit-legacy-style, or when onboarding an AI coding agent onto a hand-written legacy project and you need to prevent "style drift" (the model imposing its pretrained mainstream idioms onto the project). Language- and framework-agnostic — it aligns meta-architecture only, not syntax. Once run, it becomes a behavioral constraint on all subsequent coding tasks. Do NOT use for pure research or one-off questions unrelated to code-style alignment.
- **intent-driven-development** — Turn ambiguous or high-impact product and engineering changes into scoped, verifiable acceptance criteria before or alongside implementation. Use when a user asks to clarify a feature, define acceptance criteria, de-risk a security/data/migration/integration change, prepare implementation requirements for another agent, or make a complex request testable. Do not trigger for trivial edits, straightforward fixes, active debugging, code review, or implementation requests whose acceptance conditions are already clear unless the user explicitly invokes this skill.
- **inventory-demand-planning** — >
- **investor-materials** — Create and update pitch decks, one-pagers, investor memos, accelerator applications, financial models, and fundraising materials. Use when the user needs investor-facing documents, projections, use-of-funds tables, milestone plans, or materials that must stay internally consistent across multiple fundraising assets.
- **investor-outreach** — Draft cold emails, warm intro blurbs, follow-ups, update emails, and investor communications for fundraising. Use when the user wants outreach to angels, VCs, strategic investors, or accelerators and needs concise, personalized, investor-facing messaging.
- **ios-icon-gen** — Generate iOS app icons as PNG imagesets for Xcode asset catalogs from SF Symbols (5000+ Apple-native) or Iconify API (275k+ open source icons from 200+ collections). Use when generating icons, creating icon assets, adding icons to asset catalog, or searching for icons for iOS projects.
- **iterative-retrieval** — Pattern for progressively refining context retrieval to solve the subagent context problem
- **ito-basket-compare** — Compare Itô prediction-market baskets against a user's knowledge base, portfolio notes, financial context, watchlist, or research thesis. Use for read-only basket comparison and gap analysis without investment advice or live trading.
- **ito-data-atlas-agent** — Design background Data Atlas style agents for Itô basket research, market discovery, parameter drafting, and human-in-the-loop editing. Use for architecture and workflow planning, not live order execution.
- **ito-market-intelligence** — Research prediction-market events, venues, underliers, liquidity, and news context for Itô basket workflows. Use for read-only market intelligence, API-gated Itô exploration, and source-grounded prediction-market briefings without investment advice or live trading.
- **ito-trade-planner** — Build a non-advisory prediction-market trade planning worksheet for Itô or venue workflows. Use to inspect venues, underliers, constraints, order prerequisites, and manual execution steps without placing trades or recommending positions.
- **java-coding-standards** — Java coding standards for Spring Boot and Quarkus services: naming, immutability, Optional usage, streams, exceptions, generics, CDI, reactive patterns, and project layout. Automatically applies framework-specific conventions.
- **jira-integration** — Use this skill when retrieving Jira tickets, analyzing requirements, updating ticket status, adding comments, or transitioning issues. Provides Jira API patterns via MCP or direct REST calls.
- **jpa-patterns** — JPA/Hibernate patterns for entity design, relationships, query optimization, transactions, auditing, indexing, pagination, and pooling in Spring Boot.
- **knowledge-ops** — Knowledge base management, ingestion, sync, and retrieval across multiple storage layers (local files, MCP memory, vector stores, Git repos). Use when the user wants to save, organize, sync, deduplicate, or search across their knowledge systems.
- **kotlin-coroutines-flows** — Kotlin Coroutines and Flow patterns for Android and KMP — structured concurrency, Flow operators, StateFlow, error handling, and testing.
- **kotlin-exposed-patterns** — JetBrains Exposed ORM patterns including DSL queries, DAO pattern, transactions, HikariCP connection pooling, Flyway migrations, and repository pattern.
- **kotlin-ktor-patterns** — Ktor server patterns including routing DSL, plugins, authentication, Koin DI, kotlinx.serialization, WebSockets, and testApplication testing.
- **kotlin-patterns** — Idiomatic Kotlin patterns, best practices, and conventions for building robust, efficient, and maintainable Kotlin applications with coroutines, null safety, and DSL builders.
- **kotlin-testing** — Kotlin testing patterns with Kotest, MockK, coroutine testing, property-based testing, and Kover coverage. Follows TDD methodology with idiomatic Kotlin practices.
- **kubernetes-patterns** — Kubernetes workload patterns, resource management, RBAC, probes, autoscaling, ConfigMap/Secret handling, and kubectl debugging for production-grade deployments.
- **laravel-patterns** — Laravel architecture patterns, routing/controllers, Eloquent ORM, service layers, queues, events, caching, and API resources for production apps.
- **laravel-plugin-discovery** — Discover and evaluate Laravel packages via LaraPlugins.io MCP. Use when the user wants to find plugins, check package health, or assess Laravel/PHP compatibility.
- **laravel-security** — Laravel security best practices — authentication, authorization, Eloquent safety, CSRF, XSS prevention, API security, and secure deployment configurations.
- **laravel-tdd** — Laravel testing strategies with PHPUnit, Pest, model factories, HTTP tests, Sanctum authentication testing, mocking, and coverage.
- **laravel-verification** — Verification loop for Laravel projects: env checks, linting, static analysis, tests with coverage, security scans, and deployment readiness.
- **latency-critical-systems** — Use for latency-sensitive systems such as realtime dashboards, market data, streaming agents, execution gateways, queues, caches, or HFT-like infrastructure where freshness and p95 latency matter.
- **lead-intelligence** — AI-native lead intelligence and outreach pipeline. Replaces Apollo, Clay, and ZoomInfo with agent-powered signal scoring, mutual ranking, warm path discovery, source-derived voice modeling, and channel-specific outreach across email, LinkedIn, and X. Use when the user wants to find, qualify, and reach high-value contacts.
- **liquid-glass-design** — iOS 26 Liquid Glass design system — dynamic glass material with blur, reflection, and interactive morphing for SwiftUI, UIKit, and WidgetKit.
- **llm-trading-agent-security** — Security patterns for autonomous trading agents with wallet or transaction authority. Covers prompt injection, spend limits, pre-send simulation, circuit breakers, MEV protection, and key handling.
- **logistics-exception-management** — >
- **loop-design-check** — Design a goal-oriented agent loop, and review it for the ways loops go wrong — spinning and burning tokens, Goodhart-gaming the verifier, or running a wrong answer to completion. Two actions: (1) WRITE a loop — gate whether to build it, define a machine-decidable goal, pick the loop type, pick a skeleton; (2) REVIEW a loop — run it past five failure modes plus decidability, boundaries, fallback, judge independence, and keep-judgment-with-the-human red lines. Use when designing an autonomous agent loop, or when you already have one and worry it will spin, cheat, or run a wrong answer to the end. Complements the mechanism-layer loop skills (autonomous-loops, continuous-agent-loop) by covering the judgment layer they don't. 中文触发：写 loop、设计 loop、做一个 loop、检查 loop 对不对、loop 体检、loop 会不会跑飞、可判定目标、五个崩法、plan build judge。English triggers: design an agent loop, write a loop, check a loop, loop review, prevent a runaway loop, goal-oriented loop, decidable goal, plan/build/judge.
- **mailtrap-email-integration** — Guides agents through integrating transactional email sending via Mailtrap's Email API, including sandbox testing, domain verification, and API authentication. Use when implementing email-sending features, debugging delivery issues, or setting up safe dev/staging email testing.
- **make-interfaces-feel-better** — Apply concrete design-engineering details that make interfaces feel polished. Use when reviewing or improving UI spacing, typography, borders, shadows, motion, hit areas, icons, text wrapping, and interaction states.
- **manim-video** — Build reusable Manim explainers for technical concepts, graphs, system diagrams, and product walkthroughs, then hand off to the wider ECC video stack if needed. Use when the user wants a clean animated explainer rather than a generic talking-head script.
- **market-research** — Conduct market research, competitive analysis, investor due diligence, and industry intelligence with source attribution and decision-oriented summaries. Use when the user wants market sizing, competitor comparisons, fund research, technology scans, or research that informs business decisions.
- **marketing-campaign** — End-to-end marketing campaign planning and execution. Covers audience research, positioning, campaign angle definition, landing page copy, email sequences, social posts, ad copy, short-form video scripts, and content calendars. Use as the orchestration layer for multi-channel product launches.
- **mcp-server-patterns** — Build MCP servers with Node/TypeScript SDK — tools, resources, prompts, Zod validation, stdio vs Streamable HTTP. Use Context7 or official MCP docs for latest API.
- **messages-ops** — Evidence-first live messaging workflow for ECC. Use when the user wants to read texts or DMs, recover a recent one-time code, inspect a thread before replying, or prove which message source was actually checked.
- **ml-adoption-playbook** — End-to-end methodology for AI agents and software engineers to add machine learning algorithms to existing non-ML codebases. Covers problem framing, data readiness, architectural decoupling, and baseline model integration.
- **mle-workflow** — Production machine-learning engineering workflow for data contracts, reproducible training, model evaluation, deployment, monitoring, and rollback. Use when building, reviewing, or hardening ML systems beyond one-off notebooks.
- **motion-advanced** — Advanced motion patterns for React / Next.js — drag & drop, gestures, text animations, SVG path drawing, custom hooks, imperative sequences (useAnimate), loaders, and the full API decision tree. Requires motion-foundations.
- **motion-foundations** — Motion tokens, spring presets, performance rules, device adaptation, accessibility enforcement, and SSR safety for React / Next.js using motion/react. Foundation layer — all other motion skills depend on this.
- **motion-patterns** — Production-ready animation patterns for React / Next.js — button, modal, toast, stagger, page transitions, exit animations, scroll, and layout — built on motion-foundations tokens and springs.
- **motion-ui** — Production-ready UI motion system for React/Next.js. Use when implementing animations, transitions, or motion patterns.
- **mysql-patterns** — MySQL and MariaDB schema, query, indexing, transaction, replication, and connection-pool patterns for production backends.
- **nanoclaw-repl** — Operate and extend NanoClaw v2, ECC's zero-dependency session-aware REPL built on claude -p.
- **nestjs-patterns** — NestJS architecture patterns for modules, controllers, providers, DTO validation, guards, interceptors, config, and production-grade TypeScript backends.
- **netmiko-ssh-automation** — Safe Python Netmiko patterns for read-only collection, bounded batch SSH, TextFSM parsing, guarded config changes, timeouts, and network automation error handling.
- **network-bgp-diagnostics** — Diagnostics-only BGP troubleshooting patterns for neighbor state, route exchange, prefix policy, AS path inspection, and safe evidence collection.
- **network-config-validation** — Pre-deployment checks for router and switch configuration, including dangerous commands, duplicate addresses, subnet overlaps, stale references, management-plane risk, and IOS-style security hygiene.
- **network-interface-health** — Diagnose interface errors, drops, CRCs, duplex mismatches, flapping, speed negotiation issues, and counter trends on routers, switches, and Linux hosts.
- **nextjs-turbopack** — Next.js 16+ and Turbopack — incremental bundling, FS caching, dev speed, and when to use Turbopack vs webpack.
- **nodejs-keccak256** — Prevent Ethereum hashing bugs in JavaScript and TypeScript. Node's sha3-256 is NIST SHA3, not Ethereum Keccak-256, and silently breaks selectors, signatures, storage slots, and address derivation.
- **nutrient-document-processing** — Process, convert, OCR, extract, redact, sign, and fill documents using the Nutrient DWS API. Works with PDFs, DOCX, XLSX, PPTX, HTML, and images.
- **nuxt4-patterns** — Nuxt 4 app patterns for hydration safety, performance, route rules, lazy loading, and SSR-safe data fetching with useFetch and useAsyncData.
- **openclaw-persona-forge** — 为 OpenClaw AI Agent 锻造完整的龙虾灵魂方案。根据用户偏好或随机抽卡， 输出身份定位、灵魂描述(SOUL.md)、角色化底线规则、名字和头像生图提示词。 如当前环境提供已审核的生图 skill，可自动生成统一风格头像图片。 当用户需要创建、设计或定制 OpenClaw 龙虾灵魂时使用。 不适用于：微调已有 SOUL.md、非 OpenClaw 平台的角色设计、纯工具型无性格 Agent。 触发词：龙虾灵魂、虾魂、OpenClaw 灵魂、养虾灵魂、龙虾角色、龙虾定位、 龙虾剧本杀角色、龙虾游戏角色、龙虾 NPC、龙虾性格、龙虾背景故事、 lobster soul、lobster character、抽卡、随机龙虾、龙虾 SOUL、gacha。
- **opensource-pipeline** — Open-source pipeline: fork, sanitize, and package private projects for safe public release. Chains 3 agents (forker, sanitizer, packager). Triggers: '/opensource', 'open source this', 'make this public', 'prepare for open source'.
- **orch-add-feature** — Orchestrate building a brand-new feature end to end — research, plan, TDD implementation, review, and gated commit — by delegating each phase to the matching ECC agent. Use when adding a capability that does not exist yet.
- **orch-build-mvp** — Orchestrate bootstrapping a working MVP from a design or spec document — ingest the doc, plan thin vertical slices, scaffold the first end-to-end slice, then TDD-implement, review, and gated commit. Use to turn an SDD/PRD into a running starting point.
- **orch-change-feature** — Orchestrate altering an existing, working feature to new desired behavior — update its tests to the new spec, change the implementation to match, review, and gated commit. Use when behavior is not broken but should be different.
- **orch-fix-defect** — Orchestrate fixing a bug — reproduce it as a failing regression test, fix to green, review, and gated commit — by delegating each phase to the matching ECC agent. Use when existing behavior is broken or wrong.
- **orch-pipeline** — Shared orchestration engine for the orch-* skill family. Defines the gated Research-Plan-TDD-Review-Commit pipeline, the size classifier, the agent map, and the two human gates that the orch-* operation skills delegate to. Not usually invoked directly.
- **orch-refine-code** — Orchestrate a behavior-preserving refactor — confirm tests are green, restructure without changing behavior, keep tests green, review, and gated commit. Use when the structure should improve but behavior must not change.
- **parallel-execution-optimizer** — Use when the user wants a task done much faster through parallel work, concurrent agents, batched tool calls, isolated worktrees, or many independent verification lanes without losing correctness.
- **perl-patterns** — Modern Perl 5.36+ idioms, best practices, and conventions for building robust, maintainable Perl applications.
- **perl-security** — Comprehensive Perl security covering taint mode, input validation, safe process execution, DBI parameterized queries, web security (XSS/SQLi/CSRF), and perlcritic security policies.
- **perl-testing** — Perl testing patterns using Test2::V0, Test::More, prove runner, mocking, coverage with Devel::Cover, and TDD methodology.
- **plan-canvas** — Open plans and HTML artifacts in a local browser canvas where the human annotates elements, chats, and approves or requests changes without leaving the page. Use when presenting a plan for review, or when feedback like "move this, change that" is easier pointed at than typed.
- **plan-orchestrate** — Read a plan document, decompose it into steps, design a per-step agent chain from the ECC catalogue, and emit ready-to-paste /orchestrate custom prompts. Generative only — never invokes /orchestrate itself. Use when the user has a multi-step plan and wants to drive it through orchestrate without composing chains by hand.
- **plankton-code-quality** — Write-time code quality enforcement using Plankton — auto-formatting, linting, and Claude-powered fixes on every file edit via hooks.
- **postgres-patterns** — PostgreSQL database patterns for query optimization, schema design, indexing, and security. Based on Supabase best practices.
- **prediction-market-oracle-research** — Research prediction markets as data sources or oracle signals for products, agents, dashboards, and corporate decision intelligence. Use for source-grounded analysis of market-implied probabilities, caveats, and integration patterns without investment advice.
- **prediction-market-risk-review** — Review prediction-market, basket, oracle, and trading-agent workflows for compliance, safety, data-quality, privacy, and execution risk. Use before any workflow handles venue auth, user portfolio data, API keys, or trade planning.
- **prisma-patterns** — Prisma ORM patterns for TypeScript backends — schema design, query optimization, transactions, pagination, and critical traps like updateMany returning count not records, $transaction timeouts, migrate dev resetting the DB, @updatedAt skipped on bulk writes, and serverless connection exhaustion.
- **product-capability** — Translate PRD intent, roadmap asks, or product discussions into an implementation-ready capability plan that exposes constraints, invariants, interfaces, and unresolved decisions before multi-service work starts. Use when the user needs an ECC-native PRD-to-SRS lane instead of vague planning prose.
- **product-lens** — Use this skill to validate the "why" before building, run product diagnostics, and pressure-test product direction before the request becomes an implementation contract.
- **production-audit** — Local-evidence production readiness audit for shipped apps, pre-launch reviews, post-merge checks, and "what breaks in prod?" questions without sending repo data to an external audit service.
- **production-scheduling** — >
- **project-flow-ops** — Operate execution flow across GitHub and Linear by triaging issues and pull requests, linking active work, and keeping GitHub public-facing while Linear remains the internal execution layer. Use when the user wants backlog control, PR triage, or GitHub-to-Linear coordination.
- **prompt-optimizer** — >-
- **python-patterns** — Pythonic idioms, PEP 8 standards, type hints, and best practices for building robust, efficient, and maintainable Python applications.
- **python-testing** — Python testing strategies using pytest, TDD methodology, fixtures, mocking, parametrization, and coverage requirements.
- **pytorch-patterns** — PyTorch deep learning patterns and best practices for building robust, efficient, and reproducible training pipelines, model architectures, and data loading.
- **quality-nonconformance** — >
- **quarkus-patterns** — Quarkus 3.x LTS architecture patterns with Camel for messaging, RESTful API design, CDI services, data access with Panache, and async processing. Use for Java Quarkus backend work with event-driven architectures.
- **quarkus-security** — Quarkus Security best practices for authentication, authorization, JWT/OIDC, RBAC, input validation, CSRF, secrets management, and dependency security.
- **quarkus-tdd** — Test-driven development for Quarkus 3.x LTS using JUnit 5, Mockito, REST Assured, Camel testing, and JaCoCo. Use when adding features, fixing bugs, or refactoring event-driven services.
- **quarkus-verification** — Verification loop for Quarkus projects: build, static analysis, tests with coverage, security scans, native compilation, and diff review before release or PR.
- **ralphinho-rfc-pipeline** — RFC-driven multi-agent DAG execution pattern with quality gates, merge queues, and work unit orchestration.
- **react-native-patterns** — React Native and Expo app patterns — Expo Router navigation, state separation (server/client/route/form), TanStack Query data fetching with Zod, performant lists, NativeWind/StyleSheet styling, native APIs, and secure storage. Use when building or editing React Native / Expo screens, components, navigation, or data layers.
- **react-patterns** — React 18/19 patterns including hooks discipline, server/client component boundaries, Suspense + error boundaries, form actions, data fetching, state management decision trees, and accessibility-first composition. Use when writing or reviewing React components.
- **react-performance** — React and Next.js performance optimization patterns adapted from Vercel Engineering's React Best Practices (https://github.com/vercel-labs/agent-skills). Organizes 70+ rules across 8 priority categories — waterfalls, bundle size, server-side, client fetching, re-render, rendering, JS micro-perf, advanced. Use when writing, reviewing, or refactoring React/Next.js code for performance.
- **react-testing** — React component testing with React Testing Library, Vitest/Jest, MSW for network mocking, accessibility assertions with axe, and the decision boundary between component tests and Playwright/Cypress end-to-end runs. Use when writing or fixing tests for React components, hooks, or pages.
- **recsys-pipeline-architect** — Design composable recommendation, ranking, and feed pipelines using the six-stage Source→Hydrator→Filter→Scorer→Selector→SideEffect framework popularized by xAI's open-sourced For You algorithm. Use this skill whenever the user is building any system that picks "the top K items for a (user, context)" — social feeds, content CMSs, RAG rerankers, task prioritizers, notification triage, search reranking, ad ranking.
- **recursive-decision-ledger** — Use when the user asks for repeated rollouts, marked decision processes, high-dimensional search, stochastic optimization, local-optima exploration, ensemble comparison, or recursive reasoning with a visible evidence trail.
- **redis-patterns** — Redis data structure patterns, caching strategies, distributed locks, rate limiting, pub/sub, and connection management for production applications.
- **regex-vs-llm-structured-text** — Decision framework for choosing between regex and LLM when parsing structured text — start with regex, add LLM only for low-confidence edge cases.
- **remotion-video-creation** — Best practices for Remotion - Video creation in React. 29 domain-specific rules covering 3D, animations, audio, captions, charts, transitions, and more.
- **repo-scan** — Cross-stack source code asset audit — classifies every file, detects embedded third-party libraries, and delivers actionable four-level verdicts per module with interactive HTML reports.
- **research-ops** — Evidence-first current-state research workflow for ECC. Use when the user wants fresh facts, comparisons, enrichment, or a recommendation built from current public evidence and any supplied local context.
- **returns-reverse-logistics** — >
- **rules-distill** — Scan skills to extract cross-cutting principles and distill them into rules — append, revise, or create new rule files
- **rust-patterns** — Idiomatic Rust patterns, ownership, error handling, traits, concurrency, and best practices for building safe, performant applications.
- **rust-testing** — Rust testing patterns including unit tests, integration tests, async testing, property-based testing, mocking, and coverage. Follows TDD methodology.
- **safety-guard** — Use this skill to prevent destructive operations when working on production systems or running agents autonomously.
- **santa-method** — Multi-agent adversarial verification with convergence loop. Two independent review agents must both pass before output ships.
- **pubmed-database** — Direct PubMed and NCBI E-utilities search workflows for biomedical literature, MeSH queries, PMID lookup, citation retrieval, and API-backed literature monitoring.
- **uspto-database** — USPTO patent and trademark data workflow for official record lookup, PatentSearch queries, TSDR checks, assignment data, and reproducible IP research logs.
- **gget** — gget CLI and Python workflow for quick genomic database queries, sequence lookup, BLAST-style searches, enrichment checks, and reproducible bioinformatics evidence logs.
- **literature-review** — Systematic literature-review workflow for academic, biomedical, technical, and scientific topics, including search planning, source screening, synthesis, citation checks, and evidence logging.
- **scholar-evaluation** — Structured scholarly-work evaluation for papers, proposals, literature reviews, methods sections, evidence quality, citation support, and research-writing feedback.
- **search-first** — Research-before-coding workflow. Search for existing tools, libraries, and patterns before writing custom code. Invokes the researcher agent.
- **security-bounty-hunter** — Hunt for exploitable, bounty-worthy security issues in repositories. Focuses on remotely reachable vulnerabilities that qualify for real reports instead of noisy local-only findings.
- **security-review** — Use this skill when adding authentication, handling user input, working with secrets, creating API endpoints, or implementing payment/sensitive features. Provides comprehensive security checklist and patterns.
- **security-scan** — Scan your Claude Code configuration (.claude/ directory) for security vulnerabilities, misconfigurations, and injection risks using AgentShield. Checks CLAUDE.md, settings.json, MCP servers, hooks, and agent definitions.
- **seo** — Audit, plan, and implement SEO improvements across technical SEO, on-page optimization, structured data, Core Web Vitals, and content strategy. Use when the user wants better search visibility, SEO remediation, schema markup, sitemap/robots work, or keyword mapping.
- **skill-comply** — Visualize whether skills, rules, and agent definitions are actually followed — auto-generates scenarios at 3 prompt strictness levels, runs agents, classifies behavioral sequences, and reports compliance rates with full tool call timelines
- **skill-scout** — Search existing local, marketplace, GitHub, and web skill sources before creating a new skill. Use when the user wants to create, build, fork, or find a skill for a workflow.
- **skill-stocktake** — Use when auditing Claude skills and commands for quality. Supports Quick Scan (changed skills only) and Full Stocktake modes with sequential subagent batch evaluation.
- **social-graph-ranker** — Weighted social-graph ranking for warm intro discovery, bridge scoring, and network gap analysis across X and LinkedIn. Use when the user wants the reusable graph-ranking engine itself, not the broader outreach or network-maintenance workflow layered on top of it.
- **social-publisher** — Agent-driven scheduling and publishing of social media posts across 13 platforms via SocialClaw. Use when the user wants to publish to X, LinkedIn, Instagram, Facebook Pages, TikTok, Discord, Telegram, YouTube, Reddit, WordPress, or Pinterest — or when managing campaigns, uploading media, or monitoring post delivery status.
- **springboot-patterns** — Spring Boot architecture patterns, REST API design, layered services, data access, caching, async processing, and logging. Use for Java Spring Boot backend work.
- **springboot-security** — Spring Security best practices for authn/authz, validation, CSRF, secrets, headers, rate limiting, and dependency security in Java Spring Boot services.
- **springboot-tdd** — Test-driven development for Spring Boot using JUnit 5, Mockito, MockMvc, Testcontainers, and JaCoCo. Use when adding features, fixing bugs, or refactoring.
- **springboot-verification** — Verification loop for Spring Boot projects: build, static analysis, tests with coverage, security scans, and diff review before release or PR.
- **strategic-compact** — Suggests manual context compaction at logical intervals to preserve context through task phases rather than arbitrary auto-compaction.
- **swift-actor-persistence** — Thread-safe data persistence in Swift using actors — in-memory cache with file-backed storage, eliminating data races by design.
- **swift-concurrency-6-2** — Swift 6.2 Approachable Concurrency — single-threaded by default, @concurrent for explicit background offloading, isolated conformances for main actor types.
- **swift-protocol-di-testing** — Protocol-based dependency injection for testable Swift code — mock file system, network, and external APIs using focused protocols and Swift Testing.
- **swiftui-patterns** — SwiftUI architecture patterns, state management with @Observable, view composition, navigation, performance optimization, and modern iOS/macOS UI best practices.
- **taste** — A creative-direction (taste) layer for music videos and short-form edits in the angelcore / cloud-trance / hyperpop visual family. Distills a named-genre aesthetic vocabulary, a mood + color + light system, and a beat-synced editing grammar, then chains ECC's video skills (video-editing, fal-ai-media, remotion-video-creation, motion-*, content-engine) into one production pipeline. Use when the work is not just making a video function but making it feel intentional, when building a music video, a fancam/edit, a moodboard-driven reel, or when choosing a coherent visual direction for AI-generated b-roll.
- **tdd-workflow** — Use this skill when writing new features, fixing bugs, or refactoring code. Enforces test-driven development with 80%+ coverage including unit, integration, and E2E tests.
- **team-agent-orchestration** — Run team-based orchestration for agent squads using work items, ownership, agent Kanban, merge gates, and control pane handoffs.
- **team-builder** — Interactive agent picker for composing and dispatching parallel teams
- **terminal-ops** — Evidence-first repo execution workflow for ECC. Use when the user wants a command run, a repo checked, a CI failure debugged, or a narrow fix pushed with exact proof of what was executed and verified.
- **tinystruct-patterns** — Expert guidance for developing with the tinystruct Java framework. Use when working on the tinystruct codebase or any project built on tinystruct — including creating Application classes, @Action-mapped routes, unit tests, ActionRegistry, HTTP/CLI dual-mode handling, the built-in HTTP server, the event system, JSON with Builder/Builders, database persistence with AbstractData, POJO generation, Server-Sent Events (SSE), file uploads, and outbound HTTP networking.
- **token-budget-advisor** — >-
- **ui-demo** — Record polished UI demo videos using Playwright. Use when the user asks to create a demo, walkthrough, screen recording, or tutorial video of a web application. Produces WebM videos with visible cursor, natural pacing, and professional feel.
- **ui-to-vue** — Use when the user has UI screenshots or design exports that need batch conversion into Vue 3 components, especially with Vant, Element Plus, or Ant Design Vue.
- **uncloud** — Use when managing an Uncloud cluster — deploying services, configuring Caddy ingress, adding static proxy routes for non-cluster devices, publishing ports, scaling, inspecting logs, or managing machines and volumes with the `uc` CLI.
- **unified-notifications-ops** — Operate notifications as one ECC-native workflow across GitHub, Linear, desktop alerts, hooks, and connected communication surfaces. Use when the real problem is alert routing, deduplication, escalation, or inbox collapse.
- **verification-loop** — A comprehensive verification system for Claude Code sessions.
- **video-editing** — AI-assisted video editing workflows for cutting, structuring, and augmenting real footage. Covers the full pipeline from raw capture through FFmpeg, Remotion, ElevenLabs, fal.ai, and final polish in Descript or CapCut. Use when the user wants to edit video, cut footage, create vlogs, or build video content.
- **videodb** — See, Understand, Act on video and audio. See- ingest from local files, URLs, RTSP/live feeds, or live record desktop; return realtime context and playable stream links. Understand- extract frames, build visual/semantic/temporal indexes, and search moments with timestamps and auto-clips. Act- transcode and normalize (codec, fps, resolution, aspect ratio), perform timeline edits (subtitles, text/image overlays, branding, audio overlays, dubbing, translation), generate media assets (image, audio, video), and create real time alerts for events from live streams or desktop capture.
- **visa-doc-translate** — Translate visa application documents (images) to English and create a bilingual PDF with original and translation
- **vite-patterns** — Vite build tool patterns including config, plugins, HMR, env variables, proxy setup, SSR, library mode, dependency pre-bundling, and build optimization. Activate when working with vite.config.ts, Vite plugins, or Vite-based projects.
- **vue-patterns** — Vue.js 3 Composition API patterns, component architecture, reactivity best practices, Pinia state management, Vue Router navigation, and Nuxt SSR patterns. Activates for Vue, Nuxt, Vite, or Pinia projects.
- **windows-desktop-e2e** — E2E testing for Windows native desktop apps (WPF, WinForms, Win32/MFC, Qt) using pywinauto and Windows UI Automation.
- **workspace-surface-audit** — Audit the active repo, MCP servers, plugins, connectors, env surfaces, and harness setup, then recommend the highest-value ECC-native skills, hooks, agents, and operator workflows. Use when the user wants help setting up Claude Code or understanding what capabilities are actually available in their environment.
- **x-api** — X/Twitter API integration for posting tweets, threads, reading timelines, search, and analytics. Covers OAuth auth patterns, rate limits, and platform-native content posting. Use when the user wants to interact with X programmatically.

Tool-specific implementations live alongside this file (see `CLAUDE.md` for the Claude Code implementation). Tools without a native subagent/command surface should treat the sections above as operating instructions.
