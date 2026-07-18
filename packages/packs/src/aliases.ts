/**
 * Retired pack ids that still resolve to their successor, so existing assignments,
 * bundles, and open PRs that reference the old id keep working. The map IS the
 * migration: a retired pack's directory and goldens are deleted, and this entry
 * redirects the id to its successor's content.
 */
export const PACK_ALIASES: Record<string, string> = {
  "test-loop": "software-engineer-harness",
};
