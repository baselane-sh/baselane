import { gzipSync } from "node:zlib";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runInstall } from "../src/install.ts";

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

const SHA = "f".repeat(40);
const SKILL = "---\nname: tdd\ndescription: Test-driven development discipline for every change\n---\n\nBody.\n";
const routes = {
  "https://api.github.com/repos/o/r/git/ref/tags/v1.0.0": () => jsonRes({ object: { sha: SHA, type: "commit" } }),
  [`https://codeload.github.com/o/r/tar.gz/${SHA}`]: () =>
    new Response(
      tarball(tarEntry(`r-${SHA}/.claude/skills/tdd/SKILL.md`, SKILL), tarEntry(`r-${SHA}/AGENTS.md`, "# pack agents\n")) as BodyInit,
    ),
};

describe("runInstall (repo mode)", () => {
  it("installs a git source end-to-end: files, merged entry file, manifest+receipt", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bli-"));
    await writeFile(join(dir, "AGENTS.md"), "# Human intro\n", "utf8");
    const r = await runInstall({
      source: "github:o/r@v1.0.0", global: false, dir, dryRun: false, json: false,
      fetchImpl: fakeFetch(routes), log: () => {},
    });
    const manifest = JSON.parse(await readFile(join(dir, "harness.json"), "utf8"));
    expect(manifest.packs).toEqual({ "github:o/r": "v1.0.0" });
    expect(manifest.materialized.resolutions["github:o/r"].sha).toBe(SHA);
    expect(manifest.materialized.vendored.every((v: { sha256: string | null }) => typeof v.sha256 === "string")).toBe(true);
    const agents = await readFile(join(dir, "AGENTS.md"), "utf8");
    expect(agents).toContain("# Human intro"); // user content preserved
    expect(r.writes.length).toBeGreaterThan(0);
    // idempotence: reinstall = no writes
    const again = await runInstall({ global: false, dir, dryRun: false, json: false, fetchImpl: fakeFetch(routes), log: () => {} });
    expect(again.writes).toEqual([]);
  });

  it("dry-run writes NOTHING", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bli-"));
    const r = await runInstall({
      source: "github:o/r@v1.0.0", global: false, dir, dryRun: true, json: false,
      fetchImpl: fakeFetch(routes), log: () => {},
    });
    expect(r.dryRun).toBe(true);
    expect(r.writes.length).toBeGreaterThan(0);
    await expect(readFile(join(dir, "harness.json"), "utf8")).rejects.toThrow();
  });

  it("resolution failure ⇒ zero disk writes (all-or-nothing)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bli-"));
    await expect(
      runInstall({ source: "github:o/r@vNOPE", global: false, dir, dryRun: false, json: false, fetchImpl: fakeFetch({}), log: () => {} }),
    ).rejects.toThrow(/git-source/);
    await expect(readFile(join(dir, "harness.json"), "utf8")).rejects.toThrow();
  });

  it("removal story: dropping the pack from the manifest and reinstalling deletes vendored files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bli-"));
    await runInstall({ source: "github:o/r@v1.0.0", global: false, dir, dryRun: false, json: false, fetchImpl: fakeFetch(routes), log: () => {} });
    const skillPath = join(dir, ".claude/skills/tdd/SKILL.md");
    // hand-edit the vendored file before removal — the edit must not be silently lost (finding 4)
    await writeFile(skillPath, "HAND EDITED SKILL CONTENT", "utf8");
    const mPath = join(dir, "harness.json");
    const m = JSON.parse(await readFile(mPath, "utf8"));
    m.packs = {};
    await writeFile(mPath, JSON.stringify(m, null, 2) + "\n", "utf8");
    const r = await runInstall({ global: false, dir, dryRun: false, json: false, fetchImpl: fakeFetch(routes), log: () => {} });
    expect(r.deletes.length).toBeGreaterThan(0);
    await expect(readFile(skillPath, "utf8")).rejects.toThrow();
    expect(await readFile(`${skillPath}.baselane-bak`, "utf8")).toBe("HAND EDITED SKILL CONTENT");
    // the drifted file was backed up as part of a DELETE, not a write — the report must still name it (#14)
    expect(r.driftedBackedUp).toContain(".claude/skills/tdd/SKILL.md");
  });

  it("migrates a legacy .baselane/harness.json to the root harness.json on install", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bli-"));
    const legacyManifest = {
      version: 1, registry: null, target: { kind: "repo", id: "checkout" },
      packs: { "github:o/r": "v1.0.0" },
      capabilities: {},
      materialized: { vendored: [], managedRegions: [], derivedCommitted: [], resolutions: {} },
    };
    await mkdir(join(dir, ".baselane"), { recursive: true });
    await writeFile(join(dir, ".baselane/harness.json"), JSON.stringify(legacyManifest, null, 2) + "\n", "utf8");
    const r = await runInstall({ global: false, dir, dryRun: false, json: false, fetchImpl: fakeFetch(routes), log: () => {} });
    expect(r.writes.length).toBeGreaterThan(0);
    const rootManifest = JSON.parse(await readFile(join(dir, "harness.json"), "utf8"));
    expect(rootManifest.packs).toEqual({ "github:o/r": "v1.0.0" });
    await expect(readFile(join(dir, ".baselane/harness.json"), "utf8")).rejects.toThrow();
  });
});

