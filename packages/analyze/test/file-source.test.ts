import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LocalDirFileSource } from "../src/file-source.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => join(here, "fixtures", name);

describe("LocalDirFileSource", () => {
  it("lists repo-relative POSIX paths and excludes node_modules", async () => {
    const src = new LocalDirFileSource(fixture("node-vitest-app"));
    const files = await src.listFiles();
    expect(files).toContain("package.json");
    expect(files).toContain("src/index.ts");
    expect(files.some((f) => f.includes("node_modules"))).toBe(false);
    expect(files.every((f) => !f.startsWith("/"))).toBe(true);
  });

  it("reads a file and returns null for a missing one", async () => {
    const src = new LocalDirFileSource(fixture("node-vitest-app"));
    expect(await src.readFile("package.json")).toContain('"name"');
    expect(await src.readFile("does-not-exist.txt")).toBeNull();
  });

  it("propagates non-ENOENT errors instead of masking them as null", async () => {
    const src = new LocalDirFileSource(fixture("node-vitest-app"));
    await expect(src.readFile("src")).rejects.toThrow(); // EISDIR: path exists but is a directory
  });
});
