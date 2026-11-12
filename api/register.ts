import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PublicKey } from "@solana/web3.js";
import { getTokenMetadata, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { itemById } from "../shared/catalog.js";
import { PAIR, type LaunchRecord } from "../shared/config.js";
import { claimItem, conn, json, pump, saveRecord } from "./_lib.js";

const BLOB_HOST = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/meta\//;

/**
 * POST /api/register { mint }: adds a coin to the registry once it exists on chain. Everything is read back from
 * the chain and our own metadata, nothing from the request but the mint, so only real TTWO-paired coins whose
 * metadata was made here get listed.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return json(res, 405, { error: "POST only" });
  let mint: PublicKey;
  try {
    mint = new PublicKey(String((req.body ?? {}).mint));
  } catch {
    return json(res, 400, { error: "Bad mint." });
  }
  try {
    const info = await conn.getAccountInfo(pump.bondingCurvePda(mint));
    const curve = info ? pump.PUMP_SDK.decodeBondingCurveNullable(info) : null;
    if (!curve) return json(res, 404, { error: "No pump.fun curve for this mint yet." });
    if (curve.quoteMint.toBase58() !== PAIR.mint) return json(res, 400, { error: `Not paired with ${PAIR.symbol}.` });

    const md = await getTokenMetadata(conn, mint, "confirmed", TOKEN_2022_PROGRAM_ID);
    if (!md || !BLOB_HOST.test(md.uri)) return json(res, 400, { error: "Metadata wasn't made here." });
    const meta = (await (await fetch(md.uri)).json()) as Record<string, any>;
    const item = itemById(meta?.gtapad?.item);
    if (!item) return json(res, 400, { error: "No catalog item on this coin." });

    // One coin per item: the first coin to register takes it, later ones aren't listed.
    const holder = await claimItem(item.id, mint.toBase58());
    if (holder !== mint.toBase58()) return json(res, 409, { error: `${item.name} is already taken.`, holder });

    const rec: LaunchRecord = {
      mint: mint.toBase58(),
      name: md.name,
      symbol: md.symbol,
      uri: md.uri,
      image: String(meta.image ?? ""),
      description: String(meta.description ?? ""),
      item: item.id,
      creator: curve.creator.toBase58(),
      createdAt: Date.now(),
      x: meta.twitter,
      telegram: meta.telegram,
      website: meta.website,
    };
    await saveRecord(rec);
    json(res, 200, { ok: true, launch: rec });
  } catch (e) {
    console.error(e);
    json(res, 500, { error: "Couldn't register. It will retry." });
  }
}
