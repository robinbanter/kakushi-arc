"use client";

import type { ReactNode } from "react";
import { RuntimeProvider } from "@/lib/runtime";
import { WalletProvider } from "@/lib/wallet";
import { StealthKeysProvider } from "@/lib/stealth-keys";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <RuntimeProvider>
      <WalletProvider>
        <StealthKeysProvider>{children}</StealthKeysProvider>
      </WalletProvider>
    </RuntimeProvider>
  );
}
