import type { FileMap, McpServerConfig, PackAgent, SkillBlock, WorkflowPack } from "../types.ts";

/** One native SKILL.md: required name+description frontmatter, optional governance keys
 * (user-invocable / disable-model-invocation / allowed-tools), optional license key + attribution
 * comment (retained import notice), then the body verbatim. category/provenance are baselane-side
 * and never written here. Governance keys sit after description and before license, so a skill with
 * none of them renders byte-identically to before. */
function skillMd(s: SkillBlock): string {
  const fm = [`name: ${s.name}`, `description: ${s.description}`];
  if (s.userInvocable !== undefined) fm.push(`user-invocable: ${s.userInvocable}`);
  if (s.disableModelInvocation !== undefined) fm.push(`disable-model-invocation: ${s.disableModelInvocation}`);
  if (s.allowedTools !== undefined && s.allowedTools.length > 0) fm.push(`allowed-tools: ${s.allowedTools.join(", ")}`);
  if (s.attribution) fm.push(`license: ${s.attribution.license}`);
  const notice = s.attribution
    ? `<!-- adapted from ${s.attribution.source} (${s.attribution.license}) — ${s.attribution.url} -->\n\n`
    : "";
  const body = s.body.endsWith("\n") ? s.body : `${s.body}\n`;
  return `---\n${fm.join("\n")}\n---\n\n${notice}${body}`;
}

function claudeMd(pack: WorkflowPack): string {
  const lines = ["# CLAUDE.md", "", "@AGENTS.md", ""];
  const artifacts: string[] = [];
  for (const a of pack.agents) artifacts.push(`- Subagent: \`.claude/agents/${a.name}.md\``);
  for (const c of pack.commands) artifacts.push(`- Command: \`.claude/commands/${c.name}.md\``);
  if (pack.hooks.length > 0) artifacts.push("- Hooks: see `.claude/settings.json`");
  for (const s of pack.skills ?? []) {
    artifacts.push(`- Skill: \`.claude/skills/${s.name}/SKILL.md\` — ${s.description}`);
  }
  // #34: a zero-artifact pack has no native Claude Code implementation to announce. Emitting the
  // preamble followed by an empty list is a false identity — render only the @AGENTS.md importer.
  if (artifacts.length > 0) {
    lines.push("This project defines a native Claude Code implementation of this workflow pack:");
    lines.push(...artifacts, "");
  }
  return lines.join("\n");
}

function settingsJson(pack: WorkflowPack): string {
  const byEvent: Record<string, { matcher: string; hooks: { type: "command"; command: string }[] }[]> = {};
  for (const h of pack.hooks) {
    const command = h.action === "run-command" ? h.command : `echo ${JSON.stringify(h.message)}`;
    const entry = {
      matcher: h.matcher,
      hooks: [{ type: "command" as const, command }],
    };
    (byEvent[h.event] ??= []).push(entry);
  }
  return JSON.stringify({ hooks: byEvent }, null, 2) + "\n";
}

/** Nested-YAML `mcpServers:` block for an agent's frontmatter (server name → command/args). Emitted
 * only when present, so an agent without MCP servers renders exactly as before. Values are quoted
 * with JSON.stringify — valid YAML and byte-matching the harness bundles' quoted args. */
function mcpServersYaml(servers: Record<string, McpServerConfig>): string {
  const lines = ["mcpServers:"];
  for (const [name, cfg] of Object.entries(servers)) {
    lines.push(`  ${name}:`, `    command: ${cfg.command}`);
    if (cfg.args && cfg.args.length > 0) {
      lines.push("    args:");
      for (const a of cfg.args) lines.push(`      - ${JSON.stringify(a)}`);
    }
  }
  return lines.join("\n");
}

function agentMd(a: PackAgent): string {
  const mcp = a.mcpServers && Object.keys(a.mcpServers).length > 0 ? `\n${mcpServersYaml(a.mcpServers)}` : "";
  return `---\nname: ${a.name}\ndescription: ${a.description}\ntools: ${a.tools.join(", ")}\nmodel: ${a.model}${mcp}\n---\n\n${a.prompt}\n`;
}

/** Claude Code output: thin CLAUDE.md importer + native agent/command/hook artifacts. */
export function renderClaudeFiles(pack: WorkflowPack): FileMap {
  const files: FileMap = { "CLAUDE.md": claudeMd(pack) };
  for (const a of pack.agents) {
    files[`.claude/agents/${a.name}.md`] = agentMd(a);
  }
  for (const c of pack.commands) {
    files[`.claude/commands/${c.name}.md`] =
      `---\ndescription: ${c.description}\nargument-hint: ${c.argument_hint}\n---\n\n${c.prompt}\n`;
  }
  for (const s of pack.skills ?? []) {
    files[`.claude/skills/${s.name}/SKILL.md`] = skillMd(s);
    for (const r of s.references ?? []) {
      files[`.claude/skills/${s.name}/${r.name}.md`] = r.body.endsWith("\n") ? r.body : `${r.body}\n`;
    }
  }
  if (pack.hooks.length > 0) files[".claude/settings.json"] = settingsJson(pack);
  return files;
}
