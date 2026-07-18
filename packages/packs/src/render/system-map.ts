import type { Capability, FileMap, PackHook, WorkflowPack } from "../types.ts";

const SYSTEM_MAP_README = `# System map

\`ARCHITECTURE.md\` at the repo root carries a baselane-managed region generated from static
analysis: languages, layout, commands, import-graph hotspots, and measured conventions —
including **hidden rules** (conventions the code follows at >=90% consistency that no lint
config enforces). Human prose outside the managed region is never touched.

## Regenerating

Run \`baselane map .\` from the repo root after structural changes (modules added/moved,
commands changed, conventions shifted). Add \`--llm\` for an AI-narrated architecture section
(needs BASELANE_ANTHROPIC_KEY or ANTHROPIC_API_KEY). Commit the refreshed \`ARCHITECTURE.md\`
and \`.baselane/system-map/report.json\` together.

## Reading it

Consult ARCHITECTURE.md's conventions section before writing code — the hidden rules are the
ones nobody will tell you about in review until you break them.
`;

const SYSTEM_MAP_COMMAND = {
  name: "map",
  description: "Consult or regenerate the generated ARCHITECTURE.md system map.",
  argument_hint: '<question about the architecture | "regenerate">',
  prompt:
    "Follow the protocol in `.baselane/system-map/README.md` for $ARGUMENTS. For a question, " +
    "read `ARCHITECTURE.md` (the baselane-managed region) and answer from it — especially the " +
    'Conventions & hidden rules section — before grepping. If $ARGUMENTS is "regenerate" (or ' +
    "modules/commands/conventions just changed), run `baselane map .` from the repo root and " +
    "commit the refreshed ARCHITECTURE.md and .baselane/system-map/report.json.",
};

const SYSTEM_MAP_STOP_HOOK: PackHook = {
  event: "Stop",
  matcher: "",
  description: "Reminds the agent to regenerate the system map after structural changes.",
  action: "print-reminder",
  message:
    "Before finishing, if you added/moved modules, changed commands, or shifted a convention, " +
    "regenerate the system map (`baselane map .`) — see .baselane/system-map/README.md.",
};

export const SYSTEM_MAP_AGENTS_NOTE =
  "### System map\n\n" +
  "`ARCHITECTURE.md` carries a generated, baselane-managed system map — languages, layout, " +
  "commands, import-graph hotspots, and measured conventions including hidden rules (consistent " +
  "but unenforced). Read its conventions section before writing code, and regenerate with " +
  "`baselane map .` (or `/map regenerate`) after structural changes.";

// Methods that render real scaffolding today — kept in lockstep with capabilities.ts's
// PROVISIONED_METHODS["system-map"] entry (bug #10: an unrecognized method must stay
// "coming soon" in BOTH the manifest AND the filesystem, never one without the other).
const REAL_METHODS = new Set(["analyze", "analyze+llm"]);

function systemMapCapabilities(pack: WorkflowPack, store: "org" | "repo"): Capability[] {
  return (pack.capabilities ?? []).filter((c) => c.type === "system-map" && c.store === store && REAL_METHODS.has(c.method));
}

export function hasRepoSystemMapCapability(pack: WorkflowPack): boolean {
  return systemMapCapabilities(pack, "repo").length > 0;
}

export function hasOrgSystemMapCapability(pack: WorkflowPack): boolean {
  return systemMapCapabilities(pack, "org").length > 0;
}

/** Adds the /map command + Stop-hook reminder for repo-store system-map packs. */
export function withSystemMapScaffolding(pack: WorkflowPack): WorkflowPack {
  return {
    ...pack,
    commands: [...pack.commands, SYSTEM_MAP_COMMAND],
    hooks: [...pack.hooks, SYSTEM_MAP_STOP_HOOK],
  };
}

export function renderRepoSystemMapFiles(pack: WorkflowPack): FileMap {
  if (!hasRepoSystemMapCapability(pack)) return {};
  return { ".baselane/system-map/README.md": SYSTEM_MAP_README };
}

export function renderBundleSystemMapFiles(pack: WorkflowPack): FileMap {
  if (!hasOrgSystemMapCapability(pack)) return {};
  return { "system-map/README.md": SYSTEM_MAP_README };
}
