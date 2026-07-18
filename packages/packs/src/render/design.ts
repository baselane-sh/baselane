import type { Capability, FileMap, PackCommand, WorkflowPack } from "../types.ts";

/** Fallback tokens used whenever `capability.config` omits a value. */
const DEFAULT_BRAND = "#4F46E5"; // indigo-600
const DEFAULT_FONT_DISPLAY = "Inter";
const DEFAULT_FONT_BODY = "Inter";
const DEFAULT_RADIUS_PX = 8;
const DEFAULT_THEME = "both";
const DEFAULT_MOOD = "clean, confident, functional";

// Semantic feedback colors are fixed, not derived from the brand hue — a brand color that
// happens to be green or amber must not be confused with a success/warning state.
const OK_COLOR = "#16A34A";
const WARN_COLOR = "#D97706";

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case rn:
      h = (gn - bn) / d + (gn < bn ? 6 : 0);
      break;
    case gn:
      h = (bn - rn) / d + 2;
      break;
    default:
      h = (rn - gn) / d + 4;
  }
  return [h * 60, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toByte = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toByte(r)}${toByte(g)}${toByte(b)}`.toUpperCase();
}

/** Hue extracted from the brand color, used to bias the neutral scale instead of pure grey. */
function brandHue(brand: string): number {
  const rgb = parseHex(brand);
  if (!rgb) return 230; // a cool, unobtrusive default bias
  return rgbToHsl(...rgb)[0];
}

interface Neutral {
  step: string;
  hex: string;
}

/** A small neutral scale with a deliberate hue bias — never pure `#808080`-style mid-grey. */
function neutralScale(hue: number): Neutral[] {
  const stops: [string, number][] = [
    ["50", 98],
    ["100", 94],
    ["300", 82],
    ["500", 58],
    ["700", 32],
    ["900", 14],
  ];
  return stops.map(([step, l]) => ({ step, hex: hslToHex(hue, 10, l) }));
}

interface DesignTokens {
  brand: string;
  fontDisplay: string;
  fontBody: string;
  radius: number;
  theme: string;
  mood: string;
  neutrals: Neutral[];
}

function resolveTokens(config: Record<string, string> | undefined): DesignTokens {
  const brand = config?.brandColor && parseHex(config.brandColor) ? config.brandColor : DEFAULT_BRAND;
  const radiusRaw = config?.radius ? parseInt(config.radius, 10) : NaN;
  const radius = Number.isFinite(radiusRaw) && radiusRaw > 0 ? radiusRaw : DEFAULT_RADIUS_PX;
  const theme = config?.theme === "light" || config?.theme === "dark" ? config.theme : DEFAULT_THEME;
  return {
    brand,
    fontDisplay: config?.fontDisplay || DEFAULT_FONT_DISPLAY,
    fontBody: config?.fontBody || DEFAULT_FONT_BODY,
    radius,
    theme,
    mood: config?.mood || DEFAULT_MOOD,
    neutrals: neutralScale(brandHue(brand)),
  };
}

function visualThemeSection(t: DesignTokens): string {
  const themeLine =
    t.theme === "both"
      ? "Design light and dark as two considered modes, not one inverted into the other."
      : `This project ships a single mode: ${t.theme}.`;
  return [
    "## Visual theme & atmosphere",
    "",
    `Mood: ${t.mood}. The brand color (${t.brand}) is the single accent — everything else in the ` +
      "interface is neutral, so the accent stays legible and the page never competes with itself.",
    "",
    themeLine,
  ].join("\n");
}

