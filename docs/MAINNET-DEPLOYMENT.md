# Live Arc mainnet deployment

Chain 5042; production receipts checked on 2026-10-14. Testnet records remain in `deployments/arc-testnet.json`.

| Contract | Mainnet address |
|---|---|
| pools.USDC-1.address | [0x452827fC2f27624d23196E072e544728f26b555C](https://explorer.arc.io/address/0x452827fC2f27624d23196E072e544728f26b555C) |
| pools.USDC-10.address | [0xA10D52219aD3B7Faa42B19a3AB24f90451A92182](https://explorer.arc.io/address/0xA10D52219aD3B7Faa42B19a3AB24f90451A92182) |
| pools.USDC-100.address | [0xBF022d69eb2E191f68427290F63b7D258f8478B1](https://explorer.arc.io/address/0xBF022d69eb2E191f68427290F63b7D258f8478B1) |
| shieldedVerifier | [0x40c4dAEDd743AE54c4aEe432636562Cc13e191a1](https://explorer.arc.io/address/0x40c4dAEDd743AE54c4aEe432636562Cc13e191a1) |
| stealthAnnouncer | [0x6d5CeEe9966203Ca33eD94Db75D388e217F91caa](https://explorer.arc.io/address/0x6d5CeEe9966203Ca33eD94Db75D388e217F91caa) |
| stealthPay | [0xD8236B9BD4D141a3868B52a3Da01bA8e0074c2f1](https://explorer.arc.io/address/0xD8236B9BD4D141a3868B52a3Da01bA8e0074c2f1) |
| stealthRegistry | [0x8Dde7Ef3c21F61DC3956CD563b71D44D14D5f524](https://explorer.arc.io/address/0x8Dde7Ef3c21F61DC3956CD563b71D44D14D5f524) |

## Transactions

- CREATE2 RelationsLib : [0x0c6aa90a6947e03751b539209cbcb5da1c7881e11c641e9ff9cb8724eb2cda37](https://explorer.arc.io/tx/0x0c6aa90a6947e03751b539209cbcb5da1c7881e11c641e9ff9cb8724eb2cda37); status 1; gas 0.0355820621 USDC.
- CREATE2 ZKTranscriptLib : [0x76f9094ccbef339e95ebd4550f2ac6c96db58e033b8260b2221b6943b29cf70c](https://explorer.arc.io/tx/0x76f9094ccbef339e95ebd4550f2ac6c96db58e033b8260b2221b6943b29cf70c); status 1; gas 0.0277210816 USDC.
- CREATE StealthRegistry : [0x3c167e4353463376a0b5463c570ff54e3c8ac58d1e65686501d02b177a611588](https://explorer.arc.io/tx/0x3c167e4353463376a0b5463c570ff54e3c8ac58d1e65686501d02b177a611588); status 1; gas 0.0137888008 USDC.
- CREATE StealthAnnouncer : [0x46c966c0490fb6b2e6610f6ac68dd08eadb7ae2f2abcb5d877523562af02df41](https://explorer.arc.io/tx/0x46c966c0490fb6b2e6610f6ac68dd08eadb7ae2f2abcb5d877523562af02df41); status 1; gas 0.0036302202 USDC.
- CREATE StealthPay : [0x36a08c32ba1c734a29de3b6c1aa8b592306413b1d2b5536821ef6e0d2ba7eee1](https://explorer.arc.io/tx/0x36a08c32ba1c734a29de3b6c1aa8b592306413b1d2b5536821ef6e0d2ba7eee1); status 1; gas 0.0094362405 USDC.
- CREATE ShieldedWithdrawVerifier : [0x7c00ec00e174bd3f2e3b5f025e2c73e72d0c1190ec565546c8ea535bed0ee010](https://explorer.arc.io/tx/0x7c00ec00e174bd3f2e3b5f025e2c73e72d0c1190ec565546c8ea535bed0ee010); status 1; gas 0.0781418845 USDC.
- CREATE KakushiPool : [0xfab697842bbe50d1262adf5e69054bf9d45e2a59fae96bc4c9bf606741e7a0f8](https://explorer.arc.io/tx/0xfab697842bbe50d1262adf5e69054bf9d45e2a59fae96bc4c9bf606741e7a0f8); status 1; gas 0.0686866040 USDC.
- CREATE KakushiPool : [0xf96f2d3cdb8d22006a8139a8a6db5457138df47009f467deb452a3d989302dba](https://explorer.arc.io/tx/0xf96f2d3cdb8d22006a8139a8a6db5457138df47009f467deb452a3d989302dba); status 1; gas 0.0686866040 USDC.
- CREATE KakushiPool : [0x712f629bc297b8526440dbcd6c4e1456947432765c97eecd7cd45ac3d3e5a592](https://explorer.arc.io/tx/0x712f629bc297b8526440dbcd6c4e1456947432765c97eecd7cd45ac3d3e5a592); status 1; gas 0.0686866040 USDC.
- service float RELAYER_ADDRESS 1: [0xd0efc9544d6726bbbde91a9885325f585f2afec9d402c308ec9efb83d01d4e2f](https://explorer.arc.io/tx/0xd0efc9544d6726bbbde91a9885325f585f2afec9d402c308ec9efb83d01d4e2f); status 1; gas 0.0004410000 USDC.
- Register production stealth meta-address: [0x6b92436c92077d52e030b91a48b1b8cb932e46d593d694040f7e1f2a50832466](https://explorer.arc.io/tx/0x6b92436c92077d52e030b91a48b1b8cb932e46d593d694040f7e1f2a50832466); status 1; gas 0.0024213840 USDC.
- Approve 0.01 USDC stealth payment: [0x72a79b29799428a360f90aa36b089a895f43696cde9733193d1cc48a0980bab6](https://explorer.arc.io/tx/0x72a79b29799428a360f90aa36b089a895f43696cde9733193d1cc48a0980bab6); status 1; gas 0.0011636940 USDC.
- Smoke: send 0.01 USDC to recoverable stealth address: [0x84ac4f8f66295a10d177d450e65833b132d48ae63055ff2a529db90de51a067b](https://explorer.arc.io/tx/0x84ac4f8f66295a10d177d450e65833b132d48ae63055ff2a529db90de51a067b); status 1; gas 0.0020601840 USDC.
- Sweep stealth smoke principal to deployer: [0x0dc40a23c0b9410299dd25eca978350863da25224fff5fa86bafce3a1ec53e17](https://explorer.arc.io/tx/0x0dc40a23c0b9410299dd25eca978350863da25224fff5fa86bafce3a1ec53e17); status 1; gas 0.0004410000 USDC.

Total recorded project gas: 0.3808873636 USDC.

Mainnet smoke is script-driven; hosted mainnet browser transactions and cross-chain delivery are Not run. Public testnet proof remains separately labelled. Production role keys are outside this repository.

Explorer source verification: attempted; Blockscout API returned a Cloudflare challenge. Receipt/code checks pass independently.
