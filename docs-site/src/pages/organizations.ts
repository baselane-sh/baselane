// docs-site/src/pages/organizations.ts: the org/enterprise layer, one short paragraph per
// feature (hard word budget: the deep detail that doesn't fit lives in the product, not here).
// Registry concept, drift concept, and pack format each have their own concept/reference page this
// links out to. Prose here follows the actual portal behavior, no invented behavior.
import type { DocsPage } from "../shell.ts";
import { nextSteps } from "../shell.ts";

const body = `
<h1>Organizations</h1>
<p class="lede">
  Everything else in these docs covers a single repo talking to git directly. The portal adds an org
  control plane on top: a curated internal registry, org/team baselines, one fleet board, and
  generated capabilities. All of it comes back to repos as normal pull requests, never a side
  channel.
</p>

<h2>Curation &amp; approval</h2>
<p>
  An org's internal registry holds <strong>versioned, immutable</strong> pack publishes. A
  maintainer's publish lands as <code class="inline">pending</code> until an admin approves or
  rejects it. An admin's own publish is auto-approved. A rejected version is burned and never
  reused. See <a href="about-registry.html">the registry concept</a>.
</p>

<h2>Baselines</h2>
<p>
  A baseline is an org- or team-scoped floor: a set of <code class="inline">{packId, minVersion}</code>
  pairs, each one naming the lowest version allowed for a pack. Org and team baselines merge, with
  the higher <code class="inline">minVersion</code> winning. Baselines are <strong>flag-only</strong>: nothing is blocked or auto-installed. A target
  below the floor shows as <code class="inline">below-min</code> or <code class="inline">missing</code>
  on the <a href="#fleet">fleet board</a>.
</p>

<h2 id="fleet">Fleet</h2>
<p>
  One board is the single place an org sees compliance across everything it owns: installed pack
  versions against the effective baseline, enrolled machines, capability freshness, and
  <a href="about-drift.html">drift status</a>. A "bump all" action opens preview PRs, reviewed and
  merged like any other PR.
</p>

<h2>Capabilities</h2>
<p>
  A pack can declare repo-scoped capabilities: <code class="inline">system-map</code>,
  <code class="inline">wiki</code>, <code class="inline">graph</code>, <code class="inline">design</code>,
  <code class="inline">memory</code>, <code class="inline">tasks</code>. Three of them are computed
  centrally by the portal and delivered folded into the repo's rollout PR, never generated ad hoc on
  the repo's machine. See the <a href="packs.html">pack format reference</a>.
</p>
<p>
  The portal is a hosted product. See <a href="https://baselane.sh">baselane.sh</a> for access.
</p>

<h2>Example flow</h2>
<ol>
  <li>A maintainer publishes <code class="inline">@acme/security-review@1.1.0</code>. It lands as pending.</li>
  <li>An admin reviews and approves it.</li>
  <li>The fleet board flags every repo still on <code class="inline">1.0.0</code> as behind.</li>
  <li>The admin runs "bump all," which opens a PR on each flagged repo.</li>
</ol>
${nextSteps([
  { href: "about-registry.html", label: "The public registry" },
  { href: "publishing.html", label: "Publish a pack" },
  { href: "about-drift.html", label: "What is drift?" },
])}
`.trim();

export const page: DocsPage = {
  filename: "organizations.html",
  title: "Organizations",
  body,
};
