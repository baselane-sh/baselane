// docs-site/src/pages/cli.ts: the CLI reference. Embeds the REAL `USAGE` const exported from
// apps/cli/src/cli.ts verbatim so this page can never drift into a syntax the CLI doesn't accept;
// every prose claim around it is derived from that file plus install.ts/publish.ts's actual behavior.
import type { DocsPage } from "../shell.ts";
import { esc } from "../shell.ts";
import { USAGE } from "../../../apps/cli/src/cli.ts";

const body = `
<h1>CLI reference</h1>
<p class="lede">The <code class="inline">baselane</code> CLI. Every command below is generated from the real
<code class="inline">USAGE</code> string the CLI itself prints for <code class="inline">--help</code>:</p>
<pre><code>${esc(USAGE)}</code></pre>

<h2>Install</h2>
<p>
  <code class="inline">baselane install &lt;source&gt; [-g] [--dir &lt;d&gt;] [--dry-run] [--json]</code>
  resolves one of three source forms and writes (or updates) the manifest's <code class="inline">packs</code>
  entry:
</p>
<ul>
  <li>
    <code class="inline">github:owner/repo@ref</code>: records the exact git ref (tag, branch, or sha)
    of that repo — one fixed point, never a range. Baselane calls this a pin. If the resolved
    fileset has a root <code class="inline">pack.json</code>, that file is the pack.
    Otherwise baselane builds the pack from
    <code class="inline">AGENTS.md</code>/<code class="inline">.claude/</code> content
    (see the <a href="packs.html">pack format page</a>).
  </li>
  <li>
    <code class="inline">@scope/name[@version]</code>: a registry package. With no
    <code class="inline">@version</code>, resolves to the highest published semver version. Baselane looks up the
    registry entry, re-resolves its recorded source, and checks the resulting sha against what
    the registry recorded at publish time. A mismatch fails loudly instead of installing silently
    different content.
  </li>
  <li>
    <code class="inline">owner/repo@skill</code>: imports a single named skill out of that repo, pinned to
    its <em>default branch</em> (no explicit ref). If <code class="inline">skill</code> doesn't match one,
    it fails and lists every available skill.
  </li>
</ul>
<ul>
  <li><code class="inline">-g</code> / <code class="inline">--global</code>: targets the machine manifest (<code class="inline">~/.baselane/harness.json</code>, materializing into <code class="inline">~/.claude/</code>) instead of the current repo's root <code class="inline">harness.json</code>.</li>
  <li><code class="inline">--dry-run</code>: reports what would be written, without touching disk.</li>
  <li><code class="inline">--json</code>: prints the install report as JSON (log notices move to stderr so stdout stays pure JSON).</li>
</ul>
<p><strong>Example</strong>: the three source forms, each run on its own.</p>
<pre><code>baselane install @acme/security-review
baselane install github:acme/security-review-pack@v1.1.0
baselane install acme/security-review-pack@code-review</code></pre>
<p>
  Each one writes (or updates) a <code class="inline">packs</code> entry in <code class="inline">harness.json</code>
  and puts the pack's files into <code class="inline">.claude/</code>. On success it prints
  <code class="inline">wrote N file(s), removed 0, backed up 0 drifted, left 0 unchanged</code>.
  The third form pulls only the <code class="inline">code-review</code> skill out of
  <code class="inline">acme/security-review-pack</code>'s default branch. It does not pull the whole pack. Add
  <code class="inline">-g</code> to install into <code class="inline">~/.claude/</code> instead of the repo. Add
  <code class="inline">--dry-run</code> to preview without writing anything.
</p>

<h2>Update</h2>
<p>
  <code class="inline">baselane update [github:owner/repo | @scope/name] [-g] [--dir &lt;d&gt;]
  [--dry-run]</code> re-resolves and re-materializes everything already pinned in
  <code class="inline">harness.json</code> (or just the one named pack, if given), same target rules as
  install.
</p>
<p><strong>Example</strong>:</p>
<pre><code>baselane update
baselane update @acme/security-review</code></pre>
<p>
  With no name, every pinned pack gets checked again. If a git ref moved (a tag was moved, a branch
  moved forward), the pack picks up the new sha. Every registry pack is checked for a newer published
  version and moved to it. Give a name to limit the printed report (<code class="inline">updated ...
  old-sha to new-sha</code> or <code class="inline">unchanged ...</code>) to that one pack. The check
  itself still covers the whole manifest either way.
</p>

<h2>Drift</h2>
<p>
  <code class="inline">baselane drift [-g] [--dir &lt;d&gt;] [--json]</code> compares what's on disk against
  the manifest's <code class="inline">materialized</code> receipt: vendored file hashes, managed-region
  content/version hashes, and capability receipt hashes. It exits 0 when clean, and 1 when drift is
  detected. Wire it into CI to catch a hand-edited vendored file or a stale region before it ships.
</p>
<p><strong>Example</strong>:</p>
<pre><code>baselane drift</code></pre>
<p>
  If nothing has changed on disk since the last install or update, it prints
  <code class="inline">baselane drift: clean (N vendored file(s), N region(s) verified)</code> and exits
  with code 0. If a vendored file was hand-edited, or a managed region fell out of sync, it prints
  <code class="inline">baselane drift: DRIFT DETECTED (...)</code> with one line per drifted path, and
  exits with code 1. Use this as a CI check next to <code class="inline">baselane update</code>.
</p>

<h2>Publish</h2>
<p>
  <code class="inline">baselane publish @scope/name --source github:owner/repo --ref &lt;tag&gt;
  [--registry URL] [--json]</code> publishes a version to the registry:
</p>
<ul>
  <li><code class="inline">GITHUB_TOKEN</code> is required: publish has no unauthenticated path.</li>
  <li>
    <code class="inline">--ref</code> must be a semver version tag (optionally <code class="inline">v</code>-prefixed,
    e.g. <code class="inline">v1.2.0</code>). A branch name, sha, or arbitrary ref is rejected outright,
    since the registry only accepts strict <code class="inline">X.Y.Z</code> versions.
  </li>
  <li>
    The namespace (<code class="inline">@scope</code>) must match the authenticated GitHub user or org
    behind <code class="inline">GITHUB_TOKEN</code>, or the registry returns 403.
  </li>
  <li>Publishing the same <code class="inline">name@version</code> twice returns 409. Bump the tag and try again.</li>
</ul>
<p><strong>Example</strong> (you need <code class="inline">GITHUB_TOKEN</code> set):</p>
<pre><code>baselane publish @acme/security-review --source github:acme/security-review-pack --ref v1.1.0</code></pre>
<p>
  This looks up <code class="inline">v1.1.0</code> on <code class="inline">acme/security-review-pack</code>,
  turns it into a sha, builds the pack from those files, and sends it to the registry as
  <code class="inline">@acme/security-review@1.1.0</code>. On success it prints
  <code class="inline">published @acme/security-review@1.1.0 (sha &lt;short-sha&gt;)</code> and exits with
  code 0. If you publish the same name and version again, it prints a "version already published"
  message and exits with code 1.
</p>

<h2>Everything else</h2>
<ul>
  <li><code class="inline">baselane audit &lt;dir&gt;</code>: profiles a repo's languages, frameworks, and commands.</li>
  <li><code class="inline">baselane apply &lt;dir&gt; (--pack &lt;id&gt; | --pack-file &lt;path&gt;)</code>: writes a built-in or custom pack's files directly. No manifest or registry is involved.</li>
  <li><code class="inline">baselane distribute &lt;owner/repo&gt; ...</code>: opens a PR against a target repo with a pack's files, and can optionally report adoption to a portal.</li>
  <li><code class="inline">baselane graph</code> / <code class="inline">baselane map</code>: compute the dependency graph and <code class="inline">ARCHITECTURE.md</code>/<code class="inline">DESIGN.md</code> respectively. <code class="inline">map</code> takes <code class="inline">--llm</code> for AI narration. It needs <code class="inline">ANTHROPIC_API_KEY</code> (or <code class="inline">BASELANE_ANTHROPIC_KEY</code>, which keeps that key separate from other tools that read <code class="inline">ANTHROPIC_API_KEY</code>).</li>
  <li><code class="inline">baselane draft-pack &lt;dir&gt;</code>: drafts a starter <code class="inline">pack.json</code> from a repo's own conventions. It is a starting point to hand-edit and publish, not something that installs or publishes on its own.</li>
</ul>
<p><strong>Examples</strong>:</p>
<pre><code>baselane audit .
baselane apply . --pack security-review
baselane distribute acme/some-service-repo --pack security-review
baselane draft-pack .
baselane graph .
baselane map . --llm</code></pre>
<p>
  <code class="inline">audit</code> prints a report of languages, frameworks, and commands, and ends with
  one recommended built-in pack. <code class="inline">apply</code> writes that pack's files straight into
  <code class="inline">.</code> and prints <code class="inline">wrote N file(s)</code>. It leaves existing
  files alone unless you add <code class="inline">--force</code>. <code class="inline">distribute</code>
  opens a pull request on <code class="inline">acme/some-service-repo</code> with the pack's files and
  prints the pull request URL. It needs <code class="inline">GITHUB_TOKEN</code> set.
  <code class="inline">draft-pack</code> prints a starter <code class="inline">pack.json</code> built from
  the repo's own conventions, for you to hand-edit and publish later. <code class="inline">graph</code>
  writes <code class="inline">.baselane/graph.json</code> and
  <code class="inline">.baselane/graph/GRAPH.md</code>, then prints a summary of modules, edges, and
  fan-in. <code class="inline">map --llm</code> writes <code class="inline">ARCHITECTURE.md</code> (and
  <code class="inline">DESIGN.md</code>, if it finds a UI surface) with AI narration. Set
  <code class="inline">ANTHROPIC_API_KEY</code> (or <code class="inline">BASELANE_ANTHROPIC_KEY</code>) first,
  or leave off <code class="inline">--llm</code> to get the plain, non-AI version instead.
</p>
`.trim();

export const page: DocsPage = {
  filename: "cli.html",
  title: "CLI",
  body,
};
