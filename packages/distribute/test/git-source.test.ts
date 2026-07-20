import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  isGitSourceName, parseGitInstallArg, parseGitSourceName, parseInstallRef,
  resolveDefaultBranch, resolveGitSource,
} from "../src/git-source.ts";

/** Minimal ustar entry builder: 512-byte header + content padded to 512.
 * Copied verbatim from test/tar.test.ts (tests may not import tests). */
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

const SHA = "a".repeat(40);

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

describe("parse helpers", () => {
  it("parses names and install args, rejects garbage", () => {
    expect(parseGitSourceName("github:obra/superpowers")).toEqual({ owner: "obra", repo: "superpowers" });
    expect(() => parseGitSourceName("npm:left-pad")).toThrow(/git-source:/);
    expect(parseGitInstallArg("github:obra/superpowers@v6.1.1")).toEqual({ name: "github:obra/superpowers", ref: "v6.1.1" });
    expect(() => parseGitInstallArg("github:obra/superpowers")).toThrow(/needs @<ref>/);
    expect(isGitSourceName("github:a/b")).toBe(true);
    expect(isGitSourceName("@acme/base")).toBe(false);
  });
});

describe("parseInstallRef", () => {
  it("routes github: to the git form (delegating to parseGitInstallArg)", () => {
    expect(parseInstallRef("github:obra/superpowers@v6.1.1")).toEqual({ kind: "git", name: "github:obra/superpowers", ref: "v6.1.1" });
    expect(() => parseInstallRef("github:obra/superpowers")).toThrow(/needs @<ref>/);
  });

  it("parses @scope/name registry refs, with and without a version", () => {
    expect(parseInstallRef("@acme/base")).toEqual({ kind: "registry", name: "@acme/base", version: null });
    expect(parseInstallRef("@acme/base@1.2.3")).toEqual({ kind: "registry", name: "@acme/base", version: "1.2.3" });
    expect(() => parseInstallRef("@acme/base@")).toThrow(/empty version/);
    expect(() => parseInstallRef("@bad name/x")).toThrow(/not a valid @scope\/name/);
  });

  it("parses owner/repo@skill bare shorthand", () => {
    expect(parseInstallRef("vercel-labs/agent-skills@web-design")).toEqual({ kind: "skill", owner: "vercel-labs", repo: "agent-skills", skill: "web-design" });
  });

  it("rejects a bare owner/repo with no @ as ambiguous", () => {
    expect(() => parseInstallRef("owner/repo")).toThrow(/ambiguous/);
    expect(() => parseInstallRef("owner/repo")).toThrow(/github:owner\/repo@<ref>/);
    expect(() => parseInstallRef("owner/repo")).toThrow(/owner\/repo@<skill>/);
  });

  it("parses docs: well-known refs (https only) and wins over the bare owner/repo branch", () => {
    expect(parseInstallRef("docs:https://docs.stripe.com")).toEqual({ kind: "docs", url: "https://docs.stripe.com" });
    // A path with slashes must not be mis-parsed as owner/repo.
    expect(parseInstallRef("docs:https://acme.dev/guides/x")).toEqual({ kind: "docs", url: "https://acme.dev/guides/x" });
    expect(() => parseInstallRef("docs:http://docs.stripe.com")).toThrow(/must be https/);
    expect(() => parseInstallRef("docs:ftp://x.com")).toThrow(/must be https/);
    expect(() => parseInstallRef("docs:not a url")).toThrow(/not a valid docs URL/);
  });
});

describe("resolveDefaultBranch", () => {
  it("reads default_branch from repo metadata", async () => {
    const fetchImpl = fakeFetch({
      "https://api.github.com/repos/o/r": () => jsonRes({ default_branch: "trunk" }),
    });
    await expect(resolveDefaultBranch("o", "r", { fetchImpl, label: "o/r" })).resolves.toBe("trunk");
  });

  it("throws loudly when the repo lookup fails", async () => {
    const fetchImpl = fakeFetch({ "https://api.github.com/repos/o/missing": () => new Response("nope", { status: 404 }) });
    await expect(resolveDefaultBranch("o", "missing", { fetchImpl, label: "o/missing" })).rejects.toThrow(/git-source:/);
  });
});

