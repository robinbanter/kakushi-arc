import { arcChain } from "@kakushi/sdk";
import { createPublicClient, createWalletClient, custom, http, type EIP1193Provider } from "viem";

import record from "../../../../deployments/arc-mainnet.json";
const network = "mainnet";
export const chain = arcChain(network);
export const deployment = {
  stealthRegistry: record.stealthRegistry as `0x${string}`,
  stealthPay: record.stealthPay as `0x${string}`,
  usdc: record.usdc as `0x${string}`,
};
export const publicClient = createPublicClient({ chain, transport: http() });

// Call from a user action. The widget asks the wallet to switch to the selected Arc network.
export async function connectWallet() {
  const provider = (window as unknown as { ethereum?: EIP1193Provider }).ethereum;
  if (!provider) throw new Error("Install a browser wallet first");
  const wallet = createWalletClient({ chain, transport: custom(provider) });
  const [account] = await wallet.requestAddresses();
  if (!account) throw new Error("No wallet account selected");
  return createWalletClient({ account, chain, transport: custom(provider) });
}

// Shared props for the three-line React integration.
export const checkoutConfig = { chain, deployment, publicClient, walletClient: connectWallet };
