import { sanitizeNarration } from "./architecture.ts";
import type { RepoDigest } from "./pack-repo.ts";

const API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-5";
const MAX_TOKENS = 8192;
const MAX_INSTRUCTIONS = 500;

export interface AuditFacts {
  languages: string[];
  frameworks: string[];
  packageManager: string | null;
  commands: { build: string | null; test: string | null; lint: string | null };
  lintTools: string[];
  hasCI: boolean;
  hasTestSuite: boolean;
  importGraph: { modules: number; externals: number; edges: number; topFanIn: Array<[string, number]> };
}

export interface AuditOptions {
  focus?: string[];
  customInstructions?: string;
}

export interface AuditConfig {
  apiKey: string;
  fetchImpl?: typeof fetch;
  model?: string;
}

const SECTIONS = [
  "1. **High-Level Overview** — primary purpose, core domain, tech stack, main frameworks.",
  "2. **Directory Structure & Architecture** — folder layout and the architectural pattern(s) in use.",
  "3. **Core Abstractions & Flows** — the 2-3 most important modules/classes; the execution flow from entry point to output.",
  "4. **Code Quality & Technical Debt** — anti-patterns, code smells, bottlenecks, gaps in error handling or tests (ground this in the detected lint/tooling).",
  "5. **Security & Performance** — concrete risks (hardcoded secrets, unprotected endpoints) and likely performance hot spots.",
  "6. **Recommendations** — a prioritized list of the top 3-5 highest-value improvements.",
];

export function buildAuditPrompt(input: { digest: RepoDigest; facts: AuditFacts; options?: AuditOptions }): string {
  const focus = (input.options?.focus ?? []).slice().sort();
  const instructions = (input.options?.customInstructions ?? "").trim().slice(0, MAX_INSTRUCTIONS);
  const focusLine = focus.length
    ? `\nThe maintainer especially cares about: ${focus.join(", ")}. Weight the analysis toward these.\n`
    : "";
  const instructionsBlock = instructions
    ? `\n<<<MAINTAINER INSTRUCTIONS (their own directive about their repo)\n${instructions}\nMAINTAINER INSTRUCTIONS>>>\n`
    : "";
  return (
    "Act as a Principal Software Engineer. Analyze the repository below and write a comprehensive, " +
    "SPECIFIC breakdown in markdown. Cite real file paths (and line numbers where useful). Do not give " +
    "generic advice — every claim must be grounded in THIS repository's contents, tooling, and tests.\n\n" +
    "Produce exactly these sections:\n" +
    SECTIONS.map((s) => `## ${s}`).join("\n") +
    focusLine +
    instructionsBlock +
    `\n\nDETECTED FACTS:\n${JSON.stringify(input.facts)}\n\nREPOSITORY DIGEST:\n${input.digest.text}`
  );
}

export async function auditRepo(
  input: { digest: RepoDigest; facts: AuditFacts; options?: AuditOptions },
  cfg: AuditConfig,
): Promise<string> {
  const fetchImpl = cfg.fetchImpl ?? fetch;
  const res = await fetchImpl(API_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": cfg.apiKey, "anthropic-version": ANTHROPIC_VERSION },
    body: JSON.stringify({
      model: cfg.model ?? DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: buildAuditPrompt(input) }],
    }),
  });
  if (!res.ok) throw new Error(`AI audit request failed: ${res.status}`);
  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = (data.content?.find((c) => c.type === "text")?.text ?? "").trim();
  if (!text) throw new Error("AI audit returned an empty response");
  return sanitizeNarration(text);
}
