import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import type { WorkflowPack } from "./types.ts";
import { validatePack } from "./validate.ts";
import { PACK_ALIASES } from "./aliases.ts";

const SLUG = /^[a-z0-9][a-z0-9-]*$/;

/** Absolute path of the packs/ directory shipped inside this package. */
export function builtinPacksDir(): string {
  return fileURLToPath(new URL("../packs", import.meta.url));
}

/** Sorted ids of every shipped pack (directories containing pack.json). */
export async function listBuiltinPacks(): Promise<string[]> {
  const entries = await readdir(builtinPacksDir(), { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

/** Load one shipped pack by id; resolves retired-id aliases, validates before returning. */
export async function loadBuiltinPack(id: string): Promise<WorkflowPack> {
  if (!SLUG.test(id)) throw new Error(`unknown pack: ${id}`);
  const target = PACK_ALIASES[id] ?? id;
  if (!(await listBuiltinPacks()).includes(target)) {
    throw new Error(`unknown pack: ${id}`);
  }
  const raw = await readFile(join(builtinPacksDir(), target, "pack.json"), "utf8");
  return validatePack(JSON.parse(raw));
}
