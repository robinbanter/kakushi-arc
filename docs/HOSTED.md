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
No withdrawal, funding or other transaction was sent during hosting verification.

Env: `KAKUSHI_NETWORK=testnet`, `ARC_RPC_URL=https://rpc.testnet.arc.io`, secret `RELAYER_KEY` from `.run/testnet.env` copied into gitignored `.env.local` and uploaded via stdin.
Deployment: link `kakushi-arc` from the repo root, set Root Directory `packages/app`, then `vercel deploy --prod --yes`.
`.vercelignore` excludes env, role files, fork state and build artifacts; circuits and public deployment JSON remain included.
Checks: remote production build and local typecheck pass; existing relayer tests 11/11 pass. Production invalid request returns 400; oversized request returns 413.
Browser checks cover all five navigation routes, the embedded payment entry, live deployment/relayer configuration and deployed pool bytecode; results/screenshots are in `docs/screens/hosted/`.
Wallet connection, browser proof generation and signed payment remain outside this read-only smoke check.
