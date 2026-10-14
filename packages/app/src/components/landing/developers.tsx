"use client";
import Link from "next/link";
import { CodeBlock } from "@kakushi/ui";
import samples from "@/examples/samples";

export function Developers() {
  return <section aria-labelledby="dev-title" className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
    <h2 id="dev-title" className="serif text-4xl sm:text-5xl">Your app. An unseen layer.</h2>
    <p className="mt-5 max-w-[70ch] leading-relaxed text-ui-muted">Three lines to embed a checkout once your Arc clients are configured. Use the SDK directly for your own flow. Keep your app, contracts and wallet connection.</p>
    <div className="mt-8 min-w-0"><CodeBlock samples={samples} defaultKey="Checkout.tsx" copyable aria-label="Typechecked widget integration" /></div>
    <p className="mt-4 text-sm text-ui-muted">Source packages; not on npm yet. Client setup and recipient registration are required. The widget handles stealth payments, not shielded withdrawals.</p>
    <Link href="/developers" className="mt-5 inline-block underline underline-offset-4">Source install, Arc client setup and SDK guide</Link>
  </section>;
}