describe("runInstall (machine mode)", () => {
  it("targets homeDir-based paths and never writes settings.json into the receipt", async () => {
    const home = await mkdtemp(join(tmpdir(), "blh-"));
    const r = await runInstall({
      source: "github:o/r@v1.0.0", global: true, homeDir: home, dryRun: false, json: false,
      fetchImpl: fakeFetch(routes), log: () => {},
    });
    expect(r.manifestPath).toBe(join(home, ".baselane/harness.json"));
    const manifest = JSON.parse(await readFile(join(home, ".baselane/harness.json"), "utf8"));
    expect(manifest.target.kind).toBe("machine");
    expect(manifest.materialized.vendored.map((v: { path: string }) => v.path)).not.toContain("settings.json");
  });
});

describe("runInstall (registry-scoped)", () => {
  const REG_SHA = "d".repeat(40);
  const registryRoutes = (base: string, versions: string[]) => ({
    [`${base}/registry/v1/packs/@acme/base`]: () =>
      jsonRes({
        name: "@acme/base",
        versions: versions.map((version) => ({
          version, source: { name: "github:o/r", ref: "v1", sha: REG_SHA }, packId: "acme-base", publishedAt: "2026-07-17T00:00:00.000Z",
        })),
      }),
  });
  const gitRoutes = {
    "https://api.github.com/repos/o/r/git/ref/tags/v1": () => jsonRes({ object: { sha: REG_SHA, type: "commit" } }),
    [`https://codeload.github.com/o/r/tar.gz/${REG_SHA}`]: () =>
      new Response(tarball(tarEntry(`r-${REG_SHA}/.claude/skills/tdd/SKILL.md`, SKILL)) as BodyInit),
  };

  it("installs an exact-pinned @scope/name@version from the registry", async () => {
    const dir = await mkdtemp(join(tmpdir(), "blr-"));
    const r = await runInstall({
      source: "@acme/base@1.0.0", global: false, dir, dryRun: false, json: false,
      fetchImpl: fakeFetch({ ...registryRoutes("https://registry.baselane.sh", ["2.0.0", "1.0.0"]), ...gitRoutes }),
      log: () => {},
    });
    const manifest = JSON.parse(await readFile(join(dir, "harness.json"), "utf8"));
    expect(manifest.packs).toEqual({ "@acme/base": "1.0.0" });
    expect(r.writes.length).toBeGreaterThan(0);
  });

  it("bare @scope/name (no version) resolves+pins the latest EXACT version", async () => {
    const dir = await mkdtemp(join(tmpdir(), "blr-"));
    await runInstall({
      source: "@acme/base", global: false, dir, dryRun: false, json: false,
      fetchImpl: fakeFetch({ ...registryRoutes("https://registry.baselane.sh", ["2.0.0", "1.0.0"]), ...gitRoutes }),
      log: () => {},
    });
    const manifest = JSON.parse(await readFile(join(dir, "harness.json"), "utf8"));
    expect(manifest.packs).toEqual({ "@acme/base": "2.0.0" }); // pinned exact, not left bare
  });

  it("registryBase precedence: manifest.registry beats opts.registryBase beats the default", async () => {
    const dir = await mkdtemp(join(tmpdir(), "blr-"));
    await runInstall({
      source: "@acme/base@1.0.0", global: false, dir, dryRun: false, json: false,
      registryBase: "https://env.example",
      fetchImpl: fakeFetch({ ...registryRoutes("https://env.example", ["1.0.0"]), ...gitRoutes }),
      log: () => {},
    });
    const manifest = JSON.parse(await readFile(join(dir, "harness.json"), "utf8"));
    expect(manifest.packs).toEqual({ "@acme/base": "1.0.0" });
  });

  it("sha tamper mismatch names both shas and installs nothing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "blr-"));
    const wrongSha = "9".repeat(40);
    await expect(
      runInstall({
        source: "@acme/base@1.0.0", global: false, dir, dryRun: false, json: false,
        fetchImpl: fakeFetch({
          ...registryRoutes("https://registry.baselane.sh", ["1.0.0"]),
          "https://api.github.com/repos/o/r/git/ref/tags/v1": () => jsonRes({ object: { sha: wrongSha, type: "commit" } }),
          [`https://codeload.github.com/o/r/tar.gz/${wrongSha}`]: () =>
            new Response(tarball(tarEntry(`r-${wrongSha}/.claude/skills/tdd/SKILL.md`, SKILL)) as BodyInit),
        }),
        log: () => {},
      }),
    ).rejects.toThrow(new RegExp(`${REG_SHA}.*${wrongSha}`, "s"));
    await expect(readFile(join(dir, "harness.json"), "utf8")).rejects.toThrow();
  });

  it("unknown pack/version errors clearly", async () => {
    const dir = await mkdtemp(join(tmpdir(), "blr-"));
    await expect(
      runInstall({ source: "@acme/missing@1.0.0", global: false, dir, dryRun: false, json: false, fetchImpl: fakeFetch({}), log: () => {} }),
    ).rejects.toThrow(/not found/);
    await expect(
      runInstall({
        source: "@acme/base@9.9.9", global: false, dir, dryRun: false, json: false,
        fetchImpl: fakeFetch({ ...registryRoutes("https://registry.baselane.sh", ["1.0.0"]) }),
        log: () => {},
      }),
    ).rejects.toThrow(/9\.9\.9/);
  });
});

