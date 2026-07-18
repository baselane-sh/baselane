export { runInstall, installFromManifest } from "@baselane/materialize";
export type { InstallOptions, InstallReport } from "@baselane/materialize";
import { decodeSkillPin, type InstallReport } from "@baselane/materialize";

export function formatInstallReport(r: InstallReport): string {
  const head = `${r.dryRun ? "DRY RUN — " : ""}baselane install → ${r.targetDir}`;
  const packs = Object.entries(r.packs).map(([n, p]) => {
    const { ref, onlySkill } = decodeSkillPin(p);
    return `  ${n}@${ref}${onlySkill ? ` (skill: ${onlySkill})` : ""}`;
  });
  const body = `${r.dryRun ? "would write" : "wrote"} ${r.writes.length} file(s), removed ${r.deletes.length}, ` +
    `backed up ${r.driftedBackedUp.length} drifted (*.baselane-bak), left ${r.unchanged.length} unchanged`;
  return [head, ...packs, body, ...r.notes.map((n) => `  note: ${n}`)].join("\n");
}
