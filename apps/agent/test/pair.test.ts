import { describe, expect, it } from "vitest";
import { awaitApproval, pollPairing, resolveVerifyUrl, startPairing } from "../src/pair.ts";

function fake(seq: Array<{ status: number; body: unknown }>, log: string[] = []): typeof fetch {
  let i = 0;
  return (async (input: RequestInfo | URL) => {
    log.push(String(input));
    const r = seq[Math.min(i, seq.length - 1)];
    i++;
    return new Response(JSON.stringify(r.body), { status: r.status });
  }) as typeof fetch;
}

describe("resolveVerifyUrl (untrusted server value)", () => {
  it("accepts a same-origin path and strips trailing slash on the base", () => {
    expect(resolveVerifyUrl("https://p.io/", "/app/devices")).toBe("https://p.io/app/devices");
  });
  it("rejects cross-origin, non-http, and metacharacter-laden values → fixed fallback", () => {
    const fb = "https://p.io/app/devices";
    expect(resolveVerifyUrl("https://p.io", "https://evil.example/x")).toBe(fb); // cross-origin absolute
    expect(resolveVerifyUrl("https://p.io", "javascript:alert(1)")).toBe(fb); // not an absolute path
    expect(resolveVerifyUrl("https://p.io", '/app/devices" & calc.exe')).toBe(fb); // shell metachars
    expect(resolveVerifyUrl("https://p.io", "//evil.example/x")).toBe(fb); // protocol-relative
  });
});

describe("pairing client", () => {
  it("starts pairing and strips trailing slash", async () => {
    const log: string[] = [];
    const r = await startPairing("https://p.io/", "MacBook", fake([{ status: 200, body: { userCode: "ABCD-1234", deviceCode: "dc_x", verifyUrl: "/app/devices", pollInterval: 5 } }], log));
    expect(r.userCode).toBe("ABCD-1234");
    expect(log[0]).toBe("https://p.io/api/device/start");
  });

  it("polls once and reports status", async () => {
    expect((await pollPairing("https://p.io", "dc_x", fake([{ status: 200, body: { status: "pending" } }]))).status).toBe("pending");
  });

  it("awaits approval across pending→approved and returns the token", async () => {
    const token = await awaitApproval("https://p.io", "dc_x", {
      fetchImpl: fake([{ status: 200, body: { status: "pending" } }, { status: 200, body: { status: "approved", deviceToken: "devtok_secret" } }]),
      sleep: async () => {}, intervalMs: 1, timeoutMs: 10_000, nowMs: () => 0,
    });
    expect(token).toBe("devtok_secret");
  });

  it("throws on revoked and on timeout, never leaking anything secret", async () => {
    await expect(awaitApproval("https://p.io", "dc_x", { fetchImpl: fake([{ status: 200, body: { status: "revoked" } }]), sleep: async () => {}, intervalMs: 1, timeoutMs: 10_000, nowMs: () => 0 })).rejects.toThrow(/revoked|denied/i);
    let t = 0;
    await expect(awaitApproval("https://p.io", "dc_x", { fetchImpl: fake([{ status: 200, body: { status: "pending" } }]), sleep: async () => {}, intervalMs: 1, timeoutMs: 5, nowMs: () => (t += 10) })).rejects.toThrow(/timed out/i);
  });
});
