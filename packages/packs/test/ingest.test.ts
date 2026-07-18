import { describe, expect, it } from "vitest";
import { validatePack } from "../src/validate.ts";
import { mergeManagedRegion } from "../src/merge-region.ts";
import { ingestHarness, type IngestInput } from "../src/ingest.ts";

/** In-memory IngestInput backed by a plain path→content map — the harness never touches disk. */
function makeInput(repoName: string, files: Record<string, string>): IngestInput {
  const map = new Map(Object.entries(files));
  return {
    repoName,
    async listFiles() {
      return [...map.keys()];
    },
    async readFile(path: string) {
      return map.has(path) ? (map.get(path) as string) : null;
    },
  };
}

const AGENTS_MD = mergeManagedRegion(
  "# AGENTS.md\n\nOur team ships in small batches and always writes a test first.\n",
  "This managed body belongs to baselane and must never survive ingestion.",
  "some-pack",
  "1.0.0",
);

const SKILL_MD = [
  "---",
  "name: foo",
  "description: Does the foo thing end to end.",
  "---",
  "",
  "Do the foo thing carefully.",
  "",
].join("\n");

const SKILL_REF_MD = "Reference detail for foo.\n";

const AGENT_MD = [
  "---",
  "name: bar",
  "description: Reviews the diff for bar things.",
  "tools: Read, Grep",
  "model: sonnet",
  "---",
  "",
  "You review the diff for bar things.",
  "",
].join("\n");

const COMMAND_MD = [
  "---",
  "description: Runs baz.",
  "argument-hint: [target]",
  "---",
  "",
  "Run baz on $ARGUMENTS.",
  "",
].join("\n");

const SETTINGS_JSON = JSON.stringify(
  {
    hooks: {
      PostToolUse: [{ matcher: "Edit|Write", hooks: [{ type: "command", command: "pnpm test" }] }],
      Stop: [{ matcher: "", hooks: [{ type: "command", command: `echo ${JSON.stringify("Remember to run tests.")}` }] }],
    },
  },
  null,
  2,
);

const FULL_FIXTURE: Record<string, string> = {
  "AGENTS.md": AGENTS_MD,
  ".claude/skills/foo/SKILL.md": SKILL_MD,
  ".claude/skills/foo/ref.md": SKILL_REF_MD,
  ".claude/agents/bar.md": AGENT_MD,
  ".claude/commands/baz.md": COMMAND_MD,
  ".claude/settings.json": SETTINGS_JSON,
};

describe("ingestHarness", () => {
  it("reads a full rendered harness back into a validatePack-passing pack", async () => {
    const input = makeInput("Acme/My Repo", FULL_FIXTURE);
    const result = await ingestHarness(input);

    expect(() => validatePack(result.pack)).not.toThrow();
    expect(result.skipped).toEqual([]);
  });

  it("slugifies the repo name into the pack id", async () => {
    const input = makeInput("Acme/My Repo", FULL_FIXTURE);
    const { pack } = await ingestHarness(input);
    expect(pack.id).toBe("acme-my-repo");
  });

  it("strips the baselane managed region from AGENTS.md but keeps the client's own prose", async () => {
    const input = makeInput("acme-repo", FULL_FIXTURE);
    const { pack } = await ingestHarness(input);
    expect(pack.context.markdown).toContain("Our team ships in small batches");
    expect(pack.context.markdown).not.toContain("This managed body belongs to baselane");
    expect(pack.context.markdown).not.toContain("baselane:start");
  });

  it("ingests the skill with its sibling reference file", async () => {
    const input = makeInput("acme-repo", FULL_FIXTURE);
    const { pack } = await ingestHarness(input);
    expect(pack.skills).toHaveLength(1);
    const foo = pack.skills?.[0];
    expect(foo?.name).toBe("foo");
    expect(foo?.description).toBe("Does the foo thing end to end.");
    expect(foo?.category).toBe("write");
    expect(foo?.references).toHaveLength(1);
    expect(foo?.references?.[0].name).toBe("ref");
    expect(foo?.references?.[0].body).toContain("Reference detail for foo.");
  });

  it("ingests the agent", async () => {
    const input = makeInput("acme-repo", FULL_FIXTURE);
    const { pack } = await ingestHarness(input);
    expect(pack.agents).toHaveLength(1);
    expect(pack.agents[0]).toMatchObject({
      name: "bar",
      description: "Reviews the diff for bar things.",
      tools: ["Read", "Grep"],
      model: "sonnet",
    });
    expect(pack.agents[0].prompt).toContain("You review the diff for bar things.");
  });

  it("ingests the command", async () => {
    const input = makeInput("acme-repo", FULL_FIXTURE);
    const { pack } = await ingestHarness(input);
    expect(pack.commands).toHaveLength(1);
    expect(pack.commands[0]).toMatchObject({
      name: "baz",
      description: "Runs baz.",
      argument_hint: "[target]",
    });
    expect(pack.commands[0].prompt).toContain("Run baz on $ARGUMENTS.");
  });

  it("classifies settings.json hooks into run-command and print-reminder", async () => {
    const input = makeInput("acme-repo", FULL_FIXTURE);
    const { pack } = await ingestHarness(input);
    expect(pack.hooks).toHaveLength(2);
    const runCommand = pack.hooks.find((h) => h.action === "run-command");
    const reminder = pack.hooks.find((h) => h.action === "print-reminder");
    expect(runCommand).toMatchObject({ event: "PostToolUse", matcher: "Edit|Write", action: "run-command", command: "pnpm test" });
    expect(runCommand?.description.length).toBeGreaterThan(0);
    expect(reminder).toMatchObject({ event: "Stop", matcher: "", action: "print-reminder", message: "Remember to run tests." });
    expect(reminder?.description.length).toBeGreaterThan(0);
  });

  it("lists every ingested file in sources", async () => {
    const input = makeInput("acme-repo", FULL_FIXTURE);
    const { sources } = await ingestHarness(input);
    expect(sources).toEqual(
      expect.arrayContaining([
        "AGENTS.md",
        ".claude/skills/foo/SKILL.md",
        ".claude/skills/foo/ref.md",
        ".claude/agents/bar.md",
        ".claude/commands/baz.md",
        ".claude/settings.json",
      ]),
    );
  });

  it("produces a placeholder context.markdown and an otherwise-empty valid pack when nothing is present", async () => {
    const input = makeInput("empty-repo", {});
    const { pack, sources, skipped } = await ingestHarness(input);
    expect(() => validatePack(pack)).not.toThrow();
    expect(pack.context.markdown.length).toBeGreaterThan(0);
    expect(pack.agents).toEqual([]);
    expect(pack.commands).toEqual([]);
    expect(pack.hooks).toEqual([]);
    expect(sources).toEqual([]);
    expect(skipped).toEqual([]);
  });

  it("lands a malformed settings.json in skipped without throwing, and still returns a valid pack", async () => {
    const input = makeInput("acme-repo", {
      "AGENTS.md": "# AGENTS.md\n\nJust some prose.\n",
      ".claude/settings.json": "{ this is not valid json",
    });
    const result = await ingestHarness(input);
    expect(() => validatePack(result.pack)).not.toThrow();
    expect(result.skipped).toContain(".claude/settings.json");
    expect(result.pack.hooks).toEqual([]);
  });
});