describe("runInstall (owner/repo@skill shorthand)", () => {
  const SHA2 = "5".repeat(40);
  const OTHER_SKILL = "---\nname: other\ndescription: A second skill, to prove the shorthand filters to just one.\n---\n\nBody.\n";
  const skillRoutes = {
    // NB: fakeFetch matches by url.startsWith(prefix) in insertion order — the bare repo-lookup
    // route (for default_branch) must come LAST, or it would swallow the longer /git/ref/... URLs.
    "https://api.github.com/repos/vercel-labs/agent-skills/git/ref/tags/main": () => new Response("x", { status: 404 }),
    "https://api.github.com/repos/vercel-labs/agent-skills/git/ref/heads/main": () => jsonRes({ object: { sha: SHA2, type: "commit" } }),
    [`https://codeload.github.com/vercel-labs/agent-skills/tar.gz/${SHA2}`]: () =>
      new Response(tarball(
        tarEntry(`agent-skills-${SHA2}/.claude/skills/web-design/SKILL.md`, "---\nname: web-design\ndescription: Design guidance for web UIs, covering layout and color.\n---\n\nBody.\n"),
        tarEntry(`agent-skills-${SHA2}/.claude/skills/other/SKILL.md`, OTHER_SKILL),
      ) as BodyInit),
    "https://api.github.com/repos/vercel-labs/agent-skills": () => jsonRes({ default_branch: "main" }),
  };

  it("owner/repo@skill installs a single-skill pack from the repo's default branch", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bls-"));
    const r = await runInstall({
      source: "vercel-labs/agent-skills@web-design", global: false, dir, dryRun: false, json: false,
      fetchImpl: fakeFetch(skillRoutes), log: () => {},
    });
    const manifest = JSON.parse(await readFile(join(dir, "harness.json"), "utf8"));
    expect(Object.keys(manifest.packs)).toEqual(["github:vercel-labs/agent-skills"]);
    await expect(readFile(join(dir, ".claude/skills/web-design/SKILL.md"), "utf8")).resolves.toContain("web-design");
    await expect(readFile(join(dir, ".claude/skills/other/SKILL.md"), "utf8")).rejects.toThrow();
    expect(r.writes.length).toBeGreaterThan(0);
  });

  it("bare owner/repo with no @ is rejected as ambiguous", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bls-"));
    await expect(
      runInstall({ source: "vercel-labs/agent-skills", global: false, dir, dryRun: false, json: false, fetchImpl: fakeFetch({}), log: () => {} }),
    ).rejects.toThrow(/ambiguous/);
  });
});
