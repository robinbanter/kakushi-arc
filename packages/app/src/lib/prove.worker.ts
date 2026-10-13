/// <reference lib="webworker" />
// Proves shielded_withdraw in the browser (noir_js witness + bb.js UltraHonk), off the main thread. The circuit
// artifact is the same checked-in file the Node prover and the forge tests use.
import { proveWith } from "@kakushi/prover/prover";
import shieldedWithdraw from "../../../prover/circuits/shielded_withdraw.json";

self.onmessage = async (e: MessageEvent<{ inputs: Record<string, unknown> }>) => {
  try {
    const threads = Math.max(1, Math.min(4, (self.navigator?.hardwareConcurrency ?? 2) - 1));
    const r = await proveWith(shieldedWithdraw as never, e.data.inputs as never, { threads, onStage: (stage) => self.postMessage({ stage }) });
    self.postMessage({ result: r });
  } catch (err) {
    self.postMessage({ error: (err as Error).message });
  }
};
