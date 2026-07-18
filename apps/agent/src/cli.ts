import { spawn } from "node:child_process";
import { hostname } from "node:os";
import { sync } from "./sync.ts";
import { fetchBundle } from "./remote.ts";
import { awaitApproval, resolveVerifyUrl, startPairing } from "./pair.ts";
import { defaultConfigPath, readConfig, writeConfig } from "./config.ts";
import { formatOnboarding } from "./onboarding.ts";
import { AssignmentsUnavailableError, fetchAssignments, postCheckin, syncFromAssignments } from "./assignments.ts";

const USAGE =
  "usage: baselane-agent sync (--bundle <path> | --portal <url>) --target <dir> [--dry-run]\n" +
  "       baselane-agent pair --portal <url> --target <dir> [--name <name>]\n" +
  "       baselane-agent run [--once] [--interval <seconds>] [--dry-run]";

interface CliDeps {
  fetchImpl?: typeof fetch;
  openUrl?: (url: string) => Promise<void>;
  sleep?: (ms: number) => Promise<void>;
  nowMs?: () => number;
  configPath?: string;
}

function argValue(argv: string[], flag: string): string | undefined {
  const i = argv.indexOf(flag);
  return i !== -1 ? argv[i + 1] : undefined;
}

async function defaultOpen(url: string): Promise<void> {
  // win32 uses rundll32 (a real executable), NOT `cmd /c start`, to avoid cmd.exe
  // metacharacter interpretation of the URL argument (CVE-2024-27980 class).
  const [cmd, args] =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["rundll32", ["url.dll,FileProtocolHandler", url]]
        : ["xdg-open", [url]];
  spawn(cmd, args, { detached: true, stdio: "ignore" }).unref();
}

