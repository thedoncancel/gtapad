import { useState } from "react";
import { Link } from "react-router-dom";
import { CATEGORIES, ITEMS, RARITY_LABEL, type Category } from "../../shared/catalog";
import { ItemArt } from "../components/ItemArt";
import { useLaunches } from "../data/launches";
import { useReveal } from "../lib/reveal";

export default function Showroom() {
  const [cat, setCat] = useState<Category | "all">("all");
  const { data } = useLaunches();
  const counts = new Map<string, number>();
  for (const l of data?.launches ?? []) counts.set(l.item, (counts.get(l.item) ?? 0) + 1);
  const items = cat === "all" ? ITEMS : ITEMS.filter((i) => i.cat === cat);
  useReveal([cat]);

  return (
    <section className="page">
      <header className="page-head" data-reveal>
        <span className="eyebrow">{ITEMS.length} pieces · {CATEGORIES.length} categories</span>
        <h1>The <em>Showroom</em></h1>
        <p className="page-head__lede">Every coin claims one piece of GTA: a character, a ride, a place or a brand from GTA VI, GTA V and the classics. Pick one and launch a coin tied to it.</p>
      </header>
      <div className="tabs tabs--big">
        <button className={cat === "all" ? "on" : ""} onClick={() => setCat("all")}>
          All <sup>{ITEMS.length}</sup>
        </button>
        {CATEGORIES.map((c) => (
          <button key={c.id} className={cat === c.id ? "on" : ""} onClick={() => setCat(c.id)}>
            {c.label} <sup>{ITEMS.filter((i) => i.cat === c.id).length}</sup>
          </button>
        ))}
      </div>
      <div className="gallery" key={cat}>
        {items.map((it, i) => (
          <Link key={it.id} to={`/launch?item=${it.id}`} className="poster poster--grid" data-reveal style={{ transitionDelay: `${(i % 4) * 60}ms` }}>
            <ItemArt item={it} size="tall" eager={i < 8} />
            <div className="poster__meta">
              <span className={`chip chip--${it.rarity}`}>{it.game} · {RARITY_LABEL[it.rarity]}</span>
              <strong>{it.name}</strong>
              <p>{it.line}</p>
            </div>
            <div className="poster__foot">
              <span>{counts.get(it.id) ?? 0} coins</span>
              <span className="poster__cta">Launch this →</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
