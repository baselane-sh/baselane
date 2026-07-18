---
description: Consult or regenerate the generated ARCHITECTURE.md system map.
argument-hint: <question about the architecture | "regenerate">
---

Follow the protocol in `.baselane/system-map/README.md` for $ARGUMENTS. For a question, read `ARCHITECTURE.md` (the baselane-managed region) and answer from it — especially the Conventions & hidden rules section — before grepping. If $ARGUMENTS is "regenerate" (or modules/commands/conventions just changed), run `baselane map .` from the repo root and commit the refreshed ARCHITECTURE.md and .baselane/system-map/report.json.
