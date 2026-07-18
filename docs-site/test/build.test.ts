import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildAll } from "../../scripts/build-docs.ts";
import { USAGE } from "../../apps/cli/src/cli.ts";

let outDir: string;

beforeEach(async () => {
  outDir = await mkdtemp(path.join(tmpdir(), "docs-site-test-"));
});

afterEach(async () => {
  await rm(outDir, { recursive: true, force: true });
});

describe("buildAll", () => {
  it("emits a non-empty index.html linking into the getting-started quickstart, and a shell nav covering every page", async () => {
    const written = await buildAll(outDir);
    expect(written.some((w) => w.filename === "index.html")).toBe(true);

    const html = await readFile(path.join(outDir, "index.html"), "utf8");
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain('href="getting-started.html"');
    // shell nav — every one of the 12 pages is linked, grouped under section headings; no
    // self-hosting.html anywhere (the page was removed, not redirected)
    expect(html).toContain('href="index.html"');
    expect(html).toContain('href="getting-started.html"');
    expect(html).toContain('href="about-packs.html"');
    expect(html).toContain('href="about-manifests.html"');
    expect(html).toContain('href="about-drift.html"');
    expect(html).toContain('href="about-registry.html"');
    expect(html).toContain('href="packs.html"');
    expect(html).toContain('href="manifest.html"');
    expect(html).toContain('href="editing-packs.html"');
    expect(html).toContain('href="publishing.html"');
    expect(html).toContain('href="organizations.html"');
    expect(html).toContain('href="cli.html"');
    expect(html).not.toContain('self-hosting.html');
    expect(html).toContain('ds-side-label');
  });

  it("emits a non-empty getting-started.html containing the quickstart command and the -g/global section", async () => {
    await buildAll(outDir);
    const html = await readFile(path.join(outDir, "getting-started.html"), "utf8");
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain("baselane install github:owner/repo@v1.0.0");
    expect(html).toContain("--global");
  });

  it("emits a non-empty publishing.html covering the publish flow, linking out to the registry concept page", async () => {
    await buildAll(outDir);
    const html = await readFile(path.join(outDir, "publishing.html"), "utf8");
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain("baselane publish");
    expect(html).toContain('href="about-registry.html"');
  });

  it("emits a non-empty editing-packs.html covering where pack source lives and the versioning loop", async () => {
    await buildAll(outDir);
    const html = await readFile(path.join(outDir, "editing-packs.html"), "utf8");
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain("pack builder");
    expect(html).toContain("versioning loop");
    expect(html).toContain('href="publishing.html"');
    expect(html).toContain('href="about-drift.html"');
  });

  it("emits a non-empty about-drift.html with a worked example matching formatDriftReport's real output shape", async () => {
    await buildAll(outDir);
    const html = await readFile(path.join(outDir, "about-drift.html"), "utf8");
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain("baselane drift: clean (4 vendored file(s), 1 region(s) verified)");
    expect(html).toContain("baselane drift: DRIFT DETECTED (/repo/harness.json)");
    expect(html).toContain("! .claude/skills/security-review/SKILL.md: modified");
  });

  it("emits a non-empty about-registry.html covering the public registry concept", async () => {
    await buildAll(outDir);
    const html = await readFile(path.join(outDir, "about-registry.html"), "utf8");
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain("public registry");
    expect(html).toContain("resolver and index, not a warehouse");
  });

  it("emits a non-empty organizations.html (renamed from concepts.html) and a concepts.html redirect stub", async () => {
    const written = await buildAll(outDir);
    expect(written.some((w) => w.filename === "organizations.html")).toBe(true);
    expect(written.some((w) => w.filename === "concepts.html")).toBe(true);

    const html = await readFile(path.join(outDir, "organizations.html"), "utf8");
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain("Curation &amp; approval");
    expect(html).toContain("Baselines");
    expect(html).toContain("Fleet");
    expect(html).not.toContain("Public registry"); // moved to publishing.html

    const redirectHtml = await readFile(path.join(outDir, "concepts.html"), "utf8");
    expect(redirectHtml).toContain('http-equiv="refresh"');
    expect(redirectHtml).toContain("organizations.html");
  });

  it("shares the landing's design system: dist carries styles.css + docs.css, index.html links both and reuses the landing's header markup", async () => {
    await buildAll(outDir);

    const stylesCss = await readFile(path.join(outDir, "styles.css"), "utf8");
    expect(stylesCss.length).toBeGreaterThan(0);
    // spot-check a token only the landing's shared stylesheet defines
    expect(stylesCss).toContain("--brand:#1470FD");

    const docsCss = await readFile(path.join(outDir, "docs.css"), "utf8");
    expect(docsCss.length).toBeGreaterThan(0);
    // mobile hardening: single-column collapse + code blocks stay inside their own scroll box
    expect(docsCss).toContain("max-width:800px");
    expect(docsCss).toContain("overflow-x:auto");

    const html = await readFile(path.join(outDir, "index.html"), "utf8");
    expect(html).toContain('<link rel="stylesheet" href="/styles.css">');
    expect(html).toContain('<link rel="stylesheet" href="/docs.css">');
    // the landing's exact header markup: brand SVG + wordmark, same classes
    expect(html).toContain('<header class="nav hm-nav">');
    expect(html).toContain('<a class="brand" href="https://baselane.sh/">');
    expect(html).toContain('viewBox="0 0 64 64" role="img" aria-label="baselane"');
  });

  it("emits the copy-button script on every page, wired to inject a .copy-btn into each code block", async () => {
    await buildAll(outDir);

    const html = await readFile(path.join(outDir, "getting-started.html"), "utf8");
    expect(html).toContain("copy-btn");
    expect(html).toContain("navigator.clipboard.writeText");
    // strips a leading "$ " shell-prompt prefix per line before copying
    expect(html).toContain("replace(/^\\$ /, '')");
  });

  it("emits non-empty cli/manifest/packs pages, cli.html containing a line from USAGE", async () => {
    await buildAll(outDir);

    const cliHtml = await readFile(path.join(outDir, "cli.html"), "utf8");
    expect(cliHtml.length).toBeGreaterThan(0);
    // "baselane audit <dir> [--json]" — angle brackets get HTML-escaped on the page, so check a
    // substring that doesn't include one.
    expect(cliHtml).toContain("baselane audit");
    expect(USAGE).toContain("baselane audit");
    // every command has a worked example; spot-check publish's since it's the most flag-heavy.
    expect(cliHtml).toContain(
      "baselane publish @acme/security-review --source github:acme/security-review-pack --ref v1.1.0",
    );

    const manifestHtml = await readFile(path.join(outDir, "manifest.html"), "utf8");
    expect(manifestHtml.length).toBeGreaterThan(0);

    const packsHtml = await readFile(path.join(outDir, "packs.html"), "utf8");
    expect(packsHtml.length).toBeGreaterThan(0);
  });

  it("does not build a self-hosting page — the page was removed entirely, not redirected", async () => {
    const written = await buildAll(outDir);
    expect(written.some((w) => w.filename === "self-hosting.html")).toBe(false);
  });

  it("every emitted page carries a 'Next steps' block except cli.html and the concepts.html redirect stub", async () => {
    const written = await buildAll(outDir);
    for (const w of written) {
      const html = await readFile(path.join(outDir, w.filename), "utf8");
      if (w.filename === "cli.html" || w.filename === "concepts.html") {
        continue;
      }
      expect(html, `${w.filename} is missing a Next steps block`).toContain('class="ds-next"');
      expect(html, `${w.filename} is missing a Next steps heading`).toContain("<h2>Next steps</h2>");
    }
  });

  it("content-area visual uplift: docs.css carries the next-steps card grid, and every content page opens with a styled lede paragraph", async () => {
    const docsCss = await readFile(path.join(process.cwd(), "src", "docs.css"), "utf8");
    expect(docsCss).toContain(".ds-next ul{list-style:none;margin:0;padding:0;display:grid");

    const written = await buildAll(outDir);
    for (const w of written) {
      if (w.filename === "concepts.html") {
        continue; // redirect stub, no body content
      }
      const html = await readFile(path.join(outDir, w.filename), "utf8");
      expect(html, `${w.filename} is missing the lede intro paragraph`).toContain('class="lede"');
    }
  });
});
