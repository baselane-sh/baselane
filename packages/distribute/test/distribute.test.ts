import { beforeAll, describe, expect, it, vi } from "vitest";
import { loadBuiltinPack, renderPack, type WorkflowPack } from "@baselane/packs";
import { GithubApiError, GithubClient } from "../src/github.ts";
import { buildDistribution, distributePack, distributeRollout } from "../src/distribute.ts";

// distributePack now takes a RESOLVED pack (the caller resolves builtin vs custom), so every
// case loads the builtin software-engineer-harness pack once and passes it in.
let harnessPack: WorkflowPack;
beforeAll(async () => {
  harnessPack = await loadBuiltinPack("software-engineer-harness");
});

function stubClient(overrides: Partial<Record<keyof GithubClient, unknown>> = {}): GithubClient {
  const gh = {
    getRepo: vi.fn(async () => ({ defaultBranch: "main" })),
    getRefSha: vi.fn(async () => "basesha"),
    createBranch: vi.fn(async () => {}),
    getFileSha: vi.fn(async () => null),
    getFileContent: vi.fn(async () => null),
    putFile: vi.fn(async () => {}),
    createPullRequest: vi.fn(async () => ({ url: "https://github.com/acme/web/pull/9", number: 9 })),
    listOpenPullRequests: vi.fn(async () => []),
    closePullRequest: vi.fn(async () => {}),
    deleteBranch: vi.fn(async () => {}),
    commentOnPullRequest: vi.fn(async () => {}),
    listTree: vi.fn(async () => []),
    deleteFile: vi.fn(async () => {}),
    ...overrides,
  };
  return gh as unknown as GithubClient;
}

describe("buildDistribution", () => {
  it("derives branch, title, body and files from the pack", async () => {
    const pack = await loadBuiltinPack("software-engineer-harness");
    const d = buildDistribution(pack);
    expect(d.branch).toBe("baselane/software-engineer-harness");
    expect(d.title).toBe(`chore: adopt baselane pack software-engineer-harness v${pack.version}`);
    expect(d.body).toContain(pack.summary);
    expect(d.body).toContain("AGENTS.md");
    expect(Object.keys(d.files)).toContain("AGENTS.md");
  });
});

