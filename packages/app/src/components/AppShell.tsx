"use client";

import { AppFrame, cn, KakushiMark, Logo, Menu, TopNav } from "@kakushi/ui";
import { CodeXml, Inbox, LogOut, Send, Shield, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useRuntime } from "@/lib/runtime";
import { useWallet } from "@/lib/wallet";

export const NAV = [
  { key: "send", label: "Pay", href: "/send", icon: <Send /> },
  { key: "receive", label: "Receive", href: "/receive", icon: <Inbox /> },
  { key: "shield", label: "Shield", href: "/shield", icon: <Shield /> },
  { key: "developers", label: "Developers", href: "/developers", icon: <CodeXml /> },
];

function activeKey(pathname: string): string | undefined {
  return NAV.find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`))?.key;
}

/** Where Kakushi is running: the live dot and the Arc network. Arc finality is sub-second and deterministic. */
export function NetworkPill({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { cfg, error } = useRuntime();
  const live = Boolean(cfg?.deployment && !error);
  const label = !cfg ? "Arc" : error ? `${cfg.chainName}: not deployed yet` : cfg.network === "mainnet" ? "Arc mainnet" : "Arc testnet";
  const dot = (
    <span aria-hidden className="relative grid size-2.5 shrink-0 place-items-center">
      {live ? <span className="absolute size-2.5 animate-ping rounded-full bg-ui-lime-button/60 motion-reduce:animate-none" /> : null}
      <span className={`size-2 rounded-full ${live ? "bg-ui-lime-button" : "bg-ui-muted"}`} />
    </span>
  );
  return (
    <span title="Arc: gas is paid in USDC, finality is deterministic in under a second" className={cn(compact ? "h-11 shrink-0 items-center gap-2 rounded-full bg-ui-surface-1 px-3.5 text-[13px] font-medium whitespace-nowrap" : "inline-flex h-11 items-center gap-2.5 rounded-full bg-ui-surface-1 pr-5 pl-4 text-[15px] font-medium whitespace-nowrap", className)}>
      {dot}
      {label}
      {!compact && live ? <span className="hidden text-[13px] font-normal text-ui-muted xl:inline">USDC gas · final in &lt; 1 s</span> : null}
    </span>
  );
}

/** The app's sky: navy, a blue bloom and a faint star field. */
function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#04060f]">
      <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_-5%,rgb(47_71_245/0.30),transparent_70%)]" />
      <div className="app-stars absolute inset-0 opacity-70" />
      <div className="absolute inset-x-0 bottom-0 h-[45%] bg-[radial-gradient(60%_80%_at_50%_100%,rgb(47_71_245/0.22),transparent_70%)]" />
    </div>
  );
}

export function ConnectButton({ block = false, large = false }: { block?: boolean; large?: boolean }) {
  const w = useWallet();
  const [err, setErr] = useState<string | null>(null);
  if (w.address) {
    return (
      <Menu
        label="Wallet"
        align="end"
        width={300}
        triggerClassName={block ? "w-full" : "inline-flex"}
        trigger={
          <span className="inline-flex h-11 w-full items-center gap-2.5 rounded-full bg-ui-surface-1 pr-5 pl-2 text-[15px] font-medium transition-colors hover:bg-ui-surface-2">
            <span className="grid size-7 place-items-center"><KakushiMark title="" width={24} height={24} /></span>
            <span className="ui-figure">{w.address.slice(0, 6)}…{w.address.slice(-4)}</span>
          </span>
        }
      >
        <div className="px-3 py-2 text-[13px] text-ui-muted">{w.label}</div>
        <Menu.Item icon={<LogOut />} tone="danger" onSelect={() => w.disconnect()}>
          Disconnect
        </Menu.Item>
      </Menu>
    );
  }
  return (
    <>
      <button
        type="button"
        onClick={() => void w.connectInjected().catch((e) => setErr((e as Error).message))}
        className={`inline-flex items-center justify-center gap-2 rounded-full bg-ui-lime-button px-5 font-semibold tracking-[-0.005em] text-ui-on-lime hover:brightness-[1.06] ${block ? "w-full" : ""} ${large ? "h-[58px] text-[17px] shadow-[0_14px_40px_-12px_rgb(47_71_245/0.8)]" : "h-11 text-[15px]"}`}
      >
        <Wallet aria-hidden size={18} strokeWidth={2} />
        {large ? "Connect wallet" : "Connect"}
      </button>
      {err ? <p role="alert" className="mt-2 text-[13px] text-ui-down">{err}</p> : null}
    </>
  );
}

export function AppHeader() {
  const pathname = usePathname() ?? "/";
  return <TopNav
    brand={<Logo height={30} />} brandHref="/" brandLabel="Kakushi, home"
    items={NAV} value={activeKey(pathname)} linkAs={Link} contained
    actions={<ConnectButton />} compactActions={<ConnectButton />}
    sheetTitle="Kakushi" />;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { cfg } = useRuntime();
  return (
    <AppFrame className="isolate bg-transparent" panelClassName="bg-transparent">
      <Backdrop />
      <a href="#content" className="sr-only z-[60] rounded-full bg-ui-lime px-4 py-2 font-medium text-ui-on-lime focus:not-sr-only focus:fixed focus:top-3 focus:left-3">Skip to content</a>
      <AppHeader />
      {cfg?.network === "testnet" && <p className="mx-auto max-w-[1480px] px-4 py-3 text-center text-sm text-ui-muted">Arc testnet · Payments and gas use USDC. <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" className="text-ui-text underline underline-offset-4">Get testnet USDC</a> — select Arc Testnet.</p>}
      <main id="content" tabIndex={-1} className="px-4 pt-2 pb-16 outline-none sm:px-6 lg:px-10 lg:pt-0 xl:px-14 xl:pb-14">
        <div className="mx-auto w-full max-w-[1480px]">{children}</div>
      </main>
    </AppFrame>
  );
}
