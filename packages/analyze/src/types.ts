export interface RepoFileSource {
  /** Repo-relative POSIX paths of all files (excludes node_modules/.git). */
  listFiles(): Promise<string[]>;
  /** File contents, or null if the path does not exist. */
  readFile(path: string): Promise<string | null>;
}

export interface Framework {
  name: string;
  /** Declared version range from the manifest, or null if unknown. */
  version: string | null;
}

export interface AnalysisProfile {
  languages: string[]; // sorted, unique, e.g. ["javascript", "typescript"]
  packageManager: string | null; // "pnpm" | "npm" | "yarn" | "bun" | null
  frameworks: Framework[];
  commands: { build: string | null; test: string | null; lint: string | null };
  hasTestSuite: boolean;
  layout: "single" | "monorepo";
}
