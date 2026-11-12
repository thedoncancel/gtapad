import { useEffect, useState } from "react";
import type { LaunchesResponse } from "../../shared/config";

const EMPTY: LaunchesResponse = { launches: [], pairUsd: null, stats: { spawns: 0, onCurve: 0, graduated: 0, raisedQuote: 0 } };

/** Polls /api/launches. Returns null until the first response. */
export function useLaunches(mint?: string, everyMs = 15_000) {
  const [data, setData] = useState<LaunchesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/launches${mint ? `?mint=${mint}` : ""}`);
        if (!r.ok) throw new Error(String(r.status));
        const j = (await r.json()) as LaunchesResponse;
        if (live) {
          setData(j);
          setError(null);
        }
      } catch {
        if (live) {
          setError("Couldn't reach the streets. Retrying…");
          setData((d) => d ?? EMPTY);
        }
      }
    };
    load();
    const t = setInterval(load, everyMs);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [mint, everyMs]);
  return { data, error };
}
