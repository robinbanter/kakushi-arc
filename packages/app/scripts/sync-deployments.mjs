// Copies the public deployment records (deployments/arc-testnet.json, arc-mainnet.json at the repo root) into
// packages/app/deployments so the hosted app can read them at runtime (the app is deployed from this folder alone).
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const from = join(here, "..", "..", "..", "deployments");
const to = join(here, "..", "deployments");
mkdirSync(to, { recursive: true });
if (existsSync(from)) {
  for (const f of readdirSync(from)) if (/^arc-(testnet|mainnet)\.json$/.test(f)) cpSync(join(from, f), join(to, f));
}
