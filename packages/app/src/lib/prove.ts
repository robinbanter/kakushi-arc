"use client";

export interface BrowserProof {
  proof: `0x${string}`;
  publicInputs: `0x${string}`[];
  ms: number;
}

/** Proves shielded_withdraw in a web worker (noir_js witness + bb.js UltraHonk), off the main thread. */
export function proveInBrowser(inputs: unknown, onStage?: (s: string) => void): Promise<BrowserProof> {
  return new Promise((resolve, reject) => {
    if (!globalThis.crossOriginIsolated) {
      reject(new Error("Browser proving needs cross-origin isolation. Reload the hosted app, or configure COOP: same-origin and COEP: require-corp on your server."));
      return;
    }
    const worker = new Worker(new URL("./prove.worker.ts", import.meta.url), { type: "module" });
    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error("Proof generation timed out. Keep your note and retry on a desktop browser."));
    }, 180_000);
    worker.onmessage = (e) => {
      if (e.data.stage) return onStage?.(e.data.stage);
      clearTimeout(timeout);
      worker.terminate();
      if (e.data.error) reject(new Error(e.data.error));
      else resolve(e.data.result as BrowserProof);
    };
    worker.onerror = (e) => {
      clearTimeout(timeout);
      worker.terminate();
      reject(new Error(e.message || "prover worker failed"));
    };
    worker.postMessage({ inputs });
  });
}
