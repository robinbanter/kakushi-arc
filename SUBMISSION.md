# Kakushi — the private execution layer for Arc

Live: https://kakushi-arc.vercel.app (Arc mainnet, chain 5042)

## Description

Kakushi move unseen. Your payment arrives. The private execution layer for Arc gives existing apps composable USDC payment privacy: a source SDK and three-line KakushiPay integration after client setup.

Go hidden: shield USDC or register a stealth meta-address. Move unseen: send stealth payments and generate Noir/UltraHonk withdrawal proofs in-browser. Surface on Arc: a relayer pays withdrawal gas; settlement is a normal Arc transaction. Stealth checkout and shielded withdrawals are separate primitives.

Kakushi is not a rollup and has no TEE or hardware vendor trust. Viewing-only SDK scans let users disclose incoming stealth payments without spending authority; auditor export UI is next. Build payroll, checkout and game payouts; sealed-bid logic remains app work.

Deployed on Arc mainnet; earlier end-to-end verification ran on testnet. Sender and amounts remain public. Small anonymity sets, one relayer and unaudited software are explicit limits. FHE is next; source packages are not on npm.

## What it uses Arc for

- USDC is the payment asset, pool asset, relayer fee and gas token.
- The 6-decimal ERC-20 interface and 18-decimal native gas accounting are handled separately.
- Deterministic finality supports prompt receipt confirmation.
- Arc Foundry tests cover FiatToken behavior and local forks; live evidence uses the public testnet.

## Demo

1. Run the app and relayer as documented in README / docs/JUDGE-WALKTHROUGH.md.
2. Connect on Receive, unlock and register your private receiving address.
3. Return to the landing page. Pay 0.01 USDC through the actual widget; scan Receive.
4. Shield 1 USDC after saving the note. Withdraw with an in-browser proof to a fresh address through the relayer.
5. Open Developers for the source integration and mainnet explorer links.

Evidence: [live testnet transactions](docs/E2E-TESTNET.md), [browser rehearsal](docs/BROWSER-TESTNET.json), [screenshots](docs/screens/testnet/). Hosted frontend: https://kakushi-arc.vercel.app. [Vercel verification](docs/HOSTED.md).

<!-- MAINNET-ADDRESSES -->
## Addresses — live mainnet and testnet

Mainnet **5042: Live**, deployed 2026-10-14. [All mainnet addresses and transaction receipts](docs/MAINNET-DEPLOYMENT.md).
Testnet **5042002: Live**; [testnet deployment](deployments/arc-testnet.json) and [testnet evidence](docs/E2E-TESTNET.md).

- pools.USDC-1.address: [0x452827fC2f27624d23196E072e544728f26b555C](https://explorer.arc.io/address/0x452827fC2f27624d23196E072e544728f26b555C).
- pools.USDC-10.address: [0xA10D52219aD3B7Faa42B19a3AB24f90451A92182](https://explorer.arc.io/address/0xA10D52219aD3B7Faa42B19a3AB24f90451A92182).
- pools.USDC-100.address: [0xBF022d69eb2E191f68427290F63b7D258f8478B1](https://explorer.arc.io/address/0xBF022d69eb2E191f68427290F63b7D258f8478B1).
- shieldedVerifier: [0x40c4dAEDd743AE54c4aEe432636562Cc13e191a1](https://explorer.arc.io/address/0x40c4dAEDd743AE54c4aEe432636562Cc13e191a1).
- stealthAnnouncer: [0x6d5CeEe9966203Ca33eD94Db75D388e217F91caa](https://explorer.arc.io/address/0x6d5CeEe9966203Ca33eD94Db75D388e217F91caa).
- stealthPay: [0xD8236B9BD4D141a3868B52a3Da01bA8e0074c2f1](https://explorer.arc.io/address/0xD8236B9BD4D141a3868B52a3Da01bA8e0074c2f1).
- stealthRegistry: [0x8Dde7Ef3c21F61DC3956CD563b71D44D14D5f524](https://explorer.arc.io/address/0x8Dde7Ef3c21F61DC3956CD563b71D44D14D5f524).

Mainnet smoke: [Smoke: send 0.01 USDC to recoverable stealth address](https://explorer.arc.io/tx/0x84ac4f8f66295a10d177d450e65833b132d48ae63055ff2a529db90de51a067b).
<!-- /MAINNET-ADDRESSES -->

## Production network

The frontend and relayer select `deployments/arc-mainnet.json`, RPC `https://rpc.mainnet.arc.io` and explorer `https://explorer.arc.io`. [Read-only hosted checks](docs/HOSTED-MAINNET.md). Prior **Live (testnet)** and **Fork** results remain separate evidence. Mainnet transactions were not sent by this hosting migration.
