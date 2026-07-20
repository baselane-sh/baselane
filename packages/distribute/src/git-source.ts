import { extractTarGz } from "./tar.ts";

const API = "https://api.github.com";
const CODELOAD = "https://codeload.github.com";
const SHA_RE = /^[0-9a-f]{40}$/;

/** Paths worth fetching over the slow REST fallback: the native pack manifest, the
 * ingest-relevant harness surface, and entry files. Everything else is dead weight.
 * Must stay in sync with every npx-skills-convention layout `packFromFileset` recognizes
 * (packages/packs/src/pack-from-fileset.ts) — a root single-skill `SKILL.md` and
 * `.agents/skills/` are as relevant here as `skills/`, or a tarball-fetch failure silently
 * drops them on the REST-fallback transport only. */
const REST_RELEVANT = /^(pack\.json$|SKILL\.md$|AGENTS\.md$|CLAUDE\.md$|GEMINI\.md$|\.github\/copilot-instructions\.md$|\.claude\/|\.agents\/|skills\/)/;

export interface GitSourceRef { owner: string; repo: string }
export interface ResolvedGitSource { sha: string; files: Record<string, string>; transport: "tarball" | "rest" }

export function isGitSourceName(name: string): boolean {
  return name.startsWith("github:");
}

export function parseGitSourceName(name: string): GitSourceRef {
  const m = /^github:([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)$/.exec(name);
  if (!m) throw new Error(`git-source: "${name}" is not a github:owner/repo source name`);
  const [, owner, repo] = m;
  if (owner === "." || owner === ".." || repo === "." || repo === "..") {
    throw new Error(`git-source: "${name}" has an invalid owner/repo segment ("." or "..")`);
  }
  return { owner, repo };
}

/** Encode a repo-relative file path segment-by-segment (preserving "/" as directory separators),
 * so a path component like `?`, `#`, or `%` doesn't truncate or reroute the contents-API request. */
function encPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

export function parseGitInstallArg(arg: string): { name: string; ref: string } {
  const at = arg.lastIndexOf("@");
  if (!arg.startsWith("github:") || at <= "github:".length) {
    throw new Error(`git-source: install source needs @<ref> — expected github:owner/repo@<tag|branch|sha>, got "${arg}"`);
  }
  const name = arg.slice(0, at);
  const ref = arg.slice(at + 1);
  parseGitSourceName(name); // validates shape, throws on garbage
  if (ref.length === 0) throw new Error(`git-source: install source needs @<ref> — got "${arg}"`);
  return { name, ref };
}

const REGISTRY_NAME_RE = /^@[a-z0-9-]+\/[a-z0-9-]+$/;
const BARE_OWNER_REPO_RE = /^([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)$/;

export type InstallRef =
  | { kind: "git"; name: string; ref: string }
  | { kind: "registry"; name: string; version: string | null }
  | { kind: "skill"; owner: string; repo: string; skill: string }
  | { kind: "docs"; url: string };

/**
 * Parses a `baselane install <ref>` (or manifest-add) argument into one of three forms:
 *  - `github:owner/repo@ref` → `{kind:"git", name:"github:owner/repo", ref}` (delegates to
 *    `parseGitInstallArg` for the actual grammar).
 *  - `@scope/name` or `@scope/name@version` → `{kind:"registry", name:"@scope/name", version}`,
 *    `version` is `null` when the version was omitted (caller resolves "latest").
 *  - `owner/repo@skill` (bare, no `github:` prefix) → `{kind:"skill", owner, repo, skill}` — the
 *    npx-skills addressing convention: install ONE named skill from a repo at its default branch.
 *  - `docs:https://host/...` → `{kind:"docs", url}` — install skills the host publishes at its
 *    well-known agent-skills endpoint (see well-known.ts). https only.
 * A bare `owner/repo` with no "@" at all is ambiguous — REJECTED with a message pointing at both
 * unambiguous forms — never silently guessed.
 */
export function parseInstallRef(arg: string): InstallRef {
  if (arg.startsWith("docs:")) {
    // Checked before the bare owner/repo branch so a URL's "/" can't be mis-parsed as owner/repo.
    const url = arg.slice("docs:".length);
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      throw new Error(`git-source: "${arg}" is not a valid docs URL — expected docs:https://host/...`);
    }
    if (u.protocol !== "https:") throw new Error(`git-source: "${arg}" must be https (got "${u.protocol.replace(/:$/, "")}")`);
    if (!u.hostname) throw new Error(`git-source: "${arg}" has no host`);
    return { kind: "docs", url };
  }
  if (arg.startsWith("github:")) {
    const { name, ref } = parseGitInstallArg(arg);
    return { kind: "git", name, ref };
  }
  if (arg.startsWith("@")) {
    const at = arg.indexOf("@", 1);
    const name = at === -1 ? arg : arg.slice(0, at);
    const version = at === -1 ? null : arg.slice(at + 1);
    if (!REGISTRY_NAME_RE.test(name)) {
      throw new Error(`git-source: "${arg}" is not a valid @scope/name registry ref`);
    }
    if (version === "") throw new Error(`git-source: "${arg}" has an empty version after "@"`);
    return { kind: "registry", name, version };
  }
  const at = arg.indexOf("@");
  if (at === -1) {
    throw new Error(
      `git-source: "${arg}" is ambiguous — use "github:${arg}@<ref>" to install a git ref, ` +
        `or "${arg}@<skill>" to import one skill from its default branch`,
    );
  }
  const ownerRepo = arg.slice(0, at);
  const skill = arg.slice(at + 1);
  const m = BARE_OWNER_REPO_RE.exec(ownerRepo);
  if (!m || skill.length === 0) {
    throw new Error(`git-source: "${arg}" is not a valid owner/repo@skill ref`);
  }
  return { kind: "skill", owner: m[1], repo: m[2], skill };
}

async function apiGet(
  path: string,
  ctx: { token?: string; fetchImpl: typeof fetch; label: string },
): Promise<{ status: number; body: unknown; rateLimited: boolean }> {
  const res = await ctx.fetchImpl(`${API}${path}`, {
    headers: {
      accept: "application/vnd.github+json",
      ...(ctx.token ? { authorization: `Bearer ${ctx.token}` } : {}),
    },
  });
  const rateLimited = res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0";
  const body = res.ok ? await res.json() : null;
  return { status: res.status, body, rateLimited };
}

function bail(label: string, detail: string): never {
  throw new Error(`git-source: ${label}: ${detail}`);
}

function rateBail(label: string): never {
  bail(label, "GitHub rate limit exhausted — set GITHUB_TOKEN to authenticate and retry");
}

/** ref → commit sha: bare sha verbatim; else tags (deref annotated) then heads; loud 404.
 * Exported so a caller that only needs sha confirmation (e.g. the registry publish route's
 * ref-tamper check) doesn't have to fetch/extract the tarball via resolveGitSource just to
 * read `.sha`. */
export async function resolveRefSha(
  owner: string, repo: string, ref: string,
  ctx: { token?: string; fetchImpl: typeof fetch; label: string },
): Promise<string> {
  if (SHA_RE.test(ref)) return ref;
  // The ref name is a single opaque path segment after "tags/"/"heads/" — any slash WITHIN it
  // (e.g. a tag literally named "release/v1") must become a literal %2F, not a path separator,
  // or GitHub's router splits it into extra segments. encodeURIComponent (not encPath) is correct here.
  const encRef = encodeURIComponent(ref);
  for (const kind of ["tags", "heads"]) {
    const r = await apiGet(`/repos/${owner}/${repo}/git/ref/${kind}/${encRef}`, ctx);
    if (r.rateLimited) rateBail(ctx.label);
    if (r.status === 404) continue;
    if (r.body === null) bail(ctx.label, `ref lookup failed with HTTP ${r.status}`);
    const obj = (r.body as { object: { sha: string; type: string } }).object;
    if (obj.type !== "tag") return obj.sha;
    const tag = await apiGet(`/repos/${owner}/${repo}/git/tags/${obj.sha}`, ctx);
    if (tag.rateLimited) rateBail(ctx.label);
    if (tag.body === null) bail(ctx.label, `annotated tag dereference failed with HTTP ${tag.status}`);
    return (tag.body as { object: { sha: string } }).object.sha;
  }
  bail(ctx.label, `ref "${ref}" not found as a tag or branch (tried git/ref/tags and git/ref/heads)`);
}

/** owner/repo → its default branch name, for the `owner/repo@skill` shorthand (no ref given, so
 * "install from wherever the repo's HEAD points"). One extra REST call `resolveGitSource` has no
 * use for otherwise — GitHub's ref-lookup endpoints need a concrete branch/tag name, not "HEAD". */
export async function resolveDefaultBranch(
  owner: string, repo: string,
  ctx: { token?: string; fetchImpl: typeof fetch; label: string },
): Promise<string> {
  const r = await apiGet(`/repos/${owner}/${repo}`, ctx);
  if (r.rateLimited) rateBail(ctx.label);
  if (r.body === null) bail(ctx.label, `repo lookup failed with HTTP ${r.status}`);
  const branch = (r.body as { default_branch?: string }).default_branch;
  if (!branch) bail(ctx.label, "repo metadata missing default_branch");
  return branch;
}

async function fetchTarball(
  owner: string, repo: string, sha: string,
  ctx: { token?: string; fetchImpl: typeof fetch },
): Promise<Record<string, string> | null> {
  let res: Response;
  try {
    res = await ctx.fetchImpl(`${CODELOAD}/${owner}/${repo}/tar.gz/${sha}`, {
      headers: ctx.token ? { authorization: `Bearer ${ctx.token}` } : {},
    });
  } catch {
    return null; // transport failure (network error) — fall back to REST
  }
  if (!res.ok) return null; // transport failure (non-2xx) — fall back to REST
  const buf = new Uint8Array(await res.arrayBuffer());
  // extractTarGz's safety rejections (traversal, absolute path, size ceiling) are NOT transport
  // failures — let them propagate so a hostile archive fails loudly instead of quietly retrying
  // over REST, which has no size ceiling of its own.
  return extractTarGz(buf).files;
}

async function fetchViaRest(
  owner: string, repo: string, sha: string,
  ctx: { token?: string; fetchImpl: typeof fetch; label: string },
): Promise<Record<string, string>> {
  const tree = await apiGet(`/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`, ctx);
  if (tree.rateLimited) rateBail(ctx.label);
  if (tree.body === null) bail(ctx.label, `tree listing failed with HTTP ${tree.status}`);
  const treeBody = tree.body as { tree: Array<{ path: string; type: string }>; truncated?: boolean };
  if (treeBody.truncated) {
    bail(ctx.label, "repository tree is truncated (too large for the REST fallback) — install from a tarball-reachable network or a smaller ref");
  }
  const blobs = treeBody.tree.filter((e) => e.type === "blob" && REST_RELEVANT.test(e.path));
  const files: Record<string, string> = {};
  for (const blob of blobs) {
    const r = await apiGet(`/repos/${owner}/${repo}/contents/${encPath(blob.path)}?ref=${sha}`, ctx);
    if (r.rateLimited) rateBail(ctx.label);
    if (r.body === null) bail(ctx.label, `blob fetch for "${blob.path}" failed with HTTP ${r.status}`);
    const { content, encoding } = r.body as { content?: string; encoding?: string };
    if (encoding !== "base64" || content === undefined) {
      bail(ctx.label, `blob "${blob.path}" returned encoding "${encoding}"${content === undefined ? " with no content" : ""} — cannot fetch via REST fallback (file too large?)`);
    }
    files[blob.path] = Buffer.from(content, "base64").toString("utf8");
  }
  return files;
}

export async function resolveGitSource(opts: {
  name: string; ref: string; token?: string; fetchImpl?: typeof fetch;
  onNotice?: (msg: string) => void;
}): Promise<ResolvedGitSource> {
  const { owner, repo } = parseGitSourceName(opts.name);
  const label = `${opts.name}@${opts.ref}`;
  const ctx = { token: opts.token, fetchImpl: opts.fetchImpl ?? fetch, label };
  const sha = await resolveRefSha(owner, repo, opts.ref, ctx);
  const tarFiles = await fetchTarball(owner, repo, sha, ctx);
  if (tarFiles !== null) return { sha, files: tarFiles, transport: "tarball" };
  opts.onNotice?.(`git-source: ${label}: tarball unavailable, falling back to the GitHub API (slower; set GITHUB_TOKEN if rate-limited)`);
  const files = await fetchViaRest(owner, repo, sha, ctx);
  return { sha, files, transport: "rest" };
}
