# Kakushi on Arc

**Private USDC payments on Circle's Arc.** Pay anyone in USDC without publishing a link between you and them: one-time stealth addresses for payments, a zero-knowledge USDC pool for unlinking, and a relayer that submits withdrawals for you and is paid in USDC out of the withdrawn note. Gas on Arc is USDC, so a fresh, empty wallet can receive, hold and spend dollars without ever touching another token.

This repo is the zero-knowledge side of [Kakushi](https://github.com/nickthelegend/kakushi), ported from Monad to Arc.

## What works

Proven on an Arc Foundry fork of Arc testnet with real signed transactions and real UltraHonk proofs ([`docs/E2E-FORK.md`](docs/E2E-FORK.md) has every transaction hash):

| Step | What happens |
| --- | --- |
| Shield | Alice deposits 10 USDC into a pool behind a commitment (`approve` + `deposit`). |
| Send | Alice pays Bob 25 USDC in one `StealthPay.sendToken` transaction. The USDC lands on a one-time address that nothing on chain ties to Bob's wallet. |
| Receive | Bob scans the ERC-5564 announcer with his viewing key, finds the payment, derives the stealth key, and shields 10 USDC from that address. The address held only USDC and paid its gas in USDC. |
| Withdraw | A proof is generated, the relayer submits it, and a brand-new address with no balance receives 9.887125 USDC. The relayer is repaid in USDC from the note (0.112875), nets more than its gas, and the recipient never sends a transaction. Replays are refused. |

Tests: 30 Foundry tests (including real Noir/UltraHonk proofs verified by the generated Solidity verifier), 14 Noir circuit tests, 60 TypeScript tests (SDK, prover, relayer, widget, config). The Foundry tests run Circle's FiatToken v2.2 bytecode etched at `0x3600…0000` with the same `USDC`/`2` EIP-712 domain, 6 decimals, blocklist and pause behavior as Arc's USDC.

## Arc stack

| Arc / Circle primitive | How Kakushi uses it |
| --- | --- |
| USDC as the gas token | The relayer's fee, its gas and the pool asset are the same asset, so there is no FX or oracle step. A stealth address that only ever received USDC can send transactions. No top-up that links a fresh wallet to an old one. |
| USDC ERC-20 at `0x3600…0000` (6 decimals) | The only pool asset. There are no native-coin pools: on Arc the native balance is the same USDC with 18-decimal accounting, and mixing the two would be off by 1e12. The relayer converts gas cost (18-dec wei) to fee units (6-dec) with `ceil(wei / 1e12)`. |
| Deterministic sub-second finality | Shield, pay and relay without waiting for confirmations. |
| Circle blocklist / FiatToken | A blocklisted recipient makes a withdrawal revert and the note stays unspent, so the holder can withdraw elsewhere (tested). |
| Arc Foundry | Tests and the e2e run on `anvil --network arc` forks. |
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
| Web app: Send, Receive, Shield (deposit and withdraw), Plugin | `packages/app` (Next.js) |

Pools are fixed at 1, 10 and 100 USDC. Each pool has an immutable cap on the number of notes it will ever accept (5,000 / 2,000 / 1,000, so at most 5k / 20k / 100k USDC at rest). There is no owner, no upgrade path and no pause.

## Run it

Requirements: Node 22.18+, pnpm 10.29.2, [Arc Foundry](https://docs.arc.io/arc/tutorials/install-arc-foundry.md) (`forge`, `anvil`), nargo 1.0.0-beta.22 and bb 5.0.0-nightly.20260522 (see `packages/zk/TOOLCHAIN`).

```bash
pnpm install
pnpm contracts:test      # 30 Foundry tests with real proofs (uses the FFI prover in packages/prover)
pnpm zk:test             # 14 Noir tests;  pnpm zk:verifier --check  re-derives the verifier and fails on a diff
pnpm test                # TypeScript tests
# the full loop on a fork (one anvil at a time):
anvil --network arc --fork-url https://rpc.testnet.arc.io --port 9200 &   # Arc Foundry's anvil
ARC_RPC_URL=http://127.0.0.1:9200 node scripts/e2e-fork.ts                # writes docs/E2E-FORK.md
```

The app: `pnpm --filter @kakushi/app build` and `pnpm --filter @kakushi/app start` (port 9210). It reads `deployments/arc-<network>.json`; `.env.example` lists every variable. Use `KAKUSHI_DEPLOYMENT_FILE` and `ARC_RPC_URL` to point it at a fork.

## Deploy

`scripts/deploy.sh testnet|mainnet [--dry-run]`. Mainnet requires `CONFIRM_MAINNET=yes`. See [MAINNET.md](MAINNET.md) for commands, gas, services and environment. A full deploy is about 18.7M gas, roughly 0.4 USDC at Arc's current fees.

## Honest limits

- **Not audited.** The Noir circuit and Solidity verifier come from the earlier Monad project and have had no external review. Pools are capped and immutable, so a bug cannot be patched and the cap is the damage limit.
- **Not deployed to a public network yet.** The shared deployer wallet was unfunded; everything above ran on a fork. The deploy script is dry-run tested against live testnet and mainnet RPCs.
- **Small anonymity sets.** Pools start empty. Privacy grows with the number of deposits in a pool; with a handful of notes, timing and amount can still link a deposit to a withdrawal.
- **What stays public.** A stealth payment hides who the recipient is, not the amount or the sender. Pool deposits and withdrawals are public transactions; the proof hides which deposit a withdrawal spends.
- **The relayer is one operator.** It cannot steal funds (recipient, relayer and fee are bound in the proof) but it can censor or go offline. Anyone can withdraw from their own wallet instead, paying USDC gas. A relayer fee of about 0.11 USDC is a large share of the 1 USDC pool, so the relayer omits pools where the fee exceeds 30% of the note.
- **Circle controls USDC.** Circle can blocklist or pause USDC, which would freeze the pools like every USDC contract.
- **Your note is your funds.** Lose it and nothing recovers the deposit.
- **Browser proving** is built (a web worker running noir_js and bb.js) and typechecks and builds, but I verified proofs end to end in Node and forge, not in a browser wallet session.
- **Receive scans from the deploy block** in 5,000-block `eth_getLogs` pages (Arc's public RPC limit), 6 in parallel. Fine for a beta; a private RPC or an indexer is the next step.

## Next: FHE

The original Kakushi also has an FHE side (encrypted balances and amounts on a tfhe-rs engine with a coprocessor and KMS) that hides how much is paid, not just who. It is not part of this port: it needs its own engine and key custody and has no Arc deployment, so the next step is to bring it up on Arc and combine an encrypted amount with a stealth address.

## License

MIT.
