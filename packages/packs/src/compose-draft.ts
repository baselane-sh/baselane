import type { AnalysisProfile } from "@baselane/analyze";
import type { ConventionsReport, ConventionFinding } from "@baselane/analyze";
import type { Capability, PackCommand, PackHook, WorkflowPack } from "./types.ts";
import { validatePack } from "./validate.ts";

export interface DraftPackInput {
  profile: AnalysisProfile;
  conventions: ConventionsReport;
  /** "owner/name" or a dir basename; drives id/title/summary. */
  repoName?: string;
}

export interface DraftPackResult {
  /** Already validatePack-checked — never returned unvalidated. */
  pack: WorkflowPack;
  /** The measured-conventions ruleset, reused verbatim as the emitted rules-component payload. */
  rulesMarkdown: string;
}

const UI_FRAMEWORK = /react|next|vue|svelte|angular/i;

// Test runners are surfaced in `profile.frameworks` alongside UI/backend frameworks, but they're
// tooling, not architecture — excluded from the stack label so titles/summaries read like
// "React + TypeScript" instead of getting diluted with "Vitest".
const TEST_FRAMEWORKS = new Set(["vitest", "jest", "mocha", "@playwright/test"]);

const DISPLAY_NAMES: Record<string, string> = {
  typescript: "TypeScript",
  javascript: "JavaScript",
  react: "React",
  next: "Next.js",
  vue: "Vue",
  svelte: "Svelte",
  express: "Express",
  fastify: "Fastify",
  "@nestjs/core": "NestJS",
};

