import { defineChain, type Chain } from "viem";
import { type ArcChain, type ArcNetwork, chainByNetwork, currentNetwork, rpcUrl } from "@kakushi/config";

/** viem chain for Arc. Gas is USDC: the native currency is USDC with 18-decimal accounting. */
export function viemChain(c: ArcChain = chainByNetwork(), rpc?: string): Chain {
  const url = rpc ?? rpcUrl(c);
  return defineChain({
    id: c.chainId,
    name: c.name,
    nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
    rpcUrls: { default: { http: [url] } },
    blockExplorers: { default: { name: "Arc Explorer", url: c.explorer } },
    blockTime: c.blockTimeMs,
  });
}

export function arcChain(network: ArcNetwork = currentNetwork(), rpc?: string): Chain {
  return viemChain(chainByNetwork(network), rpc);
}

export function errText(e: unknown): string {
  const x = e as { shortMessage?: string; details?: string; message?: string; cause?: { details?: string; shortMessage?: string } };
  const base = x.shortMessage ?? x.message?.split("\n")[0] ?? String(e);
  const det = x.details ?? x.cause?.details ?? x.cause?.shortMessage;
  return det && !base.includes(det) ? `${base}: ${det}` : base;
}
