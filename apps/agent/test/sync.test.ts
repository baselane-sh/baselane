import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sync } from "../src/sync.ts";
import { main } from "../src/cli.ts";

let root = "";
let bundlePath = "";
// sync() always consults BASELANE_CLAUDE_SETTINGS now (even when the bundle carries no
// settings.json, to check for stale hooks to prune) — point every test at a scratch path
// under the per-test tmp dir so none of them ever read or write the real developer's
// ~/.claude/settings.json. Tests that exercise the settings merge explicitly override this
// with their own tmp dir and restore it in a finally block.
const originalBaselaneClaudeSettings = process.env.BASELANE_CLAUDE_SETTINGS;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "baselane-sync-"));
  bundlePath = join(root, "bundle.json");
  process.env.BASELANE_CLAUDE_SETTINGS = join(root, "home-settings.json");
  await mkdir(join(root, "claude"), { recursive: true });
  await writeFile(join(root, "claude", "keep.txt"), "MINE", "utf8"); // unmanaged
  await writeFile(
    bundlePath,
    JSON.stringify({
      version: 1,
      files: {
        "agents/checker.md": "CHECKER-V1",
        "commands/tdd-task.md": "TDD-V1",
      },
    }),
    "utf8",
  );
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
  if (originalBaselaneClaudeSettings === undefined) delete process.env.BASELANE_CLAUDE_SETTINGS;
  else process.env.BASELANE_CLAUDE_SETTINGS = originalBaselaneClaudeSettings;
});

const target = () => join(root, "claude");

