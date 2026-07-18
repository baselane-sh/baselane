function base(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

/**
 * Build the URL to open in the browser from the portal base + the server-supplied
 * verifyUrl. The server value is UNTRUSTED (it is opened via an OS launcher), so we
 * only accept a simple same-origin absolute path; anything else falls back to the
 * fixed /app/devices path. This prevents a hostile portal from injecting a foreign
 * URL or shell metacharacters into the launcher (CVE-2024-27980 class on Windows).
 */
export function resolveVerifyUrl(portalUrl: string, verifyUrl: string): string {
  const b = base(portalUrl);
  const fallback = `${b}/app/devices`;
  if (typeof verifyUrl !== "string" || !/^\/[A-Za-z0-9/_.-]*$/.test(verifyUrl)) return fallback;
  try {
    const origin = new URL(b + "/");
    const target = new URL(verifyUrl, origin);
    if (target.protocol !== "https:" && target.protocol !== "http:") return fallback;
    if (target.origin !== origin.origin) return fallback;
    return target.href;
  } catch {
    return fallback;
  }
}

export async function startPairing(portalUrl: string, name: string, fetchImpl: typeof fetch = fetch) {
  const res = await fetchImpl(`${base(portalUrl)}/api/device/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`pairing start failed: ${res.status}`);
  return (await res.json()) as { userCode: string; deviceCode: string; verifyUrl: string; pollInterval: number };
}

export async function pollPairing(portalUrl: string, deviceCode: string, fetchImpl: typeof fetch = fetch) {
  const res = await fetchImpl(`${base(portalUrl)}/api/device/poll`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deviceCode }),
  });
  if (!res.ok) throw new Error(`pairing poll failed: ${res.status}`);
  return (await res.json()) as { status: "pending" | "approved" | "revoked"; deviceToken?: string };
}

export async function awaitApproval(
  portalUrl: string,
  deviceCode: string,
  opts: { fetchImpl?: typeof fetch; sleep?: (ms: number) => Promise<void>; intervalMs?: number; timeoutMs?: number; nowMs?: () => number },
): Promise<string> {
  const sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const intervalMs = opts.intervalMs ?? 5000;
  const timeoutMs = opts.timeoutMs ?? 10 * 60 * 1000;
  const nowMs = opts.nowMs ?? Date.now;
  const start = nowMs();
  for (;;) {
    const r = await pollPairing(portalUrl, deviceCode, opts.fetchImpl);
    if (r.status === "approved" && r.deviceToken) return r.deviceToken;
    if (r.status === "revoked") throw new Error("pairing was denied or the code was revoked");
    if (nowMs() - start >= timeoutMs) throw new Error("pairing timed out — please try Connect again");
    await sleep(intervalMs);
  }
}
