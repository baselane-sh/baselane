---
name: append-only-jsonl-stores
description: Use when building a simple durable store without a database — persist each change as a new JSON line appended to a .jsonl file, fold latest-record-per-id on read, and never rewrite a line in place.
---

# Append-only JSONL stores

For modest persistence needs, a database is often overkill. An append-only JSON-Lines file — one
JSON object per line — gives you durable, debuggable, dependency-free storage. **Updating a record
means appending a new line with the changed fields; you never rewrite or delete an existing line.**

## The pattern

- **Write:** serialize the record to one line, `appendFile` it. Never open-truncate-rewrite.
- **Read:** stream the file top to bottom, `JSON.parse` each line, and **fold latest-record-per-id
  wins** — a later line for the same id supersedes the earlier one.
- **Delete:** append a tombstone (e.g. `{ id, deleted: true }`); the fold treats it as "gone."
- **Malformed line:** skip it and keep going. A half-written trailing line from a crash must not
  break every future read.

```ts
// update = append a new line, not mutate the old one
await appendFile(path, JSON.stringify({ id, ...changes }) + "\n");

// read = fold latest-per-id
const byId = new Map();
for (const line of (await readFile(path, "utf8")).split("\n")) {
  if (!line.trim()) continue;
  try { const r = JSON.parse(line); byId.set(r.id, r); } catch { /* skip malformed */ }
}
```

## Why append-only

- **Crash-safe writes.** Appending never corrupts existing data; the worst case is one torn trailing
  line, which the reader skips.
- **Free audit history.** Every version of every record is still on disk, in order — invaluable for
  debugging "how did this get into that state?".
- **Immutability by construction.** Records are never mutated in place, so a reader mid-fold can
  never observe a half-updated record.

## Trade-offs and remedies

- **File grows unbounded.** Periodically **compact**: read, fold to latest-per-id, and rewrite a
  fresh file atomically (write to a temp path, then rename). Compaction is the *only* time you
  rewrite — and it produces a new file rather than editing lines.
- **Whole-file read on load.** Fine up to tens of thousands of records; past that, reach for a real
  database. This pattern is for the small-to-medium tier, not for high write throughput.
- **No cross-record transactions.** If you need multi-record atomicity or rich queries, this is the
  wrong tool.
