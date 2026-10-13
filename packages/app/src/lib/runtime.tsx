"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createPublicClient, http, type PublicClient } from "viem";
import { arcChain } from "@kakushi/sdk";
import type { RuntimeConfig } from "./server-config";

interface RuntimeState {
  cfg: RuntimeConfig | null;
  /** reads go through the same-origin /api/rpc proxy */
  client: PublicClient | null;
  error: string | null;
  rpc: string;
}

const Ctx = createContext<RuntimeState>({ cfg: null, client: null, error: null, rpc: "" });

export function RuntimeProvider({ children }: { children: ReactNode }) {
  const [cfg, setCfg] = useState<RuntimeConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c: RuntimeConfig) => {
        setCfg(c);
        if (c.error) setError(c.error);
      })
      .catch((e) => setError(`config unavailable: ${(e as Error).message}`));
  }, []);
  const value = useMemo<RuntimeState>(() => {
    const rpc = typeof window === "undefined" ? "/api/rpc" : `${window.location.origin}/api/rpc`;
    if (!cfg) return { cfg, client: null, error, rpc };
    const client = createPublicClient({ chain: arcChain(cfg.network, rpc), transport: http(rpc, { batch: true }) }) as PublicClient;
    return { cfg, client, error, rpc };
  }, [cfg, error]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useRuntime = () => useContext(Ctx);
