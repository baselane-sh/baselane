import { describe, expect, it } from "vitest";
import { GithubApiError, GithubClient } from "../src/github.ts";

interface Recorded {
  url: string;
  method: string;
  authorization: string | null;
  body: unknown;
}

function fakeFetch(routes: Record<string, { status: number; json: unknown }>, log: Recorded[]): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const headers = new Headers(init?.headers);
    log.push({
      url,
      method,
      authorization: headers.get("authorization"),
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    const route = routes[`${method} ${url}`];
    if (!route) return new Response(JSON.stringify({ message: "Not Found" }), { status: 404 });
    return new Response(route.status === 204 ? null : JSON.stringify(route.json), { status: route.status });
  }) as typeof fetch;
}

const API = "https://api.github.com";

describe("GithubClient", () => {
  it("sends the token and parses repo/ref/PR responses", async () => {
    const log: Recorded[] = [];
    const gh = new GithubClient({
      token: "tok-123",
      fetchImpl: fakeFetch(
        {
          [`GET ${API}/repos/acme/web`]: { status: 200, json: { default_branch: "main" } },
          [`GET ${API}/repos/acme/web/git/ref/heads/main`]: { status: 200, json: { object: { sha: "abc" } } },
          [`POST ${API}/repos/acme/web/git/refs`]: { status: 201, json: {} },
          [`POST ${API}/repos/acme/web/pulls`]: {
            status: 201,
            json: { html_url: "https://github.com/acme/web/pull/7", number: 7 },
          },
        },
        log,
      ),
    });
    expect((await gh.getRepo("acme", "web")).defaultBranch).toBe("main");
    expect(await gh.getRefSha("acme", "web", "main")).toBe("abc");
    await gh.createBranch("acme", "web", "baselane/test-loop", "abc");
    const pr = await gh.createPullRequest("acme", "web", {
      title: "t", body: "b", head: "baselane/test-loop", base: "main",
    });
    expect(pr).toEqual({ url: "https://github.com/acme/web/pull/7", number: 7 });
    expect(log.every((r) => r.authorization === "Bearer tok-123")).toBe(true);
    const refCall = log.find((r) => r.method === "POST" && r.url.endsWith("/git/refs"));
    expect(refCall?.body).toEqual({ ref: "refs/heads/baselane/test-loop", sha: "abc" });
  });

  it("returns null for a missing file and base64-encodes content on put", async () => {
    const log: Recorded[] = [];
    const gh = new GithubClient({
      token: "t",
      fetchImpl: fakeFetch(
        {
          [`GET ${API}/repos/acme/web/contents/AGENTS.md?ref=main`]: { status: 200, json: { sha: "filesha" } },
          [`PUT ${API}/repos/acme/web/contents/AGENTS.md`]: { status: 200, json: {} },
        },
        log,
      ),
    });
    expect(await gh.getFileSha("acme", "web", "AGENTS.md", "main")).toBe("filesha");
    expect(await gh.getFileSha("acme", "web", "MISSING.md", "main")).toBeNull();
    await gh.putFile("acme", "web", "AGENTS.md", {
      branch: "b", message: "m", content: "hello", sha: "filesha",
    });
    const put = log.find((r) => r.method === "PUT");
    expect(put?.body).toEqual({
      branch: "b", message: "m", sha: "filesha",
      content: Buffer.from("hello", "utf8").toString("base64"),
    });
  });

  it("getFileContent decodes existing content and returns null for a missing file", async () => {
    const log: Recorded[] = [];
    const gh = new GithubClient({
      token: "t",
      fetchImpl: fakeFetch(
        {
          [`GET ${API}/repos/acme/web/contents/CLAUDE.md?ref=main`]: {
            status: 200,
            json: { sha: "filesha", content: Buffer.from("## Key Entities\n", "utf8").toString("base64"), encoding: "base64" },
          },
        },
        log,
      ),
    });
    expect(await gh.getFileContent("acme", "web", "CLAUDE.md", "main")).toBe("## Key Entities\n");
    expect(await gh.getFileContent("acme", "web", "MISSING.md", "main")).toBeNull();
  });

  it("throws GithubApiError with status and no token leakage", async () => {
    const gh = new GithubClient({
      token: "secret-token",
      fetchImpl: fakeFetch({}, []),
    });
    const err = await gh.getRepo("acme", "gone").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(GithubApiError);
    expect((err as GithubApiError).status).toBe(404);
    expect((err as Error).message).not.toContain("secret-token");
  });

  it("closes a PR, deletes a branch, comments, and lists open PRs with head refs", async () => {
    const log: Recorded[] = [];
    const gh = new GithubClient({
      token: "tok",
      fetchImpl: fakeFetch(
        {
          [`PATCH ${API}/repos/acme/web/pulls/7`]: { status: 200, json: { number: 7, state: "closed" } },
          [`DELETE ${API}/repos/acme/web/git/refs/heads/baselane/go-rules`]: { status: 204, json: {} },
          [`POST ${API}/repos/acme/web/issues/7/comments`]: { status: 201, json: { id: 1 } },
          [`GET ${API}/repos/acme/web/pulls?state=open&per_page=100`]: {
            status: 200,
            json: [
              { number: 7, head: { ref: "baselane/go-rules" }, html_url: "https://github.com/acme/web/pull/7" },
              { number: 8, head: { ref: "feature/x" }, html_url: "https://github.com/acme/web/pull/8" },
            ],
          },
        },
        log,
      ),
    });

    await gh.closePullRequest("acme", "web", 7);
    await gh.deleteBranch("acme", "web", "baselane/go-rules");
    await gh.commentOnPullRequest("acme", "web", 7, "superseded by #9");
    const open = await gh.listOpenPullRequests("acme", "web");

    expect(open).toEqual([
      { number: 7, headRef: "baselane/go-rules", url: "https://github.com/acme/web/pull/7" },
      { number: 8, headRef: "feature/x", url: "https://github.com/acme/web/pull/8" },
    ]);
    expect(log.find((r) => r.method === "PATCH")?.body).toEqual({ state: "closed" });
    expect(log.find((r) => r.method === "POST" && r.url.endsWith("/comments"))?.body).toEqual({ body: "superseded by #9" });
    expect(log.find((r) => r.method === "DELETE")?.url).toBe(`${API}/repos/acme/web/git/refs/heads/baselane/go-rules`);
    expect(log.every((r) => r.authorization === "Bearer tok")).toBe(true);
  });

  it("listTree returns only blob paths (skipping subtree entries), recursively", async () => {
    const log: Recorded[] = [];
    const gh = new GithubClient({
      token: "t",
      fetchImpl: fakeFetch(
        {
          [`GET ${API}/repos/acme/web/git/trees/baselane%2Frollout?recursive=1`]: {
            status: 200,
            json: {
              sha: "treesha",
              truncated: false,
              tree: [
                { path: ".claude", mode: "040000", type: "tree", sha: "dirsha" },
                { path: ".claude/agents/b-agent.md", mode: "100644", type: "blob", sha: "blobsha1" },
                { path: "AGENTS.md", mode: "100644", type: "blob", sha: "blobsha2" },
              ],
            },
          },
        },
        log,
      ),
    });
    const tree = await gh.listTree("acme", "web", "baselane/rollout");
    expect(tree).toEqual([
      { path: ".claude/agents/b-agent.md", sha: "blobsha1" },
      { path: "AGENTS.md", sha: "blobsha2" },
    ]);
  });

  it("deleteFile sends the blob sha and branch to the DELETE contents endpoint", async () => {
    const log: Recorded[] = [];
    const gh = new GithubClient({
      token: "t",
      fetchImpl: fakeFetch(
        {
          [`DELETE ${API}/repos/acme/web/contents/.claude/agents/b-agent.md`]: { status: 200, json: { commit: {} } },
        },
        log,
      ),
    });
    await gh.deleteFile("acme", "web", ".claude/agents/b-agent.md", {
      branch: "baselane/rollout",
      message: "chore: baselane rollout — remove .claude/agents/b-agent.md",
      sha: "blobsha1",
    });
    const del = log.find((r) => r.method === "DELETE");
    expect(del?.body).toEqual({
      branch: "baselane/rollout",
      message: "chore: baselane rollout — remove .claude/agents/b-agent.md",
      sha: "blobsha1",
    });
  });
});
