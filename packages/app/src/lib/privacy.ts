"use client";

import { formatUsdc } from "@kakushi/config";
import type { ArcDeployment, PoolDeployment } from "@kakushi/config/deployments";
import { useRuntime } from "./runtime";

export interface PoolInfo extends PoolDeployment {
  label: string;
  denominationUnits: bigint;
}

export const fmtPool = (p: PoolInfo) => `${formatUsdc(p.denominationUnits)} USDC`;

export function poolsOf(d: ArcDeployment | null | undefined): PoolInfo[] {
  if (!d) return [];
  return Object.entries(d.pools)
    .map(([label, p]) => ({ ...p, label, denominationUnits: BigInt(p.denomination) }))
    .sort((a, b) => (a.denominationUnits < b.denominationUnits ? -1 : 1));
}

/** The deployment on the running network, or null while loading / when nothing is deployed. */
export function useDeployment(): { deployment: ArcDeployment | null; pools: PoolInfo[]; ready: boolean } {
  const { cfg } = useRuntime();
  return { deployment: cfg?.deployment ?? null, pools: poolsOf(cfg?.deployment), ready: Boolean(cfg) };
}
