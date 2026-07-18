import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { listBuiltinPacks, loadBuiltinPack } from "@baselane/packs";
import { fetchAssignments, syncFromAssignments, AssignmentsUnavailableError, postCheckin } from "../src/assignments.ts";

async function pack() {
  return loadBuiltinPack((await listBuiltinPacks())[0]);
}

function fakeFetch(routes: Record<string, () => Response>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    for (const [prefix, h] of Object.entries(routes)) if (url.startsWith(prefix)) return h();
    return new Response("nf", { status: 404 });
  }) as typeof fetch;
}

describe("fetchAssignments", () => {
  it("validates bodies and version agreement", async () => {
    const p = await pack();
    const good = fakeFetch({ "http://portal/api/assignments": () => new Response(JSON.stringify({ version: 1, packs: { [p.id]: p.version }, packBodies: [p] })) });
    const a = await fetchAssignments("http://portal", "tok", good);
    expect(a.packs[p.id]).toBe(p.version);

    const mismatched = fakeFetch({ "http://portal/api/assignments": () => new Response(JSON.stringify({ version: 1, packs: { [p.id]: "other" }, packBodies: [p] })) });
    await expect(fetchAssignments("http://portal", "tok", mismatched)).rejects.toThrow(/version/);
  });

  it("404 → AssignmentsUnavailableError (legacy-portal fallback signal)", async () => {
    await expect(fetchAssignments("http://portal", "tok", fakeFetch({}))).rejects.toThrow(AssignmentsUnavailableError);
  });

  it("200 with empty packs (zero assignments) parses fine — does not throw AssignmentsUnavailableError", async () => {
    const empty = fakeFetch({ "http://portal/api/assignments": () => new Response(JSON.stringify({ version: 1, packs: {}, packBodies: [], onboarding: [] })) });
    const a = await fetchAssignments("http://portal", "tok", empty);
    expect(a).toEqual({ packs: {}, packBodies: [], onboarding: [] });
  });
});

