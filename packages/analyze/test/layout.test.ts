import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LocalDirFileSource } from "../src/file-source.ts";
import { detectLayout } from "../src/detect/layout.ts";

const here = dirname(fileURLToPath(import.meta.url));
const src = (name: string) => new LocalDirFileSource(join(here, "fixtures", name));

describe("detectLayout", () => {
  it("flags monorepo when pnpm-workspace.yaml exists", async () => {
    expect(await detectLayout(src("pnpm-monorepo"))).toBe("monorepo");
  });

  it("defaults to single when no workspace markers exist", async () => {
    expect(await detectLayout(src("node-vitest-app"))).toBe("single");
  });

  it("flags monorepo when package.json has a workspaces field", async () => {
    expect(await detectLayout(src("npm-workspaces"))).toBe("monorepo");
  });

  it("treats an empty workspaces field as single", async () => {
    expect(await detectLayout(src("empty-workspaces"))).toBe("single");
  });
});
