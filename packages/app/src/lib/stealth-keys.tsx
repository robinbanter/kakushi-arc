"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { STEALTH_KEYS_MESSAGE, generateStealthKeys, type StealthKeys } from "@kakushi/sdk";
import { useWallet } from "./wallet";

export { STEALTH_KEYS_MESSAGE };

interface Ctx {
  keys: StealthKeys | null;
  owner: string | null;
  unlock: () => Promise<StealthKeys>;
  lock: () => void;
}
const StealthCtx = createContext<Ctx | null>(null);

/** Stealth keys live in memory only for this tab; locking or reloading forgets them. */
export function StealthKeysProvider({ children }: { children: ReactNode }) {
  const w = useWallet();
  const [state, setState] = useState<{ keys: StealthKeys; owner: string } | null>(null);
  const current = state && w.address && state.owner === w.address.toLowerCase() ? state : null;
  const unlock = useCallback(async () => {
    if (!w.address) throw new Error("Connect a wallet first");
    const wc = await w.walletClient();
    const signature = await wc.signMessage({ account: wc.account!, message: STEALTH_KEYS_MESSAGE });
    const keys = generateStealthKeys(signature);
    setState({ keys, owner: w.address.toLowerCase() });
    return keys;
  }, [w]);
  return <StealthCtx.Provider value={{ keys: current?.keys ?? null, owner: current?.owner ?? null, unlock, lock: () => setState(null) }}>{children}</StealthCtx.Provider>;
}

export function useStealthKeys(): Ctx {
  const c = useContext(StealthCtx);
  if (!c) throw new Error("useStealthKeys outside StealthKeysProvider");
  return c;
}
