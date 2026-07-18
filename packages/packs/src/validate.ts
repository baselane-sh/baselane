import type { BlockProvenance, Capability, McpServerConfig, OnboardingStep, PackAgent, PackCommand, PackHook, PackScope, SkillBlock, SkillReference, WorkflowPack } from "./types.ts";

function fail(field: string, want: string): never {
  throw new Error(`workflow-pack: ${field} must be ${want}`);
}

function str(obj: Record<string, unknown>, field: string, path = field): string {
  const v = obj[field];
  if (typeof v !== "string" || v.length === 0) fail(path, "a non-empty string");
  return v;
}

function line(obj: Record<string, unknown>, field: string, path = field): string {
  const v = str(obj, field, path);
  if (v.includes("\n")) fail(path, "a single line (no newline characters)");
  return v;
}

/** Like `line()` but allows the empty string — used for hook `matcher`, which is legitimately
 * blank on events (e.g. "Stop") that have no tool to filter by. Render-time scaffolding
 * constructs hooks with `matcher: ""` directly as typed `PackHook` object literals (see
 * render/memory.ts, wiki.ts, tasks.ts, graph.ts, system-map.ts) — that's type-level intent
 * only, never itself passed through this validator. But those same rendered packs DO get
 * round-tripped through `validatePack` later (e.g. saved as a custom pack), so this must
 * accept the empty-matcher shape rather than reject it. */
function lineOrEmpty(obj: Record<string, unknown>, field: string, path = field): string {
  const v = obj[field];
  if (typeof v !== "string") fail(path, "a string");
  if (v.includes("\n")) fail(path, "a single line (no newline characters)");
  return v;
}

const SLUG = /^[a-z0-9][a-z0-9-]*$/;
// Capability methods may carry a `+`-joined modifier (e.g. system-map's "analyze+llm" — the
// analyze method with the optional LLM narration flag on), so `method` gets its own slightly
// wider pattern instead of loosening the shared `slug()` used for pack/agent/command ids.
const METHOD_SLUG = /^[a-z0-9][a-z0-9+-]*$/;

function slug(obj: Record<string, unknown>, field: string, path = field): string {
  const v = str(obj, field, path);
  if (!SLUG.test(v)) fail(path, "a lowercase slug (letters, digits, dashes)");
  return v;
}

function methodSlug(obj: Record<string, unknown>, field: string, path = field): string {
  const v = str(obj, field, path);
  if (!METHOD_SLUG.test(v)) fail(path, "a lowercase slug (letters, digits, dashes, plus)");
  return v;
}

function arr(obj: Record<string, unknown>, field: string): unknown[] {
  const v = obj[field];
  if (!Array.isArray(v)) fail(field, "an array");
  return v;
}

/** #23: an array of pack/skill names (slugs) — used by relatedTo/supersedes catalog cross-links. */
function slugArray(obj: Record<string, unknown>, field: string): string[] {
  return arr(obj, field).map((v, i) => {
    if (typeof v !== "string" || !SLUG.test(v)) fail(`${field}[${i}]`, "a lowercase slug (a pack or skill name)");
    return v;
  });
}

function rec(v: unknown, path: string): Record<string, unknown> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) fail(path, "an object");
  return v as Record<string, unknown>;
}

function bool(obj: Record<string, unknown>, field: string, path = field): boolean {
  const v = obj[field];
  if (typeof v !== "boolean") fail(path, "a boolean");
  return v;
}

function stringArray(obj: Record<string, unknown>, field: string, path = field): string[] {
  const v = obj[field];
  if (!Array.isArray(v) || v.some((t) => typeof t !== "string" || t.length === 0)) {
    fail(path, "an array of non-empty strings");
  }
  return v as string[];
}

/** Like `stringArray()` but rejects a newline in any element — for arrays whose entries are
 * joined raw into a single YAML frontmatter line (e.g. skill `allowed-tools`), where an embedded
 * newline would inject extra frontmatter keys. */
function lineStringArray(obj: Record<string, unknown>, field: string, path = field): string[] {
  const v = obj[field];
  if (!Array.isArray(v) || v.some((t) => typeof t !== "string" || t.length === 0 || t.includes("\n"))) {
    fail(path, "an array of single-line non-empty strings");
  }
  return v as string[];
}