describe("sync", () => {
  it("first run installs the bundle and writes the manifest", async () => {
    const r = await sync({ bundlePath, targetDir: target() });
    expect(r.applied).toBe(true);
    expect(r.plan.writes).toEqual(["agents/checker.md", "commands/tdd-task.md"]);
    expect(await readFile(join(target(), "agents/checker.md"), "utf8")).toBe("CHECKER-V1");
  });

  it("second run with the same bundle is a no-op (idempotent)", async () => {
    await sync({ bundlePath, targetDir: target() });
    const r2 = await sync({ bundlePath, targetDir: target() });
    expect(r2.plan.writes).toEqual([]);
    expect(r2.plan.deletes).toEqual([]);
    expect(r2.plan.unchanged).toEqual(["agents/checker.md", "commands/tdd-task.md"]);
  });

  it("never touches unmanaged files across runs", async () => {
    await sync({ bundlePath, targetDir: target() });
    await sync({ bundlePath, targetDir: target() });
    expect(await readFile(join(target(), "keep.txt"), "utf8")).toBe("MINE");
  });

  it("dry-run reports the plan but writes nothing", async () => {
    const r = await sync({ bundlePath, targetDir: target(), dryRun: true });
    expect(r.applied).toBe(false);
    expect(r.plan.writes).toHaveLength(2);
    await expect(readFile(join(target(), "agents/checker.md"), "utf8")).rejects.toThrow();
  });

  it("merges a bundled settings.json into BASELANE_CLAUDE_SETTINGS instead of the manifest path", async () => {
    const settingsDir = await mkdtemp(join(tmpdir(), "baselane-settings-"));
    const settingsPath = join(settingsDir, "settings.json");
    const prev = process.env.BASELANE_CLAUDE_SETTINGS;
    process.env.BASELANE_CLAUDE_SETTINGS = settingsPath;
    try {
      await writeFile(
        bundlePath,
        JSON.stringify({
          version: 1,
          files: {
            "agents/checker.md": "CHECKER-V1",
            "settings.json": JSON.stringify({
              hooks: { PostToolUse: [{ matcher: "Edit", hooks: [{ type: "command", command: "pnpm -s test" }] }] },
            }),
          },
        }),
        "utf8",
      );
      const r = await sync({ bundlePath, targetDir: target() });
      // settings.json is never manifest-managed: not written under targetDir, not in the plan.
      expect(r.plan.writes).toEqual(["agents/checker.md"]);
      await expect(readFile(join(target(), "settings.json"), "utf8")).rejects.toThrow();

      const merged = JSON.parse(await readFile(settingsPath, "utf8"));
      expect(merged.hooks.PostToolUse[0].hooks[0].command).toBe("BASELANE_MANAGED=1 pnpm -s test");
    } finally {
      await rm(settingsDir, { recursive: true, force: true });
      if (prev === undefined) delete process.env.BASELANE_CLAUDE_SETTINGS;
      else process.env.BASELANE_CLAUDE_SETTINGS = prev;
    }
  });

  it("a second sync preserves the developer's own settings keys and hooks", async () => {
    const settingsDir = await mkdtemp(join(tmpdir(), "baselane-settings-"));
    const settingsPath = join(settingsDir, "settings.json");
    const prev = process.env.BASELANE_CLAUDE_SETTINGS;
    process.env.BASELANE_CLAUDE_SETTINGS = settingsPath;
    try {
      await writeFile(
        settingsPath,
        JSON.stringify({
          model: "opus",
          hooks: { PostToolUse: [{ matcher: "Edit", hooks: [{ type: "command", command: "echo mine" }] }] },
        }),
        "utf8",
      );
      await writeFile(
        bundlePath,
        JSON.stringify({
          version: 1,
          files: {
            "settings.json": JSON.stringify({
              hooks: { PostToolUse: [{ matcher: "Edit", hooks: [{ type: "command", command: "pnpm -s test" }] }] },
            }),
          },
        }),
        "utf8",
      );
      await sync({ bundlePath, targetDir: target() });
      await sync({ bundlePath, targetDir: target() });
      const merged = JSON.parse(await readFile(settingsPath, "utf8"));
      expect(merged.model).toBe("opus");
      expect(merged.hooks.PostToolUse).toEqual([
        { matcher: "Edit", hooks: [{ type: "command", command: "echo mine" }] },
        { matcher: "Edit", hooks: [{ type: "command", command: "BASELANE_MANAGED=1 pnpm -s test" }] },
      ]);
    } finally {
      await rm(settingsDir, { recursive: true, force: true });
      if (prev === undefined) delete process.env.BASELANE_CLAUDE_SETTINGS;
      else process.env.BASELANE_CLAUDE_SETTINGS = prev;
    }
  });

  it("a bundle that drops settings.json prunes stale BASELANE_MANAGED hooks but keeps the developer's own hooks and keys", async () => {
    const settingsDir = await mkdtemp(join(tmpdir(), "baselane-settings-"));
    const settingsPath = join(settingsDir, "settings.json");
    const prev = process.env.BASELANE_CLAUDE_SETTINGS;
    process.env.BASELANE_CLAUDE_SETTINGS = settingsPath;
    try {
      await writeFile(
        settingsPath,
        JSON.stringify({
          model: "opus",
          hooks: { PostToolUse: [{ matcher: "Edit", hooks: [{ type: "command", command: "echo mine" }] }] },
        }),
        "utf8",
      );
      await writeFile(
        bundlePath,
        JSON.stringify({
          version: 1,
          files: {
            "settings.json": JSON.stringify({
              hooks: {
                PostToolUse: [{ matcher: "Edit|Write", hooks: [{ type: "command", command: "pnpm -s test" }] }],
              },
            }),
          },
        }),
        "utf8",
      );
      await sync({ bundlePath, targetDir: target() });
      const withHooks = JSON.parse(await readFile(settingsPath, "utf8"));
      expect(withHooks.hooks.PostToolUse).toContainEqual({
        matcher: "Edit|Write",
        hooks: [{ type: "command", command: "BASELANE_MANAGED=1 pnpm -s test" }],
      });

      // Org switches to a pack with no hooks: the synced bundle drops the settings.json
      // key entirely (not an empty hooks object). Stale managed entries must be pruned.
      await writeFile(bundlePath, JSON.stringify({ version: 1, files: {} }), "utf8");
      await sync({ bundlePath, targetDir: target() });
      const pruned = JSON.parse(await readFile(settingsPath, "utf8"));
      expect(pruned.model).toBe("opus");
      expect(pruned.hooks.PostToolUse).toEqual([
        { matcher: "Edit", hooks: [{ type: "command", command: "echo mine" }] },
      ]);
    } finally {
      await rm(settingsDir, { recursive: true, force: true });
      if (prev === undefined) delete process.env.BASELANE_CLAUDE_SETTINGS;
      else process.env.BASELANE_CLAUDE_SETTINGS = prev;
    }
  });

  it("malformed existing settings.json is left byte-identical, not clobbered, when a pack has hooks to merge", async () => {
    const settingsDir = await mkdtemp(join(tmpdir(), "baselane-settings-"));
    const settingsPath = join(settingsDir, "settings.json");
    const prev = process.env.BASELANE_CLAUDE_SETTINGS;
    process.env.BASELANE_CLAUDE_SETTINGS = settingsPath;
    const malformed = "{ this is not valid json, permissions: [oops";
    try {
      await writeFile(settingsPath, malformed, "utf8");
      await writeFile(
        bundlePath,
        JSON.stringify({
          version: 1,
          files: {
            "settings.json": JSON.stringify({
              hooks: { PostToolUse: [{ matcher: "Edit", hooks: [{ type: "command", command: "pnpm -s test" }] }] },
            }),
          },
        }),
        "utf8",
      );
      // Must not throw — a malformed developer settings file is a reason to skip the merge,
      // not to fail the whole sync (the rest of the bundle should still apply).
      const r = await sync({ bundlePath, targetDir: target() });
      expect(r.applied).toBe(true);
      expect(await readFile(settingsPath, "utf8")).toBe(malformed);
    } finally {
      await rm(settingsDir, { recursive: true, force: true });
      if (prev === undefined) delete process.env.BASELANE_CLAUDE_SETTINGS;
      else process.env.BASELANE_CLAUDE_SETTINGS = prev;
    }
  });

  it("never creates a settings file when none existed and the bundle has no hooks", async () => {
    const settingsDir = await mkdtemp(join(tmpdir(), "baselane-settings-"));
    const settingsPath = join(settingsDir, "settings.json"); // deliberately never created
    const prev = process.env.BASELANE_CLAUDE_SETTINGS;
    process.env.BASELANE_CLAUDE_SETTINGS = settingsPath;
    try {
      // bundlePath from beforeEach has no "settings.json" key.
      await sync({ bundlePath, targetDir: target() });
      await expect(readFile(settingsPath, "utf8")).rejects.toThrow();
    } finally {
      await rm(settingsDir, { recursive: true, force: true });
      if (prev === undefined) delete process.env.BASELANE_CLAUDE_SETTINGS;
      else process.env.BASELANE_CLAUDE_SETTINGS = prev;
    }
  });

  it("removing a file from the bundle deletes it on the next sync, reporting drift edits", async () => {
    await sync({ bundlePath, targetDir: target() });
    await writeFile(join(target(), "commands/tdd-task.md"), "LOCAL EDIT", "utf8");
    await writeFile(
      bundlePath,
      JSON.stringify({ version: 1, files: { "agents/checker.md": "CHECKER-V1" } }),
      "utf8",
    );
    const r = await sync({ bundlePath, targetDir: target() });
    expect(r.plan.deletes).toEqual(["commands/tdd-task.md"]);
    expect(r.plan.drifted).toEqual(["commands/tdd-task.md"]);
    await expect(readFile(join(target(), "commands/tdd-task.md"), "utf8")).rejects.toThrow();
  });
});

