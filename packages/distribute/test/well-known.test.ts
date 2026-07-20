import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { assertPublicHttpsUrl, isBlockedAddress, resolveWellKnownSource, type DnsLookup } from "../src/well-known.ts";

const sha = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");
const publicDns: DnsLookup = async () => ({ address: "93.184.216.34" });

/** Build a fetch stub from a path→{status,body} map. Unlisted URLs 404. */
function stubFetch(routes: Record<string, { status?: number; body: string }>): typeof fetch {
  return (async (url: string) => {
    const r = routes[url];
    if (!r) return { ok: false, status: 404, async text() { return ""; } };
    const status = r.status ?? 200;
    return { ok: status >= 200 && status < 300, status, async text() { return r.body; } };
  }) as unknown as typeof fetch;
}

const SKILL_BODY = "---\nname: pay-with-stripe\ndescription: How to take payments\n---\n\nUse the API.\n";

describe("isBlockedAddress", () => {
  it("blocks private/loopback/link-local/metadata, allows public", () => {
    for (const ip of ["10.1.2.3", "127.0.0.1", "169.254.169.254", "192.168.0.5", "172.16.0.1", "100.64.0.1", "0.0.0.0", "::1", "fe80::1", "fd00::1", "::ffff:127.0.0.1"]) {
      expect(isBlockedAddress(ip), ip).toBe(true);
    }
    for (const ip of ["93.184.216.34", "8.8.8.8", "172.15.0.1", "2606:2800:220:1::1"]) {
      expect(isBlockedAddress(ip), ip).toBe(false);
    }
  });
});

describe("assertPublicHttpsUrl", () => {
  it("rejects non-https and blocked hosts, accepts public https", async () => {
    await expect(assertPublicHttpsUrl("http://x.com", publicDns)).rejects.toThrow(/must be https/);
    await expect(assertPublicHttpsUrl("https://internal", async () => ({ address: "10.0.0.1" }))).rejects.toThrow(/blocked\/internal/);
    await expect(assertPublicHttpsUrl("https://x.com", publicDns)).resolves.toBeInstanceOf(URL);
  });
});

describe("resolveWellKnownSource", () => {
  const origin = "https://docs.stripe.com";
  const v2Index = (digest: string) =>
    JSON.stringify({
      $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
      skills: [{ name: "Pay with Stripe", type: "skill-md", description: "d", url: `${origin}/skill.md`, digest }],
    });

  it("resolves a v0.2.0 index with a matching digest into a fileset + index sha", async () => {
    const index = v2Index(sha(SKILL_BODY));
    const fetchImpl = stubFetch({
      [`${origin}/.well-known/agent-skills/index.json`]: { body: index },
      [`${origin}/skill.md`]: { body: SKILL_BODY },
    });
    const r = await resolveWellKnownSource({ url: origin, fetchImpl, lookupImpl: publicDns });
    expect(r.indexSha).toBe(sha(index));
    expect(Object.keys(r.files)).toEqual(["skills/pay-with-stripe/SKILL.md"]);
    expect(r.files["skills/pay-with-stripe/SKILL.md"]).toBe(SKILL_BODY);
  });

  it("throws when an artifact digest does not match", async () => {
    const fetchImpl = stubFetch({
      [`${origin}/.well-known/agent-skills/index.json`]: { body: v2Index("deadbeef") },
      [`${origin}/skill.md`]: { body: SKILL_BODY },
    });
    await expect(resolveWellKnownSource({ url: origin, fetchImpl, lookupImpl: publicDns })).rejects.toThrow(/integrity check failed/);
  });

  it("throws when the index sha does not match a supplied pin", async () => {
    const index = v2Index(sha(SKILL_BODY));
    const fetchImpl = stubFetch({
      [`${origin}/.well-known/agent-skills/index.json`]: { body: index },
      [`${origin}/skill.md`]: { body: SKILL_BODY },
    });
    await expect(resolveWellKnownSource({ url: origin, pin: "wrongsha", fetchImpl, lookupImpl: publicDns })).rejects.toThrow(/integrity check failed|docs changed/);
  });

  it("falls back to the legacy /.well-known/skills path for the index location", async () => {
    const index = v2Index(sha(SKILL_BODY));
    const fetchImpl = stubFetch({
      // agent-skills path 404s; legacy skills path serves the (still v0.2.0) index.
      [`${origin}/.well-known/skills/index.json`]: { body: index },
      [`${origin}/skill.md`]: { body: SKILL_BODY },
    });
    const r = await resolveWellKnownSource({ url: origin, fetchImpl, lookupImpl: publicDns });
    expect(r.indexSha).toBe(sha(index));
  });

  it("throws when no manifest exists", async () => {
    await expect(resolveWellKnownSource({ url: origin, fetchImpl: stubFetch({}), lookupImpl: publicDns })).rejects.toThrow(/no well-known agent-skills manifest/);
  });

  it("rejects an unrecognized $schema", async () => {
    const fetchImpl = stubFetch({
      [`${origin}/.well-known/agent-skills/index.json`]: { body: JSON.stringify({ $schema: "https://example.com/v9", skills: [] }) },
    });
    await expect(resolveWellKnownSource({ url: origin, fetchImpl, lookupImpl: publicDns })).rejects.toThrow(/unrecognized \$schema/);
  });

  it("rejects a legacy index that carries no digests", async () => {
    const fetchImpl = stubFetch({
      [`${origin}/.well-known/agent-skills/index.json`]: { body: JSON.stringify({ skills: [{ name: "x", description: "d", files: ["SKILL.md"] }] }) },
    });
    await expect(resolveWellKnownSource({ url: origin, fetchImpl, lookupImpl: publicDns })).rejects.toThrow(/legacy index without per-artifact digests/);
  });
});
