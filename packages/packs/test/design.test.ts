import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { WorkflowPack } from "../src/types.ts";
import { renderDesignMd } from "../src/render/design.ts";
import { renderPack } from "../src/render/render-pack.ts";
import { renderBundleFiles } from "../src/render/bundle.ts";

const SECTIONS = [
  "## Visual theme & atmosphere",
  "## Color palette & roles",
  "## Typography",
  "## Component stylings",
  "## Layout & spacing",
  "## Depth & elevation",
  "## Do's and don'ts",
  "## Responsive behavior",
  "## Agent prompt guide",
];

const demo: WorkflowPack = {
  id: "demo",
  version: "1.0.0",
  title: "Demo loop",
  summary: "A two-step demo workflow.",
  context: { markdown: "## Demo discipline\n\n- Always verify before done.\n" },
  agents: [],
  commands: [],
  hooks: [],
};

function repoDesignPack(config?: Record<string, string>): WorkflowPack {
  return { ...demo, capabilities: [{ type: "design", store: "repo", method: "author", ...(config ? { config } : {}) }] };
}

function orgDesignPack(config?: Record<string, string>): WorkflowPack {
  return { ...demo, capabilities: [{ type: "design", store: "org", method: "author", ...(config ? { config } : {}) }] };
}

describe("renderDesignMd", () => {
  it("produces all 9 Stitch sections and reflects the given tokens", () => {
    const md = renderDesignMd({
      type: "design",
      store: "repo",
      method: "author",
      config: { brandColor: "#FF5C28", fontDisplay: "Inter", theme: "dark" },
    });
    for (const heading of SECTIONS) expect(md).toContain(heading);
    expect(md).toContain("#FF5C28");
    expect(md).toContain("Inter");
    expect(md).toContain("This project ships a single mode: dark.");
  });

  it("reflects the radius token in the component stylings' derived scale", () => {
    const md = renderDesignMd({
      type: "design",
      store: "repo",
      method: "author",
      config: { radius: "12" },
    });
    // sm/md/lg are all derived from the radius token — 6, 12, 24 for radius:12.
    expect(md).toContain("sm 6 · md 12 · lg 24");
  });

  it("reflects the fontBody token, independent of fontDisplay", () => {
    const md = renderDesignMd({
      type: "design",
      store: "repo",
      method: "author",
      config: { fontDisplay: "Inter", fontBody: "Source Serif 4" },
    });
    expect(md).toContain("Display face: **Inter**");
    expect(md).toContain("Body face: **Source Serif 4**");
  });

  it("reflects the mood token in the visual theme section", () => {
    const md = renderDesignMd({
      type: "design",
      store: "repo",
      method: "author",
      config: { mood: "playful, bold, energetic" },
    });
    expect(md).toContain("Mood: playful, bold, energetic.");
  });

  it("produces all 9 sections with sensible defaults and does not crash on empty config", () => {
    const md = renderDesignMd({ type: "design", store: "repo", method: "author" });
    for (const heading of SECTIONS) expect(md).toContain(heading);
    expect(md).toContain("Design light and dark as two considered modes");
  });

  it("golds a demo pack's DESIGN.md for stability", async () => {
    const md = renderDesignMd({
      type: "design",
      store: "repo",
      method: "author",
      config: { brandColor: "#4F46E5", fontDisplay: "Inter", fontBody: "Inter", radius: "8", theme: "both" },
    });
    const dir = join(dirname(fileURLToPath(import.meta.url)), "__snapshots__");
    await expect(md).toMatchFileSnapshot(join(dir, "design-demo.DESIGN.md"));
  });
});

