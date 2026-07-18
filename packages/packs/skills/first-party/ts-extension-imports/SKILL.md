---
name: ts-extension-imports
description: Use when writing or editing TypeScript in a no-build ESM repo that runs .ts sources directly under Node — every relative import must carry an explicit .ts extension, or Node's resolver fails to find the file at runtime.
---

# TypeScript `.ts`-extension imports

Some TypeScript projects have **no build step**: packages are consumed directly as `.ts` sources
over ESM, run by Node (≥24) with `--experimental-transform-types` semantics. There is no transpile
pass and no emitted `.js`. In that setup one rule is load-bearing:

**Every relative import must carry its explicit `.ts` extension.**

```ts
// CORRECT — the path resolves to a file that exists on disk
import { validatePack } from "./validate.ts";
import type { WorkflowPack } from "../types.ts";

// WRONG — extensionless: works with a bundler, but Node's ESM resolver won't guess ".ts"
import { validatePack } from "./validate";

// WRONG — ".js": there is no emitted .js in this tree, so this points at nothing
import { validatePack } from "./validate.js";
```

## Why

- Node's ESM loader resolves the specifier you write, **verbatim**. It does not try appending
  extensions the way a bundler does. An extensionless or `.js` specifier names a file that isn't
  on disk, and the import throws `ERR_MODULE_NOT_FOUND` at runtime — not at build time, because
  there is no build.
- The extension is part of the module's identity here, not decoration.

## What this rule does **not** change

- **Bare package specifiers stay bare.** `import { readFile } from "node:fs/promises"` and
  `import { x } from "@scope/pkg"` have no extension — the rule is about *relative* paths (`./`,
  `../`) only.
- **Type-only imports still need it.** `import type { Foo } from "./foo.ts"`. The extension names
  the file on disk; whether the import is erased at runtime is irrelevant to resolution.
- **Directory index imports.** Prefer naming the file explicitly (`./index.ts`) rather than relying
  on directory resolution, which ESM does not do without a package boundary.

## Before you save

- [ ] Every `from "./…"` / `from "../…"` ends in `.ts`.
- [ ] No `.js` extension in any relative import (there is no `.js` in this source tree).
- [ ] `node:*` and package specifiers left extensionless.
- [ ] Dynamic `import("./x.ts")` and re-exports (`export { y } from "./y.ts"`) carry `.ts` too.
