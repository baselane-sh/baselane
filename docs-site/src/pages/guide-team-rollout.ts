// docs-site/src/pages/guide-team-rollout.ts: scenario guide: one team, many repos, one harness
// config. Covers pick/pin a pack, distribute-by-PR, onboarding new repos, and machine-level (-g)
// config. The org/fleet product surface stays on organizations.ts — this page is CLI-only.
import type { DocsPage } from "../shell.ts";
import { nextSteps } from "../shell.ts";

const body = `
<h1>Roll out one harness config across a team</h1>
<p class="lede">
  Five engineers, a dozen repos, and each repo's <code class="inline">CLAUDE.md</code> was
  copy-pasted from a different ancestor. The goal: one versioned pack, pinned in every repo's
  <code class="inline">harness.json</code>, updated deliberately instead of drifting silently.
</p>

<h2>1. Decide what "our harness" is</h2>
<p>
  Start from a built-in pack (<code class="inline">baselane audit</code> recommends one), or
  <a href="editing-packs.html">create your own pack</a> holding the team's agents, skills, hooks,
  and conventions. A pack is the unit of rollout — if the team's rules aren't in a pack, they can't
  be versioned or distributed.
</p>

<h2>2. Land it in the first repo by hand</h2>
<pre><code>npx baselane apply . --pack software-engineer-harness
git add -A &amp;&amp; git commit -m "adopt baselane harness"</code></pre>
<p>
  Use the first repo to shake out conflicts with existing hand-written config (see
  <a href="guide-existing-config.html">adopting with an existing CLAUDE.md</a>). What lands is a
  committed <code class="inline">harness.json</code> pinning the exact pack version — the artifact
  every other repo will converge on.
</p>

<h2>3. Distribute to the rest by PR</h2>
<pre><code>baselane distribute acme/api --pack software-engineer-harness
baselane distribute acme/webapp --pack software-engineer-harness</code></pre>
<p>
  <code class="inline">distribute</code> renders the pack and opens a pull request against the
  target repo instead of pushing to its branches. Each repo's owners review the diff — including
  how the managed regions merged into their existing files — and merge on their own schedule.
  Nothing is force-pushed anywhere.
</p>

<h2>4. Onboard new repos and new machines</h2>
<p>New repo? One command reproduces the team setup:</p>
<pre><code>npx baselane apply . --pack software-engineer-harness</code></pre>
<p>
  For personal, machine-level config (the pieces that live in
  <code class="inline">~/.claude</code> rather than a repo), the same commands take
  <code class="inline">-g</code>:
</p>
<pre><code>baselane install github:obra/superpowers@v6.1.1 -g
baselane drift -g</code></pre>

<h2>5. Move the team forward in lockstep</h2>
<p>
  When the pack changes, <a href="publishing.html">publish a new version</a>. Repos stay on their
  pinned version until someone runs <code class="inline">baselane update</code> or merges a bump PR
  — upgrades are explicit, reviewable events, not ambient drift. Repos that haven't bumped are
  visibly behind, not silently different.
</p>
<pre><code>baselane update            # bump this repo's pins to latest
baselane drift             # verify what's on disk matches the pins</code></pre>

<h2>What this replaces</h2>
<p>
  The copy-paste chain. Before: someone improves a prompt in one repo and eleven others never hear
  about it. After: the improvement is a pack version, every repo's distance from it is measurable,
  and adopting it is a one-line PR.
</p>
${nextSteps([
  { href: "publishing.html", label: "Publish a pack" },
  { href: "guide-ci-drift.html", label: "Check drift in CI" },
  { href: "organizations.html", label: "Organizations: fleet view" },
])}
`.trim();

export const page: DocsPage = {
  filename: "guide-team-rollout.html",
  title: "Roll out one harness across a team",
  body,
};
