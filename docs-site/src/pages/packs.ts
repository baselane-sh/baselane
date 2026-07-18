// docs-site/src/pages/packs.ts: pack format reference: pack.json's exact shape. The concept
// (what a pack is, why it's structured this way) lives on about-packs.ts. Every example is
// drift-tested against the real pack validator (see docs-site/test/pack-examples.test.ts). Publish
// flow lives on publishing.ts; editing/versioning workflow lives on editing-packs.ts.
import type { DocsPage } from "../shell.ts";
import { esc, nextSteps } from "../shell.ts";
import { packExamples } from "../pack-examples.ts";

const examplesHtml = packExamples
  .map(
    (e) => `
<h3>${esc(e.title)}</h3>
<p class="${e.valid ? "valid" : "invalid"}">${e.valid ? "Valid." : "Invalid. Rejected."} ${esc(e.note)}</p>
<pre><code>${esc(JSON.stringify(e.json, null, 2))}</code></pre>
`,
  )
  .join("\n");

const body = `
<h1>Pack format reference</h1>
<p class="lede">
  See <a href="about-packs.html">what a pack is</a> for the concept, and
  <a href="editing-packs.html">creating and editing a pack</a> for where this file lives and how
  you change it. This page covers <code class="inline">pack.json</code>'s exact shape.
</p>

<h2>pack.json anatomy</h2>
<ul>
  <li><strong>Required</strong>: <code class="inline">id</code> (lowercase slug), <code class="inline">version</code>, <code class="inline">title</code> (single line), <code class="inline">summary</code> (single line), <code class="inline">context.markdown</code>, and the three block arrays <code class="inline">agents</code>/<code class="inline">commands</code>/<code class="inline">hooks</code> (each may be empty).</li>
  <li><strong>Optional</strong>: <code class="inline">attribution</code> (<code class="inline">{source, url, license}</code>), <code class="inline">scope</code> (<code class="inline">"repo"</code> default, <code class="inline">"developer"</code>, or <code class="inline">"both"</code>), <code class="inline">capabilities</code>, <code class="inline">skills</code>, <code class="inline">onboarding</code>, <code class="inline">relatedTo</code>/<code class="inline">supersedes</code> (catalog cross-links, never rendered into any file).</li>
</ul>
<p>
  A hook's <code class="inline">event</code> must be one of the fixed Claude Code lifecycle events
  (<code class="inline">PreToolUse</code>, <code class="inline">PostToolUse</code>,
  <code class="inline">Notification</code>, <code class="inline">UserPromptSubmit</code>,
  <code class="inline">Stop</code>, <code class="inline">SubagentStop</code>,
  <code class="inline">PreCompact</code>, <code class="inline">SessionStart</code>,
  <code class="inline">SessionEnd</code>). A misspelled event would otherwise pass as a valid string
  but never fire. So baselane rejects any event outside this list up front.
</p>
<p>
  A capability's <code class="inline">type</code> must be one of <code class="inline">memory</code>,
  <code class="inline">tasks</code>, <code class="inline">wiki</code>, <code class="inline">graph</code>,
  <code class="inline">design</code>, or <code class="inline">system-map</code>. At most one memory
  capability per store may use method <code class="inline">files</code> or
  <code class="inline">native</code> (both would own <code class="inline">/remember</code>), and at
  most one design capability per store (they all render the single <code class="inline">DESIGN.md</code>).
</p>

<h2>Skills layouts baselane ingests</h2>
<p>
  When <code class="inline">baselane install github:owner/repo@ref</code> resolves a repo with no root
  <code class="inline">pack.json</code>, it looks for skills content instead. It recognizes every
  npx-skills-convention <code class="inline">SKILL.md</code> layout:
</p>
<ul>
  <li>A single root <code class="inline">SKILL.md</code>: the repo itself is one skill, named after the repo.</li>
  <li>One-level <code class="inline">skills/&lt;name&gt;/SKILL.md</code>.</li>
  <li>Two-level catalog dirs, <code class="inline">skills/&lt;category&gt;/&lt;name&gt;/SKILL.md</code>: category dirs include dot-prefixed ones like <code class="inline">.curated</code>, <code class="inline">.experimental</code>, <code class="inline">.system</code>.</li>
  <li><code class="inline">.agents/skills/&lt;name&gt;/SKILL.md</code>.</li>
</ul>
<p>
  When the same skill name shows up at more than one depth, the <strong>shallowest</strong>
  <code class="inline">SKILL.md</code> wins (shallow-shadows-deep); at equal depth, the alphabetically
  first path wins as a deterministic tie-break. Sibling files one level under a winning skill's
  directory (references, scripts) travel with it. If the fileset has neither a
  <code class="inline">pack.json</code> nor any recognizable skills/harness content
  (<code class="inline">AGENTS.md</code> or anything under <code class="inline">.claude/</code>),
  install fails outright. There is nothing to install.
</p>

<h2>Examples</h2>
<p>Every example on this page is tested automatically. Valid ones install cleanly. Invalid ones show the error described.</p>
${examplesHtml}
${nextSteps([
  { href: "about-packs.html", label: "What is a pack?" },
  { href: "editing-packs.html", label: "Create and edit a pack" },
  { href: "publishing.html", label: "Publish a pack" },
])}
`.trim();

export const page: DocsPage = {
  filename: "packs.html",
  title: "Pack format reference",
  body,
};
