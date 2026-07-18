import { gzipSync } from "node:zlib";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sha256Hex } from "@baselane/packs";
import { readManifestWithFallback, targetLocation, writeManifestFile } from "@baselane/materialize";
import { runInstall } from "../src/install.ts";
import { runDrift, formatDriftReport } from "../src/drift-cmd.ts";

/** Minimal ustar entry builder: 512-byte header + content padded to 512.
 * Copied verbatim from apps/cli/test/install.test.ts (tests may not import tests). */
function tarEntry(name: string, content: string, typeflag = "0"): Buffer {
  const header = Buffer.alloc(512);
  header.write(name, 0, 100, "utf8");                       // name
  header.write("0000644\0", 100, 8, "utf8");                // mode
  header.write("0000000\0", 108, 8, "utf8");                // uid
  header.write("0000000\0", 116, 8, "utf8");                // gid
  const size = Buffer.byteLength(content, "utf8");
  header.write(size.toString(8).padStart(11, "0") + "\0", 124, 12, "utf8"); // size
  header.write("00000000000\0", 136, 12, "utf8");           // mtime
  header.write("        ", 148, 8, "utf8");                 // checksum placeholder (spaces)
  header.write(typeflag, 156, 1, "utf8");                   // typeflag
  header.write("ustar\0", 257, 6, "utf8");                  // magic
  header.write("00", 263, 2, "utf8");                       // version
  let sum = 0;
  for (const b of header) sum += b;
  header.write(sum.toString(8).padStart(6, "0") + "\0 ", 148, 8, "utf8");
  const body = Buffer.alloc(Math.ceil(size / 512) * 512);
  body.write(content, 0, "utf8");
  return Buffer.concat([header, body]);
}

function tarball(...entries: Buffer[]): Uint8Array {
  return gzipSync(Buffer.concat([...entries, Buffer.alloc(1024)])); // 2 zero blocks = EOF
}

