# Kakushi on Arc

Kakushi makes USDC payments on Arc private. Send USDC to a one-time stealth address (ERC-5564/6538) only the recipient can find. Shield USDC in a fixed-size zero-knowledge pool (Noir/UltraHonk) and withdraw to any fresh address with a proof. A relayer submits the withdrawal and is repaid in USDC from the note, so the new wallet needs no balance and no gas token. Core loop proven on an Arc Foundry fork with real transactions and proofs; mainnet deploys with one command.

**Arc usage:** USDC as gas (fee, gas and pool asset are one asset); the 6-decimal USDC at `0x3600…0000` with 18-decimal gas converted correctly, tested against FiatToken v2.2 including the blocklist; sub-second finality; Arc Foundry forks.

**Demo:** `docs/JUDGE-WALKTHROUGH.md`.

**Status:** not audited, pools capped, not yet on a public network (deployer unfunded).
