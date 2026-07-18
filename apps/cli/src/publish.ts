import { parseGitSourceName, resolveGitSource } from "@baselane/distribute";
import { packFromFileset } from "@baselane/packs";
import { DEFAULT_REGISTRY } from "@baselane/materialize";

// Mirrors packages/packs/src/pack-from-fileset.ts's stampVersion tag grammar — kept in sync
// deliberately rather than exported/shared, since the two call sites need it for different
// reasons (stampVersion falls back to `0.0.0+sha` for a non-tag ref; publish instead REJECTS a
// non-tag ref outright, because the registry only accepts strict `X.Y.Z` semver — see
// apps/portal/src/registry-index.ts's VERSION_RE — and a `0.0.0+sha` publish would just bounce
// off the server as a 400 after already doing the network work).
const VERSION_TAG_RE = /^v?(\d+\.\d+\.\d+)$/;

export interface PublishOptions {
  /** `@scope/name` to publish under. */
  name: string;
  /** `github:owner/repo` source, per `isGitSourceName`. */
  sourceName: string;
  /** Version tag to resolve and publish from, e.g. "v1.2.0". */
  ref: string;
  registry?: string;
  token?: string;
  fetchImpl?: typeof fetch;
  log?: (line: string) => void;
}

export interface PublishResult {
  ok: boolean;
  status: number;
  name: string;
  version: string;
  sha: string;
  message: string;
}

/** `baselane publish`: resolves `ref` → sha via `resolveGitSource`, validates the pack builds via
 * `packFromFileset`, then POSTs to the registry's publish endpoint with the GitHub token as
 * bearer auth. The token is read by the caller (cli.ts) from `GITHUB_TOKEN` and passed in here —
 * this function never reads env itself (same seam as runInstall/runUpdate) — but it OWNS the
 * "token required" check, since unlike install/update (which can proceed unauthenticated, just
 * rate-limited), publish is inherently an authenticated action with no valid unauthenticated path. */
export async function runPublish(opts: PublishOptions): Promise<PublishResult> {
  if (!opts.token) {
    throw new Error("publish: GITHUB_TOKEN is required to publish");
  }

  const tagMatch = VERSION_TAG_RE.exec(opts.ref);
  if (!tagMatch) {
    throw new Error(
      `publish: "${opts.ref}" is not a semver version tag — registry versions are semver ` +
        `(e.g. "v1.2.0"); publish from a version tag, not a branch, sha, or arbitrary ref`,
    );
  }
  const version = tagMatch[1];

  const registryBase = opts.registry ?? DEFAULT_REGISTRY;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const token = opts.token;

  const { repo } = parseGitSourceName(opts.sourceName);
  const resolved = await resolveGitSource({
    name: opts.sourceName, ref: opts.ref, token, fetchImpl, onNotice: opts.log,
  });
  const { pack } = await packFromFileset(resolved.files, { repoName: repo, ref: opts.ref, sha: resolved.sha });

  const res = await fetchImpl(`${registryBase}/registry/v1/publish`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: opts.name,
      version,
      source: { name: opts.sourceName, ref: opts.ref, sha: resolved.sha },
      packId: pack.id,
      description: pack.summary.slice(0, 300),
    }),
  });

  const shaShort = resolved.sha.slice(0, 7);
  const base = { name: opts.name, version, sha: resolved.sha };
  switch (res.status) {
    case 201:
      return { ...base, ok: true, status: 201, message: `published ${opts.name}@${version} (sha ${shaShort})` };
    case 409:
      return { ...base, ok: false, status: 409, message: `publish: ${opts.name}@${version} — version already published — bump the tag` };
    case 403:
      return {
        ...base, ok: false, status: 403,
        message: `publish: "${opts.name}" does not match your authenticated GitHub user or org`,
      };
    case 401:
      return { ...base, ok: false, status: 401, message: "publish: GITHUB_TOKEN was rejected — check it is valid and not expired" };
    case 400: {
      const detail = await readErrorDetail(res);
      return { ...base, ok: false, status: 400, message: `publish: request rejected${detail ? ` (${detail})` : ""} — check the source/sha` };
    }
    default:
      throw new Error(`publish: unexpected response HTTP ${res.status} from ${registryBase}`);
  }
}

async function readErrorDetail(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: unknown };
    return typeof body.error === "string" ? body.error : "";
  } catch {
    return "";
  }
}
