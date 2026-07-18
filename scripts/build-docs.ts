// scripts/build-docs.ts — zero-dep static site generator for docs.baselane.sh. Renders every
// page module in docs-site/src/pages/ through the shared shell (docs-site/src/shell.ts) and
// writes flat HTML files into docs-site/dist/ (gitignored, built on demand). Also copies the
// landing's styles.css and writes docs.css into dist/ so the built site is self-contained and
// visually matches the landing (shared design system, see docs-site/src/docs.css).
//
// Run: node --experimental-transform-types --no-warnings scripts/build-docs.ts
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { docsPage, type DocsPage } from "../docs-site/src/shell.ts";
import { page as indexPage } from "../docs-site/src/pages/index.ts";
import { page as gettingStartedPage } from "../docs-site/src/pages/getting-started.ts";
import { page as aboutPacksPage } from "../docs-site/src/pages/about-packs.ts";
import { page as aboutManifestsPage } from "../docs-site/src/pages/about-manifests.ts";
import { page as aboutDriftPage } from "../docs-site/src/pages/about-drift.ts";
import { page as aboutRegistryPage } from "../docs-site/src/pages/about-registry.ts";
import { page as packsPage } from "../docs-site/src/pages/packs.ts";
import { page as manifestPage } from "../docs-site/src/pages/manifest.ts";
import { page as guideExistingConfigPage } from "../docs-site/src/pages/guide-existing-config.ts";
import { page as guideTeamRolloutPage } from "../docs-site/src/pages/guide-team-rollout.ts";
import { page as guideCiDriftPage } from "../docs-site/src/pages/guide-ci-drift.ts";
import { page as guideInstallGithubPage } from "../docs-site/src/pages/guide-install-github.ts";
import { page as editingPacksPage } from "../docs-site/src/pages/editing-packs.ts";
import { page as publishingPage } from "../docs-site/src/pages/publishing.ts";
import { page as organizationsPage } from "../docs-site/src/pages/organizations.ts";
import { page as cliPage } from "../docs-site/src/pages/cli.ts";

// The 12 pages of the docs site, npm/Docker-docs-style IA: one concept per page, concepts before
// reference, reference before task-oriented guides, CLI reference last (see docs-site/src/shell.ts's
// NAV for the grouped sidebar order). Self-hosting was removed entirely (no replacement page).
const PAGES: DocsPage[] = [
  indexPage,
  gettingStartedPage,
  aboutPacksPage,
  aboutManifestsPage,
  aboutDriftPage,
  aboutRegistryPage,
  packsPage,
  manifestPage,
  guideExistingConfigPage,
  guideTeamRolloutPage,
  guideCiDriftPage,
  guideInstallGithubPage,
  editingPacksPage,
  publishingPage,
  organizationsPage,
  cliPage,
];

// Old URL kept alive as a redirect: concepts.html was renamed to organizations.html when the
// public-registry section split out to publishing.html. A bare meta-refresh stub, not a full
// DocsPage — it skips the shell/sidebar entirely since it has nothing of its own to show.
const REDIRECTS: { filename: string; to: string }[] = [{ filename: "concepts.html", to: "organizations.html" }];

export interface BuiltPage {
  filename: string;
  bytes: number;
}

export async function buildAll(outDir: string): Promise<BuiltPage[]> {
  await mkdir(outDir, { recursive: true });
  const written: BuiltPage[] = [];
  for (const p of PAGES) {
    const html = docsPage({ title: p.title, active: p.filename, body: p.body });
    await writeFile(path.join(outDir, p.filename), html, "utf8");
    written.push({ filename: p.filename, bytes: Buffer.byteLength(html, "utf8") });
  }

  for (const r of REDIRECTS) {
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=${r.to}">
<link rel="canonical" href="${r.to}">
<title>Redirecting…</title>
</head>
<body>
<p>This page has moved to <a href="${r.to}">${r.to}</a>.</p>
</body>
</html>`;
    await writeFile(path.join(outDir, r.filename), html, "utf8");
    written.push({ filename: r.filename, bytes: Buffer.byteLength(html, "utf8") });
  }

  const repoRoot = path.resolve(import.meta.dirname, "..");
  await copyFile(path.join(repoRoot, "landing", "styles.css"), path.join(outDir, "styles.css"));
  await copyFile(path.join(repoRoot, "docs-site", "src", "docs.css"), path.join(outDir, "docs.css"));

  return written;
}

const isMain = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const outDir = path.resolve(import.meta.dirname, "..", "docs-site", "dist");
  const written = await buildAll(outDir);
  console.log(
    `docs-site: wrote ${written.length} page(s) to ${path.relative(process.cwd(), outDir)} (${written
      .map((w) => w.filename)
      .join(", ")})`,
  );
}
