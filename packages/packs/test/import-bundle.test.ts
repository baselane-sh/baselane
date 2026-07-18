import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { validatePack } from "../src/validate.ts";
import { importBundle } from "../scripts/import-bundle.ts";

const fixture = fileURLToPath(new URL("./fixtures/mini-bundle", import.meta.url));

describe("importBundle", () => {
  it("emits a single validatePack-passing pack from a mixed flat+.claude bundle", async () => {
    const { pack } = await importBundle(fixture, {
      id: "mini",
      title: "Mini bundle",
      summary: "Fixture bundle for the importer test.",
      source: "acme/mini",
      url: "https://github.com/acme/mini",
      category: "write",
    });
    // The returned pack is already validated internally; re-validating must not throw.
    expect(() => validatePack(pack)).not.toThrow();
    expect(pack.id).toBe("mini");
  });

  it("imports a flat skill with governance frontmatter, license attribution, and a flattened reference", async () => {
    const { pack } = await importBundle(fixture, { id: "mini", source: "acme/mini", url: "https://github.com/acme/mini" });
    const alpha = pack.skills?.find((s) => s.name === "alpha");
    expect(alpha).toBeDefined();
    expect(alpha?.userInvocable).toBe(false);
    expect(alpha?.allowedTools).toEqual(["Bash(npx foo *)", "Read"]);
    expect(alpha?.attribution).toEqual({ source: "acme/mini", url: "https://github.com/acme/mini", license: "MIT" });
    expect(alpha?.body).toContain("Body line one.");
    // Nested alpha/refs/deep.md flattens to a one-level slug reference.
    const deep = alpha?.references?.find((r) => r.name === "deep");
    expect(deep?.body).toContain("Nested reference content.");
  });

  it("flags a skill with no declared license instead of fabricating attribution", async () => {
    const { pack, warnings } = await importBundle(fixture, { id: "mini", source: "acme/mini", url: "https://github.com/acme/mini" });
    const beta = pack.skills?.find((s) => s.name === "beta");
    expect(beta).toBeDefined();
    expect(beta?.attribution).toBeUndefined();
    expect(warnings.some((w) => w.includes("beta") && /licen/i.test(w))).toBe(true);
  });

  it("drops a non-markdown sidecar and records it as a warning", async () => {
    const { warnings } = await importBundle(fixture, { id: "mini" });
    expect(warnings.some((w) => w.includes("data.json"))).toBe(true);
  });

  it("imports an agent's nested mcpServers and defaults absent tools to an empty array", async () => {
    const { pack } = await importBundle(fixture, { id: "mini" });
    const critic = pack.agents.find((a) => a.name === "critic");
    expect(critic).toBeDefined();
    expect(critic?.tools).toEqual([]);
    expect(critic?.mcpServers).toEqual({ playwright: { command: "npx", args: ["@playwright/mcp@latest"] } });
  });

  it("discovers agents and commands under a nested agents/ or commands/ dir, not only .claude/", async () => {
    const { pack } = await importBundle(fixture, { id: "mini" });
    expect(pack.agents.map((a) => a.name).sort()).toEqual(["critic", "helper"]);
    expect(pack.commands.map((c) => c.name).sort()).toEqual(["deploy", "run"]);
    const helper = pack.agents.find((a) => a.name === "helper");
    expect(helper?.tools).toEqual(["Read", "Bash"]);
  });

  it("collapses a multi-line command body into a single-line prompt and flags it", async () => {
    const { pack, warnings } = await importBundle(fixture, { id: "mini" });
    const run = pack.commands.find((c) => c.name === "run");
    expect(run).toBeDefined();
    expect(run?.prompt.includes("\n")).toBe(false);
    expect(run?.prompt).toContain("Do step one.");
    expect(run?.prompt).toContain("Then do step two.");
    expect(warnings.some((w) => w.includes("run") && /multi-line|single line/i.test(w))).toBe(true);
  });

  it("folds top-level rule docs into the pack context markdown", async () => {
    const { pack } = await importBundle(fixture, { id: "mini" });
    expect(pack.context.markdown).toContain("Prefer clarity over cleverness.");
  });
});
