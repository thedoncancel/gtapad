import type { VercelRequest, VercelResponse } from "@vercel/node";
import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { itemById } from "../shared/catalog.js";
import { BRAND } from "../shared/config.js";
import { json } from "./_lib.js";

export const config = { api: { bodyParser: { sizeLimit: "2mb" } } };

const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const url = (v: unknown) => {
  const s = clean(v, 200);
  return /^https:\/\/[^\s]+$/.test(s) ? s : "";
};

/**
 * POST /api/upload: stores the coin's logo and its metadata JSON, returns the metadata URI for create_v2.
 * Body: { image: dataURL, name, symbol, description, item, x?, telegram?, website? }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return json(res, 405, { error: "POST only" });
  const b = (req.body ?? {}) as Record<string, unknown>;
  const name = clean(b.name, 32);
  const symbol = clean(b.symbol, 10).toUpperCase();
  const item = itemById(clean(b.item, 64));
  const m = /^data:([a-z/]+);base64,(.+)$/.exec(typeof b.image === "string" ? b.image : "");
  if (!name || !symbol || !item) return json(res, 400, { error: "Name, ticker and item are required." });
  if (!m || !TYPES[m[1]]) return json(res, 400, { error: "Logo must be PNG, JPG, WEBP or GIF." });
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length > 1_000_000) return json(res, 400, { error: "Logo must be under 1 MB." });

  try {
    const id = randomUUID();
    const img = await put(`img/${id}.${TYPES[m[1]]}`, bytes, { access: "public", contentType: m[1], addRandomSuffix: false });
    const meta = {
      name,
      symbol,
      description: clean(b.description, 500) || `${item.name}. Launched on ${BRAND.name}.`,
      image: img.url,
      showName: true,
      createdOn: BRAND.name,
      twitter: url(b.x) || undefined,
      telegram: url(b.telegram) || undefined,
      website: url(b.website) || undefined,
      attributes: [{ trait_type: "Item", value: item.name }, { trait_type: "Category", value: item.cat }],
      gtapad: { item: item.id },
    };
    const doc = await put(`meta/${id}.json`, JSON.stringify(meta), { access: "public", contentType: "application/json", addRandomSuffix: false });
    json(res, 200, { uri: doc.url, image: img.url });
  } catch (e) {
    console.error(e);
    json(res, 500, { error: "Upload failed. Try again." });
  }
}
