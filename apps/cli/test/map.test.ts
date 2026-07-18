import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { platform, tmpdir } from "node:os";
import { join } from "node:path";
import { runMap, formatMapSummary } from "../src/map.ts";
import { main } from "../src/cli.ts";
import { vi } from "vitest";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "baselane-map-"));
  await mkdir(join(dir, "src"), { recursive: true });
  await writeFile(join(dir, "package.json"), JSON.stringify({ name: "x", packageManager: "pnpm@10.0.0", scripts: { test: "vitest run" }, devDependencies: { vitest: "^2.0.0" } }));
  await writeFile(join(dir, "pnpm-lock.yaml"), ""); // minimal lock file for detect package manager
  await writeFile(join(dir, "src", "a.ts"), 'export const a = "1";\n');
  await writeFile(join(dir, "src", "b.ts"), 'import { a } from "./a.ts";\nexport const b = a;\n');
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("runMap", () => {
  it("writes ARCHITECTURE.md (managed region) + report.json", async () => {
    const result = await runMap(dir);
    expect(result.written).toEqual(["ARCHITECTURE.md", ".baselane/system-map/report.json"]);
    const md = await readFile(join(dir, "ARCHITECTURE.md"), "utf8");
    expect(md).toContain("<!-- baselane:start system-map@1");
    expect(md).toContain("## Conventions & hidden rules");
    const report = JSON.parse(await readFile(join(dir, ".baselane/system-map/report.json"), "utf8"));
    expect(report.conventions.version).toBe(1);
    expect(report.profile.packageManager).toBe("pnpm");
  });

  it("preserves human prose outside the managed region on regeneration", async () => {
    await writeFile(join(dir, "ARCHITECTURE.md"), "# My notes\n\nHand-written intro.\n");
    await runMap(dir);
    const first = await readFile(join(dir, "ARCHITECTURE.md"), "utf8");
    expect(first).toContain("Hand-written intro.");
    await runMap(dir); // second run must be stable, still one region
    const second = await readFile(join(dir, "ARCHITECTURE.md"), "utf8");
    expect(second).toContain("Hand-written intro.");
    expect(second.match(/baselane:start system-map@1/g)).toHaveLength(1);
  });

  it("includes narration when provided and never writes in dry-run", async () => {
    const dry = await runMap(dir, { dryRun: true, narration: { overview: "Tiny lib.", hypothesizedRules: [] } });
    expect(dry.written).toEqual([]);
    expect(dry.architectureMd).toContain("## Architecture notes (AI-generated)");
    expect(dry.architectureMd).toContain("Tiny lib.");
    await expect(readFile(join(dir, "ARCHITECTURE.md"), "utf8")).rejects.toThrow();
  });

  it.skipIf(platform() === "win32")(
    "rejects (never clobbers) when an existing ARCHITECTURE.md can't be read for a non-ENOENT reason",
    async () => {
      const archPath = join(dir, "ARCHITECTURE.md");
      const originalProse = "# My notes\n\nHand-written intro that must survive.\n";
      await writeFile(archPath, originalProse);
      // write-only (no read) so the read fails with EACCES while a naive write would still
      // succeed and clobber the file — the scenario the ENOENT-only-swallow fix must prevent.
      await chmod(archPath, 0o200);
      try {
        await expect(runMap(dir)).rejects.toThrow();
      } finally {
        await chmod(archPath, 0o644);
      }
      const stillThere = await readFile(archPath, "utf8");
      expect(stillThere).toBe(originalProse);
    },
  );

  it("formatMapSummary reports rules and hidden rules", async () => {
    const result = await runMap(dir);
    const summary = formatMapSummary(result);
    expect(summary).toContain("baselane map");
    expect(summary).toMatch(/rules: \d+ \(\d+ hidden\)/);
    expect(summary).toContain("Wrote: ARCHITECTURE.md");
  });
});

describe("runMap DESIGN.md", () => {
  it("writes DESIGN.md (managed region) when a UI surface is detected", async () => {
    await writeFile(join(dir, "src", "theme.css"), ":root{--color-brand:#4F46E5;--radius-md:8px;}\n");
    const result = await runMap(dir);
    expect(result.written).toContain("DESIGN.md");
    expect(result.tokens.hasUiSurface).toBe(true);
    const md = await readFile(join(dir, "DESIGN.md"), "utf8");
    expect(md).toContain("<!-- baselane:start design@1");
    expect(md).toContain("## Color palette & roles");
    expect(md).toContain("`--color-brand`");
  });

  it("skips DESIGN.md when no UI surface exists", async () => {
    const result = await runMap(dir); // base fixture: no css / no UI deps
    expect(result.written).not.toContain("DESIGN.md");
    expect(result.designMd).toBeNull();
    await expect(readFile(join(dir, "DESIGN.md"), "utf8")).rejects.toThrow();
  });

  it("preserves prose outside the DESIGN.md managed region on regeneration", async () => {
    await writeFile(join(dir, "src", "theme.css"), ":root{--color-brand:#4F46E5;}\n");
    await writeFile(join(dir, "DESIGN.md"), "# Design\n\nHand-written brand notes.\n");
    await runMap(dir);
    const after = await readFile(join(dir, "DESIGN.md"), "utf8");
    expect(after).toContain("Hand-written brand notes.");
    expect(after.match(/baselane:start design@1/g)).toHaveLength(1);
  });
});

it("map --llm without a key exits 1 with guidance and never calls fetch", async () => {
  const err = vi.spyOn(console, "error").mockImplementation(() => {});
  const fetchSpy = vi.fn();
  const prevAnthropic = process.env.BASELANE_ANTHROPIC_KEY;
  const prevAnthropicApi = process.env.ANTHROPIC_API_KEY;
  delete process.env.BASELANE_ANTHROPIC_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    const code = await main(["map", dir, "--llm"], { fetchImpl: fetchSpy as unknown as typeof fetch });
    expect(code).toBe(1);
    expect(err.mock.calls.flat().join("\n")).toMatch(/BASELANE_ANTHROPIC_KEY/);
    expect(fetchSpy).not.toHaveBeenCalled();
  } finally {
    err.mockRestore();
    if (prevAnthropic !== undefined) process.env.BASELANE_ANTHROPIC_KEY = prevAnthropic;
    if (prevAnthropicApi !== undefined) process.env.ANTHROPIC_API_KEY = prevAnthropicApi;
  }
});
