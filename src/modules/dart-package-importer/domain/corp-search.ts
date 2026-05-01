import type { CorpCode, CorpSearchHit } from "./types";

let cached: CorpCode[] | null = null;

async function loadCorpCodes(): Promise<CorpCode[]> {
  if (cached) return cached;
  // dynamic import — Next.js handles JSON imports on the server side.
  const data = (await import("../data/corp-codes.json")).default as CorpCode[];
  cached = data;
  return data;
}

export async function searchCorps(
  query: string,
  limit = 20,
): Promise<CorpSearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const all = await loadCorpCodes();
  const matches: CorpSearchHit[] = [];
  for (const c of all) {
    if (c.corp_name.includes(q)) {
      matches.push({ ...c, is_listed: c.stock_code !== "" });
      if (matches.length >= limit) break;
    }
  }
  return matches;
}

export async function getCorpByCode(
  corp_code: string,
): Promise<CorpSearchHit | null> {
  const all = await loadCorpCodes();
  const found = all.find((c) => c.corp_code === corp_code);
  if (!found) return null;
  return { ...found, is_listed: found.stock_code !== "" };
}
