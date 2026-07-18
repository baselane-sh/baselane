// docs-site/src/pages/editing-packs.ts: task page: where a pack's source actually lives, how to
// change it, and the immutable-version publish loop that makes an edit show up as "behind" on
// every repo that installed it. Scenario: an org's shared security-review pack. The concept (what
// a pack is, why it's vendored/immutable) lives on about-packs.ts; pack.json's exact shape lives on
// packs.ts; the publish command lives on publishing.ts.
import type { DocsPage } from "../shell.ts";
import { nextSteps } from "../shell.ts";

const body = `
<h1>Create and edit a pack</h1>
<p class="lede">
  A pack's source lives in one of two places, depending on who owns it: a git repo you maintain, or
  an org's internal pack builder. Either way, you never edit the copy baselane vendored into a
  consuming repo. You edit the source and publish a new version.
</p>

<h2>Where edits happen</h2>
<p>
  Say your org shares a <code class="inline">security-review</code> pack across every repo it owns.
  Its source is a normal git repo: a <code class="inline">pack.json</code> at the root plus its
  skill folders. To change it (for example, to tighten a review checklist or add a new hook), edit
  those files directly, commit, and tag the release:
</p>
<pre><code>git commit -am "security-review: flag hardcoded AWS keys"
git tag v1.1.0
git push --tags</code></pre>
<p>
  Then publish that tag under the pack's name (see <a href="publishing.html">publish a pack</a>):
</p>
<pre><code>baselane publish @acme/security-review --source github:acme/security-review-pack --ref v1.1.0</code></pre>
<p>
  If the pack instead started life inside an org's portal, built with the pack builder and not
  hand-written, its source is the builder form, not a git repo you clone. Open it from the org's
  packs list, edit the same fields (<a href="packs.html">agents, commands, hooks, skills</a>), and
  publishing a new version happens from there directly, no separate <code class="inline">baselane
  publish</code> step.
</p>

<h2>Example</h2>
<p>The full loop for a git-sourced pack, edit to publish:</p>
<pre><code>git commit -am "security-review: flag hardcoded AWS keys"
git tag v1.1.0
git push --tags
baselane publish @acme/security-review --source github:acme/security-review-pack --ref v1.1.0</code></pre>
<p>Every repo that still has <code class="inline">1.0.0</code> as its exact recorded version (its pin) now shows as behind.</p>

<h2>The versioning loop</h2>
<p>
  A published version is immutable the moment it's published: <code class="inline">@acme/security-review@1.0.0</code>
  will always resolve to exactly the bytes published under that name. There's no in-place edit.
  Editing means publishing <code class="inline">1.1.0</code> and leaving <code class="inline">1.0.0</code>
  alone. Every repo that installed <code class="inline">1.0.0</code> keeps running it, unchanged,
  until it's explicitly moved forward.
</p>
<p>
  That's what makes drift and fleet tracking work: once <code class="inline">1.1.0</code> is
  published, every repo still pinned to <code class="inline">1.0.0</code> shows up as behind on the
  <a href="organizations.html#fleet">fleet board</a>, with a one-click PR to bump it. Nothing is
  force-upgraded. A repo stays on its pinned version until that PR lands, or until someone runs
  <code class="inline">baselane update</code> by hand.
</p>

<h2>What you never edit</h2>
<p>
  The copy of a pack's skills sitting inside <code class="inline">.claude/</code> in a repo that
  installed it is a vendored, generated artifact, not the source.
</p>
<p>
  Hand-editing it directly does nothing for the next repo that installs the pack, and it shows up as
  drift the next time anyone runs <a href="about-drift.html"><code class="inline">baselane
  drift</code></a>, because the vendored copy no longer matches what the pinned version would
  produce. Fix it in the pack's source instead, and publish a new version. The vendored copy
  updates itself the next time the repo bumps.
</p>
${nextSteps([
  { href: "publishing.html", label: "Publish a pack" },
  { href: "about-drift.html", label: "What is drift?" },
  { href: "organizations.html", label: "Organizations: fleet baselines" },
])}
`.trim();

export const page: DocsPage = {
  filename: "editing-packs.html",
  title: "Create and edit a pack",
  body,
};