function colorPaletteSection(t: DesignTokens): string {
  const rows = [
    `| \`--color-brand\` | ${t.brand} | Accent — interactive elements, emphasis, focus rings |`,
    ...t.neutrals.map(
      (n) =>
        `| \`--color-neutral-${n.step}\` | ${n.hex} | ${
          Number(n.step) <= 100 ? "Background / surface" : Number(n.step) >= 700 ? "Text" : "Border / muted"
        } |`,
    ),
    `| \`--color-ok\` | ${OK_COLOR} | Success / positive state |`,
    `| \`--color-warn\` | ${WARN_COLOR} | Warning / caution state |`,
  ];
  return [
    "## Color palette & roles",
    "",
    "| Token | Value | Role |",
    "| --- | --- | --- |",
    ...rows,
    "",
    "Exactly one accent color exists in this palette. Do not introduce a second accent for " +
      "\"variety\" — differentiate with weight, size, and spacing instead.",
  ].join("\n");
}

function typographySection(t: DesignTokens): string {
  return [
    "## Typography",
    "",
    `- Display face: **${t.fontDisplay}** — headings, hero copy, anything meant to lead the eye.`,
    `- Body face: **${t.fontBody}** — paragraph text, labels, UI chrome.`,
    "- Type scale (px): 12 / 14 / 16 / 20 / 24 / 32 / 48. Pick from this set; don't invent one-off sizes.",
    "- Line height: 1.2 for display sizes (20px+), 1.5 for body sizes (12-16px).",
  ].join("\n");
}

function componentStylingsSection(t: DesignTokens): string {
  const sm = Math.max(2, Math.round(t.radius / 2));
  const lg = t.radius * 2;
  return [
    "## Component stylings",
    "",
    `- Radius scale (px): sm ${sm} · md ${t.radius} · lg ${lg} · full 9999. One scale, used everywhere — ` +
      "no ad-hoc radii next to the standard ones.",
    "- Buttons: `md` radius, brand-colored fill for primary, neutral border for secondary, no gradient fills.",
    "- Inputs: `sm` radius, neutral-300 border at rest, brand-colored border + ring on focus.",
    "- Cards: `lg` radius, neutral-100 background, neutral-300 border (prefer a border over a shadow in light mode).",
  ].join("\n");
}

function layoutSpacingSection(): string {
  return [
    "## Layout & spacing",
    "",
    "- Spacing scale (px, 4px base grid): 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64.",
    "- Container max-width: 1200px, centered, with 24px gutters on mobile.",
    "- Prefer asymmetric layouts — mixed widths, deliberate emphasis — over evenly divided grids; a row of " +
      "three equal-width cards is the single biggest tell of an unreviewed template.",
  ].join("\n");
}

function depthElevationSection(): string {
  return [
    "## Depth & elevation",
    "",
    "- Shadow scale: `sm` for hover states, `md` for popovers/dropdowns, `lg` for modals only.",
    "- Elevate sparingly — most surfaces should read as flat with a border, not lifted with a shadow.",
    "- z-index layers: base 0, sticky 10, dropdown 20, modal 30, toast 40. Don't invent values outside this set.",
  ].join("\n");
}

function dosDontsSection(): string {
  return [
    "## Do's and don'ts",
    "",
    "**Do**",
    "- Hold one accent color for the whole page.",
    "- Hold one radius system for the whole page.",
    "- Give neutrals a deliberate hue bias.",
    "- Decide light/dark at the page level, not per component.",
    "",
    "**Don't**",
    "- No second accent color, however small the use.",
    "- No three-equal-width card rows — it's the default output of ungrounded generation.",
    "- No AI-purple/mesh-blob gradients unless the brand explicitly calls for them.",
    "- No pure mid-grey (`#808080`-style) neutrals — always hue-biased.",
    "- No section-number eyebrows (\"001 · Features\") — they signal filler, not information.",
  ].join("\n");
}

function responsiveSection(): string {
  return [
    "## Responsive behavior",
    "",
    "- Breakpoints (px): 640 / 768 / 1024 / 1280. Design mobile-first; add complexity as width increases.",
    "- Minimum touch target: 44x44px on any interactive element below the 768px breakpoint.",
    "- Nav collapses to a single control below 768px; it never competes with the hero for vertical space.",
  ].join("\n");
}

