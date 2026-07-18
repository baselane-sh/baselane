import { describe, expect, it } from "vitest";
import type { RepoFileSource } from "../src/types.ts";
import { analyzeDesignTokens } from "../src/detect/design-tokens.ts";

export function memSource(files: Record<string, string>): RepoFileSource {
  return {
    listFiles: async () => Object.keys(files).sort(),
    readFile: async (path) => (path in files ? files[path] : null),
  };
}

describe("analyzeDesignTokens", () => {
  it("extracts colors, fonts, radii and spacing from a stylesheet", async () => {
    const css = [
      ":root {",
      "  --color-brand: #4F46E5;",
      "  --color-bg: #ffffff;",
      "  --radius-md: 8px;",
      "  --space-4: 16px;",
      '  --font-body: "Inter", sans-serif;',
      "}",
      ".btn { border-radius: 4px; font-family: Georgia, serif; }",
    ].join("\n");
    const report = await analyzeDesignTokens(memSource({ "src/styles.css": css, "package.json": "{}" }));
    expect(report.version).toBe(1);
    expect(report.hasUiSurface).toBe(true);
    expect(report.sources).toEqual(["src/styles.css"]);
    expect(report.colors).toEqual([
      { name: "--color-bg", value: "#ffffff" },
      { name: "--color-brand", value: "#4F46E5" },
    ]);
    expect(report.radii).toEqual(["4px", "8px"]);
    expect(report.spacing).toEqual(["16px"]);
    expect(report.fonts).toEqual(['"Inter", sans-serif', "Georgia, serif"]);
  });

  it("detects UI frameworks from package.json even with no stylesheet", async () => {
    const pkg = JSON.stringify({ dependencies: { react: "^18", "react-dom": "^18" }, devDependencies: { tailwindcss: "^3" } });
    const report = await analyzeDesignTokens(memSource({ "package.json": pkg, "src/App.tsx": "export const App = () => null;\n" }));
    expect(report.hasUiSurface).toBe(true);
    expect(report.frameworks).toEqual(["react", "tailwindcss"]);
    expect(report.colors).toEqual([]);
  });

  it("extracts named hex colors and presence from a tailwind config", async () => {
    const tw = `module.exports = { theme: { extend: { colors: { brand: "#0EA5E9", ink: '#111827' } } } };`;
    const report = await analyzeDesignTokens(memSource({ "tailwind.config.js": tw, "package.json": "{}" }));
    expect(report.frameworks).toContain("tailwindcss");
    expect(report.sources).toContain("tailwind.config.js");
    expect(report.colors).toEqual([
      { name: "brand", value: "#0EA5E9" },
      { name: "ink", value: "#111827" },
    ]);
  });

  it("reports no UI surface for a backend-only repo", async () => {
    const report = await analyzeDesignTokens(
      memSource({ "src/index.ts": "export const x = 1;\n", "package.json": JSON.stringify({ dependencies: { express: "^4" } }) }),
    );
    expect(report.hasUiSurface).toBe(false);
    expect(report.sources).toEqual([]);
    expect(report.frameworks).toEqual([]);
    expect(report.colors).toEqual([]);
  });

  it("dedupes and sorts radii/spacing numerically", async () => {
    const css = ":root { --radius-lg: 12px; --radius-sm: 2px; } .a{border-radius:12px} .b{border-radius:2px}";
    const report = await analyzeDesignTokens(memSource({ "a.css": css }));
    expect(report.radii).toEqual(["2px", "12px"]);
    expect(report.hasUiSurface).toBe(true);
  });

  it("does not classify non-color values as colors just because the name suggests color (F1)", async () => {
    const css = [
      ":root {",
      "  --background-position: center;",
      "  --border-style: solid;",
      "  --text-align: left;",
      "  --fg-visibility: hidden;",
      "  --brand: #1470FD;",
      "  --accent: oklch(0.7 0.1 250);",
      "}",
    ].join("\n");
    const report = await analyzeDesignTokens(memSource({ "src/styles.css": css }));
    expect(report.colors).toEqual([
      { name: "--accent", value: "oklch(0.7 0.1 250)" },
      { name: "--brand", value: "#1470FD" },
    ]);
  });

  it("does not truncate values at semicolons inside quoted strings, and excludes url() from token classification (F2)", async () => {
    const css = [
      ":root {",
      "  --bg-image: url(\"data:image/svg+xml;utf8,<svg xmlns='x'></svg>\");",
      "  --color-brand: #4F46E5;",
      "}",
    ].join("\n");
    const report = await analyzeDesignTokens(memSource({ "src/styles.css": css }));
    expect(report.colors).toEqual([{ name: "--color-brand", value: "#4F46E5" }]);
    const allColorValues = report.colors.map((c) => c.value).join(" ");
    expect(allColorValues).not.toContain("url(");
    expect(allColorValues).not.toContain("svg");
  });

  it("excludes bare 'size' and font-named properties from spacing classification (F3)", async () => {
    const css = [
      ":root {",
      "  --font-size-base: 16px;",
      "  --icon-size: 24px;",
      "  --space-4: 16px;",
      "}",
    ].join("\n");
    const report = await analyzeDesignTokens(memSource({ "src/styles.css": css }));
    expect(report.spacing).not.toContain("24px");
    expect(report.spacing).toEqual(["16px"]);
  });

  it("strips CSS comments before scanning so commented-out properties are not extracted (F4)", async () => {
    const css = [
      ":root {",
      "  /* --color-hidden: #000000; */",
      "  --color-brand: #4F46E5;",
      "}",
      "/*",
      " multi-line comment with --color-multiline: #ABCDEF;",
      "*/",
    ].join("\n");
    const report = await analyzeDesignTokens(memSource({ "src/styles.css": css }));
    expect(report.colors).toEqual([{ name: "--color-brand", value: "#4F46E5" }]);
  });

  it("rejects length and numeric values from font bucket (F5)", async () => {
    const css = [
      ":root {",
      "  --font-size-base: 16px;",
      "  --font-weight-bold: 700;",
      '  --font-body: "Inter", sans-serif;',
      "}",
    ].join("\n");
    const report = await analyzeDesignTokens(memSource({ "src/styles.css": css }));
    expect(report.fonts).toEqual(['"Inter", sans-serif']);
  });
});
