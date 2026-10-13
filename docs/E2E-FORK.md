# End-to-end on an Arc Foundry fork

Run `2026-10-13T16:28:46.929Z` by `node scripts/e2e-fork.ts` against `anvil --network arc --fork-url https://rpc.testnet.arc.io` (Arc testnet, chain 5042002, forked at block 67017017). Every transaction below is a real signed transaction executed by Arc's own USDC implementation (`0x3600…0000`, FiatToken-compatible, 6 decimals, native-gas-aware); every withdrawal verifies a real Noir/UltraHonk proof on-chain. Hashes are from the fork, so they have no public explorer page; the same script and contracts deploy to Arc Testnet with `pnpm deploy:testnet`.

Every account is a fresh random key funded on the fork with `anvil_setBalance` (anvil's well-known dev keys are blocklisted by Arc's USDC, so they cannot be used). The withdrawal recipients are fresh random keys that start with 0 USDC and never send a transaction.

## Deployment (script/Deploy.s.sol)

| Contract | Address | Tx | Gas |
| --- | --- | --- | --- |
| RelationsLib | linked library | `0x1ad5e97e3c23babb2a64d3f925596e3e455d2f812cc350e23526788ac8b4356f` | 1779103 |
| ZKTranscriptLib | linked library | `0xe67420be312df0dc9059aafc27b616d305faf9b2cfd2823c3e04587b8ca418e6` | 1386054 |
| StealthRegistry | `0xF965E720bd4c890404Fa47ea6bbeA5e0acdDa423` | `0x9fcd1c10ab7a01685a234bb0170e0eb1f908891f7744aa33215920748b7f29ce` | 689440 |
| StealthAnnouncer | `0xEC3f602cC85192418cB02d4D3965BEA7f2B44Ce6` | `0x1b5758331cc9bd02ca0abfd71505efe64c2ecd7773185ec512232ace8d5c8cf4` | 181511 |
| StealthPay | `0x11fd1fdcaf280aeAF79DD64d7401A43E53e9a680` | `0x62d1ddb409cc2bd56720394225c6cc414d2ccaca68af4be370b13fce00f1502e` | 471812 |
| ShieldedWithdrawVerifier | `0x53c90DD10DC1086e0d76Ee97fD8cd6f7C04879C9` | `0xc86b7db5b8718d8b12416162d10c3248ec624f1ed28db6b4b268d33ea2e35620` | 3907094 |
| KakushiPool (USDC-1) | `0xc372b16055C7D8b3dc4c8dcA56bb299E0E7D9532` | `0x3c0c455d8ffa73ee34f601f36fc73827d744ed5eafffcd293b6dc72c23c8559d` | 3434330 |
| KakushiPool (USDC-10) | `0x42400f9804e02Fd055210ad434D2F7188B55982f` | `0xff84fe6301347d1a396c522dd2c345d0105b788e22cb6ccbbe68f69682428306` | 3434330 |
| KakushiPool (USDC-100) | `0x5B70D77af9c4003Db1Fa0f0C462F9d8BF4874B9d` | `0x881bc24ef9790a1768eb3f9c0bb8a52c3b1c3f8818ea485532ed0b077e57fbaa` | 3434330 |
| **total** | | | **18718004** |

## 0. Fork, deployment and token facts

- RPC http://127.0.0.1:9200 (Arc Foundry anvil --network arc, forked from https://rpc.testnet.arc.io), chain 5042002, block 67017017
- USDC 0x3600000000000000000000000000000000000000: name=USDC symbol=USDC decimals=6 version=2
- Deployed with packages/contracts/script/Deploy.s.sol: registry 0xF965E720bd4c890404Fa47ea6bbeA5e0acdDa423, announcer 0xEC3f602cC85192418cB02d4D3965BEA7f2B44Ce6, StealthPay 0x11fd1fdcaf280aeAF79DD64d7401A43E53e9a680, verifier 0x53c90DD10DC1086e0d76Ee97fD8cd6f7C04879C9
- Pools: USDC-1 0xc372b16055C7D8b3dc4c8dcA56bb299E0E7D9532 (cap 5000 notes); USDC-10 0x42400f9804e02Fd055210ad434D2F7188B55982f (cap 2000 notes); USDC-100 0x5B70D77af9c4003Db1Fa0f0C462F9d8BF4874B9d (cap 1000 notes)
- Alice (payer) holds 1000 USDC; as native balance 1000 (18-dec view of the same funds)

## 1. Bob turns on private receiving (ERC-6538)

- Bob's wallet 0xa9aF3E5e84520CAFc611403968648b5282E0924E now resolves to a stealth meta-address (spending+viewing keys derived from one signature)

| Transaction | Hash | Gas used | Gas cost (USDC) |
| --- | --- | --- | --- |
| registerKeys(1, metaAddress) | `0x3dea71c72eb601d4805642a8db30ba9d0839a48cac3ff0674c903eda3d90b7c1` | 115316 | 0.002422 |

## 2. Shield: Alice deposits 10 USDC into pool USDC-10

- pool USDC balance 10; Alice's note stays offline (kakushi-note-v1-5042002-0x42400f9804e02f…)

