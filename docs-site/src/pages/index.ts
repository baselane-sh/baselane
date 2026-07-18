// docs-site/src/pages/index.ts: the docs home page. What baselane is, in under 300 words, then
// out to the concepts and the quickstart. Command forms anywhere on this site are copied verbatim
// from apps/cli/src/cli.ts's USAGE const so nothing here can drift into a syntax the CLI doesn't accept.
import type { DocsPage } from "../shell.ts";
import { nextSteps } from "../shell.ts";

const body = `
<h1>About baselane</h1>
<p class="lede">
  baselane is a git-native package manager for AI harness configs.
</p>
<p>
  It ships and versions skills, agents, commands, and hooks for tools like Claude Code. It works the
  same way npm ships JavaScript packages.
</p>

<h2>Use baselane to</h2>
<ul>
  <li>Install a shared <a href="about-packs.html">pack</a> of skills, agents, and hooks into a repo</li>
  <li>Record one exact version of every install in <a href="about-manifests.html">harness.json</a>, so every machine gets the same content (this is called a pin)</li>
  <li>Detect <a href="about-drift.html">drift</a> between what's pinned and what's actually on disk</li>
  <li>Publish a pack under a name in <a href="about-registry.html">the public registry</a> so it installs by <code class="inline">@scope/name</code></li>
  <li>Track pack versions and drift across a whole fleet from one <a href="organizations.html">org control plane</a></li>
</ul>

<h2>Example</h2>
<pre><code>npm install -g baselane
baselane install @acme/security-review</code></pre>
<p>Your repo gets the pack's skills and a <code class="inline">harness.json</code> pin.</p>

<h2>Core concepts</h2>
<ul>
  <li><strong><a href="about-packs.html">Pack</a></strong>: a versioned bundle of config baselane installs into a repo</li>
  <li><strong><a href="about-manifests.html">harness.json</a></strong>: the manifest that records which packs a repo has installed</li>
  <li><strong><a href="about-drift.html">Drift</a></strong>: when what's on disk no longer matches what's pinned</li>
</ul>
${nextSteps([
  { href: "getting-started.html", label: "Getting started: install your first pack" },
  { href: "about-packs.html", label: "What is a pack?" },
  { href: "about-manifests.html", label: "harness.json explained" },
])}
`.trim();

export const page: DocsPage = {
  filename: "index.html",
  title: "About",
  body,
};
