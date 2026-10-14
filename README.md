# Kakushi on Arc

**The privacy layer for Arc: drop private USDC payments into any app.** Integrate the source SDK with your own interface or embed `<KakushiPay>` beside your checkout. The widget resolves a recipient, approves USDC, pays a fresh stealth address and returns a confirmed receipt. Shielded pools and a gasless withdrawal relayer are separate building blocks when you need to break the deposit-to-withdrawal link.

**Live (testnet):** stealth registration, payment, receive scan, shielding and browser-proved relayer withdrawal. **Fork:** local rehearsals are separate evidence. **Not run:** mainnet deployment. Stealth hides the recipient link; the sender and amount stay public. Independent pool deposits matter for privacy.

## Integrate in three steps

1. Clone this repository and run `pnpm install`. `@kakushi/sdk` and `@kakushi/widget` are workspace source packages, **not published npm packages**.
2. Copy the typechecked [Arc client setup](packages/app/src/examples/arc.ts) alongside [Checkout.tsx](packages/app/src/examples/Checkout.tsx), then render `<Checkout to={recipient} />`. It embeds `<KakushiPay to={to} amount="0.01" ... />` with real clients and testnet addresses. The recipient registers on Receive or supplies a stealth meta-address.
3. Handle the widget’s confirmed `onPaid` receipt. Verify amount, asset and chain server-side before fulfilling an order. For a custom interface, use the complete [SDK payment example](packages/app/src/examples/send.ts).

The app’s `/developers` page displays these exact source files, copied by `scripts/sync-examples.mjs` before build/typecheck, with explorer links for every deployed contract. `/` contains the real 0.01 USDC widget and the privacy limits.

## What works

Deployed on **Arc testnet** (chain 5042002, deploy block 67017441) and exercised there with real transactions and real UltraHonk proofs; every hash links to the explorer in [`docs/E2E-TESTNET.md`](docs/E2E-TESTNET.md). The same loop also runs on an Arc Foundry fork ([`docs/E2E-FORK.md`](docs/E2E-FORK.md)).

| Step | What happens (live on testnet) |
| --- | --- |
| Shield | Alice deposits 1 USDC into the `USDC-1` pool behind a commitment (`approve` + `deposit`). |
| Send | Alice pays Bob 0.1 USDC in one `StealthPay.sendToken` transaction. The USDC lands on a one-time address that nothing on chain ties to Bob's wallet. |
| Receive | Bob scans the ERC-5564 announcer through the public RPC (5,000-block pages), finds the payment and derives the stealth key. |
| Withdraw | A proof is generated, a relayer submits it, and a brand-new address with no balance receives 0.865625 USDC. The relayer is repaid 0.134375 USDC from the note and the recipient never sends a transaction. Replays are refused. |
| In the browser | The web app does the same through its UI: Receive finds the payment, Send pays a registered wallet, and Withdraw **proves in a web worker in about 12 s** and relays gaslessly (tx in `docs/E2E-TESTNET.md` section 7). |

