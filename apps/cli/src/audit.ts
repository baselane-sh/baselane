import { analyze, LocalDirFileSource, type AnalysisProfile } from "@baselane/analyze";
import { listBuiltinPacks } from "@baselane/packs";

export interface AuditResult {
  profile: AnalysisProfile;
  packs: string[];
  recommended: string;
}

export async function auditRepo(dir: string): Promise<AuditResult> {
  const profile = await analyze(new LocalDirFileSource(dir));
  const packs = await listBuiltinPacks();
  // Flagship default; every pack remains selectable via `apply --pack`.
  const recommended = "software-engineer-harness";
  return { profile, packs, recommended };
}

export function formatAuditReport(r: AuditResult): string {
  const p = r.profile;
  const fw = p.frameworks.length
    ? p.frameworks.map((f) => (f.version ? `${f.name}@${f.version}` : f.name)).join(", ")
    : "none detected";
  return [
    "baselane audit",
    "",
    `Languages: ${p.languages.join(", ") || "none detected"}`,
    `Package manager: ${p.packageManager ?? "none detected"}`,
    `Layout: ${p.layout}`,
    `Frameworks: ${fw}`,
    `Commands: build=${p.commands.build ?? "-"} test=${p.commands.test ?? "-"} lint=${p.commands.lint ?? "-"}`,
    `Test suite: ${p.hasTestSuite ? "yes" : "no"}`,
    "",
    `Available packs: ${r.packs.join(", ")}`,
    `Recommended pack: ${r.recommended}`,
    "",
    "Next: baselane apply <dir> --pack " + r.recommended,
  ].join("\n");
}
