// docs-site/src/manifest-examples.ts — every example here is run through the REAL
// `validateManifest` (packages/packs/src/manifest.ts) in docs-site/test/manifest-examples.test.ts:
// a `valid: true` entry must not throw, a `valid: false` entry must throw. This is what keeps the
// harness.json reference page from drifting away from what the manifest actually accepts.

export interface ManifestExample {
  title: string;
  json: unknown;
  valid: boolean;
  note: string;
}

export const manifestExamples: ManifestExample[] = [
  {
    title: "Minimal valid repo manifest",
    valid: true,
    note:
      "The smallest manifest validateManifest accepts: version 1, a repo target, and one exact pack pin. " +
      "registry/capabilities/materialized are all optional and default to null/{}/empty lists.",
    json: {
      version: 1,
      registry: null,
      target: { kind: "repo", id: "wrkflw" },
      packs: { "github:baselane/disciplined-workflow": "v1.4.0" },
    },
  },
  {
    title: "Machine (global, -g) target manifest",
    valid: true,
    note:
      "`baselane install -g` writes here instead of a repo: target.kind is \"machine\" and target.id is " +
      "the hostname (targetLocation() in packages/materialize/src/manifest-io.ts). Lives at " +
      "~/.baselane/harness.json, materializing into ~/.claude/.",
    json: {
      version: 1,
      registry: null,
      target: { kind: "machine", id: "mohammads-macbook" },
      packs: { "github:baselane/second-brain": "v1.0.0" },
    },
  },
  {
    title: "Registry + git pack pins together",
    valid: true,
    note:
      "A manifest can mix pin styles: a `github:owner/repo` key pinned to a git ref/tag, and a " +
      "`@scope/name` key pinned to an exact registry version. Pins are always exact strings — " +
      "manifest pins never carry a range.",
    json: {
      version: 1,
      registry: "https://registry.baselane.sh",
      target: { kind: "repo", id: "wrkflw" },
      packs: {
        "github:baselane/frontend-taste": "main",
        "@baselane/second-brain": "1.2.0",
      },
    },
  },
  {
    title: "Capabilities declared",
    valid: true,
    note:
      "`capabilities` is a free-form object (validated only as JSON-serializable) — it holds whatever " +
      "per-target capability configuration a pack's install left behind, distinct from " +
      "`materialized.capabilities`, which is the receipt of what got written.",
    json: {
      version: 1,
      registry: null,
      target: { kind: "repo", id: "wrkflw" },
      packs: { "github:baselane/second-brain": "v1.0.0" },
      capabilities: { wiki: { store: "repo", method: "baselane" } },
    },
  },
  {
    title: "Materialized receipt: vendored files with sha256",
    valid: true,
    note:
      "`materialized.vendored` is the v2 shape — {path, sha256} pairs, one per vendored file. " +
      "`baselane drift` compares the file currently on disk's hash against this receipt to detect " +
      "modification. A pre-M2 install may still have the legacy string-only shape (sha256: null).",
    json: {
      version: 1,
      registry: null,
      target: { kind: "repo", id: "wrkflw" },
      packs: { "github:baselane/second-brain": "v1.0.0" },
      materialized: {
        vendored: [
          { path: ".claude/skills/second-brain/SKILL.md", sha256: "a".repeat(64) },
          { path: ".claude/agents/librarian.md", sha256: "b".repeat(64) },
        ],
      },
    },
  },
  {
    title: "Materialized receipt: managed regions with per-pack versions",
    valid: true,
    note:
      "`materialized.managedRegions` covers content-preserving files (AGENTS.md, CLAUDE.md, ...) baselane " +
      "merges into rather than clobbers. Each entry's `regions` array records, per contributing pack, " +
      "the pack version and a sha256 of the region body — drift on either dimension is `version-drift` " +
      "or `content-drift` respectively.",
    json: {
      version: 1,
      registry: null,
      target: { kind: "repo", id: "wrkflw" },
      packs: { "github:baselane/disciplined-workflow": "v1.4.0" },
      materialized: {
        managedRegions: [
          {
            path: "AGENTS.md",
            regions: [{ packId: "disciplined-workflow", version: "1.4.0", sha256: "c".repeat(64) }],
          },
        ],
      },
    },
  },
  {
    title: "Materialized receipt: resolutions + capabilities receipt",
    valid: true,
    note:
      "`materialized.resolutions` records, per pack name, exactly what the pin resolved to at install " +
      "time (ref, sha, packId) — the audit trail behind the pin. `materialized.capabilities` records what " +
      "a centrally-computed capability (system-map/wiki/graph) wrote: a source sha, a generation " +
      "timestamp, and the hashed paths it produced.",
    json: {
      version: 1,
      registry: null,
      target: { kind: "repo", id: "wrkflw" },
      packs: { "github:baselane/second-brain": "v1.0.0" },
      materialized: {
        resolutions: {
          "github:baselane/second-brain": { ref: "v1.0.0", sha: "d".repeat(40), packId: "second-brain" },
        },
        capabilities: {
          "system-map": {
            sourceSha: "e".repeat(40),
            generatedTs: "2026-07-17T00:00:00.000Z",
            paths: [{ path: "ARCHITECTURE.md", sha256: "f".repeat(64) }],
          },
        },
      },
    },
  },
  {
    title: "INVALID — unsupported version",
    valid: false,
    note:
      "`version` must be exactly the number 1 (validateManifest: `unsupported version ... expected 1`). " +
      "There is no v2 manifest format yet.",
    json: {
      version: 2,
      registry: null,
      target: { kind: "repo", id: "wrkflw" },
      packs: {},
    },
  },
  {
    title: "INVALID — empty pack pin",
    valid: false,
    note:
      "A pack pin must be a non-empty string — manifest pins are exact pins only, and an empty string " +
      "pins nothing. validateManifest rejects it rather than silently treating it as \"latest\".",
    json: {
      version: 1,
      registry: null,
      target: { kind: "repo", id: "wrkflw" },
      packs: { "github:baselane/second-brain": "" },
    },
  },
  {
    title: "INVALID — bad materialized shape",
    valid: false,
    note:
      "`materialized.vendored` entries must be either a plain string path (legacy) or a " +
      "{path, sha256} object — a bare number is neither, so validateManifest rejects it.",
    json: {
      version: 1,
      registry: null,
      target: { kind: "repo", id: "wrkflw" },
      packs: { "github:baselane/second-brain": "v1.0.0" },
      materialized: { vendored: [42] },
    },
  },
];
