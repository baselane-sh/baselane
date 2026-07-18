import { describe, expect, it } from "vitest";
import { validatePack } from "../src/validate.ts";
import { renderPack } from "../src/render/render-pack.ts";
import { renderBundleFiles } from "../src/render/bundle.ts";

const prov = { componentId: "cmp_ab12cd34", version: 3 };

const base = {
  id: "prov-pack",
  version: "1.0.0",
  title: "Prov",
  summary: "s",
  context: { markdown: "ctx" },
  agents: [{ name: "reviewer", description: "Reviews.", tools: ["Read"], model: "sonnet", prompt: "Go." }],
  commands: [{ name: "ship", description: "Ships.", argument_hint: "[t]", prompt: "Ship it." }],
  hooks: [{ event: "Stop", matcher: "", description: "d", action: "print-reminder", message: "hi" }],
  capabilities: [{ type: "graph", store: "repo", method: "imports" }],
};

function withProvenance() {
  return {
    ...base,
    agents: [{ ...base.agents[0], provenance: prov }],
    commands: [{ ...base.commands[0], provenance: prov }],
    hooks: [{ ...base.hooks[0], provenance: prov }],
    capabilities: [{ ...base.capabilities[0], provenance: prov }],
  };
}

describe("block provenance", () => {
  it("validatePack round-trips provenance on every block type", () => {
    const pack = validatePack(withProvenance());
    expect(pack.agents[0].provenance).toEqual(prov);
    expect(pack.commands[0].provenance).toEqual(prov);
    expect(pack.hooks[0].provenance).toEqual(prov);
    expect(pack.capabilities?.[0]?.provenance).toEqual(prov);
  });

  it("packs without provenance are unchanged — the key is omitted, not null", () => {
    const pack = validatePack(base);
    expect("provenance" in pack.agents[0]).toBe(false);
    expect("provenance" in pack.commands[0]).toBe(false);
    expect("provenance" in pack.hooks[0]).toBe(false);
    expect("provenance" in (pack.capabilities?.[0] ?? {})).toBe(false);
  });

  it("rejects malformed provenance on every block type", () => {
    expect(() => validatePack({ ...base, agents: [{ ...base.agents[0], provenance: { componentId: 5, version: 1 } }] }))
      .toThrow(/agents\[0\]\.provenance\.componentId/);
    expect(() => validatePack({ ...base, commands: [{ ...base.commands[0], provenance: { componentId: "cmp_x" } }] }))
      .toThrow(/commands\[0\]\.provenance\.version/);
    expect(() => validatePack({ ...base, hooks: [{ ...base.hooks[0], provenance: { componentId: "cmp_x", version: "3" } }] }))
      .toThrow(/hooks\[0\]\.provenance\.version/);
    expect(() => validatePack({ ...base, capabilities: [{ ...base.capabilities[0], provenance: "cmp_x" }] }))
      .toThrow(/capabilities\[0\]\.provenance/);
  });

  it("renders byte-identically with and without provenance (repo files AND bundle)", () => {
    const plain = validatePack(base);
    const provd = validatePack(withProvenance());
    expect(renderPack(provd)).toEqual(renderPack(plain));
    expect(renderBundleFiles(provd)).toEqual(renderBundleFiles(plain));
  });
});
