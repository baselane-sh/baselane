import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runDraftPack, formatDraftSummary } from "../src/draft-pack.ts";

let dir: string;
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), "baselane-draftpack-cli-")); });
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

async function write(rel: string, content: string) {
  const abs = join(dir, rel);
  await mkdir(join(abs, ".."), { recursive: true });
  await writeFile(abs, content, "utf8");
}

describe("runDraftPack", () => {
  it("composes a validated pack from a local repo", async () => {
    await write("package.json", '{"name":"widgets","scripts":{"test":"vitest run"}}');
    await write("src/a.ts", 'import { b } from "./b.ts";\nconst a = "x";\n');
    await write("src/b.ts", 'export const b = "y";\n');

    const result = await runDraftPack(dir);
    expect(result.pack.id.length).toBeGreaterThan(0);
    expect(result.pack.commands.some((c) => c.name === "test")).toBe(true);
    expect(result.pack.capabilities?.some((c) => c.type === "system-map")).toBe(true);
    expect(result.pack.context.markdown).toContain("## Conventions");

    const summary = formatDraftSummary(result);
    expect(summary).toContain("baselane draft-pack");
    expect(summary).toContain("system-map");
  });
});
