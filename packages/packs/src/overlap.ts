import type { SkillBlock, WorkflowPack } from "./types.ts";

/**
 * #23 overlap detection: near-duplicate packs and pack↔skill pairs ship with no cross-link, so a
 * user installs both and gets overlapping capabilities. This pure module finds those overlaps by
 * name so the catalog can surface a "related to X" note, a maintainer-audit lint can list them, and
 * the dashboard AI check can review them. Reused by all three — kept dependency-free.
 */

export interface SkillOverlap {
  packId: string;
  skillName: string;
  /** Which surface of the pack the skill collided with. */
  via: "pack-id" | "agent" | "command" | "attached-skill";
  /** The pack-side name that matched (pre-normalization), for display. */
  matchedName: string;
}

/**
 * Normalize a hyphen/underscore/space-separated name to a comparable stem so different word forms
 * of the same concept collapse together. Per word: strip a trailing gerund `-ing`, then a trailing
 * `e`, then a trailing plural `-s`, then join. So `brainstorm`≈`brainstorming`,
 * `write-plan`≈`writing-plans`, `execute-plan`≈`executing-plans`, and `systematic-debugging`
 * matches itself — the exact and word-form cases the #23 finding cites. Deliberately conservative:
 * it catches obvious variants, not arbitrary synonyms; genuinely fuzzy relationships are declared
 * explicitly (the `relatedTo` field) rather than guessed here.
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 0)
    .map((w) => w.replace(/ing$/, "").replace(/e$/, "").replace(/s$/, ""))
    .join("");
}

interface Surface {
  via: SkillOverlap["via"];
  name: string;
}

/** Every name a pack "provides" — its id, agents, commands, and attached skills — as normalizable surfaces. */
function packSurfaces(pack: WorkflowPack): Surface[] {
  return [
    { via: "pack-id", name: pack.id },
    ...pack.agents.map((a) => ({ via: "agent" as const, name: a.name })),
    ...pack.commands.map((c) => ({ via: "command" as const, name: c.name })),
    ...(pack.skills ?? []).map((s) => ({ via: "attached-skill" as const, name: s.name })),
  ];
}

/**
 * For every (pack, skill) pair whose names collapse to the same stem, emit one overlap. At most one
 * overlap per pair even when several of the pack's surfaces match — the finding is "these two
 * overlap", not "this skill matches three of the pack's names". The first matching surface (in
 * id → agent → command → attached-skill order) is reported as the reason.
 */
export function computeSkillOverlaps(packs: WorkflowPack[], skills: SkillBlock[]): SkillOverlap[] {
  const overlaps: SkillOverlap[] = [];
  for (const pack of packs) {
    const byStem = new Map<string, Surface>();
    for (const surface of packSurfaces(pack)) {
      const stem = normalizeName(surface.name);
      if (stem.length > 0 && !byStem.has(stem)) byStem.set(stem, surface);
    }
    for (const skill of skills) {
      const hit = byStem.get(normalizeName(skill.name));
      if (hit) overlaps.push({ packId: pack.id, skillName: skill.name, via: hit.via, matchedName: hit.name });
    }
  }
  return overlaps;
}
