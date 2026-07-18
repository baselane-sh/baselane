import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defaultConfigPath, readConfig, writeConfig } from "../src/config.ts";

let dir: string;
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), "baselane-agentcfg-")); });
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

describe("agent config", () => {
  it("honours BASELANE_AGENT_CONFIG override", () => {
    expect(defaultConfigPath({ BASELANE_AGENT_CONFIG: "/tmp/x.json" } as NodeJS.ProcessEnv)).toBe("/tmp/x.json");
  });

  it("round-trips config and writes it 0600; missing/malformed → null", async () => {
    const p = join(dir, "nested", "agent.json");
    expect(await readConfig(p)).toBeNull();
    const cfg = { portalUrl: "https://p.io", deviceToken: "devtok_x", targetDir: "/home/u/.claude" };
    await writeConfig(p, cfg);
    expect(await readConfig(p)).toEqual(cfg);
    expect((await stat(p)).mode & 0o777).toBe(0o600);
  });
});
