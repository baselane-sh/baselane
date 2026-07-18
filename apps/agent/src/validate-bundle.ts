import type { Bundle, BundleOnboardingStep } from "@baselane/materialize";

// `memory/` carries an org-store memory capability's protocol doc(s) — memory/README.md for
// method files, or memory/<method>/README.md for every other method (native/claude-mem/
// vector/letta) — plus any facts the agent writes there; `tasks/` carries an org-store tasks
// capability's protocol doc(s) the same way (tasks/README.md, or tasks/<method>/README.md) plus
// PLAN.md/progress.md the agent maintains; `wiki/` carries an org-store wiki+baselane
// capability's protocol doc (wiki/README.md) plus the pages/index.md/log.md the agent
// maintains — all agent-managed on the laptop, not committed per repo. `mcp/` carries an
// org-store wiki+deepwiki capability's ready-to-merge MCP server snippet (mcp/deepwiki.json);
// `deepwiki/` carries that same capability's Setup/Usage README; `docs-as-context/` carries an
// org-store wiki+docs capability's README (no wiki state dir — it points at the repo's own docs).
// `graph/` carries an org-store graph capability's protocol doc(s) — graph/README.md for method
// imports, or graph/<method>/README.md for every other real method (graphify/aider/lsp/
// sourcegraph); the lsp method's .baselane/mcp/serena.json snippet is repo-local by nature and
// never rendered into the bundle, so it never needs its own bundle allowlist entry.
// `system-map/` carries an org-store system-map capability's protocol doc (system-map/README.md)
// generated from the repo's analyzed import graph — laptop-root like the others.
const ALLOWED_ROOTS = [
  "agents/",
  "commands/",
  "skills/",
  "memory/",
  "tasks/",
  "wiki/",
  "mcp/",
  "deepwiki/",
  "docs-as-context/",
  "graph/",
  "system-map/",
];
// settings.json is the machine-level hooks merge target (never manifest-managed, see
// settings-merge.ts); .baselane/capabilities.json is the read-only capabilities manifest;
// DESIGN.md is an org-store design capability's Stitch doc, laptop-root like the others.
const ALLOWED_EXACT = ["settings.json", ".baselane/capabilities.json", "DESIGN.md"];

function fail(what: string, want: string): never {
  throw new Error(`bundle: ${what} must be ${want}`);
}

function checkKey(key: string): void {
  const label = `files["${key}"]`;
  if (key.startsWith("/") || /^[A-Za-z]:/.test(key)) fail(label, "a relative path");
  if (key.includes("\\")) fail(label, "a POSIX path (no backslashes)");
  if (key.split("/").includes("..")) fail(label, "free of .. segments");
  if (ALLOWED_EXACT.includes(key)) return;
  if (!ALLOWED_ROOTS.some((root) => key.startsWith(root) && key.length > root.length)) {
    fail(label, `under one of: ${ALLOWED_ROOTS.join(" ")} or exactly one of: ${ALLOWED_EXACT.join(" ")}`);
  }
}

function strArray(v: unknown, what: string): string[] {
  if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) fail(what, "an array of strings");
  return v as string[];
}

function onboardingStep(raw: unknown, i: number): BundleOnboardingStep {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) fail(`onboarding[${i}]`, "an object");
  const o = raw as Record<string, unknown>;
  const s = (field: string): string => {
    const v = o[field];
    if (typeof v !== "string" || v.length === 0) fail(`onboarding[${i}].${field}`, "a non-empty string");
    return v;
  };
  return {
    packId: s("packId"),
    stepId: s("stepId"),
    title: s("title"),
    description: s("description"),
    ...(o.command !== undefined ? { command: s("command") } : {}),
  };
}

export function validateBundle(raw: unknown): Bundle {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) fail("root", "an object");
  const o = raw as Record<string, unknown>;
  if (o.version !== 1 && o.version !== 2) fail("version", "1 or 2");
  if (typeof o.files !== "object" || o.files === null || Array.isArray(o.files)) {
    fail("files", "an object");
  }
  const files: Record<string, string> = {};
  for (const [key, value] of Object.entries(o.files as Record<string, unknown>)) {
    checkKey(key);
    if (typeof value !== "string") fail(`files["${key}"]`, "string content");
    files[key] = value;
  }
  const bundle: Bundle = { version: o.version, files };
  if (o.packIds !== undefined) bundle.packIds = strArray(o.packIds, "packIds");
  if (o.collisions !== undefined) bundle.collisions = strArray(o.collisions, "collisions");
  if (o.onboarding !== undefined) {
    if (!Array.isArray(o.onboarding)) fail("onboarding", "an array");
    bundle.onboarding = o.onboarding.map(onboardingStep);
  }
  return bundle;
}
