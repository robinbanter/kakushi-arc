# Kakushi on Arc

Kakushi makes USDC payments on Arc private. Send USDC to a one-time stealth address (ERC-5564/6538) only the recipient can find. Shield USDC in a fixed-size zero-knowledge pool (Noir/UltraHonk) and withdraw to any fresh address with a proof. A relayer submits the withdrawal and is repaid in USDC from the note, so the new wallet needs no balance and no gas token.

**Live on Arc testnet** (chain 5042002): registry, announcer, StealthPay, the UltraHonk verifier and 1/10/100 USDC pools on the real USDC at `0x3600…0000`. The core loop ran there with real transactions and proofs (shield 1 USDC, stealth-pay, recipient scans and finds it, gasless relayer withdrawal to a 0-balance address); every hash is in `docs/E2E-TESTNET.md`. The web app was driven through the same flows, including a withdrawal proved in the browser in about 12 s. Mainnet deploys with one command (`scripts/deploy.sh mainnet`), not yet run.

**Arc usage:** USDC as gas (fee, gas and pool asset are one asset); the 6-decimal USDC at `0x3600…0000` with 18-decimal gas converted correctly, tested against FiatToken v2.2 including the blocklist; sub-second finality; Arc Foundry forks.

**Demo:** `docs/JUDGE-WALKTHROUGH.md`. No hosted instance: run the app locally.

**Status:** testnet only, not audited, pools capped, anonymity sets are empty (our own two test deposits), single relayer. The FHE side of the original Kakushi is the next step and is not shipped. The circuit and verifier are reused from the earlier Monad version of the project.
