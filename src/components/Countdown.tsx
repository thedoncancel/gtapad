import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/** GTA VI unlocks Thursday, November 19, 2026 at 12 AM Eastern (9 PM Pacific on the 18th). */
export const GTA6_AT = Date.UTC(2026, 10, 19, 5, 0, 0);

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

function split(left: number) {
  const s = Math.max(0, Math.floor(left / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor(s / 3600) % 24, m: Math.floor(s / 60) % 60, s: s % 60 };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Each digit rolls in when it changes (keyed by value, so React remounts it). */
function Digits({ value }: { value: string }) {
  return (
    <span className="clock__digits" aria-hidden>
      {value.split("").map((c, i) => (
        <span key={`${i}-${c}`} className="clock__digit">{c}</span>
      ))}
    </span>
  );
}

export function GtaCountdown() {
  const now = useNow();
  const left = GTA6_AT - now;
  const t = split(left);
  const out = left <= 0;
  const units = [
    { v: pad(t.d), l: t.d === 1 ? "day" : "days" },
    { v: pad(t.h), l: "hours" },
    { v: pad(t.m), l: "min" },
    { v: pad(t.s), l: "sec" },
  ];
  return (
    <section className="drop" id="gta6" aria-label="Countdown to GTA VI">
      <div className="drop__sun" aria-hidden><i /><i /><i /><i /></div>
      <div className="drop__body">
        <p className="drop__eyebrow">
          <span className="dot" /> Grand Theft Auto VI · Thu, Nov 19 · 12 AM ET · PS5 &amp; Xbox Series X|S
        </p>
        {out ? (
          <>
            <h2 className="drop__title">Leonida is <em>open.</em></h2>
            <p className="drop__lede">GTA VI is out now. The streets are live, so get your piece of the loot on the curve.</p>
          </>
        ) : (
          <>
            <h2 className="drop__title">Leonida opens <em>in</em></h2>
            <div className="clock" role="timer" aria-live="off" aria-label={`${t.d} days, ${t.h} hours, ${t.m} minutes until GTA VI`}>
              {units.map((u, i) => (
                <div key={u.l} className="clock__unit">
                  <Digits value={u.v} />
                  <span className="clock__label">{u.l}</span>
                  {i < units.length - 1 && <span className="clock__sep" aria-hidden>:</span>}
                </div>
              ))}
            </div>
            <p className="drop__lede">Every legend gets a coin before the doors open. One coin per character, ride or place, and the good ones go first.</p>
          </>
        )}
        <div className="drop__cta">
          <Link to="/launch" className="btn btn--hot">{out ? "Launch now" : "Launch before launch"}</Link>
          <Link to="/showroom" className="btn btn--ghost">See what's left</Link>
        </div>
      </div>
    </section>
  );
}

/** Small live chip for the nav. */
export function GtaChip() {
  const now = useNow();
  const left = GTA6_AT - now;
  const t = split(left);
  return (
    <a href="/#gta6" className="gta-chip" title="Countdown to GTA VI">
      <span className="gta-chip__k">GTA VI</span>
      <span className="gta-chip__v">{left <= 0 ? "Out now" : `${t.d}d ${pad(t.h)}:${pad(t.m)}:${pad(t.s)}`}</span>
    </a>
  );
}