describe("cli main", () => {
  it("runs a sync and returns 0", async () => {
    const code = await main(["sync", "--bundle", bundlePath, "--target", target()]);
    expect(code).toBe(0);
    expect(await readFile(join(target(), "agents/checker.md"), "utf8")).toBe("CHECKER-V1");
  });

  it("returns 1 on unknown command or missing args", async () => {
    expect(await main(["nope"])).toBe(1);
    expect(await main(["sync", "--bundle", bundlePath])).toBe(1);
  });

  it("sync --portal pulls the bundle and writes it", async () => {
    const prev = process.env.BASELANE_PORTAL_TOKEN;
    process.env.BASELANE_PORTAL_TOKEN = "org_tok";
    const dir = await mkdtemp(join(tmpdir(), "baselane-portal-sync-"));
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ version: 1, files: { "agents/a.md": "A" } }), { status: 200 })) as typeof fetch;
    const code = await main(["sync", "--portal", "https://p.io", "--target", dir], { fetchImpl });
    expect(code).toBe(0);
    expect(await readFile(join(dir, "agents/a.md"), "utf8")).toBe("A");
    await rm(dir, { recursive: true, force: true });
    if (prev === undefined) delete process.env.BASELANE_PORTAL_TOKEN;
    else process.env.BASELANE_PORTAL_TOKEN = prev;
  });

  it("sync --portal without the token, or with both sources, fails with usage", async () => {
    const prev = process.env.BASELANE_PORTAL_TOKEN;
    delete process.env.BASELANE_PORTAL_TOKEN;
    expect(await main(["sync", "--portal", "https://p.io", "--target", "/tmp/x"])).toBe(1);
    process.env.BASELANE_PORTAL_TOKEN = "t";
    expect(await main(["sync", "--portal", "https://p.io", "--bundle", "b.json", "--target", "/tmp/x"])).toBe(1);
    if (prev === undefined) delete process.env.BASELANE_PORTAL_TOKEN;
    else process.env.BASELANE_PORTAL_TOKEN = prev;
  });

  it("pair runs the device flow, opens the browser, and writes config", async () => {
    const dir = await mkdtemp(join(tmpdir(), "baselane-pair-"));
    const cfgPath = join(dir, "agent.json");
    const opened: string[] = [];
    let call = 0;
    const fetchImpl = (async (input: RequestInfo | URL) => {
      const u = String(input);
      if (u.endsWith("/api/device/start")) return new Response(JSON.stringify({ userCode: "ABCD-1234", deviceCode: "dc_x", verifyUrl: "/app/devices", pollInterval: 5 }), { status: 200 });
      call++;
      return new Response(JSON.stringify(call === 1 ? { status: "pending" } : { status: "approved", deviceToken: "devtok_secret" }), { status: 200 });
    }) as typeof fetch;
    const code = await main(
      ["pair", "--portal", "https://p.io", "--target", join(dir, "claude"), "--name", "MacBook"],
      { fetchImpl, openUrl: async (u: string) => { opened.push(u); }, sleep: async () => {}, nowMs: () => 0, configPath: cfgPath },
    );
    expect(code).toBe(0);
    expect(opened[0]).toBe("https://p.io/app/devices");
    const { readConfig } = await import("../src/config.ts");
    expect((await readConfig(cfgPath))?.deviceToken).toBe("devtok_secret");
    await rm(dir, { recursive: true, force: true });
  });

  it("run --once reads config and syncs the pulled bundle", async () => {
    const dir = await mkdtemp(join(tmpdir(), "baselane-run-"));
    const cfgPath = join(dir, "agent.json");
    const target = join(dir, "claude");
    const { writeConfig } = await import("../src/config.ts");
    await writeConfig(cfgPath, { portalUrl: "https://p.io", deviceToken: "devtok_x", targetDir: target });
    // /api/assignments 404s (portal without the route) → legacy /api/bundle fallback path.
    const fetchImpl = (async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/assignments")) return new Response("nf", { status: 404 });
      return new Response(JSON.stringify({ version: 1, files: { "agents/a.md": "A" } }), { status: 200 });
    }) as typeof fetch;
    const code = await main(["run", "--once"], { fetchImpl, configPath: cfgPath });
    expect(code).toBe(0);
    expect(await readFile(join(target, "agents/a.md"), "utf8")).toBe("A");
    await rm(dir, { recursive: true, force: true });
  });

  it("run --dry-run previews without writing and returns without looping, even without --once (#3)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "baselane-run-"));
    const cfgPath = join(dir, "agent.json");
    const target = join(dir, "claude");
    const { writeConfig } = await import("../src/config.ts");
    await writeConfig(cfgPath, { portalUrl: "https://p.io", deviceToken: "devtok_x", targetDir: target });
    // /api/assignments 404s (portal without the route) → legacy /api/bundle fallback path.
    const fetchImpl = (async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/assignments")) return new Response("nf", { status: 404 });
      return new Response(JSON.stringify({ version: 1, files: { "agents/a.md": "A" } }), { status: 200 });
    }) as typeof fetch;
    const code = await main(["run", "--dry-run"], { fetchImpl, configPath: cfgPath });
    expect(code).toBe(0);
    await expect(readFile(join(target, "agents/a.md"), "utf8")).rejects.toThrow();
    await rm(dir, { recursive: true, force: true });
  });

  it("run with no config tells the user to pair first", async () => {
    const dir = await mkdtemp(join(tmpdir(), "baselane-nocfg-"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await main(["run", "--once"], { configPath: join(dir, "none.json") })).toBe(1);
    expect(err.mock.calls.flat().join("\n")).toMatch(/pair/i);
    err.mockRestore();
    await rm(dir, { recursive: true, force: true });
  });

  it("the continuous daemon retries transient errors instead of exiting (#17)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "baselane-run-"));
    const cfgPath = join(dir, "agent.json");
    const target = join(dir, "claude");
    const { writeConfig } = await import("../src/config.ts");
    await writeConfig(cfgPath, { portalUrl: "https://p.io", deviceToken: "devtok_x", targetDir: target });
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    let attempts = 0;
    // Two transient blips (whichever endpoint is hit first) then recovery via the legacy
    // /api/bundle fallback path (assignments 404s — portal without the route).
    const fetchImpl = (async (input: RequestInfo | URL) => {
      attempts += 1;
      if (attempts <= 2) throw new Error("ECONNREFUSED");
      if (String(input).includes("/api/assignments")) return new Response("nf", { status: 404 });
      return new Response(JSON.stringify({ version: 1, files: { "agents/a.md": "A" } }), { status: 200 });
    }) as typeof fetch;
    // Terminate the otherwise-infinite loop: throw a sentinel from the 3rd sleep (2 backoff sleeps
    // after the failures + 1 post-success interval sleep). The OLD code would have returned 1 on the
    // first failure — never reaching a 3rd sleep or a successful fetch.
    let sleeps = 0;
    const sleep = async () => {
      if (++sleeps >= 3) throw new Error("stop-loop");
    };
    await expect(main(["run"], { fetchImpl, sleep, configPath: cfgPath })).rejects.toThrow("stop-loop");
    expect(attempts).toBeGreaterThanOrEqual(3); // survived 2 failures and reached a successful sync
    expect(await readFile(join(target, "agents/a.md"), "utf8")).toBe("A");
    err.mockRestore();
    await rm(dir, { recursive: true, force: true });
  });

  it("the daemon still exits fatally on a 401 (revoked device), not retried (#17)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "baselane-run-"));
    const cfgPath = join(dir, "agent.json");
    const { writeConfig } = await import("../src/config.ts");
    await writeConfig(cfgPath, { portalUrl: "https://p.io", deviceToken: "devtok_x", targetDir: join(dir, "claude") });
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchImpl = (async () => new Response("nope", { status: 401 })) as typeof fetch;
    const code = await main(["run"], { fetchImpl, sleep: async () => {}, configPath: cfgPath });
    expect(code).toBe(2); // revoked = fatal, daemon exits rather than looping forever
    err.mockRestore();
    await rm(dir, { recursive: true, force: true });
  });
});
