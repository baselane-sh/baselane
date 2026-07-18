import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

export interface AgentConfig {
  portalUrl: string;
  deviceToken: string;
  targetDir: string;
}

export function defaultConfigPath(env: NodeJS.ProcessEnv = process.env): string {
  if (env.BASELANE_AGENT_CONFIG) return env.BASELANE_AGENT_CONFIG;
  if (process.platform === "win32" && env.APPDATA) return join(env.APPDATA, "baselane", "agent.json");
  const base = env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(base, "baselane", "agent.json");
}

function isConfig(v: unknown): v is AgentConfig {
  if (v === null || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  const s = (x: unknown): x is string => typeof x === "string" && x.length > 0;
  return s(o.portalUrl) && s(o.deviceToken) && s(o.targetDir);
}

export async function readConfig(path: string): Promise<AgentConfig | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
    return isConfig(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeConfig(path: string, cfg: AgentConfig): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(cfg, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
}
