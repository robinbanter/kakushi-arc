# Kakushi private execution layer — 2026-10-14
LEAD: RUN THESE (repo root):
- `node scripts/e2e-browser-rebrand.mjs` — hosted testnet routes, nav, snippets, wallet controls, 1440/390 screenshots.
- `pnpm lint && pnpm typecheck && pnpm test && pnpm --filter @kakushi/app build`
- `pnpm zk:test`; `(cd packages/contracts && '../../../.tools/arcfoundry/forge' test -j 1)`
- Live payment rehearsal: fresh `.run/rebrand.env` via `node scripts/rebrand-wallet.mjs fund`, then `LIVE=pay node scripts/e2e-browser-rebrand.mjs`; recover via `node scripts/rebrand-wallet.mjs sweep`.
- Funding refuses existing role files; archive the previous gitignored run before generating fresh keys. No keys or notes belong in reports.

Changed: courier hero, original mark/mascot, ink/indigo/violet palette, minimal shared header, logo favicon/OG image.
Positioning: “The private execution layer for Arc”; Go hidden → Move unseen → Surface on Arc, with the real widget.
Developers leads with three compiled integration lines, required client setup, and accurate viewing-key disclosure scope.
Landing includes payroll, checkout, sealed-bid-style payout and game-winning applications; no invented auction engine.
Explicit limits: no rollup, no TEE, no arbitrary confidential execution; sender/amount visible; small sets, one relayer, unaudited, FHE next.
README/SUBMISSION and durable design/art provenance updated; supplied pattern absent, so none fabricated.
PASS: lint, workspace typecheck, production build; 65 TypeScript + 30 Arc Foundry + 14 Noir tests.
PASS: 10 local and 10 hosted route/viewport checks, eight header links, source-exact copied snippets, wallet disconnect/account changes, invalid-note/missing-wallet states.
Screens: `docs/screens/testnet/rebrand-*`; images decoded before capture, no overflow or console errors. Visual review performed inline under the one-agent rule; detector returned no findings.
Hosting: existing Vercel project; testnet network/RPC explicitly set after a preflight caught inherited mainnet configuration. No mainnet transaction was signed or broadcast.
Live: register → widget pay 0.01 → receive → move; outlay 0.080525 USDC, recovered 0.07103915, net 0.00948585. Receipts: `REBRAND-TESTNET.json`.
New shield/withdraw: Not run under the ≤0.5 USDC gross cap; minimum deployed pool is 1 USDC. Earlier complete browser proof/relay receipts remain in E2E-TESTNET.md.
Full harness requires explicit `ALLOW_ONE_USDC_DEPOSIT=1` plus `LIVE=1`; that authorization was requested and not assumed.
Still weak: SDK/widget unpublished, auditor export UI next, public RPC throttling, small anonymity sets, single relayer, no external audit.
Pushed: `3a44355` (rebrand + evidence); preserved supplied art/prior evidence in `9392c6b`. Report-only follow-up is the latest commit. Tree clean; both local servers stopped by PID, browsers closed; no fork or paid resource created.
