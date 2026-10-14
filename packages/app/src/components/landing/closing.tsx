"use client";
import { Logo } from "@kakushi/ui";
import Link from "next/link";
import { Shell } from "./section";

export function Footer() {
  return (
    <footer className="border-t border-ui-hairline py-12">
      <Shell className="grid gap-10 md:grid-cols-[minmax(0,1.2fr)_repeat(2,minmax(0,0.6fr))]">
        <div className="grid content-start gap-4">
          <Logo height={30} />
          <p className="max-w-[40ch] text-[14px] leading-relaxed text-ui-muted">Private USDC payments on Circle&rsquo;s Arc: ERC-5564 stealth addresses, a Noir/UltraHonk shielded pool and a relayer paid in USDC. Beta software, not audited.</p>
        </div>
        <nav aria-label="Product" className="grid content-start gap-2 text-[15px]">
          <p className="mb-1 text-[13px] font-medium text-ui-muted uppercase">App</p>
          <Link className="text-ui-muted hover:text-ui-text" href="/send">Pay</Link>
          <Link className="text-ui-muted hover:text-ui-text" href="/receive">Receive</Link>
          <Link className="text-ui-muted hover:text-ui-text" href="/shield">Shield</Link>
        </nav>
        <nav aria-label="Developers" className="grid content-start gap-2 text-[15px]">
          <p className="mb-1 text-[13px] font-medium text-ui-muted uppercase">Developers</p>
          <Link className="text-ui-muted hover:text-ui-text" href="/developers">SDK & widget</Link>
          <a className="text-ui-muted hover:text-ui-text" href="https://docs.arc.io">Arc docs</a>
        </nav>
      </Shell>
      <Shell className="mt-10 flex flex-wrap items-center justify-between gap-3 text-[13px] text-ui-muted">
        <p>© 2026 Kakushi. MIT licensed.</p>
        <p>Arc · Noir · Circle USDC</p>
      </Shell>
    </footer>
  );
}
