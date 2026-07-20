import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { validateManifest } from "@baselane/packs";
import { DEFAULT_REGISTRY, encodeSkillPin, fetchRegistryVersions, resolveManifestPacks } from "../src/resolve-packs.ts";

/** Minimal ustar entry builder: 512-byte header + content padded to 512.
 * Copied verbatim from packages/distribute/test/git-source.test.ts (tests may not import tests). */
function tarEntry(name: string, content: string, typeflag = "0"): Buffer {
  const header = Buffer.alloc(512);
  header.write(name, 0, 100, "utf8");                       // name
  header.write("0000644\0", 100, 8, "utf8");                // mode
  header.write("0000000\0", 108, 8, "utf8");                // uid
  header.write("0000000\0", 116, 8, "utf8");                // gid
  const size = Buffer.byteLength(content, "utf8");
  header.write(size.toString(8).padStart(11, "0") + "\0", 124, 12, "utf8"); // size
  header.write("00000000000\0", 136, 12, "utf8");           // mtime
  header.write("        ", 148, 8, "utf8");                 // checksum placeholder (spaces)
  header.write(typeflag, 156, 1, "utf8");                   // typeflag
  header.write("ustar\0", 257, 6, "utf8");                  // magic
  header.write("00", 263, 2, "utf8");                       // version
  let sum = 0;
  for (const b of header) sum += b;
  header.write(sum.toString(8).padStart(6, "0") + "\0 ", 148, 8, "utf8");
  const body = Buffer.alloc(Math.ceil(size / 512) * 512);
  body.write(content, 0, "utf8");
  return Buffer.concat([header, body]);
}

function tarball(...entries: Buffer[]): Uint8Array {
  return gzipSync(Buffer.concat([...entries, Buffer.alloc(1024)])); // 2 zero blocks = EOF
}

