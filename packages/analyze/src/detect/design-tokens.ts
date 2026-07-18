import type { RepoFileSource } from "../types.ts";

export interface DesignToken {
  name: string; // "--color-brand" (CSS var) or "brand" (tailwind key)
  value: string; // "#4F46E5"
}

export interface DesignTokensReport {
  version: 1;
  /** True when the repo has any stylesheet or UI framework — false means "no design surface". */
  hasUiSurface: boolean;
  sources: string[]; // sorted repo-relative files tokens were extracted from
  frameworks: string[]; // sorted UI frameworks, e.g. ["react", "tailwindcss"]
  colors: DesignToken[]; // deduped by name, sorted by name
  fonts: string[]; // distinct font-family stacks, sorted
  radii: string[]; // distinct radius lengths, sorted by numeric value
  spacing: string[]; // distinct spacing lengths, sorted by numeric value
  customPropertyCount: number;
}

const MAX_FILE_BYTES = 64 * 1024;
const STYLE_EXTS = new Set([".css", ".scss", ".sass", ".less"]);
const TAILWIND_CONFIGS = ["tailwind.config.js", "tailwind.config.cjs", "tailwind.config.mjs", "tailwind.config.ts"];

const UI_FRAMEWORK_DEPS: ReadonlyArray<{ dep: string; name: string }> = [
  { dep: "react", name: "react" },
  { dep: "react-dom", name: "react" },
  { dep: "preact", name: "preact" },
  { dep: "vue", name: "vue" },
  { dep: "svelte", name: "svelte" },
  { dep: "@angular/core", name: "angular" },
  { dep: "solid-js", name: "solid" },
  { dep: "next", name: "next" },
  { dep: "nuxt", name: "nuxt" },
  { dep: "astro", name: "astro" },
  { dep: "tailwindcss", name: "tailwindcss" },
];

function ext(path: string): string {
  const dot = path.lastIndexOf(".");
  return dot === -1 ? "" : path.slice(dot);
}

