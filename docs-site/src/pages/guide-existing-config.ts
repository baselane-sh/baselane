// docs-site/src/pages/guide-existing-config.ts: scenario guide: adopting baselane in a repo that
// already has a hand-written CLAUDE.md / AGENTS.md. The fear this page answers is "will it clobber
// my file?" — the mechanics (managed regions) are explained inline, the concept lives on
// about-packs.ts / about-drift.ts.
import type { DocsPage } from "../shell.ts";
import { nextSteps } from "../shell.ts";

const body = `
<h1>Adopt baselane in a repo that already has CLAUDE.md</h1>
<p class="lede">
  Most repos worth managing already have a hand-written <code class="inline">CLAUDE.md</code> or
  <code class="inline">AGENTS.md</code>, often both, often months of accumulated conventions.
  Baselane is built for exactly this case: it merges into those files inside clearly-marked managed
  regions and never touches a line you wrote.
</p>

<h2>The scenario</h2>
<p>
  Say your repo has a 150-line <code class="inline">CLAUDE.md</code>: build commands, "never push to
  main", a section about your test fixtures. You want to add a shared workflow pack — say
  <code class="inline">software-engineer-harness</code> — without losing any of it.
</p>

<h2>1. Audit first</h2>
<pre><code>npx baselane audit .</code></pre>
<p>
  Audit is read-only. It detects languages, package manager, layout, and test commands, and
  recommends a pack. Nothing is written.
</p>

<h2>2. Apply — and see the merge</h2>
<pre><code>npx baselane apply . --pack software-engineer-harness --dry-run
npx baselane apply . --pack software-engineer-harness</code></pre>
<p>
  Run with <code class="inline">--dry-run</code> first if you want the file list before anything is
  written. On a real apply, your existing <code class="inline">CLAUDE.md</code> content stays
  byte-for-byte where it was. The pack's rendered content lands <em>inside a managed region</em>,
  a fenced block with begin/end markers that names the pack and version that owns it:
</p>
<pre><code>&lt;!-- baselane:start software-engineer-harness@1.5.0 — managed region, do not edit inside --&gt;
… rendered pack content …
&lt;!-- baselane:end --&gt;</code></pre>
<p>
  Everything outside the markers is yours. Re-applying, or bumping the pack version later, replaces
  only what's between the markers. The same merge discipline applies to
  <code class="inline">AGENTS.md</code>, <code class="inline">.github/copilot-instructions.md</code>,
  and <code class="inline">GEMINI.md</code>.
</p>

<h2>3. Review the diff like any PR</h2>
<p>
  Apply is just file writes in your working tree — <code class="inline">git diff</code> shows
  exactly what changed. If the pack's conventions contradict something you wrote (say, it recommends
  a different test command), your text wins by default because it's outside the region; decide
  explicitly whether to delete your version or the pack's guidance stays duplicated.
</p>

<h2>4. Commit the manifest too</h2>
<p>
  Apply also writes <a href="about-manifests.html"><code class="inline">harness.json</code></a> —
  the manifest recording which pack, at which exact version, produced which files (with content
  hashes). Commit it alongside the rendered files. From then on,
  <a href="about-drift.html"><code class="inline">baselane drift</code></a> can tell you whether
  anyone hand-edited vendored content or a managed region.
</p>

<h2>If you already have a .claude/ directory</h2>
<p>
  Pre-existing skills, agents, and settings under <code class="inline">.claude/</code> are left
  alone. Pack-vendored skills land in their own folders and are recorded in the manifest; anything
  the manifest doesn't claim, baselane doesn't own and won't modify or flag.
</p>
${nextSteps([
  { href: "about-manifests.html", label: "harness.json explained" },
  { href: "guide-ci-drift.html", label: "Check drift in CI" },
  { href: "guide-team-rollout.html", label: "Roll out one harness across a team" },
])}
`.trim();

export const page: DocsPage = {
  filename: "guide-existing-config.html",
  title: "Adopt baselane with an existing CLAUDE.md",
  body,
};
