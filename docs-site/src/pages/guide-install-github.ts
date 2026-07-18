// docs-site/src/pages/guide-install-github.ts: scenario guide: installing skills/packs straight
// from a GitHub repo (no registry involved) — the obra/superpowers case. Source-form syntax is
// shared with cli.ts's usage string; registry installs live on about-registry.ts.
import type { DocsPage } from "../shell.ts";
import { nextSteps } from "../shell.ts";

const body = `
<h1>Install skills straight from GitHub</h1>
<p class="lede">
  Plenty of great harness config lives in plain GitHub repos — skill collections like
  <a href="https://github.com/obra/superpowers" target="_blank" rel="noopener">obra/superpowers</a>
  or <a href="https://github.com/anthropics/skills" target="_blank" rel="noopener">anthropics/skills</a>
  — with no registry or packaging involved. <code class="inline">baselane install</code> takes a
  git ref directly, resolves it to a commit SHA, vendors the content, and pins it in
  <code class="inline">harness.json</code>.
</p>

<h2>Install a whole repo at a tag</h2>
<pre><code>baselane install github:obra/superpowers@v6.1.1</code></pre>
<p>
  The ref (<code class="inline">v6.1.1</code>) is resolved to its commit SHA at install time, and
  the SHA — not just the ref — is what gets recorded. Tags can move; the pin can't. Re-running an
  install from the same manifest always reproduces the same bytes, and tampering shows up in
  <a href="about-drift.html">drift</a> because every vendored file's hash is recorded too.
</p>

<h2>Install a single skill from a repo</h2>
<pre><code>baselane install obra/superpowers@test-driven-development</code></pre>
<p>
  The <code class="inline">owner/repo@skill</code> form picks one skill folder out of a collection
  instead of vendoring everything — useful when you want a repo's TDD skill but not its forty
  neighbors.
</p>

<h2>Repo-level or machine-level</h2>
<pre><code>baselane install github:obra/superpowers@v6.1.1       # this repo: ./.claude + ./harness.json
baselane install github:obra/superpowers@v6.1.1 -g    # this machine: ~/.claude + global manifest</code></pre>
<p>
  Without <code class="inline">-g</code>, the skills vendor into the current repo and the pin lands
  in its committed <code class="inline">harness.json</code> — teammates get the exact same skills
  from the manifest. With <code class="inline">-g</code>, it's personal config for every project on
  this machine.
</p>

<h2>What lands in harness.json</h2>
<pre><code>"resolutions": {
  "github:obra/superpowers": {
    "ref": "v6.1.1",
    "sha": "c984ea2e7aeffdcc865784fd6c5e3ab75da0209a",
    "packId": "superpowers"
  }
}</code></pre>
<p>
  Ref → exact SHA, plus per-file hashes under <code class="inline">materialized</code>. See the
  <a href="manifest.html">harness.json reference</a> for the full shape.
</p>

<h2>Update deliberately</h2>
<pre><code>baselane update github:obra/superpowers   # re-resolve the ref, bump the pin
baselane drift                            # verify disk matches the manifest</code></pre>
<p>
  Nothing auto-updates. An upstream release does nothing to your repos until you run
  <code class="inline">update</code> — and the bump is an ordinary reviewable diff to
  <code class="inline">harness.json</code>.
</p>
${nextSteps([
  { href: "about-registry.html", label: "The public registry" },
  { href: "manifest.html", label: "harness.json reference" },
  { href: "guide-ci-drift.html", label: "Check drift in CI" },
])}
`.trim();

export const page: DocsPage = {
  filename: "guide-install-github.html",
  title: "Install skills straight from GitHub",
  body,
};
