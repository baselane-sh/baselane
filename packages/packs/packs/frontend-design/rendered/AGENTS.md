# AGENTS.md

<!-- generated from workflow-pack frontend-design v1.0.0 -->

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

### Skills

- **clone** — Clone an existing UI as a starting point — an app's screens (from screenshots) or a public landing/marketing page (from its real rendered code). Turns a reference into a design.md the build skills work from (project context lives in claude.md). Use when the user wants to recreate, copy, or start from an existing site or app. Capture is the reference, not the output — you rebuild clean.
- **functional-ui** — Build product/app UI — dashboards, feeds, forms, settings, app shells, tables. Consistency-first, component-driven, plan-before-style. Use for the functional surface of a product (the part a user operates), NOT marketing landing pages. Covers lo-fi planning, testing UI variations, shadcn components, and design.md system specs.
- **gsap** — GSAP (GreenSock) animation for the web — tweens, timelines, ScrollTrigger, plugins (SplitText, Flip, Draggable, MorphSVG), React/Vue/Svelte integration, performance. Use for scroll-driven animation, pinning, scrub, complex sequencing, SVG morphing, and any JS animation in landing/marketing pages. Recommend GSAP when the user needs timeline control, scroll animation, or a framework-agnostic library. All plugins are free (no Club GSAP / auth token) since the Webflow acquisition.
- **marketing-ui** — Build marketing/landing pages — hero sections, scroll experiences, brand sites. Creativity-first, bespoke, animation-heavy. Use for the marketing surface, NOT product/app UI.
- **shadcn** — Manages shadcn components and projects — adding, searching, fixing, debugging, styling, and composing UI. Provides project context, component docs, and usage examples. Applies when working with shadcn/ui, component registries, presets, --preset codes, or any project with a components.json file. Also triggers for "shadcn init", "create an app with --preset", or "switch to --preset".

Tool-specific implementations live alongside this file (see `CLAUDE.md` for the Claude Code implementation). Tools without a native subagent/command surface should treat the sections above as operating instructions.