/** Optional per-agent MCP servers (increment 30): a map of server name → { command, args? }.
 * Preserved from harness bundles that scope tools per-agent; validated structurally like
 * capability config so a stored agent can never encode a shape the render can't emit. */
function mcpServersMap(v: unknown, path: string): Record<string, McpServerConfig> {
  const o = rec(v, path);
  const out: Record<string, McpServerConfig> = {};
  for (const key of Object.keys(o)) {
    // The server name is emitted raw as a YAML key (`${name}:`) and `command` as a raw
    // `command: ${cfg.command}` line (render/claude.ts mcpServersYaml) — both must be
    // single-line/slug-shaped or a crafted value could inject extra frontmatter keys.
    if (!SLUG.test(key)) fail(`${path}.${key}`, "a lowercase slug (letters, digits, dashes)");
    const s = rec(o[key], `${path}.${key}`);
    const command = line(s, "command", `${path}.${key}.command`);
    out[key] = {
      command,
      ...(s.args !== undefined ? { args: stringArray(s, "args", `${path}.${key}.args`) } : {}),
    };
  }
  return out;
}

function agent(v: unknown, i: number): PackAgent {
  const o = rec(v, `agents[${i}]`);
  const tools = o.tools;
  if (!Array.isArray(tools) || tools.some((t) => typeof t !== "string")) {
    fail(`agents[${i}].tools`, "an array of strings");
  }
  return {
    name: slug(o, "name", `agents[${i}].name`),
    description: line(o, "description", `agents[${i}].description`),
    tools: tools as string[],
    model: str(o, "model", `agents[${i}].model`),
    prompt: str(o, "prompt", `agents[${i}].prompt`),
    ...(o.provenance !== undefined ? { provenance: blockProvenance(o.provenance, `agents[${i}].provenance`) } : {}),
    ...(o.mcpServers !== undefined ? { mcpServers: mcpServersMap(o.mcpServers, `agents[${i}].mcpServers`) } : {}),
  };
}

function command(v: unknown, i: number): PackCommand {
  const o = rec(v, `commands[${i}]`);
  return {
    name: slug(o, "name", `commands[${i}].name`),
    description: line(o, "description", `commands[${i}].description`),
    argument_hint: line(o, "argument_hint", `commands[${i}].argument_hint`),
    prompt: line(o, "prompt", `commands[${i}].prompt`),
    ...(o.provenance !== undefined ? { provenance: blockProvenance(o.provenance, `commands[${i}].provenance`) } : {}),
  };
}

// The fixed set of lifecycle events Claude Code actually fires hooks on. `line()` alone would
// accept any string, so a misspelled event (e.g. "PostToolUsee") would validate cleanly, render
// verbatim into settings.json, and then simply never fire — a silent no-op "guardrail" (bug #11).
// Exported (via index.ts) so the portal's pack-builder form can offer the same fixed list instead
// of a free-text field that only fails later, at validatePack time.
export const KNOWN_HOOK_EVENTS = [
  "PreToolUse",
  "PostToolUse",
  "Notification",
  "UserPromptSubmit",
  "Stop",
  "SubagentStop",
  "PreCompact",
  "SessionStart",
  "SessionEnd",
] as const;

const KNOWN_HOOK_EVENTS_SET: Set<string> = new Set(KNOWN_HOOK_EVENTS);

function hookEvent(obj: Record<string, unknown>, field: string, path = field): string {
  const v = line(obj, field, path);
  if (!KNOWN_HOOK_EVENTS_SET.has(v)) {
    fail(path, `a known Claude Code lifecycle event (${KNOWN_HOOK_EVENTS.join(", ")})`);
  }
  return v;
}