describe("design capability wiring", () => {
  it("store:repo, method:author adds DESIGN.md to the repo file map and marks it provisioned", () => {
    const files = renderPack(repoDesignPack({ brandColor: "#FF5C28" }));
    expect(files["DESIGN.md"]).toContain("#FF5C28");
    expect(files["AGENTS.md"]).toContain("design · repo · author — provisioned");
    expect(files["AGENTS.md"]).toContain("### Design");
  });

  it("store:org, method:author adds DESIGN.md to the bundle, not the repo file map", () => {
    const bundle = renderBundleFiles(orgDesignPack());
    expect(bundle["DESIGN.md"]).toContain("## Visual theme & atmosphere");

    const files = renderPack(orgDesignPack());
    expect(files["DESIGN.md"]).toBeUndefined();
  });

  it("store:org, method:author records the manifest as provisioned but omits the AGENTS.md note (bug #37.1: org-store scaffolds only the laptop bundle, never this repo)", () => {
    const files = renderPack(orgDesignPack());
    expect(files["AGENTS.md"]).toContain("design · org · author — provisioned");
    expect(files["AGENTS.md"]).not.toContain("### Design");
  });

  it("method:analyze scaffolds a DESIGN.md skeleton (9 TODO-marked sections) + /design-analyze command, marked provisioned", () => {
    const pack: WorkflowPack = {
      ...demo,
      capabilities: [{ type: "design", store: "repo", method: "analyze", config: { url: "https://example.com" } }],
    };
    const files = renderPack(pack);
    expect(files["AGENTS.md"]).toContain("design · repo · analyze — provisioned");
    expect(files["DESIGN.md"]).toContain("skeleton — run `/design-analyze`");
    expect(files["DESIGN.md"]).toContain("https://example.com");
    for (const heading of SECTIONS) expect(files["DESIGN.md"]).toContain(heading);
    expect(files["DESIGN.md"]).toContain("<!-- TODO(design-analyze):");
    expect(files[".claude/commands/design-analyze.md"]).toContain("https://example.com");
  });

  it("method:analyze with no config.url still renders a skeleton, naming the missing config instead of crashing", () => {
    const pack: WorkflowPack = { ...demo, capabilities: [{ type: "design", store: "repo", method: "analyze" }] };
    const files = renderPack(pack);
    expect(files["DESIGN.md"]).toContain("no url configured");
  });

  it("method:import parses a nested DTCG-ish tokens JSON into the real 9-section DESIGN.md, marked provisioned", () => {
    const tokens = JSON.stringify({ color: { brand: "#FF5C28" }, font: { display: "Poppins" }, radius: "12" });
    const pack: WorkflowPack = {
      ...demo,
      capabilities: [{ type: "design", store: "org", method: "import", config: { tokens } }],
    };
    const files = renderPack(pack);
    const bundle = renderBundleFiles(pack);
    expect(files["AGENTS.md"]).toContain("design · org · import — provisioned");
    expect(files["DESIGN.md"]).toBeUndefined();
    expect(bundle["DESIGN.md"]).toContain("#FF5C28");
    expect(bundle["DESIGN.md"]).toContain("Poppins");
    expect(bundle["DESIGN.md"]).toContain("sm 6 · md 12 · lg 24");
  });

  it("method:import parses a flat css-var tokens map", () => {
    const tokens = JSON.stringify({ "--brand": "#111827", "--font-display": "Georgia" });
    const pack: WorkflowPack = {
      ...demo,
      capabilities: [{ type: "design", store: "repo", method: "import", config: { tokens } }],
    };
    const files = renderPack(pack);
    expect(files["DESIGN.md"]).toContain("#111827");
    expect(files["DESIGN.md"]).toContain("Georgia");
  });

  it("method:import falls back to defaults with a visible note when tokens isn't valid JSON, never crashes", () => {
    const pack: WorkflowPack = {
      ...demo,
      capabilities: [{ type: "design", store: "repo", method: "import", config: { tokens: "{not json" } }],
    };
    const files = renderPack(pack);
    expect(files["DESIGN.md"]).toContain("could not be parsed as valid JSON");
    for (const heading of SECTIONS) expect(files["DESIGN.md"]).toContain(heading);
  });

  it("method:import with no tokens configured at all renders the plain defaults, no parse-error note", () => {
    const pack: WorkflowPack = { ...demo, capabilities: [{ type: "design", store: "repo", method: "import" }] };
    const files = renderPack(pack);
    expect(files["DESIGN.md"]).not.toContain("could not be parsed");
    for (const heading of SECTIONS) expect(files["DESIGN.md"]).toContain(heading);
  });
});

describe("design capability: an unimplemented method still stays honest", () => {
  it("records the capability and renders 'coming soon', with no DESIGN.md file", () => {
    const pack: WorkflowPack = { ...demo, capabilities: [{ type: "design", store: "repo", method: "figma-sync" }] };
    const files = renderPack(pack);
    expect(files["AGENTS.md"]).toContain("design · repo · figma-sync — coming soon");
    expect(files["DESIGN.md"]).toBeUndefined();
  });
});
