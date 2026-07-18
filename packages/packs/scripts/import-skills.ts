import { execSync } from "node:child_process";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SKILL_BODY_MAX_LINES, validateSkill } from "../src/validate.ts";
import type { SkillBlock } from "../src/types.ts";

const OUT_DIR = fileURLToPath(new URL("../skills", import.meta.url));

/** Names under skills/ that a re-import must NEVER delete. `first-party/` is hand-authored
 * baselane content (the #19 first-party path); the fetch only rebuilds third-party skills, so it
 * must leave first-party skills untouched. */
const PRESERVE = new Set(["first-party"]);

/** Reset the fetched-seed area in `outDir` without touching preserved (first-party) content: ensure
 * the dir exists, then remove every fetched skill dir and the regenerated manifest, leaving
 * `skills/first-party/` intact. Exported (and pure w.r.t. the passed dir) so the preservation
 * guarantee is unit-testable. */
export async function resetFetchedArea(outDir: string): Promise<void> {
  await mkdir(outDir, { recursive: true });
  for (const name of await readdir(outDir)) {
    if (!PRESERVE.has(name)) await rm(join(outDir, name), { recursive: true, force: true });
  }
}

/** NEVER import or distil these — source-available/all-rights-reserved or unlicensed (research §7). */
const DENYLIST = new Set(["docx", "pdf", "pptx", "xlsx", "doc-coauthoring"]);

/** Seed category mapping, by each skill's actual purpose — not just "superpowers vs. everything
 * else" (finding #14: an unmapped default of "write" for every anthropics/skills entry put 12/24
 * seed skills in one category, well past the per-category budget of 6). Anything still unmapped
 * defaults to "write" for admin re-sort, which is correct for the remaining pure-creation tools
 * (algorithmic-art, canvas-design, frontend-design, mcp-builder, slack-gif-creator,
 * web-artifacts-builder). */
const SEED_CATEGORY_MAP: Record<string, string> = {
  brainstorming: "plan", "writing-plans": "plan", "using-superpowers": "plan",
  "test-driven-development": "debug", "writing-skills": "write", "webapp-testing": "debug",
  "systematic-debugging": "debug",
  "verification-before-completion": "review", "requesting-code-review": "review", "receiving-code-review": "review",
  "skill-creator": "review", "brand-guidelines": "review", "theme-factory": "review",
  "executing-plans": "ship", "dispatching-parallel-agents": "ship", "using-git-worktrees": "ship",
  "finishing-a-development-branch": "ship", "subagent-driven-development": "ship", "internal-comms": "ship",
};

interface SourceRepo { repo: string; license: string; }
const SOURCES: SourceRepo[] = [
  { repo: "obra/superpowers", license: "MIT" },
  { repo: "anthropics/skills", license: "Apache-2.0" },
];

/** Resolved lazily inside main() — never at module load, so importing this module (e.g. to unit-
 * test resetFetchedArea) never shells out or requires a token. A full-directory vendor of ~25
 * skills issues far more requests than the old SKILL.md-only fetch, and unauthenticated
 * api.github.com calls are capped at 60/hr per IP (trivially exhausted, as this session's own
 * exploration did). Authentication is therefore required, not optional: prefers GITHUB_TOKEN/
 * GH_TOKEN (CI convention), falls back to the local `gh` CLI's cached token for interactive runs,
 * and throws — never runs anonymously — so a missing token is a loud, pre-fetch failure rather
 * than a rate-limited partial vendor. */
function resolveGithubToken(): string {
  const envToken = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (envToken) return envToken;
  try {
    const token = execSync("gh auth token", { encoding: "utf8" }).trim();
    if (token) return token;
  } catch {
    // fall through to the thrown error below
  }
  throw new Error(
    "import-skills: no GitHub token available (checked GITHUB_TOKEN, GH_TOKEN, and `gh auth token`). " +
    "A full-directory skill vendor makes far more requests than the unauthenticated 60/hr " +
    "api.github.com limit allows — set GITHUB_TOKEN or run `gh auth login` first. Nothing was vendored.",
  );
}

/** Set once at the top of main(), before any network call. */
let githubToken = "";

/** A rate-limit-aware error message: GitHub reports an exhausted quota as 403/429 with an
 * `x-ratelimit-remaining: 0` header, distinct from an ordinary 404/500. Surfacing this distinction
 * is what lets a failed run be reported as "rate limited, re-run later" instead of a generic
 * fetch error. */
function describeFailure(kind: string, path: string, res: Response): string {
  if (res.status === 403 || res.status === 429) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    if (remaining === "0") {
      const resetAt = res.headers.get("x-ratelimit-reset");
      const resetIso = resetAt ? new Date(Number(resetAt) * 1000).toISOString() : "unknown";
      return `${kind} ${path}: rate limited (resets ${resetIso}). Nothing was vendored — re-run once the limit resets.`;
    }
  }
  return `${kind} ${path}: ${res.status}`;
}

