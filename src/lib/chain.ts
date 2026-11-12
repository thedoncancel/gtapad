/**
 * pump.fun transactions, all quoted in TTWO. The pump SDK is loaded on demand so the first paint doesn't carry it.
 * Coins made with create_v2 use a Token-2022 mint; TTWO is Token-2022 too.
 */
import { ComputeBudgetProgram, Connection, Keypair, PublicKey, Transaction, type TransactionInstruction } from "@solana/web3.js";
import BN from "bn.js";
import { COIN_DECIMALS, PAIR, TOKEN_2022 } from "../../shared/config";

const pumpSdk = () => import("@pump-fun/pump-sdk");
const QUOTE = new PublicKey(PAIR.mint);
const T22 = new PublicKey(TOKEN_2022);

export type SignTx = (tx: Transaction) => Promise<Transaction>;

const toRaw = (ui: number, decimals: number) => new BN(Math.floor(ui * 10 ** decimals).toString());
const fromRaw = (raw: BN, decimals: number) => Number(raw.toString()) / 10 ** decimals;

async function send(conn: Connection, user: PublicKey, sign: SignTx, ixs: TransactionInstruction[], units: number, extra: Keypair[] = []) {
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
  const tx = new Transaction({ feePayer: user, blockhash, lastValidBlockHeight }).add(
    ComputeBudgetProgram.setComputeUnitLimit({ units }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200_000 }),
    ...ixs,
  );
  const signed = await sign(tx);
  if (extra.length) signed.partialSign(...extra);
  const sig = await conn.sendRawTransaction(signed.serialize(), { skipPreflight: false, maxRetries: 3 });
  const res = await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
  if (res.value.err) throw new Error("The transaction failed on chain.");
  return sig;
}

/** Creates the coin on pump.fun paired with TTWO, with an optional first buy by the creator. */
export async function launchCoin(p: { conn: Connection; user: PublicKey; sign: SignTx; name: string; symbol: string; uri: string; devBuy: number }) {
  const pump = await pumpSdk();
  const sdk = new pump.OnlinePumpSdk(p.conn);
  const mint = Keypair.generate();
  let ixs: TransactionInstruction[];
  if (p.devBuy > 0) {
    const [global, feeConfig, quoteControl] = await Promise.all([sdk.fetchGlobal(), sdk.fetchFeeConfig(), sdk.fetchQuoteControl()]);
    const quoteAmount = toRaw(p.devBuy, PAIR.decimals);
    const amount = pump.getBuyTokenAmountFromSolAmount({
      global, feeConfig, mintSupply: null, bondingCurve: null,
      amount: quoteAmount.muln(99).divn(100), quoteMint: QUOTE, quoteControl,
    });
    ixs = await pump.PUMP_SDK.createV2AndBuyV2Instructions({
      global, mint: mint.publicKey, name: p.name, symbol: p.symbol, uri: p.uri,
      creator: p.user, user: p.user, amount, quoteAmount, mayhemMode: false,
      quoteMint: QUOTE, quoteTokenProgram: T22,
    });
  } else {
    ixs = [await pump.PUMP_SDK.createV2Instruction({
      mint: mint.publicKey, name: p.name, symbol: p.symbol, uri: p.uri,
      creator: p.user, user: p.user, mayhemMode: false, quoteMint: QUOTE, quoteTokenProgram: T22,
    })];
  }
  const sig = await send(p.conn, p.user, p.sign, ixs, p.devBuy > 0 ? 550_000 : 350_000, [mint]);
  return { mint: mint.publicKey.toBase58(), sig };
}

async function tradeState(conn: Connection, mint: PublicKey, user: PublicKey) {
  const pump = await pumpSdk();
  const sdk = new pump.OnlinePumpSdk(conn);
  const [global, feeConfig, buy] = await Promise.all([sdk.fetchGlobal(), sdk.fetchFeeConfig(), sdk.fetchBuyState(mint, user, T22, QUOTE)]);
  return { pump, global, feeConfig, buy };
}

