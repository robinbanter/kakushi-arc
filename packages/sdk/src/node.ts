// Node-only helpers: deployments from disk and proof generation (noir_js + bb.js). The browser app proves in a web
// worker instead (packages/app/src/lib/prove.worker.ts).
import { loadDeployment } from "@kakushi/config/deployments";
import { currentNetwork, type ArcNetwork } from "@kakushi/config";
import { prove } from "@kakushi/prover/prover";
import type { Hex } from "viem";
import type { WithdrawWitness } from "./notes.ts";

export { loadDeployment };

export function deploymentFromDisk(network: ArcNetwork = currentNetwork()) {
  const d = loadDeployment(network);
  if (!d) throw new Error(`no deployment record for Arc ${network}: run pnpm deploy:${network}`);
  return d;
}

/** UltraHonk proof for a withdraw witness (about 5-15 s on a laptop). */
export async function proveWithdraw(w: WithdrawWitness, threads = 2): Promise<{ proof: Hex; publicInputs: Hex[]; ms: number }> {
  return prove("shielded_withdraw", w.inputs, threads);
}
