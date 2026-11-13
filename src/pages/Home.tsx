import { Link } from "react-router-dom";
import { BRAND, PAIR } from "../../shared/config";
import { ITEMS, RARITY_LABEL } from "../../shared/catalog";
import { SCENES } from "../components/Logo";
import { CoinCard } from "../components/CoinCard";
import { ItemArt } from "../components/ItemArt";
import { Marquee } from "../components/Marquee";
import { GtaCountdown } from "../components/Countdown";
import { useLaunches } from "../data/launches";
import { useReveal } from "../lib/reveal";
import { num, usd } from "../lib/format";

const MISSIONS = [
  { n: "01", t: "Pick the loot", d: "Choose a character, ride, place or brand from the Showroom. Your coin is tied to it for good.", img: "/img/items/infernus.jpg" },
  { n: "02", t: "Brand it", d: "Name, ticker, logo. A fixed 1B-supply pump.fun coin: no presale, no team bag, no mint button.", img: "/img/items/boobie.jpg" },
  { n: "03", t: `Hit the curve in ${PAIR.symbol}`, d: `One transaction on pump.fun. Buyers pay in ${PAIR.symbol} and get ${PAIR.symbol} back when they sell.`, img: "/img/items/heist-cash.jpg" },
  { n: "04", t: "Graduate", d: `When the curve fills, the ${PAIR.symbol} raised seeds a PumpSwap pool and the coin trades like any other pair.`, img: "/img/items/vinewood.jpg" },
];

const FEATURED = ["lucia", "jason", "vice-city", "infernus", "oppressor", "trevor", "cayo-perico", "tommy", "five-stars", "sprunk"];
const BAND = ["Launch the loot", `Paired to $${PAIR.symbol}`, `${ITEMS.length} pieces in the Showroom`, "Graduates to PumpSwap", "No presale", "No team bag"];

export default function Home() {
  const { data } = useLaunches();
  const launches = data?.launches ?? [];
  useReveal([data == null, launches.length]);
  const featured = FEATURED.map((id) => ITEMS.find((i) => i.id === id)!);

  return (
    <>
      <section className="hero">
        <Marquee className="hero__strip" speed={0.6}>
          {SCENES.map((src, i) => (
            <figure key={src} className={`frame frame--${i % 3}`}>
              <img src={src} alt="" loading={i < 5 ? "eager" : "lazy"} decoding="async" />
            </figure>
          ))}
        </Marquee>

        <div className="hero__base">
          <h1 className="hero__mark" aria-label={BRAND.name}>
            <span className="rise">GTA</span>
            <em className="script rise rise--late">pad</em>
          </h1>
          <div className="hero__side">
            <p className="hero__eyebrow">
              <span className="dot" /> Live on Solana · pump.fun · paired to ${PAIR.symbol}
            </p>
            <p className="hero__lede">
              <em>{BRAND.tagline}</em> Every coin is tied to a character, ride, place or brand from GTA VI, GTA V and the
              classics, and every curve trades against {PAIR.symbol}, the tokenized Take-Two share.
            </p>
            <div className="hero__cta">
              <Link to="/launch" className="btn btn--hot">Start a job</Link>
              <Link to="/streets" className="btn btn--ghost">Hit the streets</Link>
            </div>
          </div>
        </div>
      </section>

      <GtaCountdown />

      <Marquee className="band" speed={1.1}>
        {BAND.map((t) => (
          <span key={t} className="band__item">
            {t}
            <i>✦</i>
          </span>
        ))}
      </Marquee>

      <section className="page">
        <header className="sec" data-reveal>
          <span className="sec__n">01</span>
          <h2>Hot on the <em>streets</em></h2>
          <Link to="/streets" className="more">Full map →</Link>
        </header>
        {data == null ? (
          <div className="grid">{Array.from({ length: 3 }, (_, i) => <div key={i} className="coin-card skeleton" />)}</div>
        ) : launches.length ? (
          <div className="grid">
            {launches.slice(0, 6).map((l) => (
              <div key={l.mint} data-reveal>
                <CoinCard l={l} />
              </div>
            ))}
          </div>
        ) : (
          <Quiet />
        )}
      </section>

      <section className="page page--bleed">
        <header className="sec page__pad" data-reveal>
          <span className="sec__n">02</span>
          <h2>The <em>Showroom</em></h2>
          <Link to="/showroom" className="more">All {ITEMS.length} pieces →</Link>
        </header>
        <div className="rail" data-reveal>
          {featured.map((it, i) => (
            <Link key={it.id} to={`/launch?item=${it.id}`} className="poster">
              <ItemArt item={it} size="tall" />
              <div className="poster__meta">
                <span className="poster__n">{String(i + 1).padStart(2, "0")} · {it.game}</span>
                <strong>{it.name}</strong>
                <span className={`chip chip--${it.rarity}`}>{RARITY_LABEL[it.rarity]}</span>
              </div>
              <span className="poster__cta">Launch this →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="page">
        <header className="sec" data-reveal>
          <span className="sec__n">03</span>
          <h2>How a job <em>goes down</em></h2>
        </header>
        <ol className="steps">
          {MISSIONS.map((m) => (
            <li key={m.n} className="step" data-reveal>
              <span className="step__n">{m.n}</span>
              <h3>{m.t}</h3>
              <p>{m.d}</p>
              <img className="step__img" src={m.img} alt="" loading="lazy" />
            </li>
          ))}
        </ol>
      </section>

      <section className="page">
        <header className="sec" data-reveal>
          <span className="sec__n">04</span>
          <h2>City <em>stats</em></h2>
        </header>
        <div className="stats" data-reveal>
          <Stat k="Launches" v={num(data?.stats.spawns ?? null, 0)} />
          <Stat k="On the curve" v={num(data?.stats.onCurve ?? null, 0)} />
          <Stat k="Graduated" v={num(data?.stats.graduated ?? null, 0)} />
          <Stat k={`${PAIR.symbol} raised`} v={num(data?.stats.raisedQuote ?? null)} />
          <Stat k={`${PAIR.symbol} price`} v={usd(data?.pairUsd ?? null, 2)} />
        </div>
      </section>

      <section className="cta-block" data-reveal>
        <img src="/img/scenes/s8.jpg" alt="" loading="lazy" />
        <div className="cta-block__body">
          <h2>Your city. <em>Your coin.</em></h2>
          <Link to="/launch" className="btn btn--hot">Start a job</Link>
        </div>
      </section>
    </>
  );
}

export function Quiet({ text = "Nobody has pulled a job yet. The first coin here gets the whole city's attention." }: { text?: string }) {
  return (
    <div className="quiet" data-reveal>
      <img src="/img/scenes/s9.jpg" alt="" loading="lazy" />
      <div className="quiet__body">
        <h3>The streets are <em>quiet.</em></h3>
        <p>{text}</p>
        <Link to="/launch" className="btn btn--hot">Be the first</Link>
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="stat">
      <span className="stat__v">{v}</span>
      <span className="stat__k">{k}</span>
    </div>
  );
}
