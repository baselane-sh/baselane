import { readFile as fsReadFile, readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import type { RepoFileSource } from "./types.ts";
import { parseGitignore, isIgnored } from "./gitignore.ts";

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".next"]);

export interface LocalDirOptions {
  /** Extra ignore patterns (gitignore syntax), applied after .gitignore — e.g. a vendored
   * upstream tree the repo commits but doesn't own. From the CLI: `--exclude a,b`. */
  excludes?: string[];
}

export class LocalDirFileSource implements RepoFileSource {
  constructor(
    private readonly rootDir: string,
    private readonly options: LocalDirOptions = {},
  ) {}

  async listFiles(): Promise<string[]> {
    // Issue #2: respect the root .gitignore (plus caller excludes) so the scan reflects code the
    // repo actually owns, instead of gitignored build output and vendored trees.
    const gitignore = await this.readFile(".gitignore");
    const rules = [
      ...parseGitignore(gitignore ?? ""),
      ...parseGitignore((this.options.excludes ?? []).join("\n")),
    ];

    const out: string[] = [];
    const walk = async (dir: string): Promise<void> => {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const rel = relative(this.rootDir, join(dir, entry.name)).split(sep).join("/");
        if (entry.isDirectory()) {
          if (SKIP_DIRS.has(entry.name)) continue;
          if (isIgnored(rules, rel, true)) continue;
          await walk(join(dir, entry.name));
        } else if (entry.isFile()) {
          if (isIgnored(rules, rel, false)) continue;
          out.push(rel);
        }
      }
    };
    await walk(this.rootDir);
    return out.sort();
  }

  async readFile(path: string): Promise<string | null> {
    try {
      return await fsReadFile(join(this.rootDir, path), "utf8");
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT" || code === "ENOTDIR") return null;
      throw err;
    }
  }
}
