// packages/packs/test/manifest.test.ts
import { describe, it, expect } from "vitest";
import { validateManifest, buildManifest, MANIFEST_PATH, LEGACY_MANIFEST_PATH, KNOWN_CAPABILITIES, type HarnessManifest } from "../src/manifest.ts";

const good = {
  version: 1,
  registry: "https://baselane.acme.internal",
  target: { kind: "repo", id: "acme/checkout" },
  packs: { "@acme/base": "1.4.0", "github:obra/superpowers": "v6.1.1" },
  capabilities: { "system-map": { focus: ["security"] } },
  materialized: {
    vendored: [{ path: ".claude/skills/tdd/SKILL.md", sha256: null }],
    managedRegions: [{ path: "AGENTS.md", regions: [] }],
    derivedCommitted: [],
    resolutions: {},
    capabilities: {},
  },
};

describe("validateManifest", () => {
  it("accepts a full manifest and returns a normalized copy (not the same object)", () => {
    const m = validateManifest(good);
    expect(m).toEqual(good);
    expect(m).not.toBe(good);
    expect(m.packs).not.toBe(good.packs);
  });
  it("normalizes absent registry/capabilities/materialized to null/{}/empty lists", () => {
    const m = validateManifest({ version: 1, target: { kind: "repo", id: "o/r" }, packs: { a: "1.0.0" } });
    expect(m.registry).toBeNull();
    expect(m.capabilities).toEqual({});
    expect(m.materialized).toEqual({ vendored: [], managedRegions: [], derivedCommitted: [], resolutions: {}, capabilities: {} });
  });
  it("rejects non-objects, wrong version, bad target kind, empty target id", () => {
    expect(() => validateManifest(null)).toThrow(/manifest/i);
    expect(() => validateManifest("x")).toThrow(/manifest/i);
    expect(() => validateManifest({ ...good, version: 2 })).toThrow(/version/i);
    expect(() => validateManifest({ ...good, target: { kind: "cloud", id: "x" } })).toThrow(/target/i);
    expect(() => validateManifest({ ...good, target: { kind: "repo", id: "" } })).toThrow(/target/i);
  });
  it("rejects empty pack names, empty pins, and non-string pins (exact pins only)", () => {
    expect(() => validateManifest({ ...good, packs: { "": "1.0.0" } })).toThrow(/pack/i);
    expect(() => validateManifest({ ...good, packs: { a: "" } })).toThrow(/pack/i);
    expect(() => validateManifest({ ...good, packs: { a: 1 } })).toThrow(/pack/i);
  });
  it("accepts both pack-source name forms (registry-scoped and git-ref)", () => {
    const m = validateManifest({ version: 1, target: { kind: "machine", id: "mo-mbp" }, packs: { "@acme/base": "1.0.0", "github:o/r": "v1" } });
    expect(Object.keys(m.packs)).toHaveLength(2);
    expect(m.target.kind).toBe("machine");
  });
  it("deep-copies capabilities — mutating the input after validation does not affect the result", () => {
    const raw = { version: 1, target: { kind: "repo", id: "o/r" }, packs: { a: "1.0.0" }, capabilities: { "system-map": { focus: ["security"] } } };
    const m = validateManifest(raw);
    expect(m.capabilities["system-map"]).not.toBe(raw.capabilities["system-map"]);
    (raw.capabilities["system-map"] as { focus: string[] }).focus.push("performance");
    expect((m.capabilities["system-map"] as { focus: string[] }).focus).toEqual(["security"]);
  });
});

describe("buildManifest", () => {
  it("splits materializedPaths into vendored vs managed regions via isEntryFile", () => {
    const m = buildManifest({
      target: { kind: "repo", id: "o/r" },
      packs: { "@acme/base": "1.4.0" },
      materializedPaths: ["AGENTS.md", ".claude/skills/tdd/SKILL.md", ".claude/settings.json"],
    });
    expect(m.materialized.managedRegions).toEqual([{ path: "AGENTS.md", regions: [] }]);
    expect(m.materialized.vendored).toEqual([
      { path: ".claude/settings.json", sha256: null },
      { path: ".claude/skills/tdd/SKILL.md", sha256: null },
    ]);
    expect(m.materialized.derivedCommitted).toEqual([]);
    expect(m.registry).toBeNull();
    expect(m.version).toBe(1);
  });
  it("produces output that validateManifest accepts unchanged (round-trip)", () => {
    const m = buildManifest({ target: { kind: "repo", id: "o/r" }, packs: { a: "1.0.0" } });
    expect(validateManifest(m)).toEqual(m);
  });
  it("exposes the canonical manifest path", () => {
    expect(MANIFEST_PATH).toBe("harness.json");
  });
  it("exposes the legacy manifest path for migration", () => {
    expect(LEGACY_MANIFEST_PATH).toBe(".baselane/harness.json");
  });
});

