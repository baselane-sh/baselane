import type { Bundle, Manifest, ReconcilePlan } from "./types.ts";
import { sha256 } from "./hash.ts";

/**
 * Pure desired-state diff. `onDisk` must cover every path in bundle.files ∪ manifest.files
 * (null = absent). Paths outside that union are structurally unreachable here — the
 * never-clobber guarantee starts in this signature.
 */
export function planReconcile(
  bundle: Bundle,
  manifest: Manifest,
  onDisk: Record<string, string | null>,
): ReconcilePlan {
  const writes: string[] = [];
  const unchanged: string[] = [];
  const drifted: string[] = [];

  for (const [path, desired] of Object.entries(bundle.files)) {
    const current = onDisk[path] ?? null;
    if (current === desired) unchanged.push(path);
    else writes.push(path);
  }

  const deletes: string[] = [];
  for (const path of Object.keys(manifest.files)) {
    if (!(path in bundle.files) && (onDisk[path] ?? null) !== null) deletes.push(path);
  }

  for (const [path, managedHash] of Object.entries(manifest.files)) {
    const current = onDisk[path] ?? null;
    if (current !== null && sha256(current) !== managedHash) drifted.push(path);
  }

  return {
    writes: writes.sort(),
    deletes: deletes.sort(),
    drifted: drifted.sort(),
    unchanged: unchanged.sort(),
  };
}
