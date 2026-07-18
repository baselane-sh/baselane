// packages/analyze/src/gitignore.ts — a small, zero-dep .gitignore matcher for the local scan
// (issue #2: the system map scanned gitignored trees). Supports the subset that matters for
// "don't scan generated/vendored trees": comments, blank lines, negation (!), dir-only patterns
// (trailing /), root-anchored patterns (leading / or an interior /), `*` (never crosses /), `**`,
// and `?`. Last matching rule wins, per gitignore semantics. Root .gitignore only — nested
// .gitignore files are rare in the repos this scans and are deliberately out of scope.

interface IgnoreRule {
  regex: RegExp;
  negated: boolean;
  dirOnly: boolean;
}

function globToRegexSource(pattern: string): string {
  let out = "";
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "*") {
      if (pattern[i + 1] === "*") {
        // `**` matches anything including `/`; swallow a following slash so `a/**/b` matches `a/b`.
        i++;
        if (pattern[i + 1] === "/") {
          i++;
          out += "(?:.*/)?";
        } else {
          out += ".*";
        }
      } else {
        out += "[^/]*";
      }
    } else if (ch === "?") {
      out += "[^/]";
    } else {
      out += ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return out;
}

export function parseGitignore(content: string): IgnoreRule[] {
  const rules: IgnoreRule[] = [];
  for (const rawLine of content.split("\n")) {
    // Trailing spaces are ignored unless escaped; we skip the escape case (vanishingly rare).
    const line = rawLine.replace(/\s+$/, "");
    if (line === "" || line.startsWith("#")) continue;

    let pattern = line;
    let negated = false;
    if (pattern.startsWith("!")) {
      negated = true;
      pattern = pattern.slice(1);
    }

    let dirOnly = false;
    if (pattern.endsWith("/")) {
      dirOnly = true;
      pattern = pattern.slice(0, -1);
    }

    // A slash anywhere except the end anchors the pattern to the root; otherwise it matches
    // at any depth (gitignore's basename semantics).
    const anchored = pattern.startsWith("/") || pattern.slice(0, -1).includes("/");
    if (pattern.startsWith("/")) pattern = pattern.slice(1);
    if (pattern === "") continue;

    const body = globToRegexSource(pattern);
    const source = anchored ? `^${body}$` : `(^|/)${body}$`;
    try {
      rules.push({ regex: new RegExp(source), negated, dirOnly });
    } catch {
      // An unparseable pattern is skipped, never fatal — scanning must not break on a weird line.
    }
  }
  return rules;
}

/** Whether `path` (repo-relative, POSIX, no leading slash) is ignored. `isDir` selects whether
 * dir-only rules (`build/`) can match. Matching a parent directory ignores everything under it —
 * callers prune ignored directories during the walk, so files only need their own path checked. */
export function isIgnored(rules: IgnoreRule[], path: string, isDir: boolean): boolean {
  let ignored = false;
  for (const rule of rules) {
    if (rule.dirOnly && !isDir) continue;
    if (rule.regex.test(path)) ignored = !rule.negated;
  }
  return ignored;
}
