// docs-site/src/shell.ts: the one HTML frame every docs page renders through. It has the landing's
// own header/footer/design system (styles.css, shared theme-toggle script) plus a docs-specific
// two-column layout (sidebar nav + content) styled by docs.css. Also carries the copy-button script
// and the nav-toggle/mobile-menu inline handlers. See docs/superpowers/specs for the design rationale.

export interface DocsPage {
  filename: string;
  title: string;
  body: string;
}

interface NavEntry {
  label: string;
  href: string;
}

interface NavSection {
  section: string;
  entries: NavEntry[];
}

// The docs site's IA, npm/Docker-docs-style: one concept per page, concepts split from reference,
// reference split from task-oriented guides, CLI reference last. Every href below must resolve to
// a page module wired into scripts/build-docs.ts's PAGES list (or a redirect stub). See
// docs-site/test/links.test.ts.
const NAV: NavSection[] = [
  {
    section: "Getting started",
    entries: [
      { label: "About", href: "index.html" },
      { label: "Getting started", href: "getting-started.html" },
    ],
  },
  {
    section: "Core concepts",
    entries: [
      { label: "What is a pack?", href: "about-packs.html" },
      { label: "harness.json explained", href: "about-manifests.html" },
      { label: "What is drift?", href: "about-drift.html" },
      { label: "The public registry", href: "about-registry.html" },
    ],
  },
  {
    section: "Reference",
    entries: [
      { label: "Pack format reference", href: "packs.html" },
      { label: "harness.json reference", href: "manifest.html" },
    ],
  },
  {
    section: "Guides",
    entries: [
      { label: "Adopt with an existing CLAUDE.md", href: "guide-existing-config.html" },
      { label: "Roll out across a team", href: "guide-team-rollout.html" },
      { label: "Check drift in CI", href: "guide-ci-drift.html" },
      { label: "Install from GitHub", href: "guide-install-github.html" },
      { label: "Create and edit a pack", href: "editing-packs.html" },
      { label: "Publish a pack", href: "publishing.html" },
      { label: "Organizations", href: "organizations.html" },
    ],
  },
  {
    section: "CLI reference",
    entries: [{ label: "CLI reference", href: "cli.html" }],
  },
];

/** Every {label, href} in sidebar order, flattened. Used for the mobile menu. */
function mobileDocsHtml(active: string): string {
  return NAV.map(
    (sec) =>
      `<p class="mm-grp">${escAttr(sec.section)}</p>\n    ` +
      sec.entries
        .map(
          (n) =>
            `<a href="${escAttr(n.href)}"${n.href === active ? ' class="active"' : ""}>${n.label}</a>`,
        )
        .join("\n    "),
  ).join("\n    ");
}

// Docs lives on a subdomain, so every landing-page link is absolute; every docs-page link stays
// relative to this same static build.
const SITE = "https://baselane.sh";

