/**
 * Wallet connection. Pages read the wallet through useGtaWallet() only, so they never know which provider is active:
 * - VITE_PRIVY_APP_ID set: Privy (Solana wallets, email, Google, X; email and social users get an embedded wallet).
 *   Privy's code loads on demand from ./wallet-privy, so builds without an App ID don't carry it.
 * - otherwise: Solana wallet-adapter with Phantom and Solflare (wallet-standard wallets like Backpack are detected).
 */
import { Component, Suspense, createContext, lazy, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider, useWallet } from "@solana/wallet-adapter-react";
import { WalletModalProvider, useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { clusterApiUrl, type PublicKey, type Transaction } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";
import { short } from "./lib/format";

export const RPC = (import.meta.env.VITE_RPC_URL as string | undefined) || clusterApiUrl("mainnet-beta");
const PRIVY_APP_ID = (import.meta.env.VITE_PRIVY_APP_ID as string | undefined)?.trim() ?? "";
/** Origins allowed in Privy's dashboard (comma separated). Elsewhere, like Vercel preview URLs, the wallet-adapter path is used. Empty: any. */
const PRIVY_ORIGINS = ((import.meta.env.VITE_PRIVY_ORIGINS as string | undefined) ?? "")
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);
const USE_PRIVY = !!PRIVY_APP_ID && (!PRIVY_ORIGINS.length || PRIVY_ORIGINS.includes(window.location.origin));

/** The connected wallet, whichever provider supplies it. */
export interface GtaWallet {
  publicKey: PublicKey | null;
  connecting: boolean;
  /** Signed in to Privy (even if no wallet is in hand yet). */
  loggedIn?: boolean;
  /** Logged in with email or social and holding a Privy embedded wallet. */
  embedded: boolean;
  /** Email or handle of a Privy user, when they logged in that way. */
  label: string | null;
  connect(): void;
  disconnect(): Promise<void>;
  /** Signs without sending, keeping signatures already on each transaction. Null when nothing can sign. */
  signAll: ((txs: Transaction[]) => Promise<Transaction[]>) | null;
  /** Opens Privy's wallet export (embedded wallets only). */
  exportKey: (() => void) | null;
}

const DISCONNECTED: GtaWallet = { publicKey: null, connecting: false, embedded: false, label: null, connect: () => {}, disconnect: async () => {}, signAll: null, exportKey: null };

const WalletCtx = createContext<GtaWallet>(DISCONNECTED);
export const useGtaWallet = () => useContext(WalletCtx);

/** One-transaction signer for lib/chain. */
export const signOne = (w: GtaWallet) => (w.signAll ? async (tx: Transaction) => (await w.signAll!([tx]))[0] : null);

export function Wallets({ children }: { children: ReactNode }) {
  return (
    <ConnectionProvider endpoint={RPC} config={{ commitment: "confirmed" }}>
      {USE_PRIVY ? <PrivyWallet appId={PRIVY_APP_ID}>{children}</PrivyWallet> : <AdapterWallet>{children}</AdapterWallet>}
    </ConnectionProvider>
  );
}

// ---------------------------------------------------------------- wallet-adapter

function AdapterWallet({ children }: { children: ReactNode }) {
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);
  return (
    <WalletProvider wallets={wallets} autoConnect>
      <WalletModalProvider>
        <AdapterBridge>{children}</AdapterBridge>
      </WalletModalProvider>
    </WalletProvider>
  );
}