describe("syncFromAssignments", () => {
  it("writes machine manifest + files; org entries drive the receipt; check-in body built", async () => {
    const p = await pack();
    const home = await mkdtemp(join(tmpdir(), "agh-"));
    const target = await mkdtemp(join(tmpdir(), "agt-"));
    const r = await syncFromAssignments({
      assignments: { packs: { [p.id]: p.version }, packBodies: [p] },
      targetDir: target, homeDir: home, log: () => {},
    });
    const manifest = JSON.parse(await readFile(join(home, ".baselane/harness.json"), "utf8"));
    expect(manifest.target.kind).toBe("machine");
    expect(manifest.packs).toEqual({ [p.id]: p.version });
    expect(r.checkinBody.clean).toBe(true);
    expect(r.checkinBody.packs).toEqual({ [p.id]: p.version });
  });

  it("drops unassigned org entries, preserves personal git-ref entries", async () => {
    const p = await pack();
    const home = await mkdtemp(join(tmpdir(), "agh-"));
    const target = await mkdtemp(join(tmpdir(), "agt-"));
    await syncFromAssignments({ assignments: { packs: { [p.id]: p.version }, packBodies: [p] }, targetDir: target, homeDir: home, log: () => {} });
    // hand-add a personal entry, then sync with EMPTY assignments
    const mPath = join(home, ".baselane/harness.json");
    const m = JSON.parse(await readFile(mPath, "utf8"));
    m.packs["github:o/r"] = "v1";
    await writeFile(mPath, JSON.stringify(m) + "\n", "utf8");
    // personal git-ref resolution must not hit the network in this test → inline it via a second org body? No:
    // simplest: expect the sync to FAIL loudly on the unresolvable personal pack (fakeFetch({}) → git-source error),
    // proving it TRIED to keep it (not dropped), while the org entry was dropped from the merged manifest attempt.
    await expect(
      syncFromAssignments({ assignments: { packs: {}, packBodies: [] }, targetDir: target, homeDir: home, fetchImpl: fakeFetch({}), log: () => {} }),
    ).rejects.toThrow(/git-source/);
  });

  it("empty assignments (zero-pack org, portal 200) drops the org entry AND deletes its vendored files; a pre-existing personal git-ref entry still causes a loud resolution attempt", async () => {
    const { renderBundleFiles } = await import("@baselane/packs");
    const p = await pack();
    const rel = Object.keys(renderBundleFiles(p))[0];
    const home = await mkdtemp(join(tmpdir(), "agh-"));
    const target = await mkdtemp(join(tmpdir(), "agt-"));
    await syncFromAssignments({ assignments: { packs: { [p.id]: p.version }, packBodies: [p] }, targetDir: target, homeDir: home, log: () => {} });
    await expect(readFile(join(target, rel), "utf8")).resolves.toBeTypeOf("string"); // org file present after first sync

    // portal now resolves zero effective packs for this device (all packs unassigned) — a 200 empty response, not 404
    const r = await syncFromAssignments({ assignments: { packs: {}, packBodies: [], onboarding: [] }, targetDir: target, homeDir: home, log: () => {} });
    const manifest = JSON.parse(await readFile(join(home, ".baselane/harness.json"), "utf8"));
    expect(manifest.packs).toEqual({});
    expect(r.report.deletes).toContain(rel);
    await expect(readFile(join(target, rel), "utf8")).rejects.toThrow(); // vendored file actually removed from disk

    // hand-add a personal git-ref entry, then sync again with the same empty (zero-pack) assignments
    const mPath = join(home, ".baselane/harness.json");
    const m = JSON.parse(await readFile(mPath, "utf8"));
    m.packs["github:o/r"] = "v1";
    await writeFile(mPath, JSON.stringify(m) + "\n", "utf8");
    // personal git-ref resolution must not hit the network in this test → fakeFetch({}) forces a loud git-source
    // resolution failure, proving syncFromAssignments TRIED to keep/resolve it rather than silently dropping it.
    await expect(
      syncFromAssignments({ assignments: { packs: {}, packBodies: [], onboarding: [] }, targetDir: target, homeDir: home, fetchImpl: fakeFetch({}), log: () => {} }),
    ).rejects.toThrow(/git-source/);
  });

  it("migrates the legacy .baselane-manifest.json receipt (backs up drifted hand-edits) and removes it", async () => {
    const p = await pack();
    const home = await mkdtemp(join(tmpdir(), "agh-"));
    const target = await mkdtemp(join(tmpdir(), "agt-"));
    // simulate a legacy agent state: a managed file + legacy hash receipt, then hand-edit the file
    const { sha256 } = await import("@baselane/materialize");
    const rel = Object.keys((await import("@baselane/packs")).renderBundleFiles(p))[0];
    // (pick any bundle-rendered path; if renderBundleFiles(p) is empty for this pack, choose the next builtin)
    const legacyContent = "legacy content\n";
    await writeFile(join(target, ".baselane-manifest.json"), JSON.stringify({ version: 1, files: { [rel]: sha256(legacyContent) } }), "utf8");
    const { mkdir } = await import("node:fs/promises");
    await mkdir(join(target, rel, ".."), { recursive: true });
    await writeFile(join(target, rel), "HAND EDITED\n", "utf8");
    await syncFromAssignments({ assignments: { packs: { [p.id]: p.version }, packBodies: [p] }, targetDir: target, homeDir: home, log: () => {} });
    expect(await readFile(join(target, `${rel}.baselane-bak`), "utf8")).toBe("HAND EDITED\n");
    await expect(readFile(join(target, ".baselane-manifest.json"), "utf8")).rejects.toThrow(); // legacy receipt gone
  });

  it("stamps target.id with the portal's deviceId on sync (hostname manifest migrates, once, with a log line)", async () => {
    const p = await pack();
    const home = await mkdtemp(join(tmpdir(), "agh-"));
    const target = await mkdtemp(join(tmpdir(), "agt-"));
    // pre-write a hostname-derived machine manifest
    const { mkdir } = await import("node:fs/promises");
    await mkdir(join(home, ".baselane"), { recursive: true });
    await writeFile(
      join(home, ".baselane/harness.json"),
      JSON.stringify({ version: 1, target: { kind: "machine", id: "some-hostname" }, packs: {}, materialized: { resolutions: {} } }) + "\n",
      "utf8",
    );

    const logs1: string[] = [];
    await syncFromAssignments({
      assignments: { packs: { [p.id]: p.version }, packBodies: [p], deviceId: "dev_abc" },
      targetDir: target, homeDir: home, log: (l) => logs1.push(l),
    });
    const manifest = JSON.parse(await readFile(join(home, ".baselane/harness.json"), "utf8"));
    expect(manifest.target.id).toBe("dev_abc");
    expect(logs1.some((l) => l.includes("migrated") && l.includes("dev_abc"))).toBe(true);

    // second sync with the same deviceId — idempotent, no migration log
    const logs2: string[] = [];
    await syncFromAssignments({
      assignments: { packs: { [p.id]: p.version }, packBodies: [p], deviceId: "dev_abc" },
      targetDir: target, homeDir: home, log: (l) => logs2.push(l),
    });
    expect(logs2.some((l) => l.includes("migrated"))).toBe(false);
  });

  it("no deviceId in response (older portal) → target.id untouched", async () => {
    const p = await pack();
    const home = await mkdtemp(join(tmpdir(), "agh-"));
    const target = await mkdtemp(join(tmpdir(), "agt-"));
    const { mkdir } = await import("node:fs/promises");
    await mkdir(join(home, ".baselane"), { recursive: true });
    await writeFile(
      join(home, ".baselane/harness.json"),
      JSON.stringify({ version: 1, target: { kind: "machine", id: "some-hostname" }, packs: {}, materialized: { resolutions: {} } }) + "\n",
      "utf8",
    );

    const logs: string[] = [];
    await syncFromAssignments({
      assignments: { packs: { [p.id]: p.version }, packBodies: [p] },
      targetDir: target, homeDir: home, log: (l) => logs.push(l),
    });
    const manifest = JSON.parse(await readFile(join(home, ".baselane/harness.json"), "utf8"));
    expect(manifest.target.id).toBe("some-hostname");
    expect(logs.some((l) => l.includes("migrated"))).toBe(false);
  });
});

describe("postCheckin", () => {
  it("best-effort: non-2xx logs and resolves", async () => {
    await expect(
      postCheckin("http://portal", "tok", { packs: {}, driftedPaths: [], clean: true, agentVersion: "0.0.0" }, fakeFetch({})),
    ).resolves.toBeUndefined();
  });
});
