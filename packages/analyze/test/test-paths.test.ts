import { describe, it, expect } from "vitest";
import { isTestPath } from "../src/detect/test-paths.ts";

describe("isTestPath", () => {
  it("matches JS/TS, Go, and Python test conventions plus test dirs", () => {
    for (const p of [
      "src/foo.test.ts",
      "a/b.spec.js",
      "internal/server_test.go", // Go
      "pkg/test_utils.py", // Python test_*
      "app/utils_test.py", // Python *_test
      "__tests__/x.ts",
      "tests/y.py",
      "test/z.rb",
    ]) {
      expect(isTestPath(p)).toBe(true);
    }
  });

  it("does not match non-test files or lookalikes", () => {
    for (const p of ["src/server.go", "main.py", "index.ts", "lib/util.js", "testdata/fixture.json", "latest.py"]) {
      expect(isTestPath(p)).toBe(false);
    }
  });
});
