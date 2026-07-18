// docs-site/src/pages/publishing.ts: task page. Publish a pack to the registry, as numbered
// steps plus the requirements/error table. The registry concept (resolver+index, namespaces, org
// vs. public) lives on about-registry.ts. Prose here follows the actual portal/CLI behavior. No
// invented behavior.
import type { DocsPage } from "../shell.ts";
import { nextSteps } from "../shell.ts";

const body = `
<h1>Publish a pack</h1>
<p class="lede">
  Once a pack validates, publish it under a name to make it installable by
  <code class="inline">@scope/name</code> instead of a raw
  <code class="inline">github:owner/repo@ref</code>. See <a href="about-registry.html">what the
  registry is</a> for the concept.
</p>
<p>
  Publishing is never anonymous. You sign in with your GitHub account, and you can only publish
  under your own GitHub name or a GitHub org you belong to. For example, only the
  <code class="inline">acme</code> org's members can publish
  <code class="inline">@acme/security-review</code>. No one can publish under your name.
</p>

<h2>1. Publish</h2>
<pre><code>baselane publish @acme/security-review --source github:acme/security-review-pack --ref v1.0.0</code></pre>
<p>Resolves that tag, re-validates the pack it produces, and registers it under that name and version. On success it prints:</p>
<pre><code>published @acme/security-review@1.0.0 (sha a1b2c3d)</code></pre>

<h2>2. Install it</h2>
<pre><code>baselane install @acme/security-review</code></pre>
<p>With no <code class="inline">@version</code>, install resolves to the highest published semver version.</p>
<p>
  Shipped a fix? Tag <code class="inline">v1.1.0</code> and publish again with the same command.
  Every repo on <code class="inline">1.0.0</code> now shows as behind. See
  <a href="editing-packs.html">creating and editing a pack</a> for that loop.
</p>

<h2>Requirements</h2>
<table>
<tr><th>Requirement</th><th>What happens if it's not met</th></tr>
<tr><td><code class="inline">GITHUB_TOKEN</code></td><td>Required. Publish has no unauthenticated path.</td></tr>
<tr><td>Semver tag</td><td><code class="inline">--ref</code> must be strict <code class="inline">X.Y.Z</code> (an optional <code class="inline">v</code> prefix is allowed); a branch name, sha, or arbitrary ref is rejected outright.</td></tr>
<tr><td>Matching namespace</td><td><code class="inline">@scope</code> must match the authenticated GitHub user or org behind <code class="inline">GITHUB_TOKEN</code>, or the registry returns 403.</td></tr>
<tr><td>Unique version</td><td>Publishing the same <code class="inline">name@version</code> twice returns 409. Bump the tag instead.</td></tr>
</table>
${nextSteps([
  { href: "editing-packs.html", label: "Create and edit a pack" },
  { href: "about-registry.html", label: "The public registry" },
  { href: "cli.html", label: "CLI reference" },
])}
`.trim();

export const page: DocsPage = {
  filename: "publishing.html",
  title: "Publish a pack",
  body,
};
