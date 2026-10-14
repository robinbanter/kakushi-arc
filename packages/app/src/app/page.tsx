import type { Metadata } from "next";
import { Footer } from "@/components/landing/closing";
import { Developers } from "@/components/landing/developers";
import { LandingFrame } from "@/components/landing/frame";
import { Hero } from "@/components/landing/hero";
import { How } from "@/components/landing/how";
import { LandingNav } from "@/components/landing/nav";
import { Possibilities } from "@/components/landing/possibilities";

export const metadata: Metadata = {
  title: { absolute: "Kakushi — the private execution layer for Arc" },
  description: "Private USDC payment primitives for Arc apps. Stealth addresses, in-browser Noir proofs, viewing-key disclosure and relayer withdrawals. Live on testnet.",
};
export default function LandingPage() {
  return <LandingFrame>
    <LandingNav />
    <main>
      <Hero />
      <How />
      <Developers />
      <Possibilities />
      <aside aria-label="Current limits" className="mx-auto mb-16 max-w-[1200px] border-y border-ui-hairline-strong px-4 py-8 sm:px-6">
        <h2 className="text-xl font-medium">Early software. Real limits.</h2>
        <p className="mt-3 max-w-[75ch] leading-relaxed text-ui-muted">Small anonymity sets today. One relayer, which can go offline or censor requests. Unaudited contracts and circuits. FHE for hidden amounts is next; it is not shipped. Use testnet funds only.</p>
      </aside>
    </main>
    <Footer />
  </LandingFrame>;
}