describe("resolveGitSource", () => {
  const tagRoutes = {
    "https://api.github.com/repos/obra/superpowers/git/ref/tags/v6.1.1": () =>
      jsonRes({ object: { sha: SHA, type: "commit" } }),
    [`https://codeload.github.com/obra/superpowers/tar.gz/${SHA}`]: () =>
      new Response(tarball(tarEntry(`superpowers-${SHA}/pack.json`, '{"id":"sp"}')) as BodyInit),
  };

  it("resolves a tag and fetches the tarball at the pinned sha", async () => {
    const r = await resolveGitSource({ name: "github:obra/superpowers", ref: "v6.1.1", fetchImpl: fakeFetch(tagRoutes) });
    expect(r).toEqual({ sha: SHA, files: { "pack.json": '{"id":"sp"}' }, transport: "tarball" });
  });

  it("dereferences an annotated tag to its commit", async () => {
    const tagObjSha = "b".repeat(40);
    const r = await resolveGitSource({
      name: "github:o/r", ref: "v1",
      fetchImpl: fakeFetch({
        "https://api.github.com/repos/o/r/git/ref/tags/v1": () => jsonRes({ object: { sha: tagObjSha, type: "tag" } }),
        [`https://api.github.com/repos/o/r/git/tags/${tagObjSha}`]: () => jsonRes({ object: { sha: SHA, type: "commit" } }),
        [`https://codeload.github.com/o/r/tar.gz/${SHA}`]: () => new Response(tarball(tarEntry(`r-x/f.md`, "hi")) as BodyInit),
      }),
    });
    expect(r.sha).toBe(SHA);
  });

  it("falls back tags→heads, and accepts a bare 40-hex sha without a ref lookup", async () => {
    const branch = await resolveGitSource({
      name: "github:o/r", ref: "main",
      fetchImpl: fakeFetch({
        "https://api.github.com/repos/o/r/git/ref/tags/main": () => new Response("nope", { status: 404 }),
        "https://api.github.com/repos/o/r/git/ref/heads/main": () => jsonRes({ object: { sha: SHA, type: "commit" } }),
        [`https://codeload.github.com/o/r/tar.gz/${SHA}`]: () => new Response(tarball(tarEntry("r-x/f.md", "hi")) as BodyInit),
      }),
    });
    expect(branch.sha).toBe(SHA);

    const pinned = await resolveGitSource({
      name: "github:o/r", ref: SHA,
      fetchImpl: fakeFetch({ [`https://codeload.github.com/o/r/tar.gz/${SHA}`]: () => new Response(tarball(tarEntry("r-x/f.md", "hi")) as BodyInit) }),
    });
    expect(pinned.sha).toBe(SHA);
  });

  it("falls back to REST trees+blobs when the tarball fails, fetching only relevant paths", async () => {
    const notices: string[] = [];
    const r = await resolveGitSource({
      name: "github:o/r", ref: SHA, onNotice: (m) => notices.push(m),
      fetchImpl: fakeFetch({
        [`https://codeload.github.com/o/r/tar.gz/${SHA}`]: () => new Response("blocked", { status: 502 }),
        [`https://api.github.com/repos/o/r/git/trees/${SHA}?recursive=1`]: () =>
          jsonRes({ tree: [
            { path: "pack.json", type: "blob", sha: "s1" },
            { path: "irrelevant/big.bin", type: "blob", sha: "s2" },
            { path: ".claude/skills/a/SKILL.md", type: "blob", sha: "s3" },
          ] }),
        [`https://api.github.com/repos/o/r/contents/pack.json?ref=${SHA}`]: () =>
          jsonRes({ content: Buffer.from('{"id":"sp"}', "utf8").toString("base64"), encoding: "base64" }),
        [`https://api.github.com/repos/o/r/contents/.claude/skills/a/SKILL.md?ref=${SHA}`]: () =>
          jsonRes({ content: Buffer.from("# a", "utf8").toString("base64"), encoding: "base64" }),
      }),
    });
    expect(r.transport).toBe("rest");
    expect(r.files).toEqual({ "pack.json": '{"id":"sp"}', ".claude/skills/a/SKILL.md": "# a" });
    expect(notices.some((n) => /tarball unavailable/.test(n))).toBe(true);
  });

  it("REST fallback ingests a root single-skill SKILL.md and .agents/skills/ layouts (I2)", async () => {
    // Task 3 taught packFromFileset four skills-corpus layouts, but the REST-fallback filter
    // only recognized "skills/" — a root SKILL.md or .agents/skills/ repo would come back
    // empty on this transport while working fine over the tarball path.
    const r = await resolveGitSource({
      name: "github:o/r", ref: SHA,
      fetchImpl: fakeFetch({
        [`https://codeload.github.com/o/r/tar.gz/${SHA}`]: () => new Response("blocked", { status: 502 }),
        [`https://api.github.com/repos/o/r/git/trees/${SHA}?recursive=1`]: () =>
          jsonRes({ tree: [
            { path: "SKILL.md", type: "blob", sha: "s1" },
            { path: ".agents/skills/b/SKILL.md", type: "blob", sha: "s2" },
            { path: "irrelevant/big.bin", type: "blob", sha: "s3" },
          ] }),
        [`https://api.github.com/repos/o/r/contents/SKILL.md?ref=${SHA}`]: () =>
          jsonRes({ content: Buffer.from("# root", "utf8").toString("base64"), encoding: "base64" }),
        [`https://api.github.com/repos/o/r/contents/.agents/skills/b/SKILL.md?ref=${SHA}`]: () =>
          jsonRes({ content: Buffer.from("# b", "utf8").toString("base64"), encoding: "base64" }),
      }),
    });
    expect(r.transport).toBe("rest");
    expect(r.files).toEqual({ "SKILL.md": "# root", ".agents/skills/b/SKILL.md": "# b" });
  });

  it("fails loudly with GITHUB_TOKEN advice on rate-limit, naming source and ref", async () => {
    await expect(
      resolveGitSource({
        name: "github:o/r", ref: "v1",
        fetchImpl: fakeFetch({
          "https://api.github.com/repos/o/r/git/ref/tags/v1": () =>
            new Response("limited", { status: 403, headers: { "x-ratelimit-remaining": "0" } }),
        }),
      }),
    ).rejects.toThrow(/GITHUB_TOKEN.*github:o\/r@v1|github:o\/r@v1.*GITHUB_TOKEN/s);
  });

  it("propagates tar-safety rejections instead of silently falling back to REST (finding 1)", async () => {
    let restHits = 0;
    const evilTar = tarball(tarEntry("r-x/../../etc/passwd", "x"));
    await expect(
      resolveGitSource({
        name: "github:o/r", ref: SHA,
        fetchImpl: fakeFetch({
          [`https://codeload.github.com/o/r/tar.gz/${SHA}`]: () => new Response(evilTar as BodyInit),
          [`https://api.github.com/repos/o/r/git/trees/${SHA}?recursive=1`]: () => {
            restHits++;
            return jsonRes({ tree: [] });
          },
        }),
      }),
    ).rejects.toThrow(/tar:/);
    expect(restHits).toBe(0);
  });

  it("fails loudly on an oversized/odd blob instead of silently writing an empty file (finding 2)", async () => {
    await expect(
      resolveGitSource({
        name: "github:o/r", ref: SHA,
        fetchImpl: fakeFetch({
          [`https://codeload.github.com/o/r/tar.gz/${SHA}`]: () => new Response("blocked", { status: 502 }),
          [`https://api.github.com/repos/o/r/git/trees/${SHA}?recursive=1`]: () =>
            jsonRes({ tree: [{ path: "pack.json", type: "blob", sha: "s1" }] }),
          [`https://api.github.com/repos/o/r/contents/pack.json?ref=${SHA}`]: () =>
            jsonRes({ content: "", encoding: "none" }),
        }),
      }),
    ).rejects.toThrow(/pack\.json/);
  });

  it("fails loudly when a base64 blob response is missing its content field instead of writing empty (#13)", async () => {
    await expect(
      resolveGitSource({
        name: "github:o/r", ref: SHA,
        fetchImpl: fakeFetch({
          [`https://codeload.github.com/o/r/tar.gz/${SHA}`]: () => new Response("blocked", { status: 502 }),
          [`https://api.github.com/repos/o/r/git/trees/${SHA}?recursive=1`]: () =>
            jsonRes({ tree: [{ path: "pack.json", type: "blob", sha: "s1" }] }),
          [`https://api.github.com/repos/o/r/contents/pack.json?ref=${SHA}`]: () =>
            jsonRes({ encoding: "base64" }), // no content field
        }),
      }),
    ).rejects.toThrow(/pack\.json/);
  });

  it("bails loudly when the REST tree listing is truncated instead of silently under-fetching (#8)", async () => {
    await expect(
      resolveGitSource({
        name: "github:o/r", ref: SHA,
        fetchImpl: fakeFetch({
          [`https://codeload.github.com/o/r/tar.gz/${SHA}`]: () => new Response("blocked", { status: 502 }),
          [`https://api.github.com/repos/o/r/git/trees/${SHA}?recursive=1`]: () =>
            jsonRes({ tree: [{ path: "pack.json", type: "blob", sha: "s1" }], truncated: true }),
        }),
      }),
    ).rejects.toThrow(/truncated/);
  });
});

