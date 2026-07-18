// docs-site/src/pages/manifest.ts: the harness.json reference, field-by-field shape. The concept
// (what harness.json is for) lives on about-manifests.ts. Every example is drift-tested against
// the real manifest validator (see docs-site/test/manifest-examples.test.ts); this page just
// renders what's in manifest-examples.ts, so the prose here can't silently outrun the schema.
import type { DocsPage } from "../shell.ts";
import { esc, nextSteps } from "../shell.ts";
import { manifestExamples } from "../manifest-examples.ts";

const examplesHtml = manifestExamples
  .map(
    (e) => `
<h3>${esc(e.title)}</h3>
<p class="${e.valid ? "valid" : "invalid"}">${e.valid ? "Valid." : "Invalid. Rejected."} ${esc(e.note)}</p>
<pre><code>${esc(JSON.stringify(e.json, null, 2))}</code></pre>
`,
  )
  .join("\n");

const body = `
<h1>harness.json reference</h1>
<p class="lede">
  See <a href="about-manifests.html">what harness.json is</a> for the concept. This page covers
  every field baselane checks in your <code class="inline">harness.json</code>.
</p>

<h2>Fields</h2>
<ul>
  <li><code class="inline">version</code>: must be exactly <code class="inline">1</code>. There is no v2 shape yet.</li>
  <li><code class="inline">registry</code>: a registry base URL string, or <code class="inline">null</code> (falls back to the <code class="inline">BASELANE_REGISTRY</code> env var, then the CLI default <code class="inline">https://registry.baselane.sh</code>).</li>
  <li><code class="inline">target</code>: <code class="inline">{ kind: "repo" | "machine", id }</code>. <code class="inline">id</code> is the repo's directory name, or the machine's hostname for a <code class="inline">-g</code> install.</li>
  <li><code class="inline">packs</code>: an object mapping a pack name (either <code class="inline">github:owner/repo</code> or <code class="inline">@scope/name</code>) to one exact version, like a git ref, branch, tag, sha, or an exact registry version. It never records a range like "1.2.0 or newer." Baselane calls this exact value a pin.</li>
  <li><code class="inline">capabilities</code>: a free-form, JSON-serializable object of per-target capability configuration. Optional; defaults to <code class="inline">{}</code>.</li>
  <li>
    <code class="inline">materialized</code>: the install receipt, optional (defaults to all-empty). Its
    sub-fields:
    <ul>
      <li><code class="inline">vendored</code>: <code class="inline">{path, sha256}[]</code> for files written verbatim (the legacy shape, a bare path string with an implied <code class="inline">sha256: null</code>, is also accepted).</li>
      <li><code class="inline">managedRegions</code>: <code class="inline">{path, regions}[]</code> for content-preserving files (e.g. <code class="inline">AGENTS.md</code>). Each region records the contributing <code class="inline">packId</code>, its <code class="inline">version</code>, and a <code class="inline">sha256</code> of the region body.</li>
      <li><code class="inline">derivedCommitted</code>: paths derived (not pack-authored) but committed anyway.</li>
      <li><code class="inline">resolutions</code>: per pack name, what the pin actually resolved to: <code class="inline">{ref, sha, packId}</code>.</li>
      <li><code class="inline">capabilities</code>: per capability name (e.g. <code class="inline">system-map</code>), a receipt: <code class="inline">{sourceSha, generatedTs, paths: {path, sha256}[]}</code>.</li>
    </ul>
  </li>
</ul>

<h2>Examples</h2>
<p>Every example on this page is tested automatically. Valid ones install cleanly; invalid ones show the error described.</p>
${examplesHtml}
${nextSteps([
  { href: "about-manifests.html", label: "harness.json explained" },
  { href: "about-drift.html", label: "What is drift?" },
  { href: "getting-started.html", label: "Getting started" },
])}
`.trim();

export const page: DocsPage = {
  filename: "manifest.html",
  title: "harness.json reference",
  body,
};
