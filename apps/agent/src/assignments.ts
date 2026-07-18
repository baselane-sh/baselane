import { readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { validatePack, buildManifest, type HarnessManifest, type WorkflowPack } from "@baselane/packs";
import { isGitSourceName } from "@baselane/distribute";
import type { BundleOnboardingStep } from "@baselane/materialize";
import {
  targetLocation, readManifestFile, installFromManifest,
  type InstallReport,
} from "@baselane/materialize";

export const AGENT_VERSION = "0.0.0";

export class AssignmentsUnavailableError extends Error {}

export interface Assignments {
  packs: Record<string, string>; packBodies: WorkflowPack[]; onboarding?: BundleOnboardingStep[];
  deviceId?: string | null;
}

export async function fetchAssignments(portalUrl: string, token: string, fetchImpl: typeof fetch = fetch): Promise<Assignments> {
  const base = portalUrl.endsWith("/") ? portalUrl.slice(0, -1) : portalUrl;
  const res = await fetchImpl(`${base}/api/assignments`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
  });
  if (res.status === 404) throw new AssignmentsUnavailableError("portal has no /api/assignments");
  if (!res.ok) throw new Error(`portal assignments fetch failed: ${res.status}`);
  const raw = (await res.json()) as { packs?: unknown; packBodies?: unknown; deviceId?: unknown };
  if (raw.packs === null || typeof raw.packs !== "object" || Array.isArray(raw.packs) || !Array.isArray(raw.packBodies)) {
    throw new Error("portal assignments response malformed");
  }
  const packBodies = (raw.packBodies as unknown[]).map((b) => validatePack(b));
  const packs: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw.packs as Record<string, unknown>)) {
    if (typeof v !== "string" || v.length === 0) throw new Error(`assignments pin for "${k}" malformed`);
    packs[k] = v;
  }
  for (const body of packBodies) {
    if (packs[body.id] !== body.version) {
      throw new Error(`assignments version mismatch for "${body.id}": map says ${packs[body.id]}, body says ${body.version}`);
    }
  }
  const onboarding = Array.isArray((raw as { onboarding?: unknown }).onboarding)
    ? ((raw as { onboarding: BundleOnboardingStep[] }).onboarding)
    : [];
  // absent → undefined (keeps `toEqual` on legacy-shaped responses exact); explicit null passes through.
  const deviceId = typeof raw.deviceId === "string" ? raw.deviceId : raw.deviceId === null ? null : undefined;
  return { packs, packBodies, onboarding, deviceId };
}

/** Merged machine manifest: org entries first (assignment order), personal git-ref entries preserved,
 * stale org entries dropped. Pure — never mutates `existing`. */
export function mergeAssignedManifest(existing: HarnessManifest, assignments: Assignments): HarnessManifest {
  const merged: Record<string, string> = { ...assignments.packs };
  for (const [name, pin] of Object.entries(existing.packs)) {
    if (isGitSourceName(name)) merged[name] = pin;
  }
  return { ...existing, packs: merged };
}

export interface AssignmentsSyncResult {
  report: InstallReport;
  warnings: string[];
  checkinBody: { packs: Record<string, string>; driftedPaths: string[]; clean: boolean; agentVersion: string };
}

export async function syncFromAssignments(opts: {
  assignments: Assignments; targetDir: string; homeDir?: string; dryRun?: boolean;
  token?: string; fetchImpl?: typeof fetch; log?: (l: string) => void;
}): Promise<AssignmentsSyncResult> {
  const log = opts.log ?? console.log;
  const loc = targetLocation({ global: true, dir: opts.targetDir, homeDir: opts.homeDir });
  const prior = await readManifestFile(loc.manifestPath);
  const base = prior ?? buildManifest({ target: loc.target, packs: {} });

  // Carried M2b fix (spec §4e): the on-disk machine manifest keys by the stable device id the
  // portal resolved from our token — not hostname. CLI-only machines (no agent) keep hostname.
  const targetId = opts.assignments.deviceId ?? base.target.id;
  const withTarget = base.target.id === targetId ? base : { ...base, target: { ...base.target, id: targetId } };
  if (withTarget !== base) log(`baselane-agent: manifest target.id migrated to device id ${targetId}`);

  const manifest = mergeAssignedManifest(withTarget, opts.assignments);

  // Legacy hash-receipt migration: only when no harness.json exists yet.
  let priorReceipt: Record<string, string> | undefined;
  const legacyPath = join(opts.targetDir, ".baselane-manifest.json");
  let legacyPresent = false;
  if (prior === null) {
    try {
      const legacy = JSON.parse(await readFile(legacyPath, "utf8")) as { version?: number; files?: Record<string, string> };
      if (legacy.version === 1 && legacy.files && typeof legacy.files === "object") {
        priorReceipt = legacy.files;
        legacyPresent = true;
      }
    } catch {
      // no legacy receipt — fresh machine
    }
  }

  const inlinePacks: Record<string, WorkflowPack> = {};
  for (const body of opts.assignments.packBodies) inlinePacks[body.id] = body;

  const report = await installFromManifest(manifest, loc, {
    dryRun: opts.dryRun ?? false, token: opts.token, fetchImpl: opts.fetchImpl,
    log, inlinePacks, priorReceipt,
  }, prior);

  if (legacyPresent && !(opts.dryRun ?? false)) {
    await unlink(legacyPath).catch(() => log(`baselane-agent: could not remove legacy receipt ${legacyPath}`));
  }

  const warnings: string[] = [];
  const updated = await readManifestFile(loc.manifestPath);
  const orgIds = new Set(Object.keys(opts.assignments.packs));
  for (const [name, res] of Object.entries(updated?.materialized.resolutions ?? {})) {
    if (orgIds.has(res.packId)) warnings.push(`personal pack ${name} resolves to "${res.packId}", also org-assigned — org content wins`);
  }
  for (const w of warnings) log(`baselane-agent warning: ${w}`);

  return {
    report, warnings,
    checkinBody: {
      packs: manifest.packs,
      driftedPaths: report.driftedBackedUp,
      clean: report.driftedBackedUp.length === 0,
      agentVersion: AGENT_VERSION,
    },
  };
}

export async function postCheckin(
  portalUrl: string, token: string,
  body: AssignmentsSyncResult["checkinBody"],
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const base = portalUrl.endsWith("/") ? portalUrl.slice(0, -1) : portalUrl;
  try {
    const res = await fetchImpl(`${base}/api/checkin`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) console.error(`baselane-agent: check-in failed (${res.status}) — will retry next sync`);
  } catch (err) {
    console.error(`baselane-agent: check-in failed (${err instanceof Error ? err.message : String(err)}) — will retry next sync`);
  }
}
