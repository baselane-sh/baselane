import { describe, it, expect } from "vitest";
import { auditRepo, buildAuditPrompt, type AuditFacts } from "../src/ai-audit.ts";
import type { RepoDigest } from "../src/pack-repo.ts";

const digest: RepoDigest = { text: "# Repository digest\n...", tree: "src", included: ["src/a.ts"], omitted: [], estTokens: 10 };
const facts: AuditFacts = {
  languages: ["typescript"], frameworks: [], packageManager: "pnpm",
  commands: { build: "tsc", test: "vitest", lint: null },
  lintTools: ["tsconfig"], hasCI: true, hasTestSuite: true,
  importGraph: { modules: 3, externals: 1, edges: 2, topFanIn: [["src/a.ts", 2]] },
};

function okFetch(text: string): typeof fetch {
  return (async () => ({ ok: true, status: 200, json: async () => ({ content: [{ type: "text", text }] }) })) as unknown as typeof fetch;
}

describe("buildAuditPrompt", () => {
  it("embeds facts, the digest, focus emphasis, and fenced custom instructions", () => {
    const p = buildAuditPrompt({ digest, facts, options: { focus: ["security"], customInstructions: "check checkout flow" } });
    expect(p).toContain("typescript");
    expect(p).toContain("Repository digest");
    expect(p).toContain("security");
    expect(p).toContain("check checkout flow");
  });
  it("empty options produce the same prompt as omitting options", () => {
    expect(buildAuditPrompt({ digest, facts, options: {} })).toBe(buildAuditPrompt({ digest, facts }));
  });
});

describe("auditRepo", () => {
  it("returns the model's markdown verbatim (no JSON parse)", async () => {
    const md = "## 1. High-Level Overview\nA TS monorepo.";
    const out = await auditRepo({ digest, facts }, { apiKey: "k", fetchImpl: okFetch(md) });
    expect(out).toContain("High-Level Overview");
  });
  it("sends focus + instructions in the request body", async () => {
    let sentBody = "";
    const spy = (async (_url: string, init: { body: string }) => { sentBody = init.body; return { ok: true, status: 200, json: async () => ({ content: [{ type: "text", text: "ok" }] }) }; }) as unknown as typeof fetch;
    await auditRepo({ digest, facts, options: { focus: ["performance"], customInstructions: "ignore legacy/" } }, { apiKey: "k", fetchImpl: spy });
    expect(sentBody).toContain("performance");
    expect(sentBody).toContain("ignore legacy/");
  });
  it("throws on an HTTP error", async () => {
    const bad = (async () => ({ ok: false, status: 500, json: async () => ({}) })) as unknown as typeof fetch;
    await expect(auditRepo({ digest, facts }, { apiKey: "k", fetchImpl: bad })).rejects.toThrow();
  });
  it("throws on an empty body", async () => {
    await expect(auditRepo({ digest, facts }, { apiKey: "k", fetchImpl: okFetch("   ") })).rejects.toThrow();
  });
});
