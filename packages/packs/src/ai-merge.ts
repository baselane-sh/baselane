import { END_MARKER, buildStartMarker, mergeManagedRegion } from "./merge-region.ts";

export interface MergeInput {
  path: string;
  existing: string;
  managedBody: string;
  packId: string;
  version: string;
}

export interface MergeResult {
  path: string;
  merged: string;
  rationale: string;
  usedAi: boolean;
}

export interface AiConfig {
  apiKey: string | null;
  model?: string;
  fetchImpl?: typeof fetch;
}

const API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-5";
const MAX_TOKENS = 8192;

// The marker literals come from merge-region.ts (single source of truth). The AI is
// instructed to use these exact strings so mergeManagedRegion can still find the region
// on the next mechanical pass, and so we can validate the AI didn't invent its own.

function mechanicalFallback(input: MergeInput, rationale: string): MergeResult {
  const merged = mergeManagedRegion(input.existing, input.managedBody, input.packId, input.version);
  return { path: input.path, merged, rationale, usedAi: false };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function buildRequestBody(input: MergeInput, model: string, startMarker: string): unknown {
  const system = [
    `You adopt a baselane workflow-pack into a repo's existing ${input.path}.`,
    "Preserve ALL of the team's existing project-specific content verbatim (entities, conventions, env vars, service notes) — do not summarize, reformat, or drop any of it.",
    "Add the baselane standard inside exactly one managed region, delimited by these EXACT markers. Do not alter them, and do not invent your own:",
    `Opening marker: ${startMarker}`,
    `Closing marker: ${END_MARKER}`,
    'Return STRICT JSON and nothing else, matching this shape: {"merged": string, "rationale": string}. "merged" is the full resulting file content; "rationale" is one sentence explaining what you did.',
  ].join("\n");

  const user = [
    "Existing file content (preserve verbatim outside the managed region):",
    "---",
    input.existing,
    "---",
    "",
    "Managed region body to insert between the markers:",
    "---",
    input.managedBody,
    "---",
  ].join("\n");

  return { model, max_tokens: MAX_TOKENS, system, messages: [{ role: "user", content: user }] };
}

function extractResponseText(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const content = (data as { content?: unknown }).content;
  if (!Array.isArray(content)) return null;
  for (const block of content) {
    if (typeof block !== "object" || block === null) continue;
    const { type, text } = block as { type?: unknown; text?: unknown };
    if (type === "text" && typeof text === "string") return text;
  }
  return null;
}

// Models sometimes wrap the JSON in prose or a markdown fence despite instructions;
// try a straight parse first, then fall back to the outermost {...} slice.
function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through to the brace-slice attempt below
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

interface AiPayload {
  merged: string;
  rationale: string;
}

function parseAiPayload(text: string): AiPayload | null {
  const raw = extractJson(text);
  if (typeof raw !== "object" || raw === null) return null;
  const { merged, rationale } = raw as Record<string, unknown>;
  if (typeof merged !== "string" || merged.length === 0) return null;
  return { merged, rationale: typeof rationale === "string" ? rationale : "AI merge applied." };
}

// Strip every baselane managed region (start-marker … end-marker) from a body, leaving only the
// developer's own content. Used so the preservation check compares dev-content against dev-content
// and never counts the pack's freshly-inserted region as "preserving" a deleted line.
const MANAGED_REGION_RE = /<!-- baselane:start [^\n]*?-->[\s\S]*?<!-- baselane:end -->/g;

// The merged output must not have dropped ANY of the team's existing content. We check every
// non-blank line of `existing` survives (as a trimmed substring) in the merged output — but only
// in the part OUTSIDE the managed region on both sides. Bug #22: without stripping the region, a
// developer line the model DELETED that ALSO happens to appear in the pack's inserted body (common
// for house rules like "use parameterized queries") would count as preserved even though the
// original was removed. Comparing dev-content-to-dev-content closes that. Strict is the SAFE
// direction: a false negative just falls back to the deterministic mechanical merge, whereas a
// false positive silently destroys customer content — we err toward the fallback.
function preservesExisting(existing: string, merged: string): boolean {
  const devOnly = (text: string): string => text.replace(MANAGED_REGION_RE, "");
  const mergedDev = devOnly(merged);
  const existingLines = devOnly(existing)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return existingLines.every((line) => mergedDev.includes(line));
}

function validationFailure(payload: AiPayload, input: MergeInput, startMarker: string): string | null {
  if (!payload.merged.includes(startMarker) || !payload.merged.includes(END_MARKER)) {
    return "AI response did not include the required markers";
  }
  if (!preservesExisting(input.existing, payload.merged)) {
    return "AI response dropped existing content";
  }
  return null;
}

/**
 * Merge a pack's managed region into an existing file, preferring an AI-assisted merge
 * that can reconcile the team's surrounding content more gracefully than the mechanical
 * region merge — but never at the risk of corrupting or leaking anything. Any failure
 * (no key, network error, bad response, failed validation) falls back to
 * `mergeManagedRegion`. This function never throws.
 */
export async function aiMergeFile(input: MergeInput, cfg: AiConfig): Promise<MergeResult> {
  if (!cfg.apiKey) {
    return mechanicalFallback(input, "Mechanical merge (no AI key configured).");
  }

  const startMarker = buildStartMarker(input.packId, input.version);
  const model = cfg.model ?? process.env.BASELANE_MERGE_MODEL ?? DEFAULT_MODEL;
  const fetchImpl = cfg.fetchImpl ?? globalThis.fetch;

  let response: Response;
  try {
    response = await fetchImpl(API_URL, {
      method: "POST",
      headers: {
        "x-api-key": cfg.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify(buildRequestBody(input, model, startMarker)),
    });
  } catch (error) {
    return mechanicalFallback(input, `Mechanical merge (AI request failed: ${errorMessage(error)}).`);
  }

  if (!response.ok) {
    return mechanicalFallback(input, `Mechanical merge (AI request failed: HTTP ${response.status}).`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return mechanicalFallback(input, "Mechanical merge (AI response was not valid JSON).");
  }

  const text = extractResponseText(data);
  if (text === null) {
    return mechanicalFallback(input, "Mechanical merge (AI response had no text content).");
  }

  const payload = parseAiPayload(text);
  if (payload === null) {
    return mechanicalFallback(input, "Mechanical merge (AI response was not valid JSON).");
  }

  const failure = validationFailure(payload, input, startMarker);
  if (failure !== null) {
    return mechanicalFallback(input, `Mechanical merge (${failure}).`);
  }

  return { path: input.path, merged: payload.merged, rationale: payload.rationale, usedAi: true };
}
