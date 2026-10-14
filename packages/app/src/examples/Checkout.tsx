"use client";

import { KakushiPay } from "@kakushi/widget";
import { chain, deployment, publicClient, connectWallet } from "./arc";

// Pass a registered recipient wallet or their st:eth: stealth meta-address.
export function Checkout({ to }: { to: string }) {
  return <KakushiPay
    to={to}
    amount="0.01"
    chain={chain}
    deployment={deployment}
    publicClient={publicClient}
    walletClient={connectWallet}
    onPaid={({ txHash }) => console.info("Payment confirmed:", txHash)}
  />;
}
