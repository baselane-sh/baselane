import { describe, expect, it } from "vitest";
import { builtinPacksDir, listBuiltinPacks, loadBuiltinPack } from "../src/load.ts";

describe("built-in pack loader", () => {
  it("lists the shipped packs sorted by id, hiding retired (aliased) ids", async () => {
    const ids = await listBuiltinPacks();
    expect(ids).toEqual([
      "database-review",
      "disciplined-workflow",
      "frontend-design",
      "frontend-taste",
      "full-harness",
      "go-rules",
      "python-rules",
      "second-brain",
      "security-review",
      "software-engineer-harness",
      "systematic-debugging",
      "token-efficiency-harness",
      "typescript-rules",
    ]);
    expect(ids).not.toContain("test-loop");
  });

  it("loads and validates a shipped pack", async () => {
    const pack = await loadBuiltinPack("software-engineer-harness");
    expect(pack.id).toBe("software-engineer-harness");
    expect(pack.context.markdown.length).toBeGreaterThan(0);
  });

  it("resolves a retired pack id to its successor via the alias map", async () => {
    const pack = await loadBuiltinPack("test-loop");
    expect(pack.id).toBe("software-engineer-harness");
  });

  it("rejects an unknown or unsafe id", async () => {
    await expect(loadBuiltinPack("nope")).rejects.toThrow(/unknown pack/);
    await expect(loadBuiltinPack("../evil")).rejects.toThrow(/unknown pack/);
  });

  it("points builtinPacksDir at a real directory", async () => {
    expect(builtinPacksDir().endsWith("packs")).toBe(true);
  });
});
