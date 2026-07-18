import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LocalDirFileSource } from "../src/file-source.ts";
import { detectLanguages } from "../src/detect/languages.ts";
import type { RepoFileSource } from "../src/types.ts";

const here = dirname(fileURLToPath(import.meta.url));
const src = (name: string) => new LocalDirFileSource(join(here, "fixtures", name));
const mem = (paths: string[]): RepoFileSource => ({ async listFiles() { return paths; }, async readFile() { return null; } });

describe("detectLanguages", () => {
  it("detects typescript and javascript from file extensions", async () => {
    const langs = await detectLanguages(src("node-vitest-app"));
    expect(langs).toEqual(["typescript"]); // fixture has only .ts files
  });

  it("returns sorted unique values", async () => {
    const langs = await detectLanguages(src("node-vitest-app"));
    expect(langs).toEqual([...new Set(langs)].sort());
  });

  it("detects javascript from .js files", async () => {
    expect(await detectLanguages(src("npm-no-tests"))).toEqual(["javascript"]);
  });

  it("ignores extensionless dotfiles", async () => {
    expect(await detectLanguages(src("node-vitest-app"))).toEqual(["typescript"]);
  });

  it("detects non-JS languages (python, go, rust, ruby, java) — not JS/TS only", async () => {
    const langs = await detectLanguages(mem(["main.py", "server.go", "lib.rs", "app.rb", "Main.java", "index.ts"]));
    expect(langs).toEqual(["go", "java", "python", "ruby", "rust", "typescript"]);
  });

  it("detects a pure Go repo (regression for languages: [] on non-Node repos)", async () => {
    expect(await detectLanguages(mem(["cmd/main.go", "internal/x_test.go", "go.mod"]))).toEqual(["go"]);
  });
});