function AdapterBridge({ children }: { children: ReactNode }) {
  const { publicKey, connecting, disconnect, signAllTransactions, signTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const value = useMemo<GtaWallet>(() => {
    let signAll: GtaWallet["signAll"] = null;
    if (publicKey && signAllTransactions) signAll = (txs) => signAllTransactions(txs);
    else if (publicKey && signTransaction) {
      signAll = async (txs) => {
        const out: Transaction[] = [];
        for (const tx of txs) out.push(await signTransaction(tx));
        return out;
      };
    }
    return { ...DISCONNECTED, publicKey, connecting, connect: () => setVisible(true), disconnect, signAll };
  }, [publicKey, connecting, disconnect, signAllTransactions, signTransaction, setVisible]);
  return <WalletCtx.Provider value={value}>{children}</WalletCtx.Provider>;
}

// ---------------------------------------------------------------- Privy

const PrivyBridge = import.meta.env.VITE_PRIVY_APP_ID ? lazy(() => import("./wallet-privy")) : null;

export interface PrivyReport {
  ready: boolean;
  wallet: GtaWallet;
}

const PRIVY_LOAD_MS = 20_000;

/** True when Privy left a session in this browser, so the user is probably still logged in. */
function hasPrivySession() {
  try {
    // Privy also writes analytics keys for anonymous visitors; only its login tokens mean a session.
    for (const k of ["privy:token", "privy:refresh_token", "privy:id_token"]) if (localStorage.getItem(k)) return true;
  } catch {}
  return false;
}
const unavailable = (why: string): GtaWallet => ({ ...DISCONNECTED, connect: () => window.alert(why) });
const LOAD_FAILED = "Login is unavailable right now. Please reload the page.";
const LOAD_SLOW = "Login could not load. Check your connection or browser extensions, then reload the page.";

class PrivyBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("[gtapad] login failed to load", error);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** The page renders at once; Privy loads beside it when the browser is idle (or on the first Connect click). */
function PrivyWallet({ appId, children }: { appId: string; children: ReactNode }) {
  const [report, setReport] = useState<PrivyReport | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const queued = useRef(false);
  const ready = !!report?.ready;
  // Privy's code is large. Returning users (a Privy session in storage) get it once the page is idle;
  // everyone else only when they click Log in, so first visits never pay for it while scrolling.
  const [mounted, setMounted] = useState(false);
  const [wanted] = useState(hasPrivySession);
  useEffect(() => {
    if (!wanted) return;
    const go = () => setMounted(true);
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(go, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(go, 2000);
    return () => clearTimeout(id);
  }, [wanted]);

  useEffect(() => {
    if (ready || !mounted) return;
    const t = setTimeout(() => setFailed((f) => f ?? LOAD_SLOW), PRIVY_LOAD_MS);
    return () => clearTimeout(t);
  }, [ready]);

  useEffect(() => {
    if (ready && queued.current) {
      queued.current = false;
      report!.wallet.connect();
    }
  }, [ready, report]);

  const onError = useCallback(() => setFailed(LOAD_FAILED), []);

  const value = useMemo<GtaWallet>(() => {
    if (report?.ready) return report.wallet;
    if (failed) return unavailable(failed);
    return {
      ...DISCONNECTED,
      connecting: mounted,
      connect: () => {
        queued.current = true;
        setMounted(true);
      },
    };
  }, [report, failed, mounted]);

  return (
    <WalletCtx.Provider value={value}>
      {children}
      <PrivyBoundary onError={onError}>
        <Suspense fallback={null}>{PrivyBridge && mounted && <PrivyBridge appId={appId} rpc={RPC} onReport={setReport} />}</Suspense>
      </PrivyBoundary>
    </WalletCtx.Provider>
  );
}

// ---------------------------------------------------------------- button

export function WalletButton() {
  const w = useGtaWallet();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (!w.publicKey) {
    // never disabled: a click while the login code loads is queued and opens once it's ready
    return (
      <button className="wallet-btn" onClick={w.connect}>
        {w.connecting ? "Connecting…" : w.loggedIn ? "Connect wallet" : "Log in"}
      </button>
    );
  }
  const addr = w.publicKey.toBase58();
  return (
    <div className="wallet-menu" ref={ref}>
      <button className="wallet-btn wallet-btn--on" onClick={() => setOpen((o) => !o)}>
        <span className="dot" /> {w.label ?? short(addr)}
      </button>
      {open && (
        <div className="wallet-menu__pop">
          <span className="wallet-menu__k">{w.embedded ? "Your GTApad wallet" : "Connected wallet"}</span>
          <button className="wallet-menu__addr" onClick={() => void navigator.clipboard?.writeText(addr)} title="Copy address">
            {short(addr, 6)} <small>copy</small>
          </button>
          {w.embedded && <p className="wallet-menu__hint">Send SOL and TTWO to this address to launch and trade.</p>}
          {w.exportKey && <button onClick={() => { setOpen(false); w.exportKey!(); }}>Export private key</button>}
          <a href={`https://solscan.io/account/${addr}`} target="_blank" rel="noreferrer">View on Solscan ↗</a>
          <button onClick={() => { setOpen(false); void w.disconnect(); }}>Log out</button>
        </div>
      )}
    </div>
  );
}
