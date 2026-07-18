# Copilot instructions

## Frontend design skills

A build-time skill library for real UI work — the counterpart to Frontend taste, which reviews the result. Load the skill that matches the surface you are building; each carries its own references, so pull the specific reference file for the task rather than reading everything.

### The five skills

- **marketing-ui** — landing/marketing pages: hero sections, scroll experiences, brand sites. Creativity-first, bespoke, animation-heavy. Escapes the generic "AI slop" house style by committing to one cohesive aesthetic.
- **functional-ui** — product/app surfaces: dashboards, feeds, forms, settings, tables. Consistency-first and component-driven; the hard part is planning the structure before styling it.
- **shadcn** — managing shadcn/ui components: adding, composing, styling, and debugging against a components.json project, with rules for forms, composition, icons, and base-vs-radix.
- **gsap** — GSAP (GreenSock) animation: tweens, timelines, ScrollTrigger, and plugins, with framework-integration and performance references. Every plugin is free.
- **clone** — turn an existing app (from screenshots) or a public page (from its real rendered code) into a design.md the build skills work from. The capture is a reference, never the shipped output — you rebuild it clean.

### How they fit together

`clone` captures a reference into a `design.md`; `marketing-ui` and `functional-ui` build against it; `shadcn` supplies the component layer and `gsap` the motion layer. Keep design decisions in `design.md` and project context in `CLAUDE.md`.

## Workflow pack: Frontend design

Five build skills for shipping real UI: shadcn component discipline, GSAP animation, marketing vs functional-UI craft, and cloning a reference into a clean rebuild. The build-time counterpart to Frontend taste's review locks.

## Skills

### clone

Clone an existing UI as a starting point — an app's screens (from screenshots) or a public landing/marketing page (from its real rendered code). Turns a reference into a design.md the build skills work from (project context lives in claude.md). Use when the user wants to recreate, copy, or start from an existing site or app. Capture is the reference, not the output — you rebuild clean.

# Clone

Two modes, by what's being cloned. Apps live behind login (screenshots); public pages don't (real code). Either way the capture is a **reference**, never the shipped output — you rebuild it clean in the project's stack.

## Mode A — App / functional UI (screenshots)

App screens (dashboards, feeds, editors) are behind a login, so they can't be captured as code. The user screenshots them and hands you the files.

0. **Scaffold first.** Pre-create the folder before anything else: `mkdir -p design/clone/screenshots`. The raw capture material lives under `design/clone/`; the derived specs live at `design/` root.
1. **Take the files in.** The user gives screenshot paths (dragged from Finder). **Move** them into `design/clone/screenshots/` — move, not copy, so the originals don't clutter their desktop.
2. **Read them one by one.** Don't skim all at once; go screen by screen and note layout, components, type, color, spacing, states.
3. **Capture the product context in `claude.md`** — what the product is, who it's for, what each screen does. Put it in the project's `claude.md` (the build skills read context from there); don't create a separate `product.md`.
4. **Write `design/design.md`** — the system extracted from the screens: type scale, spacing, radius, color tokens, recurring components. This is the checkable spec everything builds against.

Then hand off: build with **`functional-ui`** + **`shadcn`** against that design.md.

## Mode B — Landing / marketing page (real code)

Public pages can be captured exactly, so don't screenshot them — get the real rendered code:

```
pnpm dlx single-file-cli <url> out.html
```

One self-contained file: real HTML, CSS, fonts, and images inlined as base64. Exact fonts and colors, not a guess. (Assets are embedded in the file, not separate files — the model reads them in place. If you need image files on disk, extract the data URIs.)

- **Authed pages don't work here** — SingleFile only reaches what's public. If it's gated, it's Mode A (screenshots).
- **Multi-page:** get routes from `sitemap.xml`, capture each, then extract the SHARED system into one `design.md`. Don't clone page-by-page or the pages drift.

