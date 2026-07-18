import type { PackAgent, PackCommand, PackHook, SkillBlock, SkillReference, WorkflowPack } from "./types.ts";
import { validateComponent, validatePack, validateSkill } from "./validate.ts";
import { stripManagedRegion, strippedManagedPackIds } from "./merge-region.ts";

/**
 * ingest.ts — the INVERSE of render/render-pack.ts + render/claude.ts: read a repo's already-
 * rendered harness files (AGENTS.md + .claude/{skills,agents,commands,settings.json}) back into
 * a validatePack-passing WorkflowPack, so a team's own harness can flow through the same
 * preview→apply funnel as a baselane-authored pack.
 *
 * Every part is optional — a repo may have only an AGENTS.md, or only a .claude/ dir, or both.
 * Never throws for one bad file: each file is parsed/validated independently and a failure is
 * caught and recorded in `skipped`, not propagated.
 */

export interface IngestInput {
  repoName: string;
  listFiles(): Promise<string[]>;
  readFile(path: string): Promise<string | null>;
}

export interface IngestResult {
  pack: WorkflowPack;
  sources: string[];
  skipped: string[];
}

const SKILL_MD_RE = /^\.claude\/skills\/([^/]+)\/SKILL\.md$/;
const AGENT_MD_RE = /^\.claude\/agents\/([^/]+)\.md$/;
const COMMAND_MD_RE = /^\.claude\/commands\/([^/]+)\.md$/;
const SETTINGS_JSON_PATH = ".claude/settings.json";
const AGENTS_MD_PATH = "AGENTS.md";

/** Lowercase slug (letters/digits/dashes) matching validate.ts's SLUG — used both for the pack id
 * (from repoName) and for skill/agent/command names recovered from a filename or frontmatter. */
function slugify(value: string): string {
  const s = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s.length > 0 ? s : "x";
}

/** Minimal single-line `key: value` frontmatter split — same shape import-skills.ts/import-
 * bundle.ts already parse (the render templates in render/claude.ts only ever emit simple
 * single-line frontmatter values, so this is sufficient to invert them). */
function parseFrontmatter(md: string): { fm: Record<string, string>; body: string } {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(md);
  if (!m) return { fm: {}, body: md };
  const fm: Record<string, string> = {};
  for (const raw of m[1].split("\n")) {
    const kv = /^([a-zA-Z0-9_-]+):\s*(.*)$/.exec(raw.trim());
    if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, "").trim();
  }
  return { fm, body: m[2] };
}

function placeholderMarkdown(repoName: string): string {
  return `# ${repoName}\n\nNo AGENTS.md was found in this repo; this pack was ingested from its .claude/ harness only.\n`;
}

/** Strips every baselane managed region present in `content` (there can be more than one pack's
 * region in a single AGENTS.md), leaving the developer's own prose untouched — the read-side twin
 * of mergeManagedRegion. */
function stripAllManagedRegions(content: string): string {
  let out = content;
  for (const packId of strippedManagedPackIds(content)) out = stripManagedRegion(out, packId);
  return out;
}

async function ingestContextMarkdown(input: IngestInput, files: string[], sources: string[], skipped: string[]): Promise<string> {
  if (!files.includes(AGENTS_MD_PATH)) return placeholderMarkdown(input.repoName);
  try {
    const content = await input.readFile(AGENTS_MD_PATH);
    if (content === null) {
      skipped.push(AGENTS_MD_PATH);
      return placeholderMarkdown(input.repoName);
    }
    const stripped = stripAllManagedRegions(content).trim();
    sources.push(AGENTS_MD_PATH);
    return stripped.length > 0 ? stripped : placeholderMarkdown(input.repoName);
  } catch {
    skipped.push(AGENTS_MD_PATH);
    return placeholderMarkdown(input.repoName);
  }
}

async function ingestSkills(input: IngestInput, files: string[], sources: string[], skipped: string[]): Promise<SkillBlock[]> {
  const skills: SkillBlock[] = [];
  for (const path of files) {
    const m = SKILL_MD_RE.exec(path);
    if (!m) continue;
    const dirName = m[1];
    try {
      const content = await input.readFile(path);
      if (content === null) {
        skipped.push(path);
        continue;
      }
      const { fm, body } = parseFrontmatter(content);
      const name = slugify(fm.name || dirName);

      // Sibling reference files: every other *.md directly under the same skill dir.
      const refPrefix = `.claude/skills/${dirName}/`;
      const references: SkillReference[] = [];
      for (const refPath of files) {
        if (refPath === path || !refPath.startsWith(refPrefix) || !refPath.endsWith(".md")) continue;
        if (refPath.slice(refPrefix.length).includes("/")) continue; // one level deep only
        try {
          const refContent = await input.readFile(refPath);
          if (refContent === null) {
            skipped.push(refPath);
            continue;
          }
          references.push({ name: slugify(refPath.slice(refPrefix.length).replace(/\.md$/, "")), body: refContent });
          sources.push(refPath);
        } catch {
          skipped.push(refPath);
        }
      }

      const trimmedBody = body.trim();
      const candidate = {
        name,
        description: (fm.description || `Imported skill ${name}.`).trim(),
        body: (trimmedBody.length > 0 ? trimmedBody : `Imported skill ${name}.`) + "\n",
        category: fm.category || "write",
        ...(references.length > 0 ? { references } : {}),
      };
      skills.push(validateSkill(candidate));
      sources.push(path);
    } catch {
      skipped.push(path);
    }
  }
  return skills;
}