function agentPromptGuideSection(): string {
  return [
    "## Agent prompt guide",
    "",
    "Any AI tool generating or modifying UI in this repository must follow this file as the source " +
      "of truth for color, type, spacing, radius, and elevation. When a decision isn't covered here, " +
      "match the closest existing pattern rather than inventing a new one — and if a new durable " +
      "decision gets made, update this file so the next session inherits it too.",
  ].join("\n");
}

/** Google-Stitch-standard DESIGN.md body from a resolved token set — shared by every method
 * (`author`, `import`) that ends up producing the real 9-section document. */
function buildDesignMd(config: Record<string, string> | undefined): string {
  const t = resolveTokens(config);
  return (
    [
      visualThemeSection(t),
      colorPaletteSection(t),
      typographySection(t),
      componentStylingsSection(t),
      layoutSpacingSection(),
      depthElevationSection(),
      dosDontsSection(),
      responsiveSection(),
      agentPromptGuideSection(),
    ].join("\n\n") + "\n"
  );
}

/** Google-Stitch-standard DESIGN.md, built from the design capability's config tokens (all optional). */
export function renderDesignMd(capability: Capability): string {
  return buildDesignMd(capability.config);
}

/** The AGENTS.md capabilities-section note for a design+author capability, regardless of store. */
export const DESIGN_AGENTS_NOTE =
  "### Design\n\n" +
  "Follow `DESIGN.md` for all UI and visual work — it is the source of truth for color, " +
  "type, spacing, and component conventions in this project.";

// ---------------------------------------------------------------------------
// method: import — capability.config.tokens is a JSON string, either a flat css-var map
// (`{"--brand": "#..."}`) or a loosely W3C-DTCG-shaped nested tree (`{color: {brand: "#..."},
// font: {display, body}, radius, theme, mood}`, values optionally wrapped as `{$value: ...}`).
// Parsing is error-tolerant: anything that doesn't parse as a JSON object falls back to the
// same defaults `author` uses, with a visible note instead of a crash.
// ---------------------------------------------------------------------------

const TOKENS_PARSE_ERROR_NOTE =
  "> **Note:** `tokens` could not be parsed as valid JSON — using the default design tokens " +
  "below instead. Fix the JSON and re-render to pick up the real values.\n\n";

/** Unwraps a raw token value, a bare string/number, or a DTCG-style `{ $value }` wrapper. */
function unwrapTokenValue(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object" && "$value" in (value as Record<string, unknown>)) {
    return unwrapTokenValue((value as Record<string, unknown>)["$value"]);
  }
  return undefined;
}

function firstDefined(...values: (string | undefined)[]): string | undefined {
  return values.find((v) => v !== undefined);
}

/** Maps a loosely DTCG-shaped nested token tree (`{color:{brand}, font:{display,body}, ...}`). */
function mapNestedTokens(parsed: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  const color = parsed.color;
  const brand =
    color && typeof color === "object"
      ? firstDefined(
          unwrapTokenValue((color as Record<string, unknown>).brand),
          unwrapTokenValue((color as Record<string, unknown>).primary),
          unwrapTokenValue((color as Record<string, unknown>).accent),
        )
      : firstDefined(unwrapTokenValue(parsed.brandColor), unwrapTokenValue(parsed.brand));
  if (brand) out.brandColor = brand;

  const font = parsed.font;
  if (font && typeof font === "object") {
    const f = font as Record<string, unknown>;
    const display = firstDefined(unwrapTokenValue(f.display), unwrapTokenValue(f.heading));
    const body = firstDefined(unwrapTokenValue(f.body), unwrapTokenValue(f.text));
    if (display) out.fontDisplay = display;
    if (body) out.fontBody = body;
  }

  const radius = unwrapTokenValue(parsed.radius);
  if (radius) out.radius = radius.replace(/px$/, "");
  const theme = unwrapTokenValue(parsed.theme);
  if (theme) out.theme = theme;
  const mood = unwrapTokenValue(parsed.mood);
  if (mood) out.mood = mood;
  return out;
}

