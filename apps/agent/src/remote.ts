import type { Bundle } from "@baselane/materialize";
import { validateBundle } from "./validate-bundle.ts";

export async function fetchBundle(
  portalUrl: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Bundle> {
  const base = portalUrl.endsWith("/") ? portalUrl.slice(0, -1) : portalUrl;
  const res = await fetchImpl(`${base}/api/bundle`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
  });
  if (!res.ok) throw new Error(`portal bundle fetch failed: ${res.status}`);
  return validateBundle(await res.json());
}
