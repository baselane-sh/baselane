import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { hostname, homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { LEGACY_MANIFEST_PATH, MANIFEST_PATH, serializeManifest, validateManifest, type HarnessManifest } from "@baselane/packs";

export interface TargetLocation {
  manifestPath: string;
  targetDir: string;
  target: { kind: "repo" | "machine"; id: string };
}

export function targetLocation(opts: { global: boolean; dir?: string; homeDir?: string }): TargetLocation {
  if (opts.global) {
    const home = opts.homeDir ?? homedir();
    return {
      manifestPath: join(home, ".baselane", "harness.json"),
      targetDir: opts.dir ?? join(home, ".claude"),
      target: { kind: "machine", id: hostname() },
    };
  }
  const dir = resolve(opts.dir ?? ".");
  return {
    manifestPath: join(dir, MANIFEST_PATH),
    targetDir: dir,
    target: { kind: "repo", id: basename(dir) },
  };
}

export async function readManifestFile(manifestPath: string): Promise<HarnessManifest | null> {
  let raw: string;
  try {
    raw = await readFile(manifestPath, "utf8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") return null;
    throw err;
  }
  try {
    return validateManifest(JSON.parse(raw));
  } catch (err) {
    throw new Error(`harness.json at ${manifestPath} is invalid: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/** Reads a target's manifest, falling back to the pre-2026-07-16 `.baselane/harness.json`
 * location for repo targets when the root manifest is absent. Machine targets never fall
 * back — `loc.manifestPath` (`~/.baselane/harness.json`) is unchanged and has no legacy path.
 * `legacyPath` is non-null only when the fallback was actually used, signaling callers that
 * migrated on write (see `installFromManifest`). */
export async function readManifestWithFallback(
  loc: TargetLocation,
): Promise<{ manifest: HarnessManifest | null; legacyPath: string | null }> {
  const root = await readManifestFile(loc.manifestPath);
  if (root !== null) return { manifest: root, legacyPath: null };
  if (loc.target.kind !== "repo") return { manifest: null, legacyPath: null };
  const legacyPath = join(loc.targetDir, LEGACY_MANIFEST_PATH);
  const legacy = await readManifestFile(legacyPath);
  if (legacy === null) return { manifest: null, legacyPath: null };
  return { manifest: legacy, legacyPath };
}

export async function writeManifestFile(manifestPath: string, manifest: HarnessManifest): Promise<void> {
  await mkdir(dirname(manifestPath), { recursive: true });
  // Randomized suffix: two concurrent writers (e.g. install + agent sync) never collide on the same tmp path.
  const tmp = `${manifestPath}.${randomBytes(6).toString("hex")}.tmp`;
  await writeFile(tmp, serializeManifest(manifest), "utf8");
  try {
    await rename(tmp, manifestPath);
  } catch (err) {
    await unlink(tmp).catch(() => {}); // best-effort: don't leave the tmp file behind on a failed rename
    throw err;
  }
}
