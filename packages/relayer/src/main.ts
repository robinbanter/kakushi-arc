// Kakushi relayer.
//   RELAYER_KEY=0x... KAKUSHI_NETWORK=testnet node src/main.ts
// See src/config.ts for every variable. The key is never logged; only its address is.
import { loadRelayerConfig } from "./config.ts";
import { Relayer } from "./relayer.ts";
import { relayerServer } from "./server.ts";

const cfg = loadRelayerConfig();
const relayer = new Relayer({ account: cfg.account, pools: cfg.pools, network: cfg.network, rpc: cfg.rpc, minFee: cfg.minFee, maxFeeBps: cfg.maxFeeBps, quoteGas: cfg.quoteGas });
relayerServer(relayer, { allowOrigin: cfg.allowOrigin }).listen(cfg.port, cfg.host, () => {
  console.log(`[relayer] ${relayer.address} on ${cfg.host}:${cfg.port}, Arc ${cfg.network} (chain ${cfg.chainId}), ${cfg.pools.length} pool(s): ${cfg.pools.map((p) => p.label).join(", ")}`);
});
for (const sig of ["SIGINT", "SIGTERM"] as const) process.on(sig, () => process.exit(0));
