import { describe, expect, it } from "vitest";
import { validatePack } from "@baselane/packs";
import { packExamples } from "../src/pack-examples.ts";

describe("packExamples", () => {
  it("has at least 5 entries", () => {
    expect(packExamples.length).toBeGreaterThanOrEqual(5);
  });

  it("has both valid and invalid entries", () => {
    expect(packExamples.some((e) => e.valid)).toBe(true);
    expect(packExamples.some((e) => !e.valid)).toBe(true);
  });

  for (const example of packExamples) {
    it(`"${example.title}": validatePack ${example.valid ? "accepts" : "rejects"} it`, () => {
      if (example.valid) {
        expect(() => validatePack(example.json)).not.toThrow();
      } else {
        expect(() => validatePack(example.json)).toThrow();
      }
    });
  }
});
