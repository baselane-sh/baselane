import { describe, expect, it } from "vitest";
import { ENTRY_FILES, END_MARKER, buildStartMarker, extractManagedRegions, isEntryFile, mergeManagedRegion, stripManagedRegion, strippedManagedPackIds } from "../src/merge-region.ts";

const PACK_ID = "baselane";
const VERSION = "1.2.0";
const START = buildStartMarker(PACK_ID, VERSION);
const END = END_MARKER;

// Mirrors the real PR #608 regression: a team's hand-written CLAUDE.md with
// their own project knowledge, which a naive generator overwrote outright.
const TEAM_CLAUDE_MD = `# CLAUDE.md

## Key Entities
Bikes, Batteries, Drivers…

## Conventions
- TypeORM migrations…
`;

describe("mergeManagedRegion", () => {
  it("returns the block alone when existing is null", () => {
    const merged = mergeManagedRegion(null, "Some rules.", PACK_ID, VERSION);
    expect(merged).toBe(`${START}\nSome rules.\n${END}\n`);
  });

  it("returns the block alone when existing is empty", () => {
    const merged = mergeManagedRegion("", "Some rules.", PACK_ID, VERSION);
    expect(merged).toBe(`${START}\nSome rules.\n${END}\n`);
  });

  it("replaces an existing region in place, preserving text before and after byte-for-byte", () => {
    const existing = `# Team notes\n\nBefore text.\n\n${START}\nOld body.\n${END}\n\nAfter text.\n`;
    const merged = mergeManagedRegion(existing, "New body.", PACK_ID, VERSION);
    expect(merged).toBe(`# Team notes\n\nBefore text.\n\n${START}\nNew body.\n${END}\n\nAfter text.\n`);
  });

  it("replaces a region tagged with an older pack version", () => {
    const oldStart = buildStartMarker(PACK_ID, "1.0.0");
    const existing = `Team content.\n\n${oldStart}\nOld body.\n${END}\n`;
    const merged = mergeManagedRegion(existing, "New body.", PACK_ID, VERSION);
    expect(merged).toBe(`Team content.\n\n${START}\nNew body.\n${END}\n`);
  });

  it("appends the block below existing content with no markers, preserving that content verbatim (the PR #608 bug)", () => {
    const merged = mergeManagedRegion(TEAM_CLAUDE_MD, "Some rules.", PACK_ID, VERSION);
    expect(merged.startsWith(TEAM_CLAUDE_MD.trimEnd())).toBe(true);
    expect(merged).toContain("## Key Entities\nBikes, Batteries, Drivers…");
    expect(merged).toContain("## Conventions\n- TypeORM migrations…");
    expect(merged).toBe(`${TEAM_CLAUDE_MD.trimEnd()}\n\n${START}\nSome rules.\n${END}\n`);
  });

  it("is idempotent when merging into a fresh file", () => {
    const once = mergeManagedRegion(null, "Some rules.", PACK_ID, VERSION);
    const twice = mergeManagedRegion(once, "Some rules.", PACK_ID, VERSION);
    expect(twice).toBe(once);
  });

  it("is idempotent when appending below existing content", () => {
    const once = mergeManagedRegion(TEAM_CLAUDE_MD, "Some rules.", PACK_ID, VERSION);
    const twice = mergeManagedRegion(once, "Some rules.", PACK_ID, VERSION);
    expect(twice).toBe(once);
  });

  it("treats a half marker (opening with no closing) as no valid region — appends without deleting", () => {
    const existing = `${TEAM_CLAUDE_MD}\n${START}\nDangling body with no close marker.\n`;
    const merged = mergeManagedRegion(existing, "Some rules.", PACK_ID, VERSION);
    expect(merged).toContain("## Key Entities\nBikes, Batteries, Drivers…");
    expect(merged).toContain("Dangling body with no close marker.");
    expect(merged).toBe(`${existing.trimEnd()}\n\n${START}\nSome rules.\n${END}\n`);
  });

  // Regression: the region regex used to be wildcard on the whole "packId@version"
  // portion, so merging pack B matched and replaced pack A's region outright.
  it("does not touch another pack's existing region — two packs coexist in the same entry file", () => {
    const securityStart = buildStartMarker("security-pack", "1.0.0");
    const existing = `# AGENTS.md\n\nTeam notes.\n\n${securityStart}\nSECURITY PACK CONTENT\n${END}\n`;

    const merged = mergeManagedRegion(existing, "Workflow pack body.", "workflow-pack", "1.0.0");
    const workflowStart = buildStartMarker("workflow-pack", "1.0.0");

    // Pack A's region survives byte-for-byte; pack B is appended alongside it, not replacing it.
    expect(merged).toContain(`${securityStart}\nSECURITY PACK CONTENT\n${END}`);
    expect(merged).toBe(`${existing.trimEnd()}\n\n${workflowStart}\nWorkflow pack body.\n${END}\n`);

    // Re-merging pack A in place still replaces only its own region, leaving pack B's alone.
    const remergedA = mergeManagedRegion(merged, "Updated security body.", "security-pack", "1.0.0");
    expect(remergedA).toContain("Updated security body.");
    expect(remergedA).not.toContain("SECURITY PACK CONTENT");
    expect(remergedA).toContain(`${workflowStart}\nWorkflow pack body.\n${END}`);
  });

  // Regression: the non-greedy region regex stopped at the FIRST end marker, so an
  // embedded/duplicated end-marker literal inside the region body truncated the match
  // and spliced the real remainder in as orphaned loose text — structurally corrupt
  // output. Must fail safe: append a fresh block, preserve every existing byte.
  it("fails safe (appends, never truncates) when the existing region contains an embedded end-marker literal", () => {
    const existing = `${START}\nBody line one.\nDocs example: ${END}\nBody line two (meant to stay inside).\n${END}\n`;

    const merged = mergeManagedRegion(existing, "New body.", PACK_ID, VERSION);

    expect(merged.startsWith(existing.trimEnd())).toBe(true);
    expect(merged).toContain("Docs example:");
    expect(merged).toContain("Body line two (meant to stay inside).");
    expect(merged).toBe(`${existing.trimEnd()}\n\n${START}\nNew body.\n${END}\n`);
  });

  // Regression guard: buildRegionRe only wildcards the version, not the packId, so a
  // prefix match (e.g. "web" matching inside "web-api") must never happen — the "@"
  // right after the packId in the regex is the boundary that prevents it.
  it("does not prefix-match another pack's id — 'web' must not match an existing 'web-api' region", () => {
    const webApiStart = buildStartMarker("web-api", "1.0.0");
    const existing = `# AGENTS.md\n\nTeam notes.\n\n${webApiStart}\nWEB API PACK CONTENT\n${END}\n`;

    const merged = mergeManagedRegion(existing, "Web pack body.", "web", "1.0.0");
    const webStart = buildStartMarker("web", "1.0.0");

    // The "web-api" region survives byte-for-byte; "web" is appended alongside it.
    expect(merged).toContain(`${webApiStart}\nWEB API PACK CONTENT\n${END}`);
    expect(merged).toBe(`${existing.trimEnd()}\n\n${webStart}\nWeb pack body.\n${END}\n`);
  });

  it("throws when managedBody itself contains a marker literal (programming error guard)", () => {
    expect(() => mergeManagedRegion(null, `Some text with ${END} inside.`, PACK_ID, VERSION)).toThrow();
    expect(() => mergeManagedRegion(null, `Docs example: ${START}`, PACK_ID, VERSION)).toThrow();
  });
});

