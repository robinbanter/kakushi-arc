#!/usr/bin/env bash
# Deploy Kakushi to Arc.   scripts/deploy.sh testnet|mainnet [--dry-run]
#
#  - mainnet requires CONFIRM_MAINNET=yes (it moves real USDC for gas, and the contracts will hold real funds)
#  - the deployer key is read from a FILE (DEPLOYER_ENV_FILE, default ../.deployer/deployer.env, a line
#    DEPLOYER_PRIVATE_KEY=0x...) or from the DEPLOYER_PRIVATE_KEY environment variable. It is passed to forge through
#    the environment only, never on the command line, and never printed.
#  - the broadcast is wrapped in the shared deployer lock so concurrent deploys from the same wallet don't collide
#    (DEPLOY_LOCK_DIR, default ../.deployer/lock when ../.deployer exists; the lock is held for the broadcast only)
#  - writes deployments/arc-<network>.json (--dry-run simulates against the live RPC and writes a .dryrun file instead)
set -euo pipefail
NET="${1:-}"
DRY=""
[ "${2:-}" = "--dry-run" ] && DRY=1
case "$NET" in
  testnet) CHAIN_ID=5042002; RPC="${ARC_RPC_URL:-https://rpc.testnet.arc.io}" ;;
  mainnet) CHAIN_ID=5042;    RPC="${ARC_RPC_URL:-https://rpc.mainnet.arc.io}" ;;
  *) echo "usage: scripts/deploy.sh testnet|mainnet [--dry-run]" >&2; exit 64 ;;
esac
if [ "$NET" = "mainnet" ] && [ -z "$DRY" ] && [ "${CONFIRM_MAINNET:-}" != "yes" ]; then
  echo "refusing to broadcast to Arc MAINNET (chain 5042) without CONFIRM_MAINNET=yes" >&2
  exit 65
fi
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FORGE="${FORGE:-forge}"
[ -x "$ROOT/../.tools/arcfoundry/forge" ] && FORGE="${FORGE_BIN:-$ROOT/../.tools/arcfoundry/forge}"

# the RPC must be the chain we think it is (a stale ARC_RPC_URL pointing at the other network would deploy there)
GOT="$(curl -s -m 15 -X POST "$RPC" -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' | sed -n 's/.*"result":"\(0x[0-9a-fA-F]*\)".*/\1/p')"
if [ "$((GOT))" != "$CHAIN_ID" ]; then echo "RPC $RPC reports chain $((GOT)), expected $CHAIN_ID ($NET)" >&2; exit 66; fi

ENV_FILE="${DEPLOYER_ENV_FILE:-$ROOT/../.deployer/deployer.env}"
if [ -z "${DEPLOYER_PRIVATE_KEY:-}" ]; then
  [ -f "$ENV_FILE" ] || { echo "set DEPLOYER_PRIVATE_KEY, or DEPLOYER_ENV_FILE to a file containing it" >&2; exit 67; }
  DEPLOYER_PRIVATE_KEY="$(sed -n 's/^[[:space:]]*\(export[[:space:]]\+\)\{0,1\}DEPLOYER_PRIVATE_KEY=["'\'']\{0,1\}\(0x[0-9a-fA-F]\{64\}\).*/\2/p' "$ENV_FILE" | head -n1)"
  [ -n "$DEPLOYER_PRIVATE_KEY" ] || { echo "no DEPLOYER_PRIVATE_KEY=0x... line in $ENV_FILE" >&2; exit 67; }
fi
export DEPLOYER_PRIVATE_KEY KAKUSHI_NETWORK="$NET"

OUT="../../deployments/arc-$NET.json"
ARGS=(script script/Deploy.s.sol --rpc-url "$RPC")
if [ -n "$DRY" ]; then
  export KAKUSHI_OUT="../../deployments/arc-$NET.dryrun.json"
else
  ARGS+=(--broadcast --slow)
  export KAKUSHI_OUT="$OUT"
fi

cd "$ROOT/packages/contracts"
"$FORGE" build >/dev/null
if [ -n "$DRY" ]; then
  "$FORGE" "${ARGS[@]}"
  rm -f "$ROOT/deployments/arc-$NET.dryrun.json"
  exit 0
fi

LOCK="${DEPLOY_LOCK_DIR:-}"
[ -z "$LOCK" ] && [ -d "$ROOT/../.deployer" ] && LOCK="$ROOT/../.deployer/lock"
if [ -n "$LOCK" ]; then
  until mkdir "$LOCK" 2>/dev/null; do sleep 3; done
  trap 'rmdir "$LOCK" 2>/dev/null || true' EXIT
fi
"$FORGE" "${ARGS[@]}"
if [ -n "$LOCK" ]; then rmdir "$LOCK"; trap - EXIT; fi
echo "wrote deployments/arc-$NET.json (tx hashes: packages/contracts/broadcast/Deploy.s.sol/$CHAIN_ID/run-latest.json)"
