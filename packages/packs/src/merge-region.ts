/** The human-facing files a pack renders that get region-merged into a developer's own content. */
export const ENTRY_FILES: readonly string[] = ["AGENTS.md", "CLAUDE.md", "GEMINI.md", ".github/copilot-instructions.md"];

export function isEntryFile(renderedPath: string): boolean {
  return ENTRY_FILES.includes(renderedPath);
}

// The single source of truth for the managed-region marker format. The AI merge path
// (ai-merge.ts) imports these so it validates against the exact same literals the
// mechanical merger writes — a format change here can never silently desync the two.
export const END_MARKER = "<!-- baselane:end -->";

export function buildStartMarker(packId: string, version: string): string {
  return `<!-- baselane:start ${packId}@${version} — managed region, do not edit inside -->`;
}

// Matches ANY pack's opening marker line, used only to bound where the OTHER pack's
// region ends (so we don't misread a neighboring pack's region as part of ours).
const START_MARKER_ANY_RE = /<!-- baselane:start [^\n]*? — managed region, do not edit inside -->/;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Matches a complete existing region for THIS pack id — any version of it — from its
// opening marker through the next closing marker. The packId is fixed; only the version
// is a wildcard, so a version bump of the SAME pack still replaces in place, but another
// pack's region (different packId) never matches. Non-greedy so it stops at the first
// close, and requires both markers to be present; a dangling opener with no closer
// won't match.
function buildRegionRe(packId: string): RegExp {
  return new RegExp(
    `<!-- baselane:start ${escapeRegExp(packId)}@[^\\n]*? — managed region, do not edit inside -->\\n[\\s\\S]*?${escapeRegExp(END_MARKER)}`,
  );
}

// managedBody is pack-controlled content, not user content — it must never itself
// contain a marker literal (e.g. pack docs that show marker syntax as an example).
// If it did, buildBlock would produce a block containing what looks like a second
// region boundary, corrupting every merge downstream. Fail loudly at the source.
function assertNoMarkersIn(managedBody: string): void {
  if (managedBody.includes(END_MARKER) || START_MARKER_ANY_RE.test(managedBody)) {
    throw new Error("managedBody must not contain a baselane:start or baselane:end marker literal");
  }
}

function buildBlock(managedBody: string, packId: string, version: string): string {
  assertNoMarkersIn(managedBody);
  const startMarker = buildStartMarker(packId, version);
  return `${startMarker}\n${managedBody.trim()}\n${END_MARKER}`;
}

// Index of the next pack start marker (any pack) at or after `fromIndex`, or the end
// of the string if there isn't one. Used to bound how far we look for a stray end
// marker without accidentally reading into a genuinely separate, later region.
function indexOfNextStartMarker(text: string, fromIndex: number): number {
  const re = new RegExp(START_MARKER_ANY_RE.source, "g");
  re.lastIndex = fromIndex;
  const found = re.exec(text);
  return found ? found.index : text.length;
}

export interface ManagedRegion {
  packId: string;
  version: string;
  body: string;
}

// Captures every pack's opening marker with its packId/version split at the "@" that
// buildStartMarker joins them with — the read-side twin of that function. Global so
// extractManagedRegions can walk every region present in one pass.
const START_MARKER_CAPTURE_RE = /<!-- baselane:start ([^\n@]+)@([^\n]*?) — managed region, do not edit inside -->/g;

/**
 * Reads every managed region present in an entry file's content — the read-side twin of
 * mergeManagedRegion/buildStartMarker, built for inventory (drift detection, and
 * union-rollout's strippedManagedPackIds, which is just `.map(r => r.packId)` on this)
 * rather than merging. Shares mergeManagedRegion's exact boundary rules: a dangling
 * opener with no closer, or a region whose true end is ambiguous because the body
 * contains a stray end-marker literal before the next pack's start (or EOF), is skipped
 * entirely rather than guessed at — fail safe, same as the merge path.
 */
export function extractManagedRegions(content: string): ManagedRegion[] {
  const regions: ManagedRegion[] = [];
  const startRe = new RegExp(START_MARKER_CAPTURE_RE.source, "g");
  let match: RegExpExecArray | null;
  while ((match = startRe.exec(content)) !== null) {
    const packId = match[1];
    const version = match[2];
    const bodyStart = match.index + match[0].length;
    const boundary = indexOfNextStartMarker(content, bodyStart);
    const endIdx = content.indexOf(END_MARKER, bodyStart);
    if (endIdx === -1 || endIdx >= boundary) continue; // dangling opener — no valid close before the next region (or EOF)
    const regionIsAmbiguous = content.slice(endIdx + END_MARKER.length, boundary).includes(END_MARKER);
    if (regionIsAmbiguous) continue; // embedded end-marker literal — true boundary unknowable, fail safe
    regions.push({ packId, version, body: content.slice(bodyStart, endIdx).trim() });
  }
  return regions;
}

