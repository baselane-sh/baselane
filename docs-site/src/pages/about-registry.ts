// docs-site/src/pages/about-registry.ts: the concept page for what the public registry is (resolver
// + index, not a warehouse), @scope/name naming, and how an org's private registry relates to it.
// The publish command and its error table live on the task page, publishing.ts; org-registry
// approval mechanics live on organizations.ts.
import type { DocsPage } from "../shell.ts";
import { nextSteps } from "../shell.ts";

const body = `
<h1>The public registry</h1>
<p class="lede">
  The public registry is where a published pack gets a short name, like an org's
  <code class="inline">@acme/security-review</code>. You can install that name in place of a raw
  <code class="inline">github:acme/security-review-pack@v1.0.0</code> URL. This is the same shift
  npm's <code class="inline">package.json</code> name makes over a bare git URL.
</p>

<h2>A resolver and index, not a warehouse</h2>
<p>
  The registry doesn't host pack content. Each record is a pointer: a name, a version, and the
  <code class="inline">github:owner/repo</code> source, plus the commit sha it resolved to at publish
  time. The pack content itself always lives at that git source. <code class="inline">/packs</code>
  browses the index without needing a login.
</p>

<h2>Namespaces</h2>
<p>
  <code class="inline">scope</code> is the GitHub user or org that owns the publish, checked against
  the <code class="inline">GITHUB_TOKEN</code> used to publish. <code class="inline">name</code> is
  the pack's own <code class="inline">id</code>.
</p>

<h2>An org registry is a curated private twin</h2>
<p>
  An org's internal registry (see <a href="organizations.html">Organizations</a>) works the same
  way, but privately and with an added approval step: a maintainer's publish lands as pending until
  an admin approves it.
</p>

<h2>Example</h2>
<pre><code>baselane install @acme/security-review</code></pre>
<p>
  The registry looks up <code class="inline">@acme/security-review</code> and returns its highest
  published version, the <code class="inline">github:acme/security-review-pack</code> source it
  points to, and the exact commit sha recorded at publish time. baselane fetches the pack content
  from that GitHub source, not from the registry itself.
</p>
${nextSteps([
  { href: "publishing.html", label: "Publish a pack" },
  { href: "organizations.html", label: "Organizations" },
  { href: "packs.html", label: "Pack format reference" },
])}
`.trim();

export const page: DocsPage = {
  filename: "about-registry.html",
  title: "The public registry",
  body,
};