const COLOR_FUNC_RE = /^(rgb|rgba|hsl|hsla|oklch|oklab|color)\(/i;
const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const NAMED_COLORS = new Set([
  "white",
  "black",
  "red",
  "blue",
  "green",
  "orange",
  "purple",
  "gray",
  "grey",
  "transparent",
  "currentcolor",
]);
function isColorValue(value: string): boolean {
  const trimmed = value.trim();
  if (HEX_COLOR_RE.test(trimmed)) return true;
  if (COLOR_FUNC_RE.test(trimmed)) return true;
  if (NAMED_COLORS.has(trimmed.toLowerCase())) return true;
  return false;
}

const LENGTH_RE = /^-?\d*\.?\d+(px|rem|em|%|vh|vw|pt)$/;
function isLength(value: string): boolean {
  return LENGTH_RE.test(value.trim());
}

function isUrlValue(value: string): boolean {
  return /url\(/i.test(value);
}

function nameSuggestsRadius(name: string): boolean {
  return /(radius|rounded|corner)/i.test(name);
}
function nameSuggestsSpacing(name: string): boolean {
  return !nameSuggestsFont(name) && /(space|spacing|gap|inset|gutter|margin|padding)/i.test(name);
}
function nameSuggestsFont(name: string): boolean {
  return /(font|typeface|family)/i.test(name);
}

function sortLengths(values: string[]): string[] {
  const num = (v: string) => parseFloat(v) || 0;
  return [...new Set(values)].sort((a, b) => num(a) - num(b) || a.localeCompare(b));
}

function detectFrameworks(pkgJson: string | null): string[] {
  if (pkgJson === null) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(pkgJson);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== "object") return [];
  const o = parsed as Record<string, unknown>;
  const deps: Record<string, unknown> = {
    ...((o.dependencies as Record<string, unknown>) ?? {}),
    ...((o.devDependencies as Record<string, unknown>) ?? {}),
    ...((o.peerDependencies as Record<string, unknown>) ?? {}),
  };
  const present = new Set(Object.keys(deps));
  const found = new Set<string>();
  for (const { dep, name } of UI_FRAMEWORK_DEPS) if (present.has(dep)) found.add(name);
  return [...found];
}

export async function analyzeDesignTokens(
  source: RepoFileSource,
  opts: { sampleCap?: number } = {},
): Promise<DesignTokensReport> {
  const sampleCap = opts.sampleCap ?? 200;
  const files = await source.listFiles();
  const present = new Set(files);

  const frameworks = detectFrameworks(await source.readFile("package.json"));

  const sources: string[] = [];
  const colorsByName = new Map<string, string>();
  const fonts = new Set<string>();
  const radii: string[] = [];
  const spacing: string[] = [];
  let customPropertyCount = 0;
  let styleFilesScanned = 0;

  // 1. Stylesheets: custom properties + font-family + border-radius declarations.
  const styleFiles = files.filter((f) => STYLE_EXTS.has(ext(f)));
  for (const path of styleFiles) {
    if (styleFilesScanned >= sampleCap) break;
    const rawContent = await source.readFile(path);
    if (rawContent === null || rawContent.length > MAX_FILE_BYTES) continue;
    const content = rawContent.replace(/\/\*[\s\S]*?\*\//g, "");
    styleFilesScanned++;
    let yielded = false;

    for (const m of content.matchAll(/--([a-z0-9-]+)\s*:\s*((?:"[^"]*"|'[^']*'|[^;{}"'])+)/gi)) {
      const name = `--${m[1]}`;
      const value = m[2].trim();
      if (value === "") continue;
      customPropertyCount++;
      yielded = true;
      if (isUrlValue(value)) continue;
      if (isColorValue(value)) {
        if (!colorsByName.has(name)) colorsByName.set(name, value);
      } else if (nameSuggestsRadius(name) && isLength(value)) {
        radii.push(value);
      } else if (nameSuggestsSpacing(name) && isLength(value)) {
        spacing.push(value);
      } else if (nameSuggestsFont(name)) {
        const trimmed = value.trim();
        if (!isLength(trimmed) && !/^\d+(\.\d+)?$/.test(trimmed)) {
          fonts.add(value);
        }
      }
    }
    for (const m of content.matchAll(/font-family\s*:\s*([^;{}]+)[;}]/gi)) {
      const stack = m[1].trim().replace(/\s+/g, " ");
      if (stack !== "" && !stack.startsWith("var(")) {
        fonts.add(stack);
        yielded = true;
      }
    }
    for (const m of content.matchAll(/border-radius\s*:\s*([^;{}]+)[;}]/gi)) {
      for (const tok of m[1].trim().split(/\s+/)) {
        if (isLength(tok)) {
          radii.push(tok);
          yielded = true;
        }
      }
    }
    if (yielded) sources.push(path);
  }

  // 2. Tailwind config: presence (UI-surface signal) + best-effort named hex colors.
  const tailwindPath = TAILWIND_CONFIGS.find((p) => present.has(p));
  if (tailwindPath) {
    if (!frameworks.includes("tailwindcss")) frameworks.push("tailwindcss");
    sources.push(tailwindPath);
    const text = (await source.readFile(tailwindPath)) ?? "";
    for (const m of text.matchAll(/["']?([a-z0-9-]+)["']?\s*:\s*["'](#[0-9a-f]{3,8})["']/gi)) {
      const name = m[1];
      if (!colorsByName.has(name)) colorsByName.set(name, m[2]);
    }
  }

  const colors = [...colorsByName.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    version: 1,
    hasUiSurface: styleFilesScanned > 0 || frameworks.length > 0,
    sources: [...new Set(sources)].sort(),
    frameworks: [...frameworks].sort(),
    colors,
    fonts: [...fonts].sort(),
    radii: sortLengths(radii),
    spacing: sortLengths(spacing),
    customPropertyCount,
  };
}
