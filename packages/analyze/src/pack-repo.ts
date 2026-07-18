import type { RepoFileSource } from "./types.ts";

export interface RepoDigest {
  text: string;
  tree: string;
  included: string[];
  omitted: string[];
  estTokens: number;
}

const DEFAULT_BUDGET = 150_000;
const PER_FILE_CAP = 40_000; // chars — never let one giant file dominate the digest

export function estTokens(s: string): number {
  return Math.ceil(s.length / 4);
}

// Config/tooling files pulled in verbatim regardless of ranking (they are the highest signal).
const CONFIG_PATTERNS = [
  /^package\.json$/,
  /^tsconfig[^/]*\.json$/,
  /^\.eslintrc/,
  /^eslint\.config\./,
  /^\.prettierrc/,
  /^prettier\.config\./,
  /^ruff\.toml$/,
  /^\.ruff\.toml$/,
  /^pyproject\.toml$/,
  /^\.editorconfig$/,
  /^Makefile$/,
  /^go\.mod$/,
  /^requirements[^/]*\.txt$/,
  /^\.github\/workflows\//,
  /^README/i,
];

const IGNORE_DIR = /(^|\/)(node_modules|dist|build|\.git|vendor|coverage|__pycache__)(\/|$)/;
const IGNORE_FILE = /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|.*\.min\.(js|css))$/;
const BINARY_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp", ".woff", ".woff2", ".ttf", ".otf", ".eot", ".pdf", ".zip", ".gz", ".mp4", ".mov", ".wasm"]);

function extOf(p: string): string {
  const dot = p.lastIndexOf(".");
  const slash = p.lastIndexOf("/");
  return dot > slash ? p.slice(dot).toLowerCase() : "";
}

function isIgnored(p: string): boolean {
  return IGNORE_DIR.test(p) || IGNORE_FILE.test(p) || BINARY_EXT.has(extOf(p));
}

function isConfig(p: string): boolean {
  return CONFIG_PATTERNS.some((re) => re.test(p));
}

/** ASCII tree from a flat, sorted path list. */
function renderTree(paths: string[]): string {
  const lines: string[] = [];
  const seenDirs = new Set<string>();
  for (const p of paths) {
    const segments = p.split("/");
    for (let i = 0; i < segments.length - 1; i++) {
      const dirPath = segments.slice(0, i + 1).join("/");
      if (seenDirs.has(dirPath)) continue;
      seenDirs.add(dirPath);
      lines.push(`${"  ".repeat(i)}${segments[i]}/`);
    }
    const depth = segments.length - 1;
    lines.push(`${"  ".repeat(depth)}${segments[depth]}`);
  }
  return lines.join("\n");
}

export async function packRepo(
  source: RepoFileSource,
  opts?: { tokenBudget?: number; rankBy?: Map<string, number> },
): Promise<RepoDigest> {
  const budget = opts?.tokenBudget ?? DEFAULT_BUDGET;
  const rankBy = opts?.rankBy ?? new Map<string, number>();
  const all = (await source.listFiles()).filter((p) => !isIgnored(p));
  const tree = renderTree(all);

  const configs = all.filter(isConfig);
  const sources = all.filter((p) => !isConfig(p));

  // Rank: fan-in desc, then shallower path, then path order.
  sources.sort((a, b) => (rankBy.get(b) ?? 0) - (rankBy.get(a) ?? 0) || a.split("/").length - b.split("/").length || a.localeCompare(b));

  const header = `# Repository digest\n\n## Directory tree\n\n${tree}\n\n## Files\n`;
  const parts: string[] = [header];
  const included: string[] = [];
  const omitted: string[] = [];
  let attempted = 0;
  let failed = 0;
  // Tokens contributed by file-content blocks only (header/tree/footer are fixed overhead,
  // not counted against the per-file budget).
  let usedTokens = 0;

  const addFile = async (path: string, force: boolean): Promise<void> => {
    attempted++;
    let content: string | null;
    try {
      content = await source.readFile(path);
    } catch {
      failed++;
      return; // skip one flaky read, keep packing
    }
    if (content === null) return;
    const block = `\n--- ${path} ---\n${content.slice(0, PER_FILE_CAP)}\n`;
    const blockTokens = estTokens(block);
    if (!force && usedTokens + blockTokens > budget) {
      omitted.push(path);
      return;
    }
    parts.push(block);
    included.push(path);
    usedTokens += blockTokens;
  };

  for (const c of configs) await addFile(c, true); // configs always in
  for (const s of sources) {
    if (usedTokens >= budget) {
      omitted.push(s);
      continue;
    }
    await addFile(s, false);
  }

  if (attempted > 0 && attempted === failed) {
    throw new Error(`packRepo: all ${failed} file read(s) failed`);
  }

  parts.push(`\n---\nDigest: ${included.length} files included, ${omitted.length} omitted for budget.\n`);
  const text = parts.join("");
  return { text, tree, included, omitted, estTokens: estTokens(text) };
}