function escAttr(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/** Escapes text for placement inside element content (e.g. inside a `<pre>`/`<code>` block).
 * Shared by every page module that embeds verbatim CLI output or JSON. */
export function esc(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/** The "Next steps" block every page ends with (except cli.html and the concepts.html redirect
 * stub). It has 2-3 links onward, styled by docs.css's .ds-next. A shared helper so the markup can't
 * drift page to page. See docs-site/test/build.test.ts for the coverage assertion. */
export function nextSteps(links: { href: string; label: string }[]): string {
  const items = links
    .map((l) => `<li><a href="${escAttr(l.href)}">${esc(l.label)}</a></li>`)
    .join("");
  return `<div class="ds-next">\n<h2>Next steps</h2>\n<ul>${items}</ul>\n</div>`;
}

// Verbatim from landing/index.html's <head>. Sets data-theme from localStorage('bl-theme') before
// first paint, exposes window.toggleTheme(), and drives the "js"/"loaded ready" classes the shared
// stylesheet's anti-flash + page-loader rules key off of. Keep byte-for-byte identical to the
// landing so the two sites' theme behavior can never drift apart.
const THEME_SCRIPT =
  "(function(){try{var t=localStorage.getItem('bl-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();" +
  "window.toggleTheme=function(){var r=document.documentElement,c=r.getAttribute('data-theme');if(!c){c=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}var n=c==='dark'?'light':'dark';r.setAttribute('data-theme',n);try{localStorage.setItem('bl-theme',n);}catch(e){}};" +
  "document.documentElement.className+=' js';" +
  "(function(){function r(){document.documentElement.className+=' loaded ready';}window.addEventListener('load',r);setTimeout(r,2200);})();";

function header(active: string): string {
  const mobileHtml = mobileDocsHtml(active);
  return `<header class="nav hm-nav">
  <div class="wrap nav-in">
    <a class="brand" href="${SITE}/"><svg class="bmark" viewBox="0 0 64 64" role="img" aria-label="baselane"><rect width="64" height="64" rx="14" fill="#0E0F11"/><text x="32" y="41" font-family="Helvetica, Arial, sans-serif" font-size="38" font-weight="700" fill="#F7F8F8" text-anchor="middle">b</text><rect x="17" y="47" width="30" height="4" rx="2" fill="#1470FD"/></svg> baselane</a>
    <nav class="hm-links" aria-label="Primary">
      <a href="${SITE}/product/">Product</a>
      <a href="${SITE}/pricing/">Pricing</a>
      <a href="${SITE}/blog/">Blog</a>
      <a href="${SITE}/packs/">Packs</a>
      <a href="${SITE}/#dev">Download</a>
      <span class="ds-sep" aria-hidden="true"></span>
      <a href="index.html" class="active">Docs</a>
    </nav>
    <div class="nav-right">
      <button class="themebtn" type="button" aria-label="Switch color theme" onclick="toggleTheme()"><span class="s-sun"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.4 4.4l1.6 1.6M18 18l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.4 19.6L6 18M18 6l1.6-1.6"/></svg></span><span class="s-moon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5z"/></svg></span></button>
      <button class="nav-toggle" type="button" aria-label="Menu" aria-expanded="false" onclick="this.closest('header').classList.toggle('open')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg></button>
    </div>
  </div>
  <div class="mobile-menu">
    <p class="mm-grp">Site</p>
    <a href="${SITE}/product/">Product</a>
    <a href="${SITE}/pricing/">Pricing</a>
    <a href="${SITE}/blog/">Blog</a>
    <a href="${SITE}/packs/">Packs</a>
    <a href="${SITE}/#dev">Download</a>
    ${mobileHtml}
  </div>
</header>`;
}

// Progressive enhancement only: pages are fully readable/copyable via native text selection with
// no JS. Where JS runs, this injects a small "Copy" button into every code block in the docs
// content column. Strips a leading "$ " shell-prompt prefix per line so pasted commands run as-is.
const COPY_SCRIPT = `(function(){
  document.querySelectorAll('.ds-content pre').forEach(function(pre){
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    btn.textContent = 'Copy';
    btn.setAttribute('aria-label', 'Copy code');
    btn.addEventListener('click', function(){
      var clone = pre.cloneNode(true);
      var cloneBtn = clone.querySelector('.copy-btn');
      if (cloneBtn) cloneBtn.remove();
      var lines = (clone.textContent || '').split('\\n').map(function(l){
        return l.replace(/^\\$ /, '');
      });
      navigator.clipboard.writeText(lines.join('\\n')).then(function(){
        btn.textContent = 'Copied';
        btn.classList.add('copied');
        setTimeout(function(){ btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1500);
      });
    });
    pre.appendChild(btn);
  });
})();`;

const FOOTER = `<footer>
  <div class="wrap">
    <div class="foot-grid">
      <div class="foot-col">
        <a class="brand" href="${SITE}/" style="margin-bottom:12px"><span class="wm">baselane</span></a>
        <p style="font-size:14px;max-width:30ch">The control plane for AI engineering.</p>
      </div>
      <div class="foot-col"><h4>Product</h4><a href="${SITE}/product/">Overview</a><a href="${SITE}/#how">How it works</a><a href="${SITE}/#dev">Download agent</a></div>
      <div class="foot-col"><h4>Docs</h4><a href="index.html">Home</a><a href="cli.html">CLI</a><a href="manifest.html">harness.json</a></div>
      <div class="foot-col"><h4>Company</h4><a href="${SITE}/about/">About</a><a href="${SITE}/contact/">Contact</a></div>
    </div>
    <div class="foot-bottom"><span>© 2026 baselane</span><span class="foot-legal"><a href="${SITE}/privacy/">Privacy</a><a href="${SITE}/terms/">Terms</a></span><span class="mono">hello@baselane.sh</span></div>
  </div>
</footer>`;

export function docsPage({ title, active, body }: { title: string; active: string; body: string }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escAttr(title)}: baselane docs</title>
<link rel="icon" type="image/svg+xml" href="${SITE}/favicon.svg">
<link rel="stylesheet" href="/styles.css">
<link rel="stylesheet" href="/docs.css">
<script>${THEME_SCRIPT}</script>
</head>
<body>
${header(active)}
<div class="ds-layout wrap">
  <nav class="ds-side" aria-label="Docs">
    ${NAV.map(
      (sec) =>
        `<p class="ds-side-label">${escAttr(sec.section)}</p><ul>${sec.entries
          .map(
            (n) =>
              `<li><a href="${escAttr(n.href)}"${n.href === active ? ' class="active"' : ""}>${n.label}</a></li>`,
          )
          .join("")}</ul>`,
    ).join("")}
  </nav>
  <main class="ds-content">${body}</main>
</div>
${FOOTER}
<script>${COPY_SCRIPT}</script>
</body>
</html>`;
}