describe("URL component validation (finding 3)", () => {
  it("rejects owner/repo names containing url-meta characters", () => {
    expect(() => parseGitSourceName("github:o?x/r")).toThrow(/git-source:/);
    expect(() => parseGitSourceName("github:o/r#frag")).toThrow(/git-source:/);
    expect(() => parseGitSourceName("github:../../x/r")).toThrow(/git-source:/);
  });

  it("rejects an owner or repo segment that is exactly \".\" or \"..\" (#12)", () => {
    expect(() => parseGitSourceName("github:../r")).toThrow(/git-source:/);
    expect(() => parseGitSourceName("github:./r")).toThrow(/git-source:/);
    expect(() => parseGitSourceName("github:o/..")).toThrow(/git-source:/);
    expect(() => parseGitSourceName("github:o/.")).toThrow(/git-source:/);
  });

  it("encodes a ref containing a slash before it hits the git/ref lookup route", async () => {
    const r = await resolveGitSource({
      name: "github:o/r", ref: "release/v1",
      fetchImpl: fakeFetch({
        "https://api.github.com/repos/o/r/git/ref/tags/release%2Fv1": () =>
          jsonRes({ object: { sha: SHA, type: "commit" } }),
        [`https://codeload.github.com/o/r/tar.gz/${SHA}`]: () =>
          new Response(tarball(tarEntry("r-x/f.md", "hi")) as BodyInit),
      }),
    });
    expect(r.sha).toBe(SHA);
  });
});
