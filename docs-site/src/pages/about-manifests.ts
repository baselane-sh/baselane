// docs-site/src/pages/about-manifests.ts: the concept page for what harness.json is for, in prose,
// no field tables. The exact field-by-field shape lives on the reference page, manifest.ts.
import type { DocsPage } from "../shell.ts";
import { nextSteps } from "../shell.ts";

const body = `
<h1>What is harness.json?</h1>
<p class="lede">
  <code class="inline">harness.json</code> is the per-target manifest. It is the source of truth for
  which packs a repo (or, for <code class="inline">-g</code> installs, a machine) has installed and
  pinned. It lives at the repo root, next to <code class="inline">package.json</code>, in the same
  spot npm keeps its lockfile.
</p>

<h2>One exact version, never a range</h2>
<p>
  <code class="inline">harness.json</code> records one exact version for each pack. That can be an
  exact registry version like <code class="inline">1.2.0</code>, or an exact git branch, tag, or
  commit. It never records a range like "1.2.0 or newer". This means everyone who installs from the
  same file gets exactly the same content, today or in a year. Nothing updates silently. Recording
  an exact version this way is called a <strong>pin</strong>.
</p>

<h2>Receipts</h2>
<p>
  Alongside the pins, the manifest records an install receipt: a sha256 per vendored file, per
  managed-region body, and per delivered capability artifact. That receipt is what
  <a href="about-drift.html">drift detection</a> compares against what's actually on disk.
</p>
<p>
  The manifest's shape is fixed and checked on every write. A malformed
  <code class="inline">harness.json</code> is rejected, and the error names the exact field that's
  wrong. It is never silently accepted.
</p>

<h2>Example</h2>
<pre><code>{
  "version": 1,
  "target": { "kind": "repo", "id": "wrkflw" },
  "packs": { "@acme/security-review": "1.0.0" }
}</code></pre>
<p>The pin <code class="inline">"1.0.0"</code> means this repo always installs that exact registry version, never a newer one, until someone bumps it.</p>
${nextSteps([
  { href: "manifest.html", label: "harness.json reference" },
  { href: "about-drift.html", label: "What is drift?" },
  { href: "getting-started.html", label: "Getting started" },
])}
`.trim();

export const page: DocsPage = {
  filename: "about-manifests.html",
  title: "What is harness.json?",
  body,
};
