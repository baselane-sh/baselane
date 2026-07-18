---
name: design-review
description: Binary, testable criteria for reviewing UI quality (Linear-inspired direction) and catching slop before shipping. Load after building any landing/marketing UI in this project.
---

# Design Review — premium / anti-slop gate (Linear-inspired)

Review the built UI against each item. Each is binary. Any FAIL must be fixed or explicitly justified. Report as a ranked list (blocker / major / minor).

## Quality / slop tells (must all PASS)
1. **No emoji** anywhere. Icons are Lucide line icons.
2. **One accent/gradient family** (indigo/violet). No competing saturated hue.
3. **Gradients are restrained** — only hero/CTA aurora glow, primary button, and at most one gradient hero word/border. NOT flat fills on cards or section backgrounds, NOT a multi-color blue→purple→teal smear.
4. **Glass is restrained** — nav (and maybe the pill) only, not every card.
5. **Type is Inter**, headings weight 500–600 with tight tracking. No 800 weight.
6. **Layout varies per section**; visual sides alternate. No two identical card rows stacked.
7. **Hero visual is real product UI** (styled dashboard/PR mock), not fake browser chrome with traffic-light dots.
8. **Lead stat/pain above the fold** (review-burden / inconsistency).
9. **Motion present but subtle** — scroll reveals + hover lifts; nothing bouncy; honors `prefers-reduced-motion`.
10. **Template test:** a skeptical senior designer can't name a starter; it reads Linear-grade, not generic.

## System fidelity (must all PASS)
- **Spacing** only from the 4px scale. No magic numbers.
- **Type** hierarchy clear; only the defined scale.
- **Color** only palette tokens; **AA contrast** (4.5:1 text, 3:1 large/UI) — check muted/faint on `#08090A`.
- **States** — hover + visible focus ring on all interactive elements.
- **Accessibility** — semantic HTML, alt/aria on meaningful visuals, 44px targets, keyboard-navigable, icons aria-hidden when decorative.
- **Responsive** — no horizontal scroll at 375px; holds at 768/1280.
- **Resilience** — if GSAP/Lucide fail to load, content is still visible and usable.
