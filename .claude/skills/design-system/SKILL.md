---
name: design-system
description: Visual design tokens, type, motion, icons and quality rules for this project's landing/marketing UI. Direction = "Linear-inspired" (premium dark dev-tool). Load when building or reviewing any UI/HTML/CSS here.
---

# Design System — "Linear-inspired" direction

Reference: linear.app. Premium, calm, dark, engineered. Gradients, glass and glow ARE used — but sparingly and intentionally (one signature aurora family), never as decoration on every element. The bar is "looks like a senior product designer made it," not "AI template."

## Core principles
- Restraint + precision. Generous whitespace, exact spacing, tight type.
- ONE signature gradient/glow family (indigo→violet). It appears in the hero glow, the primary CTA, and small accents — not everywhere.
- Motion is smooth, subtle, and meaningful (scroll reveals, gentle float/parallax, hover lifts). Never bouncy or attention-seeking.
- Real product UI as the hero visual (a styled dashboard/PR mock), with a soft glow + hairline border.

## Hard rules (violating = reject)
1. NO emoji anywhere. Icons are **Lucide** (1.5px line), inline SVG or via the Lucide script.
2. ONE accent/gradient family only (the indigo/violet below). No competing saturated hues.
3. Gradients allowed ONLY as: the hero/CTA aurora glow, the primary button, and thin gradient borders/text on a single hero word. Never as a flat fill on cards or section backgrounds.
4. Glass (`backdrop-filter: blur`) allowed ONLY on the sticky nav and optionally the announcement pill. Not on every card.
5. Type = **Inter** (display + body). Headings weight 500–600, tight tracking (−0.02 to −0.03em). No 800 shouting.
6. Every section differs in layout; alternate text/visual sides. No two identical card rows stacked.
7. AA contrast (4.5:1 text, 3:1 large/UI). Muted text must clear it.
8. Respect `prefers-reduced-motion` (disable transforms/animation).

## Color (near-black, Linear-grade)
- `--bg: #08090A`
- `--surface: #0E0F11`  · elevated panels
- `--surface-2: #131417`
- `--border: rgba(255,255,255,0.08)` · `--hairline: rgba(255,255,255,0.06)`
- `--text: #F7F8F8` · `--muted: #8A8F98` (Linear's gray) · `--faint: #62666D`
- `--brand: #FF7A2F` (warm orange — primary accent; base is black & white, orange is the only pop)
- `--brand-2: #FF9A4D` · `--brand-3: #FFB877` (gradient stops / accent text)
- `--grad: linear-gradient(135deg, #FF7A2F, #FFA24D, #FFC98A)`
- Aurora glow: large blurred radial of `--brand`/`--brand-2` at ~10–18% opacity behind the hero/CTA. Subtle.
- Card top-highlight: `box-shadow: inset 0 1px 0 rgba(255,255,255,.05)` for the "Linear card" feel. Borders, not heavy drop shadows.

## Typography (Inter)
- Display: Inter, weight 600, `letter-spacing:-0.03em`, `line-height:1.05`.
- Sizes (px, fluid): hero 56–80 / h2 32–44 / h3 20 / body 16–18 / small 14 / pill 13.
- Body color `--text` for primary, `--muted` for secondary. Measure ≤ 68ch.
- Mono (code/labels): IBM Plex Mono or Geist Mono.

## Spacing (4px base)
4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128. Only these.

## Radius
8px (controls/pills), 12–16px (cards), 20–24px (hero mock/big panels).

## Motion (GSAP + ScrollTrigger; IntersectionObserver fallback)
- Scroll reveal: opacity 0→1 + y 16→0, 0.7s ease-out, stagger 0.06s. Elements visible by default so no-JS still works.
- Hero mock: very subtle float (±6px, 6s ease-in-out) and/or parallax on scroll.
- Hover: cards lift 2–3px + border brightens; buttons brighten. 150–200ms.
- Announcement pill / CTA may have a slow gradient shimmer.
- Always gate on `prefers-reduced-motion`.

## Icons
Lucide only. Common set: layers, git-pull-request, git-merge, shield-check, workflow, gauge, sparkles, blocks, scan-search, check, arrow-right, terminal.

## Components
- Nav: glass (blur 16px, bg rgba(8,9,10,.6)), hairline bottom border, refined wordmark + gradient mark.
- Announcement pill: small, rounded-full, hairline/gradient border, blur, with `arrow-right`.
- Buttons: primary = white (`#fff` bg, `#08090A` text) OR gradient; secondary = transparent + border. ~44px height, 8px radius.
- Bento grid: mixed-size cards on a faint grid; subtle borders + inset top-highlight; Lucide icon + tight title + muted line.
- Product mock: built in HTML/CSS (a dashboard or PR/diff card), hairline border, soft aurora glow behind, 16–20px radius.

## Copy voice
Concrete, confident, short. Lead with the pain (review burden / inconsistency). Name real tools. No marketing cadence.