/** Maps a flat CSS custom-property map (`{"--brand": "#...", "--font-display": "Inter", ...}`). */
function mapFlatCssVarTokens(parsed: Record<string, unknown>): Record<string, string> {
  const get = (...keys: string[]) => firstDefined(...keys.map((k) => unwrapTokenValue(parsed[k])));
  const out: Record<string, string> = {};
  const brand = get("--brand", "--color-brand", "--brand-color");
  if (brand) out.brandColor = brand;
  const display = get("--font-display", "--font-heading");
  if (display) out.fontDisplay = display;
  const body = get("--font-body", "--font-text");
  if (body) out.fontBody = body;
  const radius = get("--radius", "--border-radius");
  if (radius) out.radius = radius.replace(/px$/, "");
  const theme = get("--theme");
  if (theme) out.theme = theme;
  const mood = get("--mood");
  if (mood) out.mood = mood;
  return out;
}

/** Parses `config.tokens` into the same `Record<string,string>` shape `resolveTokens` expects.
 * Never throws: a missing `tokens` string resolves to `{ config: {}, failed: false }` (silent
 * defaults, nothing was actually malformed); invalid JSON or a non-object resolves to
 * `{ config: {}, failed: true }` (defaults, but with a visible parse-error note). */
function parseDesignTokens(tokensJson: string | undefined): { config: Record<string, string>; failed: boolean } {
  if (!tokensJson) return { config: {}, failed: false };
  let parsed: unknown;
  try {
    parsed = JSON.parse(tokensJson);
  } catch {
    return { config: {}, failed: true };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { config: {}, failed: true };
  }
  const record = parsed as Record<string, unknown>;
  const isFlatCssVars = Object.keys(record).some((k) => k.startsWith("--"));
  return { config: isFlatCssVars ? mapFlatCssVarTokens(record) : mapNestedTokens(record), failed: false };
}

/** DESIGN.md for the `import` method: parses `capability.config.tokens`, then reuses the exact
 * same 9-section builder `author` uses. A parse failure falls back to `author`'s own defaults,
 * with a visible note rather than crashing. */
export function renderImportDesignMd(capability: Capability): string {
  const { config, failed } = parseDesignTokens(capability.config?.tokens);
  const md = buildDesignMd(config);
  return failed ? TOKENS_PARSE_ERROR_NOTE + md : md;
}

// ---------------------------------------------------------------------------
// method: analyze — capability.config.url → a DESIGN.md SKELETON with TODO-extraction markers,
// plus a /design-analyze command. Extraction runs in the agent session (WebFetch + reasoning
// over the fetched CSS), never server-side at render time — this file only ever ships the
// skeleton and the protocol for filling it in.
// ---------------------------------------------------------------------------

const ANALYZE_SECTION_TITLES = [
  "Visual theme & atmosphere",
  "Color palette & roles",
  "Typography",
  "Component stylings",
  "Layout & spacing",
  "Depth & elevation",
  "Do's and don'ts",
  "Responsive behavior",
  "Agent prompt guide",
];

function analyzeSkeletonSection(title: string, url: string): string {
  return [
    `## ${title}`,
    "",
    `<!-- TODO(design-analyze): fetch ${url}, extract the tokens relevant to "${title}" from ` +
      "its live CSS, fill this section in the same format the `author`/`import` methods use, " +
      "then delete this marker. -->",
  ].join("\n");
}

/** DESIGN.md skeleton for the `analyze` method — same 9 headings as the real document, each
 * still holding a TODO marker naming what to extract and from where. */
export function renderAnalyzeDesignSkeleton(capability: Capability): string {
  const url = capability.config?.url || "<no url configured — set capability.config.url>";
  return (
    [
      `# DESIGN.md (skeleton — run \`/design-analyze\` to fill this in)`,
      `This is a placeholder generated by the \`design\`/\`analyze\` method for **${url}**. ` +
        "Nothing below has been extracted yet — every section still holds a TODO marker. Run " +
        "`/design-analyze` (see the command for the exact protocol) to fetch the site, extract " +
        "its design tokens, fill in each section, and delete the markers.",
      ...ANALYZE_SECTION_TITLES.map((title) => analyzeSkeletonSection(title, url)),
    ].join("\n\n") + "\n"
  );
}

