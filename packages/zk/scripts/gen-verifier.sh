#!/usr/bin/env bash
# Compile the shielded_withdraw circuit, write its verification key and regenerate the checked-in
# Solidity verifier (UltraHonk, keccak transcript, ZK). Pass --check to fail on a diff instead of writing.
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.nargo/bin:$HOME/.bb:$PATH"
OUT=../contracts/src/verifiers/ShieldedWithdrawVerifier.sol
TMP="$(mktemp -d)"
nargo compile --workspace
mkdir -p target/vk/shielded_withdraw
bb write_vk -b target/shielded_withdraw.json -o target/vk/shielded_withdraw -t evm >/dev/null
bb write_solidity_verifier -k target/vk/shielded_withdraw/vk -o "$TMP/V.sol" -t evm >/dev/null
sed -i.bak "s/^contract HonkVerifier is/contract ShieldedWithdrawVerifier is/" "$TMP/V.sol" && rm "$TMP/V.sol.bak"
# keep only what noir_js needs (abi + bytecode): debug symbols carry machine-specific paths
node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.argv[1]));fs.writeFileSync(process.argv[2],JSON.stringify({noir_version:j.noir_version,abi:j.abi,bytecode:j.bytecode}))' target/shielded_withdraw.json "$TMP/c.json"
if [ "${1:-}" = "--check" ]; then
  diff -q "$TMP/V.sol" "$OUT" && diff -q "$TMP/c.json" ../prover/circuits/shielded_withdraw.json && echo "verifier and circuit artifact are up to date"
else
  cp "$TMP/V.sol" "$OUT"; cp "$TMP/c.json" ../prover/circuits/shielded_withdraw.json
  echo "wrote $OUT ($(wc -c < "$OUT") bytes)"
fi
rm -rf "$TMP"
