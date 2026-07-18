import type { DesignToken, DesignTokensReport } from "./detect/design-tokens.ts";
import { sanitizeNarration } from "./architecture.ts";

export const DESIGN_REGION_ID = "design";
export const DESIGN_REGION_VERSION = "1";

export interface DesignNarration {
  dosDonts: string; // AI-written markdown for "Do's and don'ts"
  agentGuide: string; // AI-written markdown for "Agent prompt guide"
}

export interface DesignInput {
  tokens: DesignTokensReport;
  narration?: DesignNarration | null;
}

const NO_SURFACE =
  "## Design system\n\n" +
  "No design surface detected in this repository — baselane found no CSS custom properties, " +
  "stylesheets, tailwind/theme config, or UI framework. No design system was fabricated. If this " +
  "repo does have UI, make sure its stylesheets or design tokens are committed, then regenerate " +
  "with `baselane map .`.\n";

const GENERIC_DOS_DONTS = [
  "**Do**",
  "- Reuse the extracted tokens above instead of hard-coding new colors, radii, or spacing.",
  "- Keep one accent color and one radius scale across the whole UI.",
  "",
  "**Don't**",
  "- No second accent color, however small the use.",
  "- No pure mid-grey neutrals — bias them toward the brand hue.",
];

const GENERIC_AGENT_GUIDE = [
  "Any AI tool generating or modifying UI in this repository must use the extracted tokens above " +
    "as the source of truth for color, type, spacing, and radius. When a decision isn't covered " +
    "here, match the closest existing token rather than inventing a new one.",
];

function colorTable(colors: DesignToken[]): string[] {
  if (colors.length === 0) return ["_(no color tokens found)_"];
  return ["| Token | Value |", "| --- | --- |", ...colors.map((c) => `| \`${c.name}\` | ${c.value} |`)];
}

function bulletList(items: string[], empty: string): string[] {
  return items.length === 0 ? [`_${empty}_`] : items.map((i) => `- ${i}`);
}

function dosDontsSection(narration: DesignNarration | null | undefined): string[] {
  if (narration) return ["## Do's and don'ts (AI-generated)", "", sanitizeNarration(narration.dosDonts)];
  return ["## Do's and don'ts", "", ...GENERIC_DOS_DONTS];
}

function agentGuideSection(narration: DesignNarration | null | undefined): string[] {
  if (narration) return ["## Agent prompt guide (AI-generated)", "", sanitizeNarration(narration.agentGuide)];
  return ["## Agent prompt guide", "", ...GENERIC_AGENT_GUIDE];
}

export function renderDesignMd(input: DesignInput): string {
  const { tokens, narration } = input;
  if (!tokens.hasUiSurface) return NO_SURFACE;

  const lines: string[] = [];

  lines.push("## Design tokens (extracted)", "");
  lines.push(
    tokens.sources.length > 0
      ? `Extracted deterministically from ${tokens.sources.length} file(s): ${tokens.sources.join(", ")}.`
      : "No token files found, but a UI framework is present — add design tokens and regenerate.",
  );
  if (tokens.frameworks.length > 0) lines.push(`UI frameworks detected: ${tokens.frameworks.join(", ")}.`);
  lines.push(`${tokens.customPropertyCount} CSS custom properties scanned.`);

  lines.push("", "## Color palette & roles", "");
  lines.push(...colorTable(tokens.colors));
  lines.push("", "Hold one accent for the whole UI; differentiate with weight, size, and spacing, not extra hues.");

  lines.push("", "## Typography", "");
  lines.push(...bulletList(tokens.fonts, "no font-family declarations found"));

  lines.push("", "## Component stylings", "", "Border-radius scale in use:");
  lines.push(...bulletList(tokens.radii, "no radius tokens found"));

  lines.push("", "## Layout & spacing", "", "Spacing scale in use:");
  lines.push(...bulletList(tokens.spacing, "no spacing tokens found"));

  lines.push("", ...dosDontsSection(narration));
  lines.push("", ...agentGuideSection(narration));

  return lines.join("\n") + "\n";
}
