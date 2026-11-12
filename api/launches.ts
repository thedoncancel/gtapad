import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { LaunchesResponse } from "../shared/config.js";
import { json, loadRecords, pairUsd, withCurves } from "./_lib.js";

/** GET /api/launches: every coin launched here, with live curve state. ?mint= returns just that one. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const mint = typeof req.query.mint === "string" ? req.query.mint : null;
    let recs = await loadRecords();
    if (mint) recs = recs.filter((r) => r.mint === mint);
    const [launches, usd] = await Promise.all([withCurves(recs), pairUsd()]);
    const body: LaunchesResponse = {
      launches,
      pairUsd: usd,
      stats: {
        spawns: launches.length,
        onCurve: launches.filter((l) => !l.complete).length,
        graduated: launches.filter((l) => l.complete).length,
        raisedQuote: launches.reduce((s, l) => s + l.raisedQuote, 0),
      },
    };
    json(res, 200, body, "public, s-maxage=10, stale-while-revalidate=30");
  } catch (e) {
    console.error(e);
    json(res, 500, { error: "Couldn't read launches." });
  }
}
