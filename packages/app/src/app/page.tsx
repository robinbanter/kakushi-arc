import type { Metadata } from "next";
import { Footer } from "@/components/landing/closing";
import { Developers } from "@/components/landing/developers";
import { LandingFrame } from "@/components/landing/frame";
import { Hero } from "@/components/landing/hero";
import { How } from "@/components/landing/how";
import { LandingNav } from "@/components/landing/nav";
import { WidgetDemo } from "@/components/widget-demo";

export const metadata: Metadata = {
  title: { absolute: "Kakushi — the privacy layer for Arc" },
  description: "Drop private USDC payments into any app. An SDK, a payment widget, stealth addresses, shielded pools and a gasless withdrawal relayer on Arc testnet.",
};
export default function LandingPage() {
  return <LandingFrame>
    <LandingNav />
    <main>
      <Hero />
      <section id="try" aria-labelledby="try-title" className="mx-auto max-w-[1200px] scroll-mt-8 border-y border-ui-hairline-strong px-4 py-12 sm:px-6">
        <h2 id="try-title" className="serif mb-3 text-4xl sm:text-5xl">Try it, on Arc testnet.</h2>
        <p className="mb-8 text-ui-muted">The same KakushiPay component you can embed in your app.</p>
        <WidgetDemo />
      </section>
      <Developers />
      <How />
      <aside aria-label="Current limits" className="mx-auto mb-16 max-w-[1200px] border-y border-ui-hairline-strong px-4 py-8 sm:px-6">
        <h2 className="text-xl font-medium">Early software. Real limits.</h2>
        <p className="mt-3 max-w-[75ch] leading-relaxed text-ui-muted">Small anonymity sets today. One relayer, which can go offline or censor requests. Unaudited contracts and circuits. FHE for hidden amounts is next; it is not shipped. Use testnet funds only.</p>
      </aside>
    </main>
    <Footer />
  </LandingFrame>;
}
