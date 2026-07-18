const API = "https://api.github.com";

export class GithubApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "GithubApiError";
  }
}

export class GithubClient {
  private readonly token: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: { token: string; fetchImpl?: typeof fetch }) {
    this.token = opts.token;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private async request(method: string, path: string, body?: unknown): Promise<unknown> {
    const res = await this.fetchImpl(`${API}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${this.token}`,
        accept: "application/vnd.github+json",
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      redirect: "error",
    });
    if (!res.ok) {
      throw new GithubApiError(res.status, `GitHub API ${method} ${path} failed: ${res.status}`);
    }
    return res.status === 204 ? null : res.json();
  }

  async getRepo(owner: string, repo: string): Promise<{ defaultBranch: string }> {
    const data = (await this.request("GET", `/repos/${owner}/${repo}`)) as { default_branch: string };
    return { defaultBranch: data.default_branch };
  }

  async getRefSha(owner: string, repo: string, branch: string): Promise<string> {
    const data = (await this.request("GET", `/repos/${owner}/${repo}/git/ref/heads/${branch}`)) as {
      object: { sha: string };
    };
    return data.object.sha;
  }

  async createBranch(owner: string, repo: string, branch: string, sha: string): Promise<void> {
    await this.request("POST", `/repos/${owner}/${repo}/git/refs`, { ref: `refs/heads/${branch}`, sha });
  }

  async getFileSha(owner: string, repo: string, path: string, ref: string): Promise<string | null> {
    try {
      const data = (await this.request("GET", `/repos/${owner}/${repo}/contents/${path}?ref=${ref}`)) as {
        sha: string;
      };
      return data.sha;
    } catch (err) {
      if (err instanceof GithubApiError && err.status === 404) return null;
      throw err;
    }
  }

  /** The file's current content at `ref`, or null if it doesn't exist there. The contents API
   * returns content base64-encoded; a response with no `content` field (e.g. a directory) decodes
   * to "" rather than throwing, mirroring apps/portal/src/repos.ts's fetchFileContent. */
  async getFileContent(owner: string, repo: string, path: string, ref: string): Promise<string | null> {
    try {
      const data = (await this.request("GET", `/repos/${owner}/${repo}/contents/${path}?ref=${ref}`)) as {
        content?: string;
      };
      return typeof data.content === "string" ? Buffer.from(data.content, "base64").toString("utf8") : "";
    } catch (err) {
      if (err instanceof GithubApiError && err.status === 404) return null;
      throw err;
    }
  }

  async putFile(
    owner: string,
    repo: string,
    path: string,
    opts: { branch: string; message: string; content: string; sha: string | null },
  ): Promise<void> {
    const body: Record<string, string> = {
      branch: opts.branch,
      message: opts.message,
      content: Buffer.from(opts.content, "utf8").toString("base64"),
    };
    if (opts.sha) body.sha = opts.sha;
    await this.request("PUT", `/repos/${owner}/${repo}/contents/${path}`, body);
  }

  async createPullRequest(
    owner: string,
    repo: string,
    opts: { title: string; body: string; head: string; base: string },
  ): Promise<{ url: string; number: number }> {
    const data = (await this.request("POST", `/repos/${owner}/${repo}/pulls`, opts)) as {
      html_url: string;
      number: number;
    };
    return { url: data.html_url, number: data.number };
  }

  /** Closes (does NOT merge) a PR. */
  async closePullRequest(owner: string, repo: string, number: number): Promise<void> {
    await this.request("PATCH", `/repos/${owner}/${repo}/pulls/${number}`, { state: "closed" });
  }

  /** Deletes a branch ref. Returns 204; callers treat a 404/422 (already gone) as success by catching. */
  async deleteBranch(owner: string, repo: string, branch: string): Promise<void> {
    await this.request("DELETE", `/repos/${owner}/${repo}/git/refs/heads/${branch}`);
  }

  /** Adds a comment to a PR (PRs are issues for the comments API). */
  async commentOnPullRequest(owner: string, repo: string, number: number, body: string): Promise<void> {
    await this.request("POST", `/repos/${owner}/${repo}/issues/${number}/comments`, { body });
  }

  /** Open PRs for the repo, each with its head branch ref — used to find a superseded baselane PR by branch. */
  async listOpenPullRequests(owner: string, repo: string): Promise<Array<{ number: number; headRef: string; url: string }>> {
    const data = (await this.request("GET", `/repos/${owner}/${repo}/pulls?state=open&per_page=100`)) as Array<{
      number: number;
      head: { ref: string };
      html_url: string;
    }>;
    return data.map((p) => ({ number: p.number, headRef: p.head.ref, url: p.html_url }));
  }

  /** Every file (blob) currently on `ref`, recursively — subtree entries are dropped. `ref` is
   * URL-encoded because the trees endpoint (unlike git/ref/heads/*) treats its path segment as
   * opaque, so a branch name containing "/" (e.g. "baselane/rollout") must be %2F-escaped to
   * survive as one segment. Used by distributeRollout to find a removed pack's orphaned files —
   * paths the rollout branch still has that nothing renders anymore. */
  async listTree(owner: string, repo: string, ref: string): Promise<Array<{ path: string; sha: string }>> {
    const data = (await this.request(
      "GET",
      `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
    )) as { tree: Array<{ path: string; type: string; sha: string }> };
    return data.tree.filter((e) => e.type === "blob").map((e) => ({ path: e.path, sha: e.sha }));
  }

  /** Deletes a file at `path` on `opts.branch`, given its current blob sha (from `listTree` or
   * `getFileSha`). */
  async deleteFile(
    owner: string,
    repo: string,
    path: string,
    opts: { branch: string; message: string; sha: string },
  ): Promise<void> {
    await this.request("DELETE", `/repos/${owner}/${repo}/contents/${path}`, {
      branch: opts.branch,
      message: opts.message,
      sha: opts.sha,
    });
  }
}