/**
 * Merge this pack's managed markdown block into a developer's existing entry file
 * (AGENTS.md, CLAUDE.md, GEMINI.md, copilot-instructions.md), preserving everything
 * they wrote by hand — and everything any OTHER pack has already put there.
 *
 * - No existing content → the block alone.
 * - Existing content with a valid region for THIS packId (any version of it) →
 *   replace just that region, byte-for-byte preserving text before and after it.
 *   A different pack's region elsewhere in the file is untouched, so multiple packs
 *   can coexist in the same entry file.
 * - Existing content with no valid region for this pack — including a malformed
 *   half-marker with no matching close, or a region whose boundaries are
 *   unparseable because the body contains a stray end-marker literal — → append a
 *   fresh block below, never deleting or truncating their content.
 */
export function mergeManagedRegion(existing: string | null, managedBody: string, packId: string, version: string): string {
  const block = buildBlock(managedBody, packId, version);

  if (existing === null || existing.trim() === "") {
    return `${block}\n`;
  }

  const match = existing.match(buildRegionRe(packId));
  if (match && match.index !== undefined) {
    const matchEnd = match.index + match[0].length;
    // The non-greedy region regex stops at the FIRST end marker. If the "body" we
    // just matched contains another end marker further down before the next pack's
    // start (or EOF), that first marker was actually embedded content, not the real
    // boundary — our match is bogus and slicing on it would orphan the true
    // remainder as loose text. Fail safe instead of guessing.
    const boundary = indexOfNextStartMarker(existing, matchEnd);
    const regionIsAmbiguous = existing.slice(matchEnd, boundary).includes(END_MARKER);
    if (!regionIsAmbiguous) {
      return existing.slice(0, match.index) + block + existing.slice(matchEnd);
    }
  }

  return `${existing.replace(/\s+$/, "")}\n\n${block}\n`;
}

// Matches a start marker line, capturing the packId (everything before the first "@" —
// packIds are kebab-case slugs and never contain "@", so this split is unambiguous).
const START_MARKER_WITH_ID_RE = /<!-- baselane:start (.+?)@[^@\n]*? — managed region, do not edit inside -->/g;

/**
 * Removes the complete existing region for `packId` (any version), leaving everything else
 * byte-for-byte untouched — the inverse of what `mergeManagedRegion` inserts. Joins the
 * surrounding content with a single blank line where both sides remain non-empty, matching
 * the spacing `mergeManagedRegion` itself produces around a region.
 *
 * Returns `content` unchanged when there's no region to remove: absent, a half marker with no
 * matching close, or an ambiguous boundary (a stray END_MARKER inside the matched body before
 * the next pack's start) — the exact same fail-safe guard `mergeManagedRegion` uses. Never
 * guesses; an ambiguous match means don't slice.
 *
 * Reconcile note: a sibling in-flight branch is adding a canonical `extractManagedRegions()`
 * scanner to this file. Once merged, this function's single-region removal could likely derive
 * from that scanner's output instead of its own `buildRegionRe` match — not done here to avoid
 * coupling two branches landing in the same file concurrently; left as a follow-up.
 */
export function stripManagedRegion(content: string, packId: string): string {
  const match = content.match(buildRegionRe(packId));
  if (!match || match.index === undefined) return content;

  const matchEnd = match.index + match[0].length;
  const boundary = indexOfNextStartMarker(content, matchEnd);
  const regionIsAmbiguous = content.slice(matchEnd, boundary).includes(END_MARKER);
  if (regionIsAmbiguous) return content;

  const before = content.slice(0, match.index).replace(/\n+$/, "");
  const after = content.slice(matchEnd).replace(/^\n+/, "");
  if (before === "") return after;
  if (after === "") return `${before}\n`;
  return `${before}\n\n${after}`;
}

/**
 * Every packId with a start marker present in `content`, in first-seen order, deduped. Used by
 * the rollout renderer to know which packs' regions to strip before folding in the current
 * effective set — safe to call even on a malformed/half-marker region, since `stripManagedRegion`
 * itself is a no-op when it can't confidently remove one.
 */
export function strippedManagedPackIds(content: string): string[] {
  const seen = new Set<string>();
  for (const m of content.matchAll(START_MARKER_WITH_ID_RE)) seen.add(m[1]);
  return [...seen];
}
