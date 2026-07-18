// docs-site/src/pages/getting-started.ts: the 5-minute quickstart. Install, check drift, update,
// and machine-wide (-g) installs, as numbered steps. Concept explanations of what a pack, manifest,
// or drift *is* live on the about-*.html concept pages this links out to. Command forms here are
// copied verbatim from apps/cli/src/cli.ts's USAGE const so nothing here can drift into a syntax
// the CLI doesn't actually accept.
import type { DocsPage } from "../shell.ts";
import { nextSteps } from "../shell.ts";

const body = `
<h1>Getting started</h1>
<p class="lede">
  Install the CLI once, then manage packs from any repository. Requires Node.js 24 or later.
</p>

<h2>1. Install the CLI</h2>
<pre><code>npm install -g baselane</code></pre>
<p>Verify it works:</p>
<pre><code>baselane --help</code></pre>

<h2>2. Install your first pack</h2>
<pre><code>baselane install github:owner/repo@v1.0.0</code></pre>
<p>
  Vendors the pack's skills into <code class="inline">.claude/</code> and records the exact
  version installed in <code class="inline">harness.json</code> — never a range. Baselane calls
  this exact record a pin. See <a href="about-packs.html">what a pack is</a> and every source form
  in the <a href="cli.html">CLI reference</a>.
</p>

<h2>3. Check for drift</h2>
<pre><code>baselane drift</code></pre>
<p>
  Exits <code class="inline">0</code> when clean, <code class="inline">1</code> when something's
  drifted. See <a href="about-drift.html">what drift means</a>.
</p>

<h2>4. Update</h2>
<pre><code>baselane update</code></pre>
<p>Re-resolves and re-materializes everything already pinned in <code class="inline">harness.json</code>.</p>

<h2>5. Install machine-wide (-g)</h2>
<pre><code>baselane install github:owner/repo@v1.0.0 -g</code></pre>
<p>
  <code class="inline">-g</code> / <code class="inline">--global</code> targets
  <code class="inline">~/.baselane/harness.json</code> instead of the repo. Use it for skills and
  agents you want in every repo, not just one.
</p>
${nextSteps([
  { href: "about-packs.html", label: "What is a pack?" },
  { href: "about-manifests.html", label: "harness.json explained" },
  { href: "cli.html", label: "CLI reference" },
])}
`.trim();

export const page: DocsPage = {
  filename: "getting-started.html",
  title: "Getting started",
  body,
};