function jsonRes(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

function fakeFetch(routes: Record<string, (url: string) => Response | Promise<Response>>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    for (const [prefix, handler] of Object.entries(routes)) {
      if (url.startsWith(prefix)) return handler(url);
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
}

const SHA = "3".repeat(40);
const SKILL = "---\nname: tdd\ndescription: Test-driven development discipline for every change\n---\n\nBody.\n";
const routes = {
  "https://api.github.com/repos/o/r/git/ref/tags/v1": () => jsonRes({ object: { sha: SHA, type: "commit" } }),
  [`https://codeload.github.com/o/r/tar.gz/${SHA}`]: () =>
    new Response(
      tarball(tarEntry(`r-${SHA}/.claude/skills/tdd/SKILL.md`, SKILL), tarEntry(`r-${SHA}/AGENTS.md`, "# pack\n")) as BodyInit,
    ),
};

async function freshInstall() {
  const dir = await mkdtemp(join(tmpdir(), "bld-"));
  await runInstall({ source: "github:o/r@v1", global: false, dir, dryRun: false, json: false, fetchImpl: fakeFetch(routes), log: () => {} });
  return dir;
}

describe("runDrift", () => {
  it("clean right after install", async () => {
    const dir = await freshInstall();
    const r = await runDrift({ global: false, dir });
    expect(r.clean).toBe(true);
    expect(r.vendored.every((v) => v.status === "ok")).toBe(true);
    expect(r.regions.every((g) => g.status === "ok")).toBe(true);
  });

  it("flags a hand-edited vendored file as modified and a deleted one as missing", async () => {
    const dir = await freshInstall();
    const skill = join(dir, ".claude/skills/tdd/SKILL.md");
    await writeFile(skill, (await readFile(skill, "utf8")) + "\ntampered\n", "utf8");
    let r = await runDrift({ global: false, dir });
    expect(r.clean).toBe(false);
    expect(r.vendored.find((v) => v.path === ".claude/skills/tdd/SKILL.md")?.status).toBe("modified");
    await rm(skill);
    r = await runDrift({ global: false, dir });
    expect(r.vendored.find((v) => v.path === ".claude/skills/tdd/SKILL.md")?.status).toBe("missing");
  });

  it("flags a gutted managed region, but tolerates user edits OUTSIDE the region", async () => {
    const dir = await freshInstall();
    const agentsPath = join(dir, "AGENTS.md");
    const original = await readFile(agentsPath, "utf8");
    await writeFile(agentsPath, "# My own header\n\n" + original, "utf8"); // outside-region edit
    let r = await runDrift({ global: false, dir });
    expect(r.regions.every((g) => g.status === "ok")).toBe(true);
    await writeFile(agentsPath, "# gutted — regions gone\n", "utf8");
    r = await runDrift({ global: false, dir });
    expect(r.clean).toBe(false);
    expect(r.regions.some((g) => g.status === "region-missing" || g.status === "file-missing")).toBe(true);
  });

  it("errors loudly with no manifest", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bld-"));
    await expect(runDrift({ global: false, dir })).rejects.toThrow(/no harness\.json/);
  });

  it("legacy manifest (no capability receipts) ⇒ no-op: capabilities empty, clean unaffected", async () => {
    const dir = await freshInstall();
    const r = await runDrift({ global: false, dir });
    expect(r.capabilities).toEqual([]);
    expect(r.clean).toBe(true);
  });

  /** Stamps a `wiki` capability receipt for `.baselane/wiki/index.md` onto a fresh install's manifest
   * and writes the on-disk file with the given content — mirrors what a harness-PR install would
   * leave behind (M4's capability receipts). */
  async function withWikiCapability(dir: string, diskContent: string, receiptContent = diskContent) {
    const loc = targetLocation({ global: false, dir });
    const { manifest } = await readManifestWithFallback(loc);
    if (manifest === null) throw new Error("expected a manifest from freshInstall");
    const updated = {
      ...manifest,
      materialized: {
        ...manifest.materialized,
        capabilities: {
          wiki: {
            sourceSha: null,
            generatedTs: "2026-07-16T00:00:00.000Z",
            paths: [{ path: ".baselane/wiki/index.md", sha256: sha256Hex(receiptContent) }],
          },
        },
      },
    };
    await writeManifestFile(loc.manifestPath, updated);
    await mkdir(join(dir, ".baselane/wiki"), { recursive: true });
    await writeFile(join(dir, ".baselane/wiki/index.md"), diskContent, "utf8");
  }

  it("wiki capability receipt matching on-disk content ⇒ clean", async () => {
    const dir = await freshInstall();
    await withWikiCapability(dir, "# Wiki index\n");
    const r = await runDrift({ global: false, dir });
    expect(r.capabilities).toEqual([{ capability: "wiki", path: ".baselane/wiki/index.md", status: "ok" }]);
    expect(r.clean).toBe(true);
  });

  it("wiki capability receipt with hand-edited on-disk file ⇒ modified, not clean, path named", async () => {
    const dir = await freshInstall();
    await withWikiCapability(dir, "# Wiki index — hand-edited\n", "# Wiki index\n");
    const r = await runDrift({ global: false, dir });
    expect(r.capabilities).toEqual([{ capability: "wiki", path: ".baselane/wiki/index.md", status: "modified" }]);
    expect(r.clean).toBe(false);
    expect(formatDriftReport(r)).toContain("! .baselane/wiki/index.md [capability:wiki]: modified");
  });

  it("wiki capability receipt whose file was deleted ⇒ missing, not clean", async () => {
    const dir = await freshInstall();
    await withWikiCapability(dir, "# Wiki index\n");
    await rm(join(dir, ".baselane/wiki/index.md"));
    const r = await runDrift({ global: false, dir });
    expect(r.capabilities).toEqual([{ capability: "wiki", path: ".baselane/wiki/index.md", status: "missing" }]);
    expect(r.clean).toBe(false);
  });
});
