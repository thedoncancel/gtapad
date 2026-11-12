/**
 * Privy login, loaded only when VITE_PRIVY_APP_ID is set (see ./wallet). Users log in with a Solana wallet, email,
 * Google or X; anyone without a wallet gets a Privy embedded Solana wallet. Renders only Privy's modal and reports
 * the wallet to ./wallet through `onReport`.
 */
import { useEffect, useMemo, useState } from "react";
import { PrivyProvider, usePrivy, type PrivyClientConfig } from "@privy-io/react-auth";
import { toSolanaWalletConnectors, useCreateWallet, useExportWallet, useWallets } from "@privy-io/react-auth/solana";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import { PublicKey, Transaction } from "@solana/web3.js";
import { BRAND } from "../shared/config";
import type { PrivyReport } from "./wallet";

const CHAIN = "solana:mainnet" as const;

function config(rpc: string): PrivyClientConfig {
  return {
    appearance: {
      theme: "dark",
      accentColor: "#FF2E88",
      logo: `${window.location.origin}/brand/plate.png`,
      landingHeader: `Log in to ${BRAND.name}`,
      loginMessage: "Launch and trade coins paired to TTWO.",
      walletChainType: "solana-only",
      showWalletLoginFirst: false,
      walletList: ["detected_solana_wallets", "phantom", "solflare", "backpack"],
    },
    loginMethods: ["email", "google", "twitter", "wallet"],
    externalWallets: { solana: { connectors: toSolanaWalletConnectors() } },
    embeddedWallets: {
      ethereum: { createOnLogin: "off" },
      solana: { createOnLogin: "users-without-wallets" },
    },
    solana: {
      rpcs: {
        [CHAIN]: {
          rpc: createSolanaRpc(rpc),
          rpcSubscriptions: createSolanaRpcSubscriptions(rpc.replace(/^http/, "ws")),
        },
      },
    },
  };
}

export default function PrivyBridge({ appId, rpc, onReport }: { appId: string; rpc: string; onReport: (r: PrivyReport) => void }) {
  const cfg = useMemo(() => config(rpc), [rpc]);
  return (
    <PrivyProvider appId={appId} config={cfg}>
      <Bridge onReport={onReport} />
    </PrivyProvider>
  );
}

const sameBytes = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * The wallet's signed copy of `tx`, keeping every signature `tx` already carried. If other keys signed first,
 * the wallet must not have changed the message, or those signatures would be invalid.
 */
function merge(tx: Transaction, signedBytes: Uint8Array): Transaction {
  const signed = Transaction.from(signedBytes);
  const presigned = tx.signatures.filter((s) => s.signature);
  const changed =
    !signed.feePayer ||
    !tx.feePayer ||
    !signed.feePayer.equals(tx.feePayer) ||
    (presigned.length > 0 && (signed.recentBlockhash !== tx.recentBlockhash || !sameBytes(signed.serializeMessage(), tx.serializeMessage())));
  if (changed) throw new Error("The wallet changed the transaction while signing, so it can't be sent. Please try again.");
  for (const s of presigned) {
    const slot = signed.signatures.find((x) => x.publicKey.equals(s.publicKey));
    if (slot && !slot.signature) slot.signature = s.signature;
  }
  return signed;
}

function Bridge({ onReport }: { onReport: (r: PrivyReport) => void }) {
  const { ready, authenticated, user, login, logout, connectWallet } = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const { exportWallet } = useExportWallet();

  // The user's own Solana wallets, first verified one first.
  const linked = useMemo(() => {
    const out: string[] = [];
    if (user?.wallet?.chainType === "solana") out.push(user.wallet.address);
    for (const a of user?.linkedAccounts ?? []) {
      if (a.type === "wallet" && a.chainType === "solana" && !out.includes(a.address)) out.push(a.address);
    }
    return out;
  }, [user]);

  // Privy flips to "authenticated" a moment before the wallet shows up in useWallets. Until it does (or 8s pass),
  // report "connecting" so the site doesn't fall back to a Log in button that would ask the user again.
  const [settling, setSettling] = useState(false);
  useEffect(() => {
    if (!authenticated) return setSettling(false);
    setSettling(true);
    const t = setTimeout(() => setSettling(false), 8000);
    return () => clearTimeout(t);
  }, [authenticated]);

  const wallet = useMemo(() => {
    if (!authenticated) return null;
    return wallets.find((x) => linked.includes(x.address)) ?? wallets[0] ?? null;
  }, [authenticated, linked, wallets]);

  const address = wallet?.address ?? null;
  const publicKey = useMemo(() => (address ? new PublicKey(address) : null), [address]);
  const embedded = !!wallet && (user?.linkedAccounts ?? []).some((a) => a.type === "wallet" && a.address === wallet.address && a.walletClientType === "privy");
  const label = user?.email?.address ?? (user?.twitter?.username ? `@${user.twitter.username}` : null) ?? user?.google?.email ?? null;

  useEffect(() => {
    onReport({
      ready,
      wallet: {
        publicKey,
        loggedIn: authenticated,
        embedded,
        label,
        connecting: !ready || (authenticated && (!walletsReady || (!wallet && settling))),
        connect() {
          if (!ready) return;
          if (!authenticated) return login();
          if (!linked.length) void createWallet().catch((e) => console.error("[gtapad] wallet creation failed", e));
          else connectWallet({ walletChainType: "solana-only" });
        },
        disconnect: async () => {
          await Promise.all(wallets.map((w) => w.disconnect().catch(() => {})));
          await logout();
        },
        exportKey: embedded && address ? () => void exportWallet({ address }).catch(() => {}) : null,
        signAll:
          wallet && publicKey
            ? async (txs) => {
                const inputs = txs.map((tx) => ({
                  transaction: new Uint8Array(tx.serialize({ requireAllSignatures: false, verifySignatures: false })),
                  chain: CHAIN,
                }));
                const res = await wallet.signTransaction(...inputs);
                const out = Array.isArray(res) ? res : [res];
                if (out.length !== txs.length) throw new Error("The wallet didn't sign every transaction. Please try again.");
                return out.map((o, i) => merge(txs[i], o.signedTransaction));
              }
            : null,
      },
    });
  }, [onReport, wallet, wallets, publicKey, address, embedded, label, ready, authenticated, walletsReady, settling, linked, login, logout, connectWallet, createWallet, exportWallet]);

  return null;
}