function jsonRes(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

function fakeFetch(routes: Record<string, (url: string) => Response | Promise<Response>>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    for (const [prefix, handler] of Object.entries(routes)) {
      if (url.startsWith(prefix)) return handler(url);
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
}

const SHA = "e".repeat(40);
const SKILL = "---\nname: tdd\ndescription: Test-driven development discipline for every change\n---\n\nBody.\n";

describe("resolveManifestPacks", () => {
  it("resolves git-ref packs (ingest fallback) with resolutions + derived note", async () => {
    const manifest = validateManifest({ version: 1, target: { kind: "repo", id: "r" }, packs: { "github:o/r": "main" } });
    const r = await resolveManifestPacks(manifest, {
      fetchImpl: fakeFetch({
        "https://api.github.com/repos/o/r/git/ref/tags/main": () => new Response("x", { status: 404 }),
        "https://api.github.com/repos/o/r/git/ref/heads/main": () => jsonRes({ object: { sha: SHA, type: "commit" } }),
        [`https://codeload.github.com/o/r/tar.gz/${SHA}`]: () =>
          new Response(tarball(tarEntry(`r-${SHA}/.claude/skills/tdd/SKILL.md`, SKILL)) as BodyInit),
      }),
    });
    expect(Object.keys(r.packs)).toEqual(["github:o/r"]);
    expect(r.resolutions["github:o/r"]).toEqual({ ref: "main", sha: SHA, packId: r.packs["github:o/r"].id });
    expect(r.notes.some((n) => /derived pack/.test(n))).toBe(true);
  });

  it("resolves a skill-shorthand pin (encodeSkillPin) to a single-skill pack via onlySkill", async () => {
    const OTHER = "---\nname: other\ndescription: A second skill in the same repo, to prove filtering works.\n---\n\nBody.\n";
    const manifest = validateManifest({ version: 1, target: { kind: "repo", id: "r" }, packs: { "github:o/r": encodeSkillPin("main", "tdd") } });
    const r = await resolveManifestPacks(manifest, {
      fetchImpl: fakeFetch({
        "https://api.github.com/repos/o/r/git/ref/tags/main": () => new Response("x", { status: 404 }),
        "https://api.github.com/repos/o/r/git/ref/heads/main": () => jsonRes({ object: { sha: SHA, type: "commit" } }),
        [`https://codeload.github.com/o/r/tar.gz/${SHA}`]: () =>
          new Response(tarball(
            tarEntry(`r-${SHA}/.claude/skills/tdd/SKILL.md`, SKILL),
            tarEntry(`r-${SHA}/.claude/skills/other/SKILL.md`, OTHER),
          ) as BodyInit),
      }),
    });
    const skills = r.packs["github:o/r"].skills ?? [];
    expect(skills.map((s) => s.name)).toEqual(["tdd"]);
  });

  it("resolves a docs: well-known pin into a validated pack and re-verifies the index sha", async () => {
    const { createHash } = await import("node:crypto");
    const digest = createHash("sha256").update(SKILL, "utf8").digest("hex");
    const index = JSON.stringify({
      $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
      skills: [{ name: "tdd", type: "skill-md", description: "d", url: "https://docs.acme.dev/tdd.md", digest }],
    });
    const indexSha = createHash("sha256").update(index, "utf8").digest("hex");
    const routes = {
      "https://docs.acme.dev/.well-known/agent-skills/index.json": () => new Response(index),
      "https://docs.acme.dev/tdd.md": () => new Response(SKILL),
    };
    const lookupImpl = async () => ({ address: "93.184.216.34" });
    // pin = the index sha (what runInstall would have written)
    const manifest = validateManifest({ version: 1, target: { kind: "repo", id: "r" }, packs: { "docs:https://docs.acme.dev": indexSha } });
    const r = await resolveManifestPacks(manifest, { fetchImpl: fakeFetch(routes), lookupImpl });
    const pack = r.packs["docs:https://docs.acme.dev"];
    expect((pack.skills ?? []).map((s) => s.name)).toEqual(["tdd"]);
    expect(r.resolutions["docs:https://docs.acme.dev"].sha).toBe(indexSha);

    // A stale pin (upstream changed) must hard-fail, not resolve silently.
    const stale = validateManifest({ version: 1, target: { kind: "repo", id: "r" }, packs: { "docs:https://docs.acme.dev": "f".repeat(64) } });
    await expect(resolveManifestPacks(stale, { fetchImpl: fakeFetch(routes), lookupImpl })).rejects.toThrow(/integrity check failed|docs changed/);
  });
});

describe("resolveManifestPacks — registry-scoped names", () => {
  const REG_SHA = "b".repeat(40);
  const registryRoutes = (versions: Array<{ version: string; sha: string }>) => ({
    [`${DEFAULT_REGISTRY}/registry/v1/packs/@acme/base`]: () =>
      jsonRes({
        name: "@acme/base",
        versions: versions.map((v) => ({
          version: v.version,
          source: { name: "github:o/r", ref: "v1", sha: v.sha },
          packId: "acme-base",
          publishedAt: "2026-07-17T00:00:00.000Z",
        })),
      }),
  });
  const gitRoutes = (sha: string) => ({
    "https://api.github.com/repos/o/r/git/ref/tags/v1": () => jsonRes({ object: { sha, type: "commit" } }),
    [`https://codeload.github.com/o/r/tar.gz/${sha}`]: () =>
      new Response(tarball(tarEntry(`r-${sha}/.claude/skills/tdd/SKILL.md`, SKILL)) as BodyInit),
  });

  it("resolves an exact-pinned @scope/name through the registry, verifying sha", async () => {
    const manifest = validateManifest({ version: 1, target: { kind: "repo", id: "r" }, packs: { "@acme/base": "1.0.0" } });
    const r = await resolveManifestPacks(manifest, {
      fetchImpl: fakeFetch({ ...registryRoutes([{ version: "1.0.0", sha: REG_SHA }]), ...gitRoutes(REG_SHA) }),
    });
    expect(r.packs["@acme/base"]).toBeDefined();
    expect(r.resolutions["@acme/base"]).toEqual({ ref: "1.0.0", sha: REG_SHA, packId: r.packs["@acme/base"].id });
  });

  it("uses manifest.registry over the default registry base", async () => {
    const manifest = validateManifest({ version: 1, registry: "https://custom.example", target: { kind: "repo", id: "r" }, packs: { "@acme/base": "1.0.0" } });
    const r = await resolveManifestPacks(manifest, {
      fetchImpl: fakeFetch({
        "https://custom.example/registry/v1/packs/@acme/base": () =>
          jsonRes({ name: "@acme/base", versions: [{ version: "1.0.0", source: { name: "github:o/r", ref: "v1", sha: REG_SHA }, packId: "acme-base", publishedAt: "2026-07-17T00:00:00.000Z" }] }),
        ...gitRoutes(REG_SHA),
      }),
    });
    expect(r.packs["@acme/base"]).toBeDefined();
  });

  it("uses opts.registryBase (env) when manifest.registry is unset", async () => {
    const manifest = validateManifest({ version: 1, target: { kind: "repo", id: "r" }, packs: { "@acme/base": "1.0.0" } });
    const r = await resolveManifestPacks(manifest, {
      registryBase: "https://env.example",
      fetchImpl: fakeFetch({
        "https://env.example/registry/v1/packs/@acme/base": () =>
          jsonRes({ name: "@acme/base", versions: [{ version: "1.0.0", source: { name: "github:o/r", ref: "v1", sha: REG_SHA }, packId: "acme-base", publishedAt: "2026-07-17T00:00:00.000Z" }] }),
        ...gitRoutes(REG_SHA),
      }),
    });
    expect(r.packs["@acme/base"]).toBeDefined();
  });

  it("errors clearly on an unknown pack (404)", async () => {
    const manifest = validateManifest({ version: 1, target: { kind: "repo", id: "r" }, packs: { "@acme/base": "1.0.0" } });
    await expect(resolveManifestPacks(manifest, { fetchImpl: fakeFetch({}) })).rejects.toThrow(/not found/);
  });

  it("errors clearly on an unknown version, naming the available ones", async () => {
    const manifest = validateManifest({ version: 1, target: { kind: "repo", id: "r" }, packs: { "@acme/base": "9.9.9" } });
    await expect(
      resolveManifestPacks(manifest, { fetchImpl: fakeFetch({ ...registryRoutes([{ version: "1.0.0", sha: REG_SHA }]) }) }),
    ).rejects.toThrow(/9\.9\.9.*1\.0\.0/s);
  });

  it("hard-errors on a sha mismatch between the index and what the ref currently resolves to (tamper evidence)", async () => {
    const manifest = validateManifest({ version: 1, target: { kind: "repo", id: "r" }, packs: { "@acme/base": "1.0.0" } });
    const currentSha = "c".repeat(40);
    await expect(
      resolveManifestPacks(manifest, {
        fetchImpl: fakeFetch({ ...registryRoutes([{ version: "1.0.0", sha: REG_SHA }]), ...gitRoutes(currentSha) }),
      }),
    ).rejects.toThrow(new RegExp(`${REG_SHA}.*${currentSha}`, "s"));
  });
});

describe("fetchRegistryVersions", () => {
  it("returns the versions list from the registry", async () => {
    const versions = await fetchRegistryVersions("@acme/base", "https://registry.example", {
      fetchImpl: fakeFetch({
        "https://registry.example/registry/v1/packs/@acme/base": () =>
          jsonRes({ name: "@acme/base", versions: [{ version: "2.0.0", source: { name: "github:o/r", ref: "v2", sha: SHA }, packId: "acme-base", publishedAt: "x" }] }),
      }),
    });
    expect(versions).toEqual([{ version: "2.0.0", source: { name: "github:o/r", ref: "v2", sha: SHA }, packId: "acme-base", publishedAt: "x" }]);
  });

  it("throws on 404", async () => {
    await expect(
      fetchRegistryVersions("@acme/missing", "https://registry.example", { fetchImpl: fakeFetch({}) }),
    ).rejects.toThrow(/not found/);
  });

  it("drops a malformed entry (garbage version) instead of trusting it, with a notice (I3)", async () => {
    const notices: string[] = [];
    const versions = await fetchRegistryVersions("@acme/base", "https://registry.example", {
      onNotice: (m) => notices.push(m),
      fetchImpl: fakeFetch({
        "https://registry.example/registry/v1/packs/@acme/base": () =>
          jsonRes({
            name: "@acme/base",
            versions: [
              { version: "1.0.0\nrm -rf", source: { name: "github:o/r", ref: "v1", sha: SHA }, packId: "acme-base", publishedAt: "x" },
              { version: "1.0.0", source: { name: "github:o/r", ref: "v1", sha: SHA }, packId: "acme-base", publishedAt: "x" },
            ],
          }),
      }),
    });
    expect(versions).toEqual([{ version: "1.0.0", source: { name: "github:o/r", ref: "v1", sha: SHA }, packId: "acme-base", publishedAt: "x" }]);
    expect(notices.some((n) => /dropped 1 malformed/.test(n))).toBe(true);
  });

  it("sorts a server response by local semver-desc regardless of the order it arrived in (I3)", async () => {
    const versions = await fetchRegistryVersions("@acme/base", "https://registry.example", {
      fetchImpl: fakeFetch({
        "https://registry.example/registry/v1/packs/@acme/base": () =>
          jsonRes({
            name: "@acme/base",
            versions: [
              // Deliberately out of order and with an older version first — a hostile or buggy
              // registry could otherwise trick a bare "latest" install into pinning it.
              { version: "1.9.0", source: { name: "github:o/r", ref: "v1.9.0", sha: SHA }, packId: "acme-base", publishedAt: "x" },
              { version: "1.10.0", source: { name: "github:o/r", ref: "v1.10.0", sha: SHA }, packId: "acme-base", publishedAt: "x" },
            ],
          }),
      }),
    });
    expect(versions.map((v) => v.version)).toEqual(["1.10.0", "1.9.0"]);
  });
});

describe("resolveManifestPacks with inlinePacks", () => {
  it("uses an inline body for a registry-scoped name (re-validated), no network", async () => {
    const { loadBuiltinPack, listBuiltinPacks, validateManifest } = await import("@baselane/packs");
    const pack = await loadBuiltinPack((await listBuiltinPacks())[0]);
    const manifest = validateManifest({ version: 1, target: { kind: "machine", id: "m" }, packs: { [pack.id]: pack.version } });
    let fetched = 0;
    const r = await resolveManifestPacks(manifest, {
      fetchImpl: (async () => { fetched++; return new Response("x", { status: 500 }); }) as typeof fetch,
      inlinePacks: { [pack.id]: pack },
    });
    expect(fetched).toBe(0);
    expect(r.packs[pack.id].id).toBe(pack.id);
    expect(r.resolutions).toEqual({});
  });

  it("rejects an invalid inline body through validatePack", async () => {
    const { validateManifest } = await import("@baselane/packs");
    const manifest = validateManifest({ version: 1, target: { kind: "machine", id: "m" }, packs: { bad: "1.0.0" } });
    await expect(
      resolveManifestPacks(manifest, { inlinePacks: { bad: { id: 42 } as never } }),
    ).rejects.toThrow();
  });

  it("still hits the registry for a registry name with no inline body", async () => {
    const { validateManifest } = await import("@baselane/packs");
    const manifest = validateManifest({ version: 1, target: { kind: "machine", id: "m" }, packs: { "@acme/base": "1.0.0" } });
    await expect(resolveManifestPacks(manifest, { inlinePacks: {}, fetchImpl: fakeFetch({}) })).rejects.toThrow(/not found/);
  });
});
