import Link from "next/link";
import { Button } from "@kakushi/ui";

export function Hero() {
  return <section aria-labelledby="hero-title" className="mx-auto max-w-[1200px] px-4 pt-14 pb-12 sm:px-6 lg:pt-24 lg:pb-20">
    <h1 id="hero-title" className="max-w-[900px] text-[clamp(48px,7vw,96px)] leading-[1.04] text-balance">The privacy layer<br />for Arc.</h1>
    <p className="mt-6 max-w-[620px] text-[20px] leading-relaxed text-ui-muted">Drop private USDC payments into any app with the Kakushi SDK and a single payment widget.</p>
    <div className="mt-8 flex flex-wrap gap-3">
      <Button asChild variant="white" size="lg"><a href="#try">Try a private payment</a></Button>
      <Button asChild variant="outline" size="lg"><Link href="/developers">Integrate Kakushi</Link></Button>
    </div>
    <p className="mt-6 text-sm text-ui-muted">Live on Arc testnet · USDC for payments and gas</p>
  </section>;
}
