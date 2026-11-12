import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useConnection } from "@solana/wallet-adapter-react";
import { signOne, useGtaWallet } from "../wallet";
import { itemById, RARITY_LABEL } from "../../shared/catalog";
import { BRAND, PAIR, links, type Launch } from "../../shared/config";
import { ItemArt } from "../components/ItemArt";
import { Wanted } from "../components/Wanted";
import { Passed } from "../components/Passed";
import { useLaunches } from "../data/launches";
import { balance, buy, quote, sell } from "../lib/chain";
import { num, short, usd, wanted } from "../lib/format";
import { register } from "./Launch";

export default function Coin() {
  const { mint = "" } = useParams();
  const { data } = useLaunches(mint, 10_000);
  const l = data?.launches.find((x) => x.mint === mint);
  const tried = useRef(false);

  // A launch whose registration didn't land (closed tab, flaky network) gets registered on first visit.
  useEffect(() => {
    if (data && !l && !tried.current && mint.length >= 32) {
      tried.current = true;
      register(mint);
    }
  }, [data, l, mint]);

  if (!data) return <section className="page"><div className="coin-head skeleton" /></section>;
  if (!l)
    return (
      <section className="page center">
        <h1 className="wasted">Not on the map</h1>
        <p className="muted">No {BRAND.name} coin with mint {short(mint, 6)}. If it was launched a moment ago, give it a few seconds.</p>
      </section>
    );
  return <CoinView l={l} pairUsd={data.pairUsd} />;
}

function CoinView({ l, pairUsd }: { l: Launch; pairUsd: number | null }) {
  const item = itemById(l.item);
  const [copied, setCopied] = useState(false);
  return (
    <section className="page coin">
      <div className="coin-head">
        <div className="coin-head__art">
          {item && <ItemArt item={item} size="lg" />}
          {l.image && <img className="coin-head__logo" src={l.image} alt="" />}
        </div>
        <div className="coin-head__info">
          <div className="coin-card__top">
            <h1>{l.name}</h1>
            <span className="ticker ticker--lg">${l.symbol}</span>
          </div>
          {item && (
            <p>
              <span className={`chip chip--${item.rarity}`}>{item.game} · {RARITY_LABEL[item.rarity]}</span>{" "}
              <span className="muted">{item.line}</span>
            </p>
          )}
          {l.description && <p className="coin-head__desc">{l.description}</p>}
          <div className="coin-head__links">
            <button
              className="pill"
              onClick={() => {
                navigator.clipboard?.writeText(l.mint);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }}
            >
              {copied ? "Copied" : short(l.mint, 5)}
            </button>
            <a className="pill" href={links.pump(l.mint)} target="_blank" rel="noreferrer">pump.fun ↗</a>
            <a className="pill" href={links.solscanToken(l.mint)} target="_blank" rel="noreferrer">Solscan ↗</a>
            {l.x && <a className="pill" href={l.x} target="_blank" rel="noreferrer">X ↗</a>}
            {l.telegram && <a className="pill" href={l.telegram} target="_blank" rel="noreferrer">Telegram ↗</a>}
            {l.website && <a className="pill" href={l.website} target="_blank" rel="noreferrer">Web ↗</a>}
          </div>
        </div>
      </div>

      <div className="coin__grid">
        <div>
          <div className="stats stats--4">
            <div className="stat"><span className="stat__v">{usd(l.mcapUsd)}</span><span className="stat__k">Market cap</span></div>
            <div className="stat"><span className="stat__v">{usd(l.priceUsd, 2)}</span><span className="stat__k">Price</span></div>
            <div className="stat"><span className="stat__v">{num(l.raisedQuote)}</span><span className="stat__k">{PAIR.symbol} in curve</span></div>
            <div className="stat"><span className="stat__v"><Wanted level={wanted(l.progress, l.complete)} /></span><span className="stat__k">Heat</span></div>
          </div>
          <div className="curve">
            <div className="curve__top">
              <span>Bonding curve</span>
              <strong>{l.complete ? "Graduated" : `${(l.progress * 100).toFixed(1)}%`}</strong>
            </div>
            <div className="bar bar--lg"><i style={{ width: `${Math.max(1, l.progress * 100)}%` }} /></div>
            <p className="muted small">
              {l.complete
                ? `This coin's curve filled and its ${PAIR.symbol} moved into a PumpSwap pool. Trade it on pump.fun or any Solana aggregator.`
                : `When the curve fills, the ${PAIR.symbol} raised seeds a PumpSwap pool. Price shown in USD uses ${PAIR.symbol} at ${usd(pairUsd, 2)}.`}
            </p>
          </div>
          <p className="muted small">Creator {short(l.creator, 5)}</p>
        </div>
        <Trade l={l} />
      </div>
    </section>
  );
}

