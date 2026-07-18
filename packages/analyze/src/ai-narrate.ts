import type { RepoFileSource, AnalysisProfile } from "./types.ts";
import type { ConventionsReport } from "./detect/conventions.ts";
import type { DesignTokensReport } from "./detect/design-tokens.ts";
import type { DesignNarration } from "./design.ts";
import { sanitizeNarration, type NarrationSections } from "./architecture.ts";

const API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-5";
const MAX_TOKENS = 4096;
const SAMPLE_COUNT = 8;
const SAMPLE_BYTES = 4096;
const SAMPLE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".rb", ".go", ".rs", ".java"]);
const MAX_HYPOTHESIZED_RULES = 20;

export interface NarrateConfig {
  apiKey: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

export interface NarrationInput {
  profile: AnalysisProfile;
  conventions: ConventionsReport;
  samples: Array<{ path: string; content: string }>;
}

/** Up to 8 source files spread evenly across the sorted listing, truncated to 4KB each. */
export async function pickSamples(source: RepoFileSource): Promise<Array<{ path: string; content: string }>> {
  const files = (await source.listFiles()).filter((f) => {
    const dot = f.lastIndexOf(".");
    return dot !== -1 && SAMPLE_EXTS.has(f.slice(dot));
  });
  if (files.length === 0) return [];
  const step = Math.max(1, Math.floor(files.length / SAMPLE_COUNT));
  const picked: Array<{ path: string; content: string }> = [];
  for (let i = 0; i < files.length && picked.length < SAMPLE_COUNT; i += step) {
    const content = await source.readFile(files[i]);
    if (content !== null) picked.push({ path: files[i], content: content.slice(0, SAMPLE_BYTES) });
  }
  return picked;
}

const PROMPT_INTRO =
  "You are documenting a codebase for its ARCHITECTURE.md. From the static analysis report and " +
  "source samples below, write (1) a short architecture overview (how the pieces fit, data flow, " +
  "what a new engineer must know) and (2) deeper unwritten rules you can infer that static " +
  "measurement cannot see (error-handling idioms, persistence patterns, layering rules). Only " +
  "claim a rule the samples actually support. Respond with ONLY a JSON object: " +
  '{"overview": "<markdown>", "hypothesizedRules": ["<rule>", ...]}';

export async function narrateArchitecture(input: NarrationInput, cfg: NarrateConfig): Promise<NarrationSections> {
  const fetchImpl = cfg.fetchImpl ?? fetch;
  const sampleBlock = input.samples.map((s) => `--- ${s.path}\n${s.content}`).join("\n\n");
  const res = await fetchImpl(API_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": cfg.apiKey, "anthropic-version": ANTHROPIC_VERSION },
    body: JSON.stringify({
      model: cfg.model ?? DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: "user",
          content: `${PROMPT_INTRO}\n\nANALYSIS:\n${JSON.stringify({ profile: input.profile, conventions: input.conventions })}\n\nSAMPLES:\n${sampleBlock}`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI narration request failed: ${res.status}`);
  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = data.content?.find((c) => c.type === "text")?.text ?? "";
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("AI narration returned an unparseable response");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error("AI narration returned an unparseable response");
  }
  const o = parsed as { overview?: unknown; hypothesizedRules?: unknown };
  if (typeof o.overview !== "string" || !Array.isArray(o.hypothesizedRules)) {
    throw new Error("AI narration returned an unparseable response");
  }
  return {
    overview: sanitizeNarration(o.overview),
    hypothesizedRules: o.hypothesizedRules
      .slice(0, MAX_HYPOTHESIZED_RULES)
      .filter((r): r is string => typeof r === "string")
      .map(sanitizeNarration),
  };
}

const DESIGN_SAMPLE_EXTS = new Set([".css", ".scss", ".sass", ".less", ".tsx", ".jsx", ".vue", ".svelte"]);

export interface DesignNarrationInput {
  tokens: DesignTokensReport;
  samples: Array<{ path: string; content: string }>;
}

/** Up to 8 UI files (stylesheets + components) spread evenly across the sorted listing,
 * truncated to 4KB each — the design equivalent of pickSamples. */
export async function pickDesignSamples(source: RepoFileSource): Promise<Array<{ path: string; content: string }>> {
  const files = (await source.listFiles()).filter((f) => {
    const dot = f.lastIndexOf(".");
    return dot !== -1 && DESIGN_SAMPLE_EXTS.has(f.slice(dot));
  });
  if (files.length === 0) return [];
  const step = Math.max(1, Math.floor(files.length / SAMPLE_COUNT));
  const picked: Array<{ path: string; content: string }> = [];
  for (let i = 0; i < files.length && picked.length < SAMPLE_COUNT; i += step) {
    const content = await source.readFile(files[i]);
    if (content !== null) picked.push({ path: files[i], content: content.slice(0, SAMPLE_BYTES) });
  }
  return picked;
}

const DESIGN_PROMPT_INTRO =
  "You are documenting a design system for its DESIGN.md. From the extracted design tokens and UI " +
  "source samples below, write (1) concrete do's and don'ts for building UI in THIS codebase and (2) " +
  "an agent prompt guide telling an AI tool how to reuse these tokens. Ground every rule in the tokens " +
  "and samples — do not invent a design language the code doesn't show. Respond with ONLY a JSON " +
  'object: {"dosDonts": "<markdown>", "agentGuide": "<markdown>"}';

export async function narrateDesign(input: DesignNarrationInput, cfg: NarrateConfig): Promise<DesignNarration> {
  const fetchImpl = cfg.fetchImpl ?? fetch;
  const sampleBlock = input.samples.map((s) => `--- ${s.path}\n${s.content}`).join("\n\n");
  const res = await fetchImpl(API_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": cfg.apiKey, "anthropic-version": ANTHROPIC_VERSION },
    body: JSON.stringify({
      model: cfg.model ?? DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: "user", content: `${DESIGN_PROMPT_INTRO}\n\nTOKENS:\n${JSON.stringify(input.tokens)}\n\nSAMPLES:\n${sampleBlock}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI design narration request failed: ${res.status}`);
  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = data.content?.find((c) => c.type === "text")?.text ?? "";
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("AI design narration returned an unparseable response");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error("AI design narration returned an unparseable response");
  }
  const o = parsed as { dosDonts?: unknown; agentGuide?: unknown };
  if (typeof o.dosDonts !== "string" || typeof o.agentGuide !== "string") {
    throw new Error("AI design narration returned an unparseable response");
  }
  return { dosDonts: sanitizeNarration(o.dosDonts), agentGuide: sanitizeNarration(o.agentGuide) };
}
