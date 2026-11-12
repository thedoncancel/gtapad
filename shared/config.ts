/** Brand and chain constants, shared by the site and the /api routes. Rename the project here. */
export const BRAND = {
  name: "GTApad",
  short: "GTA",
  suffix: "pad",
  tagline: "Launch the loot.",
  /** Set to the project X profile URL once it exists. */
  x: "",
  city: "Vice City",
};

/** Backpack Securities' Take-Two Interactive token: the pair every coin here trades against. Token-2022, 6 decimals. */
export const PAIR = {
  mint: "TTWofwAge91oFhZs7kpQdyrVRkmevgM88xijGvQFbKo",
  symbol: "TTWO",
  decimals: 6,
  tokenProgram: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
};

export const PUMP = {
  program: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
  amm: "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
};

/** pump.fun coins: 1B supply, 6 decimals, Token-2022 mint when created with create_v2. */
export const COIN_DECIMALS = 6;
export const COIN_SUPPLY = 1_000_000_000;
export const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

export const links = {
  solscanToken: (m: string) => `https://solscan.io/token/${m}`,
  solscanTx: (s: string) => `https://solscan.io/tx/${s}`,
  pump: (m: string) => `https://pump.fun/coin/${m}`,
  getPair: `https://jup.ag/swap/SOL-${PAIR.mint}`,
};

/** A launch as the registry stores it. */
export interface LaunchRecord {
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  image: string;
  description: string;
  item: string;
  creator: string;
  createdAt: number;
  x?: string;
  telegram?: string;
  website?: string;
}

/** A launch with its live bonding-curve state. Prices are per whole coin. */
export interface Launch extends LaunchRecord {
  progress: number;
  complete: boolean;
  priceQuote: number;
  priceUsd: number | null;
  mcapUsd: number | null;
  raisedQuote: number;
}

export interface LaunchesResponse {
  launches: Launch[];
  pairUsd: number | null;
  stats: { spawns: number; onCurve: number; graduated: number; raisedQuote: number };
}
