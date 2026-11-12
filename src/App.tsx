import { Suspense, lazy, useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Wallets } from "./wallet";
import { Nav } from "./components/Nav";
import { Footer } from "./components/Footer";
import { useLaunches } from "./data/launches";
import { BRAND } from "../shared/config";
import Home from "./pages/Home";

const Streets = lazy(() => import("./pages/Streets"));
const Showroom = lazy(() => import("./pages/Showroom"));
const Launch = lazy(() => import("./pages/Launch"));
const Coin = lazy(() => import("./pages/Coin"));

const TIPS = [
  "Every coin here trades against TTWO, not SOL.",
  "Each launch claims a character, ride, place or brand.",
  "Heat stars climb as a coin's curve fills.",
  "When a curve fills, it graduates to a PumpSwap pool.",
  "Your keys, your wallet. Nothing is held here.",
];

function Loading({ onDone }: { onDone: () => void }) {
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  const [n, setN] = useState(0);
  const [out, setOut] = useState(false);
  useEffect(() => {
    const start = performance.now();
    const DUR = 1500;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / DUR);
      setN(Math.round(100 * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setOut(true);
    };
    raf = requestAnimationFrame(tick);
    // Background tabs throttle animation frames; never let the preloader stall.
    const guard = setTimeout(() => {
      setN(100);
      setOut(true);
    }, DUR + 900);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(guard);
    };
  }, []);
  useEffect(() => {
    if (!out) return;
    const t = setTimeout(onDone, 750);
    return () => clearTimeout(t);
  }, [out, onDone]);
  return (
    <div className={`loading ${out ? "is-out" : ""}`} onClick={() => setOut(true)}>
      <div className="loading__mark">
        <img src="/brand/plate.svg" alt={BRAND.name} />
      </div>
      <p className="loading__tip"><span>Tip</span> {tip}</p>
      <div className="loading__count">{String(n).padStart(3, "0")}</div>
    </div>
  );
}

function Routed() {
  const location = useLocation();
  return (
    <div className="route" key={location.pathname}>
      <Suspense fallback={<div className="page-loading"><span /></div>}>
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/streets" element={<Streets />} />
          <Route path="/showroom" element={<Showroom />} />
          <Route path="/launch" element={<Launch />} />
          <Route path="/coin/:mint" element={<Coin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default function App() {
  const [booted, setBooted] = useState(() => {
    try {
      return sessionStorage.getItem("booted") === "1";
    } catch {
      return true;
    }
  });
  const { data } = useLaunches(undefined, 30_000);
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  useEffect(() => {
    document.title = `${BRAND.name} · ${BRAND.tagline.replace(/\.$/, "").toLowerCase()}`;
  }, []);

  return (
    <Wallets>
      {!booted && (
        <Loading
          onDone={() => {
            setBooted(true);
            try {
              sessionStorage.setItem("booted", "1");
            } catch {}
          }}
        />
      )}
      <Nav pairUsd={data?.pairUsd ?? null} />
      <main>
        <Routed />
      </main>
      <Footer />
      <div className="grain" aria-hidden="true" />
    </Wallets>
  );
}

function NotFound() {
  return (
    <section className="page center">
      <h1 className="wasted">Wasted</h1>
      <p>That page doesn't exist in this city.</p>
    </section>
  );
}
