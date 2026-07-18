import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { join, dirname, basename, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { validatePack, validateSkill, validateComponent } from "../src/validate.ts";
import type { McpServerConfig, PackAgent, PackCommand, PackHook, SkillBlock, WorkflowPack } from "../src/types.ts";

/**
 * import-bundle.ts — turn a locally-extracted agent-harness bundle into ONE
 * validatePack-passing WorkflowPack. Sibling of import-skills.ts: same discipline
 * (parse frontmatter → build blocks → VALIDATE via the sole authority), zero deps.
 *
 * Handles both bundle layouts seen in the corpus:
 *   - flat multi-skill repo (AL-Design): each top-level dir is a skill with a SKILL.md.
 *   - harness layout: `.claude/{agents,commands,skills}` + `rules/` + `CLAUDE.md`.
 *
 * Every block is validated individually; anything invalid is skipped with a warning
 * (never a silent drop, never aborting the whole bundle), mirroring import-skills.ts.
 */

export interface ImportOptions {
  /** Pack id (slug). Default: slugified bundle dir basename. */
  id?: string;
  title?: string;
  summary?: string;
  version?: string;
  scope?: "repo" | "developer" | "both";
  /** Attribution source/url stamped on skills that declare a license. */
  source?: string;
  url?: string;
  /** Default baselane-side category slug for imported skills. */
  category?: string;
}

export interface ImportResult {
  pack: WorkflowPack;
  warnings: string[];
}

const SKIP_DIRS = new Set([".git", "node_modules", "__MACOSX"]);

interface Found {
  abs: string;
  /** POSIX-normalised path relative to the bundle root. */
  rel: string;
}

async function walk(root: string): Promise<Found[]> {
  const out: Found[] = [];
  async function recur(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name.startsWith("._") || e.name === ".DS_Store") continue;
      const abs = join(dir, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        await recur(abs);
      } else if (e.isFile()) {
        out.push({ abs, rel: relative(root, abs).split(sep).join("/") });
      }
    }
  }
  await recur(root);
  return out;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "x";
}

/** Split a `---\n...\n---\n\nbody` doc into raw frontmatter text + body. */
function splitFrontmatter(md: string): { raw: string; body: string } {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(md);
  if (!m) return { raw: "", body: md };
  return { raw: m[1], body: m[2] };
}

/** Line-based `key: value` frontmatter (same shape as import-skills.ts). Nested blocks
 * (e.g. mcpServers) are handled separately by parseMcpServers. */
