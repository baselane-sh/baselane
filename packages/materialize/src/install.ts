import { readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  buildManifest, materializeHarness, ENTRY_FILES, LEGACY_MANIFEST_PATH, MANIFEST_PATH,
  type HarnessManifest, type WorkflowPack,
} from "@baselane/packs";
import { parseInstallRef, resolveDefaultBranch, resolveWellKnownSource } from "@baselane/distribute";
import { applyPlan, readCurrent } from "./fs-ops.ts";
import { planReconcile } from "./plan.ts";
import { mergeBaselaneHooks, SettingsParseError } from "./settings-merge.ts";
import type { Bundle, Manifest as FileReceipt } from "./types.ts";
import { readManifestWithFallback, targetLocation, writeManifestFile, type TargetLocation } from "./manifest-io.ts";
import { DEFAULT_REGISTRY, encodeSkillPin, fetchRegistryVersions, resolveManifestPacks } from "./resolve-packs.ts";

export interface InstallOptions {
  source?: string;
  global: boolean; dir?: string; homeDir?: string;
  dryRun: boolean; json: boolean;
  token?: string; fetchImpl?: typeof fetch; registryBase?: string;
  log?: (line: string) => void;
}

export interface InstallReport {
  manifestPath: string; targetDir: string;
  packs: Record<string, string>;
  writes: string[]; deletes: string[]; driftedBackedUp: string[]; unchanged: string[];
  notes: string[]; dryRun: boolean;
}

const MACHINE_SETTINGS_PATH = "settings.json";

export async function installFromManifest(
  manifest: HarnessManifest,
  loc: TargetLocation,
  opts: {
    dryRun: boolean; token?: string; fetchImpl?: typeof fetch; registryBase?: string; log?: (l: string) => void;
    inlinePacks?: Record<string, WorkflowPack>;
    priorReceipt?: Record<string, string>;
  },
  prior: HarnessManifest | null,
): Promise<InstallReport> {
  const log = opts.log ?? console.log;
  const notes: string[] = [];
  const { packs, resolutions } = await resolveManifestPacks(manifest, {
    token: opts.token, fetchImpl: opts.fetchImpl, inlinePacks: opts.inlinePacks, registryBase: opts.registryBase,
    onNotice: (m) => { notes.push(m); log(m); },
  }).then((r) => { notes.push(...r.notes); r.notes.forEach(log); return r; });

  const entryState = await readCurrent(loc.targetDir, [...ENTRY_FILES]);
  const result = materializeHarness({ manifest, resolvedPacks: packs, currentFiles: entryState, resolutions });

  const desired = { ...result.files };
  let heldSettings: string | null = null;
  if (loc.target.kind === "machine" && desired[MACHINE_SETTINGS_PATH] !== undefined) {
    heldSettings = desired[MACHINE_SETTINGS_PATH];
    delete desired[MACHINE_SETTINGS_PATH];
  }

  const bundle: Bundle = { version: 1, files: desired };
  const receipt: FileReceipt = {
    version: 1,
    files: opts.priorReceipt ??
      Object.fromEntries(
        (prior?.materialized.vendored ?? [])
          .filter((v) => v.sha256 !== null)
          .map((v) => [v.path, v.sha256 as string]),
      ),
  };
  const onDisk = await readCurrent(loc.targetDir, [...new Set([...Object.keys(desired), ...Object.keys(receipt.files)])]);
  const plan = planReconcile(bundle, receipt, onDisk);

  const report: InstallReport = {
    manifestPath: loc.manifestPath, targetDir: loc.targetDir,
    packs: manifest.packs,
    writes: plan.writes, deletes: plan.deletes,
    driftedBackedUp: plan.drifted.filter((p) => plan.writes.includes(p) || plan.deletes.includes(p)),
    unchanged: plan.unchanged, notes, dryRun: opts.dryRun,
  };
  if (opts.dryRun) return report;

  await applyPlan(loc.targetDir, bundle, plan);
  if (heldSettings !== null) {
    const settingsPath = join(loc.targetDir, MACHINE_SETTINGS_PATH);
    let current: string | null;
    try {
      current = await readFile(settingsPath, "utf8");
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT" || code === "ENOTDIR") current = null;
      else throw err; // e.g. EACCES — do NOT silently treat an unreadable file as absent (clobber risk)
    }
    try {
      await writeFile(settingsPath, mergeBaselaneHooks(current, heldSettings), "utf8");
    } catch (err) {
      if (err instanceof SettingsParseError) {
        throw new Error(`install: ${settingsPath} is not valid JSON — fix or remove it, then re-run (refusing to overwrite)`);
      }
      throw err;
    }
  }
  await writeManifestFile(loc.manifestPath, result.manifest);
  return report;
}

