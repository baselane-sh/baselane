/** One onboarding step the portal wants surfaced to this device's developer (bundle version 2). */
export interface BundleOnboardingStep {
  packId: string;
  stepId: string;
  title: string;
  description: string;
  command?: string;
}

/** Approved config bundle: target-relative POSIX path → file content. Version 2 adds informational
 * metadata (the effective pack ids, whole-file collisions, and pending onboarding steps); the
 * file-map contract is unchanged, so a version-1 bundle is a strict subset. */
export interface Bundle {
  version: 1 | 2;
  files: Record<string, string>;
  packIds?: string[];
  collisions?: string[];
  onboarding?: BundleOnboardingStep[];
}

/** What baselane manages in the target dir: path → sha256 of the content we wrote. */
export interface Manifest {
  version: 1;
  files: Record<string, string>;
}

/** Result of planning a reconcile — pure data, no side effects. */
export interface ReconcilePlan {
  /** Bundle paths whose on-disk content differs (or is absent): will be (over)written. */
  writes: string[];
  /** Paths in the manifest but not in the bundle and still on disk: will be removed. */
  deletes: string[];
  /** Managed paths whose on-disk content no longer matches the manifest hash (local edits). */
  drifted: string[];
  /** Bundle paths already byte-identical on disk. */
  unchanged: string[];
}
