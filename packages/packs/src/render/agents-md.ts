import type { WorkflowPack } from "../types.ts";
import { renderCapabilities } from "./capabilities.ts";

const FOOTER =
  "Tool-specific implementations live alongside this file (see `CLAUDE.md` for the " +
  "Claude Code implementation). Tools without a native subagent/command surface should " +
  "treat the sections above as operating instructions.";

/** Canonical AGENTS.md: context verbatim, then the pack as tool-agnostic sections. */
export function renderAgentsMd(pack: WorkflowPack): string {
  const a = pack.attribution;
  const parts: string[] = [
    "# AGENTS.md",
    "",
    `<!-- generated from workflow-pack ${pack.id} v${pack.version} -->`,
    ...(a ? [`<!-- adapted from ${a.source} (${a.license}) — ${a.url} -->`] : []),
    "",
    pack.context.markdown.trimEnd(),
    "",
  ];
  const { section } = renderCapabilities(pack);
  if (section) parts.push(section, "");
  parts.push(`## Workflow pack: ${pack.title}`, "", pack.summary, "");
  if (pack.agents.length > 0) {
    parts.push("### Roles", "");
    for (const a of pack.agents) parts.push(`- **${a.name}** — ${a.description}`);
    parts.push("");
  }
  if (pack.commands.length > 0) {
    parts.push("### Commands", "");
    for (const c of pack.commands) {
      parts.push(`- **/${c.name}** \`${c.argument_hint}\` — ${c.description}`);
      parts.push(`  - How it runs: ${c.prompt}`);
    }
    parts.push("");
  }
  if (pack.hooks.length > 0) {
    parts.push("### Guardrails", "");
    for (const h of pack.hooks) parts.push(`- ${h.description}`);
    parts.push("");
  }
  if (pack.skills && pack.skills.length > 0) {
    parts.push("### Skills", "");
    for (const s of pack.skills) parts.push(`- **${s.name}** — ${s.description}`);
    parts.push("");
  }
  parts.push(FOOTER, "");
  return parts.join("\n");
}
