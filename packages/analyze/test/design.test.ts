import { describe, expect, it } from "vitest";
import type { DesignTokensReport } from "../src/detect/design-tokens.ts";
import { renderDesignMd } from "../src/design.ts";

const uiTokens: DesignTokensReport = {
  version: 1,
  hasUiSurface: true,
  sources: ["src/theme.css"],
  frameworks: ["react"],
  colors: [{ name: "--brand", value: "#4F46E5" }],
  fonts: ["Inter, sans-serif"],
  radii: ["4px", "8px"],
  spacing: ["8px", "16px"],
  customPropertyCount: 4,
};

describe("renderDesignMd", () => {
  it("renders token-derived sections when a UI surface exists", () => {
    const md = renderDesignMd({ tokens: uiTokens });
    expect(md).toContain("## Design tokens (extracted)");
    expect(md).toContain("## Color palette & roles");
    expect(md).toContain("| `--brand` | #4F46E5 |");
    expect(md).toContain("## Typography");
    expect(md).toContain("- Inter, sans-serif");
    expect(md).toContain("## Component stylings");
    expect(md).toContain("- 8px");
    expect(md).toContain("## Layout & spacing");
    expect(md).toContain("## Do's and don'ts");
    expect(md).not.toContain("(AI-generated)");
  });

  it("labels narrative sections AI-generated when narration is provided", () => {
    const md = renderDesignMd({ tokens: uiTokens, narration: { dosDonts: "Do use tokens.", agentGuide: "Follow DESIGN.md." } });
    expect(md).toContain("## Do's and don'ts (AI-generated)");
    expect(md).toContain("Do use tokens.");
    expect(md).toContain("## Agent prompt guide (AI-generated)");
    expect(md).toContain("Follow DESIGN.md.");
  });

  it("emits an honest no-surface note when no UI is detected", () => {
    const md = renderDesignMd({
      tokens: { version: 1, hasUiSurface: false, sources: [], frameworks: [], colors: [], fonts: [], radii: [], spacing: [], customPropertyCount: 0 },
    });
    expect(md).toContain("No design surface detected");
    expect(md).not.toContain("## Color palette");
  });
});
