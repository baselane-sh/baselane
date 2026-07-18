#!/usr/bin/env node
// Plain .mjs re-exec shim, two modes:
//   - published tarball: `dist/bin.js` exists (built at publish time, see package.json
//     "build"/"prepublishOnly") — run it directly with plain node, no experimental flags.
//   - workspace dev tree: no `dist/`, ships `src/*.ts` as-is (see AGENTS.md) — re-launch node
//     with the flag that lets it load TypeScript sources directly.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const distBin = join(here, "..", "dist", "bin.js");
const isBuilt = existsSync(distBin);

if (!isBuilt) {
  const majorVersion = Number(process.versions.node.split(".")[0]);
  if (majorVersion < 24) {
    console.error(
      `baselane requires Node 24+ (found Node ${process.versions.node}). ` +
        "Install a newer Node and try again.",
    );
    process.exit(1);
  }
}

const args = isBuilt
  ? [distBin, ...process.argv.slice(2)]
  : ["--experimental-transform-types", "--no-warnings", join(here, "..", "src", "bin.ts"), ...process.argv.slice(2)];

const child = spawn(process.execPath, args, { stdio: "inherit" });

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 1);
  }
});

child.on("error", (err) => {
  console.error(`baselane: failed to launch (${err.message})`);
  process.exit(1);
});