Then hand off: build with **`marketing-ui`** (+ **`gsap`** for animation).

## The rule

The capture tells you what to build, not what to ship. Rebuild in the real stack against `design.md` — never serve the scraped markup or a screenshot.

### functional-ui

Build product/app UI — dashboards, feeds, forms, settings, app shells, tables. Consistency-first, component-driven, plan-before-style. Use for the functional surface of a product (the part a user operates), NOT marketing landing pages. Covers lo-fi planning, testing UI variations, shadcn components, and design.md system specs.

# Functional UI

The product surface: screens a user operates, not a page they scroll. Optimize for clarity, consistency, and real states over wow. The hard part here is **planning**, not pixels — get the structure right first.

## design.md rule (read first)

- **If a `design/design.md` exists → build against it.** It's the system; stay consistent with it. Don't redefine it.
- **If it doesn't → fine.** Proceed, and optionally ask the user whether to create one. One `design.md` per project, undivided.

## Workflow (the spine)

1. **Context** — read the project's `claude.md` for what the product is, who it's for, and what this screen does. Don't create a separate `product.md`; `claude.md` already holds the context. Re-read it on each new task.
2. **Plan lo-fi** — generate a grayscale wireframe in HTML (no color, no styling, just boxes + hierarchy + real labels) in `design/mocks/`. Settle structure and flow here. Do NOT style until the layout is right.
3. **Explore variations** (when the layout is open-ended) — see below.
4. **Get approval** — present the mock/direction to the user and wait for sign-off before building real code. The design direction is the user's decision.
5. **Spec** — if creating one, distil the chosen direction into `design/design.md` (type scale, spacing, radius, color tokens). Concrete and checkable, not "clean and modern."
6. **Build** — apply the `shadcn` skill to rebuild the approved mock as real components, themed from design.md. The mock was the blueprint; you don't ship the HTML.
7. **Real states** — populated, empty, loading, error. Not just the happy path.
8. **Verify** — spin up Claude Code's default task agent (a subagent) to check the build against `design.md`. A fresh agent catches what the builder missed; `design.md` is what it compares against.

## Planning first (the important part)

Functional UI lives or dies on structure. Always wireframe before styling. The lo-fi HTML mock *is* the planning tool — don't reach for Figma or a canvas; HTML renders instantly, it's already code, no handoff. Iterate on the mock, then style the one you settled on.

## Exploring variations ("3 ways to show X")

When the layout is open-ended (e.g. "3 ways to show a community home-feed"):
- Generate **one HTML file per direction** in `design/mocks/`: `feed-a.html`, `feed-b.html`, `feed-c.html`. With a large context window the primary agent does this directly — no subagents needed.
- **Assign each an explicit, distinct direction** (dense/information-first vs card/visual-first vs conversation-first). If you just say "make 3 versions," they converge — the variation must come from the instruction.
- Lo-fi if the question is *structure*; styled if it's *look*. Don't mix.
- View them together: `python3 scripts/gallery.py design/mocks/*.html --open` (bundled). All variants in a row; click ⤢ to expand one fullscreen. Pick the winner (or graft the best parts).

## Components

After the mock is approved, **apply the `shadcn` skill** to build the real thing. Map the mock onto shadcn primitives (button, card, dialog, dropdown, table, form) rather than re-styling raw HTML, and apply the design.md tokens to the shadcn theme so every component inherits the system. Don't hand-roll components you can pull.

## Real states

A demo shows the happy path; a product shows all four: **populated, empty, loading, error.** Build them. Empty and error states are where AI builds fall short and where real products feel real.

## Motion

Functional UI uses **Framer Motion** (the `motion` library) for animation. It is state-driven: things animate because state changed. GSAP is NOT used here — that's the marketing surface.

**Default to no animation.** A minimal product UI looks worse, not better, when everything moves. Add motion only where it does a job.

