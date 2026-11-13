import { NavLink, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { WalletButton } from "../wallet";
import { BRAND, PAIR } from "../../shared/config";
import { Logo } from "./Logo";
import { GtaChip } from "./Countdown";

export function Nav({ pairUsd }: { pairUsd: number | null }) {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const on = () => setSolid(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className={`nav ${solid ? "is-solid" : ""}`}>
      <Link to="/" className="nav__logo" aria-label={`${BRAND.name} home`}><Logo /></Link>
      <nav className="nav__links">
        <NavLink to="/streets">The Streets</NavLink>
        <NavLink to="/showroom">Showroom</NavLink>
        <NavLink to="/launch" className="nav__cta">Launch</NavLink>
      </nav>
      <GtaChip />
      <form
        className="nav__search"
        onSubmit={(e) => {
          e.preventDefault();
          const m = q.trim();
          if (m.length >= 32) nav(`/coin/${m}`);
        }}
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Paste a mint…" aria-label="Search by mint" />
      </form>
      <div className="hud" title={`${PAIR.symbol} price`}>
        <span className="hud__cash">{pairUsd != null ? `$${pairUsd.toFixed(2)}` : "$—"}</span>
        <span className="hud__label">{PAIR.symbol}</span>
      </div>
      <WalletButton />
    </header>
  );
}
