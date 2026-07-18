import { gzipSync } from "node:zlib";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runInstall } from "../src/install.ts";
import { runUpdate } from "../src/update.ts";

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

const SHA1 = "1".repeat(40);
const SHA2 = "2".repeat(40);
const SKILL = "---\nname: tdd\ndescription: Test-driven development discipline for every change\n---\n\nBody.\n";
const routesAt = (sha: string) => ({
  "https://api.github.com/repos/o/r/git/ref/tags/v1": () => jsonRes({ object: { sha, type: "commit" } }),
  [`https://codeload.github.com/o/r/tar.gz/${sha}`]: () =>
    new Response(tarball(tarEntry(`r-${sha}/.claude/skills/tdd/SKILL.md`, SKILL)) as BodyInit),
});

describe("runUpdate", () => {
  it("re-resolves a moved tag and reports old→new sha", async () => {
    const dir = await mkdtemp(join(tmpdir(), "blu-"));
    await runInstall({ source: "github:o/r@v1", global: false, dir, dryRun: false, json: false, fetchImpl: fakeFetch(routesAt(SHA1)), log: () => {} });
    const r = await runUpdate({ global: false, dir, dryRun: false, fetchImpl: fakeFetch(routesAt(SHA2)), log: () => {} });
    expect(r.changed).toEqual([{ name: "github:o/r", ref: "v1", oldSha: SHA1, newSha: SHA2 }]);
    const manifest = JSON.parse(await readFile(join(dir, "harness.json"), "utf8"));
    expect(manifest.materialized.resolutions["github:o/r"].sha).toBe(SHA2);
  });

  it("dry-run against a moved tag reports the change without touching the manifest file (#5)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "blu-"));
    await runInstall({ source: "github:o/r@v1", global: false, dir, dryRun: false, json: false, fetchImpl: fakeFetch(routesAt(SHA1)), log: () => {} });
    const before = await readFile(join(dir, "harness.json"), "utf8");
    const r = await runUpdate({ global: false, dir, dryRun: true, fetchImpl: fakeFetch(routesAt(SHA2)), log: () => {} });
    expect(r.changed).toEqual([{ name: "github:o/r", ref: "v1", oldSha: SHA1, newSha: SHA2 }]);
    const after = await readFile(join(dir, "harness.json"), "utf8");
    expect(after).toBe(before); // dry-run must not write
  });

  it("never prints the raw skill-pin control character in log output (M1)", async () => {
    // owner/repo@skill installs (no explicit ref) encode the onlySkill filter behind a control
    // character (encodeSkillPin) — update's log lines must decode it, same as
    // formatInstallReport, or the raw U+0001 byte reaches the terminal.
    const dir = await mkdtemp(join(tmpdir(), "blu-"));
    await runInstall({
      source: "o/r@tdd", global: false, dir, dryRun: false, json: false,
      fetchImpl: fakeFetch({
        ...routesAt(SHA1),
        "https://api.github.com/repos/o/r": () => jsonRes({ default_branch: "v1" }),
      }),
      log: () => {},
    });
    const lines: string[] = [];
    await runUpdate({ global: false, dir, dryRun: false, fetchImpl: fakeFetch(routesAt(SHA2)), log: (l) => lines.push(l) });
    for (const line of lines) {
      expect(line).not.toContain("");
    }
    expect(lines.some((l) => /updated github:o\/r: v1 \(skill: tdd\)/.test(l))).toBe(true);
  });

  it("errors on a missing manifest and on an unknown --name", async () => {
    const dir = await mkdtemp(join(tmpdir(), "blu-"));
    await expect(runUpdate({ global: false, dir, dryRun: false, fetchImpl: fakeFetch({}), log: () => {} })).rejects.toThrow(/run baselane install first/);
    await runInstall({ source: "github:o/r@v1", global: false, dir, dryRun: false, json: false, fetchImpl: fakeFetch(routesAt(SHA1)), log: () => {} });
    await expect(runUpdate({ name: "github:nope/nope", global: false, dir, dryRun: false, fetchImpl: fakeFetch(routesAt(SHA1)), log: () => {} })).rejects.toThrow(/github:o\/r/);
  });
});

