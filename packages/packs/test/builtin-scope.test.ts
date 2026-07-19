import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validatePack, packScope } from "../src/index.ts";

const packsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "packs");
const load = (id: string) => validatePack(JSON.parse(readFileSync(join(packsDir, id, "pack.json"), "utf8")));

const EXPECTED_SCOPE: Record<string, "repo" | "developer" | "both"> = {
  "database-review": "repo",
  "frontend-design": "repo",
  "frontend-taste": "repo",
  "security-review": "repo",
  "go-rules": "repo",
  "python-rules": "repo",
  "typescript-rules": "repo",
  "full-harness": "both",
  "second-brain": "both",
  "software-engineer-harness": "both",
  "disciplined-workflow": "both",
  "systematic-debugging": "both",
  "token-efficiency-harness": "both",
};

const EXPECT_ONBOARDING = ["database-review", "frontend-taste", "token-efficiency-harness", "disciplined-workflow", "software-engineer-harness"];

describe("built-in classification", () => {
  it("every built-in on disk has an expected scope entry (no drift)", () => {
    const ids = readdirSync(packsDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
    expect(ids).toEqual(Object.keys(EXPECTED_SCOPE).sort());
  });

  for (const [id, scope] of Object.entries(EXPECTED_SCOPE)) {
    it(`${id} is scoped ${scope}`, () => {
      expect(packScope(load(id))).toBe(scope);
    });
  }

  for (const id of EXPECT_ONBOARDING) {
    it(`${id} declares at least one valid onboarding step`, () => {
      const pack = load(id);
      expect(pack.onboarding && pack.onboarding.length > 0).toBe(true);
      for (const step of pack.onboarding!) {
        expect(step.id.length).toBeGreaterThan(0);
        expect(step.title.length).toBeGreaterThan(0);
        expect(step.description.length).toBeGreaterThan(0);
      }
    });
  }
});
