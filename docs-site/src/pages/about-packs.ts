// docs-site/src/pages/about-packs.ts: the concept page for what a pack is, why skills are vendored
// rather than referenced, and what immutable-by-version means. Field-by-field pack.json shape and
// the skills-layout ingestion rules live on the reference page, packs.ts.
import type { DocsPage } from "../shell.ts";
import { nextSteps } from "../shell.ts";

const body = `
<h1>What is a pack?</h1>
<p class="lede">
  A pack is a versioned, immutable bundle of agents, commands, hooks, skills, and capability
  declarations that baselane installs into a repo or a machine. It is the same unit npm calls a
  package: baselane just calls it a pack.
</p>
<p>
  Every pack is validated before it's stored or installed. This applies to a built-in pack, one an
  org built with the pack builder, or one drafted from a repo's own conventions. An invalid pack is
  rejected with the specific reason. It is never installed halfway.
</p>

<h2>Skills are vendored, not referenced</h2>
<p>
  Installing a pack, say an org's shared <code class="inline">security-review</code> pack, copies
  its skills straight into <code class="inline">.claude/</code> in the target repo or machine. It
  does not leave them as a remote reference to resolve later. A clone of the repo is a clone of
  everything baselane installed into it. There is nothing else to fetch to rebuild it. See
  <a href="editing-packs.html">how to edit a pack</a> for why you never hand-edit those vendored
  copies.
</p>

<h2>Immutable by version</h2>
<p>
  Once published to a registry, a given pack version is fixed forever: publishing
  <code class="inline">security-review@1.0.0</code> a second time is rejected outright, exactly like
  npm. To ship a fix, publish <code class="inline">1.1.0</code> instead. Repos still on
  <code class="inline">1.0.0</code> then show as behind and get a one-click PR to bump.
</p>

<h2>Example</h2>
<pre><code>{
  "id": "security-review",
  "version": "1.0.0",
  "title": "Security Review",
  "summary": "Checks a repo for common security issues before merge.",
  "context": { "markdown": "## Security review\\n" },
  "agents": [],
  "commands": [],
  "hooks": []
}</code></pre>
<p>This is the smallest valid <code class="inline">pack.json</code>: an id, a version, and the three required arrays, which may be empty.</p>
${nextSteps([
  { href: "packs.html", label: "Pack format reference" },
  { href: "editing-packs.html", label: "Create and edit a pack" },
  { href: "publishing.html", label: "Publish a pack" },
])}
`.trim();

export const page: DocsPage = {
  filename: "about-packs.html",
  title: "What is a pack?",
  body,
};
