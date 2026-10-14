"use client";
import Link from "next/link";
import { CodeBlock } from "@kakushi/ui";
import samples from "@/examples/samples";

export function Developers() {
  return <section aria-labelledby="dev-title" className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
    <h2 id="dev-title" className="serif text-4xl sm:text-5xl">Your checkout. Now private.</h2>
    <ol className="mt-8 grid gap-8 md:grid-cols-3">
      <li><h3 className="text-xl font-medium">1. Install the workspace</h3><pre className="mt-3 overflow-x-auto text-sm text-ui-muted">pnpm install</pre><p className="mt-3 text-sm text-ui-muted">Clone the repo first. SDK and widget are source packages; not published to npm yet.</p></li>
      <li><h3 className="text-xl font-medium">2. Add KakushiPay</h3><p className="mt-3 leading-relaxed text-ui-muted">Supply a recipient, amount, Arc deployment and viem clients. Keep your existing wallet connection.</p></li>
      <li><h3 className="text-xl font-medium">3. Confirm and receive</h3><p className="mt-3 leading-relaxed text-ui-muted">The widget approves USDC, sends to a fresh address and returns the confirmed transaction. The recipient scans to find it.</p></li>
    </ol>
    <div className="mt-8 min-w-0"><CodeBlock samples={samples} defaultKey="Checkout.tsx" copyable aria-label="Typechecked widget integration" /></div>
    <Link href="/developers" className="mt-5 inline-block underline underline-offset-4">Setup, SDK guide and contract addresses</Link>
  </section>;
}