async function gh(path: string): Promise<unknown> {
  const res = await fetch(`https://api.github.com/${path}`, {
    headers: {
      "Accept": "application/vnd.github+json",
      "User-Agent": "baselane-seed-import",
      Authorization: `Bearer ${githubToken}`,
    },
  });
  if (!res.ok) throw new Error(describeFailure("GitHub", path, res));
  return res.json();
}

/** Text fetch that treats a non-ok response as "not present" (null), not an error — used only for
 * probing optional license-filename candidates, where a 404 on two of three names is normal. */
async function raw(repo: string, sha: string, path: string): Promise<string | null> {
  const res = await fetch(`https://raw.githubusercontent.com/${repo}/${sha}/${path}`, {
    headers: { "User-Agent": "baselane-seed-import", Authorization: `Bearer ${githubToken}` },
  });
  return res.ok ? res.text() : null;
}

/** Fetches a file's exact bytes at the pinned sha. Unlike raw(), this is for a path already
 * confirmed to exist by the recursive tree listing, so a failed fetch here is a genuine error
 * (network/rate-limit), not "file legitimately absent" — it throws rather than returning null, so
 * main()'s staging phase aborts instead of silently vendoring a partial skill. Binary-safe
 * (returns Buffer, not text): a full-directory vendor now also picks up non-markdown companions
 * (scripts, assets, even a .tar.gz), and decoding those as UTF-8 text would corrupt them. */
async function fetchBlob(repo: string, sha: string, path: string): Promise<Buffer> {
  const res = await fetch(`https://raw.githubusercontent.com/${repo}/${sha}/${path}`, {
    headers: { "User-Agent": "baselane-seed-import", Authorization: `Bearer ${githubToken}` },
  });
  if (!res.ok) throw new Error(describeFailure("raw fetch", `${repo}/${path}`, res));
  return Buffer.from(await res.arrayBuffer());
}

/** Resolve the default-branch head SHA so the import is reproducible after the fact. */
async function headSha(repo: string): Promise<string> {
  const info = (await gh(`repos/${repo}`)) as { default_branch: string };
  const branch = (await gh(`repos/${repo}/branches/${info.default_branch}`)) as { commit: { sha: string } };
  return branch.commit.sha;
}

interface TreeEntry { path: string; type: string; }

/** Enumerates every blob under skills/ at the pinned sha via the recursive git-trees API — the
 * full-directory listing the SKILL.md-only importer never had (precedent: `listTree` at
 * packages/distribute/src/github.ts:142). Throws if GitHub reports the tree as truncated (too
 * large for one response) rather than silently vendoring a partial listing. */
async function listSkillTree(repo: string, sha: string): Promise<TreeEntry[]> {
  const data = (await gh(`repos/${repo}/git/trees/${sha}?recursive=1`)) as {
    tree: TreeEntry[];
    truncated?: boolean;
  };
  if (data.truncated) {
    throw new Error(`${repo}@${sha}: recursive tree listing was truncated by GitHub — cannot guarantee a full vendor`);
  }
  return data.tree.filter((e) => e.path.startsWith("skills/"));
}

/** Minimal frontmatter split — the standard's frontmatter is simple key: value YAML. */
function parseFrontmatter(md: string): { fm: Record<string, string>; body: string } {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(md);
  if (!m) return { fm: {}, body: md };
  const fm: Record<string, string> = {};
  for (const raw of m[1].split("\n")) {
    const kv = /^([a-zA-Z0-9_-]+):\s*(.*)$/.exec(raw.trim());
    if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, "");
  }
  return { fm, body: m[2] };
}

interface ManifestSkill { name: string; source: string; url: string; license: string; category: string; }

interface ImportedRepo {
  manifest: ManifestSkill[];
  /** key: "<skill-name>/<relative-path>" (POSIX), relative to OUT_DIR. Buffers, not strings —
   * binary-safe for the non-markdown companions a full-directory vendor now picks up. */
  files: Map<string, Buffer>;
}

