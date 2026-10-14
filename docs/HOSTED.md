# Kakushi — Vercel / Live testnet

LEAD: RUN THESE
```sh
node scripts/e2e-browser-hosted.mjs
pnpm --filter @kakushi/relayer test
pnpm --filter @kakushi/app typecheck
```

URL: https://kakushi-arc.vercel.app
Frontend: Next.js at `packages/app`; request/response RPC proxy and relayer run as Vercel functions.
The prover stays in a browser worker. Chain logs provide indexing. No database, daemon or paid resource is needed.
The hosted relayer reuses the existing dedicated Arc testnet role key, never the deployer, and rejects mainnet.
Its existing proof, denomination, simulation and gas-cost checks are retained; requests have a 128 KiB limit and a 60-second function budget.
Each warm instance serializes submissions; separate cold instances can race for a nonce, so a rejected relay may require retry. This is a low-volume testnet endpoint, not a production transaction queue.
The original hosting smoke check was read-only. Round 2 subsequently verified real hosted widget payments and browser-proved withdrawal; see [round-2 receipts](E2E-TESTNET.md#round-2-hosted-browser-product-pass).

Env: `KAKUSHI_NETWORK=testnet`, `ARC_RPC_URL=https://rpc.testnet.arc.io`, secret `RELAYER_KEY` from `.run/testnet.env` copied into gitignored `.env.local` and uploaded via stdin.
Deployment: link `kakushi-arc` from the repo root, set Root Directory `packages/app`, then `vercel deploy --prod --yes`.
`.vercelignore` excludes env, role files, fork state and build artifacts; circuits and public deployment JSON remain included.
Checks: remote production build and local typecheck pass; existing relayer tests 11/11 pass. Production invalid request returns 400; oversized request returns 413.
Browser checks cover all five navigation routes, the embedded payment entry, live deployment/relayer configuration and deployed pool bytecode; results/screenshots are in `docs/screens/hosted/`.
The original smoke script remains read-only. `pnpm e2e:browser` is the expanded read-only route/navigation/snippet check; `LIVE=1 pnpm e2e:browser` additionally uses pre-funded throwaway keys (see E2E-TESTNET.md). COOP `same-origin` and COEP `require-corp` are applied to every route and worker chunk for SharedArrayBuffer. The hosted worker and WASM paths were exercised successfully in round 2.

## Courier rebrand deployment

2026-10-14: deployed the private execution layer positioning, supplied courier assets and logo metadata to the existing project. Deployment: https://kakushi-l45u3ql8z-nicolas-projects-f497bb7f.vercel.app, alias https://kakushi-arc.vercel.app. Explicit deployment overrides and project production env now set `KAKUSHI_NETWORK=testnet`, `ARC_RPC_URL=https://rpc.testnet.arc.io`. The preflight found inherited mainnet config and stopped before wallet connection; no mainnet signing/broadcast occurred. Hosted config and proxied RPC both verified as 5042002. `node scripts/e2e-browser-rebrand.mjs` passes all ten route/viewport checks and eight nav clicks. New payment/receive receipts and the budget-limited shield/withdraw exclusion: [rebrand evidence](REBRAND-TESTNET.json).
