# End-to-end on Arc testnet (live)

Run `2026-10-13T18:48:26.324Z` by `node scripts/e2e-testnet.ts` against the public Arc testnet RPC (https://rpc.testnet.arc.io, chain 5042002). Every transaction below is real and public: the hashes link to https://explorer.testnet.arc.io. Every withdrawal verifies a real Noir/UltraHonk proof on-chain in the deployed verifier. The contracts are the ones in `deployments/arc-testnet.json`.

Accounts are fresh random keys funded from the shared deployer wallet (about 2.6 USDC in total); the withdrawal recipient is a fresh key that starts with 0 USDC and never sends a transaction. A single relayer (its own fresh key, funded with 0.3 USDC) submits the withdrawal and is repaid in USDC.

## 0. Network, deployment and funding

- RPC https://rpc.testnet.arc.io, chain 5042002, block 67033592. Contracts from deployments/arc-testnet.json (deployed at block 67017441).
- Pool USDC-1: [`0x5f75F493D98DC89E9cD79e160be66FB61Dff42A4`](https://explorer.testnet.arc.io/address/0x5f75F493D98DC89E9cD79e160be66FB61Dff42A4), StealthPay [`0x234384Adcbcbaf68145A42f13b0E666444961C0e`](https://explorer.testnet.arc.io/address/0x234384Adcbcbaf68145A42f13b0E666444961C0e), announcer [`0x106364d30fBE8F05ca83b9c0F202EAE41b2C8a3e`](https://explorer.testnet.arc.io/address/0x106364d30fBE8F05ca83b9c0F202EAE41b2C8a3e), registry [`0xc79A4Aa7396c3e67ee461C3A92fFc4258e49361B`](https://explorer.testnet.arc.io/address/0xc79A4Aa7396c3e67ee461C3A92fFc4258e49361B), verifier [`0x6BcCd21b9f5A7eA3D3bA99310B100c8EC6c29120`](https://explorer.testnet.arc.io/address/0x6BcCd21b9f5A7eA3D3bA99310B100c8EC6c29120)
- Accounts are fresh throwaway keys (kept in a gitignored file): Alice (payer) [`0x592b6c6Ec103D404229E1f432544883cb84C56df`](https://explorer.testnet.arc.io/address/0x592b6c6Ec103D404229E1f432544883cb84C56df), Bob (recipient) [`0xC67284Db22B657dF2d90C9815aecD8b9283969b3`](https://explorer.testnet.arc.io/address/0xC67284Db22B657dF2d90C9815aecD8b9283969b3), relayer [`0xAF4CD54d331dEb3418046772346acC86C90A6b16`](https://explorer.testnet.arc.io/address/0xAF4CD54d331dEb3418046772346acC86C90A6b16).
- Pool state before: 0 USDC held, 0 deposits so far.
- Funded from the shared deployer wallet (capped at 3 USDC): Alice 2.25 USDC, Bob 0.03 USDC, relayer 0.3 USDC.

| Transaction | Hash | Gas used | Gas cost (USDC) |
| --- | --- | --- | --- |
| deployer -> Alice: USDC.transfer(2.25) | [`0x0e066b027654135cea299f1a5f3f088d25b10802dd08cec11a68b6a4af7b9416`](https://explorer.testnet.arc.io/tx/0x0e066b027654135cea299f1a5f3f088d25b10802dd08cec11a68b6a4af7b9416) | 73950 | 0.001849 |
| deployer -> Bob: USDC.transfer(0.03) | [`0x931795cb08d8abb0c4804d9fd16b914b83e94a08267b87abd6de92a8f90de981`](https://explorer.testnet.arc.io/tx/0x931795cb08d8abb0c4804d9fd16b914b83e94a08267b87abd6de92a8f90de981) | 73938 | 0.001849 |
| deployer -> relayer: USDC.transfer(0.3) | [`0xa0348e34d74c93ab8cf88f17579727fa5a549621fddb6620e4b723391fad2ccc`](https://explorer.testnet.arc.io/tx/0xa0348e34d74c93ab8cf88f17579727fa5a549621fddb6620e4b723391fad2ccc) | 73950 | 0.001849 |

## 1. Bob turns on private receiving (ERC-6538)

- Bob's wallet resolves to a stealth meta-address (spending and viewing keys derived from one signature).

| Transaction | Hash | Gas used | Gas cost (USDC) |
| --- | --- | --- | --- |
| registerKeys(1, metaAddress) | [`0x87c6ea0609f2e8e0237f0f6a50d8d1bc6181559432988bdb17a84615424c29b8`](https://explorer.testnet.arc.io/tx/0x87c6ea0609f2e8e0237f0f6a50d8d1bc6181559432988bdb17a84615424c29b8) | 115304 | 0.002883 |

## 2. Shield: Alice deposits 2 x 1 USDC into pool USDC-1

- pool USDC-1 USDC balance 2. Only the commitments are on chain; the notes stay offline (note B is kept in a gitignored file for the in-browser withdrawal check).

| Transaction | Hash | Gas used | Gas cost (USDC) |
| --- | --- | --- | --- |
| USDC.approve(pool, 2) | [`0xe33d5774d32ccadb5760c341d50b94214215741fd8508668c3e58858cde4d29a`](https://explorer.testnet.arc.io/tx/0xe33d5774d32ccadb5760c341d50b94214215741fd8508668c3e58858cde4d29a) | 55438 | 0.001386 |
| pool.deposit(commitment A) | [`0xfe4e45429741b84fbb1d712d63987b81e5818ddc7d94e94d0038c259975850ab`](https://explorer.testnet.arc.io/tx/0xfe4e45429741b84fbb1d712d63987b81e5818ddc7d94e94d0038c259975850ab) | 593673 | 0.014842 |
| pool.deposit(commitment B) | [`0x5ccdf1222ce2e2efe708015d5d946e45e0b289b823ce6dbf993ab37dffb57e0c`](https://explorer.testnet.arc.io/tx/0x5ccdf1222ce2e2efe708015d5d946e45e0b289b823ce6dbf993ab37dffb57e0c) | 568778 | 0.01422 |

## 3. Alice pays Bob privately (ERC-5564 stealth address, 0.1 USDC)

- one-time address [`0xf8CC3965B26D055B045A8E5011a1e2bD7De4Da33`](https://explorer.testnet.arc.io/address/0xf8CC3965B26D055B045A8E5011a1e2bD7De4Da33) (unrelated to Bob's wallet on chain); holds 0.1 USDC.

| Transaction | Hash | Gas used | Gas cost (USDC) |
| --- | --- | --- | --- |
| USDC.approve(StealthPay, 0.1) | [`0x80fc361b4607572d5434a16f7e22202d8ed802d38a8350495d8691e7b6d7f1d1`](https://explorer.testnet.arc.io/tx/0x80fc361b4607572d5434a16f7e22202d8ed802d38a8350495d8691e7b6d7f1d1) | 55438 | 0.001386 |
| StealthPay.sendToken(stealth, USDC, 0.1) | [`0xbb4f40e2dbe3d45c4199f69532d6f2853909189d3a9a870521be625157172b60`](https://explorer.testnet.arc.io/tx/0xbb4f40e2dbe3d45c4199f69532d6f2853909189d3a9a870521be625157172b60) | 98116 | 0.002453 |

## 4. Bob scans the announcer through the public RPC and finds the payment

- Scanned blocks 67017441..67033616 (4 pages of 5,000 blocks, 6 in parallel) in 1.0 s: 1 announcement(s) belong to Bob. Found 0.1 USDC at [`0xf8CC3965B26D055B045A8E5011a1e2bD7De4Da33`](https://explorer.testnet.arc.io/address/0xf8CC3965B26D055B045A8E5011a1e2bD7De4Da33), announced in [0xbb4f40e2…](https://explorer.testnet.arc.io/tx/0xbb4f40e2dbe3d45c4199f69532d6f2853909189d3a9a870521be625157172b60); stealth private key derived and checked.

## 5. Gasless withdrawal through the relayer (fee paid in USDC out of the note)

- relayer [`0xAF4CD54d331dEb3418046772346acC86C90A6b16`](https://explorer.testnet.arc.io/address/0xAF4CD54d331dEb3418046772346acC86C90A6b16) quotes 0.134375 USDC for a USDC-1 withdrawal (that is 13% of the note, the price of gas for a ~3.6M-gas proof verification).
- UltraHonk proof made in Node in 0.5 s (7616 bytes), bound to recipient [`0x7cFaAF83E4c0e122B125282646347982B7776B2f`](https://explorer.testnet.arc.io/address/0x7cFaAF83E4c0e122B125282646347982B7776B2f), relayer and fee.
- [`0x7cFaAF83E4c0e122B125282646347982B7776B2f`](https://explorer.testnet.arc.io/address/0x7cFaAF83E4c0e122B125282646347982B7776B2f) received 0.865625 USDC with zero prior balance and zero transactions sent. Nullifier spent: true.
- Replaying the same proof is refused by the relayer: "withdraw would revert: The contract function "withdraw" reverted.: execution reverted"
- relayer USDC: 0.3 -> 0.343321 (fee 0.134375 received, gas 0.091054 paid)

| Transaction | Hash | Gas used | Gas cost (USDC) |
| --- | --- | --- | --- |
| relayer -> pool.withdraw (Alice's note A, to a fresh address) | [`0xe7f7ffef62b2b466a09c363b97992205355892f045ffe4bf648d66e00cc2cc51`](https://explorer.testnet.arc.io/tx/0xe7f7ffef62b2b466a09c363b97992205355892f045ffe4bf648d66e00cc2cc51) | 3642138 | 0.091054 |

## 6. End state

- pool USDC-1: 1 USDC (note B still unspent, reserved for the browser withdrawal check). Alice 2.25 -> 0.115713 USDC.

## Timings

- Node proof: 0.5 s (noir_js witness + bb.js UltraHonk, Node v26.5.0).
- Receive scan over the public RPC: 1.0 s for 4 pages of 5,000 blocks.
## 7. The same flows through the web app (Playwright, headless Chromium, production build, public Arc testnet)

The app (`pnpm --filter @kakushi/app start`, port 9210) was pointed at the live deployment and one relayer (the key from step 0, port 9202, proxied at `/api/relayer`). The wallet is a scripted EIP-1193 provider inside the page that signs with the throwaway test keys (a stand-in for MetaMask); everything else is the app's real code path.

- **Receive** (`/receive`, Bob): connect, "Unlock with your wallet" (one `personal_sign`), the page shows "Listed on Arc Testnet", scans the announcer through the app's `/api/rpc` proxy to the public RPC in 5,000-block pages and shows `Inbox · 1`: 0.1 USDC at the one-time address `0xf8CC…Da33`, block 67033616. About 1.7 s.
- **Send** (`/send`, Alice): pasting Bob's wallet address resolves his meta-address from the ERC-6538 registry ("Private address found"); 0.05 USDC sent in one click (the allowance was already set by step 3). Tx [`0x080e3366…e7ab`](https://explorer.testnet.arc.io/tx/0x080e3366158398b51f78731aa91bb77374e61100ed55dd97d698f7d4c1f5e7ab). Done in about 3 s including the wallet round trip.
- **Withdraw with in-browser proving** (`/shield` → Withdraw, no wallet connected): the note kept in step 2 (note B) was pasted with a fresh recipient. The page rebuilt the Merkle tree from the public RPC, **proved in a web worker (noir_js witness + bb.js UltraHonk) in 12.0 s**, sent the proof to the relayer and showed "Withdrawn, gasless". Whole click-to-done time 15.2 s. Tx [`0x98956466…5ecf`](https://explorer.testnet.arc.io/tx/0x98956466909e827762a948373c1fa0049d03fdbec2838240969e123561c35ecf): sent by the relayer, 3,642,426 gas; recipient `0xb3070fD7485258d5B3F56e0a0E299e38b38Ed22A` holds 0.865625 USDC with nonce 0 (it never sent a transaction); the relayer received the 0.134375 USDC fee.

Screenshots of every route at 1440 and 390 px, and of these flows, are in `docs/screens/testnet/`.

## 8. Plug-and-play browser rehearsal — 2026-10-14 (Live, testnet)

Fresh evidence for the new landing widget and shared four-item header. Connected Chrome was controlled through Playwright via the browser tool. Shell-launched Chromium was blocked by the sandbox. The local EIP-1193 adapter (`scripts/browser-wallet.mjs`) signs only with the existing test account in Node; a loopback proxy substitutes the wallet provider reference to avoid the user’s installed wallet. No mocked RPC, contracts, balances, proof or relayer responses. This is not a MetaMask extension test.

1. Registered Alice’s stealth meta-address from Receive.
2. Paid **0.01 USDC through the actual landing KakushiPay widget**, including approval.
3. Receive found the new announcement at block 67135449 and showed 0.01 USDC.
4. Saved the browser-generated note and deposited **1 USDC** through Shield.
5. Disconnected the wallet. The browser rebuilt the Merkle tree, generated an UltraHonk proof in **6.4 seconds**, and submitted it through the real relayer.

| Browser action | Live transaction | Gas (USDC) |
| --- | --- | --- |
| registerKeys | [0xacc16a0063d3da744b30763c77d16a376a742a5c278ba237044074697e74ee27](https://explorer.testnet.arc.io/tx/0xacc16a0063d3da744b30763c77d16a376a742a5c278ba237044074697e74ee27) | 0.0028826 |
| approve | [0x7008c77d4f548c562734bdbd27115defa5c69226bcbac9c142a295a37bbcfdc3](https://explorer.testnet.arc.io/tx/0x7008c77d4f548c562734bdbd27115defa5c69226bcbac9c142a295a37bbcfdc3) | 0.00138565 |
| sendToken | [0xc878c7c04d66bd9aae1a9e3e96e277b0427d6ab00fe0a805e798977cdc841f0d](https://explorer.testnet.arc.io/tx/0xc878c7c04d66bd9aae1a9e3e96e277b0427d6ab00fe0a805e798977cdc841f0d) | 0.002452 |
| approve | [0xc69e83010db53e954afbf5b7c4a61752344adf189f626aa89d506e723d304a43](https://explorer.testnet.arc.io/tx/0xc69e83010db53e954afbf5b7c4a61752344adf189f626aa89d506e723d304a43) | 0.00138595 |
| deposit | [0x76fd23ab99cf12e21fc5882f770dff5869a36a1d5fe94a974282707fbe966a3e](https://explorer.testnet.arc.io/tx/0x76fd23ab99cf12e21fc5882f770dff5869a36a1d5fe94a974282707fbe966a3e) | 0.0142189 |
| withdraw (browser proof, relayer) | [0x98b739e9136414e0968ab25f67a563ce27306ed7f8004b697f9a1f182e21e80e](https://explorer.testnet.arc.io/tx/0x98b739e9136414e0968ab25f67a563ce27306ed7f8004b697f9a1f182e21e80e) | 0.09105825 |

Recipient [`0xCDcaF8826074385AAD52436D9CDEcd59a26D4363`](https://explorer.testnet.arc.io/address/0xCDcaF8826074385AAD52436D9CDEcd59a26D4363) had **0 USDC immediately before withdrawal**, received **0.865625 USDC**, and has **nonce 0**. Relayer fee: **0.134375 USDC**. Receipt status: success.

Budget: one deployer top-up of **0.98 USDC**, funding gas **0.00122375 USDC**, total new deployer outlay **0.98122375 USDC** ([funding transaction](https://explorer.testnet.arc.io/tx/0x28e72af8fc4dd0697bf682b8833b3f3f0cf3c12c766142619297084d119bae65)). Reused 0.061875675 USDC already in Alice and existing relayer funds; the 1 USDC pool principal was withdrawn. Gas across funding, registration, approvals, payment, deposit and withdrawal: **0.11460710 USDC**. No mainnet broadcasts.

**Bug fixed during the live run:** the public RPC rejected batches of six `eth_getLogs` calls with `-32005 rate limit exceeded`. Receive scans and withdrawal tree reconstruction now use sequential pages plus bounded exponential backoff for throttled reads. Registration/unlock failures are surfaced to the user. Three retry regression tests pass. An empty note no longer incorrectly claims the relayer fee is too high.

**Screens:** all five routes at 1440×1000 and 390×1000, no horizontal overflow; the mobile menu opened and navigated to Pay. Connected wallet, receive result and completed withdrawal also fit 390 px. Current captures are `.jpg` files under `docs/screens/testnet/`; the old PNG set was replaced. Proof receipt captures hide the spent note and were taken before the final empty-note explanatory copy correction.

**Checks:** workspace typecheck PASS; 65 TypeScript tests PASS; Arc Foundry 30 tests PASS (real proofs); production build PASS; design detector no findings. `pnpm zk:test` was attempted but Nargo cannot lock `~/nargo/.package-cache` inside this session’s filesystem sandbox. The historical 14 Noir tests were not rerun successfully here; no circuit/verifier code changed.

Raw receipts, balance checks, viewport results and test status: [`BROWSER-TESTNET.json`](BROWSER-TESTNET.json). All local servers started for this run were stopped. Source SDK/widget packages remain unpublished; anonymity sets remain test-sized; the relayer is a single operator; unaudited; FHE is next.


## Round 2: hosted browser product pass

2026-10-14, https://kakushi-arc.vercel.app, **Live (testnet)**, chain 5042002. No mainnet calls or broadcasts. Playwright drove the real hosted UI at 390 px (desktop Chromium mobile viewport), with 1440 px receipt captures and every route at both widths. A fresh EIP-1193 automation wallet signs in Node; no chain responses, transactions, notes or proofs are mocked. MetaMask/Rabby extension UX and physical mobile browsers: **Not run**.

LEAD: RUN THESE (from repo root):

```sh
pnpm e2e:browser                    # read-only hosted routes, navigation, clipboard snippets, error states
pnpm lint && pnpm typecheck && pnpm test
pnpm --filter @kakushi/app build
pnpm zk:test
(cd packages/contracts && "../../../.tools/arcfoundry/forge" test -j 1)
```

To repeat live actions, use a fresh gitignored `.run/round2.env` with `PAYER_KEY` and `RECIPIENT_KEY`; pre-fund the payer with >1.05 testnet USDC and leave the recipient empty. Run `LIVE=1 pnpm e2e:browser`. This script does not fund wallets. It permits one registration, two 0.01 USDC payments, one 1 USDC deposit and their exact approvals; it refuses non-testnet signing. The Receive page signs its real stealth sweep itself. Save keys/notes locally and sweep leftover balances afterward. The already-used keys in this session were swept; a new live run requires fresh keys and a separately approved budget.

Flow: connect the fresh wallet → unlock/list Receive → homepage widget payment → Receive finds 0.01 USDC → Move back → Pay sends another 0.01 USDC → Shield generates a note → denied clipboard write keeps Deposit disabled → download the note → deposit 1 USDC → paste note into Withdraw → browser proves → hosted serverless relayer submits.

| Browser action | Explorer receipt | Gas USDC |
|---|---|---|
| registerKeys | [0x27bb82ab…](https://explorer.testnet.arc.io/tx/0x27bb82abf7cf4f9829b7fe13ae10247cdac84b7e8494d83a51f5854e14795277) | 0.0028829 |
| approve | [0x047c6088…](https://explorer.testnet.arc.io/tx/0x047c60881da12c4aa3b22f546214a4439c83475a9cded99d668c88f309d4a60d) | 0.00138565 |
| Widget · 0.01 USDC | [0xb2c0f821…](https://explorer.testnet.arc.io/tx/0xb2c0f8217fde61bd909c4e6c6f218688f7d95295649b31af26c9dfdd139d38b3) | 0.0024526 |
| move | [0xa3833574…](https://explorer.testnet.arc.io/tx/0xa3833574dabe4a5fdaed932fa98c7510670615b41c7fbc508b0f341be0643845) | 0.00122345 |
| approve | [0xcb9f7c58…](https://explorer.testnet.arc.io/tx/0xcb9f7c583deb67f0249ef58244e8682c2afc2d42b7b2eedafc778f9cc46f266a) | 0.00138565 |
| Pay page · 0.01 USDC | [0x4111afbe…](https://explorer.testnet.arc.io/tx/0x4111afbe85ed6552852876148cf0fd14e91da122efab43a99d6e349b13980272) | 0.0024503 |
| approve | [0x135c88a0…](https://explorer.testnet.arc.io/tx/0x135c88a0e3a67c9f2665ccec1f9f87f2c08f118c0311894a3c557a7de7c2412c) | 0.00138595 |
| deposit | [0xfd64b466…](https://explorer.testnet.arc.io/tx/0xfd64b466cd52ad1a6a7006424594c1e25a088ff599b8a84a4d85e91832ec9d8d) | 0.014144025 |
| hosted-browser-proof-relay | [0xd5507dc8…](https://explorer.testnet.arc.io/tx/0xd5507dc878c2a560e0c72f2ad4eb76e50e7f156ed15612df04d3dae55f760957) | 0.09105735 |

Hosted proof: **5.3 seconds**, full withdrawal **24.894 seconds** including chain-log reconstruction and relay. `crossOriginIsolated=true`; COOP `same-origin`, COEP `require-corp`. Worker and both Noir WASM URLs returned **200**; no failed proof requests. Recipient 0xb5c3b33B056eA8831C1139a837124996BA67a831 started at **0**, received **0.865625 USDC**, and had **nonce 0 before the later cleanup sweep**. Fee **0.134375 USDC**. The spent note is omitted from committed evidence/screenshots.

Budget: **0.250525 USDC** new deployer outlay including funding gas; reused **0.86 USDC** of the previous test recipient’s principal. All run transactions (funding, browser and cleanup) consumed **0.121517875 USDC** gas. Swept **0.950820925 USDC** back to the deployer; payer, recipient and prior recipient are zero. One stealth address retains **0.00049355 USDC**, below the **0.000525 USDC** transfer gas. Relayer keeps its earned fee. All sweep and funding explorer hashes: [ROUND2-TESTNET.json](ROUND2-TESTNET.json).

10 route/viewport checks, 8 header navigation clicks, home links, hero anchor, code tabs, invalid-note and missing-wallet errors passed. Exact copied snippets match the files compiled by typecheck. Screens: [screens/testnet](screens/testnet/), prefixed `round2-`. No mock features or sample payment responses were introduced. 10/100 USDC deposits and self-paid withdrawals were **Not run** in this budget.
