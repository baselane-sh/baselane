---
description: Run the security-audit skill's 4-layer pre-deploy pass (secrets, authentication, input validation, data access) and report findings by layer and severity.
argument-hint: [optional: path or diff ref]
---

Run the security-audit skill's 4-layer pass over the current diff (or $ARGUMENTS if given): secrets, authentication, input validation, data access. For each layer, run the relevant toolkit command when it's installed (gitleaks, trufflehog, npm audit / pip-audit, semgrep --config auto) and answer that layer's audit prompt against the actual code. Report findings grouped by layer with file:line and severity (CRITICAL/HIGH/MEDIUM). End with a verdict: safe to ship, or block until CRITICAL/HIGH issues are fixed.