function hook(v: unknown, i: number): PackHook {
  const o = rec(v, `hooks[${i}]`);
  if (o.action !== "print-reminder" && o.action !== "run-command") {
    fail(`hooks[${i}].action`, '"print-reminder" or "run-command"');
  }
  const base = {
    event: hookEvent(o, "event", `hooks[${i}].event`),
    matcher: lineOrEmpty(o, "matcher", `hooks[${i}].matcher`),
    description: line(o, "description", `hooks[${i}].description`),
    ...(o.provenance !== undefined ? { provenance: blockProvenance(o.provenance, `hooks[${i}].provenance`) } : {}),
  };
  if (o.action === "run-command") {
    return { ...base, action: "run-command", command: line(o, "command", `hooks[${i}].command`) };
  }
  return { ...base, action: "print-reminder", message: line(o, "message", `hooks[${i}].message`) };
}

/** Optional per-block provenance (increment 26): validated like attribution — reject wrong
 * shapes, pass valid ones through; callers omit the key entirely when absent. */
function blockProvenance(v: unknown, path: string): BlockProvenance {
  const o = rec(v, path);
  const componentId = line(o, "componentId", `${path}.componentId`);
  const version = o.version;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    fail(`${path}.version`, "a positive integer");
  }
  return { componentId, version };
}

function capability(v: unknown, i: number): Capability {
  const o = rec(v, `capabilities[${i}]`);
  const type = o.type;
  if (type !== "memory" && type !== "tasks" && type !== "wiki" && type !== "graph" && type !== "design" && type !== "system-map") {
    fail(`capabilities[${i}].type`, '"memory", "tasks", "wiki", "graph", "design", or "system-map"');
  }
  const store = o.store;
  if (store !== "org" && store !== "repo") {
    fail(`capabilities[${i}].store`, '"org" or "repo"');
  }
  const method = methodSlug(o, "method", `capabilities[${i}].method`);
  const prov = o.provenance !== undefined ? { provenance: blockProvenance(o.provenance, `capabilities[${i}].provenance`) } : {};
  if (o.config === undefined) return { type, store, method, ...prov };
  const rawConfig = rec(o.config, `capabilities[${i}].config`);
  const config: Record<string, string> = {};
  for (const key of Object.keys(rawConfig)) {
    config[key] = line(rawConfig, key, `capabilities[${i}].config.${key}`);
  }
  return { type, store, method, config, ...prov };
}

/** Capabilities that render to the same output artifact collide silently if two are declared for
 * one store — the render layer keys by a fixed path and the second write clobbers the first, while
 * the capabilities manifest still prints both "provisioned". Reject the contradiction at the source:
 *   #21  memory "files" and "native" each own the `/remember` command + a fact store — at most one.
 *        (claude-mem/vector/letta only add Stop hooks, so they stack harmlessly and are unrestricted.)
 *   #20/#37  every design method (author/import/analyze) renders the single root DESIGN.md — at most
 *        one design capability per store; a second is dropped by render/design.ts's `.find()`. */
function assertNoCapabilityConflicts(capabilities: Capability[]): void {
  for (const store of ["org", "repo"] as const) {
    const inStore = capabilities.filter((c) => c.store === store);
    const memory = new Set(inStore.filter((c) => c.type === "memory").map((c) => c.method));
    if (memory.has("files") && memory.has("native")) {
      fail("capabilities", `at most one of memory "files" or "native" per store (both declared for "${store}" — they own conflicting /remember commands)`);
    }
    if (inStore.filter((c) => c.type === "design").length > 1) {
      fail("capabilities", `at most one design capability per store (multiple declared for "${store}" — they all render the single DESIGN.md)`);
    }
  }
}

function attribution(v: unknown): { source: string; url: string; license: string } {
  const o = rec(v, "attribution");
  return {
    source: line(o, "source", "attribution.source"),
    url: line(o, "url", "attribution.url"),
    license: line(o, "license", "attribution.license"),
  };
}

function scope(v: unknown): PackScope {
  if (v !== "repo" && v !== "developer" && v !== "both") fail("scope", '"repo", "developer", or "both"');
  return v;
}

function onboarding(v: unknown): OnboardingStep[] {
  if (!Array.isArray(v)) fail("onboarding", "an array");
  const seen = new Set<string>();
  return v.map((raw, i) => {
    const o = rec(raw, `onboarding[${i}]`);
    const id = slug(o, "id", `onboarding[${i}].id`);
    if (seen.has(id)) fail(`onboarding[${i}].id`, "unique within the pack");
    seen.add(id);
    return {
      id,
      title: line(o, "title", `onboarding[${i}].title`),
      description: line(o, "description", `onboarding[${i}].description`),
      ...(o.command !== undefined ? { command: line(o, "command", `onboarding[${i}].command`) } : {}),
    };
  });
}

