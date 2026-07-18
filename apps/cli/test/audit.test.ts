import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { auditRepo, formatAuditReport } from "../src/audit.ts";

const fx = fileURLToPath(new URL("./fixtures/ts-app", import.meta.url));

describe("auditRepo", () => {
  it("profiles a repo and recommends the flagship pack", async () => {
    const r = await auditRepo(fx);
    expect(r.profile.languages).toEqual(["typescript"]);
    expect(r.profile.packageManager).toBe("pnpm");
    expect(r.profile.hasTestSuite).toBe(true);
    expect(r.packs).toEqual([
      "database-review",
      "disciplined-workflow",
      "frontend-design",
      "frontend-taste",
      "go-rules",
      "python-rules",
      "second-brain",
      "security-review",
      "software-engineer-harness",
      "systematic-debugging",
      "token-efficiency-harness",
      "typescript-rules",
    ]);
    expect(r.recommended).toBe("software-engineer-harness");
  });

  it("formats a human-readable report", async () => {
    const text = formatAuditReport(await auditRepo(fx));
    expect(text).toContain("Languages: typescript");
    expect(text).toContain("Package manager: pnpm");
    expect(text).toContain("Test suite: yes");
    expect(text).toContain("Recommended pack: software-engineer-harness");
  });
});
