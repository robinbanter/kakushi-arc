# Deploying Kakushi to Arc mainnet

Everything here targets Arc mainnet (chain `5042`, RPC `https://rpc.mainnet.arc.io`, explorer `https://explorer.arc.io`). The same commands with `testnet` target chain `5042002`.

## 1. Check

```bash
pnpm install
pnpm contracts:test && pnpm zk:test && pnpm test           # all green
scripts/deploy.sh mainnet --dry-run                       # simulates against the live RPC, writes nothing, needs no CONFIRM
```

## 2. Deploy

```bash
export DEPLOYER_ENV_FILE=/path/to/deployer.env             # a file with a DEPLOYER_PRIVATE_KEY=0x... line (or export DEPLOYER_PRIVATE_KEY)
export CONFIRM_MAINNET=yes                                  # the script refuses to broadcast to mainnet without this
scripts/deploy.sh mainnet
```

The script checks the RPC really is chain 5042, builds, holds the shared deployer lock (`DEPLOY_LOCK_DIR`, default `../.deployer/lock` when present) for the broadcast only, and writes `deployments/arc-mainnet.json` (commit it; the hosted app reads it). Transaction hashes are in `packages/contracts/broadcast/Deploy.s.sol/5042/run-latest.json`. The key is read from the file inside the script and passed to forge through the environment, never on the command line.

What it deploys (chain-agnostic plain CREATE from the deployer): `StealthRegistry`, `StealthAnnouncer`, `StealthPay`, the two verifier libraries and `ShieldedWithdrawVerifier`, and three `KakushiPool`s for USDC (`0x3600…0000`): 1 USDC (cap 5,000 notes), 10 USDC (cap 2,000), 100 USDC (cap 1,000). No owner or admin key exists on any contract. To change a cap or denomination edit `pools()` in `packages/contracts/script/Deploy.s.sol` before deploying.

## 3. Gas needed

Measured on the Arc fork: **18.72M gas** for the whole deployment (verifier 3.9M plus its two libraries 3.2M, each pool 3.4M, stealth contracts 1.3M). Arc's mempool floor is 20 gwei `maxFeePerGas`, so at 20 to 25 gwei that is **about 0.4 to 0.5 USDC**. Foundry's estimate at 45 to 50 gwei is about 1.1 to 1.3 USDC; fund the deployer with **1.5 USDC** to be safe.

Demo budget (all but the gas is recoverable): shield 10 USDC, pay 25 USDC to a stealth address, withdraw both through the relayer. User transactions cost 0.001 to 0.015 USDC each; a relayed withdrawal is about 3.65M gas, about 0.08 USDC paid by the relayer. **Fund a separate relayer wallet with 2 USDC** (about 25 withdrawals before it needs a top-up; each earns back its fee) and keep **about 40 USDC** in the demo wallet.

| Item | USDC |
| --- | --- |
| Deployer gas | 1.5 |
| Relayer wallet gas float | 2 |
| Demo wallet (10 shielded + 25 paid + gas) | about 40 (recoverable) |

## 4. Verify the contracts

Arc's explorer is Blockscout-style. After deploying:

```bash
cd packages/contracts
forge verify-contract <address> src/privacy/KakushiPool.sol:KakushiPool --chain 5042 --verifier blockscout --verifier-url https://explorer.arc.io/api/ --constructor-args $(cast abi-encode "constructor(address,address,uint256,uint32)" <verifier> 0x3600000000000000000000000000000000000000 10000000 2000)
```

(repeat for each contract; the verifier needs `--libraries` for `RelationsLib` and `ZKTranscriptLib`, addresses in the broadcast file). I could not run verification without a funded public deployment, so treat the exact flags as unverified until you run them once.

## 5. Services

- **Relayer** (needed for gasless withdrawals): one small Node process, no database. Run on any host (Railway, a VM):

  ```bash
  RELAYER_KEY=0x… KAKUSHI_NETWORK=mainnet RELAYER_HOST=0.0.0.0 RELAYER_PORT=3715 pnpm relayer
  ```

  It needs a dedicated wallet (not the deployer) with a little USDC for gas, reads the pool list from `deployments/arc-mainnet.json`, and exposes `GET /info`, `GET /health` (shows its USDC balance) and `POST /relay`. Put TLS in front. Tunables: `RELAYER_MIN_FEE`, `RELAYER_MAX_FEE_BPS`, `RELAYER_QUOTE_GAS` (see `.env.example`). It refuses any withdrawal whose fee is below its own gas cost, so it cannot be drained.
- **Indexer:** not needed. The app and SDK read Deposit and Announcement logs straight from the RPC in 5,000-block pages (Arc's public RPC caps a range at about 5,000 blocks). Set `ARC_RPC_URL` to a private RPC for faster scans.
- **Prover:** runs in the user's browser (web worker); nothing to host.

## 6. Environment for Vercel (or any host)

Deploy `packages/app` (framework Next.js, root directory `packages/app`; the build copies `deployments/arc-*.json` next to the app).

| Variable | Value |
| --- | --- |
| `KAKUSHI_NETWORK` | `mainnet` |
| `KAKUSHI_RELAYER_URL` | the relayer's public URL (the app proxies `/api/relayer/*` to it) |
| `ARC_RPC_URL` | optional private RPC |

Build with the workspace install (`pnpm install` at the repo root), because the app imports `@kakushi/sdk`, `@kakushi/widget`, `@kakushi/prover` and `@kakushi/ui` as source.

## 7. After deploying

1. Commit `deployments/arc-mainnet.json` and set `relayerUrl` in it if you want the relayer URL recorded with the deployment.
2. Run one small shield and withdraw on mainnet end to end (the 1 USDC pool) before announcing it. Relayer fee at 20 gwei is about 0.11 USDC.