function displayName(id: string): string {
  const known = DISPLAY_NAMES[id];
  if (known) return known;
  const bare = id.replace(/^@[^/]+\//, "");
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}

/** Notable frameworks (UI/backend, not test tooling) followed by languages, deduped
 * case-insensitively. This is "the stack" for titles/summaries — e.g. ["React", "TypeScript"]. */
function stackParts(profile: AnalysisProfile): string[] {
  const names = [
    ...profile.frameworks.filter((f) => !TEST_FRAMEWORKS.has(f.name)).map((f) => displayName(f.name)),
    ...profile.languages.map(displayName),
  ];
  const seen = new Set<string>();
  return names.filter((name) => {
    const key = name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function lastSegment(repoName: string | undefined): string {
  return (repoName ?? "").split("/").pop() ?? "";
}

function slugifyRepo(repoName: string | undefined): string {
  const slug = lastSegment(repoName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "drafted-pack";
}

function pct(consistency: number): number {
  return Math.round(consistency * 100);
}

function ruleBullet(r: ConventionFinding): string {
  const prefix = r.enforced ? "" : "**Unwritten rule** — ";
  return `- ${prefix}${r.statement} (${pct(r.consistency)}%)`;
}

function buildRulesMarkdown(conventions: ConventionsReport): string {
  const toolingLine =
    conventions.lintConfigs.length > 0
      ? `Configured tooling: ${conventions.lintConfigs.map((c) => `${c.tool} (${c.path})`).join(", ")}.`
      : "No lint/format tooling configured — every convention below is unwritten.";

  const bullets =
    conventions.rules.length > 0
      ? conventions.rules.map(ruleBullet)
      : ["- No strongly consistent conventions were detected."];
  if (conventions.fileLength) {
    bullets.push(`- File length: p50 ${conventions.fileLength.p50} lines, p90 ${conventions.fileLength.p90} lines`);
  }

  const parts = [
    "## Conventions",
    "",
    `Measured from this repository's own code (${conventions.sampledFiles} files sampled). Rules marked "unwritten" are followed consistently but not enforced by any linter — encode them so agents keep following them.`,
    "",
    toolingLine,
    "",
    ...bullets,
  ];

  if (conventions.mixed.length > 0) {
    parts.push(
      "",
      "### Measured but inconsistent",
      "",
      "Present in the code but below the auto-encode threshold — surfaced for humans, not encoded as rules:",
    );
    for (const m of conventions.mixed) {
      parts.push(`- ${m.statement} — measured but inconsistent, not auto-encoded (${pct(m.consistency)}%)`);
    }
  }

  return parts.join("\n");
}

function commandBlocks(profile: AnalysisProfile): PackCommand[] {
  const specs: Array<{ name: string; cmd: string | null }> = [
    { name: "build", cmd: profile.commands.build },
    { name: "test", cmd: profile.commands.test },
    { name: "lint", cmd: profile.commands.lint },
  ];
  return specs
    .filter((s): s is { name: string; cmd: string } => s.cmd !== null)
    .map((s) => ({
      name: s.name,
      description: `Run \`${s.cmd}\` and report failures.`,
      argument_hint: "[extra args]",
      prompt: `Run \`${s.cmd}\` and report any failures with file:line.`,
    }));
}

function pluralize(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** Total conventions found is rules + mixed (see @baselane/analyze's RULE_THRESHOLD): `rules` are
 * consistency >= 90% (auto-encoded), `mixed` are below that (measured but not auto-encoded). Both
 * count as "found" — a summary that only counts `rules` undercounts what the draft actually surfaces. */
function conventionsClause(conventions: ConventionsReport): string {
  const total = conventions.rules.length + conventions.mixed.length;
  return `${pluralize(total, "convention")} measured (${conventions.rules.length} consistent, ${conventions.mixed.length} inconsistent)`;
}

function capabilityBlocks(profile: AnalysisProfile): Capability[] {
  const caps: Capability[] = [{ type: "system-map", store: "repo", method: "analyze" }];
  if (profile.languages.length > 0) caps.push({ type: "graph", store: "repo", method: "imports" });
  if (profile.frameworks.some((f) => UI_FRAMEWORK.test(f.name))) {
    caps.push({ type: "design", store: "repo", method: "author" });
  }
  return caps;
}

/** Two *enforcing* gate hooks — unlike reminder hooks (which only print), these exit non-zero to
 * actually block. The secret-scan gate runs before a Bash tool call and blocks it while gitleaks
 * finds an unredacted secret; the test gate blocks ending the session on a red suite. `settingsJson`
 * passes these commands into `.claude/settings.json` byte-for-byte, so the exit code reaches Claude
 * Code's hook runner intact. Commands are single-line (the `line()` validator rejects newlines). */
function hookBlocks(profile: AnalysisProfile): PackHook[] {
  const hooks: PackHook[] = [
    {
      event: "PreToolUse",
      matcher: "Bash",
      description: "Block shell commands while gitleaks finds an unredacted secret in the working tree.",
      action: "run-command",
      command:
        "if command -v gitleaks >/dev/null 2>&1; then gitleaks detect --no-git --no-banner --redact >/dev/null 2>&1 || exit 1; fi",
    },
  ];
  if (profile.commands.test) {
    hooks.push({
      event: "Stop",
      matcher: "",
      description: "Do not end the session while the test suite is failing.",
      action: "run-command",
      command: `${profile.commands.test} || exit 1`,
    });
  }
  return hooks;
}

/** Deterministic composer: an analysis report -> a validatePack-checked WorkflowPack draft. The
 * measured conventions become the pack's context markdown AND are returned separately so the caller
 * can emit them as a reusable library `rules` component. */
export function composeDraftPack(input: DraftPackInput): DraftPackResult {
  const { profile, conventions, repoName } = input;
  const rulesMarkdown = buildRulesMarkdown(conventions);
  const label = lastSegment(repoName) || "this repo";
  const stack = stackParts(profile);
  const commands = commandBlocks(profile);
  const capabilities = capabilityBlocks(profile);
  // Package manager rides along in the summary's stack list (more identifying detail than the
  // title needs) but not the title itself, which stays to "React + TypeScript"-style branding.
  const summaryStack = profile.packageManager ? [...stack, profile.packageManager] : stack;

  const candidate = {
    id: slugifyRepo(repoName),
    version: "0.1.0",
    title: stack.length > 0 ? `${label} — ${stack.join(" + ")} conventions` : `${label} starter pack`,
    summary: `Conventions and starter blocks for ${label}${
      summaryStack.length > 0 ? ` — ${summaryStack.join(", ")}` : ""
    }: ${conventionsClause(conventions)}, ${pluralize(commands.length, "command")}, plus ${pluralize(
      capabilities.length,
      "capability block",
    )}.`,
    context: { markdown: rulesMarkdown },
    capabilities,
    agents: [],
    commands,
    hooks: hookBlocks(profile),
  };

  return { pack: validatePack(candidate), rulesMarkdown };
}
