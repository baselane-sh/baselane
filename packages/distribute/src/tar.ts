import { gunzipSync } from "node:zlib";

const DEFAULT_MAX_BYTES = 50 * 1024 * 1024;

function readOctal(buf: Buffer, offset: number, length: number): number {
  const raw = buf.toString("utf8", offset, offset + length).replace(/\0/g, "").trim();
  if (raw.length === 0) return 0;
  const n = Number.parseInt(raw, 8);
  if (Number.isNaN(n)) throw new Error("tar: corrupt header (size)");
  return n;
}

function readString(buf: Buffer, offset: number, length: number): string {
  const end = buf.indexOf(0, offset);
  const stop = end === -1 || end > offset + length ? offset + length : end;
  return buf.toString("utf8", offset, stop);
}

/** Rejects the whole archive on a hostile path; returns the normalized path otherwise. */
function safePath(name: string): string {
  if (name.startsWith("/")) throw new Error(`tar: absolute path "${name}" — refusing archive`);
  const segments = name.split("/").filter((s) => s !== "" && s !== ".");
  if (segments.includes("..")) throw new Error(`tar: traversal path "${name}" — refusing archive`);
  return segments.join("/");
}

export function extractTarGz(
  gz: Uint8Array,
  opts: { maxBytes?: number } = {},
): { files: Record<string, string>; skipped: string[] } {
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  let tar: Buffer;
  try {
    tar = gunzipSync(gz, { maxOutputLength: maxBytes });
  } catch (err) {
    // node:zlib throws (rather than truncating) once decompressed output would exceed maxOutputLength.
    if (err instanceof RangeError && (err as NodeJS.ErrnoException).code === "ERR_BUFFER_TOO_LARGE") {
      throw new Error(`tar: archive exceeds ${maxBytes} bytes decompressed`);
    }
    throw err;
  }
  if (tar.length >= maxBytes) throw new Error(`tar: archive exceeds ${maxBytes} bytes decompressed`);

  const files: Record<string, string> = {};
  const skipped: string[] = [];
  let offset = 0;
  let pendingLongName: string | null = null;

  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((b) => b === 0)) break; // EOF blocks
    const size = readOctal(header, 124, 12);
    const typeflag = String.fromCharCode(header[156] === 0 ? 48 : header[156]); // "\0" = regular, legacy
    const prefix = readString(header, 345, 155);
    const shortName = readString(header, 0, 100);
    const rawName = pendingLongName ?? (prefix ? `${prefix}/${shortName}` : shortName);
    pendingLongName = null;
    const body = tar.subarray(offset + 512, offset + 512 + size);
    offset += 512 + Math.ceil(size / 512) * 512;

    if (typeflag === "L") { // GNU longname: body is the NEXT entry's path
      pendingLongName = body.toString("utf8").replace(/\0+$/, "");
      continue;
    }
    if (typeflag === "x") { // pax extended header: honor a path= override for the NEXT entry only
      const m = /\d+ path=([^\n]+)\n/.exec(body.toString("utf8"));
      if (m) pendingLongName = m[1];
      continue;
    }
    if (typeflag === "g") continue; // pax global header: applies archive-wide, not to one entry's name — skip it


    const full = safePath(rawName);
    // Strip the single top-level wrapper directory GitHub archives use (repo-<sha>/...).
    const rel = full.includes("/") ? full.slice(full.indexOf("/") + 1) : "";
    if (typeflag === "5" || rel === "") continue; // directories / the wrapper itself
    if (typeflag !== "0") {
      skipped.push(rel);
      continue;
    }
    files[rel] = body.toString("utf8");
  }
  return { files, skipped };
}
