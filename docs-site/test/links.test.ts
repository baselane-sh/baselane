// docs-site/test/links.test.ts — every href emitted across the built site must resolve: either
// to a file the build actually wrote (optionally with a #fragment anchored in that same file), or
// to an allow-listed external prefix. Catches a page module linking a filename that was renamed,
// never built, or typo'd.
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildAll } from "../../scripts/build-docs.ts";

const EXTERNAL_ALLOW_PREFIXES = ["https://baselane.sh", "https://github.com"];

// Scoped to <a> tags only — this test is about navigational link integrity. It deliberately
// ignores <link rel="stylesheet" href="/styles.css"> and friends, which point at non-.html static
// assets buildAll() also writes (see the styles.css/docs.css assertions in build.test.ts).
const HREF_RE = /<a\b[^>]*\bhref="([^"]*)"/g;

let outDir: string;

beforeEach(async () => {
  outDir = await mkdtemp(path.join(tmpdir(), "docs-site-links-test-"));
});

afterEach(async () => {
  await rm(outDir, { recursive: true, force: true });
});

describe("link integrity", () => {
  it("resolves every href in every emitted page to an emitted file (or anchor within one) or an allow-listed external prefix", async () => {
    await buildAll(outDir);
    const filenames = new Set((await readdir(outDir)).filter((f) => f.endsWith(".html")));
    expect(filenames.size).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const filename of filenames) {
      const html = await readFile(path.join(outDir, filename), "utf8");
      for (const match of html.matchAll(HREF_RE)) {
        const href = match[1] ?? "";
        if (href.length === 0) continue;
        if (href.startsWith("http://") || href.startsWith("https://")) {
          if (!EXTERNAL_ALLOW_PREFIXES.some((p) => href.startsWith(p))) {
            offenders.push(`${filename}: external href not allow-listed: ${href}`);
          }
          continue;
        }
        // internal: strip a #fragment, resolve the remaining path against the target file (or
        // the current page, for a bare "#fragment" link) — must be one of the emitted files.
        const [rawPath, fragment] = href.split("#", 2);
        const targetFile = rawPath === "" ? filename : rawPath.replace(/^\//, "");
        if (!filenames.has(targetFile)) {
          offenders.push(`${filename}: href "${href}" does not resolve to an emitted file (got "${targetFile}")`);
          continue;
        }
        if (fragment !== undefined) {
          const targetHtml = targetFile === filename ? html : await readFile(path.join(outDir, targetFile), "utf8");
          const anchored = targetHtml.includes(`id="${fragment}"`) || targetHtml.includes(`name="${fragment}"`);
          if (!anchored) {
            offenders.push(`${filename}: href "${href}" fragment "#${fragment}" has no matching id/name in ${targetFile}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
