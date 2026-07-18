import { basename, resolve } from "node:path";
import { LocalDirFileSource, analyze, analyzeConventions } from "@baselane/analyze";
import { composeDraftPack, type DraftPackResult } from "@baselane/packs";

export async function runDraftPack(dir: string): Promise<DraftPackResult> {
  const source = new LocalDirFileSource(dir);
  const [profile, conventions] = await Promise.all([analyze(source), analyzeConventions(source)]);
  return composeDraftPack({ profile, conventions, repoName: basename(resolve(dir)) });
}

export function formatDraftSummary(result: DraftPackResult): string {
  const { pack } = result;
  const caps = (pack.capabilities ?? []).map((c) => c.type).join(", ") || "none";
  return [
    "baselane draft-pack",
    "",
    `Pack: ${pack.id} — ${pack.title}`,
    `Commands: ${pack.commands.map((c) => c.name).join(", ") || "none"}`,
    `Capabilities: ${caps}`,
    "",
    "Paste this JSON into the pack builder (or save it) — it is an editable draft, not published:",
    JSON.stringify(pack, null, 2),
  ].join("\n");
}
