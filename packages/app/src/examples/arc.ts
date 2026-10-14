import { arcChain } from "@kakushi/sdk";
import { createPublicClient, createWalletClient, custom, http, type EIP1193Provider } from "viem";

export const chain = arcChain("testnet");
export const deployment = {
  stealthRegistry: "0xc79A4Aa7396c3e67ee461C3A92fFc4258e49361B",
  stealthPay: "0x234384Adcbcbaf68145A42f13b0E666444961C0e",
  usdc: "0x3600000000000000000000000000000000000000",
} as const;
export const publicClient = createPublicClient({ chain, transport: http() });

// Call from a user action. The widget asks the wallet to switch to Arc testnet.
export async function connectWallet() {
  const provider = (window as unknown as { ethereum?: EIP1193Provider }).ethereum;
  if (!provider) throw new Error("Install a browser wallet first");
  const wallet = createWalletClient({ chain, transport: custom(provider) });
  const [account] = await wallet.requestAddresses();
  if (!account) throw new Error("No wallet account selected");
  return createWalletClient({ account, chain, transport: custom(provider) });
}
