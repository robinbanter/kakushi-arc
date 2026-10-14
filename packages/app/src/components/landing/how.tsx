import Link from "next/link";
import { WidgetDemo } from "@/components/widget-demo";

const steps = [
  { title: "Go hidden", body: "Shield USDC into a fixed-size pool and save your private note. Or register a stealth meta-address so others can pay you at fresh addresses.", href: "/shield", action: "Shield USDC" },
  { title: "Move unseen", body: "Send a stealth payment with the widget below. For shielded withdrawals, generate a Noir / UltraHonk proof in your browser. Your note stays on your device.", href: "/send", action: "Make a payment" },
  { title: "Surface on Arc", body: "A relayer submits your shielded withdrawal to a fresh address and pays gas, taking its quoted USDC fee from the note. Settlement is a normal Arc transaction.", href: "/shield", action: "Open Shield" },
];
export function How() {
  return <section id="try" className="mx-auto max-w-[1200px] scroll-mt-8 px-4 py-16 sm:px-6" aria-labelledby="how-title">
    <h2 id="how-title" className="serif text-4xl sm:text-5xl">Go hidden. Move unseen.<br />Surface on Arc.</h2>
    <ol className="corps-steps mt-10">
      {steps.map(({title, body, href, action}, i) => <li key={title}>
        <span className="corps-step-number" aria-hidden>0{i + 1}</span>
        <h3 className="mt-4 text-2xl font-medium">{title}</h3>
        <p className="mt-3 leading-relaxed text-ui-muted">{body}</p>
        <Link href={href} className="mt-5 inline-block underline underline-offset-4">{action}</Link>
      </li>)}
    </ol>
    <div className="mt-12 border-t border-ui-hairline-strong pt-10">
      <h3 className="mb-3 text-2xl">Try it, on Arc.</h3>
      <p className="mb-8 max-w-[70ch] text-ui-muted">This is the real KakushiPay widget. Stealth payments and shielded withdrawals are separate paths; this checkout sends a stealth payment.</p>
      <WidgetDemo />
    </div>
  </section>;
}
