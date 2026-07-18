import { describe, expect, it, vi } from "vitest";
import { aiMergeFile, type MergeInput } from "../src/ai-merge.ts";
import { END_MARKER, buildStartMarker, mergeManagedRegion } from "../src/merge-region.ts";

const PACK_ID = "baselane";
const VERSION = "1.2.0";
const START = buildStartMarker(PACK_ID, VERSION);
const END = END_MARKER;

const EXISTING = `# CLAUDE.md\n\n## Key Entities\nBikes, Batteries, Drivers…\n\n## Env vars\n- STRIPE_SECRET_KEY, REDIS_URL…\n\n## Conventions\n- TypeORM migrations…\n`;
const MANAGED_BODY = "Some baseline rules.";

function input(overrides: Partial<MergeInput> = {}): MergeInput {
  return { path: "CLAUDE.md", existing: EXISTING, managedBody: MANAGED_BODY, packId: PACK_ID, version: VERSION, ...overrides };
}

function anthropicResponse(text: string, status = 200): Response {
  return new Response(JSON.stringify({ content: [{ type: "text", text }] }), { status });
}

describe("aiMergeFile", () => {
  it("returns the mechanical merge and never calls fetch when no API key is configured", async () => {
    const fetchImpl = vi.fn();
    const result = await aiMergeFile(input(), { apiKey: null, fetchImpl: fetchImpl as unknown as typeof fetch });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.usedAi).toBe(false);
    expect(result.rationale).toBe("Mechanical merge (no AI key configured).");
    expect(result.merged).toBe(mergeManagedRegion(EXISTING, MANAGED_BODY, PACK_ID, VERSION));
  });

  it("also skips the network when the API key is an empty string", async () => {
    const fetchImpl = vi.fn();
    const result = await aiMergeFile(input(), { apiKey: "", fetchImpl: fetchImpl as unknown as typeof fetch });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.usedAi).toBe(false);
  });

  it("returns the AI-merged content on a valid response, sending the key only in the header", async () => {
    const aiMerged = `${EXISTING.trimEnd()}\n\n${START}\n${MANAGED_BODY}\n${END}\n`;
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { model: string };
      expect(body.model).toBe("claude-sonnet-5"); // default model resolution
      expect(String(init?.body)).not.toContain("secret-key"); // key never in the body
      const headers = new Headers(init?.headers);
      expect(headers.get("x-api-key")).toBe("secret-key");
      expect(headers.get("anthropic-version")).toBe("2023-06-01");
      return anthropicResponse(JSON.stringify({ merged: aiMerged, rationale: "Merged cleanly." }));
    });

    const result = await aiMergeFile(input(), { apiKey: "secret-key", fetchImpl: fetchImpl as unknown as typeof fetch });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe("https://api.anthropic.com/v1/messages");
    expect(result.usedAi).toBe(true);
    expect(result.merged).toBe(aiMerged);
    expect(result.rationale).toBe("Merged cleanly.");
  });

  it("#22: falls back to mechanical when the model drops a dev line that also appears in the pack body", async () => {
    const houseRule = "- Use parameterized queries for all DB access.";
    const existing = `# CLAUDE.md\n\n## House rules\n${houseRule}\n- Keep secrets in env.\n`;
    const managedBody = `Security baseline:\n${houseRule}`; // pack body coincidentally repeats the dev's own rule
    // The model DELETED the dev's house rule from the dev section but kept it inside the managed region.
    // Old check saw the line "somewhere in merged" and passed; the fix must detect the drop → mechanical.
    const aiMerged = `# CLAUDE.md\n\n## House rules\n- Keep secrets in env.\n\n${buildStartMarker(PACK_ID, VERSION)}\n${managedBody}\n${END}\n`;
    const fetchImpl = vi.fn(async () => anthropicResponse(JSON.stringify({ merged: aiMerged, rationale: "x" })));
    const result = await aiMergeFile(input({ existing, managedBody }), { apiKey: "k", fetchImpl: fetchImpl as unknown as typeof fetch });

    expect(result.usedAi).toBe(false); // preservation failed (dev line only survived inside the region) → fallback
    expect(result.merged).toBe(mergeManagedRegion(existing, managedBody, PACK_ID, VERSION));
  });

  it("resolves the model from cfg.model over the environment default", async () => {
    const aiMerged = `${EXISTING.trimEnd()}\n\n${START}\n${MANAGED_BODY}\n${END}\n`;
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { model: string };
      expect(body.model).toBe("claude-opus-4-8");
      return anthropicResponse(JSON.stringify({ merged: aiMerged, rationale: "ok" }));
    });

    await aiMergeFile(input(), {
      apiKey: "secret-key",
      model: "claude-opus-4-8",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("falls back to the mechanical merge on a non-200 response", async () => {
    const fetchImpl = vi.fn(async () => new Response("Internal error", { status: 500 }));

    const result = await aiMergeFile(input(), { apiKey: "secret-key", fetchImpl: fetchImpl as unknown as typeof fetch });

    expect(result.usedAi).toBe(false);
    expect(result.rationale).toContain("HTTP 500");
    expect(result.merged).toBe(mergeManagedRegion(EXISTING, MANAGED_BODY, PACK_ID, VERSION));
  });

  it("falls back to the mechanical merge when fetch throws", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network down");
    });

    const result = await aiMergeFile(input(), { apiKey: "secret-key", fetchImpl: fetchImpl as unknown as typeof fetch });

    expect(result.usedAi).toBe(false);
    expect(result.rationale).toContain("network down");
    expect(result.merged).toBe(mergeManagedRegion(EXISTING, MANAGED_BODY, PACK_ID, VERSION));
  });

  it("falls back to the mechanical merge when the response text is not valid JSON", async () => {
    const fetchImpl = vi.fn(async () => anthropicResponse("not json at all"));

    const result = await aiMergeFile(input(), { apiKey: "secret-key", fetchImpl: fetchImpl as unknown as typeof fetch });

    expect(result.usedAi).toBe(false);
    expect(result.merged).toBe(mergeManagedRegion(EXISTING, MANAGED_BODY, PACK_ID, VERSION));
  });

  it("falls back to the mechanical merge when the merged text is missing the required markers", async () => {
    const missingMarkers = `${EXISTING.trimEnd()}\n\n${MANAGED_BODY}\n`; // no markers at all
    const fetchImpl = vi.fn(async () => anthropicResponse(JSON.stringify({ merged: missingMarkers, rationale: "ok" })));

    const result = await aiMergeFile(input(), { apiKey: "secret-key", fetchImpl: fetchImpl as unknown as typeof fetch });

    expect(result.usedAi).toBe(false);
    expect(result.rationale).toContain("markers");
    expect(result.merged).toBe(mergeManagedRegion(EXISTING, MANAGED_BODY, PACK_ID, VERSION));
  });

  it("falls back to the mechanical merge when the merged text dropped the existing content", async () => {
    // Short, markers present, but the team's "Key Entities" / "Conventions" content is gone.
    const droppedContent = `${START}\n${MANAGED_BODY}\n${END}\n`;
    const fetchImpl = vi.fn(async () => anthropicResponse(JSON.stringify({ merged: droppedContent, rationale: "ok" })));

    const result = await aiMergeFile(input(), { apiKey: "secret-key", fetchImpl: fetchImpl as unknown as typeof fetch });

    expect(result.usedAi).toBe(false);
    expect(result.rationale).toContain("dropped existing content");
    expect(result.merged).toBe(mergeManagedRegion(EXISTING, MANAGED_BODY, PACK_ID, VERSION));
  });

  it("falls back to mechanical when the AI keeps the header but drops a later line and pads to hide it (adversarial)", async () => {
    // Defeats the OLD length+prefix guard: keep existing's first 60 chars, pad the rest
    // with filler longer than the original, include both markers — but the team's
    // env-vars line is silently gone. The line-presence guard must reject this, because a
    // false positive here would permanently destroy that customer content.
    const headerPrefix = EXISTING.trim().slice(0, 60);
    const filler = "\n" + "x".repeat(EXISTING.length + 200);
    const padded = `${headerPrefix}${filler}\n\n${START}\n${MANAGED_BODY}\n${END}\n`;

    // Sanity: this payload WOULD have passed the retired guard (longer than existing, and
    // it contains existing's leading slice) — proving the hole it closed.
    expect(padded.length).toBeGreaterThanOrEqual(EXISTING.length);
    expect(padded).toContain(headerPrefix);
    expect(padded).not.toContain("STRIPE_SECRET_KEY, REDIS_URL…");

    const fetchImpl = vi.fn(async () => anthropicResponse(JSON.stringify({ merged: padded, rationale: "trust me" })));
    const result = await aiMergeFile(input(), { apiKey: "secret-key", fetchImpl: fetchImpl as unknown as typeof fetch });

    expect(result.usedAi).toBe(false);
    expect(result.rationale).toContain("dropped existing content");
    // The mechanical fallback preserves every line, including the env-vars line the AI dropped.
    expect(result.merged).toContain("STRIPE_SECRET_KEY, REDIS_URL…");
    expect(result.merged).toBe(mergeManagedRegion(EXISTING, MANAGED_BODY, PACK_ID, VERSION));
  });

  it("never throws even when the response body is empty JSON", async () => {
    const fetchImpl = vi.fn(async () => anthropicResponse(JSON.stringify({})));

    const result = await aiMergeFile(input(), { apiKey: "secret-key", fetchImpl: fetchImpl as unknown as typeof fetch });

    expect(result.usedAi).toBe(false);
  });
});
