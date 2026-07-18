import { describe, expect, it } from "vitest";
import { validateManifest } from "@baselane/packs";
import { manifestExamples } from "../src/manifest-examples.ts";

describe("manifestExamples", () => {
  it("has at least 8 entries", () => {
    expect(manifestExamples.length).toBeGreaterThanOrEqual(8);
  });

  it("has both valid and invalid entries", () => {
    expect(manifestExamples.some((e) => e.valid)).toBe(true);
    expect(manifestExamples.some((e) => !e.valid)).toBe(true);
  });

  for (const example of manifestExamples) {
    it(`"${example.title}": validateManifest ${example.valid ? "accepts" : "rejects"} it`, () => {
      if (example.valid) {
        expect(() => validateManifest(example.json)).not.toThrow();
      } else {
        expect(() => validateManifest(example.json)).toThrow();
      }
    });
  }
});
