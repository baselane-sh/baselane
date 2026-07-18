import type { RepoFileSource } from "../types.ts";

export async function detectLayout(source: RepoFileSource): Promise<"single" | "monorepo"> {
  const files = new Set(await source.listFiles());
  if (files.has("pnpm-workspace.yaml")) return "monorepo";

  const pkgRaw = await source.readFile("package.json");
  if (pkgRaw) {
    try {
      const pkg = JSON.parse(pkgRaw) as { workspaces?: unknown };
      const ws: unknown = pkg.workspaces;
      const nonEmpty = Array.isArray(ws)
        ? ws.length > 0
        : ws !== null && typeof ws === "object"
          ? Object.keys(ws).length > 0
          : Boolean(ws);
      if (nonEmpty) return "monorepo";
    } catch {
      // malformed package.json -> treat as single
    }
  }
  return "single";
}
