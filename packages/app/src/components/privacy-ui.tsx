"use client";

import { cn } from "@kakushi/ui";
import type { ReactNode } from "react";

/** The privacy screens' card: the Trade card's frosted glass. */
export function GlassCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-[30px] bg-[#0b0f1f]/75 p-3 shadow-[0_50px_120px_-40px_rgb(47_71_245/0.55)] ring-1 ring-white/10 backdrop-blur-xl", className)}>{children}</div>;
}

/** An inset well inside a GlassCard. */
export function Well({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-[22px] bg-[#04060f]/80 p-5 ring-1 ring-white/[0.04]", className)}>{children}</div>;
}

export function ScreenTitle({ title, pill }: { title: string; pill: ReactNode }) {
  return (
    <header className="mb-6 text-center">
      <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[#3a5cf0] px-3 text-[13px] font-medium text-white">{pill}</span>
      <h1 className="mt-4 text-[clamp(36px,4.5vw,56px)] leading-[1.04]">{title}</h1>
    </header>
  );
}

export const inputCls = "w-full min-w-0 rounded-[16px] bg-transparent text-[15px] outline-none placeholder:text-ui-dim";

/** The single result headline after an action, details collapsed. */
export function Done({ headline, sub, details }: { headline: ReactNode; sub?: ReactNode; details?: ReactNode }) {
  return (
    <div className="mt-3 rounded-[22px] bg-[#101a4a]/80 p-5 ring-1 ring-[#3b55ff]/40">
      <div className="serif text-[28px] leading-tight">{headline}</div>
      {sub ? <div className="mt-1 text-[14px] text-[#c4d0ff]">{sub}</div> : null}
      {details ? (
        <details className="mt-3 text-[13px] text-ui-muted">
          <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">Details</summary>
          <div className="mt-2 grid gap-1 break-all font-mono">{details}</div>
        </details>
      ) : null}
    </div>
  );
}

export function NotLive() {
  return (
    <GlassCard>
      <Well className="py-10 text-center">
        <div className="serif text-[26px]">Not live on this network yet</div>
        <div className="mt-1 text-[14px] text-ui-muted">The Kakushi contracts aren&rsquo;t deployed here.</div>
      </Well>
    </GlassCard>
  );
}
