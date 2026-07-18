import { describe, expect, it } from "vitest";
import { formatOnboarding } from "../src/onboarding.ts";

describe("formatOnboarding", () => {
  it("prints one line per step with its command and the coming-soon auto-run label", () => {
    const out = formatOnboarding([
      { packId: "sys", stepId: "gen-map", title: "Generate the system map", description: "Analyze the repo.", command: "baselane map ." },
      { packId: "mem", stepId: "init", title: "Initialize memory", description: "Create the dir." },
    ]);
    expect(out).toContain("Onboarding");
    expect(out).toContain("Generate the system map");
    expect(out).toContain("baselane map .");
    expect(out).toContain("Initialize memory");
    // honesty rule: auto-run is labeled coming soon, never performed
    expect(out.toLowerCase()).toContain("coming soon");
  });

  it("returns an empty string for no steps", () => {
    expect(formatOnboarding([])).toBe("");
  });
});
