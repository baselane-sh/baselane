import type { WorkflowPack } from "./types.ts";
import { validatePack } from "./validate.ts";
import { ingestHarness } from "./ingest.ts";

export interface PackFromFilesetResult {
  pack: WorkflowPack;
  derived: boolean;
  sources: string[];
  skipped: string[];
}

const VERSION_TAG_RE = /^v?(\d+\.\d+\.\d+)$/;

const ONE_LEVEL_SKILL_RE = /^skills\/([^/]+)\/SKILL\.md$/;
const TWO_LEVEL_SKILL_RE = /^skills\/([^/]+)\/([^/]+)\/SKILL\.md$/;
const AGENTS_SKILL_RE = /^\.agents\/skills\/([^/]+)\/SKILL\.md$/;
const ROOT_SKILL_PATH = "SKILL.md";

function stampVersion(ref: string, sha: string): string {
  const m = VERSION_TAG_RE.exec(ref);
  return m ? m[1] : `0.0.0+${sha.slice(0, 7)}`;
}

/** One npx-skills-convention `SKILL.md` found in the fileset, plus enough to resolve shadowing. */
interface SkillMatch {
  path: string;
  name: string;
  /** Directory containing the SKILL.md (and its siblings), "" for a root single-skill repo. */
  sourceDir: string;
  /** Path-segment depth of the SKILL.md — smaller wins on a name collision (shallow-shadows-deep). */
  depth: number;
}

function rootSkillName(repoName: string): string {
  const segs = repoName.split("/");
  return (segs[segs.length - 1] || repoName).toLowerCase();
}

/** Recognizes every npx-skills-convention layout for a SKILL.md: root single-skill repo,
 * `skills/<name>/SKILL.md`, two-level `skills/<category>/<name>/SKILL.md` (category dirs include
 * dot-dirs like `.curated`/`.experimental`/`.system`), and `.agents/skills/<name>/SKILL.md`. */
function findSkillMatches(paths: string[], repoName: string): SkillMatch[] {
  const matches: SkillMatch[] = [];
  for (const path of paths) {
    let name: string | null = null;
    let sourceDir = "";
    if (path === ROOT_SKILL_PATH) {
      name = rootSkillName(repoName);
      sourceDir = "";
    } else {
      const oneLevel = ONE_LEVEL_SKILL_RE.exec(path);
      const twoLevel = !oneLevel ? TWO_LEVEL_SKILL_RE.exec(path) : null;
      const agentsLevel = !oneLevel && !twoLevel ? AGENTS_SKILL_RE.exec(path) : null;
      if (oneLevel) {
        name = oneLevel[1];
        sourceDir = `skills/${oneLevel[1]}`;
      } else if (twoLevel) {
        name = twoLevel[2];
        sourceDir = `skills/${twoLevel[1]}/${twoLevel[2]}`;
      } else if (agentsLevel) {
        name = agentsLevel[1];
        sourceDir = `.agents/skills/${agentsLevel[1]}`;
      }
    }
    if (name === null) continue;
    matches.push({ path, name, sourceDir, depth: path.split("/").length - 1 });
  }
  return matches;
}

/** Shallow-shadows-deep: when the same skill name appears at multiple depths, the shallowest
 * SKILL.md wins. At equal depth, the first path in sorted order wins (deterministic tie-break). */
function pickWinners(matches: SkillMatch[]): Map<string, SkillMatch> {
  const byName = new Map<string, SkillMatch[]>();
  for (const m of matches) {
    const arr = byName.get(m.name) ?? [];
    arr.push(m);
    byName.set(m.name, arr);
  }
  const winners = new Map<string, SkillMatch>();
  for (const [name, arr] of byName) {
    const sorted = [...arr].sort((a, b) => a.depth - b.depth || a.path.localeCompare(b.path));
    winners.set(name, sorted[0]);
  }
  return winners;
}

/** Remaps every winning skills-corpus layout onto the `.claude/skills/<name>/...` surface that
 * `ingestHarness` already knows how to read — the ONLY place layout knowledge lives. Sibling files
 * (references, scripts) one level under a winning skill dir travel with it, under the same name.
 * Shadowed SKILL.md's (and their siblings) are left at their original path, unremapped, so
 * `ingestHarness` never sees them. Files not part of any skill layout pass through untouched. */
function remapSkillsLayout(files: Record<string, string>, repoName: string): Record<string, string> {
  const paths = Object.keys(files);
  const winners = [...pickWinners(findSkillMatches(paths, repoName)).values()];
  const winnersByPath = new Map(winners.map((w) => [w.path, w]));
  const winningDirs = winners.filter((w) => w.sourceDir !== "").map((w) => ({ prefix: `${w.sourceDir}/`, name: w.name }));

  const remapped: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    const direct = winnersByPath.get(path);
    if (direct) {
      remapped[`.claude/skills/${direct.name}/SKILL.md`] = content;
      continue;
    }
    const sibling = winningDirs.find((d) => path.startsWith(d.prefix) && !path.slice(d.prefix.length).includes("/"));
    if (sibling) {
      remapped[`.claude/skills/${sibling.name}/${path.slice(sibling.prefix.length)}`] = content;
      continue;
    }
    remapped[path] = content;
  }
  return remapped;
}

/** Narrows an already-validated pack to a single named skill (the `@skill` selector). Throws
 * naming every available skill name when `onlySkill` doesn't match any of them. */
function filterOnlySkill(pack: WorkflowPack, onlySkill: string | undefined): WorkflowPack {
  if (!onlySkill) return pack;
  const skills = pack.skills ?? [];
  const match = skills.find((s) => s.name === onlySkill);
  if (!match) {
    const available = skills.map((s) => s.name).join(", ") || "(none)";
    throw new Error(`pack-from-fileset: no skill named "${onlySkill}" — available: ${available}`);
  }
  return { ...pack, skills: [match] };
}

export async function packFromFileset(
  files: Record<string, string>,
  opts: { repoName: string; ref: string; sha: string; onlySkill?: string },
): Promise<PackFromFilesetResult> {
  if (typeof files["pack.json"] === "string") {
    let raw: unknown;
    try {
      raw = JSON.parse(files["pack.json"]);
    } catch (err) {
      throw new Error(`pack-from-fileset: pack.json is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
    }
    const pack = filterOnlySkill(validatePack(raw), opts.onlySkill);
    return { pack, derived: false, sources: ["pack.json"], skipped: [] };
  }

  // Skills-corpus layouts (plugin-repo skills/, two-level catalog dirs, .agents/skills/, root
  // single-skill SKILL.md) → the .claude layout ingest knows.
  const remapped = remapSkillsLayout(files, opts.repoName);

  const input = {
    repoName: opts.repoName,
    listFiles: async () => Object.keys(remapped),
    readFile: async (path: string) => remapped[path] ?? null,
  };
  const result = await ingestHarness(input);
  const hasHarness = Object.keys(remapped).some((p) => p === "AGENTS.md" || p.startsWith(".claude/"));
  if (!hasHarness) {
    throw new Error(
      `pack-from-fileset: nothing installable — no root pack.json (native pack) and no AGENTS.md/.claude/skills content to ingest. See the pack format docs.`,
    );
  }
  const pack = filterOnlySkill(validatePack({ ...result.pack, version: stampVersion(opts.ref, opts.sha) }), opts.onlySkill);
  return { pack, derived: true, sources: result.sources, skipped: result.skipped };
}
