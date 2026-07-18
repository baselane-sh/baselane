import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { extractTarGz } from "../src/tar.ts";

/** Minimal ustar entry builder: 512-byte header + content padded to 512. */
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

describe("extractTarGz", () => {
  it("extracts regular files and strips the top-level wrapper dir", () => {
    const gz = tarball(
      tarEntry("repo-abc123/", "", "5"),
      tarEntry("repo-abc123/pack.json", '{"id":"x"}'),
      tarEntry("repo-abc123/skills/tdd/SKILL.md", "# tdd"),
    );
    const r = extractTarGz(gz);
    expect(r.files).toEqual({ "pack.json": '{"id":"x"}', "skills/tdd/SKILL.md": "# tdd" });
    expect(r.skipped).toEqual([]);
  });

  it("skips symlink/hardlink entries and reports them", () => {
    const gz = tarball(tarEntry("r/a.md", "ok"), tarEntry("r/evil", "target", "2"), tarEntry("r/hard", "t", "1"));
    const r = extractTarGz(gz);
    expect(r.files).toEqual({ "a.md": "ok" });
    expect(r.skipped).toEqual(["evil", "hard"]);
  });

  it("rejects traversal and absolute paths outright", () => {
    expect(() => extractTarGz(tarball(tarEntry("r/../../etc/passwd", "x")))).toThrow(/tar:/);
    expect(() => extractTarGz(tarball(tarEntry("/abs/path", "x")))).toThrow(/tar:/);
  });

  it("enforces the decompressed size ceiling", () => {
    const big = "y".repeat(2048);
    expect(() => extractTarGz(tarball(tarEntry("r/big.txt", big)), { maxBytes: 1024 })).toThrow(/tar: .*exceeds/);
  });

  it("handles GNU longname (typeflag L) entries", () => {
    const longPath = "r/" + "d/".repeat(60) + "leaf.md"; // >100 chars
    const gz = tarball(tarEntry("././@LongLink", longPath + "\0", "L"), tarEntry(longPath.slice(0, 99), "deep"), tarEntry("r/short.md", "s"));
    const r = extractTarGz(gz);
    expect(r.files[longPath.slice(2)]).toBe("deep");
    expect(r.files["short.md"]).toBe("s");
  });

  it("does not let a pax GLOBAL header (typeflag g) override the next entry's name — only x does", () => {
    const paxG = "30 path=should-not-apply.md\n";
    const gz = tarball(tarEntry("ignored-global-name", paxG, "g"), tarEntry("r/short.md", "s"));
    const r = extractTarGz(gz);
    expect(r.files).toEqual({ "short.md": "s" });
  });

  it("throws a loud error on a corrupt (non-octal) size field instead of silently truncating", () => {
    const entry = tarEntry("r/corrupt.md", "irrelevant");
    entry.write("ZZZZZZZZZZZ\0", 124, 12, "utf8"); // non-octal garbage in the size field
    const gz = tarball(entry);
    expect(() => extractTarGz(gz)).toThrow(/tar: corrupt header \(size\)/);
  });
});
