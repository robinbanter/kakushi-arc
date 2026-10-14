"use client";

import { KakushiPay } from "@kakushi/widget";
import { useState } from "react";
import Link from "next/link";
import { arcChain } from "@kakushi/sdk";
import { useDeployment } from "@/lib/privacy";
import { useRuntime } from "@/lib/runtime";
import { useWallet } from "@/lib/wallet";

/** The shipped widget against the configured deployment; no simulated payment state. */
export function WidgetDemo() {
  const { client, cfg, error } = useRuntime();
  const w = useWallet();
  const { deployment } = useDeployment();
  const [recipient, setRecipient] = useState<string | null>(null);
  const to = recipient ?? w.address ?? "";
  if (error) return <p role="alert">{error}</p>;
  if (!deployment || !client || !cfg) return <p role="status">Loading the Arc deployment…</p>;
  return <div className="grid gap-8 md:grid-cols-2 md:items-center">
    <div className="min-w-0">
      <label className="block text-sm text-ui-muted">
        Recipient wallet or stealth meta-address
        <input value={to} onChange={(e) => setRecipient(e.target.value.trim())} placeholder="0x… or st:eth:0x…" className="mt-3 w-full rounded-xl bg-ui-surface-2 px-4 py-3 font-mono text-sm text-ui-text" />
      </label>
      <p className="mt-4 text-sm leading-relaxed text-ui-muted">Pay yourself to try it: connect your wallet, <Link className="text-ui-text underline underline-offset-4" href="/receive">enable private receiving</Link>, then return here. After payment, scan Receive to find your USDC.</p>
    </div>
    <div className="min-w-0 rounded-2xl bg-ui-surface-2 p-6">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2"><span>Private payment</span><strong className="text-2xl">0.01 USDC</strong></div>
      <KakushiPay to={to} amount="0.01" chain={arcChain(cfg.network, cfg.publicRpc)}
        walletClient={w.address ? () => w.walletClient() : null} publicClient={client} deployment={deployment}
        label="Pay 0.01 USDC privately" theme={{ width: "100%" }} />
      <p className="mt-3 text-xs leading-relaxed text-ui-muted">Real {cfg.chainName} transaction. Payer also pays USDC gas. Sender and amount stay public; this widget uses stealth addresses, not the shielded pool.</p>
    </div>
  </div>;
}
