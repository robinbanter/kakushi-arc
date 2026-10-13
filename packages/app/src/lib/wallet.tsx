"use client";

// The account layer: an injected EIP-1193 browser wallet (MetaMask, Rabby, ...). Arc's gas is USDC, so the wallet
// only ever needs USDC; the chain is added to the wallet on first use.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { createWalletClient, custom, type Hex, type WalletClient } from "viem";
import { arcChain } from "@kakushi/sdk";
import { useRuntime } from "./runtime";

interface WalletState {
  address: Hex | null;
  label: string | null;
  connectInjected: () => Promise<void>;
  disconnect: () => void;
  /** a wallet client on Arc; asks the wallet to switch (or add) the chain */
  walletClient: () => Promise<WalletClient>;
}

const Ctx = createContext<WalletState | null>(null);

declare global {
  interface Window {
    ethereum?: { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const { cfg } = useRuntime();
  const [address, setAddress] = useState<Hex | null>(null);

  const connectInjected = useCallback(async () => {
    if (!window.ethereum) throw new Error("No browser wallet found. Install MetaMask or Rabby.");
    const [a] = (await window.ethereum.request({ method: "eth_requestAccounts" })) as Hex[];
    if (!a) throw new Error("The wallet returned no account");
    setAddress(a);
  }, []);

  const disconnect = useCallback(() => setAddress(null), []);

  const walletClient = useCallback(async (): Promise<WalletClient> => {
    if (!cfg) throw new Error("Wait for the network configuration");
    if (!address || !window.ethereum) throw new Error("Connect a wallet first");
    const hex = `0x${cfg.chainId.toString(16)}`;
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
    } catch (e) {
      if ((e as { code?: number }).code !== 4902) throw e;
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{ chainId: hex, chainName: cfg.chainName, nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, rpcUrls: [cfg.publicRpc], blockExplorerUrls: [cfg.explorer] }],
      });
    }
    return createWalletClient({ account: address, chain: arcChain(cfg.network, cfg.publicRpc), transport: custom(window.ethereum) });
  }, [address, cfg]);

  const value = useMemo<WalletState>(() => ({ address, label: address ? "Browser wallet" : null, connectInjected, disconnect, walletClient }), [address, connectInjected, disconnect, walletClient]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet(): WalletState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWallet outside WalletProvider");
  return v;
}