function Trade({ l }: { l: Launch }) {
  const { connection } = useConnection();
  const w = useGtaWallet();
  const { publicKey } = w;
  const signTransaction = signOne(w);
  const setVisible = (_: boolean) => w.connect();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amt, setAmt] = useState("");
  const [out, setOut] = useState<number | null>(null);
  const [bal, setBal] = useState<{ pair: number; coin: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [slip, setSlip] = useState(5);

  const refresh = () => {
    if (!publicKey) return setBal(null);
    Promise.all([balance(connection, publicKey, PAIR.mint), balance(connection, publicKey, l.mint)])
      .then(([pair, coin]) => setBal({ pair, coin }))
      .catch(() => {});
  };
  useEffect(refresh, [publicKey, connection, l.mint]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setOut(null);
    const v = Number(amt);
    if (!(v > 0) || l.complete) return;
    const t = setTimeout(() => quote(connection, l.mint, publicKey, side, v).then(setOut).catch(() => setOut(null)), 350);
    return () => clearTimeout(t);
  }, [amt, side, l.mint, l.complete, connection, publicKey]);

  if (l.complete)
    return (
      <div className="trade">
        <h3>Graduated</h3>
        <p className="muted">This coin now trades in its PumpSwap pool.</p>
        <a className="btn btn--hot btn--block" href={links.pump(l.mint)} target="_blank" rel="noreferrer">Trade on pump.fun ↗</a>
      </div>
    );

  const v = Number(amt) || 0;
  const max = side === "buy" ? bal?.pair : bal?.coin;
  const unit = side === "buy" ? PAIR.symbol : l.symbol;

  async function go() {
    if (!publicKey || !signTransaction) return setVisible(true);
    setErr(null);
    setBusy(true);
    try {
      const args = { conn: connection, user: publicKey, sign: signTransaction, mint: l.mint, slippagePct: slip };
      await (side === "buy" ? buy({ ...args, quoteIn: v }) : sell({ ...args, coinIn: v }));
      setOk(side === "buy" ? `Bought ${num(out)} $${l.symbol}` : `Sold for ${num(out)} ${PAIR.symbol}`);
      setAmt("");
      refresh();
    } catch (e: any) {
      const m = String(e?.message ?? e);
      setErr(/reject|denied|cancel/i.test(m) ? "You cancelled in your wallet." : /slippage|6002|TooMuch|TooLittle/i.test(m) ? "Price moved past your slippage. Try again." : m.slice(0, 200));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="trade">
      {ok && <Passed title="Respect +" sub={ok} onDone={() => setOk(null)} />}
      <div className="trade__tabs">
        <button className={side === "buy" ? "on buy" : ""} onClick={() => { setSide("buy"); setAmt(""); }}>Buy</button>
        <button className={side === "sell" ? "on sell" : ""} onClick={() => { setSide("sell"); setAmt(""); }}>Sell</button>
      </div>
      <label>
        <span className="trade__lbl">
          You pay
          {max != null && (
            <button className="link" onClick={() => setAmt(String(max))}>Balance {num(max)} {unit}</button>
          )}
        </span>
        <div className="input-suffix">
          <input inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.0" />
          <span>{unit}</span>
        </div>
      </label>
      {side === "buy" && (
        <div className="quick">
          {[1, 5, 10, 25].map((q) => <button key={q} onClick={() => setAmt(String(q))}>{q} {PAIR.symbol}</button>)}
        </div>
      )}
      {side === "sell" && bal?.coin ? (
        <div className="quick">
          {[25, 50, 100].map((p) => <button key={p} onClick={() => setAmt(String((bal.coin * p) / 100))}>{p}%</button>)}
        </div>
      ) : null}
      <div className="trade__out">
        <span>You get (estimate)</span>
        <strong>{out != null ? `${num(out)} ${side === "buy" ? `$${l.symbol}` : PAIR.symbol}` : "—"}</strong>
      </div>
      <div className="trade__slip">
        Slippage
        {[2, 5, 10].map((s) => <button key={s} className={slip === s ? "on" : ""} onClick={() => setSlip(s)}>{s}%</button>)}
      </div>
      {err && <p className="warn">{err}</p>}
      {!publicKey ? (
        <button className="btn btn--hot btn--block" onClick={() => setVisible(true)}>Log in to trade</button>
      ) : (
        <button className={`btn btn--block ${side === "buy" ? "btn--buy" : "btn--sell"}`} disabled={busy || !(v > 0) || (max != null && v > max)} onClick={go}>
          {busy ? "Confirming…" : max != null && v > max ? `Not enough ${unit}` : side === "buy" ? `Buy $${l.symbol}` : `Sell $${l.symbol}`}
        </button>
      )}
      {side === "buy" && (
        <p className="muted small">Need {PAIR.symbol}? <a href={links.getPair} target="_blank" rel="noreferrer">Swap on Jupiter ↗</a></p>
      )}
    </div>
  );
}