function designAnalyzeCommand(url: string): PackCommand {
  return {
    name: "design-analyze",
    description: "Fetch a reference site and fill in DESIGN.md's skeleton from its live CSS.",
    argument_hint: "[url — defaults to the configured reference site]",
    prompt:
      `Fetch ${url} (or $ARGUMENTS, if a different URL is given) with a web-fetch tool and read ` +
      "its rendered CSS. Extract: the dominant accent color plus a neutral scale (color palette " +
      "& roles), the heading/body font stack (typography), the border-radius scale in use " +
      "(component stylings), and the spacing scale (layout & spacing). This extraction runs in " +
      "the agent session, not on a server — there is no build-time scraper — so re-run " +
      "`/design-analyze` whenever the reference site's design changes. Fill in each " +
      "`<!-- TODO(design-analyze): ... -->` section of `DESIGN.md`, matching the table/list " +
      "format the `author`/`import` methods produce, then delete the marker comment for every " +
      "section once it's filled in.",
  };
}

function designCapabilityFor(pack: WorkflowPack, store: "org" | "repo"): Capability | undefined {
  return (pack.capabilities ?? []).find(
    (c) => c.type === "design" && c.store === store && (c.method === "author" || c.method === "import" || c.method === "analyze"),
  );
}

function renderDesignFileFor(capability: Capability): string {
  if (capability.method === "import") return renderImportDesignMd(capability);
  if (capability.method === "analyze") return renderAnalyzeDesignSkeleton(capability);
  return renderDesignMd(capability);
}

/** True if this store has a real (non-"coming soon") design capability that would actually
 * scaffold a DESIGN.md — used by capabilities.ts to gate the AGENTS.md note (bug #37.1). */
export function hasRepoDesignCapability(pack: WorkflowPack): boolean {
  return designCapabilityFor(pack, "repo") !== undefined;
}

export function hasOrgDesignCapability(pack: WorkflowPack): boolean {
  return designCapabilityFor(pack, "org") !== undefined;
}

/** `DESIGN.md` at the repo root, for a repo-store design capability using `author`, `import`,
 * or `analyze` — whichever is present. */
export function renderRepoDesignFiles(pack: WorkflowPack): FileMap {
  const capability = designCapabilityFor(pack, "repo");
  return capability ? { "DESIGN.md": renderDesignFileFor(capability) } : {};
}

/** `DESIGN.md` in the laptop bundle, for an org-store design capability using `author`,
 * `import`, or `analyze` — whichever is present. */
export function renderBundleDesignFiles(pack: WorkflowPack): FileMap {
  const capability = designCapabilityFor(pack, "org");
  return capability ? { "DESIGN.md": renderDesignFileFor(capability) } : {};
}

function designAnalyzeCapabilityFor(pack: WorkflowPack, store: "org" | "repo"): Capability | undefined {
  return (pack.capabilities ?? []).find((c) => c.type === "design" && c.method === "analyze" && c.store === store);
}

export function hasRepoDesignAnalyze(pack: WorkflowPack): boolean {
  return designAnalyzeCapabilityFor(pack, "repo") !== undefined;
}

export function hasOrgDesignAnalyze(pack: WorkflowPack): boolean {
  return designAnalyzeCapabilityFor(pack, "org") !== undefined;
}

/** Adds the /design-analyze command to a pack, without disturbing what it already declares.
 * Only called when a design+analyze capability is present for the given store. */
export function withDesignAnalyzeScaffolding(pack: WorkflowPack, store: "org" | "repo"): WorkflowPack {
  const capability = designAnalyzeCapabilityFor(pack, store);
  if (!capability) return pack;
  const url = capability.config?.url || "<no url configured — set capability.config.url>";
  return { ...pack, commands: [...pack.commands, designAnalyzeCommand(url)] };
}
