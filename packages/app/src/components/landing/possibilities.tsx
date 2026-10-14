import Image from "next/image";
import Link from "next/link";

export function Possibilities() {
  return <>
    <section className="corps-purpose mx-auto max-w-[1200px] px-4 py-16 sm:px-6" aria-labelledby="purpose-title">
      <div>
        <h2 id="purpose-title" className="serif text-4xl sm:text-5xl">Quiet infrastructure.<br />Room for your ideas.</h2>
        <p className="mt-5 max-w-[60ch] leading-relaxed text-ui-muted">Building blocks for apps that need privacy and user-controlled disclosure. Bring your own application logic.</p>
        <dl className="mt-8 divide-y divide-ui-hairline-strong">
          <div className="py-5"><dt className="text-xl">Private payroll & payouts</dt><dd className="mt-2 text-ui-muted">Pay fresh recipient addresses. Sender and amounts remain public; payroll scheduling belongs to your app.</dd></div>
          <div className="py-5"><dt className="text-xl">Private checkout</dt><dd className="mt-2 text-ui-muted">Embed KakushiPay in your checkout. Get a confirmed receipt; keep your existing wallet connection.</dd></div>
          <div className="py-5"><dt className="text-xl">Sealed-bid style flows</dt><dd className="mt-2 text-ui-muted">Use private payout destinations after an auction. Bid secrecy and commit/reveal logic are next, not built into Kakushi.</dd></div>
          <div className="py-5"><dt className="text-xl">Private game winnings</dt><dd className="mt-2 text-ui-muted">Send rewards to stealth addresses, or compose a shielded withdrawal. Game state stays with your app.</dd></div>
        </dl>
      </div>
      <Image src="/brand/kakushi-mascot.png" alt="Kakushi’s masked courier with a sealed envelope" width={1254} height={1254} sizes="(max-width: 767px) 90vw, 440px" className="corps-mascot" />
    </section>
    <section className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6" aria-labelledby="disclosure-title">
      <div className="grid gap-6 md:grid-cols-2 md:gap-16">
        <h2 id="disclosure-title" className="serif text-4xl">Private by default.<br />Disclose by choice.</h2>
        <div><p className="leading-relaxed text-ui-muted">The SDK supports viewing-only scans. Share your stealth viewing key and spending public key with an auditor to identify your incoming payments, without giving them spending authority.</p><p className="mt-4 leading-relaxed text-ui-muted">A viewing key exposes payments for that key, not just one selected receipt. Auditor export UI is next. This is a disclosure primitive, not a compliance certification.</p><Link href="/developers#disclosure" className="mt-5 inline-block underline underline-offset-4">Read the disclosure model</Link></div>
      </div>
    </section>
    <aside aria-label="Privacy approaches compared" className="corps-comparison mx-auto my-12 max-w-[1200px] px-4 py-7 sm:px-6">
      <p><a href="https://github.com/magicblock-labs/starter-kits/tree/main/private-payments-demo" target="_blank" rel="noreferrer" className="underline underline-offset-4">PER on Solana</a>: TEE</p>
      <p><strong>Kakushi on Arc:</strong> ZK (Noir/UltraHonk) · USDC-native · relayer pays withdrawal gas</p>
      <p className="basis-full text-sm text-ui-muted">Kakushi is not a rollup and uses no TEE. Proof verification does not rely on a hardware vendor. It provides payment privacy primitives, not arbitrary confidential execution.</p>
    </aside>
  </>;
}