describe("runUpdate (registry-pinned packs)", () => {
  const REG_SHA1 = "3".repeat(40);
  const REG_SHA2 = "4".repeat(40);
  const registryRoutes = (versions: Array<{ version: string; sha: string }>) => ({
    "https://registry.baselane.sh/registry/v1/packs/@acme/base": () =>
      jsonRes({
        name: "@acme/base",
        versions: versions.map((v) => ({ version: v.version, source: { name: "github:o/r", ref: "v1", sha: v.sha }, packId: "acme-base", publishedAt: "x" })),
      }),
  });
  const gitRoutesForSha = (sha: string) => ({
    "https://api.github.com/repos/o/r/git/ref/tags/v1": () => jsonRes({ object: { sha, type: "commit" } }),
    [`https://codeload.github.com/o/r/tar.gz/${sha}`]: () =>
      new Response(tarball(tarEntry(`r-${sha}/.claude/skills/tdd/SKILL.md`, SKILL)) as BodyInit),
  });

  it("lifts the registry pin to the latest version when one is newer", async () => {
    const dir = await mkdtemp(join(tmpdir(), "blu-"));
    await runInstall({
      source: "@acme/base@1.0.0", global: false, dir, dryRun: false, json: false,
      fetchImpl: fakeFetch({ ...registryRoutes([{ version: "1.0.0", sha: REG_SHA1 }]), ...gitRoutesForSha(REG_SHA1) }),
      log: () => {},
    });
    const r = await runUpdate({
      global: false, dir, dryRun: false,
      fetchImpl: fakeFetch({ ...registryRoutes([{ version: "2.0.0", sha: REG_SHA2 }, { version: "1.0.0", sha: REG_SHA1 }]), ...gitRoutesForSha(REG_SHA2) }),
      log: () => {},
    });
    expect(r.changed).toEqual([{ name: "@acme/base", ref: "2.0.0", oldSha: REG_SHA1, newSha: REG_SHA2 }]);
    const manifest = JSON.parse(await readFile(join(dir, "harness.json"), "utf8"));
    expect(manifest.packs["@acme/base"]).toBe("2.0.0");
  });

  it("a registry blip on the update-availability check is a per-pack warning, not a crash — " +
     "the pack still installs at its current pin once the (unrelated) materialization fetch succeeds", async () => {
    const dir = await mkdtemp(join(tmpdir(), "blu-"));
    await runInstall({
      source: "@acme/base@1.0.0", global: false, dir, dryRun: false, json: false,
      fetchImpl: fakeFetch({ ...registryRoutes([{ version: "1.0.0", sha: REG_SHA1 }]), ...gitRoutesForSha(REG_SHA1) }),
      log: () => {},
    });
    // Simulate a transient registry failure: the FIRST hit to the registry route (the
    // update-availability check) 500s; every later hit (materialization re-resolving the
    // still-1.0.0 pin) succeeds normally.
    let registryHits = 0;
    const flaky: typeof fetch = (async (input, init) => {
      const url = String(input);
      if (url.startsWith("https://registry.baselane.sh/registry/v1/packs/@acme/base")) {
        registryHits++;
        if (registryHits === 1) return new Response("boom", { status: 500 });
      }
      return fakeFetch({ ...registryRoutes([{ version: "1.0.0", sha: REG_SHA1 }]), ...gitRoutesForSha(REG_SHA1) })(input, init);
    }) as typeof fetch;
    const r = await runUpdate({ global: false, dir, dryRun: false, fetchImpl: flaky, log: () => {} });
    expect(r.skippedRegistry).toEqual(["@acme/base"]);
    const manifest = JSON.parse(await readFile(join(dir, "harness.json"), "utf8"));
    expect(manifest.packs["@acme/base"]).toBe("1.0.0"); // left pinned, install still succeeded
  });
});
