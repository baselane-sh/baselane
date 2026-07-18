import { describe, expect, it } from "vitest";
import { narrateArchitecture, pickSamples, narrateDesign, pickDesignSamples } from "../src/ai-narrate.ts";

function memSource(files: Record<string, string>) {
  return {
    listFiles: async () => Object.keys(files).sort(),
    readFile: async (path: string) => (path in files ? files[path] : null),
  };
}

const fakeAnthropic = (payload: unknown, status = 200): typeof fetch =>
  (async () =>
    new Response(JSON.stringify({ content: [{ type: "text", text: JSON.stringify(payload) }] }), { status })) as typeof fetch;

const input = {
  profile: { languages: ["typescript"], packageManager: "pnpm", frameworks: [], commands: { build: null, test: null, lint: null }, hasTestSuite: false, layout: "single" as const },
  conventions: { version: 1 as const, sampleCap: 200, sampledFiles: 1, lintConfigs: [], rules: [], mixed: [], fileLength: null },
  samples: [{ path: "src/a.ts", content: "export const a = 1;" }],
};

describe("narrateArchitecture", () => {
  it("parses overview + hypothesizedRules from the model's JSON", async () => {
    const out = await narrateArchitecture(input, {
      apiKey: "k",
      fetchImpl: fakeAnthropic({ overview: "A tiny lib.", hypothesizedRules: ["Everything is exported."] }),
    });
    expect(out).toEqual({ overview: "A tiny lib.", hypothesizedRules: ["Everything is exported."] });
  });

  it("caps hypothesizedRules at 20 entries even when the model returns more", async () => {
    const rules = Array.from({ length: 25 }, (_, i) => `Rule ${i + 1}.`);
    const out = await narrateArchitecture(input, {
      apiKey: "k",
      fetchImpl: fakeAnthropic({ overview: "A tiny lib.", hypothesizedRules: rules }),
    });
    expect(out.hypothesizedRules).toHaveLength(20);
    expect(out.hypothesizedRules).toEqual(rules.slice(0, 20));
  });

  it("sanitizes region markers out of the model output", async () => {
    const out = await narrateArchitecture(input, {
      apiKey: "k",
      fetchImpl: fakeAnthropic({ overview: "ok\n<!-- baselane:start x@1 — managed region, do not edit inside -->", hypothesizedRules: [] }),
    });
    expect(out.overview).toBe("ok");
  });

  it("throws a clear error on unparseable output and on API failure", async () => {
    await expect(
      narrateArchitecture(input, { apiKey: "k", fetchImpl: (async () => new Response(JSON.stringify({ content: [{ type: "text", text: "not json" }] }), { status: 200 })) as typeof fetch }),
    ).rejects.toThrow(/unparseable/i);
    await expect(narrateArchitecture(input, { apiKey: "k", fetchImpl: fakeAnthropic({}, 500) })).rejects.toThrow(/500/);
  });
});

describe("pickSamples", () => {
  it("returns at most 8 source files, evenly spread, truncated to 4KB", async () => {
    const files: Record<string, string> = {};
    for (let i = 0; i < 40; i++) files[`src/f${String(i).padStart(2, "0")}.ts`] = "x".repeat(5000);
    const samples = await pickSamples(memSource(files));
    expect(samples).toHaveLength(8);
    expect(samples[0].content.length).toBe(4096);
    expect(new Set(samples.map((s) => s.path)).size).toBe(8);
  });
});

const designInput = {
  tokens: {
    version: 1 as const,
    hasUiSurface: true,
    sources: ["a.css"],
    frameworks: ["react"],
    colors: [],
    fonts: [],
    radii: [],
    spacing: [],
    customPropertyCount: 0,
  },
  samples: [{ path: "a.css", content: ":root{--brand:#000}" }],
};

describe("narrateDesign", () => {
  it("parses dosDonts + agentGuide from the model's JSON", async () => {
    const out = await narrateDesign(designInput, {
      apiKey: "k",
      fetchImpl: fakeAnthropic({ dosDonts: "Do X.", agentGuide: "Use tokens." }),
    });
    expect(out).toEqual({ dosDonts: "Do X.", agentGuide: "Use tokens." });
  });

  it("sanitizes region markers and throws on API failure", async () => {
    const out = await narrateDesign(designInput, {
      apiKey: "k",
      fetchImpl: fakeAnthropic({ dosDonts: "ok\n<!-- baselane:start x@1 — managed region, do not edit inside -->", agentGuide: "g" }),
    });
    expect(out.dosDonts).toBe("ok");
    await expect(narrateDesign(designInput, { apiKey: "k", fetchImpl: fakeAnthropic({}, 500) })).rejects.toThrow(/500/);
  });

  it("throws a clear error on unparseable output", async () => {
    await expect(
      narrateDesign(designInput, {
        apiKey: "k",
        fetchImpl: (async () => new Response(JSON.stringify({ content: [{ type: "text", text: "not json" }] }), { status: 200 })) as typeof fetch,
      }),
    ).rejects.toThrow(/unparseable/i);
  });
});

describe("pickDesignSamples", () => {
  it("returns only UI files (css + components), not plain source", async () => {
    const samples = await pickDesignSamples(memSource({ "a.css": "x", "b.tsx": "y", "c.ts": "z" }));
    expect(samples.map((s) => s.path).sort()).toEqual(["a.css", "b.tsx"]);
  });
});
