// Client for the Kakushi relayer (packages/relayer): gasless withdrawals, fee paid in USDC out of the withdrawn note.
import type { Hex } from "viem";

export interface RelayerInfo {
  /** the address that must be the proof's `relayer` (it receives the fee) */
  address: Hex;
  chainId: number;
  /** pool address -> minimum fee in USDC base units (6 decimals), decimal string; pools it won't relay are absent */
  feeByPool: Record<string, string>;
}

export interface RelayWithdrawRequest {
  chainId: number;
  pool: Hex;
  proof: Hex;
  args: { root: Hex; nullifierHash: Hex; recipient: Hex; relayer: Hex; fee: bigint | string };
}

type Fetch = typeof fetch;

async function parse(r: Response): Promise<any> {
  const text = await r.text();
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`relayer answered ${r.status}: ${text.slice(0, 200)}`);
  }
  if (!r.ok) throw new Error(body?.error ?? `relayer answered ${r.status}`);
  return body;
}

/** GET {url}/info: the relayer's address and the fee it asks per pool right now. */
export async function getRelayerInfo(url: string, fetchImpl: Fetch = fetch): Promise<RelayerInfo> {
  return parse(await fetchImpl(`${url.replace(/\/$/, "")}/info`, { cache: "no-store" } as RequestInit));
}

/** POST {url}/relay: the relayer simulates, submits and returns the transaction hash. */
export async function relayWithdraw(url: string, req: RelayWithdrawRequest, fetchImpl: Fetch = fetch): Promise<{ txHash: Hex }> {
  const body = JSON.stringify({ ...req, args: { ...req.args, fee: String(req.args.fee) } });
  return parse(await fetchImpl(`${url.replace(/\/$/, "")}/relay`, { method: "POST", headers: { "content-type": "application/json" }, body }));
}
