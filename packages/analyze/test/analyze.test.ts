import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LocalDirFileSource } from "../src/file-source.ts";
import { analyze } from "../src/analyze.ts";

const here = dirname(fileURLToPath(import.meta.url));
const src = (name: string) => new LocalDirFileSource(join(here, "fixtures", name));

describe("analyze", () => {
  it("assembles a full AnalysisProfile for a pnpm + vitest app", async () => {
    const profile = await analyze(src("node-vitest-app"));
    expect(profile).toEqual({
      languages: ["typescript"],
      packageManager: "pnpm",
      frameworks: [
        { name: "react", version: "^18.2.0" },
        { name: "vitest", version: "^2.0.0" },
      ],
      commands: { build: "pnpm run build", test: "pnpm run test", lint: "pnpm run lint" },
      hasTestSuite: true,
      layout: "single",
    });
  });

  it("reports no test suite for the npm placeholder fixture", async () => {
    const profile = await analyze(src("npm-no-tests"));
    expect(profile.hasTestSuite).toBe(false);
    expect(profile.packageManager).toBe("npm");
  });
});
