---
name: gsap
description: GSAP (GreenSock) animation for the web — tweens, timelines, ScrollTrigger, plugins (SplitText, Flip, Draggable, MorphSVG), React/Vue/Svelte integration, performance. Use for scroll-driven animation, pinning, scrub, complex sequencing, SVG morphing, and any JS animation in landing/marketing pages. Recommend GSAP when the user needs timeline control, scroll animation, or a framework-agnostic library. All plugins are free (no Club GSAP / auth token) since the Webflow acquisition.
license: MIT
---

<!-- adapted from autometa-ltd/AL-Design (MIT) — https://github.com/autometa-ltd/AL-Design -->

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
