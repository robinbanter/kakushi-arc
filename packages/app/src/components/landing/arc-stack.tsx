"use client";

import { Coins, Fuel, Timer } from "lucide-react";
import { Rise } from "@/components/motion";
import { stack as engines } from "./content";
import { SectionIntro, Shell } from "./section";

const ICON = { gas: <Fuel size={18} />, usdc: <Coins size={18} />, final: <Timer size={18} /> } as const;
const TINT = { gas: "from-[#16205a] to-[#0b0f1f]", usdc: "from-[#2a1f4f] to-[#0b0f1f]", final: "from-[#16205a] via-[#2a1f4f] to-[#0b0f1f]" } as const;

/** How Arc's design helps private payments. */
export function ArcStack() {
  return (
    <section id="stack" aria-labelledby="stack-title" className="scroll-mt-24 py-16 lg:py-24">
      <Shell>
        <SectionIntro id="stack-title" align="center" eyebrow={engines.eyebrow} heading={engines.heading} sub={engines.sub} className="mx-auto max-w-[780px]" />
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {engines.cards.map((c, i) => (
            <Rise key={c.key} delay={0.1 * i} className="h-full">
              <article className={`flex h-full flex-col rounded-[28px] bg-gradient-to-b ${TINT[c.key]} p-6 ring-1 ring-ui-hairline-strong`}>
                <span className="inline-flex items-center gap-2 text-[13px] font-medium text-[#c4d0ff]">
                  {ICON[c.key]} {c.engine}
                </span>
                <h3 className="serif mt-4 text-[34px] leading-[1.05]">{c.title}</h3>
                <ul className="mt-5 grid gap-2 text-[15px] text-ui-muted">
                  {c.items.map((it) => (
                    <li key={it} className="flex gap-2">
                      <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-[#8ea5ff]" />
                      {it}
                    </li>
                  ))}
                </ul>
              </article>
            </Rise>
          ))}
        </div>
      </Shell>
    </section>
  );
}
