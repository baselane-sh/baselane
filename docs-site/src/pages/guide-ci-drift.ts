// docs-site/src/pages/guide-ci-drift.ts: scenario guide: enforcing "config matches the manifest"
// in CI. Leans on drift's exit code (0 clean / 1 drift — see apps/cli/src/cli.ts) and --json for
// machine-readable reports. The drift concept lives on about-drift.ts.
import type { DocsPage } from "../shell.ts";
import { esc, nextSteps } from "../shell.ts";

const WORKFLOW = `name: harness-drift
on:
  pull_request:
  push:
    branches: [main]

jobs:
  drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: npx baselane@latest drift .`;

const body = `
<h1>Check harness drift in CI</h1>
<p class="lede">
  <code class="inline">baselane drift</code> exits <code class="inline">0</code> when everything on
  disk matches the pins and hashes in <code class="inline">harness.json</code>, and
  <code class="inline">1</code> when anything drifted. That makes it a one-line CI gate: nobody can
  hand-edit vendored config or a managed region without the build saying so.
</p>

<h2>What it catches</h2>
<ul>
  <li><strong>modified</strong> — a vendored file (a pack-installed skill, say) was hand-edited; its hash no longer matches the install receipt.</li>
  <li><strong>missing / file-missing</strong> — a recorded file was deleted.</li>
  <li><strong>region-missing / content-drift</strong> — a managed region in <code class="inline">AGENTS.md</code> or <code class="inline">CLAUDE.md</code> was removed or edited in place.</li>
  <li><strong>version-drift</strong> — the region on disk was rendered by a different pack version than the manifest pins.</li>
</ul>
<p>
  Edits <em>outside</em> managed regions are yours and never flagged — drift protects the generated
  parts, not your writing.
</p>

<h2>GitHub Actions</h2>
<pre><code>${esc(WORKFLOW)}</code></pre>
<p>
  That's the whole job. No install step for baselane itself —
  <code class="inline">npx baselane@latest</code> fetches the CLI, and drift only reads files, so
  the job needs no tokens or write permissions.
</p>

<h2>Machine-readable reports</h2>
<pre><code>baselane drift . --json</code></pre>
<p>
  Emits the full report as JSON — <code class="inline">vendored</code>,
  <code class="inline">regions</code>, and a top-level <code class="inline">clean</code> boolean —
  if you'd rather post the details as a PR comment or feed a dashboard than just fail the build.
</p>

<h2>When the gate fires</h2>
<p>
  A red drift check means someone changed generated config by hand. Two honest ways forward: revert
  the hand-edit and change the <a href="editing-packs.html">pack source</a> instead (so every repo
  gets the fix), or — if the change should be local prose — move it outside the managed region,
  where it's yours. Re-running <code class="inline">baselane apply</code> restores the generated
  parts to match the pins.
</p>
${nextSteps([
  { href: "about-drift.html", label: "What is drift?" },
  { href: "cli.html", label: "CLI reference" },
  { href: "guide-team-rollout.html", label: "Roll out one harness across a team" },
])}
`.trim();

export const page: DocsPage = {
  filename: "guide-ci-drift.html",
  title: "Check harness drift in CI",
  body,
};
