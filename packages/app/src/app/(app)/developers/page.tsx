"use client";
import { CodeBlock } from "@kakushi/ui";
import Link from "next/link";
import samples from "@/examples/samples";
import { useRuntime } from "@/lib/runtime";

const install = `git clone https://github.com/nickthelegend/kakushi-arc.git
cd kakushi-arc
pnpm install
pnpm --filter @kakushi/app dev`;

export default function DevelopersPage() {
  const { cfg } = useRuntime();
  const d = cfg?.deployment;
  const contracts = d ? [
    ["USDC", d.usdc], ["StealthRegistry · ERC-6538", d.stealthRegistry],
    ["StealthAnnouncer · ERC-5564", d.stealthAnnouncer], ["StealthPay", d.stealthPay],
    ["UltraHonk verifier", d.shieldedVerifier],
    ...Object.entries(d.pools).map(([name, p]) => [`Shielded pool · ${name}`, p.address]),
  ] : [];
  return <article className="mx-auto max-w-[1100px] pt-8">
    <h1 className="text-[clamp(44px,6vw,72px)] leading-tight">Private payments,<br />in your app.</h1>
    <p className="mt-5 max-w-[70ch] text-lg leading-relaxed text-ui-muted">Use KakushiPay for React checkouts, or compose the SDK with your own interface. Stealth payments, shielded pools and gasless withdrawals are separate tools.</p>
    <section className="mt-12" aria-labelledby="install-title">
      <h2 id="install-title" className="mb-4 text-2xl">1. Install from source</h2>
      <CodeBlock samples={[{ key: "install", label: "Install", filename: "Terminal", language: "bash", code: install }]} copyable />
      <p className="mt-4 leading-relaxed text-ui-muted">Requires Node 22.18+, pnpm 10.29.2, React 19 and viem 2.38+. Packages are not on npm yet. In another pnpm workspace, copy packages/sdk, packages/prover, config and packages/widget, then add @kakushi/widget and @kakushi/sdk as workspace:* dependencies. Keep their workspace dependencies together.</p>
    </section>
    <section className="mt-12" aria-labelledby="code-title">
      <h2 id="code-title" className="mb-4 text-2xl">2. Connect the widget or SDK</h2>
      <p className="mb-4 leading-relaxed text-ui-muted">Copy arc.ts alongside Checkout.tsx or send.ts. These are the exact files compiled by this app’s typecheck. Configure Arc testnet in your wallet (chain 5042002, RPC https://rpc.testnet.arc.io, currency USDC). The recipient first <Link className="underline underline-offset-4 text-ui-text" href="/receive">registers on Receive</Link>, or shares a stealth meta-address directly.</p>
      <CodeBlock samples={samples} defaultKey="Checkout.tsx" copyable aria-label="Compilable SDK and widget source" />
      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div><dt className="font-medium">Amounts</dt><dd className="mt-1 text-ui-muted">Widget: decimal strings ("0.01") or bigint base units. SDK: bigint base units (10_000n). USDC has 6 decimals.</dd></div>
        <div><dt className="font-medium">Wallets and receipts</dt><dd className="mt-1 text-ui-muted">Pass a viem WalletClient or an async connector, plus a PublicClient and deployment. onPaid runs after a successful receipt. Verify order amount, token and chain on your backend before fulfillment.</dd></div>
      </dl>
    </section>
    <section className="mt-12" aria-labelledby="pool-title">
      <h2 id="pool-title" className="text-2xl">3. Add shielding when you need it</h2>
      <p className="mt-4 max-w-[75ch] leading-relaxed text-ui-muted">The widget sends a stealth payment; it does not shield funds. The <Link href="/shield" className="underline text-ui-text">Shield flow</Link> deposits fixed 1, 10 or 100 USDC notes. Save the note before depositing. Withdraw rebuilds the tree, proves in a browser worker and sends only the proof and public inputs to the relayer. The recipient needs no gas; the quoted relayer fee comes out of the note.</p>
      <p className="mt-3 text-ui-muted">Reference implementation: packages/app/src/app/(app)/shield/page.tsx and packages/app/src/lib/prove.worker.ts. SDK exports generateNote, withdrawWitness, IncrementalMerkleTree and relayWithdraw. Keep notes and stealth keys private.</p>
    </section>
    <section className="mt-12" aria-labelledby="contracts-title">
      <h2 id="contracts-title" className="text-2xl">Contracts · {cfg?.chainName ?? "loading"}</h2>
      <p className="mt-3 text-ui-muted">Loaded from this app’s deployment record. This demo uses Arc testnet. Mainnet deployment evidence is recorded separately in the repository; these examples use testnet funds only.</p>
      <dl className="mt-5 divide-y divide-ui-hairline-strong">{contracts.map(([name, address]) => <div key={name} className="grid gap-2 py-4 md:grid-cols-[1fr_2fr]"><dt>{name}</dt><dd className="min-w-0"><a className="break-all font-mono text-sm text-ui-lime-text underline underline-offset-4" href={`${cfg?.explorer}/address/${address}`} target="_blank" rel="noreferrer">{address}</a></dd></div>)}</dl>
    </section>
    <aside className="mt-12 border-t border-ui-hairline-strong py-6 text-ui-muted">Small anonymity sets, a single relayer and unaudited software. Sender and amount remain public for stealth payments. FHE is next, not shipped. <a className="underline text-ui-text" href="https://github.com/nickthelegend/kakushi-arc/blob/main/docs/E2E-TESTNET.md">Read the live testnet evidence</a>.</aside>
  </article>;
}