async function ingestAgents(input: IngestInput, files: string[], sources: string[], skipped: string[]): Promise<PackAgent[]> {
  const agents: PackAgent[] = [];
  for (const path of files) {
    const m = AGENT_MD_RE.exec(path);
    if (!m) continue;
    const fileBase = m[1];
    try {
      const content = await input.readFile(path);
      if (content === null) {
        skipped.push(path);
        continue;
      }
      const { fm, body } = parseFrontmatter(content);
      const name = slugify(fm.name || fileBase);
      const tools = fm.tools ? fm.tools.split(",").map((t) => t.trim()).filter(Boolean) : [];
      const trimmedBody = body.trim();
      const candidate = {
        name,
        description: (fm.description || `Imported agent ${name}.`).trim(),
        tools,
        model: fm.model || "sonnet",
        prompt: trimmedBody.length > 0 ? trimmedBody : `Agent ${name}.`,
      };
      agents.push(validateComponent("agent", candidate) as PackAgent);
      sources.push(path);
    } catch {
      skipped.push(path);
    }
  }
  return agents;
}

async function ingestCommands(input: IngestInput, files: string[], sources: string[], skipped: string[]): Promise<PackCommand[]> {
  const commands: PackCommand[] = [];
  for (const path of files) {
    const m = COMMAND_MD_RE.exec(path);
    if (!m) continue;
    const fileBase = m[1];
    try {
      const content = await input.readFile(path);
      if (content === null) {
        skipped.push(path);
        continue;
      }
      const { fm, body } = parseFrontmatter(content);
      const name = slugify(fm.name || fileBase);
      const trimmedBody = body.trim();
      // PackCommand.prompt must be a single line (validate.ts's line()); a hand-edited command
      // can have a multi-line body, so collapse it rather than fail the whole file.
      const prompt = trimmedBody.length > 0 ? trimmedBody.replace(/\s*\n\s*/g, " ").trim() : `Run ${name}.`;
      const candidate = {
        name,
        description: (fm.description || `Imported command ${name}.`).trim(),
        argument_hint: (fm["argument-hint"] || "[arguments]").trim(),
        prompt,
      };
      commands.push(validateComponent("command", candidate) as PackCommand);
      sources.push(path);
    } catch {
      skipped.push(path);
    }
  }
  return commands;
}

/** Inverts `command = echo ${JSON.stringify(message)}` (render/claude.ts's settingsJson) back into
 * the original message. Returns null when `command` doesn't match that exact shape, so it's
 * classified as a real run-command instead. */
function decodePrintReminder(command: string): string | null {
  if (!command.startsWith("echo ")) return null;
  try {
    const parsed: unknown = JSON.parse(command.slice("echo ".length));
    return typeof parsed === "string" ? parsed : null;
  } catch {
    return null;
  }
}

interface RawSettingsJson {
  hooks?: Record<string, Array<{ matcher?: string; hooks?: Array<{ command?: string }> }>>;
}

async function ingestHooks(input: IngestInput, files: string[], sources: string[], skipped: string[]): Promise<PackHook[]> {
  const hooks: PackHook[] = [];
  if (!files.includes(SETTINGS_JSON_PATH)) return hooks;
  try {
    const content = await input.readFile(SETTINGS_JSON_PATH);
    if (content === null) {
      skipped.push(SETTINGS_JSON_PATH);
      return hooks;
    }
    const parsed = JSON.parse(content) as RawSettingsJson;
    for (const [event, entries] of Object.entries(parsed.hooks ?? {})) {
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        const matcher = typeof entry.matcher === "string" ? entry.matcher : "";
        for (const h of entry.hooks ?? []) {
          if (typeof h.command !== "string" || h.command.length === 0) continue;
          const reminder = decodePrintReminder(h.command);
          const suffix = matcher ? ` (${matcher})` : "";
          const candidate = reminder !== null
            ? { event, matcher, description: `Reminder on ${event}${suffix}.`, action: "print-reminder" as const, message: reminder }
            : { event, matcher, description: `Runs a command on ${event}${suffix}.`, action: "run-command" as const, command: h.command };
          try {
            hooks.push(validateComponent("hook", candidate) as PackHook);
          } catch {
            // One malformed hook entry doesn't sink the rest of settings.json.
          }
        }
      }
    }
    sources.push(SETTINGS_JSON_PATH);
  } catch {
    skipped.push(SETTINGS_JSON_PATH);
  }
  return hooks;
}

/** Reads an existing repo's rendered harness (AGENTS.md region + .claude/{skills,agents,commands,
 * settings.json}) back into a validated WorkflowPack — the inverse of renderPack. Every part is
 * optional; a single bad file is caught and recorded in `skipped`, never aborting the ingest. */
export async function ingestHarness(input: IngestInput): Promise<IngestResult> {
  const files = await input.listFiles();
  const sources: string[] = [];
  const skipped: string[] = [];

  const markdown = await ingestContextMarkdown(input, files, sources, skipped);
  const skills = await ingestSkills(input, files, sources, skipped);
  const agents = await ingestAgents(input, files, sources, skipped);
  const commands = await ingestCommands(input, files, sources, skipped);
  const hooks = await ingestHooks(input, files, sources, skipped);

  const id = slugify(input.repoName);
  const candidate: WorkflowPack = {
    id,
    version: "0.1.0",
    title: `${input.repoName} — ingested harness`,
    summary: `Ingested from ${input.repoName}'s existing AGENTS.md/.claude harness.`,
    context: { markdown },
    ...(skills.length > 0 ? { skills } : {}),
    agents,
    commands,
    hooks,
  };

  const pack = validatePack(candidate);
  return { pack, sources, skipped };
}
