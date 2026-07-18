export interface AdoptionReport {
  repo: string;
  packId: string;
  version: string;
  prUrl: string;
}

export async function reportAdoption(
  portalUrl: string,
  token: string,
  record: AdoptionReport,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const base = portalUrl.endsWith("/") ? portalUrl.slice(0, -1) : portalUrl;
  const res = await fetchImpl(`${base}/api/adoption`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ ...record, status: "proposed" }),
  });
  if (!res.ok) throw new Error(`portal adoption report failed: ${res.status}`);
}
