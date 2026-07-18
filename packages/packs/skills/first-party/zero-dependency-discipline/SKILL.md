---
name: zero-dependency-discipline
description: Use when tempted to add a third-party package — first check for a zero-dependency way using the platform and existing code, because most "we need a library" moments are solvable with a few lines and no new supply-chain risk.
---

# Zero-dependency discipline

Before adding any third-party dependency, **prove you need it.** A new package is permanent
surface area: supply-chain risk, version churn, transitive bloat, and one more thing to audit. The
default answer to "should we pull in a library for this?" is "probably not — check first."

## The check, in order

1. **Does the platform already do it?** Modern runtimes ship a lot: `fetch`, `crypto`,
   `structuredClone`, `Intl`, `URL`, streams, `node:*` modules. Reach here first.
2. **Do we already have it?** A helper, an existing dependency that covers the case, or a pattern
   elsewhere in the codebase you can follow.
3. **Is it a few lines to write ourselves?** A slug function, a debounce, a small parser, an
   env-var reader — vendoring 20 lines you understand beats importing 2,000 you don't.
4. **Only if all three fail:** consider a dependency — and then weigh maintenance, license, size,
   and transitive count before committing.

## Worked example

An HTTP API integration does **not** require the vendor's SDK. Global `fetch` plus the documented
REST endpoints is usually the whole job — no SDK, no auth-helper package, no version-pinning dance.
The same holds for most "convenience" wrappers around things the platform already exposes.

## Why the bar is high

- **Supply chain.** Every dependency (and its transitive tree) is code you now run and must trust.
- **Longevity.** Zero-dep code doesn't break when an upstream maintainer ships a breaking major or
  abandons the package.
- **Clarity.** Code you wrote is code you can read, debug, and change. A black-box import is not.

## When a dependency IS the right call

Genuinely hard, well-specified, security-sensitive problems — cryptography primitives, timezone
databases, complex parsers/compilers — are where a mature, audited library beats rolling your own.
The discipline is not "never add deps"; it's "don't add one until the platform, the codebase, and a
few honest lines have each failed to cover it."
