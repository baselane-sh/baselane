import { describe, it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach } from "vitest";
import { parseGitignore, isIgnored } from "../src/gitignore.ts";
import { LocalDirFileSource } from "../src/file-source.ts";

const ignored = (patterns: string, path: string, isDir = false) =>
  isIgnored(parseGitignore(patterns), path, isDir);

describe("parseGitignore/isIgnored", () => {
  it("matches plain names at any depth", () => {
    expect(ignored("coverage", "coverage", true)).toBe(true);
    expect(ignored("coverage", "pkg/coverage", true)).toBe(true);
    expect(ignored("coverage", "src/coverage.ts")).toBe(false);
  });

  it("dir-only patterns (trailing slash) never match files", () => {
    expect(ignored("build/", "build", true)).toBe(true);
    expect(ignored("build/", "build", false)).toBe(false);
  });

  it("anchors patterns containing a slash to the root", () => {
    expect(ignored("/site-next", "site-next", true)).toBe(true);
    expect(ignored("/site-next", "apps/site-next", true)).toBe(false);
    expect(ignored("docs/tmp", "docs/tmp", true)).toBe(true);
    expect(ignored("docs/tmp", "x/docs/tmp", true)).toBe(false);
  });

  it("handles *, ** and ? globs", () => {
    expect(ignored("*.log", "a.log")).toBe(true);
    expect(ignored("*.log", "deep/dir/b.log")).toBe(true);
    expect(ignored("*.log", "a.log.txt")).toBe(false);
    expect(ignored("out/**", "out/a/b/c.js")).toBe(true);
    expect(ignored("a/**/b", "a/b", true)).toBe(true);
    expect(ignored("a/**/b", "a/x/y/b", true)).toBe(true);
    expect(ignored("?.md", "a.md")).toBe(true);
    expect(ignored("?.md", "ab.md")).toBe(false);
  });

  it("last matching rule wins (negation)", () => {
    const rules = "*.log\n!keep.log";
    expect(ignored(rules, "a.log")).toBe(true);
    expect(ignored(rules, "keep.log")).toBe(false);
  });

  it("skips comments and blank lines", () => {
    expect(parseGitignore("# comment\n\nfoo\n")).toHaveLength(1);
  });
});

describe("LocalDirFileSource gitignore awareness", () => {
  let dir: string;
  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  async function scaffold(gitignore: string | null): Promise<LocalDirFileSource> {
    dir = await mkdtemp(join(tmpdir(), "bl-gitignore-"));
    await mkdir(join(dir, "src"), { recursive: true });
    await mkdir(join(dir, "site-next"), { recursive: true });
    await mkdir(join(dir, "hermes-agent", "deep"), { recursive: true });
    await writeFile(join(dir, "src", "index.ts"), "export {}\n");
    await writeFile(join(dir, "site-next", "page.tsx"), "export {}\n");
    await writeFile(join(dir, "hermes-agent", "deep", "mod.py"), "x = 1\n");
    await writeFile(join(dir, "debug.log"), "log\n");
    if (gitignore !== null) await writeFile(join(dir, ".gitignore"), gitignore);
    return new LocalDirFileSource(dir);
  }

  it("prunes gitignored directories and files from the walk", async () => {
    const src = await scaffold("site-next/\n*.log\n");
    const files = await src.listFiles();
    expect(files).toContain("src/index.ts");
    expect(files).toContain("hermes-agent/deep/mod.py");
    expect(files.some((f) => f.startsWith("site-next/"))).toBe(false);
    expect(files).not.toContain("debug.log");
  });

  it("applies caller excludes on top of .gitignore (the committed-vendored-tree case)", async () => {
    await scaffold("site-next/\n");
    const src = new LocalDirFileSource(dir, { excludes: ["hermes-agent/"] });
    const files = await src.listFiles();
    expect(files).toContain("src/index.ts");
    expect(files.some((f) => f.startsWith("hermes-agent/"))).toBe(false);
    expect(files.some((f) => f.startsWith("site-next/"))).toBe(false);
  });

  it("scans everything when there is no .gitignore", async () => {
    const src = await scaffold(null);
    const files = await src.listFiles();
    expect(files).toContain("site-next/page.tsx");
    expect(files).toContain("hermes-agent/deep/mod.py");
  });
});
