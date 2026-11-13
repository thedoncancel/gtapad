import { Link } from "react-router-dom";
import { BRAND, PAIR, PUMP, links } from "../../shared/config";

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__col">
          <span className="footer__k">Navigate</span>
          <Link to="/streets">The Streets</Link>
          <Link to="/showroom">Showroom</Link>
          <Link to="/launch">Start a job</Link>
        </div>
        <div className="footer__col">
          <span className="footer__k">On-chain</span>
          <a href={links.solscanToken(PAIR.mint)} target="_blank" rel="noreferrer">{PAIR.symbol} mint ↗</a>
          <a href={`https://solscan.io/account/${PUMP.program}`} target="_blank" rel="noreferrer">pump.fun program ↗</a>
          <a href="https://github.com/pump-fun/pump-public-docs" target="_blank" rel="noreferrer">Docs ↗</a>
          {BRAND.x && <a href={BRAND.x} target="_blank" rel="noreferrer">X ↗</a>}
        </div>
        <div className="footer__col footer__col--wide">
          <p className="fine">
            {BRAND.name} is an independent interface on top of pump.fun. It never holds your funds; every launch and trade is a
            transaction you sign with your own wallet. {BRAND.name} is not affiliated with, endorsed by or connected to Rockstar
            Games, Take-Two Interactive, pump.fun or Backpack. It is fan-made and unofficial: names refer to the Grand Theft Auto games and belong to their owners, and every image is AI-generated, not official Rockstar art.
          </p>
          <p className="fine">
            Coins here trade against {PAIR.symbol}, a tokenized Take-Two Interactive share issued by Backpack Securities. It may
            be unavailable in your jurisdiction, including to U.S. persons, and its issuer can freeze, pause or move balances.
            Coins launched here are experimental, can lose all value and are not financial advice.
          </p>
        </div>
      </div>
      <div className="footer__mark" aria-hidden="true">
        GTA<em className="script">pad</em>
      </div>
      <div className="footer__base">
        <span>© {new Date().getFullYear()} {BRAND.name}</span>
        <span>{BRAND.city} · after dark</span>
      </div>
    </footer>
  );
}
