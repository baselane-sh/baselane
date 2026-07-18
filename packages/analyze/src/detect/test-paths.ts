/**
 * Whether a repo-relative POSIX path is a test file, across ecosystems — the single source of truth
 * used by BOTH node-project.ts (hasTestSuite) and conventions.ts (test-placement). Keeping two
 * narrower copies made a Go repo (40 `*_test.go` files) report `hasTestSuite: false` while the SAME
 * `baselane map` run counted them under conventions — a self-contradiction. Covers JS/TS, Go,
 * Python, and the common test directories.
 */
export function isTestPath(path: string): boolean {
  const base = path.slice(path.lastIndexOf("/") + 1);
  return (
    /\.(test|spec)\.[a-z]+$/.test(path) || // JS/TS: foo.test.ts, foo.spec.js
    /_test\.go$/.test(path) || // Go: foo_test.go
    /^test_.+\.py$/.test(base) || // Python: test_foo.py
    /_test\.py$/.test(base) || // Python: foo_test.py
    /(^|\/)(__tests__|tests?)\//.test(path) // dirs: __tests__/, tests/, test/
  );
}
