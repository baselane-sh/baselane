import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LocalDirFileSource } from "../src/file-source.ts";
import { detectPackageManager } from "../src/detect/package-manager.ts";

const here = dirname(fileURLToPath(import.meta.url));
const src = (name: string) => new LocalDirFileSource(join(here, "fixtures", name));

describe("detectPackageManager", () => {
  it("detects pnpm from pnpm-lock.yaml", async () => {
    expect(await detectPackageManager(src("node-vitest-app"))).toBe("pnpm");
  });

  it("detects npm from package-lock.json", async () => {
    expect(await detectPackageManager(src("npm-no-tests"))).toBe("npm");
  });

  it("detects yarn, bun, and null when no lockfile exists", async () => {
    expect(await detectPackageManager(src("yarn-app"))).toBe("yarn");
    expect(await detectPackageManager(src("bun-app"))).toBe("bun");
    expect(await detectPackageManager(src("no-lockfile"))).toBeNull();
  });
});
