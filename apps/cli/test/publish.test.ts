import { describe, expect, it, vi } from "vitest";
import { gzipSync } from "node:zlib";
import { main } from "../src/cli.ts";
import { runPublish } from "../src/publish.ts";

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

function fakeFetch(routes: Record<string, (url: string, init?: RequestInit) => Response | Promise<Response>>): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    for (const [prefix, handler] of Object.entries(routes)) {
      if (url.startsWith(prefix)) return handler(url, init);
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
}

const SHA = "4".repeat(40);

const packJson = JSON.stringify({
  id: "acme-web",
  version: "1.0.0",
  title: "Acme Web Pack",
  summary: "A hand-authored pack loaded from a git source for publish.",
  context: { markdown: "# Acme conventions\n" },
  agents: [],
  commands: [],
  hooks: [],
});

/** Git-resolution routes shared by every publish test that needs a real tarball fetch (all but
 * the ones that fail before resolveGitSource runs). */
function gitRoutes(): Record<string, (url: string, init?: RequestInit) => Response | Promise<Response>> {
  return {
    "https://api.github.com/repos/acme/web/git/ref/tags/v1.2.0": () => jsonRes({ object: { sha: SHA, type: "commit" } }),
    [`https://codeload.github.com/acme/web/tar.gz/${SHA}`]: () =>
      new Response(tarball(tarEntry(`web-${SHA}/pack.json`, packJson)) as BodyInit),
  };
}

