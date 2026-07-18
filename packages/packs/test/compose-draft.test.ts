import { describe, expect, it } from "vitest";
import type { AnalysisProfile } from "@baselane/analyze";
import type { ConventionsReport } from "@baselane/analyze";
import { composeDraftPack } from "../src/compose-draft.ts";

const profile: AnalysisProfile = {
  languages: ["typescript"],
  packageManager: "pnpm",
  frameworks: [{ name: "react", version: "18.0.0" }],
  commands: { build: "pnpm build", test: "pnpm test", lint: null },
  hasTestSuite: true,
  layout: "monorepo",
};

const conventions: ConventionsReport = {
  version: 1,
  sampleCap: 200,
  sampledFiles: 50,
  lintConfigs: [{ tool: "prettier", path: ".prettierrc" }],
  rules: [
    { id: "indentation", statement: "Indentation is 2 spaces", consistency: 0.98, sampleSize: 50, enforced: true, evidence: "49/50 sampled files" },
    { id: "import-extensions", statement: 'Relative imports include the file extension (e.g. "./x.ts")', consistency: 1, sampleSize: 120, enforced: false, evidence: "120/120 sampled import statements" },
  ],
  mixed: [],
  fileLength: { p50: 80, p90: 220 },
};

describe("composeDraftPack", () => {
  it("composes a validated pack from profile + conventions", () => {
    const { pack, rulesMarkdown } = composeDraftPack({ profile, conventions, repoName: "acme/web" });

    expect(pack.id).toBe("web");
    expect(pack.version).toBe("0.1.0");
    expect(pack.title).toBe("web — React + TypeScript conventions");
    expect(pack.summary).toBe(
      "Conventions and starter blocks for web — React, TypeScript, pnpm: 2 conventions measured (2 consistent, 0 inconsistent), 2 commands, plus 3 capability blocks.",
    );
    expect(pack.context.markdown).toBe(rulesMarkdown);

    expect(pack.commands.map((c) => c.name)).toEqual(["build", "test"]);
    expect(pack.commands[0].description).toBe("Run `pnpm build` and report failures.");
    expect(pack.commands[0].prompt).toBe("Run `pnpm build` and report any failures with file:line.");

    expect(pack.capabilities).toEqual([
      { type: "system-map", store: "repo", method: "analyze" },
      { type: "graph", store: "repo", method: "imports" },
      { type: "design", store: "repo", method: "author" },
    ]);

    expect(pack.agents).toEqual([]);
    expect(pack.hooks).toEqual([
      {
        event: "PreToolUse",
        matcher: "Bash",
        description: "Block shell commands while gitleaks finds an unredacted secret in the working tree.",
        action: "run-command",
        command:
          "if command -v gitleaks >/dev/null 2>&1; then gitleaks detect --no-git --no-banner --redact >/dev/null 2>&1 || exit 1; fi",
      },
      {
        event: "Stop",
        matcher: "",
        description: "Do not end the session while the test suite is failing.",
        action: "run-command",
        command: "pnpm test || exit 1",
      },
    ]);

    expect(rulesMarkdown).toBe(
      [
        "## Conventions",
        "",
        'Measured from this repository\'s own code (50 files sampled). Rules marked "unwritten" are followed consistently but not enforced by any linter — encode them so agents keep following them.',
        "",
        "Configured tooling: prettier (.prettierrc).",
        "",
        "- Indentation is 2 spaces (98%)",
        '- **Unwritten rule** — Relative imports include the file extension (e.g. "./x.ts") (100%)',
        "- File length: p50 80 lines, p90 220 lines",
      ].join("\n"),
    );
  });

  it("emits the secret gate unconditionally but the test gate only when a test command exists", () => {
    const noTest: AnalysisProfile = {
      languages: ["go"],
      packageManager: null,
      frameworks: [],
      commands: { build: null, test: null, lint: null },
      hasTestSuite: false,
      layout: "single",
    };
    const emptyConventions: ConventionsReport = {
      version: 1,
      sampleCap: 40,
      sampledFiles: 0,
      lintConfigs: [],
      rules: [],
      mixed: [],
      fileLength: null,
    };
    const { pack } = composeDraftPack({ profile: noTest, conventions: emptyConventions });
    expect(pack.hooks.some((h) => h.event === "PreToolUse" && h.action === "run-command")).toBe(true);
    expect(pack.hooks.some((h) => h.event === "Stop")).toBe(false);
  });

  it("every run-command gate exits non-zero (real gates, not reminders)", () => {
    const { pack } = composeDraftPack({ profile, conventions });
    const gates = pack.hooks.filter((h) => h.action === "run-command");
    expect(gates.length).toBeGreaterThanOrEqual(2);
    for (const h of gates) {
      expect("command" in h ? h.command : "").toContain("exit 1");
    }
  });

  it("slugifies odd repo names and omits missing commands / UI capabilities", () => {
    const bare: AnalysisProfile = {
      languages: [],
      packageManager: null,
      frameworks: [],
      commands: { build: null, test: null, lint: null },
      hasTestSuite: false,
      layout: "single",
    };
    const emptyConv: ConventionsReport = {
      version: 1, sampleCap: 200, sampledFiles: 0, lintConfigs: [], rules: [], mixed: [], fileLength: null,
    };
    const { pack, rulesMarkdown } = composeDraftPack({ profile: bare, conventions: emptyConv, repoName: "Weird/My_Repo!" });
    expect(pack.id).toBe("my-repo");
    expect(pack.commands).toEqual([]);
    // no languages, no UI framework -> only the always-on system-map capability
    expect(pack.capabilities).toEqual([{ type: "system-map", store: "repo", method: "analyze" }]);
    expect(rulesMarkdown).toContain("No lint/format tooling configured");
    expect(rulesMarkdown).toContain("- No strongly consistent conventions were detected.");
  });

  it("falls back to a safe id when repoName is absent", () => {
    const conv: ConventionsReport = { version: 1, sampleCap: 200, sampledFiles: 0, lintConfigs: [], rules: [], mixed: [], fileLength: null };
    const { pack } = composeDraftPack({ profile: { languages: [], packageManager: null, frameworks: [], commands: { build: null, test: null, lint: null }, hasTestSuite: false, layout: "single" }, conventions: conv });
    expect(pack.id).toBe("drafted-pack");
    expect(pack.title).toBe("this repo starter pack");
  });
});