export const SKILL_NAME_MAX = 64;
export const SKILL_DESC_MAX = 1024;
// Hard ceiling is a sanity bound, not an authoring target — real ecosystem skills routinely run
// 1-2k lines (garrytan/gstack's spec/SKILL.md is ~2.4k), and ingest must not reject them. The
// 400-line soft warning below is the authoring-quality nudge.
export const SKILL_BODY_MAX_LINES = 5000;
export const SKILL_BODY_WARN_LINES = 400;

export interface SkillLint {
  field: string;
  message: string;
}

const XML_TAG = /<\/?[a-zA-Z][^>]*>/;

/** name: slug, ≤64 chars. A name containing "anthropic"/"claude" is NOT rejected here — that
 * restriction is agentskills.io's anti-impersonation rule for the *public upload* path, not a
 * filesystem/catalog file-validity rule, so it must not hard-reject legitimate first-party
 * content in baselane's own library (e.g. an imported `claude-api` skill). skillLints() below
 * surfaces it as an amber advisory instead. */
function skillName(obj: Record<string, unknown>, path: string): string {
  const v = str(obj, "name", `${path}.name`);
  if (!SLUG.test(v)) fail(`${path}.name`, "a lowercase slug (letters, digits, dashes)");
  if (v.length > SKILL_NAME_MAX) fail(`${path}.name`, `at most ${SKILL_NAME_MAX} characters`);
  return v;
}

/** description: non-empty single line, ≤1024 chars, no XML tag (discovery field — kept clean). */
function skillDescription(obj: Record<string, unknown>, path: string): string {
  const v = line(obj, "description", `${path}.description`);
  if (v.length > SKILL_DESC_MAX) fail(`${path}.description`, `at most ${SKILL_DESC_MAX} characters`);
  if (XML_TAG.test(v)) fail(`${path}.description`, "free of XML tags");
  return v;
}

/** body: non-empty markdown, ≤5000 lines (hard ceiling; the 400-line soft warning is a skillLint). */
function skillBody(obj: Record<string, unknown>, path: string): string {
  const v = str(obj, "body", `${path}.body`);
  if (v.split("\n").length > SKILL_BODY_MAX_LINES) {
    fail(`${path}.body`, `at most ${SKILL_BODY_MAX_LINES} lines`);
  }
  return v;
}

function skillReference(v: unknown, path: string): SkillReference {
  const o = rec(v, path);
  return {
    name: slug(o, "name", `${path}.name`),
    body: str(o, "body", `${path}.body`),
  };
}

/** The single skill validator, path-parameterised so validatePack (`skills[i]`) and validateSkill
 * (`skill`) share one code path. Reuses attribution()/blockProvenance() so a skill's optional
 * licence notice and library link validate exactly like a pack's. */
function skillAt(v: unknown, path: string): SkillBlock {
  const o = rec(v, path);
  return {
    name: skillName(o, path),
    description: skillDescription(o, path),
    body: skillBody(o, path),
    category: slug(o, "category", `${path}.category`),
    ...(o.references !== undefined
      ? { references: arr(o, "references").map((r, i) => skillReference(r, `${path}.references[${i}]`)) }
      : {}),
    ...(o.attribution !== undefined ? { attribution: attribution(o.attribution) } : {}),
    ...(o.provenance !== undefined ? { provenance: blockProvenance(o.provenance, `${path}.provenance`) } : {}),
    // Governance frontmatter — validated with kebab-case error paths (matching the SKILL.md keys)
    // so a lint points the author at the frontmatter line they wrote, not the internal camelCase.
    ...(o.userInvocable !== undefined ? { userInvocable: bool(o, "userInvocable", `${path}.user-invocable`) } : {}),
    ...(o.disableModelInvocation !== undefined ? { disableModelInvocation: bool(o, "disableModelInvocation", `${path}.disable-model-invocation`) } : {}),
    ...(o.allowedTools !== undefined ? { allowedTools: lineStringArray(o, "allowedTools", `${path}.allowed-tools`) } : {}),
  };
}