describe("extractManagedRegions", () => {
  it("returns nothing for content with no markers", () => {
    expect(extractManagedRegions("")).toEqual([]);
    expect(extractManagedRegions(TEAM_CLAUDE_MD)).toEqual([]);
  });

  it("reads a single region's packId, version, and trimmed body", () => {
    const content = `# Team notes\n\nBefore.\n\n${START}\nSome rules.\n${END}\n\nAfter.\n`;
    expect(extractManagedRegions(content)).toEqual([{ packId: PACK_ID, version: VERSION, body: "Some rules." }]);
  });

  it("reads every region when multiple packs coexist in the same file, without cross-contamination", () => {
    const securityStart = buildStartMarker("security-pack", "1.0.0");
    const content = `# AGENTS.md\n\n${securityStart}\nSECURITY PACK CONTENT\n${END}\n\n${START}\nWorkflow pack body.\n${END}\n`;
    expect(extractManagedRegions(content)).toEqual([
      { packId: "security-pack", version: "1.0.0", body: "SECURITY PACK CONTENT" },
      { packId: PACK_ID, version: VERSION, body: "Workflow pack body." },
    ]);
  });

  // Same regression fixture merge-region already guards against prefix-matching: reading "web-api"'s
  // region must never be misparsed as belonging to a "web" pack id.
  it("does not prefix-match one pack id as a substring of another", () => {
    const webApiStart = buildStartMarker("web-api", "1.0.0");
    const webStart = buildStartMarker("web", "2.0.0");
    const content = `${webApiStart}\nWEB API CONTENT\n${END}\n\n${webStart}\nWEB CONTENT\n${END}\n`;
    expect(extractManagedRegions(content)).toEqual([
      { packId: "web-api", version: "1.0.0", body: "WEB API CONTENT" },
      { packId: "web", version: "2.0.0", body: "WEB CONTENT" },
    ]);
  });

  it("skips a half marker (opening with no closing) — reports no region for it", () => {
    const content = `${TEAM_CLAUDE_MD}\n${START}\nDangling body with no close marker.\n`;
    expect(extractManagedRegions(content)).toEqual([]);
  });

  // Mirrors mergeManagedRegion's own ambiguous-boundary guard: an embedded end-marker literal
  // inside the body means the "real" boundary can't be determined safely — fail safe by reporting
  // no region at all rather than guessing wrong and returning a truncated/corrupt body.
  it("fails safe (reports no region) when an embedded end-marker literal makes the boundary ambiguous", () => {
    const content = `${START}\nBody line one.\nDocs example: ${END}\nBody line two (meant to stay inside).\n${END}\n`;
    expect(extractManagedRegions(content)).toEqual([]);
  });

  it("is the read-side twin of buildStartMarker/mergeManagedRegion — round-trips a fresh merge", () => {
    const merged = mergeManagedRegion(null, "Some rules.", PACK_ID, VERSION);
    expect(extractManagedRegions(merged)).toEqual([{ packId: PACK_ID, version: VERSION, body: "Some rules." }]);
  });
});

