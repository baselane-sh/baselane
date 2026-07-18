import type { RepoFileSource } from "../types.ts";

// Language detection recognizes far more than the analyzer can import-parse (import-graph.ts's
// narrower LANG_BY_EXT is for parsing js/ts/py/go imports specifically). Keeping it JS/TS-only made
// every non-Node repo report `languages: []` — the first line of its ARCHITECTURE.md. This is the
// superset used only to name the languages present.
const EXT_TO_LANG: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".mts": "typescript",
  ".cts": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".py": "python",
  ".pyi": "python",
  ".go": "go",
  ".rs": "rust",
  ".rb": "ruby",
  ".java": "java",
  ".kt": "kotlin",
  ".kts": "kotlin",
  ".swift": "swift",
  ".c": "c",
  ".h": "c",
  ".cpp": "cpp",
  ".cc": "cpp",
  ".cxx": "cpp",
  ".hpp": "cpp",
  ".cs": "csharp",
  ".php": "php",
  ".scala": "scala",
  ".ex": "elixir",
  ".exs": "elixir",
};

export async function detectLanguages(source: RepoFileSource): Promise<string[]> {
  const files = await source.listFiles();
  const langs = new Set<string>();
  for (const file of files) {
    const dot = file.lastIndexOf(".");
    if (dot === -1) continue;
    const lang = EXT_TO_LANG[file.slice(dot)];
    if (lang) langs.add(lang);
  }
  return [...langs].sort();
}
