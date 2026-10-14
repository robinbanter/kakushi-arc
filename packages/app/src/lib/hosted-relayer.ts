import { privateKeyToAccount } from "viem/accounts";
import { chainByNetwork } from "@kakushi/config";
import { Relayer } from "../../../relayer/src/relayer";
import { poolsOf } from "../../../relayer/src/config";
import { RelayError } from "../../../relayer/src/validate";
import { loadRuntimeDeployment, network, serverRpc } from "./server-config";

let cached: Relayer | undefined;
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data, (_, value) => typeof value === "bigint" ? value.toString() : value), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
export async function localRelay(req: Request, route: string) {
  try {
    const deployment = loadRuntimeDeployment();
    const selectedNetwork = network();
    const chainId = chainByNetwork(selectedNetwork).chainId;
    if (!deployment || deployment.chainId !== chainId) return json({ error: "Relayer deployment does not match the configured Arc network" }, 503);
    cached ??= new Relayer({ account: privateKeyToAccount(process.env.RELAYER_KEY as `0x${string}`), pools: poolsOf(deployment), network: selectedNetwork, rpc: serverRpc(), log: () => {} });
    if (req.method === "GET" && route === "info") return json(await cached.quote());
    if (req.method === "GET" && route === "health") return json({ ok: true, chainId, address: cached.address, balanceUsdc: await cached.balance() });
    if (req.method !== "POST" || route !== "relay") return json({ error: "Method not allowed" }, 405);
    const reader = req.body?.getReader();
    if (!reader) return json({ error: "Body required" }, 400);
    const chunks: Uint8Array[] = []; let size = 0;
    for (;;) { const {done, value} = await reader.read(); if (done) break; size += value.length; if (size > 128 * 1024) { await reader.cancel(); return json({ error: "Body too large" }, 413); } chunks.push(value); }
    let body: unknown;
    try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return json({ error: "Body must be JSON" }, 400); }
    return json(await cached.relay(body));
  } catch (error) {
    // Validation failures are actionable; keep provider internals and secrets out of responses.
    return error instanceof RelayError ? json({ error: error.message.split("\n")[0] }, error.status) : json({ error: "Relay temporarily unavailable. Retry or withdraw with your wallet." }, 503);
  }
}
