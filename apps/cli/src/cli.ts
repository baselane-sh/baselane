import { readFile } from "node:fs/promises";
import { auditRepo, formatAuditReport } from "./audit.ts";
import { applyResolvedPack } from "./apply.ts";
import { distributePack, GithubClient } from "@baselane/distribute";
import { reportAdoption } from "./report.ts";
import { loadBuiltinPack, validatePack, type WorkflowPack } from "@baselane/packs";
import { formatGraphSummary, runGraph } from "./graph.ts";
import { formatMapSummary, runMap } from "./map.ts";
import { runDraftPack, formatDraftSummary } from "./draft-pack.ts";
import { runInstall, formatInstallReport } from "./install.ts";
import { runUpdate } from "./update.ts";
import { runDrift, formatDriftReport } from "./drift-cmd.ts";
import { runPublish } from "./publish.ts";
import {
  LocalDirFileSource,
  analyze,
  analyzeConventions,
  analyzeDesignTokens,
  narrateArchitecture,
  narrateDesign,
  pickSamples,
  pickDesignSamples,
} from "@baselane/analyze";

// Exported so docs-site/src/pages/cli.ts can embed it verbatim at build time — the CLI reference
// page can never drift into a syntax this CLI doesn't actually accept.
export const USAGE = [
  "usage:",
  "  baselane audit <dir> [--json] [--exclude <patterns>]",
  "  baselane apply <dir> (--pack <id> | --pack-file <path>) [--force] [--dry-run]",
  "  baselane distribute <owner/repo> (--pack <id> | --pack-file <path>) [--portal <url>]",
  "  baselane draft-pack <dir> [--json]",
  "  baselane graph <dir> [--json] [--exclude <patterns>]",
  "  baselane map <dir> [--json] [--llm] [--dry-run] [--exclude <patterns>]",
  "  baselane install [github:owner/repo@ref | @scope/name[@version] | owner/repo@skill] [-g] [--dir <d>] [--dry-run] [--json]",
  "  baselane update [github:owner/repo | @scope/name] [-g] [--dir <d>] [--dry-run]",
  "  baselane drift [-g] [--dir <d>] [--json]",
  "  baselane publish @scope/name --source github:owner/repo --ref <tag> [--registry URL] [--json]",
].join("\n");

function argValue(argv: string[], flag: string): string | undefined {
  const i = argv.indexOf(flag);
  return i !== -1 ? argv[i + 1] : undefined;
}

/** `--exclude a,b` → ["a", "b"] (gitignore syntax, comma-separated), or undefined when absent. */
function excludesArg(argv: string[]): string[] | undefined {
  const raw = argValue(argv, "--exclude");
  if (!raw) return undefined;
  const patterns = raw.split(",").map((p) => p.trim()).filter((p) => p !== "");
  return patterns.length > 0 ? patterns : undefined;
}

// #6: --pack-file is the escape hatch for a custom pack the CLI doesn't ship (a portal-authored
// or AI-drafted one saved to disk) — loadBuiltinPack only ever knows built-in ids. Same rule as
// every other pack entry point in this repo: validatePack is the sole authority, so a hand-edited
// file gets exactly the same validation a built-in pack.json does before it's ever rendered.
async function loadPackFile(path: string): Promise<WorkflowPack> {
  const raw = await readFile(path, "utf8");
  return validatePack(JSON.parse(raw));
}

/** Resolves --pack/--pack-file into a WorkflowPack, requiring exactly one of the two. */
async function resolvePackArg(packId: string | undefined, packFile: string | undefined): Promise<WorkflowPack> {
  return packFile ? loadPackFile(packFile) : loadBuiltinPack(packId as string);
}

export interface CliDeps {
  fetchImpl?: typeof fetch;
}

