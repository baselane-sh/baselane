# Copilot instructions

## Frontend taste discipline

Adopt these as fixed defaults, not options to tune per project — their whole value is removing the per-page style debate, the way a formatter removes the whitespace debate. Brand color and corner radius are the only inputs; everything below is settled.

### The three locks

Decide these once per page and hold them for the whole page — mixing them is the single biggest tell of unreviewed AI output:

1. **One accent color.** Pick a single accent for interactive/emphasis elements. Everything else is neutrals.
2. **One corner-radius system.** Pick a radius scale (e.g. sm/md/lg mapped to fixed px values) and use it everywhere — no ad-hoc `rounded-[7px]` next to `rounded-2xl`.
3. **One theme mode, decided at the page level.** Don't let individual components guess light/dark independently.

### Hero discipline

- Headline is 2 lines or fewer. If it doesn't fit, the message is too long, not the font too small.
- Subtext is roughly 20 words or fewer — one sentence, not a paragraph.
- Nav height is capped (~64px); it should never compete with the hero for vertical space.

### Anti-slop bans

These patterns are default outputs of ungrounded AI generation. Treat every one as a defect, not a style choice:

- No three-equal-width feature card rows. Use asymmetric layouts — different widths, different emphasis — so the page doesn't read as a template.
- No AI-purple/mesh-blob gradients unless the brand explicitly calls for them.
- No section-number eyebrows like "001 · Features" — they signal filler, not information.
- No `window.addEventListener('scroll')` for reveal/parallax effects — use `IntersectionObserver`, it's cheaper and doesn't jank.
- No emoji as section markers or bullet icons.
- Neutrals get a deliberate hue bias (warm or cool grey); never pure mid-grey (`#808080`-style), which reads as unstyled.

### Type

- Pair a display face and a body face deliberately — don't ship the framework default pairing unreviewed.
- Set a type scale (a small fixed set of sizes) and hold it; don't invent one-off sizes per component.

### Both themes

Design light and dark as two considered modes, not one inverted into the other — check contrast and accent legibility in both.

## Workflow pack: Frontend taste

Ends the per-component style debate with fixed, non-configurable defaults: three hard locks per page, disciplined heroes, and a banned-AI-slop checklist enforced before merge.

When acting as the taste-reviewer role: You are a frontend taste reviewer. If a `DESIGN.md` is present, treat it as the source of truth and check the UI against its tokens too. Read the changed UI files and check them against the three locks (one accent color, one corner-radius system, one theme mode per page) and the anti-slop bans (equal-width card rows, AI-purple/mesh-blob gradients, section-number eyebrows, scroll-event listeners instead of IntersectionObserver, emoji section markers, pure mid-grey neutrals) and hero discipline (headline length, subtext length, nav height). Report each violation with an exact file:line and a one-line concrete fix — do not report a violation you cannot point to in the code. If nothing violates the rules, say so plainly; do not invent findings to justify the review.

Workflow steps:

- design-review: Invoke the taste-reviewer subagent over the current diff (or $ARGUMENTS if given). Present its findings grouped by rule (locks, hero discipline, anti-slop bans), each with file:line and fix. If it finds nothing, report a clean pass.

- Taste check: one accent color, one corner-radius system, one theme mode — per page.
