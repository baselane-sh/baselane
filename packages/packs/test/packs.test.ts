import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validatePack } from "../src/validate.ts";
import { renderPack } from "../src/render/render-pack.ts";

const packsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "packs");
const packIds = readdirSync(packsDir, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

describe.each(packIds)("pack: %s", (id) => {
  const raw: unknown = JSON.parse(readFileSync(join(packsDir, id, "pack.json"), "utf8"));

  it("validates against the locked schema", () => {
    const pack = validatePack(raw);
    expect(pack.id).toBe(id);
  });

  it("renders byte-stable goldens for every target file", async () => {
    const files = renderPack(validatePack(raw));
    for (const [path, content] of Object.entries(files)) {
      await expect(content).toMatchFileSnapshot(join(packsDir, id, "rendered", path));
    }
  });
});