async function importRepo(src: SourceRepo, sha: string): Promise<ImportedRepo> {
  const blobs = (await listSkillTree(src.repo, sha)).filter((e) => e.type === "blob");
  const dirNames = [...new Set(
    blobs.filter((e) => /^skills\/[^/]+\//.test(e.path)).map((e) => e.path.split("/")[1]),
  )].sort();
  const licenseText =
    (await raw(src.repo, sha, "LICENSE")) ??
    (await raw(src.repo, sha, "LICENSE.txt")) ??
    (await raw(src.repo, sha, "LICENSE.md"));

  const manifest: ManifestSkill[] = [];
  const files = new Map<string, Buffer>();

  for (const dirName of dirNames) {
    if (DENYLIST.has(dirName)) continue;
    const prefix = `skills/${dirName}/`;
    const dirBlobs = blobs.filter((e) => e.path.startsWith(prefix));
    const skillMdPath = `${prefix}SKILL.md`;
    if (!dirBlobs.some((b) => b.path === skillMdPath)) continue; // no SKILL.md, not a real skill dir

    const mdBuf = await fetchBlob(src.repo, sha, skillMdPath);
    const md = mdBuf.toString("utf8");
    const { fm, body } = parseFrontmatter(md);
    const category = SEED_CATEGORY_MAP[dirName] ?? "write";
    const url = `https://github.com/${src.repo}/tree/${sha}/skills/${dirName}`;
    const block: SkillBlock = {
      name: fm.name ?? dirName,
      description: (fm.description ?? "").trim(),
      body: body.trimEnd() + "\n",
      category,
      attribution: { source: src.repo, url, license: src.license },
    };
    // A skill whose upstream body exceeds the 500-line ceiling (or otherwise fails validation)
    // is skipped rather than aborting the whole import — logged loudly so it's never silent.
    // The standard's own remedy is to split overflow into references/; that requires editorial
    // judgment about which sections to extract, so this script drops rather than guesses.
    try {
      validateSkill(block);
    } catch (err) {
      const lines = block.body.split("\n").length;
      console.warn(
        `SKIPPED ${src.repo}/${dirName}: ${(err as Error).message} ` +
        `(body is ${lines} lines; ceiling is ${SKILL_BODY_MAX_LINES}). ` +
        `Split into references/ upstream or re-run after the source shrinks it.`,
      );
      continue;
    }

    // Vendor every other file under the skill dir, at any depth — the actual fix. Previously only
    // SKILL.md was fetched, stripping every companion file (references/, scripts/, examples) its
    // own text points at, producing dangling links mid-task.
    const otherFiles = dirBlobs.filter((b) => b.path !== skillMdPath);
    const fetchedOther = new Map<string, Buffer>(); // relPath -> bytes, so the LICENSE step below can reuse it
    for (const entry of otherFiles) {
      const bytes = await fetchBlob(src.repo, sha, entry.path);
      const rel = entry.path.slice(prefix.length);
      fetchedOther.set(rel, bytes);
      files.set(`${block.name}/${rel}`, bytes);
    }
    files.set(`${block.name}/SKILL.md`, mdBuf);

    // Normalized LICENSE — loadSeedSkills() reads exactly this filename, so it's written
    // alongside whatever the skill vendored under its own upstream name (LICENSE.txt etc, which
    // otherFiles above already preserved verbatim).
    const perFolderLicenseRel = [...fetchedOther.keys()].find((rel) => /^LICENSE(\.(txt|md))?$/.test(rel));
    const perFolderLicense = perFolderLicenseRel ? fetchedOther.get(perFolderLicenseRel)!.toString("utf8") : null;
    files.set(`${block.name}/LICENSE`, Buffer.from(perFolderLicense ?? licenseText ?? "", "utf8"));

    manifest.push({ name: block.name, source: src.repo, url, license: src.license, category });
  }
  return { manifest, files };
}

async function main(): Promise<void> {
  githubToken = resolveGithubToken();

  const sources: Array<{ repo: string; sha: string; license: string }> = [];
  let skills: ManifestSkill[] = [];
  const allFiles = new Map<string, Buffer>();
  for (const src of SOURCES) {
    const sha = await headSha(src.repo);
    sources.push({ repo: src.repo, sha, license: src.license });
    const imported = await importRepo(src, sha);
    skills = skills.concat(imported.manifest);
    for (const [relPath, bytes] of imported.files) allFiles.set(relPath, bytes);
  }

  // Only touch disk once every fetch above has succeeded. A mid-run failure (network hiccup, rate
  // limit) must never leave skills/ half-wiped, half-repopulated — resetFetchedArea() runs last,
  // right before the write, not first.
  await resetFetchedArea(OUT_DIR);
  for (const [relPath, bytes] of allFiles) {
    const dest = join(OUT_DIR, relPath);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, bytes);
  }
  const manifest = { generatedAt: new Date().toISOString(), sources, skills: skills.sort((a, b) => a.name.localeCompare(b.name)) };
  await writeFile(join(OUT_DIR, "seed-manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(`Imported ${skills.length} skills (denylisted: ${[...DENYLIST].join(", ")}), ${allFiles.size} files vendored.`);
}

// Only run the network import when invoked directly (`node import-skills.ts`), never on import —
// importing this module to unit-test resetFetchedArea must have no side effects (no wipe, no fetch).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => { console.error(err); process.exitCode = 1; });
}
