import Image from "next/image";
import Link from "next/link";
import { Button } from "@kakushi/ui";

export function Hero() {
  return <section aria-labelledby="hero-title" className="corps-hero">
    <Image src="/brand/kakushi-hero.png" alt="An original masked courier carrying a sealed violet envelope across moonlit rooftops" fill priority sizes="100vw" className="corps-hero-art" />
    <div className="corps-hero-shade" aria-hidden />
    <div className="corps-hero-copy">
      <h1 id="hero-title">The private execution layer for Arc</h1>
      <p className="corps-hero-voice">Kakushi move unseen.<br />Your payment arrives.</p>
      <p className="corps-hero-description">Privacy tools for the apps you already build. Stealth USDC payments, browser-generated ZK proofs, and settlement on Arc.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild variant="white" size="lg"><a href="#try">Try a private payment</a></Button>
        <Button asChild variant="outline" size="lg"><Link href="/developers">Integrate Kakushi</Link></Button>
      </div>
      <p className="mt-6 text-sm text-ui-muted">Live on Arc {process.env.NEXT_PUBLIC_KAKUSHI_NETWORK === "mainnet" ? "mainnet" : "testnet"} · USDC-native · Noir / UltraHonk</p>
    </div>
  </section>;
}