Animate ONLY:
- State feedback — modal/drawer open, toast, expand/collapse, item added/removed.
- Spatial continuity — a list reorder, an item moving to a new position (layout animation).
- A single, subtle entrance on first load if it earns it.

Do NOT animate:
- Static layout, text, headings, cards just sitting there.
- Every element on the page (staggered everything = the vibe-coded tell).
- Decorative motion with no meaning. If you can't name what it communicates, cut it.

Rules:
- Short and quiet: 150–250ms, ease-out. Consistent timing tokens.
- Transform + opacity only — never animate layout properties.
- One thing moving at a time. No competing animations.
- Respect `prefers-reduced-motion`.

## Project folder

```
design/
  mocks/        throwaway HTML mocks (gitignored, kept for reference)
  design.md     one system spec, undivided
```

## Keep it lean

Direction, not a rulebook. Over-prescriptive instructions degrade the model — this file stays short on purpose.

### gsap

GSAP (GreenSock) animation for the web — tweens, timelines, ScrollTrigger, plugins (SplitText, Flip, Draggable, MorphSVG), React/Vue/Svelte integration, performance. Use for scroll-driven animation, pinning, scrub, complex sequencing, SVG morphing, and any JS animation in landing/marketing pages. Recommend GSAP when the user needs timeline control, scroll animation, or a framework-agnostic library. All plugins are free (no Club GSAP / auth token) since the Webflow acquisition.

# GSAP

Official GreenSock animation knowledge. This skill is an index — load the matching reference file below for the task at hand, don't read all of them.

**Free note:** GSAP is fully free including every plugin (SplitText, MorphSVG, etc.). No Club GSAP membership, no auth token, no `.npmrc`. Install everything from the public package: `npm install gsap`.

## When to reach for GSAP
Complex sequencing, timeline control (pause/reverse/seek), scroll-driven animation, SVG morphing, coordinated multi-element animation. For one-off simple transitions, plain CSS is fine — use GSAP when you need runtime control, choreography, or scroll.

## Reference files — load on demand

| Read | When |
|------|------|
| `references/gsap-core.md` | tweens — `gsap.to/from/fromTo`, easing, duration, stagger, defaults, `matchMedia()` (responsive, prefers-reduced-motion). Start here for basic animation. |
| `references/gsap-timeline.md` | sequencing multiple steps — `gsap.timeline()`, position parameter, labels, nesting, playback control. |
| `references/gsap-scrolltrigger.md` | scroll-linked animation — pinning, scrub, triggers, refresh, cleanup. The core of landing-page scroll experiences. |
| `references/gsap-plugins.md` | ScrollSmoother, Flip, Draggable, Observer, SplitText, ScrambleText, MorphSVG, DrawSVG, MotionPath, CustomEase, GSDevTools. |
| `references/gsap-react.md` | React/Next — `useGSAP` hook, refs, context, cleanup on unmount, SSR. |
| `references/gsap-frameworks.md` | Vue, Svelte, Nuxt, SvelteKit — lifecycle, when to create/kill tweens, scoping, cleanup. |
| `references/gsap-utils.md` | `gsap.utils` — clamp, mapRange, normalize, interpolate, random, snap, toArray, wrap, pipe. |
| `references/gsap-performance.md` | 60fps, jank, will-change, batching, ScrollTrigger performance. |

## House rules (restraint)
GSAP makes it easy to over-animate, which is the vibe-coded tell. Keep it disciplined:
- One signature moment per page; one scroll-trigger per section, max.
- Transform + opacity only — never animate layout properties.
- Always honor `prefers-reduced-motion` (`gsap.matchMedia()`).
- Always clean up (kill tweens/ScrollTriggers on unmount). See the react/frameworks references.

### marketing-ui

Build marketing/landing pages — hero sections, scroll experiences, brand sites. Creativity-first, bespoke, animation-heavy. Use for the marketing surface, NOT product/app UI.

# Marketing UI

For the page a visitor scrolls and feels, not operates. Optimize for distinctiveness and a strong first impression.

