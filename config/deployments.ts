// Deployment records written by packages/contracts/script/Deploy.s.sol to deployments/arc-<network>.json
// (repo root). Node only (reads the file system); browsers get the same object from /api/config.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { currentNetwork, type ArcNetwork } from "./chains.ts";

export interface PoolDeployment {
  address: `0x${string}`;
  /** USDC base units, decimal string (6 decimals) */
  denomination: string;
  /** the pool never accepts more notes than this (beta guard rail) */
  maxDeposits: number;
  decimals: number;
}

export interface ArcDeployment {
  network: ArcNetwork;
  chainId: number;
  deployer: `0x${string}`;
  deployBlock: number;
  usdc: `0x${string}`;
  stealthRegistry: `0x${string}`;
  stealthAnnouncer: `0x${string}`;
  stealthPay: `0x${string}`;
  shieldedVerifier: `0x${string}`;
  /** keyed by label: "USDC-1", "USDC-10", "USDC-100" */
  pools: Record<string, PoolDeployment>;
  /** public URL of the relayer serving this deployment (optional) */
  relayerUrl?: string;
}

const here = dirname(fileURLToPath(import.meta.url));
export const DEPLOYMENTS_DIR = join(here, "..", "deployments");

export function deploymentPath(network: ArcNetwork, dir: string = DEPLOYMENTS_DIR): string {
  return join(dir, `arc-${network}.json`);
}

const isAddr = (x: unknown): x is `0x${string}` => typeof x === "string" && /^0x[0-9a-fA-F]{40}$/.test(x);

/** Parse and validate a deployment record. Throws with the offending field. */
export function parseDeployment(raw: unknown): ArcDeployment {
  const r = raw as Record<string, unknown> | null;
  if (!r || typeof r !== "object") throw new Error("deployment record must be an object");
  for (const k of ["deployer", "usdc", "stealthRegistry", "stealthAnnouncer", "stealthPay", "shieldedVerifier"]) {
    if (!isAddr(r[k])) throw new Error(`deployment record: ${k} is not an address`);
  }
  if (r.network !== "testnet" && r.network !== "mainnet") throw new Error("deployment record: network must be testnet or mainnet");
  const pools: Record<string, PoolDeployment> = {};
  for (const [label, v] of Object.entries((r.pools ?? {}) as Record<string, Record<string, unknown>>)) {
    if (!isAddr(v?.address) || !/^[0-9]+$/.test(String(v.denomination)) || String(v.denomination) === "0") throw new Error(`deployment record: pool ${label} is malformed`);
    pools[label] = { address: v.address, denomination: String(v.denomination), maxDeposits: Number(v.maxDeposits ?? 0), decimals: Number(v.decimals ?? 6) };
  }
  return {
    network: r.network,
    chainId: Number(r.chainId),
    deployer: r.deployer as `0x${string}`,
    deployBlock: Number(r.deployBlock ?? 0),
    usdc: r.usdc as `0x${string}`,
    stealthRegistry: r.stealthRegistry as `0x${string}`,
    stealthAnnouncer: r.stealthAnnouncer as `0x${string}`,
    stealthPay: r.stealthPay as `0x${string}`,
    shieldedVerifier: r.shieldedVerifier as `0x${string}`,
    pools,
    ...(typeof r.relayerUrl === "string" ? { relayerUrl: r.relayerUrl } : {}),
  };
}

/** The record for `network`, or null when nothing is deployed there yet. */
export function loadDeployment(network: ArcNetwork = currentNetwork(), dir: string = DEPLOYMENTS_DIR): ArcDeployment | null {
  const p = deploymentPath(network, dir);
  if (!existsSync(p)) return null;
  return parseDeployment(JSON.parse(readFileSync(p, "utf8")));
}
