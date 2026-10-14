# Round 2 — hosted product quality, 2026-10-14

LEAD: RUN THESE (from `kakushi-arc`)

```sh
pnpm e2e:browser
pnpm lint && pnpm typecheck && pnpm test
pnpm --filter @kakushi/app build
pnpm zk:test
(cd packages/contracts && "../../../.tools/arcfoundry/forge" test -j 1)
```

[Open the hosted product](https://kakushi-arc.vercel.app). Before = `1215825`; after = this round. Scores are strict /10, based on what a cold judge can actually use. Previous-round text below is historical, including its superseded hosting/mainnet limitations.

| Criterion | Before → after | Reason |
|---|---|---|
| Relevance to Arc | 8 → 8 | USDC pays for payments, stealth recovery and relayer gas; 6/18-decimal accounting exercised live. No additional Arc integration added merely for scoring. |
| Technical credibility | 7 → 8 | Fresh-wallet hosted payment and real browser UltraHonk proof settle on public testnet. Worker/WASM paths and isolation verified. Still unaudited, single relayer. |
| Build quality | 7 → 8 | Fixed note-copy safety, account changes, gas guidance, contrast/focus and loading. All five routes at both widths, lint/typecheck/build and 109 tests green. |
| Worth taking further | 7 → 8 | The plug-and-play SDK/widget story now has a repeatable hosted checkout, serverless relay and compiled copyable examples. Source-only packages still add adoption friction. |
| Cold-judge usability | 6 → 8 | Local Connect, faucet, explicit registration steps and 0.01 USDC checkout work with a fresh account; all header routes work on mobile. Requires a browser wallet and faucet funding; no extension or physical-phone test. |

## Findings and resolutions

| Severity | Finding | Resolution / evidence |
|---|---|---|
| P1 | Hosted origin lacked COOP/COEP; multi-threaded proving depended on unverified host behavior | Headers on every document/chunk; isolation preflight and bounded worker timeout. Hosted worker + two WASM assets HTTP 200; proof 5.3 s, verified on-chain. |
| P1 | Widget was disabled for a cold visitor with no nearby Connect or faucet; “enable receiving” omitted the registration click | Local Connect, Circle faucet, Arc Testnet instructions, exact unlock/list/return steps. Fresh wallet completed the flow. |
| P1 | Clicking Copy enabled Deposit even when clipboard access failed | `onCopied` runs only after successful clipboard write. Browser deliberately denies the write and verifies Deposit stays disabled; note download then enables it. |
| P1 | Wallet account changes were ignored; Receive could retain the previous account’s inbox state | Subscribe/unsubscribe to `accountsChanged`; reset Receive state by wallet address. Core live run uses one fresh account. |
| P2 | Pay balance shortcut selected every USDC unit, leaving none for gas | Balance is informational; explicit USDC gas reserve guidance. |
| P2 | “Only the recipient can find it” overstated stealth secrecy; sender already knows the destination | Receipt and Pay copy say sender/amount remain public; self-payment instructions disclose that moving back links wallets. |
| P2 | Developers, README and submission contradicted the newer mainnet deployment record | Hosted demo remains explicitly testnet. Link existing mainnet evidence separately; no mainnet verification or broadcast performed in this round. |
| P2 | Shield briefly rendered nothing while loading; deposit controls could change during wallet confirmation | Loading state; busy state begins before wallet connection and disables pool selection. |
| P2 | Input placeholders and code strings were too dim, and form input focus was invisible | Use readable text tokens and explicit focus outlines. Preserve the incumbent navy/blue visual system. |
| P2 | No lint command or reproducible full hosted product run | Added ESLint for app/widget/SDK and a local Playwright dependency; `pnpm e2e:browser` covers all routes, header navigation, clipboard snippets and error states. |

## What actually ran

- **Live (testnet):** fresh registration → embedded widget pays 0.01 USDC → Receive finds and moves it → Pay sends 0.01 USDC → save note → deposit 1 USDC → browser proof → hosted Vercel relayer withdrawal. [Receipts](E2E-TESTNET.md#round-2-hosted-browser-product-pass), [raw evidence/budget/sweeps](ROUND2-TESTNET.json).
- **Hosted proof:** `crossOriginIsolated=true`; worker/WASM fetches 200, no failed proof requests; recipient started at zero, received 0.865625 USDC, nonce zero before cleanup. Proof 5.3 s; complete withdrawal 24.894 s.
- **Screens:** `/`, `/send`, `/receive`, `/shield`, `/developers` at 1440×1000 and 390×1000. No overflow/broken images. Eight header route clicks, home/hero links, developer tabs/copy, missing-wallet and malformed-note states; 404 checked separately. Screens/evidence: `docs/screens/testnet/round2-*`.
- **Snippets:** arc.ts, Checkout.tsx and send.ts are compiled as source by app typecheck; the final browser check compares their copied text with those exact files. Packages explicitly remain unpublished.
- **Checks:** 65 TypeScript tests, 30 Arc Foundry tests and 14 Noir tests pass; lint, workspace typecheck, local and Vercel builds pass. Impeccable detector: zero findings on changed page surfaces.
- **Budget:** 0.250525 USDC new deployer outlay including gas; 0.86 USDC recycled from prior test principal. Total gas 0.121517875 USDC. Swept 0.950820925 USDC to deployer; fresh payer/recipient balances zero. One stealth remainder of 0.00049355 USDC is below transfer gas. No mainnet broadcasts, forks, local servers or paid infrastructure created.

## Remaining weaknesses / honest scope

No independent anonymity set or audit; timing and consolidation can reveal links. Relayer fee is 13.4375% of a 1 USDC note and its single operator can censor or go offline. Concurrent serverless instances can race on a relayer nonce. Native mobile/MetaMask/Rabby extension UX, 10/100 USDC browser deposits and self-paid withdrawal are **Not run** this round. The tests use a real-signing EIP-1193 bridge in desktop Chromium, including the mobile viewport; faucet dispensing itself was not automated. FHE remains explicitly unshipped. No mock payment responses or decorative “live” balances were introduced. **Fork:** only historical evidence, no fork run this round.

---

# Historical round 1

# Judge + fix pass, 2026-10-14 (Arc testnet only)

Criteria from the DoraHacks page. Scores are /10, strict. "Before" is the repo at `36ba3a0` (contracts deployed to testnet, but
no live run, README still said "not deployed", browser proving never run). "After" is this commit.
Budget used: 2.59 USDC of the shared deployer's testnet USDC (3 funding transfers: Alice 2.25, relayer 0.30, Bob 0.03, plus
their gas); only the 1 USDC pool was used.

| Criterion | Before | After | Why |
|---|---|---|---|
| Relevance to Arc | 6 | 8 | USDC as gas is load-bearing: the relayer's fee, its gas and the pool asset are one asset, a stealth address holding only USDC pays its own gas, and the 18-dec native / 6-dec ERC-20 conversion is handled and now seen live (fee 0.134375 USDC for 3.64M gas). Not 9: no CCTP/Gateway/USYC use, no Arc-native primitive beyond USDC gas and finality. |
| Technical credibility | 5 | 7 | Before: everything was fork-only and the docs said so. After: the whole loop ran on the public testnet with real UltraHonk proofs (hashes in `docs/E2E-TESTNET.md`), and the in-browser proving path ran. Held back by: no audit, circuit and verifier reused from the Monad project, anonymity sets are empty. |
| Quality of what was built | 7 | 8 | 30 Foundry + 14 Noir + 62 TS tests pass, typecheck clean, 5 routes x 2 widths with no console errors, overflow or Monad text. Fixed: root `pnpm test` was red (the app had no test files), a 7 px mobile overflow on Receive, stale hard-coded fee numbers. |
| Worth taking further | 6 | 7 | A real private-payments primitive on a chain with no native privacy yet, with a plugin widget. Weak: single relayer, fixed denominations, no hosted app, FHE side not shipped. |
| Cold-judge usability (extra) | 5 | 7 | Before: no explorer links, nothing a judge could click. After: README and walkthrough lead with explorer-linked live transactions; the app runs against the live deployment with one command. Still needs a local run (no hosted URL) and a relayer key for gasless withdrawals. |

## 1. Claims audit

| Claim (where) | Reality | Fix |
|---|---|---|
| "Not deployed to a public network yet ... everything above ran on a fork" (README, SUBMISSION, walkthrough) | Stale: deployed on Arc testnet at block 67017441 | Rewrote to live; contract table with explorer links; fork run kept and labelled |
| "Proven on an Arc Foundry fork" as the headline (README) | True but now incomplete | Headline is the live testnet run; fork run second |
| Shield / stealth send / receive / gasless withdraw "works" | Verified live on testnet (`docs/E2E-TESTNET.md`): shield 1 USDC, pay 0.1 USDC, scan finds it, relayer withdrawal to a 0-balance address, replay refused | Recorded |
| "Proofs run in your browser" (landing, FAQ) | Was unverified. Now verified: one withdrawal proved in a web worker in headless Chromium, 12.0 s, 15 s click to done, settled on testnet | Kept; README says it was a scripted wallet stand-in on desktop |
| Receive scan "5,000-block pages" on the public RPC | Verified: 4 pages in 1.0 s from Node, 1.7 s in the app through `/api/rpc` | Recorded |
| "Fee about 0.11 USDC at today's gas price" (landing Fees) | Live quote is 0.134375 USDC for the 1 USDC pool (13% of the note) | Reworded with the measured figure |
| "Fresh wallet gets 9.89 USDC / Fee 0.11 USDC" (landing "How" visual, 10 USDC pool numbers) | Fork numbers shown as if current | Now "0.87 USDC" and "Example from the live 1 USDC pool: fee 0.13 USDC" |
| "A withdrawal measured about 3.6M gas, a few cents" | 3.64M gas = 0.091 USDC | "roughly 0.09 USDC on testnet" |
| "Done in under a second" (landing) | Arc's published finality, not something this repo measured | "Final in under a second" with "Arc's published finality is sub-second" |
| "The live demo" (widget demo copy) / "Any shop's checkout" | A made-up shop whose payment is real | Relabelled "Sample checkout (real payment, testnet USDC)" |
| "Relayer fee about 0.11 USDC is a large share" (README) | 0.134375 USDC, 13% | Updated |
| "Small anonymity sets. Pools start empty" (README) | Understated: the only deposits are our own two, from one wallet, both withdrawn | Said so plainly: pools give no real privacy today |
| "Browser proving ... not verified" (README) | Now verified | Updated |
| FHE | Not shipped | README "Next: FHE (not shipped)"; SUBMISSION says it is next |
| "Audited / production" | Neither claimed anywhere; the app and README say "not audited" | New `packages/app/test/copy.test.ts` fails if the app copy ever says otherwise or mentions Monad/MON/AUSD |
| Circuit and verifier origin | Reused from the Monad project | Stated in README limits and SUBMISSION (not in the app UI) |

Still reading as unverified: "Tested against Circle's FiatToken v2.2 bytecode" is true of the Foundry suite (etched
bytecode), not of the live USDC; the fork run and the live run exercise the real contract.

## 2. Mocks audit

grep of `packages/app/src`, `packages/widget/src` for mock, stub, fake, lorem, TODO, sample, demo, simulated, placeholder:
only input `placeholder=` attributes and doc comments. No stubbed responses, no hard-coded chain numbers except the two
illustrative figures fixed above. The shared `packages/ui` doc comments said "AUSD" in unused example snippets; changed to USDC. The widget demo is a real payment
against the deployed contracts. `packages/app/test/copy.test.ts` now fails if the app source mentions Monad/MON/AUSD/Kuru/Privy
or claims to be audited.

## 3. Screens audit (production build, live testnet deployment, Playwright)

Routes: `/`, `/send`, `/receive`, `/shield`, `/developers`, plus the 404, at 1440x900 and 390x844. Result: all 200
(404 expected), 0 console errors, 0 failed requests, 0 horizontal overflow after the Receive fix, no
Monad/MON/AUSD/lorem/undefined/NaN text, empty-wallet states read sensibly ("Connect wallet", no crash), explorer links go to
explorer.testnet.arc.io. Lazy images below the fold report "not complete" in the first-paint check but the image URLs
return 200. Screenshots: `docs/screens/testnet/` (route pages, plus Send ready/done, Receive with the found payment,
Shield withdraw ready/done). Bug found and fixed: Receive's "Listed on Arc Testnet: anyone can pay your wallet address" pill
overflowed the 390 px screen by 7 px once a wallet was connected.

One app server (port 9210) and one relayer (port 9202) were started and stopped by PID.

## 4. Feature check (live, real transactions)

See `docs/E2E-TESTNET.md` for every hash.

- Shield: 2 x 1 USDC into `USDC-1` (one note for Node, one for the browser).
- Stealth pay: 0.1 USDC to Bob through `StealthPay`; Bob registered his meta-address in the ERC-6538 registry first.
- Receive: Bob's scan through the public RPC finds exactly that payment and derives the key; the app's Receive page shows it.
- Relayer withdrawal from Node: fresh address got 0.865625 USDC, nonce 0, replay refused.
- Browser withdrawal: proved in a web worker in 12.0 s; fresh address got 0.865625 USDC, nonce 0.
- Browser Send: Alice's 0.05 USDC to Bob's wallet address resolved through the registry and landed.

## What is still weak

- Anonymity sets are empty; the pools protect nobody until independent users deposit.
- One relayer; a 13% fee on the 1 USDC pool makes small pools expensive (the relayer quote is its gas at the current price).
- No audit; verifier and circuit are reused from Monad.
- No hosted URL; the browser run used a scripted EIP-1193 stand-in, not MetaMask.
- Mainnet not deployed (one command ready).
- The FHE side is not shipped.
