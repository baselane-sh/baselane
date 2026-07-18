export type PackScope = "repo" | "developer" | "both";

/** A single onboarding step a pack recommends after adoption (increment 28). `command` is a
 * display/exec string shown to the developer — never shell-interpolated with user input. */
export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  command?: string;
}

/** Link from a pack block back to the org component-library entry it was copied from
 * (increment 26). Optional and additive: absent on every built-in pack, round-tripped by
 * validatePack, and NEVER printed into any rendered file. */
export interface BlockProvenance {
  componentId: string;
  version: number;
}

/** One MCP server an agent declares in its frontmatter (e.g. Playwright). Preserved from harness
 * bundles that scope tools per-agent; renders back as nested YAML under `mcpServers:`. Optional and
 * additive — absent on every built-in agent, so existing agent frontmatter renders unchanged. */
export interface McpServerConfig {
  command: string;
  args?: string[];
}

/** Locked canonical pack schema — see docs/superpowers/research/2026-06-25-substrate-eval.md */
export interface PackAgent {
  name: string;
  description: string;
  tools: string[];
  model: string;
  prompt: string;
  provenance?: BlockProvenance;
  /** Per-agent MCP servers (map of server name → command/args). Absent on built-ins. */
  mcpServers?: Record<string, McpServerConfig>;
}

export interface PackCommand {
  name: string;
  description: string;
  argument_hint: string;
  prompt: string;
  provenance?: BlockProvenance;
}

interface PackHookBase {
  event: string; // e.g. "PostToolUse"
  matcher: string; // e.g. "Edit|Write"
  description: string;
  provenance?: BlockProvenance;
}

export type PackHook =
  | (PackHookBase & { action: "print-reminder"; message: string })
  | (PackHookBase & { action: "run-command"; command: string });

export interface Capability {
  type: "memory" | "tasks" | "wiki" | "graph" | "design" | "system-map";
  store: "org" | "repo";
  method: string;
  config?: Record<string, string>;
  provenance?: BlockProvenance;
}

/** A single progressive-disclosure reference file bundled beside a skill's SKILL.md (increment 29).
 * `name` is a slug (one level deep — no slashes); it renders as `<name>.md` next to SKILL.md. */
export interface SkillReference {
  name: string;
  body: string;
}

/** An agentskills.io-standard skill as a pack block (increment 29). `category` is a baselane-side
 * taxonomy slug and is NEVER written into SKILL.md frontmatter. `attribution` retains an imported
 * skill's licence notice; `provenance` links a copied block back to its library SkillRecord. */
export interface SkillBlock {
  name: string;
  description: string;
  body: string;
  category: string;
  references?: SkillReference[];
  attribution?: { source: string; url: string; license: string };
  provenance?: BlockProvenance;
  /** Governance frontmatter (2026 skills⇄commands merge). All optional and additive: absent on
   * existing skills, so their SKILL.md renders byte-identically. Rendered as kebab-case keys
   * (`user-invocable` / `disable-model-invocation` / `allowed-tools`) when present. */
  userInvocable?: boolean;
  disableModelInvocation?: boolean;
  allowedTools?: string[];
}

export interface WorkflowPack {
  id: string;
  version: string;
  title: string;
  summary: string;
  context: { markdown: string };
  attribution?: { source: string; url: string; license: string };
  /** Who this pack targets. Absent → treated as "repo" (see packScope()). */
  scope?: PackScope;
  capabilities?: Capability[];
  /** Recommended post-adoption steps, tracked per target in the portal. */
  onboarding?: OnboardingStep[];
  /** Skills this pack renders (Option A). Absent → treated as []; never mutated into the object. */
  skills?: SkillBlock[];
  /** #23: names of packs/skills this one overlaps with — a catalog cross-link so a user doesn't
   * double-install near-duplicates. Library/catalog metadata only; never rendered into a file. */
  relatedTo?: string[];
  /** #23: names of packs this one is meant to replace — a stronger "use this instead of X" signal
   * than relatedTo. Library/catalog metadata only; never rendered. */
  supersedes?: string[];
  agents: PackAgent[];
  commands: PackCommand[];
  hooks: PackHook[];
}

/** Rendered output: repo-relative POSIX path → file content. */
export type FileMap = Record<string, string>;
