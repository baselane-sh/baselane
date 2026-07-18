import type { WorkflowPack } from "../types.ts";

/** Full skill bodies inlined for surfaces with no native skill mechanism (Option A). Empty when the
 * pack has no skills, so callers stay byte-identical for skill-less packs. */
function skillBodiesSection(pack: WorkflowPack): string[] {
  if (!pack.skills || pack.skills.length === 0) return [];
  const out: string[] = ["## Skills", ""];
  for (const s of pack.skills) {
    out.push(`### ${s.name}`, "", s.description, "", s.body.trimEnd(), "");
  }
  return out;
}

/** Copilot: no import syntax, no agent/command/hook surface — inline everything as prose. */
export function renderCopilot(pack: WorkflowPack): string {
  const parts: string[] = ["# Copilot instructions", "", pack.context.markdown.trimEnd(), ""];
  parts.push(`## Workflow pack: ${pack.title}`, "", pack.summary, "");
  if (pack.agents.length > 0) {
    for (const a of pack.agents) {
      parts.push(`When acting as the ${a.name} role: ${a.prompt}`, "");
    }
  }
  if (pack.commands.length > 0) {
    parts.push("Workflow steps:", "");
    for (const c of pack.commands) parts.push(`- ${c.name}: ${c.prompt}`);
    parts.push("");
  }
  if (pack.hooks.length > 0) {
    for (const h of pack.hooks) parts.push(`- ${h.action === "print-reminder" ? h.message : h.description}`);
    parts.push("");
  }
  parts.push(...skillBodiesSection(pack));
  return parts.join("\n");
}

/** Gemini CLI resolves @file imports like Claude Code — one-line pointer, plus full skill bodies
 * appended (Gemini has no native skill mechanism). Byte-identical to the old pointer when no skills. */
export function renderGemini(pack: WorkflowPack): string {
  const base = "# GEMINI.md\n\n@AGENTS.md\n";
  const bodies = skillBodiesSection(pack);
  if (bodies.length === 0) return base;
  return `${base}\n${bodies.join("\n")}`;
}
