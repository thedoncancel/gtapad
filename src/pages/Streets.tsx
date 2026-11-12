import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CATEGORIES, ITEMS, RARITY_LABEL, itemById, type Category } from "../../shared/catalog";
import { ItemArt } from "../components/ItemArt";
import { CoinCard } from "../components/CoinCard";
import { useLaunches } from "../data/launches";
import { useReveal } from "../lib/reveal";
import { Quiet } from "./Home";

type Sort = "new" | "heat" | "mcap";

export default function Streets() {
  const { data, error } = useLaunches();
  const [cat, setCat] = useState<Category | "all">("all");
  const [sort, setSort] = useState<Sort>("new");
  const list = useMemo(() => {
    let l = data?.launches ?? [];
    if (cat !== "all") l = l.filter((x) => itemById(x.item)?.cat === cat);
    const s = [...l];
    if (sort === "heat") s.sort((a, b) => b.progress - a.progress);
    if (sort === "mcap") s.sort((a, b) => (b.mcapUsd ?? 0) - (a.mcapUsd ?? 0));
    return s;
  }, [data, cat, sort]);
  const unclaimed = useMemo(() => {
    const taken = new Set((data?.launches ?? []).map((l) => l.item));
    return ITEMS.filter((i) => !taken.has(i.id) && (cat === "all" || i.cat === cat));
  }, [data, cat]);
  useReveal([list.length, cat, sort, data == null, unclaimed.length]);

  return (
    <section className="page">
      <header className="page-head" data-reveal>
        <span className="eyebrow">{data ? `${data.launches.length} launches · live` : "Loading the map…"}</span>
        <h1>The <em>Streets</em></h1>
        <p className="page-head__lede">Every coin on the map, live from the chain. Filter by what it stands for, sort by heat.</p>
      </header>
      <div className="filters">
        <div className="tabs">
          <button className={cat === "all" ? "on" : ""} onClick={() => setCat("all")}>All</button>
          {CATEGORIES.map((c) => (
            <button key={c.id} className={cat === c.id ? "on" : ""} onClick={() => setCat(c.id)}>{c.label}</button>
          ))}
        </div>
        <div className="tabs">
          {(["new", "heat", "mcap"] as Sort[]).map((s) => (
            <button key={s} className={sort === s ? "on" : ""} onClick={() => setSort(s)}>
              {s === "new" ? "Newest" : s === "heat" ? "Most heat" : "Market cap"}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="warn">{error}</p>}
      {data == null ? (
        <div className="grid">{Array.from({ length: 6 }, (_, i) => <div key={i} className="coin-card skeleton" />)}</div>
      ) : list.length ? (
        <div className="grid">
          {list.map((l) => (
            <div key={l.mint} data-reveal>
              <CoinCard l={l} />
            </div>
          ))}
        </div>
      ) : (
        <Quiet text={cat === "all" ? undefined : "Nothing launched in this category yet. Claim the first one."} />
      )}

      {data != null && unclaimed.length > 0 && (
        <div className="grabs">
          <header className="sec" data-reveal>
            <span className="sec__n">{unclaimed.length}</span>
            <h2>Up for <em>grabs</em></h2>
            <span className="more">No coin yet · launch one</span>
          </header>
          <div className="gallery">
            {unclaimed.map((it, i) => (
              <Link key={it.id} to={`/launch?item=${it.id}`} className="poster poster--grid" data-reveal style={{ transitionDelay: `${(i % 4) * 60}ms` }}>
                <ItemArt item={it} size="tall" />
                <div className="poster__meta">
                  <span className={`chip chip--${it.rarity}`}>{it.game} · {RARITY_LABEL[it.rarity]}</span>
                  <strong>{it.name}</strong>
                </div>
                <div className="poster__foot">
                  <span>Unclaimed</span>
                  <span className="poster__cta">Launch this →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
