import { describe, expect, it, vi } from "vitest";
import { gzipSync } from "node:zlib";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { main } from "../src/cli.ts";

const fx = fileURLToPath(new URL("./fixtures/ts-app", import.meta.url));

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

const customPackJson = JSON.stringify({
  id: "acme-custom",
  version: "1.0.0",
  title: "Acme Custom Pack",
  summary: "A hand-authored pack loaded from outside the built-in catalog.",
  context: { markdown: "# Acme conventions\n" },
  agents: [],
  commands: [],
  hooks: [],
});

describe("cli main", () => {
  it("audit prints a report and returns 0", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(await main(["audit", fx])).toBe(0);
    expect(log.mock.calls.flat().join("\n")).toContain("Recommended pack:");
    log.mockRestore();
  });

  it("--help / -h / help prints usage to stdout and returns 0 (#29)", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const flag of ["--help", "-h", "help"]) {
      expect(await main([flag])).toBe(0); // an explicit help request is not an error
    }
    expect(log.mock.calls.flat().join("\n")).toContain("usage:");
    expect(err).not.toHaveBeenCalled(); // nothing on stderr
    log.mockRestore();
    err.mockRestore();
  });

  it("returns 1 with usage on unknown command or missing args", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await main([])).toBe(1);
    expect(await main(["frobnicate"])).toBe(1);
    expect(await main(["apply"])).toBe(1); // missing dir and --pack
    err.mockRestore();
  });

  it("apply returns 1 on unknown pack id", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await main(["apply", fx, "--pack", "nope"])).toBe(1);
    err.mockRestore();
  });

  it("apply --pack-file loads and validates a custom pack the CLI doesn't ship (#6)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "baselane-cli-packfile-"));
    const packFile = join(dir, "acme-custom.json");
    await writeFile(packFile, customPackJson, "utf8");
    try {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      expect(await main(["apply", dir, "--pack-file", packFile])).toBe(0);
      expect(log.mock.calls.flat().join("\n")).toContain("baselane apply acme-custom");
      const agents = await readFile(join(dir, "AGENTS.md"), "utf8");
      expect(agents).toContain("<!-- baselane:start acme-custom@1.0.0");
      log.mockRestore();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("apply rejects giving both --pack and --pack-file, or neither (#6)", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await main(["apply", fx])).toBe(1); // neither
    expect(await main(["apply", fx, "--pack", "test-loop", "--pack-file", "x.json"])).toBe(1); // both
    err.mockRestore();
  });

  it("apply --pack-file surfaces a validation error for a malformed custom pack (#6)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "baselane-cli-packfile-bad-"));
    const packFile = join(dir, "bad.json");
    await writeFile(packFile, JSON.stringify({ id: "bad" }), "utf8"); // missing required fields
    try {
      const err = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(await main(["apply", dir, "--pack-file", packFile])).toBe(1);
      expect(err.mock.calls.flat().join("\n")).toContain("baselane error:");
      err.mockRestore();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("distribute requires GITHUB_TOKEN and args", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const prev = process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_TOKEN;
    expect(await main(["distribute", "acme/web", "--pack", "test-loop"])).toBe(1);
    expect(err.mock.calls.flat().join("\n")).toContain("GITHUB_TOKEN");
    process.env.GITHUB_TOKEN = "tok";
    expect(await main(["distribute"])).toBe(1); // missing repo and --pack
    if (prev === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = prev;
    err.mockRestore();
  });

  it("distribute rejects giving both --pack and --pack-file, or neither (#6)", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await main(["distribute", "acme/web"])).toBe(1); // neither
    expect(await main(["distribute", "acme/web", "--pack", "test-loop", "--pack-file", "x.json"])).toBe(1); // both
    err.mockRestore();
  });

  it("distribute --portal requires BASELANE_PORTAL_TOKEN", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const prevGh = process.env.GITHUB_TOKEN;
    const prevPt = process.env.BASELANE_PORTAL_TOKEN;
    process.env.GITHUB_TOKEN = "tok";
    delete process.env.BASELANE_PORTAL_TOKEN;
    expect(await main(["distribute", "acme/web", "--pack", "test-loop", "--portal", "https://p.io"])).toBe(1);
    expect(err.mock.calls.flat().join("\n")).toContain("BASELANE_PORTAL_TOKEN");
    if (prevGh === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = prevGh;
    if (prevPt === undefined) delete process.env.BASELANE_PORTAL_TOKEN;
    else process.env.BASELANE_PORTAL_TOKEN = prevPt;
    err.mockRestore();
  });

  it("install --json keeps stdout pure JSON even when a derived-pack notice fires (#6)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "blc-"));
    const SHA = "3".repeat(40);
    // no pack.json in this tarball ⇒ packFromFileset derives one and resolveManifestPacks emits a notice
    const routes = {
      "https://api.github.com/repos/o/r/git/ref/tags/v1": () => jsonRes({ object: { sha: SHA, type: "commit" } }),
      [`https://codeload.github.com/o/r/tar.gz/${SHA}`]: () =>
        new Response(tarball(tarEntry(`r-${SHA}/.claude/skills/tdd/SKILL.md`,
          "---\nname: tdd\ndescription: Test-driven development discipline for every change\n---\n\nBody.\n")) as BodyInit),
    };
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const code = await main(["install", "github:o/r@v1", "--dir", dir, "--json"], { fetchImpl: fakeFetch(routes) });
    expect(code).toBe(0);
    expect(log.mock.calls.length).toBe(1); // exactly one console.log call: the JSON report
    expect(() => JSON.parse(log.mock.calls[0][0])).not.toThrow();
    expect(err.mock.calls.length).toBeGreaterThan(0); // the derived-pack notice went to stderr instead
    log.mockRestore();
    err.mockRestore();
    await rm(dir, { recursive: true, force: true });
  });
});