describe("manifest receipt v2", () => {
  it("normalizes legacy string[] vendored/managedRegions and absent resolutions", () => {
    const m = validateManifest({
      version: 1,
      target: { kind: "repo", id: "acme/checkout" },
      packs: { "@acme/base": "1.4.0" },
      materialized: { vendored: [".claude/skills/a/SKILL.md"], managedRegions: ["AGENTS.md"] },
    });
    expect(m.materialized.vendored).toEqual([{ path: ".claude/skills/a/SKILL.md", sha256: null }]);
    expect(m.materialized.managedRegions).toEqual([{ path: "AGENTS.md", regions: [] }]);
    expect(m.materialized.resolutions).toEqual({});
  });

  it("accepts and round-trips the v2 receipt shape", () => {
    const receipt = {
      vendored: [{ path: ".claude/skills/a/SKILL.md", sha256: "ab".repeat(32) }],
      managedRegions: [{ path: "AGENTS.md", regions: [{ packId: "sec", version: "2.0.1", sha256: "cd".repeat(32) }] }],
      derivedCommitted: [],
      resolutions: { "github:obra/superpowers": { ref: "v6.1.1", sha: "9".repeat(40), packId: "superpowers" } },
      capabilities: {},
    };
    const m = validateManifest({
      version: 1,
      target: { kind: "machine", id: "my-laptop" },
      packs: { "github:obra/superpowers": "v6.1.1" },
      materialized: receipt,
    });
    expect(m.materialized).toEqual(receipt);
    // round-trip: validate(validate(x)) is identity
    expect(validateManifest(m)).toEqual(m);
  });

  it("rejects malformed v2 entries with a reason", () => {
    const base = { version: 1, target: { kind: "repo", id: "r" }, packs: {} };
    expect(() => validateManifest({ ...base, materialized: { vendored: [{ path: "", sha256: null }] } })).toThrow(/vendored/);
    expect(() => validateManifest({ ...base, materialized: { vendored: [{ path: "a", sha256: 5 }] } })).toThrow(/vendored/);
    expect(() => validateManifest({ ...base, materialized: { managedRegions: [{ path: "AGENTS.md", regions: [{ packId: "", version: "1", sha256: "x" }] }] } })).toThrow(/managedRegions/);
    expect(() => validateManifest({ ...base, materialized: { resolutions: { g: { ref: "", sha: "s", packId: "p" } } } })).toThrow(/resolutions/);
  });

  it("buildManifest with a receipt uses it verbatim; without one keeps S1 path-split behavior", () => {
    const receipt = {
      vendored: [{ path: ".claude/x.md", sha256: "ee".repeat(32) }],
      managedRegions: [{ path: "AGENTS.md", regions: [] }],
      derivedCommitted: [],
      resolutions: {},
      capabilities: {},
    };
    const withReceipt = buildManifest({ target: { kind: "repo", id: "r" }, packs: {}, receipt });
    expect(withReceipt.materialized).toEqual(receipt);

    const legacy = buildManifest({ target: { kind: "repo", id: "r" }, packs: {}, materializedPaths: ["AGENTS.md", ".claude/x.md"] });
    expect(legacy.materialized.vendored).toEqual([{ path: ".claude/x.md", sha256: null }]);
    expect(legacy.materialized.managedRegions).toEqual([{ path: "AGENTS.md", regions: [] }]);
  });
});

describe("capability receipts", () => {
  it("KNOWN_CAPABILITIES lists the exact known capability names", () => {
    expect(KNOWN_CAPABILITIES).toEqual(["system-map", "wiki", "graph"]);
  });

  it("round-trips materialized.capabilities normalized", () => {
    const raw = {
      version: 1,
      target: { kind: "repo", id: "o/r" },
      packs: {},
      materialized: {
        capabilities: {
          "system-map": {
            sourceSha: "abc",
            generatedTs: "2026-07-17T00:00:00.000Z",
            paths: [{ path: "ARCHITECTURE.md", sha256: "aa" }],
          },
        },
      },
    };
    const m = validateManifest(raw);
    expect(m.materialized.capabilities).toEqual(raw.materialized.capabilities);
    expect(validateManifest(m)).toEqual(m);
  });

  it("normalizes absent materialized.capabilities to {} (legacy manifests unchanged)", () => {
    const m = validateManifest({
      version: 1,
      target: { kind: "repo", id: "acme/checkout" },
      packs: { "@acme/base": "1.4.0" },
      materialized: { vendored: [".claude/skills/a/SKILL.md"], managedRegions: ["AGENTS.md"] },
    });
    expect(m.materialized.capabilities).toEqual({});
  });

  it("rejects invalid capability receipt shapes", () => {
    const base = { version: 1, target: { kind: "repo", id: "r" }, packs: {} };
    expect(() =>
      validateManifest({ ...base, materialized: { capabilities: [] } })
    ).toThrow(/capabilities/);
    expect(() =>
      validateManifest({
        ...base,
        materialized: { capabilities: { "system-map": { sourceSha: "abc", paths: [{ path: "ARCHITECTURE.md", sha256: "aa" }] } } },
      })
    ).toThrow(/capabilities/);
    expect(() =>
      validateManifest({
        ...base,
        materialized: {
          capabilities: {
            "system-map": { sourceSha: "abc", generatedTs: "2026-07-17T00:00:00.000Z", paths: [{ path: "ARCHITECTURE.md" }] },
          },
        },
      })
    ).toThrow(/capabilities/);
    expect(() =>
      validateManifest({
        ...base,
        materialized: {
          capabilities: {
            "system-map": { sourceSha: 42, generatedTs: "2026-07-17T00:00:00.000Z", paths: [{ path: "ARCHITECTURE.md", sha256: "aa" }] },
          },
        },
      })
    ).toThrow(/capabilities/);
  });

  it("accepts sourceSha: null as valid", () => {
    const m = validateManifest({
      version: 1,
      target: { kind: "repo", id: "o/r" },
      packs: {},
      materialized: {
        capabilities: {
          wiki: { sourceSha: null, generatedTs: "2026-07-17T00:00:00.000Z", paths: [{ path: "WIKI.md", sha256: "bb" }] },
        },
      },
    });
    expect(m.materialized.capabilities.wiki.sourceSha).toBeNull();
  });

  it("buildManifest puts input.capabilities at top level (not hardcoded {})", () => {
    const m = buildManifest({ target: { kind: "repo", id: "o/r" }, packs: {}, capabilities: { wiki: {} } });
    expect(m.capabilities).toEqual({ wiki: {} });
  });
});
