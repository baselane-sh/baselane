const BASELANE_PREFIX = "BASELANE_MANAGED=1 ";

interface HookStep {
  type: string;
  command: string;
}

interface HookEntry {
  matcher?: string;
  hooks: HookStep[];
}

interface SettingsShape {
  hooks?: Record<string, HookEntry[]>;
  [key: string]: unknown;
}

/** Thrown by mergeBaselaneHooks when existing settings are present but aren't a valid JSON
 * object — the caller must bail on write rather than merge over an empty stand-in, or the
 * developer's permissions/model/env/MCP config gets silently erased. */
export class SettingsParseError extends Error {}

function tryParseSettings(json: string): SettingsShape | null {
  try {
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    return parsed as SettingsShape;
  } catch {
    return null;
  }
}

// Lenient: malformed input reads as "no settings at all". Only safe for read-only checks
// (e.g. "does this file already have managed hooks to prune?") — never for deciding what to
// WRITE. mergeBaselaneHooks below parses strictly and throws instead.
function parseSettings(json: string | null): SettingsShape {
  if (json === null) return {};
  return tryParseSettings(json) ?? {};
}

function isBaselaneManaged(entry: HookEntry): boolean {
  return entry.hooks.some((h) => h.command.startsWith(BASELANE_PREFIX));
}

/**
 * Whether an existing `~/.claude/settings.json` has any baselane-managed hook entries
 * that a merge would need to prune. Lets callers skip merging (and rewriting) settings
 * files we've never touched — e.g. a developer's hand-written settings with no baselane
 * hooks in them at all.
 */
export function hasManagedHooks(existingSettingsJson: string | null): boolean {
  const existing = parseSettings(existingSettingsJson);
  const existingHooks = existing.hooks ?? {};
  return Object.values(existingHooks).some((entries) => entries.some(isBaselaneManaged));
}

/**
 * Merge this pack's hooks into a developer's existing `~/.claude/settings.json`.
 * Every hook we own is tagged with a `BASELANE_MANAGED=1 ` command prefix so a later
 * merge can find and replace our own prior entries without touching the developer's.
 */
export function mergeBaselaneHooks(existingSettingsJson: string | null, packSettingsJson: string): string {
  let existing: SettingsShape = {};
  if (existingSettingsJson !== null) {
    const parsed = tryParseSettings(existingSettingsJson);
    if (parsed === null) {
      throw new SettingsParseError(
        "existing settings.json is not a valid JSON object — refusing to merge over it",
      );
    }
    existing = parsed;
  }
  const pack = parseSettings(packSettingsJson);
  const existingHooks = existing.hooks ?? {};
  const packHooks = pack.hooks ?? {};

  const events = [...new Set([...Object.keys(existingHooks), ...Object.keys(packHooks)])];
  const mergedHooks: Record<string, HookEntry[]> = {};
  for (const event of events) {
    const kept = (existingHooks[event] ?? []).filter((entry) => !isBaselaneManaged(entry));
    const ours = (packHooks[event] ?? []).map((entry) => ({
      ...entry,
      hooks: entry.hooks.map((h) => ({ ...h, command: BASELANE_PREFIX + h.command })),
    }));
    mergedHooks[event] = [...kept, ...ours];
  }

  const merged: SettingsShape = { ...existing, hooks: mergedHooks };
  return JSON.stringify(merged, null, 2) + "\n";
}
