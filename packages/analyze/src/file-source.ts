import { readFile as fsReadFile, readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import type { RepoFileSource } from "./types.ts";

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".next"]);

export class LocalDirFileSource implements RepoFileSource {
  constructor(private readonly rootDir: string) {}

  async listFiles(): Promise<string[]> {
    const out: string[] = [];
    const walk = async (dir: string): Promise<void> => {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (SKIP_DIRS.has(entry.name)) continue;
          await walk(join(dir, entry.name));
        } else if (entry.isFile()) {
          out.push(relative(this.rootDir, join(dir, entry.name)).split(sep).join("/"));
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