async function realSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runPair(argv: string[], deps: CliDeps): Promise<number> {
  const portalUrl = argValue(argv, "--portal");
  const targetDir = argValue(argv, "--target");
  const name = argValue(argv, "--name") ?? hostname();
  if (!portalUrl || !targetDir) {
    console.error(USAGE);
    return 1;
  }
  try {
    const scheme = new URL(portalUrl).protocol;
    if (scheme !== "http:" && scheme !== "https:") throw new Error("scheme");
  } catch {
    console.error("baselane-agent error: --portal must be an http(s) URL");
    return 1;
  }
  try {
    const { userCode, deviceCode, verifyUrl, pollInterval } = await startPairing(portalUrl, name, deps.fetchImpl);
    const fullVerifyUrl = resolveVerifyUrl(portalUrl, verifyUrl);
    console.log(`baselane-agent: enter code ${userCode} at ${fullVerifyUrl}`);
    try {
      await (deps.openUrl ?? defaultOpen)(fullVerifyUrl);
    } catch {
      // headless environment — the URL printed above still works
    }
    const deviceToken = await awaitApproval(portalUrl, deviceCode, {
      fetchImpl: deps.fetchImpl,
      sleep: deps.sleep,
      nowMs: deps.nowMs,
      intervalMs: pollInterval * 1000,
    });
    await writeConfig(deps.configPath ?? defaultConfigPath(), { portalUrl, deviceToken, targetDir });
    console.log("baselane-agent: paired successfully");
    return 0;
  } catch (err) {
    console.error(`baselane-agent error: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
}

async function runRun(argv: string[], deps: CliDeps): Promise<number> {
  const configPath = deps.configPath ?? defaultConfigPath();
  const cfg = await readConfig(configPath);
  if (!cfg) {
    console.error("baselane-agent error: no configuration — run: baselane-agent pair --portal <url> --target <dir>");
    return 1;
  }
  const once = argv.includes("--once");
  const dryRun = argv.includes("--dry-run");
  const intervalSeconds = Number(argValue(argv, "--interval") ?? 300);
  const sleep = deps.sleep ?? realSleep;
  const maxBackoffMs = 30 * 60 * 1000; // cap the retry backoff at 30 minutes
  let backoffMs = 0;
  for (;;) {
    try {
      let cycleSummary: { writes: number; deletes: number; unchanged: number; drifted: string[] };
      try {
        const assignments = await fetchAssignments(cfg.portalUrl, cfg.deviceToken, deps.fetchImpl);
        const r = await syncFromAssignments({ assignments, targetDir: cfg.targetDir, dryRun, token: process.env.GITHUB_TOKEN, fetchImpl: deps.fetchImpl });
        if (!dryRun) await postCheckin(cfg.portalUrl, cfg.deviceToken, r.checkinBody, deps.fetchImpl);
        cycleSummary = { writes: r.report.writes.length, deletes: r.report.deletes.length, unchanged: r.report.unchanged.length, drifted: r.report.driftedBackedUp };
        const onboardingText = formatOnboarding(assignments.onboarding ?? []);
        if (onboardingText) console.log(onboardingText);
      } catch (err) {
        if (!(err instanceof AssignmentsUnavailableError)) throw err;
        console.log("baselane-agent: portal has no /api/assignments — falling back to legacy bundle sync");
        const bundle = await fetchBundle(cfg.portalUrl, cfg.deviceToken, deps.fetchImpl);
        const { plan } = await sync({ bundle, targetDir: cfg.targetDir, dryRun });
        cycleSummary = { writes: plan.writes.length, deletes: plan.deletes.length, unchanged: plan.unchanged.length, drifted: plan.drifted };
        const onboardingText = formatOnboarding(bundle.onboarding ?? []);
        if (onboardingText) console.log(onboardingText);
        const skillCount = Object.keys(bundle.files).filter(
          (p) => p.startsWith("skills/") && p.endsWith("/SKILL.md"),
        ).length;
        if (skillCount > 0) console.log(`Delivered ${skillCount} skill(s) to ${cfg.targetDir}/skills`);
      }
      const label = dryRun ? "dry-run" : "synced";
      console.log(
        `baselane-agent ${label}: ${cycleSummary.writes} written, ${cycleSummary.deletes} deleted, ` +
          `${cycleSummary.unchanged} unchanged, ${cycleSummary.drifted.length} drifted → ${cfg.targetDir}`,
      );
      // #3: name the reverted hand-edits (not just a count) and point at the backups, so a
      // developer whose local change was overwritten can see which files and recover them.
      // On --dry-run nothing was actually reverted yet, so say "would revert" instead.
      if (cycleSummary.drifted.length > 0) {
        console.log(
          dryRun
            ? `baselane-agent: --dry-run would revert ${cycleSummary.drifted.length} hand-edited file(s): ${cycleSummary.drifted.join(", ")}`
            : `baselane-agent: reverted ${cycleSummary.drifted.length} hand-edited file(s), backed up to *.baselane-bak: ${cycleSummary.drifted.join(", ")}`,
        );
      }
      backoffMs = 0; // a clean pass resets the retry backoff
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("401")) {
        console.error("baselane-agent error: device access was revoked — please re-connect the app");
        return 2;
      }
      // #17: a one-shot run reports the failure and exits; the continuous daemon must SURVIVE
      // transient errors (DNS blip, portal restart, dropped TCP) and retry with capped backoff
      // rather than ending the process on the first blip. Only a 401 (revoked device) is fatal.
      if (once || dryRun) {
        console.error(`baselane-agent error: ${message}`);
        return 1;
      }
      backoffMs = backoffMs === 0 ? intervalSeconds * 1000 : Math.min(backoffMs * 2, maxBackoffMs);
      console.error(`baselane-agent: sync failed (${message}); retrying in ${Math.round(backoffMs / 1000)}s`);
      await sleep(backoffMs);
      continue;
    }
    // --dry-run is a one-shot preview, same as --once — looping would just repeat the
    // "would revert" preview forever without anything on disk ever changing.
    if (once || dryRun) return 0;
    await sleep(intervalSeconds * 1000);
  }
}

export async function main(argv: string[], deps: CliDeps = {}): Promise<number> {
  // #29: an explicit help request is not an error — usage to stdout, exit 0. Unknown/missing
  // commands still hit the stderr + exit-1 path below.
  if (argv[0] === "--help" || argv[0] === "-h" || argv[0] === "help") {
    console.log(USAGE);
    return 0;
  }
  if (argv[0] === "pair") return runPair(argv.slice(1), deps);
  if (argv[0] === "run") return runRun(argv.slice(1), deps);
  if (argv[0] !== "sync") {
    console.error(USAGE);
    return 1;
  }
  const bundlePath = argValue(argv, "--bundle");
  const portalUrl = argValue(argv, "--portal");
  const targetDir = argValue(argv, "--target");
  if (!targetDir || (!bundlePath && !portalUrl) || (bundlePath && portalUrl)) {
    console.error(USAGE);
    return 1;
  }
  const dryRun = argv.includes("--dry-run");
  const token = process.env.BASELANE_PORTAL_TOKEN;
  if (portalUrl && !token) {
    console.error("baselane-agent error: BASELANE_PORTAL_TOKEN is required for --portal");
    return 1;
  }
  try {
    const bundle = portalUrl ? await fetchBundle(portalUrl, token as string, deps.fetchImpl) : undefined;
    const { plan, applied } = bundle
      ? await sync({ bundle, targetDir, dryRun })
      : await sync({ bundlePath, targetDir, dryRun });
    const label = applied ? "synced" : "dry-run";
    console.log(
      `baselane-agent ${label}: ${plan.writes.length} written, ${plan.deletes.length} deleted, ` +
        `${plan.unchanged.length} unchanged, ${plan.drifted.length} drifted → ${targetDir}`,
    );
    // #3: name the drifted (hand-edited) files. On a real sync they were reverted + backed up;
    // on --dry-run they would be. Either way the developer sees which files, not just a count.
    if (plan.drifted.length > 0) {
      console.log(
        applied
          ? `baselane-agent: reverted ${plan.drifted.length} hand-edited file(s), backed up to *.baselane-bak: ${plan.drifted.join(", ")}`
          : `baselane-agent: --dry-run would revert ${plan.drifted.length} hand-edited file(s): ${plan.drifted.join(", ")}`,
      );
    }
    const onboarding = formatOnboarding(bundle?.onboarding ?? []);
    if (onboarding) console.log(onboarding);
    const skillCount = Object.keys(bundle?.files ?? {}).filter(
      (p) => p.startsWith("skills/") && p.endsWith("/SKILL.md"),
    ).length;
    if (skillCount > 0) console.log(`Delivered ${skillCount} skill(s) to ${targetDir}/skills`);
    return 0;
  } catch (err) {
    console.error(`baselane-agent error: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
}
