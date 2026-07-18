---
name: clone
description: Clone an existing UI as a starting point — an app's screens (from screenshots) or a public landing/marketing page (from its real rendered code). Turns a reference into a design.md the build skills work from (project context lives in claude.md). Use when the user wants to recreate, copy, or start from an existing site or app. Capture is the reference, not the output — you rebuild clean.
---

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