describe("isEntryFile", () => {
  it("is true for the entry files that get region-merged", () => {
    for (const path of ENTRY_FILES) {
      expect(isEntryFile(path)).toBe(true);
    }
  });

  it("is false for fully-generated (non entry) paths", () => {
    expect(isEntryFile(".claude/agents/reviewer.md")).toBe(false);
    expect(isEntryFile(".claude/commands/go.md")).toBe(false);
    expect(isEntryFile(".claude/settings.json")).toBe(false);
  });
});

describe("stripManagedRegion", () => {
  it("returns content unchanged when the pack's region is absent", () => {
    const existing = "# AGENTS.md\n\nTeam notes.\n";
    expect(stripManagedRegion(existing, PACK_ID)).toBe(existing);
  });

  it("removes a mid-document region, stitching before/after with a single blank line", () => {
    const existing = `# Team notes\n\nBefore text.\n\n${START}\nOld body.\n${END}\n\nAfter text.\n`;
    expect(stripManagedRegion(existing, PACK_ID)).toBe("# Team notes\n\nBefore text.\n\nAfter text.\n");
  });

  it("removes a region at the very start of the file", () => {
    const existing = `${START}\nOld body.\n${END}\n\nAfter text.\n`;
    expect(stripManagedRegion(existing, PACK_ID)).toBe("After text.\n");
  });

  it("removes a region at the very end of the file", () => {
    const existing = `Before text.\n\n${START}\nOld body.\n${END}\n`;
    expect(stripManagedRegion(existing, PACK_ID)).toBe("Before text.\n");
  });

  it("returns empty string when the region is the entire file (round-trips with mergeManagedRegion(null, ...))", () => {
    const merged = mergeManagedRegion(null, "Some rules.", PACK_ID, VERSION);
    expect(stripManagedRegion(merged, PACK_ID)).toBe("");
  });

  it("leaves a half marker (opening with no closing) untouched — no valid region to remove", () => {
    const existing = `Team notes.\n\n${START}\nDangling body, no close marker.\n`;
    expect(stripManagedRegion(existing, PACK_ID)).toBe(existing);
  });

  it("does not touch another pack's region", () => {
    const securityStart = buildStartMarker("security-pack", "1.0.0");
    const existing = `# AGENTS.md\n\nTeam notes.\n\n${securityStart}\nSECURITY PACK CONTENT\n${END}\n`;
    expect(stripManagedRegion(existing, PACK_ID)).toBe(existing);
  });

  it("removes only the targeted pack's region when two packs' regions coexist", () => {
    const securityStart = buildStartMarker("security-pack", "1.0.0");
    const existing = `# AGENTS.md\n\nTeam notes.\n\n${securityStart}\nSECURITY PACK CONTENT\n${END}\n\n${START}\nWorkflow body.\n${END}\n`;
    const stripped = stripManagedRegion(existing, PACK_ID);
    expect(stripped).toContain(`${securityStart}\nSECURITY PACK CONTENT\n${END}`);
    expect(stripped).not.toContain("Workflow body.");
    expect(stripped).not.toContain(START);
  });

  it("fails safe (returns content unchanged) when the region contains an embedded end-marker literal", () => {
    const existing = `${START}\nBody line one.\nDocs example: ${END}\nBody line two (meant to stay inside).\n${END}\n`;
    expect(stripManagedRegion(existing, PACK_ID)).toBe(existing);
  });
});

describe("strippedManagedPackIds", () => {
  it("returns an empty array when no region is present", () => {
    expect(strippedManagedPackIds("# AGENTS.md\n\nNo regions here.\n")).toEqual([]);
  });

  it("lists every packId with a start marker, in first-seen order, deduped", () => {
    const securityStart = buildStartMarker("security-pack", "1.0.0");
    const content = `# AGENTS.md\n\n${securityStart}\nSECURITY\n${END}\n\n${START}\nWORKFLOW\n${END}\n`;
    expect(strippedManagedPackIds(content)).toEqual(["security-pack", PACK_ID]);
  });

  it("dedupes a repeated marker for the same packId", () => {
    const content = `${START}\nA\n${END}\n\n${buildStartMarker(PACK_ID, "1.3.0")}\nB\n${END}\n`;
    expect(strippedManagedPackIds(content)).toEqual([PACK_ID]);
  });
});
