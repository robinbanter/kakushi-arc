// The Arc chain registry: Arc mainnet and Arc testnet, with the Circle contracts Kakushi touches.
// Everything that needs a chain id, an RPC, an explorer or a USDC address reads it from here.
//
// Arc facts that shape the product:
//  - gas is paid in USDC. The chain's native balance has 18 decimals; the USDC ERC-20 at 0x3600..0000 shows the SAME
//    balance with 6 decimals (1 USDC = 1e6 token units = 1e18 native wei).
//  - there is no other gas token, so a stealth address that only ever received USDC can still move it.

export type ArcNetwork = "testnet" | "mainnet";

export interface ArcChain {
  network: ArcNetwork;
  chainId: number;
  name: string;
  /** public RPC; override with ARC_RPC_URL (or <CHAIN>_RPC_URL via rpcUrl()) */
  publicRpc: string;
  explorer: string;
  /** Circle USDC ERC-20 interface (6 decimals); the same address on both networks */
  usdc: `0x${string}`;
  eurc: `0x${string}`;
  /** CCTP V2 (Arc is domain 26): used for "fund from another chain" */
  cctp: { domain: number; tokenMessenger: `0x${string}`; messageTransmitter: `0x${string}` };
  gatewayWallet: `0x${string}`;
  /** sub-second deterministic finality */
  blockTimeMs: number;
}

export const USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as const;
export const USDC_DECIMALS = 6;
/** native-coin accounting on Arc is 18 decimals; the ERC-20 view is 6. wei = token units * 1e12 */
export const NATIVE_PER_USDC_UNIT = 10n ** 12n;

export const ARC: Record<ArcNetwork, ArcChain> = {
  testnet: {
    network: "testnet",
    chainId: 5042002,
    name: "Arc Testnet",
    publicRpc: "https://rpc.testnet.arc.io",
    explorer: "https://explorer.testnet.arc.io",
    usdc: USDC_ADDRESS,
    eurc: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
    cctp: { domain: 26, tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA", messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275" },
    gatewayWallet: "0x0077777d7EBA4688BDeF3E311b846F25870A19B9",
    blockTimeMs: 500,
  },
  mainnet: {
    network: "mainnet",
    chainId: 5042,
    name: "Arc",
    publicRpc: "https://rpc.mainnet.arc.io",
    explorer: "https://explorer.arc.io",
    usdc: USDC_ADDRESS,
    eurc: "0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1",
    cctp: { domain: 26, tokenMessenger: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d", messageTransmitter: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64" },
    gatewayWallet: "0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE",
    blockTimeMs: 500,
  },
};

export const ARC_LIST: ArcChain[] = [ARC.testnet, ARC.mainnet];

/** The network a process runs against: KAKUSHI_NETWORK (testnet | mainnet), default testnet. */
export function currentNetwork(env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {}): ArcNetwork {
  const v = env.KAKUSHI_NETWORK ?? env.NEXT_PUBLIC_KAKUSHI_NETWORK;
  if (v && v !== "testnet" && v !== "mainnet") throw new Error("KAKUSHI_NETWORK must be testnet or mainnet");
  return (v as ArcNetwork | undefined) ?? "testnet";
}

export function chainByNetwork(n: ArcNetwork = currentNetwork()): ArcChain {
  return ARC[n];
}

export function chainById(chainId: number): ArcChain {
  const c = ARC_LIST.find((x) => x.chainId === chainId);
  if (!c) throw new Error(`unknown Arc chain id ${chainId} (Kakushi runs on 5042 and 5042002)`);
  return c;
}

/** RPC for a network: ARC_RPC_URL (e.g. a local Arc Foundry fork), else the public endpoint. */
export function rpcUrl(c: ArcChain = chainByNetwork(), env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {}): string {
  return env.ARC_RPC_URL || c.publicRpc;
}

export function explorerTx(c: ArcChain, hash: string): string {
  return `${c.explorer}/tx/${hash}`;
}

export function explorerAddress(c: ArcChain, address: string): string {
  return `${c.explorer}/address/${address}`;
}

/** USDC base units (6 decimals) to a display string: 12500000n -> "12.5". */
export function formatUsdc(units: bigint, maxDecimals = 6): string {
  const neg = units < 0n;
  const v = neg ? -units : units;
  const whole = v / 1_000_000n;
  let frac = (v % 1_000_000n).toString().padStart(6, "0").slice(0, maxDecimals).replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole.toString()}${frac ? `.${frac}` : ""}`;
}

/** "12.5" -> 12500000n. Throws on more than 6 decimals. */
export function parseUsdc(s: string): bigint {
  const m = /^(\d+)(?:\.(\d{0,6}))?$/.exec(s.trim());
  if (!m) throw new Error(`not a USDC amount: ${s}`);
  return BigInt(m[1]!) * 1_000_000n + BigInt((m[2] ?? "").padEnd(6, "0"));
}

/** Native wei (18-dec accounting, what gas costs are quoted in) to USDC base units, rounded UP. */
export function nativeWeiToUsdcUnits(wei: bigint): bigint {
  return (wei + NATIVE_PER_USDC_UNIT - 1n) / NATIVE_PER_USDC_UNIT;
}
