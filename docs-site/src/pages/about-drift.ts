// docs-site/src/pages/about-drift.ts: the concept page for what drift means and how it's detected.
// Two mechanisms, kept distinct in the prose: the CLI's receipt-hash comparison (drift-cmd.ts) and
// the org fleet's re-render comparison (drift-detect.ts); the fleet-wide view of drift status lives
// on organizations.ts.
import type { DocsPage } from "../shell.ts";
import { nextSteps } from "../shell.ts";

const body = `
<h1>What is drift?</h1>
<p class="lede">
  Drift is when what's on disk no longer matches <code class="inline">harness.json</code>'s install
  receipt. This can happen if someone hand-edits a vendored file, a managed region body goes stale,
  or the installed version falls behind the exact version <code class="inline">harness.json</code>
  recorded (its pin).
</p>

<h2>Two ways it's checked</h2>
<p>
  Every install writes a receipt into the manifest: a sha256 per vendored file, per managed-region
  body, and per delivered capability artifact.
</p>
<ul>
  <li><strong>Local</strong>: <code class="inline">baselane drift</code> compares those receipt hashes against what's actually on disk. A hand-edit changes the hash. So this check always matches what was actually written.</li>
  <li><strong>Fleet</strong>: the org's drift view re-renders the pack fresh from its pinned version and compares the result against disk. It reports the worst of <code class="inline">none</code> &lt; <code class="inline">content</code> (hand-edited) &lt; <code class="inline">version</code> (stale pin) &lt; <code class="inline">missing</code> (region gone). This can catch drift the local check cannot see yet. For example, it flags drift right after a pack's render logic changes upstream, before anyone reinstalls.</li>
</ul>

<h2>Checking for drift</h2>
<pre><code>baselane drift</code></pre>
<p>
  Exits <code class="inline">0</code> when clean, <code class="inline">1</code> when drift is
  detected. Wire it into CI to catch drift before it ships.
</p>

<h2>Example</h2>
<p>Clean:</p>
<pre><code>baselane drift: clean (4 vendored file(s), 1 region(s) verified)</code></pre>
<p>After someone hand-edits a vendored skill file:</p>
<pre><code>baselane drift: DRIFT DETECTED (/repo/harness.json)
  ! .claude/skills/security-review/SKILL.md: modified</code></pre>
<p>The <code class="inline">!</code> line names the exact file that no longer matches its receipt.</p>
${nextSteps([
  { href: "manifest.html", label: "harness.json reference" },
  { href: "organizations.html", label: "Organizations: fleet drift status" },
  { href: "getting-started.html", label: "Getting started" },
])}
`.trim();

export const page: DocsPage = {
  filename: "about-drift.html",
  title: "What is drift?",
  body,
};
