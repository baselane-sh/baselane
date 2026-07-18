import { describe, expect, it } from "vitest";
import { reportAdoption } from "../src/report.ts";

const record = { repo: "acme/web", packId: "test-loop", version: "1.0.0", prUrl: "https://github.com/acme/web/pull/9" };

describe("reportAdoption", () => {
  it("posts the record with bearer auth and proposed status", async () => {
    let captured: { url: string; auth: string | null; body: unknown } | null = null;
    const fake = (async (input: RequestInfo | URL, init?: RequestInit) => {
      captured = {
        url: String(input),
        auth: new Headers(init?.headers).get("authorization"),
        body: JSON.parse(String(init?.body)),
      };
      return new Response(null, { status: 204 });
    }) as typeof fetch;
    await reportAdoption("https://portal.acme.io", "ptok", record, fake);
    expect(captured).toEqual({
      url: "https://portal.acme.io/api/adoption",
      auth: "Bearer ptok",
      body: { ...record, status: "proposed" },
    });
  });

  it("strips a trailing slash and throws on non-2xx", async () => {
    const fake401 = (async (input: RequestInfo | URL) => {
      expect(String(input)).toBe("https://portal.acme.io/api/adoption");
      return new Response(null, { status: 401 });
    }) as typeof fetch;
    await expect(reportAdoption("https://portal.acme.io/", "bad", record, fake401)).rejects.toThrow(/401/);
  });
});