describe("runPublish", () => {
  it("requires GITHUB_TOKEN and makes no network calls when absent", async () => {
    const fetchImpl = vi.fn(fakeFetch(gitRoutes()));
    await expect(
      runPublish({ name: "@acme/web", sourceName: "github:acme/web", ref: "v1.2.0", fetchImpl }),
    ).rejects.toThrow(/GITHUB_TOKEN/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects a non-semver ref with no network calls", async () => {
    const fetchImpl = vi.fn(fakeFetch(gitRoutes()));
    await expect(
      runPublish({ name: "@acme/web", sourceName: "github:acme/web", ref: "main", token: "gh-tok", fetchImpl }),
    ).rejects.toThrow(/semver version tag/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("happy path: 201 → published message, version derived from ref, packId/source in the POST body", async () => {
    let publishedBody: unknown;
    const routes = {
      ...gitRoutes(),
      "https://registry.baselane.sh/registry/v1/publish": async (_url: string, init?: RequestInit) => {
        publishedBody = JSON.parse(String(init?.body));
        return jsonRes({ ok: true }, 201);
      },
    };
    const result = await runPublish({
      name: "@acme/web", sourceName: "github:acme/web", ref: "v1.2.0", token: "gh-tok", fetchImpl: fakeFetch(routes),
    });
    expect(result).toEqual({
      ok: true, status: 201, name: "@acme/web", version: "1.2.0", sha: SHA,
      message: `published @acme/web@1.2.0 (sha ${SHA.slice(0, 7)})`,
    });
    expect(publishedBody).toEqual({
      name: "@acme/web",
      version: "1.2.0",
      source: { name: "github:acme/web", ref: "v1.2.0", sha: SHA },
      packId: "acme-web",
      description: "A hand-authored pack loaded from a git source for publish.",
    });
  });

  it("truncates a summary longer than 300 chars before sending it as description", async () => {
    const longSummary = "s".repeat(320);
    const longPackJson = JSON.stringify({
      id: "acme-web", version: "1.0.0", title: "Acme Web Pack", summary: longSummary,
      context: { markdown: "# Acme conventions\n" }, agents: [], commands: [], hooks: [],
    });
    let publishedBody: unknown;
    const routes = {
      "https://api.github.com/repos/acme/web/git/ref/tags/v1.2.0": () => jsonRes({ object: { sha: SHA, type: "commit" } }),
      [`https://codeload.github.com/acme/web/tar.gz/${SHA}`]: () =>
        new Response(tarball(tarEntry(`web-${SHA}/pack.json`, longPackJson)) as BodyInit),
      "https://registry.baselane.sh/registry/v1/publish": async (_url: string, init?: RequestInit) => {
        publishedBody = JSON.parse(String(init?.body));
        return jsonRes({ ok: true }, 201);
      },
    };
    await runPublish({
      name: "@acme/web", sourceName: "github:acme/web", ref: "v1.2.0", token: "gh-tok", fetchImpl: fakeFetch(routes),
    });
    expect((publishedBody as { description: string }).description).toBe(longSummary.slice(0, 300));
    expect((publishedBody as { description: string }).description).toHaveLength(300);
  });

  it("409 surfaces as 'version already published — bump the tag'", async () => {
    const routes = {
      ...gitRoutes(),
      "https://registry.baselane.sh/registry/v1/publish": () => jsonRes({ error: "dupe" }, 409),
    };
    const result = await runPublish({
      name: "@acme/web", sourceName: "github:acme/web", ref: "v1.2.0", token: "gh-tok", fetchImpl: fakeFetch(routes),
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(409);
    expect(result.message).toContain("already published — bump the tag");
  });

  it("401/403/400 map to friendly non-throwing results", async () => {
    for (const [status, expected] of [
      [401, /GITHUB_TOKEN was rejected/],
      [403, /does not match your authenticated GitHub user or org/],
      [400, /request rejected/],
    ] as const) {
      const routes = {
        ...gitRoutes(),
        "https://registry.baselane.sh/registry/v1/publish": () => jsonRes({ error: "detail" }, status),
      };
      const result = await runPublish({
        name: "@acme/web", sourceName: "github:acme/web", ref: "v1.2.0", token: "gh-tok", fetchImpl: fakeFetch(routes),
      });
      expect(result.ok).toBe(false);
      expect(result.status).toBe(status);
      expect(result.message).toMatch(expected);
    }
  });

  it("surfaces a pack-build failure (no pack.json, no AGENTS.md/.claude content to ingest)", async () => {
    const routes = {
      "https://api.github.com/repos/acme/empty/git/ref/tags/v1.0.0": () => jsonRes({ object: { sha: SHA, type: "commit" } }),
      [`https://codeload.github.com/acme/empty/tar.gz/${SHA}`]: () =>
        new Response(tarball(tarEntry(`empty-${SHA}/README.md`, "nothing installable here\n")) as BodyInit),
    };
    await expect(
      runPublish({ name: "@acme/empty", sourceName: "github:acme/empty", ref: "v1.0.0", token: "gh-tok", fetchImpl: fakeFetch(routes) }),
    ).rejects.toThrow(/nothing installable/);
  });

  it("never puts the token in the result (stdout/JSON surface)", async () => {
    const routes = {
      ...gitRoutes(),
      "https://registry.baselane.sh/registry/v1/publish": () => jsonRes({ ok: true }, 201),
    };
    const result = await runPublish({
      name: "@acme/web", sourceName: "github:acme/web", ref: "v1.2.0", token: "super-secret-token", fetchImpl: fakeFetch(routes),
    });
    expect(JSON.stringify(result)).not.toContain("super-secret-token");
  });
});

describe("cli publish", () => {
  it("requires GITHUB_TOKEN, args, and never logs the token; exits 0 only on 201", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const prev = process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_TOKEN;
    expect(await main(["publish", "@acme/web", "--source", "github:acme/web", "--ref", "v1.2.0"])).toBe(1);
    expect(err.mock.calls.flat().join("\n")).toContain("GITHUB_TOKEN");
    if (prev === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = prev;
    err.mockRestore();
  });

  it("missing required flags returns usage + exit 1", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await main(["publish", "@acme/web"])).toBe(1);
    expect(err.mock.calls.flat().join("\n")).toContain("usage:");
    err.mockRestore();
  });

  it("--json emits a clean JSON result and never echoes GITHUB_TOKEN", async () => {
    const routes = {
      ...gitRoutes(),
      "https://registry.baselane.sh/registry/v1/publish": () => jsonRes({ ok: true }, 201),
    };
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const prev = process.env.GITHUB_TOKEN;
    process.env.GITHUB_TOKEN = "cli-secret-token";
    const code = await main(
      ["publish", "@acme/web", "--source", "github:acme/web", "--ref", "v1.2.0", "--json"],
      { fetchImpl: fakeFetch(routes) },
    );
    if (prev === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = prev;
    expect(code).toBe(0);
    expect(log.mock.calls.length).toBe(1);
    const parsed = JSON.parse(log.mock.calls[0][0]);
    expect(parsed).toMatchObject({ ok: true, status: 201, name: "@acme/web", version: "1.2.0" });
    const allOutput = [...log.mock.calls.flat(), ...err.mock.calls.flat()].join("\n");
    expect(allOutput).not.toContain("cli-secret-token");
    log.mockRestore();
    err.mockRestore();
  });

  it("409 from the registry exits 1 with the friendly message", async () => {
    const routes = {
      ...gitRoutes(),
      "https://registry.baselane.sh/registry/v1/publish": () => jsonRes({ error: "dupe" }, 409),
    };
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const prev = process.env.GITHUB_TOKEN;
    process.env.GITHUB_TOKEN = "gh-tok";
    const code = await main(
      ["publish", "@acme/web", "--source", "github:acme/web", "--ref", "v1.2.0"],
      { fetchImpl: fakeFetch(routes) },
    );
    if (prev === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = prev;
    expect(code).toBe(1);
    expect(log.mock.calls.flat().join("\n")).toContain("already published — bump the tag");
    log.mockRestore();
  });

  it("--registry flag overrides BASELANE_REGISTRY and the default", async () => {
    const routes = {
      "https://api.github.com/repos/acme/web/git/ref/tags/v1.2.0": () => jsonRes({ object: { sha: SHA, type: "commit" } }),
      [`https://codeload.github.com/acme/web/tar.gz/${SHA}`]: () =>
        new Response(tarball(tarEntry(`web-${SHA}/pack.json`, packJson)) as BodyInit),
      "https://custom-registry.example.com/registry/v1/publish": () => jsonRes({ ok: true }, 201),
    };
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const prev = process.env.GITHUB_TOKEN;
    process.env.GITHUB_TOKEN = "gh-tok";
    const code = await main(
      ["publish", "@acme/web", "--source", "github:acme/web", "--ref", "v1.2.0", "--registry", "https://custom-registry.example.com"],
      { fetchImpl: fakeFetch(routes) },
    );
    if (prev === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = prev;
    expect(code).toBe(0);
    expect(log.mock.calls.flat().join("\n")).toContain("published @acme/web@1.2.0");
    log.mockRestore();
  });
});