| Transaction | Hash | Gas used | Gas cost (USDC) |
| --- | --- | --- | --- |
| USDC.approve(pool, 10) | `0x06730e2bfc392a060ffb9cdb084427a9c5841c0b74d96707fe9e291b1c525657` | 55438 | 0.001165 |
| pool.deposit(commitment) | `0xd56f1e5380cbc1315cc2f517de8ee51e4519bdaf276623491e792154778cfd6f` | 588873 | 0.012367 |

## 3. Alice pays Bob privately (ERC-5564 stealth address, one transaction)

- one-time address 0xD2C5538587E273e29C8434b9c17Af0c289d555Bb (unrelated to Bob's wallet 0xa9aF3E5e84520CAFc611403968648b5282E0924E on chain); holds 25 USDC

| Transaction | Hash | Gas used | Gas cost (USDC) |
| --- | --- | --- | --- |
| USDC.approve(StealthPay, 25) | `0xbb5f96bc4e6700d3023384201e551d43805a5839c437a25bdac0d38e85484d2c` | 55450 | 0.001165 |
| StealthPay.sendToken(stealth, USDC, 25) | `0x3b70ff29ef136df7479a3dba963c609311271a55c20211f517baeafd10bc5623` | 98116 | 0.002061 |

## 4. Bob scans the announcer, finds the payment and spends it (USDC is the gas)

- found: 25 USDC at 0xD2C5538587E273e29C8434b9c17Af0c289d555Bb (announced in tx 0x3b70ff29ef136df7479a3dba963c609311271a55c20211f517baeafd10bc5623); private key derived; native view 25000000000000000000 wei = 25 USDC
- the stealth address holds ONLY USDC, yet it can send transactions: gas is paid in USDC
- stealth address: 25 -> 14.986891 USDC after shielding 10 (the 0.013109 USDC difference was gas, paid in USDC)

| Transaction | Hash | Gas used | Gas cost (USDC) |
| --- | --- | --- | --- |
| USDC.approve(pool, 10) [from the stealth address] | `0x0764850cbab2c563bac8032d698265a64dd5643b14b07d5a28ee2a2f5897a5dc` | 55438 | 0.001165 |
| pool.deposit(commitment) [from the stealth address] | `0x5252650b8b346a4a3ed73608686677538badb5d694b8393b17c27737c285d194` | 568778 | 0.011945 |

## 5. Withdraw through the relayer, gasless (fee paid in USDC out of the note)

- relayer 0xb2c796b08C3eB11121373aa66295cBce00941eeA quotes 0.112875 USDC per withdrawal from USDC-10 (4.3M gas x gas price x 1.25, converted from 18-dec native wei to 6-dec USDC; a withdrawal measures about 3.64M gas)
- Alice's note: UltraHonk proof made in 0.2 s (7616 bytes), bound to recipient 0xE084D05Fc92C2c750Fa83Ef2f32a437Bd59e8B6A, relayer 0xb2c796b08C3eB11121373aa66295cBce00941eeA, fee 0.112875
- Alice's withdrawal: 0xE084D05Fc92C2c750Fa83Ef2f32a437Bd59e8B6A received 9.887125 USDC with zero prior balance and zero transactions sent; nullifier spent: true
- replaying the same proof is refused by the relayer: "withdraw would revert: this note was already spent (NullifierSpent) [The contract function "withdraw" reverted.: execution reverted: custom error 0x2d8b76eb: 1a"
- Bob's note (shielded from his stealth address): UltraHonk proof made in 0.2 s (7616 bytes), bound to recipient 0x3B8692e51bbaa46dC010C065BF5BB97f7A7C1f7a, relayer 0xb2c796b08C3eB11121373aa66295cBce00941eeA, fee 0.112875
- Bob's withdrawal: 0x3B8692e51bbaa46dC010C065BF5BB97f7A7C1f7a received 9.887125 USDC with zero prior balance and zero transactions sent; nullifier spent: true
- replaying the same proof is refused by the relayer: "withdraw would revert: this note was already spent (NullifierSpent) [The contract function "withdraw" reverted.: execution reverted: custom error 0x2d8b76eb: 17"
- relayer USDC: 1000 -> 1000.072773: fees 0.22575 - gas 0.152977 = net +0.072773 USDC (fee token and gas token are the same asset, so there is no FX or oracle step)

| Transaction | Hash | Gas used | Gas cost (USDC) |
| --- | --- | --- | --- |
| relayer -> pool.withdraw (Alice withdraws to a fresh address) | `0xf9649fb435b647299860ffccfd1fbd5826aa57bfa54bf4062d775377d1f5e4a5` | 3642282 | 0.076488 |
| relayer -> pool.withdraw (Bob withdraws to a fresh address) | `0x511aaad263807327981a88ab93ab4e40b12cd40d4aba564b32dcce8cc1ab6293` | 3642318 | 0.076489 |

## 6. End state

- pool USDC-10 USDC balance 0 (both notes withdrawn); Alice 1000 -> 964.983244 USDC

## Proof timings

- Alice's note: 0.2 s (noir_js witness + bb.js UltraHonk, 2 threads, Node v26.5.0)
- Bob's note (shielded from his stealth address): 0.2 s (noir_js witness + bb.js UltraHonk, 2 threads, Node v26.5.0)
