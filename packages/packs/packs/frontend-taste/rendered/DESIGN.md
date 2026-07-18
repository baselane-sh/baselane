## Visual theme & atmosphere

Mood: distinctive, non-generic, considered. The brand color (#4F46E5) is the single accent — everything else in the interface is neutral, so the accent stays legible and the page never competes with itself.

Design light and dark as two considered modes, not one inverted into the other.

## Color palette & roles

| Token | Value | Role |
| --- | --- | --- |
| `--color-brand` | #4F46E5 | Accent — interactive elements, emphasis, focus rings |
| `--color-neutral-50` | #F9F9FA | Background / surface |
| `--color-neutral-100` | #EEEEF1 | Background / surface |
| `--color-neutral-300` | #CDCDD6 | Border / muted |
| `--color-neutral-500` | #8A899F | Border / muted |
| `--color-neutral-700` | #4A495A | Text |
| `--color-neutral-900` | #212027 | Text |
| `--color-ok` | #16A34A | Success / positive state |
| `--color-warn` | #D97706 | Warning / caution state |

Exactly one accent color exists in this palette. Do not introduce a second accent for "variety" — differentiate with weight, size, and spacing instead.

## Typography

- Display face: **Inter** — headings, hero copy, anything meant to lead the eye.
- Body face: **Inter** — paragraph text, labels, UI chrome.
- Type scale (px): 12 / 14 / 16 / 20 / 24 / 32 / 48. Pick from this set; don't invent one-off sizes.
- Line height: 1.2 for display sizes (20px+), 1.5 for body sizes (12-16px).

## Component stylings

- Radius scale (px): sm 4 · md 8 · lg 16 · full 9999. One scale, used everywhere — no ad-hoc radii next to the standard ones.
- Buttons: `md` radius, brand-colored fill for primary, neutral border for secondary, no gradient fills.
- Inputs: `sm` radius, neutral-300 border at rest, brand-colored border + ring on focus.
- Cards: `lg` radius, neutral-100 background, neutral-300 border (prefer a border over a shadow in light mode).

## Layout & spacing

- Spacing scale (px, 4px base grid): 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64.
- Container max-width: 1200px, centered, with 24px gutters on mobile.
- Prefer asymmetric layouts — mixed widths, deliberate emphasis — over evenly divided grids; a row of three equal-width cards is the single biggest tell of an unreviewed template.

## Depth & elevation

- Shadow scale: `sm` for hover states, `md` for popovers/dropdowns, `lg` for modals only.
- Elevate sparingly — most surfaces should read as flat with a border, not lifted with a shadow.
- z-index layers: base 0, sticky 10, dropdown 20, modal 30, toast 40. Don't invent values outside this set.

## Do's and don'ts

**Do**
- Hold one accent color for the whole page.
- Hold one radius system for the whole page.
- Give neutrals a deliberate hue bias.
- Decide light/dark at the page level, not per component.

**Don't**
- No second accent color, however small the use.
- No three-equal-width card rows — it's the default output of ungrounded generation.
- No AI-purple/mesh-blob gradients unless the brand explicitly calls for them.
- No pure mid-grey (`#808080`-style) neutrals — always hue-biased.
- No section-number eyebrows ("001 · Features") — they signal filler, not information.

## Responsive behavior

- Breakpoints (px): 640 / 768 / 1024 / 1280. Design mobile-first; add complexity as width increases.
- Minimum touch target: 44x44px on any interactive element below the 768px breakpoint.
- Nav collapses to a single control below 768px; it never competes with the hero for vertical space.

## Agent prompt guide

Any AI tool generating or modifying UI in this repository must follow this file as the source of truth for color, type, spacing, radius, and elevation. When a decision isn't covered here, match the closest existing pattern rather than inventing a new one — and if a new durable decision gets made, update this file so the next session inherits it too.
