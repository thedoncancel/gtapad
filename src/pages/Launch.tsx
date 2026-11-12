import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useConnection } from "@solana/wallet-adapter-react";
import { signOne, useGtaWallet } from "../wallet";
import { CATEGORIES, ITEMS, RARITY_LABEL, itemById, type Category } from "../../shared/catalog";
import { BRAND, PAIR, links } from "../../shared/config";
import { ItemArt } from "../components/ItemArt";
import { Passed } from "../components/Passed";
import { balance, launchCoin } from "../lib/chain";
import { num } from "../lib/format";
import { useLaunches } from "../data/launches";

type Stage = "idle" | "upload" | "sign" | "confirm" | "register";
const STAGE_TEXT: Record<Stage, string> = {
  idle: "",
  upload: "Uploading logo and metadata…",
  sign: "Approve in your wallet…",
  confirm: "Waiting for Solana to confirm…",
  register: "Putting it on the map…",
};

/** Lists the coin. Returns true when listed, or the server's reason when it refused (item already taken). */
export async function register(mint: string): Promise<true | string | false> {
  for (let i = 0; i < 6; i++) {
    try {
      const r = await fetch("/api/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mint }) });
      if (r.ok) return true;
      if (r.status === 409) return String((await r.json().catch(() => ({})))?.error ?? "This item is already taken.");
    } catch {}
    await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
  }
  return false;
}

export default function Launch() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { connection } = useConnection();
  const w = useGtaWallet();
  const { publicKey } = w;
  const signTransaction = signOne(w);
  const setVisible = (_: boolean) => w.connect();

  const [itemId, setItemId] = useState(() => (itemById(params.get("item") ?? "") ? params.get("item")! : ""));
  const [cat, setCat] = useState<Category | "all">("all");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [desc, setDesc] = useState("");
  const [x, setX] = useState("");
  const [tg, setTg] = useState("");
  const [web, setWeb] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [devBuy, setDevBuy] = useState("");
  const [pairBal, setPairBal] = useState<number | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  // One coin per item: items that already have a coin can't be picked again.
  const { data: live } = useLaunches();
  const taken = useMemo(() => new Map((live?.launches ?? []).map((l) => [l.item, l.mint] as const)), [live]);
  const takenBy = itemId ? taken.get(itemId) : undefined;

  const item = itemById(itemId);
  const items = useMemo(() => (cat === "all" ? ITEMS : ITEMS.filter((i) => i.cat === cat)), [cat]);

  useEffect(() => {
    if (!publicKey) return setPairBal(null);
    balance(connection, publicKey, PAIR.mint).then(setPairBal).catch(() => setPairBal(null));
  }, [publicKey, connection]);

  useEffect(() => {
    if (item && !name) setName(item.name);
  }, [item]); // eslint-disable-line react-hooks/exhaustive-deps

  const buyAmt = Number(devBuy) || 0;
  const problems = [
    !item && "Pick an item",
    !!takenBy && `${item?.name ?? "This item"} is already taken`,
    !name.trim() && "Name it",
    !/^[A-Z0-9]{2,10}$/.test(symbol) && "Ticker: 2–10 letters or digits",
    buyAmt < 0 && "Dev buy can't be negative",
    pairBal != null && buyAmt > pairBal && `Not enough ${PAIR.symbol}`,
  ].filter(Boolean) as string[];

  function onLogo(f: File | undefined) {
    setErr(null);
    if (!f) return;
    if (!/^image\/(png|jpeg|webp|gif)$/.test(f.type)) return setErr("Logo must be PNG, JPG, WEBP or GIF.");
    if (f.size > 1_000_000) return setErr("Logo must be under 1 MB.");
    const r = new FileReader();
    r.onload = () => setLogo(String(r.result));
    r.readAsDataURL(f);
  }

  /** The item's picture cropped square (upper part, where faces and cars sit), as the coin logo. */
  async function itemLogo(id: string): Promise<string> {
    const img = new Image();
    img.src = `/img/items/${id}.jpg`;
    await img.decode();
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) * 0.35;
    const c = document.createElement("canvas");
    c.width = c.height = side;
    c.getContext("2d")!.drawImage(img, sx, sy, side, side, 0, 0, side, side);
    return c.toDataURL("image/jpeg", 0.9);
  }

  async function go() {
    if (!publicKey || !signTransaction) return setVisible(true);
    if (problems.length || !item) return;
    setErr(null);
    try {
      setStage("upload");
      const image = logo ?? (await itemLogo(item.id));
      const up = await fetch("/api/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image, name: name.trim(), symbol, description: desc, item: item.id, x, telegram: tg, website: web }),
      });
      const uj = await up.json();
      if (!up.ok) throw new Error(uj.error || "Upload failed.");
      setStage("sign");
      const { mint } = await launchCoin({
        conn: connection, user: publicKey,
        sign: async (tx) => {
          const s = await signTransaction(tx);
          setStage("confirm");
          return s;
        },
        name: name.trim(), symbol, uri: uj.uri, devBuy: buyAmt,
      });
      setStage("register");
      const listed = await register(mint);
      if (typeof listed === "string") throw new Error(`${listed} Someone launched it just before you, so your coin is live on pump.fun but not listed here.`);
      setDone(mint);
    } catch (e: any) {
      const m = String(e?.message ?? e);
      setErr(/reject|denied|cancel/i.test(m) ? "You cancelled in your wallet." : m.slice(0, 220));
    } finally {
      setStage("idle");
    }
  }

  return (
    <section className="page launch">
      {done && <Passed title="Launch passed" sub={`$${symbol} is on the streets`} onDone={() => nav(`/coin/${done}`)} />}
      <div className="section-head">
        <h1>Start a job</h1>
        <span className="muted">One transaction on pump.fun, paired to {PAIR.symbol}</span>
      </div>

      <div className="launch__grid">
        <div className="launch__form">
          <fieldset>
            <legend><span>1</span> Pick the loot</legend>
            <div className="tabs tabs--sm">
              <button className={cat === "all" ? "on" : ""} onClick={() => setCat("all")}>All</button>
              {CATEGORIES.map((c) => (
                <button key={c.id} className={cat === c.id ? "on" : ""} onClick={() => setCat(c.id)}>{c.label}</button>
              ))}
            </div>
            <div className="picker">
              {items.map((it) => (
                <button
                  key={it.id}
                  className={`picker__item ${it.id === itemId ? "on" : ""} ${taken.has(it.id) ? "is-taken" : ""}`}
                  onClick={() => !taken.has(it.id) && setItemId(it.id)}
                  disabled={taken.has(it.id)}
                  title={taken.has(it.id) ? "Already has a coin" : undefined}
                  type="button"
                >
                  <ItemArt item={it} size="sm" />
                  <span>{it.name}</span>
                  {taken.has(it.id) && <em className="picker__taken">Taken</em>}
                </button>
              ))}
            </div>
          </fieldset>

          {takenBy && item && (
            <p className="launch__taken">
              {item.name} already has a coin. One coin per item: <Link to={`/coin/${takenBy}`}>trade it</Link> or pick another.
            </p>
          )}

          <fieldset>
            <legend><span>2</span> Brand it</legend>
            <div className="row2">
              <label>Name<input value={name} maxLength={32} onChange={(e) => setName(e.target.value)} placeholder="Vapor GT" /></label>
              <label>Ticker<input value={symbol} maxLength={10} onChange={(e) => setSymbol(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="VAPOR" /></label>
            </div>
            <label>Description<textarea value={desc} maxLength={500} rows={3} onChange={(e) => setDesc(e.target.value)} placeholder={item?.line ?? "What's the story?"} /></label>
            <label className="file">
              Logo (optional: uses the item's picture unless you upload your own; PNG, JPG, WEBP or GIF, up to 1 MB)
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => onLogo(e.target.files?.[0])} />
            </label>
            <div className="row3">
              <label>X<input value={x} onChange={(e) => setX(e.target.value)} placeholder="https://x.com/…" /></label>
              <label>Telegram<input value={tg} onChange={(e) => setTg(e.target.value)} placeholder="https://t.me/…" /></label>
              <label>Website<input value={web} onChange={(e) => setWeb(e.target.value)} placeholder="https://…" /></label>
            </div>
          </fieldset>

          <fieldset>
            <legend><span>3</span> First buy (optional)</legend>
            <label>
              Buy your own coin with {PAIR.symbol}
              <div className="input-suffix">
                <input inputMode="decimal" value={devBuy} onChange={(e) => setDevBuy(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" />
                <span>{PAIR.symbol}</span>
              </div>
            </label>
            <p className="muted small">
              {publicKey ? <>Wallet: {num(pairBal)} {PAIR.symbol}. </> : null}
              Need {PAIR.symbol}? <a href={links.getPair} target="_blank" rel="noreferrer">Swap for it on Jupiter ↗</a>. {PAIR.symbol} may be
              unavailable in your jurisdiction, including to U.S. persons.
            </p>
          </fieldset>
        </div>

        <aside className="launch__preview">
          <div className="preview-card">
            {item ? <ItemArt item={item} size="lg" /> : <div className="item-art item-art--lg placeholder">Pick an item</div>}
            {logo ? <img className="preview-card__logo" src={logo} alt="" /> : item && <img className="preview-card__logo" src={`/img/items/${item.id}.jpg`} alt="" />}
            <div className="preview-card__body">
              <div className="coin-card__top">
                <strong>{name || "Your coin"}</strong>
                <span className="ticker">${symbol || "TICKER"}</span>
              </div>
              {item && <div className={`chip chip--${item.rarity}`}>{item.game} · {RARITY_LABEL[item.rarity]}</div>}
              {item && <p className="muted small">{item.line}</p>}
            </div>
          </div>
          <ul className="checklist">
            <li>1B supply, no presale, no team allocation</li>
            <li>Bonding curve in {PAIR.symbol} on pump.fun</li>
            <li>Graduates to a PumpSwap pool</li>
            <li>Listed on {BRAND.name} with its item</li>
          </ul>
          {err && <p className="warn">{err}</p>}
          {!publicKey ? (
            <button className="btn btn--hot btn--block" onClick={() => setVisible(true)}>Log in to launch</button>
          ) : (
            <button className="btn btn--hot btn--block" disabled={!!problems.length || stage !== "idle"} onClick={go}>
              {stage !== "idle" ? STAGE_TEXT[stage] : problems[0] ?? `Launch $${symbol}`}
            </button>
          )}
          <p className="muted small center">
            By launching you accept the risks in the footer. <Link to="/showroom">Browse the Showroom</Link>
          </p>
        </aside>
      </div>
    </section>
  );
}