function simpleFields(raw: string): Record<string, string> {
  const fm: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    // Only top-level (unindented) `key: value` pairs — indented lines belong to a nested block.
    if (/^\s/.test(line)) continue;
    const kv = /^([a-zA-Z0-9_-]+):\s*(.*)$/.exec(line);
    if (kv && kv[2] !== "") fm[kv[1]] = kv[2].replace(/^["']|["']$/g, "").trim();
  }
  return fm;
}

/** Parse a nested `mcpServers:` block (server → { command, args? }) from frontmatter. Bounded to
 * the two-level command/args shape the harness bundles use; returns undefined when absent. */
function parseMcpServers(raw: string): Record<string, McpServerConfig> | undefined {
  const lines = raw.split("\n");
  const start = lines.findIndex((l) => /^mcpServers:\s*$/.test(l));
  if (start < 0) return undefined;
  const servers: Record<string, McpServerConfig> = {};
  let current: string | null = null;
  let inArgs = false;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^\S/.test(line)) break; // dedented back to another top-level key
    const server = /^\s{2}([A-Za-z0-9_-]+):\s*$/.exec(line);
    if (server) { current = server[1]; servers[current] = { command: "" }; inArgs = false; continue; }
    if (!current) continue;
    const cmd = /^\s{4}command:\s*(.+)$/.exec(line);
    if (cmd) { servers[current].command = cmd[1].replace(/^["']|["']$/g, "").trim(); inArgs = false; continue; }
    if (/^\s{4}args:\s*$/.test(line)) { servers[current].args = []; inArgs = true; continue; }
    const arg = /^\s{6}-\s*(.+)$/.exec(line);
    if (arg && inArgs) { (servers[current].args ??= []).push(arg[1].replace(/^["']|["']$/g, "").trim()); }
  }
  return Object.keys(servers).length > 0 ? servers : undefined;
}

/** Deepest non-empty skill dir that is an ancestor of `rel` (owns it as a reference/asset). */
function ownerSkillDir(rel: string, skillDirs: string[]): string | null {
  let best: string | null = null;
  for (const d of skillDirs) {
    if (d === "") continue; // a root-level SKILL.md owns only its own body, no references
    if (rel.startsWith(`${d}/`) && (best === null || d.length > best.length)) best = d;
  }
  return best;
}

function toBoolean(v: string | undefined): boolean | undefined {
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}

export async function importBundle(dir: string, opts: ImportOptions = {}): Promise<ImportResult> {
  const files = await walk(dir);
  const warnings: string[] = [];
  const byRel = new Map(files.map((f) => [f.rel, f.abs]));

  const skillMdFiles = files.filter((f) => f.rel === "SKILL.md" || f.rel.endsWith("/SKILL.md"));
  const skillDirs = skillMdFiles.map((f) => (f.rel === "SKILL.md" ? "" : dirname(f.rel)));

  // ---- Skills ----
  const skills: SkillBlock[] = [];
  for (const smd of skillMdFiles) {
    const skillDir = smd.rel === "SKILL.md" ? "" : dirname(smd.rel);
    const md = await readFile(smd.abs, "utf8");
    const { raw, body } = splitFrontmatter(md);
    const fm = simpleFields(raw);
    const name = slugify(fm.name || (skillDir ? basename(skillDir) : "skill"));

    // References: every OTHER `.md` file owned by this skill dir, flattened to a one-level slug.
    const owned = files.filter((f) => f.rel !== smd.rel && ownerSkillDir(f.rel, skillDirs) === skillDir);
    const references: { name: string; body: string }[] = [];
    const usedRefNames = new Set<string>();
    for (const f of owned.sort((a, b) => a.rel.localeCompare(b.rel))) {
      if (!f.rel.endsWith(".md")) { warnings.push(`skill "${name}": dropped non-markdown sidecar ${f.rel} (only .md references are carried)`); continue; }
      const relToSkill = skillDir ? relative(skillDir, dirname(f.rel)) : dirname(f.rel);
      let refName = slugify(basename(f.rel, ".md"));
      if (usedRefNames.has(refName)) refName = slugify(`${relToSkill}-${basename(f.rel, ".md")}`);
      if (usedRefNames.has(refName)) { warnings.push(`skill "${name}": reference name collision on ${f.rel}, skipped`); continue; }
      usedRefNames.add(refName);
      references.push({ name: refName, body: await readFile(f.abs, "utf8") });
    }

    // Attribution only when a license is declared — never fabricated (retain-notice honesty).
    const license = fm.license;
    if (!license) warnings.push(`skill "${name}": no license declared — imported without attribution; founder call needed on licensing`);
    const attribution = license && opts.source && opts.url
      ? { source: opts.source, url: opts.url, license }
      : undefined;

    const allowed = fm["allowed-tools"];
    const block: SkillBlock = {
      name,
      description: (fm.description || `Imported skill ${name}.`).trim(),
      // Trim both ends: the leading blank line after the `---` fence would otherwise render as a
      // double blank line, since skillMd already inserts one blank line after the frontmatter.
      body: body.trim() + "\n",
      category: opts.category ?? "write",
      ...(references.length > 0 ? { references } : {}),
      ...(attribution ? { attribution } : {}),
      ...(toBoolean(fm["user-invocable"]) !== undefined ? { userInvocable: toBoolean(fm["user-invocable"]) } : {}),
      ...(toBoolean(fm["disable-model-invocation"]) !== undefined ? { disableModelInvocation: toBoolean(fm["disable-model-invocation"]) } : {}),
      ...(allowed ? { allowedTools: allowed.split(",").map((t) => t.trim()).filter(Boolean) } : {}),
    };
    try {
      skills.push(validateSkill(block));
    } catch (err) {
      warnings.push(`skill "${name}": SKIPPED — ${(err as Error).message}`);
    }
  }

  // ---- Agents ----
  // Any `agents/*.md` (`.claude/agents/` or a nested `<loop>/agents/`), but not a file owned by a
  // skill dir — a skill's own `agents/` files belong to that skill, not the pack's agent list.
  const agents: PackAgent[] = [];
  for (const f of files.filter((f) => /(^|\/)agents\/[^/]+\.md$/.test(f.rel) && ownerSkillDir(f.rel, skillDirs) === null)) {
    const { raw, body } = splitFrontmatter(await readFile(f.abs, "utf8"));
    const fm = simpleFields(raw);
    const name = slugify(fm.name || basename(f.rel, ".md"));
    const toolsRaw = fm.tools ?? fm["allowed-tools"];
    const tools = toolsRaw ? toolsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];
    if (!toolsRaw) warnings.push(`agent "${name}": no tools declared — defaulted to []`);
    const mcpServers = parseMcpServers(raw);
    const candidate = {
      name,
      description: (fm.description || `Imported agent ${name}.`).trim(),
      tools,
      model: fm.model || "sonnet",
      prompt: body.trim() || `Agent ${name}.`,
      ...(mcpServers ? { mcpServers } : {}),
    };
    try {
      agents.push(validateComponent("agent", candidate) as PackAgent);
    } catch (err) {
      warnings.push(`agent "${name}": SKIPPED — ${(err as Error).message}`);
    }
  }

  // ---- Commands ----
  const commands: PackCommand[] = [];
  for (const f of files.filter((f) => /(^|\/)commands\/[^/]+\.md$/.test(f.rel) && ownerSkillDir(f.rel, skillDirs) === null)) {
    const { raw, body } = splitFrontmatter(await readFile(f.abs, "utf8"));
    const fm = simpleFields(raw);
    const name = slugify(fm.name || basename(f.rel, ".md"));
    const trimmed = body.trim();
    // PackCommand.prompt is single-line (validate.ts uses line()); collapse a multi-line body
    // and flag it — a rich command body is a founder call (fold to a skill or context).
    const prompt = trimmed.replace(/\s*\n\s*/g, " ").trim();
    if (trimmed.includes("\n")) warnings.push(`command "${name}": multi-line body collapsed to a single-line prompt — baselane commands are single line; founder call whether to fold into a skill`);
    const candidate = {
      name,
      description: (fm.description || `Imported command ${name}.`).trim(),
      argument_hint: (fm["argument-hint"] || "[arguments]").trim(),
      prompt: prompt || `Run ${name}.`,
    };
    try {
      commands.push(validateComponent("command", candidate) as PackCommand);
    } catch (err) {
      warnings.push(`command "${name}": SKIPPED — ${(err as Error).message}`);
    }
  }

  // ---- Hooks (best-effort from .claude/settings.json) ----
  const hooks: PackHook[] = [];
  const settingsRel = files.find((f) => /(^|\/)\.claude\/settings\.json$/.test(f.rel));
  if (settingsRel) {
    try {
      const settings = JSON.parse(await readFile(settingsRel.abs, "utf8")) as {
        hooks?: Record<string, Array<{ matcher?: string; hooks?: Array<{ command?: string }> }>>;
      };
      for (const [event, entries] of Object.entries(settings.hooks ?? {})) {
        for (const entry of entries) {
          for (const h of entry.hooks ?? []) {
            if (!h.command) continue;
            const candidate = {
              event,
              matcher: entry.matcher ?? "",
              description: `Imported ${event} hook.`,
              action: "run-command" as const,
              command: h.command,
            };
            try {
              hooks.push(validateComponent("hook", candidate) as PackHook);
            } catch (err) {
              warnings.push(`hook (${event}): SKIPPED — ${(err as Error).message}`);
            }
          }
        }
      }
    } catch (err) {
      warnings.push(`settings.json: could not parse hooks — ${(err as Error).message}`);
    }
  }

  // ---- Context ----
  const contextParts: string[] = [];
  for (const rel of ["CLAUDE.md", "AGENTS.md"]) {
    const abs = byRel.get(rel);
    if (abs) contextParts.push((await readFile(abs, "utf8")).trim());
  }
  const ruleFiles = files
    .filter((f) => f.rel.endsWith(".md") && /(^|\/)rules\//.test(f.rel) && ownerSkillDir(f.rel, skillDirs) === null)
    .sort((a, b) => a.rel.localeCompare(b.rel));
  for (const f of ruleFiles) contextParts.push((await readFile(f.abs, "utf8")).trim());

  const id = opts.id ?? slugify(basename(dir));
  const title = opts.title ?? basename(dir);
  const summary = opts.summary ?? `Imported from the ${basename(dir)} bundle.`;
  let markdown = contextParts.filter(Boolean).join("\n\n");
  if (!markdown) {
    // No prose context in the bundle — generate a skills/roles index so context is never empty.
    const lines = [`## ${title}`, "", summary, ""];
    if (skills.length > 0) {
      lines.push("Bundled skills:");
      for (const s of skills) lines.push(`- **${s.name}** — ${s.description}`);
    }
    markdown = lines.join("\n") + "\n";
  }

  const pack: WorkflowPack = {
    id,
    version: opts.version ?? "1.0.0",
    title,
    summary,
    context: { markdown },
    ...(opts.scope ? { scope: opts.scope } : {}),
    ...(skills.length > 0 ? { skills } : {}),
    agents,
    commands,
    hooks,
  };

  // Defensive: the assembled pack must pass the sole authority (each block was pre-validated).
  return { pack: validatePack(pack), warnings };
}

// ---------------------------------------------------------------------------
// CLI: import-bundle <bundle-dir> [--id x] [--out file.json] emits one pack JSON.
// Guarded so importing this module (tests) never runs the CLI.
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) { flags[args[i].slice(2)] = args[i + 1] ?? ""; i++; }
    else positional.push(args[i]);
  }
  const dir = positional[0];
  if (!dir) { console.error("usage: import-bundle <bundle-dir> [--id x] [--title t] [--summary s] [--source r] [--url u] [--category c] [--out file.json]"); process.exitCode = 1; return; }
  const { pack, warnings } = await importBundle(dir, {
    id: flags.id, title: flags.title, summary: flags.summary,
    source: flags.source, url: flags.url, category: flags.category, scope: flags.scope as ImportOptions["scope"],
  });
  const json = JSON.stringify(pack, null, 2) + "\n";
  if (flags.out) {
    await mkdir(dirname(flags.out), { recursive: true });
    await writeFile(flags.out, json, "utf8");
    console.error(`Wrote ${flags.out} (${pack.skills?.length ?? 0} skills, ${pack.agents.length} agents, ${pack.commands.length} commands, ${pack.hooks.length} hooks).`);
  } else {
    process.stdout.write(json);
  }
  for (const w of warnings) console.error(`WARN ${w}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => { console.error(err); process.exitCode = 1; });
}