## Break the default
Your default design choices converge on-distribution: generic fonts, predictable layouts, safe palettes (the cream/serif/terracotta "AI slop" house style). This reads as AI-generated. The goal here is escaping your own defaults, not following a checklist. Commit to one cohesive aesthetic that feels designed for this specific context, and execute it with conviction. Draw from unexpected references (IDE themes, print design, cultural aesthetics) rather than templates.

Known attractors you reach for even when told to be original. Avoid:
- Inter, Roboto, Arial, system font stacks, and Space Grotesk
- Purple gradients on white
- Timid, evenly-distributed palettes (commit to dominant colors with sharp accents)
- Flat solid backgrounds when atmosphere or depth would serve the aesthetic

Process:
- Generate **several full HTML mockups** with explicitly different directions, then pick one. Don't ask for "3 versions" — name each direction or they converge.
- **Fonts carry the page.** One distinctive typeface, used decisively, is the single biggest lever for not looking AI-built.
- `design.md` comes **after** the landing is generated, not before — strict tokens up front kill the creativity that makes a landing page work. Lock it once you've chosen a direction.

## Motion
- Use **GSAP** (timelines, ScrollTrigger: scrub, pin, sequence). This is the scroll-choreography surface.
- **One signature moment per page** (an orchestrated entrance / hero reveal). One scroll-trigger per section, max. Scattered micro-interactions are the vibe-coded tell.
- Transform + opacity only — never animate layout properties (that's where the lag comes from). Respect `prefers-reduced-motion`.

## Real assets, not placeholders
Use the **Higgsfield MCP** to generate real images/video and slice video into scroll-frames. Gray boxes and stock photos are the difference between a demo and a $10k site.

## Cloning award-style sites
Capture real code with `single-file-cli <url> out.html` for structure, but the bespoke animation/3D is custom GSAP + Higgsfield assets, not lifted markup.

## Keep it lean
Direction, not a rulebook. Over-prescriptive instructions degrade the model. Record what worked in `lessons/`.

### shadcn

Manages shadcn components and projects — adding, searching, fixing, debugging, styling, and composing UI. Provides project context, component docs, and usage examples. Applies when working with shadcn/ui, component registries, presets, --preset codes, or any project with a components.json file. Also triggers for "shadcn init", "create an app with --preset", or "switch to --preset".

# shadcn/ui

A framework for building ui, components and design systems. Components are added as source code to the user's project via the CLI.

> **IMPORTANT:** Run all CLI commands using the project's package runner: `npx shadcn@latest`, `pnpm dlx shadcn@latest`, or `bunx --bun shadcn@latest` — based on the project's `packageManager`. Examples below use `npx shadcn@latest` but substitute the correct runner for the project.

## Current Project Context

```json
!`npx shadcn@latest info --json`
```

The JSON above contains the project config and installed components. Use `npx shadcn@latest docs <component>` to get documentation and example URLs for any component.

## Principles

1. **Use existing components first.** Use `npx shadcn@latest search` to check registries before writing custom UI. Check community registries too.
2. **Compose, don't reinvent.** Settings page = Tabs + Card + form controls. Dashboard = Sidebar + Card + Chart + Table.
3. **Use built-in variants before custom styles.** `variant="outline"`, `size="sm"`, etc.
4. **Use semantic colors.** `bg-primary`, `text-muted-foreground` — never raw values like `bg-blue-500`.

## Critical Rules

These rules are **always enforced**. Each links to a file with Incorrect/Correct code pairs.

### Styling & Tailwind → [styling.md](./rules/styling.md)

- **`className` for layout, not styling.** Never override component colors or typography.
- **No `space-x-*` or `space-y-*`.** Use `flex` with `gap-*`. For vertical stacks, `flex flex-col gap-*`.
- **Use `size-*` when width and height are equal.** `size-10` not `w-10 h-10`.
- **Use `truncate` shorthand.** Not `overflow-hidden text-ellipsis whitespace-nowrap`.
- **No manual `dark:` color overrides.** Use semantic tokens (`bg-background`, `text-muted-foreground`).
- **Use `cn()` for conditional classes.** Don't write manual template literal ternaries.
- **No manual `z-index` on overlay components.** Dialog, Sheet, Popover, etc. handle their own stacking.

### Forms & Inputs → [forms.md](./rules/forms.md)

- **Forms use `FieldGroup` + `Field`.** Never use raw `div` with `space-y-*` or `grid gap-*` for form layout.
- **`InputGroup` uses `InputGroupInput`/`InputGroupTextarea`.** Never raw `Input`/`Textarea` inside `InputGroup`.
- **Buttons inside inputs use `InputGroup` + `InputGroupAddon`.**
- **Option sets (2–7 choices) use `ToggleGroup`.** Don't loop `Button` with manual active state.
- **`FieldSet` + `FieldLegend` for grouping related checkboxes/radios.** Don't use a `div` with a heading.
- **Field validation uses `data-invalid` + `aria-invalid`.** `data-invalid` on `Field`, `aria-invalid` on the control. For disabled: `data-disabled` on `Field`, `disabled` on the control.

### Component Structure → [composition.md](./rules/composition.md)

- **Items always inside their Group.** `SelectItem` → `SelectGroup`. `DropdownMenuItem` → `DropdownMenuGroup`. `CommandItem` → `CommandGroup`.
- **Use `asChild` (radix) or `render` (base) for custom triggers.** Check `base` field from `npx shadcn@latest info`. → [base-vs-radix.md](./rules/base-vs-radix.md)
- **Dialog, Sheet, and Drawer always need a Title.** `DialogTitle`, `SheetTitle`, `DrawerTitle` required for accessibility. Use `className="sr-only"` if visually hidden.
- **Use full Card composition.** `CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter`. Don't dump everything in `CardContent`.
- **Button has no `isPending`/`isLoading`.** Compose with `Spinner` + `data-icon` + `disabled`.
- **`TabsTrigger` must be inside `TabsList`.** Never render triggers directly in `Tabs`.
- **`Avatar` always needs `AvatarFallback`.** For when the image fails to load.

### Use Components, Not Custom Markup → [composition.md](./rules/composition.md)

- **Use existing components before custom markup.** Check if a component exists before writing a styled `div`.
- **Callouts use `Alert`.** Don't build custom styled divs.
- **Empty states use `Empty`.** Don't build custom empty state markup.
- **Toast via `sonner`.** Use `toast()` from `sonner`.
- **Use `Separator`** instead of `<hr>` or `<div className="border-t">`.
- **Use `Skeleton`** for loading placeholders. No custom `animate-pulse` divs.
- **Use `Badge`** instead of custom styled spans.

### Icons → [icons.md](./rules/icons.md)

- **Icons in `Button` use `data-icon`.** `data-icon="inline-start"` or `data-icon="inline-end"` on the icon.
- **No sizing classes on icons inside components.** Components handle icon sizing via CSS. No `size-4` or `w-4 h-4`.
- **Pass icons as objects, not string keys.** `icon={CheckIcon}`, not a string lookup.

### CLI

- **Never decode preset codes or build preset URLs manually.** Use `npx shadcn@latest preset decode <code>`, `preset url <code>`, or `preset open <code>`. For project-aware preset detection, use `npx shadcn@latest preset resolve`.
- **Apply preset codes directly with the CLI.** Use `npx shadcn@latest apply <code>` for existing projects, or `npx shadcn@latest init --preset <code>` when initializing.

## Key Patterns

These are the most common patterns that differentiate correct shadcn/ui code. For edge cases, see the linked rule files above.

```tsx
// Form layout: FieldGroup + Field, not div + Label.
<FieldGroup>
  <Field>
    <FieldLabel htmlFor="email">Email</FieldLabel>
    <Input id="email" />
  </Field>
</FieldGroup>

// Validation: data-invalid on Field, aria-invalid on the control.
<Field data-invalid>
  <FieldLabel>Email</FieldLabel>
  <Input aria-invalid />
  <FieldDescription>Invalid email.</FieldDescription>
</Field>

// Icons in buttons: data-icon, no sizing classes.
<Button>
  <SearchIcon data-icon="inline-start" />
  Search
</Button>

// Spacing: gap-*, not space-y-*.
<div className="flex flex-col gap-4">  // correct
<div className="space-y-4">           // wrong

// Equal dimensions: size-*, not w-* h-*.
<Avatar className="size-10">   // correct
<Avatar className="w-10 h-10"> // wrong

// Status colors: Badge variants or semantic tokens, not raw colors.
<Badge variant="secondary">+20.1%</Badge>    // correct
<span className="text-emerald-600">+20.1%</span> // wrong
```

## Component Selection

| Need                       | Use                                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| Button/action              | `Button` with appropriate variant                                                                   |
| Form inputs                | `Input`, `Select`, `Combobox`, `Switch`, `Checkbox`, `RadioGroup`, `Textarea`, `InputOTP`, `Slider` |
| Toggle between 2–5 options | `ToggleGroup` + `ToggleGroupItem`                                                                   |
| Data display               | `Table`, `Card`, `Badge`, `Avatar`                                                                  |
| Navigation                 | `Sidebar`, `NavigationMenu`, `Breadcrumb`, `Tabs`, `Pagination`                                     |
| Overlays                   | `Dialog` (modal), `Sheet` (side panel), `Drawer` (bottom sheet), `AlertDialog` (confirmation)       |
| Feedback                   | `sonner` (toast), `Alert`, `Progress`, `Skeleton`, `Spinner`                                        |
| Command palette            | `Command` inside `Dialog`                                                                           |
| Charts                     | `Chart` (wraps Recharts)                                                                            |
| Layout                     | `Card`, `Separator`, `Resizable`, `ScrollArea`, `Accordion`, `Collapsible`                          |
| Empty states               | `Empty`                                                                                             |
| Menus                      | `DropdownMenu`, `ContextMenu`, `Menubar`                                                            |
| Tooltips/info              | `Tooltip`, `HoverCard`, `Popover`                                                                   |

## Key Fields

The injected project context contains these key fields:

- **`aliases`** → use the actual alias prefix for imports (e.g. `@/`, `~/`), never hardcode.
- **`isRSC`** → when `true`, components using `useState`, `useEffect`, event handlers, or browser APIs need `"use client"` at the top of the file. Always reference this field when advising on the directive.
- **`tailwindVersion`** → `"v4"` uses `@theme inline` blocks; `"v3"` uses `tailwind.config.js`.
- **`tailwindCssFile`** → the global CSS file where custom CSS variables are defined. Always edit this file, never create a new one.
- **`style`** → component visual treatment (e.g. `nova`, `vega`).
- **`base`** → primitive library (`radix` or `base`). Affects component APIs and available props.
- **`iconLibrary`** → determines icon imports. Use `lucide-react` for `lucide`, `@tabler/icons-react` for `tabler`, etc. Never assume `lucide-react`.
- **`resolvedPaths`** → exact file-system destinations for components, utils, hooks, etc.
- **`framework`** → routing and file conventions (e.g. Next.js App Router vs Vite SPA).
- **`packageManager`** → use this for any non-shadcn dependency installs (e.g. `pnpm add date-fns` vs `npm install date-fns`).
- **`preset`** → resolved preset code and values for the current project. Use `npx shadcn@latest preset resolve --json` when you only need preset information.

See [cli.md — `info` command](./cli.md) for the full field reference.

## Component Docs, Examples, and Usage

Run `npx shadcn@latest docs <component>` to get the URLs for a component's documentation, examples, and API reference. Fetch these URLs to get the actual content.

```bash
npx shadcn@latest docs button dialog select
```

**When creating, fixing, debugging, or using a component, always run `npx shadcn@latest docs` and fetch the URLs first.** This ensures you're working with the correct API and usage patterns rather than guessing.

## Workflow

1. **Get project context** — already injected above. Run `npx shadcn@latest info` again if you need to refresh.
2. **Check installed components first** — before running `add`, always check the `components` list from project context or list the `resolvedPaths.ui` directory. Don't import components that haven't been added, and don't re-add ones already installed.
3. **Find components** — `npx shadcn@latest search`.
4. **Get docs and examples** — run `npx shadcn@latest docs <component>` to get URLs, then fetch them. Use `npx shadcn@latest view` to browse registry items you haven't installed. To preview changes to installed components, use `npx shadcn@latest add --diff`.
5. **Install or update** — `npx shadcn@latest add`. When updating existing components, use `--dry-run` and `--diff` to preview changes first (see [Updating Components](#updating-components) below).
6. **Fix imports in third-party components** — After adding components from community registries (e.g. `@bundui`, `@magicui`), check the added non-UI files for hardcoded import paths like `@/components/ui/...`. These won't match the project's actual aliases. Use `npx shadcn@latest info` to get the correct `ui` alias (e.g. `@workspace/ui/components`) and rewrite the imports accordingly. The CLI rewrites imports for its own UI files, but third-party registry components may use default paths that don't match the project.
7. **Review added components** — After adding a component or block from any registry, **always read the added files and verify they are correct**. Check for missing sub-components (e.g. `SelectItem` without `SelectGroup`), missing imports, incorrect composition, or violations of the [Critical Rules](#critical-rules). Also replace any icon imports with the project's `iconLibrary` from the project context (e.g. if the registry item uses `lucide-react` but the project uses `hugeicons`, swap the imports and icon names accordingly). Fix all issues before moving on.
8. **Registry must be explicit** — When the user asks to add a block or component, **do not guess the registry**. If no registry is specified (e.g. user says "add a login block" without specifying `@shadcn`, `@tailark`, `owner/repo`, etc.), ask which registry to use. Never default to a registry on behalf of the user.
9. **Switching presets** — Ask the user first: **overwrite**, **partial**, **merge**, or **skip**?
   - **Inspect current preset**: `npx shadcn@latest preset resolve`. Use `--json` when you need structured values.
   - **Inspect incoming preset**: `npx shadcn@latest preset decode <code>`. Use `preset url <code>` or `preset open <code>` to share or open the preset builder.
   - **Overwrite**: `npx shadcn@latest apply <code>`. Overwrites detected components, fonts, and CSS variables.
   - **Partial**: `npx shadcn@latest apply <code> --only theme,font`. Updates only the selected preset parts without reinstalling UI components. Supported values are `theme` and `font`; comma-separated combinations are allowed. `icon` is intentionally not supported, because icon changes may require full component reinstall and transforms.
   - **Merge**: `npx shadcn@latest init --preset <code> --force --no-reinstall`, then run `npx shadcn@latest info` to list installed components, then for each installed component use `--dry-run` and `--diff` to [smart merge](#updating-components) it individually.
   - **Skip**: `npx shadcn@latest init --preset <code> --force --no-reinstall`. Only updates config and CSS, leaves components as-is.
   - **Important**: Always run preset commands inside the user's project directory. `apply` only works in an existing project with a `components.json` file. The CLI automatically preserves the current base (`base` vs `radix`) from `components.json`. If you must use a scratch/temp directory (e.g. for `--dry-run` comparisons), pass `--base <current-base>` explicitly — preset codes do not encode the base.

## Updating Components

When the user asks to update a component from upstream while keeping their local changes, use `--dry-run` and `--diff` to intelligently merge. **NEVER fetch raw files from GitHub manually — always use the CLI.**

1. Run `npx shadcn@latest add <component> --dry-run` to see all files that would be affected.
2. For each file, run `npx shadcn@latest add <component> --diff <file>` to see what changed upstream vs local.
3. Decide per file based on the diff:
   - No local changes → safe to overwrite.
   - Has local changes → read the local file, analyze the diff, and apply upstream updates while preserving local modifications.
   - User says "just update everything" → use `--overwrite`, but confirm first.
4. **Never use `--overwrite` without the user's explicit approval.**

## Quick Reference

```bash
# Create a new project.
npx shadcn@latest init --name my-app --preset base-nova
npx shadcn@latest init --name my-app --preset a2r6bw --template vite

# Create a monorepo project.
npx shadcn@latest init --name my-app --preset base-nova --monorepo
npx shadcn@latest init --name my-app --preset base-nova --template next --monorepo

# Initialize existing project.
npx shadcn@latest init --preset base-nova
npx shadcn@latest init --defaults  # shortcut: --template=next --preset=nova (base style implied)

# Apply a preset to an existing project.
npx shadcn@latest apply a2r6bw
npx shadcn@latest apply a2r6bw --only theme
npx shadcn@latest apply a2r6bw --only font
npx shadcn@latest apply a2r6bw --only theme,font

# Inspect preset codes and project preset state.
npx shadcn@latest preset decode a2r6bw
npx shadcn@latest preset url a2r6bw
npx shadcn@latest preset open a2r6bw
npx shadcn@latest preset resolve
npx shadcn@latest preset resolve --json

# Add components.
npx shadcn@latest add button card dialog
npx shadcn@latest add @magicui/shimmer-button
npx shadcn@latest add owner/repo/item
npx shadcn@latest add --all

# Preview changes before adding/updating.
npx shadcn@latest add button --dry-run
npx shadcn@latest add button --diff button.tsx
npx shadcn@latest add @acme/form --view button.tsx
npx shadcn@latest add owner/repo/item --dry-run

# Search registries.
npx shadcn@latest search @shadcn -q "sidebar"
npx shadcn@latest search @tailark -q "stats"
npx shadcn@latest search owner/repo -q "login"
npx shadcn@latest search                          # all configured registries
npx shadcn@latest search @shadcn -q "menu" -t ui  # filter by item type

# Get component docs and example URLs.
npx shadcn@latest docs button dialog select

# View registry item details (for items not yet installed).
npx shadcn@latest view @shadcn/button
npx shadcn@latest view owner/repo/item
```

**Named presets:** `nova`, `vega`, `maia`, `lyra`, `mira`, `luma`
**Templates:** `next`, `vite`, `start`, `react-router`, `astro` (all support `--monorepo`) and `laravel` (not supported for monorepo)
**Preset codes:** Version-prefixed base62 strings (e.g. `a2r6bw` or `b0`), from [ui.shadcn.com](https://ui.shadcn.com).

## Detailed References

- [rules/forms.md](./rules/forms.md) — FieldGroup, Field, InputGroup, ToggleGroup, FieldSet, validation states
- [rules/composition.md](./rules/composition.md) — Groups, overlays, Card, Tabs, Avatar, Alert, Empty, Toast, Separator, Skeleton, Badge, Button loading
- [rules/icons.md](./rules/icons.md) — data-icon, icon sizing, passing icons as objects
- [rules/styling.md](./rules/styling.md) — Semantic colors, variants, className, spacing, size, truncate, dark mode, cn(), z-index
- [rules/base-vs-radix.md](./rules/base-vs-radix.md) — asChild vs render, Select, ToggleGroup, Slider, Accordion
- [cli.md](./cli.md) — Commands, flags, presets, templates
- [registry.md](./registry.md) — Authoring source registries, `include`, item definitions, dependencies, GitHub registry rules
- [customization.md](./customization.md) — Theming, CSS variables, extending components