describe("distributePack", () => {
  it("creates branch, uploads every file, opens the PR", async () => {
    const gh = stubClient();
    const r = await distributePack(gh, "acme/web", harnessPack);
    expect(r.prUrl).toBe("https://github.com/acme/web/pull/9");
    expect(r.branch).toBe("baselane/software-engineer-harness");
    const put = (gh.putFile as ReturnType<typeof vi.fn>).mock.calls;
    expect(put.length).toBe(r.fileCount);
    expect(put.every((c) => c[3].branch === "baselane/software-engineer-harness")).toBe(true);
    expect((gh.createBranch as ReturnType<typeof vi.fn>).mock.calls[0]).toEqual([
      "acme", "web", "baselane/software-engineer-harness", "basesha",
    ]);
  });

  it("passes the existing file sha when a file already exists on the base branch", async () => {
    const gh = stubClient({
      getFileSha: vi.fn(async (_o: string, _r: string, path: string) =>
        path === "AGENTS.md" ? "oldsha" : null,
      ),
    });
    await distributePack(gh, "acme/web", harnessPack);
    const agentsPut = (gh.putFile as ReturnType<typeof vi.fn>).mock.calls.find((c) => c[2] === "AGENTS.md");
    expect(agentsPut?.[3].sha).toBe("oldsha");
  });

  it("fails clearly when the baselane branch already exists", async () => {
    const gh = stubClient({
      createBranch: vi.fn(async () => {
        throw new GithubApiError(422, "GitHub API POST /repos/acme/web/git/refs failed: 422");
      }),
    });
    await expect(distributePack(gh, "acme/web", harnessPack)).rejects.toThrow(
      /branch baselane\/software-engineer-harness already exists/,
    );
  });

  it("rejects a malformed repo ref before any network call", async () => {
    const gh = stubClient();
    await expect(distributePack(gh, "not-a-ref", harnessPack)).rejects.toThrow(/owner\/repo/);
    expect((gh.getRepo as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
  });

  it("#16: deletes the created branch when a file commit fails mid-loop (no stranded orphan)", async () => {
    const deleteBranch = vi.fn(async () => {});
    const gh = stubClient({
      putFile: vi.fn(async () => {
        throw new Error("network flake mid-commit");
      }),
      deleteBranch,
    });
    await expect(distributePack(gh, "acme/web", harnessPack)).rejects.toThrow("network flake mid-commit");
    expect(deleteBranch).toHaveBeenCalledWith("acme", "web", "baselane/software-engineer-harness");
  });

  it("#16: deletes the created branch when opening the PR fails", async () => {
    const deleteBranch = vi.fn(async () => {});
    const gh = stubClient({
      createPullRequest: vi.fn(async () => {
        throw new Error("PR API down");
      }),
      deleteBranch,
    });
    await expect(distributePack(gh, "acme/web", harnessPack)).rejects.toThrow("PR API down");
    expect(deleteBranch).toHaveBeenCalledWith("acme", "web", "baselane/software-engineer-harness");
  });

  it("#16: does not delete the branch on a successful distribution", async () => {
    const deleteBranch = vi.fn(async () => {});
    const gh = stubClient({ deleteBranch });
    await distributePack(gh, "acme/web", harnessPack);
    expect(deleteBranch).not.toHaveBeenCalled();
  });

  it("#16: a cleanup failure does not mask the original error", async () => {
    const gh = stubClient({
      putFile: vi.fn(async () => {
        throw new Error("original failure");
      }),
      deleteBranch: vi.fn(async () => {
        throw new Error("cleanup also failed");
      }),
    });
    await expect(distributePack(gh, "acme/web", harnessPack)).rejects.toThrow("original failure");
  });

  // Mirrors PR #608: a repo's existing CLAUDE.md has project-specific content. The old
  // behavior committed the rendered file wholesale, destroying it. distributePack must
  // now read what's on the default branch and merge baselane's block into it.
  it("region-merges ENTRY files against the repo's existing content — never wholesale-replaces it", async () => {
    const existingClaude = "## Key Entities\nBikes, Batteries, Drivers\n\n## Conventions\n- TypeORM migrations\n";
    const gh = stubClient({
      getFileContent: vi.fn(async (_o: string, _r: string, path: string) =>
        path === "CLAUDE.md" ? existingClaude : null,
      ),
    });
    await distributePack(gh, "acme/web", harnessPack);
    const put = (gh.putFile as ReturnType<typeof vi.fn>).mock.calls;
    const claudePut = put.find((c) => c[2] === "CLAUDE.md");
    expect(claudePut?.[3].content).toContain("## Key Entities");
    expect(claudePut?.[3].content).toContain("TypeORM migrations");
    expect(claudePut?.[3].content).toContain("<!-- baselane:start software-engineer-harness@");
    expect(claudePut?.[3].content).toContain("<!-- baselane:end -->");

    // a fully-generated file (not an entry file) still commits the rendered content as-is
    const pack = await loadBuiltinPack("software-engineer-harness");
    const rendered = renderPack(pack);
    const settingsPut = put.find((c) => c[2] === ".claude/settings.json");
    expect(settingsPut?.[3].content).toBe(rendered[".claude/settings.json"]);
  });

  it("has no existing content for an entry file → commits just baselane's block, no fetch-then-merge artifacts", async () => {
    const gh = stubClient(); // getFileContent defaults to null (no existing file)
    await distributePack(gh, "acme/web", harnessPack);
    const put = (gh.putFile as ReturnType<typeof vi.fn>).mock.calls;
    const agentsPut = put.find((c) => c[2] === "AGENTS.md");
    expect(agentsPut?.[3].content).toContain("<!-- baselane:start software-engineer-harness@");
    expect(agentsPut?.[3].content).toContain("generated from workflow-pack software-engineer-harness");
  });

  it("uses resolveEntryContent's answer for an entry file instead of fetching+merging, when provided", async () => {
    const gh = stubClient({ getFileContent: vi.fn(async () => null) });
    const result = await distributePack(gh, "acme/web", harnessPack, {
      resolveEntryContent: (ctx) => (ctx.path === "AGENTS.md" ? "reviewed and approved content" : undefined),
    });
    expect(result.fileCount).toBeGreaterThan(0);
    const put = (gh.putFile as ReturnType<typeof vi.fn>).mock.calls;
    expect(put.find((c) => c[2] === "AGENTS.md")?.[3].content).toBe("reviewed and approved content");
    // resolveEntryContent answered for AGENTS.md, so the default fetch-then-merge never ran for it
    const contentCalls = (gh.getFileContent as ReturnType<typeof vi.fn>).mock.calls;
    expect(contentCalls.some((c) => c[2] === "AGENTS.md")).toBe(false);
    // paths the resolver declines (returns undefined) still fall back to the default merge
    expect(put.find((c) => c[2] === "CLAUDE.md")?.[3].content).toContain("<!-- baselane:start software-engineer-harness@");
    expect(contentCalls.some((c) => c[2] === "CLAUDE.md")).toBe(true);
  });
});

describe("distributeRollout", () => {
  it("creates the rollout branch from the default branch and opens one PR for all packs", async () => {
    const other: WorkflowPack = { ...harnessPack, id: "acme-house-style", version: "1.0.0", title: "Acme house style", agents: [], commands: [], hooks: [] };
    const gh = stubClient();
    const r = await distributeRollout(gh, "acme/web", [harnessPack, other]);
    if ("closed" in r) throw new Error("expected an open result");
    expect(r.branch).toBe("baselane/rollout");
    expect(r.prUrl).toBe("https://github.com/acme/web/pull/9");
    // getRefSha for baselane/rollout succeeds by default (stubClient's default never throws), so
    // this repo is treated as "branch already exists" — createBranch is NOT called here.
    expect((gh.createBranch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
    // AGENTS.md carries both packs' regions
    const put = (gh.putFile as ReturnType<typeof vi.fn>).mock.calls;
    const agentsPut = put.find((c) => c[2] === "AGENTS.md");
    expect(agentsPut?.[3].content).toContain("<!-- baselane:start software-engineer-harness@");
    expect(agentsPut?.[3].content).toContain("<!-- baselane:start acme-house-style@");
  });

  it("creates the rollout branch from the default branch's sha when it doesn't exist yet", async () => {
    const gh = stubClient({
      getRefSha: vi.fn(async (_o: string, _r: string, branch: string) => {
        if (branch === "baselane/rollout") throw new GithubApiError(404, "not found");
        return "basesha";
      }),
    });
    await distributeRollout(gh, "acme/web", [harnessPack]);
    expect((gh.createBranch as ReturnType<typeof vi.fn>).mock.calls[0]).toEqual(["acme", "web", "baselane/rollout", "basesha"]);
  });

  it("reuses the open rollout PR instead of creating a second one", async () => {
    const createPullRequest = vi.fn(async () => ({ url: "https://github.com/acme/web/pull/9", number: 9 }));
    const gh = stubClient({
      listOpenPullRequests: vi.fn(async () => [{ number: 9, headRef: "baselane/rollout", url: "https://github.com/acme/web/pull/9" }]),
      createPullRequest,
    });
    const r = await distributeRollout(gh, "acme/web", [harnessPack]);
    if ("closed" in r) throw new Error("expected an open result");
    expect(r.prUrl).toBe("https://github.com/acme/web/pull/9");
    expect(createPullRequest.mock.calls.length).toBe(0);
  });

  it("skips every putFile call on a second identical update — the rollout branch already matches", async () => {
    const committed = new Map<string, string>();
    const gh = stubClient({
      getFileContent: vi.fn(async (_o: string, _r: string, path: string) => committed.get(path) ?? null),
      putFile: vi.fn(async (_o: string, _r: string, path: string, opts: { content: string }) => {
        committed.set(path, opts.content);
      }),
    });
    await distributeRollout(gh, "acme/web", [harnessPack]);
    (gh.putFile as ReturnType<typeof vi.fn>).mockClear();
    const second = await distributeRollout(gh, "acme/web", [harnessPack]);
    if ("closed" in second) throw new Error("expected an open result");
    expect((gh.putFile as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
  });

  it("closes the PR and deletes the branch when the effective pack set is empty", async () => {
    const closePullRequest = vi.fn(async () => {});
    const deleteBranch = vi.fn(async () => {});
    const gh = stubClient({
      listOpenPullRequests: vi.fn(async () => [{ number: 9, headRef: "baselane/rollout", url: "https://github.com/acme/web/pull/9" }]),
      closePullRequest,
      deleteBranch,
    });
    const r = await distributeRollout(gh, "acme/web", []);
    expect(r).toEqual({ closed: true });
    expect(closePullRequest.mock.calls[0]).toEqual(["acme", "web", 9]);
    expect(deleteBranch.mock.calls[0]).toEqual(["acme", "web", "baselane/rollout"]);
  });

  it("uses resolveEntryContent's answer for an entry file instead of the mechanical merge, when provided", async () => {
    const gh = stubClient({ getFileContent: vi.fn(async () => null) });
    const r = await distributeRollout(gh, "acme/web", [harnessPack], {
      resolveEntryContent: (ctx) => (ctx.path === "AGENTS.md" ? "reviewed and approved content" : undefined),
    });
    if ("closed" in r) throw new Error("expected an open result");
    const put = (gh.putFile as ReturnType<typeof vi.fn>).mock.calls;
    expect(put.find((c) => c[2] === "AGENTS.md")?.[3].content).toBe("reviewed and approved content");
    expect(put.find((c) => c[2] === "CLAUDE.md")?.[3].content).toContain("<!-- baselane:start software-engineer-harness@");
  });

  // Mirrors the real "Remove from rollout" flow: pack B uniquely contributes .claude/agents/b-agent.md.
  // Once B is dropped from the effective set, the old add-only loop left that file on the branch
  // forever — it must now be deleted alongside the other packs' files staying untouched. Orphan
  // deletion is scoped to the PRIOR rollout's own manifest (not a listTree scan of the branch —
  // see the "never deletes a client-authored file" test below), so this fake must let a second
  // distributeRollout call read back the manifest AND the sha of a file baselane itself committed
  // on the first call — both come from the same `committed`/`shas` maps the fake's putFile fills.
  it("deletes a removed pack's orphaned non-entry files from the rollout branch", async () => {
    const committed = new Map<string, string>();
    const shas = new Map<string, string>();
    let nextSha = 0;
    const gh = stubClient({
      getFileContent: vi.fn(async (_o: string, _r: string, path: string) => committed.get(path) ?? null),
      getFileSha: vi.fn(async (_o: string, _r: string, path: string) => shas.get(path) ?? null),
      putFile: vi.fn(async (_o: string, _r: string, path: string, opts: { content: string }) => {
        committed.set(path, opts.content);
        shas.set(path, `sha-${nextSha++}`);
      }),
      deleteFile: vi.fn(async (_o: string, _r: string, path: string) => {
        committed.delete(path);
        shas.delete(path);
      }),
    });

    const bPack: WorkflowPack = {
      ...harnessPack,
      id: "b-pack",
      version: "1.0.0",
      title: "B pack",
      agents: [{ name: "b-agent", description: "b", tools: [], model: "sonnet", prompt: "b" }],
      commands: [],
      hooks: [],
    };

    await distributeRollout(gh, "acme/web", [harnessPack, bPack]);
    expect(committed.has(".claude/agents/b-agent.md")).toBe(true);

    (gh.putFile as ReturnType<typeof vi.fn>).mockClear();
    const deleteFile = gh.deleteFile as ReturnType<typeof vi.fn>;
    const r = await distributeRollout(gh, "acme/web", [harnessPack]);
    if ("closed" in r) throw new Error("expected an open result");

    expect(deleteFile.mock.calls.some((c) => c[2] === ".claude/agents/b-agent.md")).toBe(true);
    expect(committed.has(".claude/agents/b-agent.md")).toBe(false);
    // the surviving pack's own files are untouched
    expect(committed.has("AGENTS.md")).toBe(true);
    expect(deleteFile.mock.calls.some((c) => c[2] === "AGENTS.md")).toBe(false);
  });

  // DATA-SAFETY (the bug this fix closes): the rollout branch is cut from the repo's default
  // branch, so a client's own `.claude/skills/<x>/SKILL.md` — which baselane never wrote — can
  // already be sitting there on the very first rollout. The old implementation derived orphans
  // from a `listTree` scan of the branch, so it saw this file, didn't recognize it as "wanted",
  // and deleted it. Orphan deletion must be scoped to baselane's own prior manifest instead —
  // with no manifest yet (first-ever rollout), nothing may be deleted, no matter what's on the
  // branch's actual tree.
  it("never deletes a client-authored .claude file baselane didn't write, when no prior rollout manifest exists", async () => {
    const deleteFile = vi.fn(async (_o: string, _r: string, _path: string, _opts: { branch: string; message: string; sha: string }) => {});
    const gh = stubClient({
      // Simulates the real branch state: a client file already lives under .claude/, visible via
      // listTree, and there is no .baselane/rollout-manifest.json yet (first-ever rollout).
      listTree: vi.fn(async () => [{ path: ".claude/skills/client-thing/SKILL.md", sha: "client-sha" }]),
      getFileContent: vi.fn(async (_o: string, _r: string, path: string) =>
        path === ".claude/skills/client-thing/SKILL.md" ? "# the client's own skill, baselane never wrote this\n" : null,
      ),
      deleteFile,
    });
    const r = await distributeRollout(gh, "acme/web", [harnessPack]);
    if ("closed" in r) throw new Error("expected an open result");
    expect(deleteFile.mock.calls.some((c) => c[2] === ".claude/skills/client-thing/SKILL.md")).toBe(false);
  });

  // Real orphan cleanup still works once a manifest exists: a prior rollout recorded
  // .claude/agents/old.md as baselane-authored; the new render (dropped pack, or the pack no
  // longer emits that agent) no longer produces it, so it must be deleted.
  it("deletes a path recorded in a prior rollout manifest that the new render no longer produces", async () => {
    const priorManifest = JSON.stringify({ version: 1, paths: [".claude/agents/old.md", "AGENTS.md"] }, null, 2) + "\n";
    const deleteFile = vi.fn(async (_o: string, _r: string, _path: string, _opts: { branch: string; message: string; sha: string }) => {});
    const gh = stubClient({
      getFileContent: vi.fn(async (_o: string, _r: string, path: string) =>
        path === ".baselane/rollout-manifest.json" ? priorManifest : null,
      ),
      getFileSha: vi.fn(async (_o: string, _r: string, path: string) =>
        path === ".claude/agents/old.md" ? "old-sha" : null,
      ),
      deleteFile,
    });
    const r = await distributeRollout(gh, "acme/web", [harnessPack]);
    if ("closed" in r) throw new Error("expected an open result");
    const call = deleteFile.mock.calls.find((c) => c[2] === ".claude/agents/old.md");
    expect(call).toBeTruthy();
    expect(call?.[3]).toMatchObject({ branch: "baselane/rollout", sha: "old-sha" });
  });
});

describe("distributeRollout — computed artifacts (Increment C)", () => {
  it("folds a managed-region artifact (ARCHITECTURE.md) into the rollout, merging against branch-current content", async () => {
    const puts = new Map<string, string>();
    const gh = stubClient({
      getFileContent: vi.fn(async (_o: string, _r: string, path: string) =>
        path === "ARCHITECTURE.md" ? "# Architecture\n\nHand-written prose a dev owns.\n" : null,
      ),
      putFile: vi.fn(async (_o: string, _r: string, path: string, opts: { content: string }) => {
        puts.set(path, opts.content);
      }),
    });

    const r = await distributeRollout(gh, "acme/web", [harnessPack], {
      computedArtifacts: [
        { path: "ARCHITECTURE.md", managedBody: "generated system-map body", regionId: "system-map", regionVersion: "1" },
      ],
    });
    if ("closed" in r) throw new Error("expected an open result");

    const arch = puts.get("ARCHITECTURE.md");
    expect(arch).toContain("Hand-written prose a dev owns."); // prose OUTSIDE the region preserved
    expect(arch).toContain("generated system-map body"); // computed region injected
    expect(arch).toContain("baselane:start system-map@"); // wrapped in managed-region markers
  });

  it("commits a fully-generated artifact (.baselane/wiki/index.md) as-is", async () => {
    const puts = new Map<string, string>();
    const gh = stubClient({
      putFile: vi.fn(async (_o: string, _r: string, path: string, opts: { content: string }) => {
        puts.set(path, opts.content);
      }),
    });

    await distributeRollout(gh, "acme/web", [harnessPack], {
      computedArtifacts: [{ path: ".baselane/wiki/index.md", content: "# Wiki index\n\n- seeded\n" }],
    });

    expect(puts.get(".baselane/wiki/index.md")).toBe("# Wiki index\n\n- seeded\n");
  });

  it("does not fetch or write anything extra when no computed artifacts are passed", async () => {
    const gh = stubClient();
    await distributeRollout(gh, "acme/web", [harnessPack]);
    const put = (gh.putFile as ReturnType<typeof vi.fn>).mock.calls;
    expect(put.some((c) => c[2] === "ARCHITECTURE.md")).toBe(false);
  });
});
