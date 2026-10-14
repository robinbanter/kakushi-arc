// Server-only: runtime config for the browser. The deployment record is deployments/arc-<network>.json at the repo
// root (written by scripts/deploy.sh). KAKUSHI_NETWORK picks testnet (default) or mainnet; ARC_RPC_URL overrides the RPC
// (e.g. a local Arc Foundry fork); KAKUSHI_DEPLOYMENT_FILE (relative to the repo root) points at another record (e.g. deployments/arc-testnet.fork.json);
// KAKUSHI_RELAYER_URL is the relayer the app proxies /api/relayer/* to.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chainByNetwork, currentNetwork, rpcUrl, type ArcNetwork } from "@kakushi/config";
import { parseDeployment, type ArcDeployment } from "@kakushi/config/deployments";

export interface RuntimeConfig {
  network: ArcNetwork;
  chainId: number;
  chainName: string;
  explorer: string;
  usdc: `0x${string}`;
  deployment: ArcDeployment | null;
  /** the relayer is reachable through /api/relayer when configured */
  relayer: boolean;
  /** public RPC for the wallet's add-chain prompt (never the server's private RPC override) */
  publicRpc: string;
  error?: string;
}

export function network(): ArcNetwork {
  return currentNetwork();
}

// scripts/sync-deployments.mjs copies the repo's deployments/arc-<network>.json into packages/app/deployments
// before dev/build, so a hosted app (deployed from this folder) reads the record next to itself.
const ROOT = /*turbopackIgnore: true*/ process.cwd();

export function loadRuntimeDeployment(n: ArcNetwork = network()): ArcDeployment | null {
  const candidates = process.env.KAKUSHI_DEPLOYMENT_FILE
    ? [resolve(/*turbopackIgnore: true*/ ROOT, "../..", process.env.KAKUSHI_DEPLOYMENT_FILE)]
    : [resolve(/*turbopackIgnore: true*/ ROOT, "deployments", `arc-${n}.json`), resolve(/*turbopackIgnore: true*/ ROOT, "../../deployments", `arc-${n}.json`)];
  const file = candidates.find((f) => existsSync(f));
  if (!file) return null;
  return parseDeployment(JSON.parse(readFileSync(file, "utf8")));
}

export function relayerBase(): string | null {
  return process.env.KAKUSHI_RELAYER_URL ?? loadRuntimeDeployment()?.relayerUrl ?? null;
}

export function publicRuntimeConfig(): RuntimeConfig {
  const n = network();
  const c = chainByNetwork(n);
  let deployment: ArcDeployment | null = null;
  let error: string | undefined;
  try {
    deployment = loadRuntimeDeployment(n);
  } catch (e) {
    error = (e as Error).message;
  }
  return {
    network: n,
    chainId: c.chainId,
    chainName: c.name,
    explorer: c.explorer,
    usdc: c.usdc,
    deployment,
    relayer: Boolean(process.env.RELAYER_KEY || relayerBase()),
    publicRpc: c.publicRpc,
    error: deployment ? error : (error ?? `Kakushi is not deployed on ${c.name} yet.`),
  };
}

/** RPC URL the proxy forwards to (ARC_RPC_URL, else the public endpoint). */
export function serverRpc(): string {
  return rpcUrl(chainByNetwork(network()));
}
