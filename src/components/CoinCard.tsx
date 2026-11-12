import { Link } from "react-router-dom";
import { itemById, RARITY_LABEL } from "../../shared/catalog";
import type { Launch } from "../../shared/config";
import { ago, usd, wanted } from "../lib/format";
import { ItemArt } from "./ItemArt";
import { Wanted } from "./Wanted";

export function CoinCard({ l }: { l: Launch }) {
  const item = itemById(l.item);
  return (
    <Link to={`/coin/${l.mint}`} className="coin-card">
      <div className="coin-card__art">
        {item && <ItemArt item={item} />}
        {l.image && <img className="coin-card__logo" src={l.image} alt="" loading="lazy" />}
        {l.complete && <span className="stamp">Graduated</span>}
        {item && <span className="coin-card__item">{item.name} · {item.game}</span>}
      </div>
      <div className="coin-card__body">
        <div className="coin-card__top">
          <strong className="coin-card__name">{l.name}</strong>
          <span className="ticker">${l.symbol}</span>
        </div>
        <div className="coin-card__row">
          <span><small>Mkt cap</small> {usd(l.mcapUsd)}</span>
          <Wanted level={wanted(l.progress, l.complete)} label={false} />
        </div>
        <div className="bar"><i style={{ width: `${Math.round(l.progress * 100)}%` }} /></div>
        <div className="coin-card__foot">
          <span>{Math.round(l.progress * 100)}% to graduation</span>
          <span>{ago(l.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}
