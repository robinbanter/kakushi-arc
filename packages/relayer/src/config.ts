// Relayer configuration from the environment.
//   RELAYER_KEY      0x… private key the relayer signs withdrawals with (never logged). It needs a little USDC for
//                    gas: on Arc gas is USDC, and the relayer is repaid in USDC out of each withdrawn note.
//   RELAYER_KEY_FILE alternatively, a file containing RELAYER_KEY=0x… (or just the key)
//   KAKUSHI_NETWORK  testnet | mainnet (default testnet); picks deployments/arc-<network>.json for the pool list
//   ARC_RPC_URL      RPC override (default: the public Arc endpoint; a local Arc Foundry fork works too)
//   RELAYER_PORT     HTTP port (default 3715)
//   RELAYER_HOST     bind address (default 127.0.0.1; put a reverse proxy in front)
//   RELAYER_MIN_FEE  floor for every pool's fee, USDC base units (default 10000 = 0.01 USDC)
//   RELAYER_MAX_FEE_BPS  refuse pools whose quoted fee exceeds this share of the denomination (default 3000 = 30%)
//   RELAYER_QUOTE_GAS    gas assumed for one withdrawal when quoting (default 7000000; the real figure is measured per relay)
//   RELAYER_ALLOW_ORIGIN CORS origin for browsers (default *)
import { readFileSync } from "node:fs";
import { type Hex, getAddress } from "viem";
import { type LocalAccount, privateKeyToAccount } from "viem/accounts";
import { type ArcNetwork, currentNetwork } from "@kakushi/config";
import { type ArcDeployment, loadDeployment } from "@kakushi/config/deployments";

export interface PoolConfig {
  pool: Hex;
  /** USDC base units */
  denomination: bigint;
  label: string;
}

export interface RelayerConfig {
  port: number;
  host: string;
  network: ArcNetwork;
  chainId: number;
  rpc?: string;
  account: LocalAccount;
  pools: PoolConfig[];
  minFee: bigint;
  maxFeeBps: bigint;
  quoteGas: bigint;
  allowOrigin: string;
}

export function poolsOf(d: ArcDeployment): PoolConfig[] {
  const pools = Object.entries(d.pools).map(([label, p]) => ({ label, pool: getAddress(p.address), denomination: BigInt(p.denomination) }));
  if (pools.length === 0) throw new Error("the deployment record lists no pools");
  return pools;
}

function readKey(env: Record<string, string | undefined>): string | undefined {
  if (env.RELAYER_KEY) return env.RELAYER_KEY;
  if (!env.RELAYER_KEY_FILE) return undefined;
  const text = readFileSync(env.RELAYER_KEY_FILE, "utf8");
  return /RELAYER_KEY\s*=\s*(0x[0-9a-fA-F]{64})/.exec(text)?.[1] ?? /^\s*(0x[0-9a-fA-F]{64})\s*$/m.exec(text)?.[1];
}

const uintEnv = (v: string | undefined, d: bigint, name: string): bigint => {
  if (v === undefined || v === "") return d;
  if (!/^\d+$/.test(v)) throw new Error(`${name} must be a non-negative integer`);
  return BigInt(v);
};

export function loadRelayerConfig(env: Record<string, string | undefined> = process.env): RelayerConfig {
  const key = readKey(env);
  if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) throw new Error("set RELAYER_KEY (or RELAYER_KEY_FILE) to a 0x-prefixed 32-byte private key");
  const port = Number(env.RELAYER_PORT ?? "3715");
  if (!Number.isInteger(port) || port <= 0 || port > 65535) throw new Error("RELAYER_PORT must be a TCP port");
  const network = currentNetwork(env);
  const d = loadDeployment(network);
  if (!d) throw new Error(`no deployments/arc-${network}.json: deploy first (pnpm deploy:${network})`);
  return {
    port,
    host: env.RELAYER_HOST ?? "127.0.0.1",
    network,
    chainId: d.chainId,
    ...(env.ARC_RPC_URL ? { rpc: env.ARC_RPC_URL } : {}),
    account: privateKeyToAccount(key as Hex),
    pools: poolsOf(d),
    minFee: uintEnv(env.RELAYER_MIN_FEE, 10_000n, "RELAYER_MIN_FEE"),
    maxFeeBps: uintEnv(env.RELAYER_MAX_FEE_BPS, 3000n, "RELAYER_MAX_FEE_BPS"),
    quoteGas: uintEnv(env.RELAYER_QUOTE_GAS, 7_000_000n, "RELAYER_QUOTE_GAS"),
    allowOrigin: env.RELAYER_ALLOW_ORIGIN ?? "*",
  };
}