/** Expected coins out for a TTWO amount in, and TTWO out for coins in. */
export async function quote(conn: Connection, mintStr: string, user: PublicKey | null, side: "buy" | "sell", ui: number) {
  if (!(ui > 0)) return 0;
  const mint = new PublicKey(mintStr);
  const pump = await pumpSdk();
  const sdk = new pump.OnlinePumpSdk(conn);
  const [global, feeConfig, curve] = await Promise.all([sdk.fetchGlobal(), sdk.fetchFeeConfig(), sdk.fetchBondingCurve(mint)]);
  void user;
  if (side === "buy") {
    const out = pump.getBuyTokenAmountFromSolAmount({ global, feeConfig, mintSupply: curve.tokenTotalSupply, bondingCurve: curve, amount: toRaw(ui, PAIR.decimals), quoteMint: QUOTE });
    return fromRaw(out, COIN_DECIMALS);
  }
  const out = pump.getSellSolAmountFromTokenAmount({ global, feeConfig, mintSupply: curve.tokenTotalSupply, bondingCurve: curve, amount: toRaw(ui, COIN_DECIMALS) });
  return fromRaw(out, PAIR.decimals);
}

export async function buy(p: { conn: Connection; user: PublicKey; sign: SignTx; mint: string; quoteIn: number; slippagePct: number }) {
  const mint = new PublicKey(p.mint);
  const { pump, global, feeConfig, buy: st } = await tradeState(p.conn, mint, p.user);
  const quoteAmount = toRaw(p.quoteIn, PAIR.decimals);
  const amount = pump.getBuyTokenAmountFromSolAmount({
    global, feeConfig, mintSupply: st.bondingCurve.tokenTotalSupply, bondingCurve: st.bondingCurve,
    amount: quoteAmount, quoteMint: QUOTE, quoteTransferFee: st.quoteTransferFee,
  });
  const ixs = await pump.PUMP_SDK.buyV2Instructions({
    global, bondingCurveAccountInfo: st.bondingCurveAccountInfo, bondingCurve: st.bondingCurve,
    associatedUserAccountInfo: st.associatedUserAccountInfo, mint, user: p.user, amount, quoteAmount,
    slippage: p.slippagePct, tokenProgram: T22, quoteTokenProgram: T22,
  });
  return send(p.conn, p.user, p.sign, ixs, 300_000);
}

export async function sell(p: { conn: Connection; user: PublicKey; sign: SignTx; mint: string; coinIn: number; slippagePct: number }) {
  const mint = new PublicKey(p.mint);
  const pump = await pumpSdk();
  const sdk = new pump.OnlinePumpSdk(p.conn);
  const [global, feeConfig, st] = await Promise.all([sdk.fetchGlobal(), sdk.fetchFeeConfig(), sdk.fetchSellState(mint, p.user, T22, QUOTE)]);
  const amount = toRaw(p.coinIn, COIN_DECIMALS);
  const quoteAmount = pump.getSellSolAmountFromTokenAmount({
    global, feeConfig, mintSupply: st.bondingCurve.tokenTotalSupply, bondingCurve: st.bondingCurve,
    amount, quoteTransferFee: st.quoteTransferFee,
  });
  const ixs = await pump.PUMP_SDK.sellV2Instructions({
    global, bondingCurveAccountInfo: st.bondingCurveAccountInfo, bondingCurve: st.bondingCurve,
    mint, user: p.user, amount, quoteAmount, slippage: p.slippagePct, tokenProgram: T22, quoteTokenProgram: T22,
  });
  return send(p.conn, p.user, p.sign, ixs, 300_000);
}

/** Whole-token balance of a mint held by owner (0 when there's no account). */
export async function balance(conn: Connection, owner: PublicKey, mint: string) {
  const r = await conn.getParsedTokenAccountsByOwner(owner, { mint: new PublicKey(mint) });
  return r.value.reduce((s, a) => s + (a.account.data.parsed?.info?.tokenAmount?.uiAmount ?? 0), 0);
}