export async function runInstall(opts: InstallOptions): Promise<InstallReport> {
  const log = opts.log ?? console.log;
  const loc = targetLocation({ global: opts.global, dir: opts.dir, homeDir: opts.homeDir });
  const { manifest: existing, legacyPath } = await readManifestWithFallback(loc);
  const base = existing ?? buildManifest({ target: loc.target, packs: {} });

  let manifest: HarnessManifest = base;
  if (opts.source !== undefined) {
    const parsed = parseInstallRef(opts.source);
    if (parsed.kind === "git") {
      manifest = { ...base, packs: { ...base.packs, [parsed.name]: parsed.ref } };
    } else if (parsed.kind === "docs") {
      // Resolve once to fix the pin = sha256 of the host's well-known index.json; installFromManifest
      // then re-resolves and re-verifies against it (index sha + per-artifact digests).
      const { indexSha } = await resolveWellKnownSource({ url: parsed.url, fetchImpl: opts.fetchImpl, onNotice: log });
      manifest = { ...base, packs: { ...base.packs, [`docs:${parsed.url}`]: indexSha } };
    } else if (parsed.kind === "registry") {
      const registryBase = base.registry ?? opts.registryBase ?? DEFAULT_REGISTRY;
      let version = parsed.version;
      if (version === null) {
        const versions = await fetchRegistryVersions(parsed.name, registryBase, { fetchImpl: opts.fetchImpl, onNotice: log });
        if (versions.length === 0) throw new Error(`install: "${parsed.name}" has no published versions at ${registryBase}`);
        version = versions[0].version; // fetchRegistryVersions sorts semver-desc locally — index 0 is the true latest
      }
      manifest = { ...base, packs: { ...base.packs, [parsed.name]: version } };
    } else {
      // "skill": owner/repo@skill — no explicit ref, so pin at the repo's default branch;
      // the single-skill filter rides along in the pin (see encodeSkillPin's doc comment).
      const label = `${parsed.owner}/${parsed.repo}`;
      const branch = await resolveDefaultBranch(parsed.owner, parsed.repo, { token: opts.token, fetchImpl: opts.fetchImpl ?? fetch, label });
      const gitName = `github:${parsed.owner}/${parsed.repo}`;
      manifest = { ...base, packs: { ...base.packs, [gitName]: encodeSkillPin(branch, parsed.skill) } };
    }
  }
  if (Object.keys(manifest.packs).length === 0 && opts.source === undefined && existing === null) {
    throw new Error(`install: no ${loc.manifestPath} found and no source given — nothing to install`);
  }

  const report = await installFromManifest(
    manifest, loc,
    { dryRun: opts.dryRun, token: opts.token, fetchImpl: opts.fetchImpl, registryBase: opts.registryBase, log },
    existing,
  );
  // Legacy .baselane/harness.json is superseded by the just-written root manifest — remove it
  // only once the new one is confirmed on disk (dry-run never reaches here with legacyPath set
  // as a real migration, since nothing was written).
  if (legacyPath !== null && !opts.dryRun) {
    await unlink(legacyPath);
    log(`migrated manifest: ${LEGACY_MANIFEST_PATH} → ${MANIFEST_PATH}`);
  }
  return report;
}