describe("composeDraftPack — mixed (sub-threshold) conventions", () => {
  it("renders measured-but-inconsistent findings when present, and folds them into the pack context", () => {
    const conv: ConventionsReport = {
      version: 1, sampleCap: 200, sampledFiles: 50,
      lintConfigs: [{ tool: "prettier", path: ".prettierrc" }],
      rules: [{ id: "indent", statement: "Indentation is 2 spaces", consistency: 0.98, sampleSize: 50, enforced: true, evidence: "49/50" }],
      mixed: [
        { id: "semis", statement: "Statements end with a semicolon", consistency: 0.62, sampleSize: 200, enforced: false, evidence: "124/200" },
        { id: "quotes", statement: "Strings use double quotes", consistency: 0.55, sampleSize: 200, enforced: false, evidence: "110/200" },
      ],
      fileLength: null,
    };
    const { pack, rulesMarkdown } = composeDraftPack({ profile, conventions: conv, repoName: "acme/web" });
    expect(rulesMarkdown).toContain("### Measured but inconsistent");
    expect(rulesMarkdown).toContain("Statements end with a semicolon — measured but inconsistent, not auto-encoded (62%)");
    expect(rulesMarkdown).toContain("Strings use double quotes — measured but inconsistent, not auto-encoded (55%)");
    expect(pack.context.markdown).toBe(rulesMarkdown); // the mixed section rides along in the pack context
    // summary counts rules + mixed, not just rules — 1 consistent rule + 2 inconsistent mixed findings
    expect(pack.summary).toContain("3 conventions measured (1 consistent, 2 inconsistent)");
  });

  it("omits the mixed section entirely when there are no mixed findings (byte-identical to before)", () => {
    const conv: ConventionsReport = { version: 1, sampleCap: 200, sampledFiles: 0, lintConfigs: [], rules: [], mixed: [], fileLength: null };
    const { rulesMarkdown } = composeDraftPack({ profile, conventions: conv, repoName: "acme/web" });
    expect(rulesMarkdown).not.toContain("Measured but inconsistent");
  });
});
