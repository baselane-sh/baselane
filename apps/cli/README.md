# baselane

Git-native package manager for AI coding harnesses. `baselane` audits a repo, applies
workflow packs (agent rules, skills, subagent configs) into `AGENTS.md`/`CLAUDE.md`/
`.claude/` and friends, and keeps them in sync as packs change — without ever clobbering
content you already own.

## Install

```sh
npm install -g baselane
```

Requires Node 24+.

## Usage

Audit a repo and see what packs would apply:

```sh
baselane audit .
```

Apply a workflow pack (e.g. the `disciplined-workflow` pack) into the current repo:

```sh
baselane apply . --pack disciplined-workflow
```

Install a specific pack or skill by version, and check for drift later:

```sh
baselane install @baselane/frontend-taste@1.2.0
baselane drift
```

See `baselane --help` for the full command reference (`apply`, `distribute`, `draft-pack`,
`graph`, `map`, `install`, `update`, `drift`, `publish`).

Full docs: https://baselane.sh
