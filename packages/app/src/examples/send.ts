import { planStealthSend, readStealthMetaAddress } from "@kakushi/sdk";
import type { Address } from "viem";
import { chain, deployment, publicClient, connectWallet } from "./arc";

export async function payRegisteredRecipient(recipient: Address) {
  const wallet = await connectWallet();
  await wallet.switchChain({ id: chain.id }); // Add Arc testnet to the wallet first.
  const meta = await readStealthMetaAddress(
    publicClient, deployment.stealthRegistry, recipient,
  );
  if (!meta) throw new Error("Recipient must enable private receiving first");
  const plan = planStealthSend({
    metaAddress: meta, amount: 10_000n, // 0.01 USDC; SDK uses 6-decimal base units.
    usdc: deployment.usdc, stealthPay: deployment.stealthPay,
  });
  const approveHash = await wallet.sendTransaction(plan.approve);
  const approval = await publicClient.waitForTransactionReceipt({ hash: approveHash });
  if (approval.status !== "success") throw new Error("USDC approval reverted");
  const hash = await wallet.sendTransaction(plan.pay);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("Payment reverted");
  return { hash, stealthAddress: plan.stealth.stealthAddress };
}
