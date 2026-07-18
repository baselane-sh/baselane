import { describe, expect, it } from "vitest";
import { fetchBundle } from "../src/remote.ts";

const BUNDLE = { version: 1, files: { "agents/scout.md": "body" } };

function fake(status: number, body: unknown, log: { url?: string; auth?: string | null } = {}): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    log.url = String(input);
    log.auth = new Headers(init?.headers).get("authorization");
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
}

describe("fetchBundle", () => {
  it("fetches, authenticates, validates, and strips trailing slash", async () => {
    const log: { url?: string; auth?: string | null } = {};
    const bundle = await fetchBundle("https://portal.acme.io/", "org_tok", fake(200, BUNDLE, log));
    expect(bundle.files["agents/scout.md"]).toBe("body");
    expect(log.url).toBe("https://portal.acme.io/api/bundle");
    expect(log.auth).toBe("Bearer org_tok");
  });

  it("throws with status (not token) on non-2xx and rejects invalid bundles", async () => {
    const err = await fetchBundle("https://p.io", "secret_tok", fake(404, { error: "no plan" })).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("404");
    expect((err as Error).message).not.toContain("secret_tok");
    await expect(
      fetchBundle("https://p.io", "t", fake(200, { version: 1, files: { "../evil": "x" } })),
    ).rejects.toThrow(/bundle/);
  });
});
