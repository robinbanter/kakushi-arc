import type { Metadata } from "next";
import { ArcStack } from "@/components/landing/arc-stack";
import { Closing, Footer } from "@/components/landing/closing";
import { Developers } from "@/components/landing/developers";
import { Faq } from "@/components/landing/faq";
import { Fees } from "@/components/landing/fees";
import { LandingFrame } from "@/components/landing/frame";
import { Hero } from "@/components/landing/hero";
import { How } from "@/components/landing/how";
import { LandingNav } from "@/components/landing/nav";
import { SmoothScroll } from "@/components/motion";

export const metadata: Metadata = {
  title: { absolute: "Kakushi: private USDC payments on Arc" },
  description: "Stealth addresses, a zero-knowledge USDC pool and a gasless relayer on Circle's Arc.",
};

export default function LandingPage() {
  return (
    <SmoothScroll>
      <LandingFrame className="overflow-hidden">
        <LandingNav />
        <main>
          <Hero />
          <How />
          <ArcStack />
          <Developers />
          <Fees />
          <Faq />
          <Closing />
        </main>
        <Footer />
      </LandingFrame>
    </SmoothScroll>
  );
}
