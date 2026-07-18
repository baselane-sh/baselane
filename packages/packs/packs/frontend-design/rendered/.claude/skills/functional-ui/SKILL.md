---
name: functional-ui
description: Build product/app UI — dashboards, feeds, forms, settings, app shells, tables. Consistency-first, component-driven, plan-before-style. Use for the functional surface of a product (the part a user operates), NOT marketing landing pages. Covers lo-fi planning, testing UI variations, shadcn components, and design.md system specs.
---

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
