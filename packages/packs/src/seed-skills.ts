import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, relative, sep } from "node:path";
import { validateSkill } from "./validate.ts";
import type { SkillBlock, SkillReference } from "./types.ts";

export interface SeedSkill {
  block: SkillBlock;
  licenseText: string;
  source: string;
  url: string;
  sha: string;
}

interface Manifest {
  sources: Array<{ repo: string; sha: string; license: string }>;
  skills: Array<{ name: string; source: string; url: string; license: string; category: string }>;
}

interface FirstPartyManifest {
  skills: Array<{ name: string; category: string }>;
}

/** Source tag for baselane-authored first-party skills (#19). Distinguishes them from imported
 * (third-party) seed skills and is the basis of the catalog's first-party/third-party filter.
 * First-party skills carry no external licence notice and no `attribution`. */
export const FIRST_PARTY_SOURCE = "baselane";

/** Absolute path of the committed seed-skills directory shipped inside this package. */
export function seedSkillsDir(): string {
  return fileURLToPath(new URL("../skills", import.meta.url));
}

/** Every file under `dir`, recursively, as POSIX-style paths relative to `dir` (sorted). Mirrors
 * the walk in @baselane/analyze's LocalDirFileSource. */
async function walkFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  const visit = async (sub: string): Promise<void> => {
    const entries = await readdir(sub, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(sub, entry.name);
      if (entry.isDirectory()) await visit(full);
      else if (entry.isFile()) out.push(relative(dir, full).split(sep).join("/"));
    }
  };
  await visit(dir);
  return out.sort();
}

/** Turns a relative file path (its markdown extension already stripped) into a valid reference-
 * name slug. Mirrors ingest.ts's private `slugify()` — same transform, so a name derived here from
 * a vendored skill's directory and a name recovered by ingesting an already-rendered repo agree
 * for the same file, letting a skill round-trip render↔ingest. Extended (vs. ingest.ts's one-
 * level-deep sibling scan) to fold a nested path's separators into the same dash-joined slug,
 * since a vendored skill's companions (e.g. mcp-builder's `reference/*.md`) are frequently nested. */
function slugifyRefPath(value: string): string {
  const s = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s.length > 0 ? s : "x";
}

/** Every companion `.md` file in a seed skill's directory (recursively, SKILL.md excluded), turned
 * into SkillReference blocks the render pipeline emits under `.claude/skills/<name>/<ref>.md`
 * (render/claude.ts's skillMd/reference emission is flat and always appends `.md`, so only
 * markdown companions can become a reference at all). Non-markdown companions the importer
 * vendors alongside SKILL.md — scripts, assets, LICENSE — have no representation in that flat,
 * markdown-only model; they stay on disk as vendored content without becoming a reference. A name
 * collision after slugifying (two different paths reducing to the same slug) keeps the first and
 * drops the rest — rare, and no worse than dropping the file outright, so it's silent rather than
 * a load-time throw. */
async function loadReferences(skillDir: string): Promise<SkillReference[]> {
  const files = await walkFiles(skillDir);
  const out: SkillReference[] = [];
  const seen = new Set<string>();
  for (const relPath of files) {
    if (relPath === "SKILL.md" || !relPath.endsWith(".md")) continue;
    const body = await readFile(join(skillDir, relPath), "utf8");
    if (body.length === 0) continue; // an empty reference would fail validateSkill's non-empty-body rule
    const name = slugifyRefPath(relPath.slice(0, -".md".length));
    if (seen.has(name)) continue;
    seen.add(name);
    out.push({ name, body });
  }
  return out;
}

function parseBody(md: string): { name: string; description: string; body: string } {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(md);
  const fm: Record<string, string> = {};
  if (m) for (const raw of m[1].split("\n")) {
    const kv = /^([a-zA-Z0-9_-]+):\s*(.*)$/.exec(raw.trim());
    if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, "");
  }
  return { name: fm.name ?? "", description: (fm.description ?? "").trim(), body: (m ? m[2] : md).trimEnd() + "\n" };
}

/** Loads baselane-authored first-party skills from `skills/first-party/` (#19). Kept in a separate
 * subtree the import script never wipes, so re-running the fetch can't clobber them. A first-party
 * skill carries no external licence text and no `attribution` — its provenance is the source tag.
 * Returns [] when the subtree is absent; a present-but-malformed manifest or an invalid skill
 * throws (the seed must never ship an invalid skill — same contract as the fetched path). */
async function loadFirstPartySkills(dir: string): Promise<SeedSkill[]> {
  const fpDir = join(dir, "first-party");
  let raw: string;
  try {
    raw = await readFile(join(fpDir, "manifest.json"), "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  const manifest: FirstPartyManifest = JSON.parse(raw);
  const out: SeedSkill[] = [];
  for (const entry of manifest.skills) {
    const md = await readFile(join(fpDir, entry.name, "SKILL.md"), "utf8");
    const parsed = parseBody(md);
    const block = validateSkill({
      name: parsed.name || entry.name,
      description: parsed.description,
      body: parsed.body,
      category: entry.category,
    });
    out.push({ block, licenseText: "", source: FIRST_PARTY_SOURCE, url: "", sha: "" });
  }
  return out;
}

/** Reads and VALIDATES every committed seed skill (validateSkill is the sole authority). Throws if
 * any seed no longer conforms — the seed must never ship an invalid skill. First-party skills are
 * appended after the fetched (third-party) ones, so callers keying off index order are unaffected. */
export async function loadSeedSkills(): Promise<SeedSkill[]> {
  const dir = seedSkillsDir();
  const manifest: Manifest = JSON.parse(await readFile(join(dir, "seed-manifest.json"), "utf8"));
  const shaByRepo = new Map(manifest.sources.map((s) => [s.repo, s.sha]));
  const out: SeedSkill[] = [];
  for (const entry of manifest.skills) {
    const skillDir = join(dir, entry.name);
    const md = await readFile(join(skillDir, "SKILL.md"), "utf8");
    const licenseText = await readFile(join(skillDir, "LICENSE"), "utf8");
    const parsed = parseBody(md);
    const references = await loadReferences(skillDir);
    const block = validateSkill({
      name: parsed.name || entry.name,
      description: parsed.description,
      body: parsed.body,
      category: entry.category,
      attribution: { source: entry.source, url: entry.url, license: entry.license },
      ...(references.length > 0 ? { references } : {}),
    });
    out.push({ block, licenseText, source: entry.source, url: entry.url, sha: shaByRepo.get(entry.source) ?? "" });
  }
  return [...out, ...(await loadFirstPartySkills(dir))];
}