| Contract | Arc testnet |
| --- | --- |
| StealthRegistry (ERC-6538) | [`0xc79A4Aa7396c3e67ee461C3A92fFc4258e49361B`](https://explorer.testnet.arc.io/address/0xc79A4Aa7396c3e67ee461C3A92fFc4258e49361B) |
| StealthAnnouncer (ERC-5564) | [`0x106364d30fBE8F05ca83b9c0F202EAE41b2C8a3e`](https://explorer.testnet.arc.io/address/0x106364d30fBE8F05ca83b9c0F202EAE41b2C8a3e) |
| StealthPay | [`0x234384Adcbcbaf68145A42f13b0E666444961C0e`](https://explorer.testnet.arc.io/address/0x234384Adcbcbaf68145A42f13b0E666444961C0e) |
| ShieldedWithdrawVerifier (UltraHonk) | [`0x6BcCd21b9f5A7eA3D3bA99310B100c8EC6c29120`](https://explorer.testnet.arc.io/address/0x6BcCd21b9f5A7eA3D3bA99310B100c8EC6c29120) |
| KakushiPool USDC-1 / USDC-10 / USDC-100 | [`0x5f75F493D98DC89E9cD79e160be66FB61Dff42A4`](https://explorer.testnet.arc.io/address/0x5f75F493D98DC89E9cD79e160be66FB61Dff42A4) / [`0x32d29e83f6E9fD7618cd52bCFb3af63fFf195C8c`](https://explorer.testnet.arc.io/address/0x32d29e83f6E9fD7618cd52bCFb3af63fFf195C8c) / [`0x90bbBC5A461819620F5929eDa05e36814a7DB913`](https://explorer.testnet.arc.io/address/0x90bbBC5A461819620F5929eDa05e36814a7DB913) |

Tests: 30 Foundry tests (including real Noir/UltraHonk proofs verified by the generated Solidity verifier), 14 Noir circuit tests (prior verified run; current sandbox blocks Nargo’s home-directory cache lock), 65 TypeScript tests (SDK, prover, relayer, widget, config, app copy guard). The Foundry tests run Circle's FiatToken v2.2 bytecode etched at `0x3600…0000` with the same `USDC`/`2` EIP-712 domain, 6 decimals, blocklist and pause behavior as Arc's USDC.

## Arc stack

| Arc / Circle primitive | How Kakushi uses it |
| --- | --- |
| USDC as the gas token | The relayer's fee, its gas and the pool asset are the same asset, so there is no FX or oracle step. A stealth address that only ever received USDC can send transactions. No top-up that links a fresh wallet to an old one. |
| USDC ERC-20 at `0x3600…0000` (6 decimals) | The only pool asset. There are no native-coin pools: on Arc the native balance is the same USDC with 18-decimal accounting, and mixing the two would be off by 1e12. The relayer converts gas cost (18-dec wei) to fee units (6-dec) with `ceil(wei / 1e12)`. |
| Deterministic sub-second finality | Shield, pay and relay without waiting for confirmations. |
| Circle blocklist / FiatToken | A blocklisted recipient makes a withdrawal revert and the note stays unspent, so the holder can withdraw elsewhere (tested). |
| Arc Foundry | Tests and the fork e2e run on `anvil --network arc` forks. |
| Not used (next) | CCTP/Gateway funding from other chains, EIP-3009 gasless deposits, USYC yield on idle pool funds. Arc's own opt-in privacy sector is on Arc's roadmap and not live; Kakushi works today on the public EVM. |

## Architecture

| Piece | Where |
| --- | --- |
| Contracts: `StealthRegistry` (ERC-6538), `StealthAnnouncer` (ERC-5564), `StealthPay`, `KakushiPool` (USDC-only), generated UltraHonk `ShieldedWithdrawVerifier`, `Poseidon2` | `packages/contracts` (Foundry) |
| Circuit: `shielded_withdraw` (Noir, depth-20 Poseidon2 tree) | `packages/zk` |
| Prover, tree and note logic (Node and browser) | `packages/prover` |
| SDK: stealth keys, scan, notes, witnesses, relayer client | `packages/sdk` |
| Relayer: validates, simulates, checks fee >= gas, submits | `packages/relayer` |
| `<KakushiPay>` widget and `useKakushiPay` hook | `packages/widget` |
| Web app: Pay, Receive, Shield (deposit and withdraw), Developers | `packages/app` (Next.js) |

Pools are fixed at 1, 10 and 100 USDC. Each pool has an immutable cap on the number of notes it will ever accept (5,000 / 2,000 / 1,000, so at most 5k / 20k / 100k USDC at rest). There is no owner, no upgrade path and no pause.

## Run it

Requirements: Node 22.18+, pnpm 10.29.2, [Arc Foundry](https://docs.arc.io/arc/tutorials/install-arc-foundry.md) (`forge`, `anvil`), nargo 1.0.0-beta.22 and bb 5.0.0-nightly.20260522 (see `packages/zk/TOOLCHAIN`).

```bash
pnpm install
pnpm contracts:test      # 30 Foundry tests with real proofs (uses the FFI prover in packages/prover)
pnpm zk:test             # 14 Noir tests;  pnpm zk:verifier --check  re-derives the verifier and fails on a diff
pnpm test                # TypeScript tests
# the full loop LIVE on Arc testnet (fresh keys in .run/, funded from DEPLOYER_ENV_FILE, about 2.6 USDC):
node scripts/e2e-testnet.ts                                                  # writes docs/E2E-TESTNET.md
# the full loop on a fork (one anvil at a time):
anvil --network arc --fork-url https://rpc.testnet.arc.io --port 9200 &   # Arc Foundry's anvil
ARC_RPC_URL=http://127.0.0.1:9200 node scripts/e2e-fork.ts                # writes docs/E2E-FORK.md
```

The app: `pnpm --filter @kakushi/app build` and `pnpm --filter @kakushi/app start` (port 9210). It reads `deployments/arc-<network>.json`; `.env.example` lists every variable. Use `KAKUSHI_DEPLOYMENT_FILE` and `ARC_RPC_URL` to point it at a fork.

## Deploy

`scripts/deploy.sh testnet|mainnet [--dry-run]`. Mainnet requires `CONFIRM_MAINNET=yes`. See [MAINNET.md](MAINNET.md) for commands, gas, services and environment. A full deploy is about 18.7M gas, roughly 0.4 USDC at Arc's current fees.

## Honest limits

- **Not audited.** The Noir circuit and Solidity verifier come from the earlier Monad project and have had no external review. Pools are capped and immutable, so a bug cannot be patched and the cap is the damage limit.
- **Testnet only.** It is deployed and exercised on Arc testnet; nothing is on Arc mainnet yet (`scripts/deploy.sh mainnet` is dry-run tested against the mainnet RPC). The frontend and HTTP relayer are hosted at https://kakushi-arc.vercel.app; see [hosting checks](docs/HOSTED.md).
- **Anonymity sets are small.** Recorded deposits are our own test transactions, so they do not demonstrate meaningful anonymity. Privacy grows with the number of independent deposits; with a handful of notes, timing and amount can still link a deposit to a withdrawal.
- **What stays public.** A stealth payment hides who the recipient is, not the amount or the sender. Pool deposits and withdrawals are public transactions; the proof hides which deposit a withdrawal spends.
- **The relayer is one operator.** It cannot steal funds (recipient, relayer and fee are bound in the proof) but it can censor or go offline. Anyone can withdraw from their own wallet instead, paying USDC gas. The live relayer quoted 0.134375 USDC per withdrawal (13% of the 1 USDC pool, the price of about 3.64M gas), so the relayer omits pools where the fee exceeds 30% of the note.
- **Circle controls USDC.** Circle can blocklist or pause USDC, which would freeze the pools like every USDC contract.
- **Your note is your funds.** Lose it and nothing recovers the deposit.
- **Browser proving** works: one withdrawal was proved in a web worker in headless Chromium (12.0 s, 15 s click to done) and settled on testnet. It was driven by a scripted wallet stand-in, not a real MetaMask session, and not measured on a phone.
- **Receive scans from the deploy block** in 5,000-block `eth_getLogs` pages (Arc's public RPC limit), sequentially with bounded backoff on RPC throttling. Fine for a beta; a private RPC or an indexer is the next step.

## Next: FHE (not shipped)

The original Kakushi also has an FHE side (encrypted balances and amounts on a tfhe-rs engine with a coprocessor and KMS) that hides how much is paid, not just who. It is **not** part of this port and nothing here is encrypted-balance technology: it needs its own engine and key custody and has no Arc deployment, so the next step is to bring it up on Arc and combine an encrypted amount with a stealth address.

## License

MIT.

## Hosted testnet

https://kakushi-arc.vercel.app — Next.js UI, RPC proxy and gasless withdrawal HTTP handler on Vercel. No always-on service. [Checks and limits](docs/HOSTED.md).