/** The sole authority on a SkillBlock — mirrors validatePack for skills. Throws (like validatePack)
 * on anything invalid; callers guard. */
export function validateSkill(raw: unknown): SkillBlock {
  return skillAt(raw, "skill");
}

/** Non-throwing soft advisories surfaced when a skill is created or edited (portal's
 * /app/skills/save, rendered as an amber notice by skillsPage — never blocks a save): warns when a
 * body nears the 500-line ceiling, and when a name contains "anthropic"/"claude" (agentskills.io's
 * public-upload anti-impersonation signal — worth an admin's attention here, but not a reject).
 * Hard violations are rejected by validateSkill; this only surfaces amber. */
export function skillLints(block: SkillBlock): SkillLint[] {
  const lints: SkillLint[] = [];
  if (block.body.split("\n").length >= SKILL_BODY_WARN_LINES) {
    lints.push({ field: "body", message: `body is over ${SKILL_BODY_WARN_LINES} lines; consider splitting into references` });
  }
  if (block.name.includes("anthropic") || block.name.includes("claude")) {
    lints.push({ field: "name", message: 'name contains the reserved word "anthropic" or "claude" — confirm this is legitimate first-party content, not impersonation' });
  }
  return lints;
}

export function validatePack(raw: unknown): WorkflowPack {
  const o = rec(raw, "root");
  const context = rec(o.context, "context");
  const capabilities = o.capabilities !== undefined ? arr(o, "capabilities").map(capability) : undefined;
  if (capabilities) assertNoCapabilityConflicts(capabilities);
  return {
    id: slug(o, "id"),
    version: str(o, "version"),
    title: line(o, "title"),
    summary: line(o, "summary"),
    context: { markdown: str(context, "markdown", "context.markdown") },
    ...(o.attribution !== undefined ? { attribution: attribution(o.attribution) } : {}),
    ...(o.scope !== undefined ? { scope: scope(o.scope) } : {}),
    ...(capabilities !== undefined ? { capabilities } : {}),
    ...(o.onboarding !== undefined ? { onboarding: onboarding(o.onboarding) } : {}),
    ...(o.skills !== undefined ? { skills: arr(o, "skills").map((v, i) => skillAt(v, `skills[${i}]`)) } : {}),
    ...(o.relatedTo !== undefined ? { relatedTo: slugArray(o, "relatedTo") } : {}),
    ...(o.supersedes !== undefined ? { supersedes: slugArray(o, "supersedes") } : {}),
    agents: arr(o, "agents").map(agent),
    commands: arr(o, "commands").map(command),
    hooks: arr(o, "hooks").map(hook),
  };
}

export type ComponentBlockType = "agent" | "command" | "hook" | "rules" | "capability";

/** Validates a single reusable library-component payload by reusing the EXACT block validators
 * validatePack uses (`agent`/`command`/`hook`/`capability` above) — so a stored component can never
 * encode a block validatePack would later reject. Returns the canonical, extra-field-stripped block
 * (or the markdown string for "rules"). Throws (like validatePack) on anything invalid; callers guard. */
export function validateComponent(
  blockType: ComponentBlockType,
  payload: unknown,
): PackAgent | PackCommand | PackHook | Capability | string {
  switch (blockType) {
    case "agent":
      return agent(payload, 0);
    case "command":
      return command(payload, 0);
    case "hook":
      return hook(payload, 0);
    case "capability":
      return capability(payload, 0);
    case "rules":
      if (typeof payload !== "string" || payload.length === 0) {
        fail("rules", "a non-empty markdown string");
      }
      return payload;
    default: {
      const exhaustive: never = blockType;
      fail("blockType", `one of agent, command, hook, rules, capability (got ${String(exhaustive)})`);
    }
  }
}

/** The pack's target scope, defaulting an absent scope to "repo" so every pre-increment-28 pack
 * (built-in or custom) keeps today's repo behavior. This is the ONLY place the default is applied —
 * validatePack never injects `scope` into the object, so a pack's bytes round-trip unchanged. */
export function packScope(pack: WorkflowPack): PackScope {
  return pack.scope ?? "repo";
}
