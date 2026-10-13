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
