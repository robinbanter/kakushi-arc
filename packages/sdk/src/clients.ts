import { createPublicClient, createWalletClient, http, type Account, type Hex, type PublicClient, type WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { type ArcNetwork, chainByNetwork, currentNetwork, rpcUrl } from "@kakushi/config";
import { viemChain } from "./chains.ts";

const cache = new Map<string, PublicClient>();

export function publicClient(network: ArcNetwork = currentNetwork(), rpc?: string): PublicClient {
  const c = chainByNetwork(network);
  const url = rpc ?? rpcUrl(c);
  const id = `${network}:${url}`;
  let pc = cache.get(id);
  if (!pc) {
    pc = createPublicClient({ chain: viemChain(c, url), transport: http(url, { retryCount: 3, retryDelay: 250 }) }) as PublicClient;
    cache.set(id, pc);
  }
  return pc;
}

export function walletClient(account: Account | Hex, network: ArcNetwork = currentNetwork(), rpc?: string): WalletClient {
  const c = chainByNetwork(network);
  const url = rpc ?? rpcUrl(c);
  const acct = typeof account === "string" ? privateKeyToAccount(account) : account;
  return createWalletClient({ account: acct, chain: viemChain(c, url), transport: http(url) });
}