export async function main(argv: string[], deps: CliDeps = {}): Promise<number> {
  const [cmd, dir] = argv;
  // #29: an explicit help request is not an error — print usage to stdout and exit 0. A genuinely
  // unknown or missing command still falls through to the stderr + exit-1 path below.
  if (cmd === "--help" || cmd === "-h" || cmd === "help") {
    console.log(USAGE);
    return 0;
  }
  try {
    if (cmd === "audit" && dir) {
      const result = await auditRepo(dir, { excludes: excludesArg(argv) });
      console.log(argv.includes("--json") ? JSON.stringify(result, null, 2) : formatAuditReport(result));
      return 0;
    }
    if (cmd === "apply" && dir) {
      const packId = argValue(argv, "--pack");
      const packFile = argValue(argv, "--pack-file");
      if ((!packId && !packFile) || (packId && packFile)) {
        console.error(USAGE);
        return 1;
      }
      const pack = await resolvePackArg(packId, packFile);
      const r = await applyResolvedPack(dir, pack, {
        force: argv.includes("--force"),
        dryRun: argv.includes("--dry-run"),
      });
      const label = argv.includes("--dry-run") ? "would write" : "wrote";
      console.log(`baselane apply ${pack.id}: ${label} ${r.written.length} file(s)` +
        (r.skipped.length ? `, skipped ${r.skipped.length} existing (use --force): ${r.skipped.join(", ")}` : "") +
        (argv.includes("--dry-run") ? "" : " · harness.json updated — run \"baselane drift\" anytime"));
      return 0;
    }
    if (cmd === "graph" && dir) {
      const r = await runGraph(dir, { excludes: excludesArg(argv) });
      console.log(argv.includes("--json") ? JSON.stringify(r.graph, null, 2) : formatGraphSummary(r.graph, r.written));
      return 0;
    }
    if (cmd === "map" && dir) {
      let narration = null;
      let designNarration = null;
      if (argv.includes("--llm")) {
        const apiKey = process.env.BASELANE_ANTHROPIC_KEY ?? process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          console.error(
            "baselane map error: --llm needs BASELANE_ANTHROPIC_KEY or ANTHROPIC_API_KEY. " +
              "Run without --llm for the deterministic map.",
          );
          return 1;
        }
        const source = new LocalDirFileSource(dir, { excludes: excludesArg(argv) });
        const [profile, conventions, samples, tokens, designSamples] = await Promise.all([
          analyze(source),
          analyzeConventions(source),
          pickSamples(source),
          analyzeDesignTokens(source),
          pickDesignSamples(source),
        ]);
        try {
          narration = await narrateArchitecture({ profile, conventions, samples }, { apiKey, fetchImpl: deps.fetchImpl });
          if (tokens.hasUiSurface) {
            designNarration = await narrateDesign({ tokens, samples: designSamples }, { apiKey, fetchImpl: deps.fetchImpl });
          }
        } catch (err) {
          console.error(`baselane map error: ${err instanceof Error ? err.message : String(err)}`);
          return 1;
        }
      }
      const r = await runMap(dir, { dryRun: argv.includes("--dry-run"), narration, designNarration, excludes: excludesArg(argv) });
      console.log(
        argv.includes("--json")
          ? JSON.stringify({ profile: r.profile, conventions: r.conventions, tokens: r.tokens }, null, 2)
          : argv.includes("--dry-run")
            ? [r.architectureMd, r.designMd].filter((s): s is string => s !== null).join("\n")
            : formatMapSummary(r),
      );
      return 0;
    }
    if (cmd === "draft-pack" && dir) {
      const result = await runDraftPack(dir);
      console.log(argv.includes("--json") ? JSON.stringify(result.pack, null, 2) : formatDraftSummary(result));
      return 0;
    }
    if (cmd === "distribute" && dir) {
      const packId = argValue(argv, "--pack");
      const packFile = argValue(argv, "--pack-file");
      if ((!packId && !packFile) || (packId && packFile)) {
        console.error(USAGE);
        return 1;
      }
      const token = process.env.GITHUB_TOKEN;
      if (!token) {
        console.error("baselane error: GITHUB_TOKEN is required for distribute");
        return 1;
      }
      const portalUrl = argValue(argv, "--portal");
      const portalToken = process.env.BASELANE_PORTAL_TOKEN;
      if (portalUrl && !portalToken) {
        console.error("baselane error: BASELANE_PORTAL_TOKEN is required with --portal");
        return 1;
      }
      const pack = await resolvePackArg(packId, packFile);
      const r = await distributePack(new GithubClient({ token }), dir, pack);
      console.log(`baselane distribute ${pack.id}: opened ${r.prUrl} (${r.fileCount} file(s) on ${r.branch})`);
      if (portalUrl && portalToken) {
        try {
          await reportAdoption(portalUrl, portalToken, {
            repo: dir,
            packId: pack.id,
            version: pack.version,
            prUrl: r.prUrl,
          });
          console.log(`baselane distribute: adoption recorded at ${portalUrl}`);
        } catch (reportErr) {
          console.error(
            `baselane warning: PR opened but adoption report failed: ${
              reportErr instanceof Error ? reportErr.message : String(reportErr)
            }`,
          );
        }
      }
      return 0;
    }
    if (cmd === "install") {
      const source = argv[1] && !argv[1].startsWith("-") ? argv[1] : undefined;
      const json = argv.includes("--json");
      const report = await runInstall({
        source,
        global: argv.includes("-g") || argv.includes("--global"),
        dir: argValue(argv, "--dir"),
        dryRun: argv.includes("--dry-run"),
        json,
        token: process.env.GITHUB_TOKEN,
        registryBase: process.env.BASELANE_REGISTRY,
        fetchImpl: deps.fetchImpl,
        // --json means stdout must be pure JSON — route notices to stderr instead of the default console.log
        log: json ? (l) => console.error(l) : undefined,
      });
      console.log(json ? JSON.stringify(report, null, 2) : formatInstallReport(report));
      return 0;
    }
    if (cmd === "update") {
      const name = argv[1] && !argv[1].startsWith("-") ? argv[1] : undefined;
      const json = argv.includes("--json");
      await runUpdate({
        name,
        global: argv.includes("-g") || argv.includes("--global"),
        dir: argValue(argv, "--dir"),
        dryRun: argv.includes("--dry-run"),
        token: process.env.GITHUB_TOKEN,
        registryBase: process.env.BASELANE_REGISTRY,
        fetchImpl: deps.fetchImpl,
        log: json ? (l) => console.error(l) : undefined,
      });
      return 0;
    }
    if (cmd === "drift") {
      const report = await runDrift({
        global: argv.includes("-g") || argv.includes("--global"),
        dir: argValue(argv, "--dir"),
      });
      console.log(argv.includes("--json") ? JSON.stringify(report, null, 2) : formatDriftReport(report));
      return report.clean ? 0 : 1;
    }
    if (cmd === "publish") {
      const name = argv[1] && !argv[1].startsWith("-") ? argv[1] : undefined;
      const source = argValue(argv, "--source");
      const ref = argValue(argv, "--ref");
      if (!name || !source || !ref) {
        console.error(USAGE);
        return 1;
      }
      const json = argv.includes("--json");
      const result = await runPublish({
        name,
        sourceName: source,
        ref,
        registry: argValue(argv, "--registry") ?? process.env.BASELANE_REGISTRY,
        token: process.env.GITHUB_TOKEN,
        fetchImpl: deps.fetchImpl,
        // --json means stdout must be pure JSON — route notices to stderr, same idiom as install/update
        log: json ? (l) => console.error(l) : undefined,
      });
      console.log(json ? JSON.stringify(result, null, 2) : result.message);
      return result.ok ? 0 : 1;
    }
    console.error(USAGE);
    return 1;
  } catch (err) {
    console.error(`baselane error: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
}
