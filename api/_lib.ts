import { createRequire } from "node:module";
import { Connection, PublicKey } from "@solana/web3.js";
import { head, list, put } from "@vercel/blob";
import { COIN_DECIMALS, COIN_SUPPLY, PAIR, type Launch, type LaunchRecord } from "../shared/config.js";

// The pump SDK's ESM build doesn't load in Node (it imports a named export from a CommonJS package); its CJS build does.
const require = createRequire(import.meta.url);
const pump = require("@pump-fun/pump-sdk") as typeof import("@pump-fun/pump-sdk");

export const RPC_URL = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
export const conn = new Connection(RPC_URL, "confirmed");
export const sdk = new pump.OnlinePumpSdk(conn);
export { pump };

let globalCache: { at: number; initialRealTokenReserves: number } | null = null;
async function initialRealTokens(): Promise<number> {
  if (globalCache && Date.now() - globalCache.at < 10 * 60_000) return globalCache.initialRealTokenReserves;
  const g = await sdk.fetchGlobal();
  globalCache = { at: Date.now(), initialRealTokenReserves: Number(g.initialRealTokenReserves.toString()) };
  return globalCache.initialRealTokenReserves;
}

let pairCache: { at: number; usd: number | null } | null = null;
/** USD price of one TTWO, from Jupiter. */
export async function pairUsd(): Promise<number | null> {
  if (pairCache && Date.now() - pairCache.at < 60_000) return pairCache.usd;
  let usd: number | null = null;
  try {
    const r = await fetch(`https://lite-api.jup.ag/price/v3?ids=${PAIR.mint}`);
    const j = (await r.json()) as Record<string, { usdPrice?: number }>;
    usd = j[PAIR.mint]?.usdPrice ?? null;
  } catch {}
  pairCache = { at: Date.now(), usd };
  return usd;
}

const REG = "launches/";

export async function saveRecord(rec: LaunchRecord) {
  await put(`${REG}${rec.mint}.json`, JSON.stringify(rec), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}

export async function loadRecords(): Promise<LaunchRecord[]> {
  const urls: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: REG, cursor, limit: 1000 });
    urls.push(...page.blobs.map((b) => b.url));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  const recs = await Promise.all(urls.map((u) => fetch(u).then((r) => (r.ok ? (r.json() as Promise<LaunchRecord>) : null)).catch(() => null)));
  return recs.filter((r): r is LaunchRecord => !!r).sort((a, b) => b.createdAt - a.createdAt);
}

// ---------------------------------------------------------------- one coin per item

const CLAIMS = "claims/";

/** Keeps only the first listed coin for each item (oldest wins). */
export function firstPerItem(recs: LaunchRecord[]): LaunchRecord[] {
  const seen = new Set<string>();
  return [...recs]
    .sort((a, b) => a.createdAt - b.createdAt)
    .filter((r) => (seen.has(r.item) ? false : (seen.add(r.item), true)))
    .sort((a, b) => b.createdAt - a.createdAt);
}

async function claimOf(item: string): Promise<string | null> {
  try {
    const h = await head(`${CLAIMS}${item}.json`);
    const r = await fetch(h.url, { cache: "no-store" });
    return r.ok ? (((await r.json()) as { mint?: string }).mint ?? null) : null;
  } catch {
    return null; // no claim yet
  }
}

/** The mint that holds `item`: its claim, or for coins listed before claims existed, the oldest listed coin. */
export async function itemHolder(item: string): Promise<string | null> {
  const claimed = await claimOf(item);
  if (claimed) return claimed;
  const recs = (await loadRecords()).filter((r) => r.item === item).sort((a, b) => a.createdAt - b.createdAt);
  return recs[0]?.mint ?? null;
}

/**
 * Claims `item` for `mint`. Returns the mint that holds it afterwards: `mint` when this coin got it (or already had
 * it), another mint when someone else was first. The claim blob is never overwritten, so two launches racing for the
 * same item can't both win.
 */
export async function claimItem(item: string, mint: string): Promise<string> {
  const holder = await itemHolder(item);
  if (holder && holder !== mint) return holder;
  if (holder === mint && (await claimOf(item)) === mint) return mint;
  try {
    await put(`${CLAIMS}${item}.json`, JSON.stringify({ mint, at: Date.now() }), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: "application/json",
    });
    return mint;
  } catch (e) {
    const now = await claimOf(item);
    if (now) return now;
    throw e;
  }
}

/** Attaches live bonding-curve state to each record. */
export async function withCurves(recs: LaunchRecord[]): Promise<Launch[]> {
  if (!recs.length) return [];
  const [initReal, usd] = await Promise.all([initialRealTokens(), pairUsd()]);
  const pdas = recs.map((r) => pump.bondingCurvePda(r.mint));
  const infos: (import("@solana/web3.js").AccountInfo<Buffer> | null)[] = [];
  for (let i = 0; i < pdas.length; i += 100) infos.push(...(await conn.getMultipleAccountsInfo(pdas.slice(i, i + 100))));
  return recs.map((r, i) => {
    const info = infos[i];
    const curve = info ? pump.PUMP_SDK.decodeBondingCurveNullable(info) : null;
    if (!curve) return { ...r, progress: 0, complete: false, priceQuote: 0, priceUsd: null, mcapUsd: null, raisedQuote: 0 };
    const vt = Number(curve.virtualTokenReserves.toString());
    const vq = Number(curve.virtualQuoteReserves.toString());
    const rt = Number(curve.realTokenReserves.toString());
    // Both sides use 6 decimals, so the raw ratio is the price of one whole coin in TTWO.
    const priceQuote = vt > 0 ? (vq / vt) * 10 ** (COIN_DECIMALS - PAIR.decimals) : 0;
    const progress = curve.complete ? 1 : Math.max(0, Math.min(1, 1 - rt / initReal));
    const priceUsd = usd != null ? priceQuote * usd : null;
    return {
      ...r,
      progress,
      complete: curve.complete,
      priceQuote,
      priceUsd,
      mcapUsd: priceUsd != null ? priceUsd * COIN_SUPPLY : null,
      raisedQuote: Number(curve.realQuoteReserves.toString()) / 10 ** PAIR.decimals,
    };
  });
}

export function json(res: import("@vercel/node").VercelResponse, status: number, body: unknown, cache?: string) {
  if (cache) res.setHeader("Cache-Control", cache);
  res.status(status).json(body);
}
