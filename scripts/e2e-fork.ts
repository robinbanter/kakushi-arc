// End-to-end proof of the core loop on an Arc Foundry fork, with real signed transactions and real UltraHonk proofs:
//   1. shield USDC into the pool                      (Alice: approve + deposit)
//   2. pay a recipient's stealth address privately    (Alice -> Bob's one-time address via StealthPay)
//   3. the recipient scans and finds it               (Bob: ERC-5564 scan, derives the stealth key, spends with USDC as gas)
//   4. withdraw through the relayer, gasless          (a fresh address with no balance receives USDC; the relayer is repaid in USDC)
// Usage (one fork at a time, ports 9200-9299):
//   "<arcfoundry>/anvil" --network arc --fork-url https://rpc.testnet.arc.io --port 9200 &
//   ARC_RPC_URL=http://127.0.0.1:9200 node scripts/e2e-fork.ts            (writes docs/E2E-FORK.md)
// Every account is a fresh random key funded with anvil_setBalance on the fork (anvil's well-known dev keys are
// blocklisted by Arc's USDC on testnet, "Blocked address"). Nothing is broadcast to a public network.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, encodeFunctionData, formatEther, getAddress, http, parseAbi, type Account, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { chainByNetwork, formatUsdc, NATIVE_PER_USDC_UNIT } from "../config/chains.ts";
import { parseDeployment, type ArcDeployment } from "../config/deployments.ts";
import {
  IncrementalMerkleTree, noteCommitment, buildRegisterKeysCalldata, deriveStealthKeys, erc20Abi, fieldToHex, generateNote, kakushiPoolAbi, planStealthSend, readStealthMetaAddress,
  relayWithdraw, getRelayerInfo, scanAnnouncements, serializeNote, viemChain, withdrawWitness,
} from "../packages/sdk/src/index.ts";
import { proveWithdraw } from "../packages/sdk/src/node.ts";
import { Relayer } from "../packages/relayer/src/relayer.ts";
import { poolsOf } from "../packages/relayer/src/config.ts";
import { relayerServer } from "../packages/relayer/src/server.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RPC = process.env.ARC_RPC_URL ?? "http://127.0.0.1:9200";
const RELAYER_PORT = Number(process.env.E2E_RELAYER_PORT ?? 9201);
const FORGE = process.env.FORGE ?? resolve(root, "../.tools/arcfoundry/forge");
const DEPLOY_JSON = join(root, "deployments", "arc-testnet.fork.json");
const OUT_DOC = join(root, "docs", "E2E-FORK.md");

// ---------------------------------------------------------------------------------------------- setup
const deployerKey = generatePrivateKey();
const fresh = (key: Hex = generatePrivateKey()): Account => privateKeyToAccount(key);
const [deployer, alice, bob, relayerAcct] = [fresh(deployerKey), fresh(), fresh(), fresh()];
const arc = chainByNetwork("testnet");
const chain = viemChain(arc, RPC);
const pub = createPublicClient({ chain, transport: http(RPC) });
const wallet = (account: Account) => createWalletClient({ account, chain, transport: http(RPC) });
const usdc = arc.usdc;
const line = (s: string) => console.log(s);

interface Step {
  title: string;
  txs: { label: string; hash: Hex; gasUsed: bigint; gasCostUnits: bigint }[];
  notes: string[];
}
const steps: Step[] = [];
let cur: Step = { title: "", txs: [], notes: [] };
const begin = (title: string) => {
  cur = { title, txs: [], notes: [] };
  steps.push(cur);
  line(`\n== ${title}`);
};
const note = (s: string) => {
  cur.notes.push(s);
  line(`   ${s}`);
};

async function send(account: Account, label: string, to: Hex, data: Hex): Promise<Hex> {
  const w = wallet(account);
  const hash = await w.sendTransaction({ to, data, account, chain });
  const rc = await pub.waitForTransactionReceipt({ hash });
  if (rc.status !== "success") throw new Error(`${label} reverted (${hash})`);
  const cost = (rc.gasUsed * rc.effectiveGasPrice + NATIVE_PER_USDC_UNIT - 1n) / NATIVE_PER_USDC_UNIT;
  cur.txs.push({ label, hash, gasUsed: rc.gasUsed, gasCostUnits: cost });
  line(`   tx ${label}: ${hash}  gas ${rc.gasUsed} (${formatUsdc(cost)} USDC)`);
  return hash;
}
const bal = (a: Hex) => pub.readContract({ address: usdc, abi: erc20Abi, functionName: "balanceOf", args: [a] });
const nativeBal = (a: Hex) => pub.getBalance({ address: a });
const assert = (c: unknown, m: string) => {
  if (!c) throw new Error(`ASSERTION FAILED: ${m}`);
};

// ---------------------------------------------------------------------------------------------- deploy (the real script)
async function ensureDeployed(): Promise<{ d: ArcDeployment; deployTxs: { name: string; hash: Hex; gas: bigint }[] }> {
  let d: ArcDeployment | null = null;
  if (existsSync(DEPLOY_JSON)) {
    const cand = parseDeployment(JSON.parse(readFileSync(DEPLOY_JSON, "utf8")));
    if ((await pub.getCode({ address: cand.stealthPay })) && (await pub.getCode({ address: Object.values(cand.pools)[0]!.address }))) d = cand;
  }
  const bcast = join(root, "packages/contracts/broadcast/Deploy.s.sol/5042002/run-latest.json");
  if (!d) {
    // the same script a testnet/mainnet deploy runs; the fork's dev account is the deployer
    const r = spawnSync(FORGE, ["script", "script/Deploy.s.sol", "--rpc-url", RPC, "--broadcast"], {
      cwd: join(root, "packages/contracts"),
      env: { ...process.env, DEPLOYER_PRIVATE_KEY: deployerKey, KAKUSHI_NETWORK: "testnet", KAKUSHI_OUT: "../../deployments/arc-testnet.fork.json" },
      encoding: "utf8",
    });
    if (r.status !== 0) throw new Error(`forge script failed:\n${(r.stdout ?? "").slice(-1500)}\n${(r.stderr ?? "").slice(-1500)}`);
    d = parseDeployment(JSON.parse(readFileSync(DEPLOY_JSON, "utf8")));
  }
  const deployTxs: { name: string; hash: Hex; gas: bigint }[] = [];
  if (existsSync(bcast)) {
    const run = JSON.parse(readFileSync(bcast, "utf8")) as { transactions: { contractName: string; hash: Hex }[]; receipts: { gasUsed: Hex }[] };
    run.transactions.forEach((t, i) => deployTxs.push({ name: t.contractName, hash: t.hash, gas: BigInt(run.receipts[i]!.gasUsed) }));
  }
  return { d, deployTxs };
}

// ---------------------------------------------------------------------------------------------- main
const startedAt = new Date();
const chainId = await pub.getChainId();
if (chainId !== arc.chainId) throw new Error(`expected an Arc testnet fork (chain ${arc.chainId}) at ${RPC}, got ${chainId}`);
const forkBlock = await pub.getBlockNumber();
// fund the run's accounts with native USDC (18-dec accounting): 1000 USDC each; the recipients below start at zero
for (const a of [deployer, alice, bob, relayerAcct]) await pub.request({ method: "anvil_setBalance", params: [a.address, `0x${(1000n * 10n ** 18n).toString(16)}`] } as never);

begin("0. Fork, deployment and token facts");
note(`RPC ${RPC} (Arc Foundry anvil --network arc, forked from ${arc.publicRpc}), chain ${chainId}, block ${forkBlock}`);
const meta = await Promise.all(["name", "symbol", "decimals", "version"].map((f) => pub.readContract({ address: usdc, abi: parseAbi([`function ${f}() view returns (${f === "decimals" ? "uint8" : "string"})`]), functionName: f } as never)));
note(`USDC ${usdc}: name=${meta[0]} symbol=${meta[1]} decimals=${meta[2]} version=${meta[3]}`);
const { d, deployTxs } = await ensureDeployed();
note(`Deployed with packages/contracts/script/Deploy.s.sol: registry ${d.stealthRegistry}, announcer ${d.stealthAnnouncer}, StealthPay ${d.stealthPay}, verifier ${d.shieldedVerifier}`);
note(`Pools: ${Object.entries(d.pools).map(([k, p]) => `${k} ${p.address} (cap ${p.maxDeposits} notes)`).join("; ")}`);
const poolLabel = "USDC-10";
const pool = d.pools[poolLabel]!;
const DENOM = BigInt(pool.denomination);
const aliceStart = await bal(alice.address);
note(`Alice (payer) holds ${formatUsdc(aliceStart)} USDC; as native balance ${formatEther(await nativeBal(alice.address))} (18-dec view of the same funds)`);

// ---- 1. Bob turns on private receiving
begin("1. Bob turns on private receiving (ERC-6538)");
const bobKeys = await deriveStealthKeys({ signMessage: ({ message }) => bob.signMessage!({ message }) });
await send(bob, "registerKeys(1, metaAddress)", d.stealthRegistry, buildRegisterKeysCalldata(bobKeys.metaAddress));
note(`Bob's wallet ${bob.address} now resolves to a stealth meta-address (spending+viewing keys derived from one signature)`);

// ---- 2. Alice shields USDC
begin(`2. Shield: Alice deposits ${formatUsdc(DENOM)} USDC into pool ${poolLabel}`);
const noteA = generateNote(chainId, pool.address);
const commitmentA = fieldToHex(BigInt(noteCommitment(noteA)));
await send(alice, `USDC.approve(pool, ${formatUsdc(DENOM)})`, usdc, encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [pool.address, DENOM] }));
await send(alice, "pool.deposit(commitment)", pool.address, encodeFunctionData({ abi: kakushiPoolAbi, functionName: "deposit", args: [commitmentA] }));
note(`pool USDC balance ${formatUsdc(await bal(pool.address))}; Alice's note stays offline (${serializeNote(noteA).slice(0, 40)}…)`);

// ---- 3. Alice pays Bob's stealth address
begin("3. Alice pays Bob privately (ERC-5564 stealth address, one transaction)");
const resolved = await readStealthMetaAddress(pub, d.stealthRegistry, bob.address);
assert(resolved === bobKeys.metaAddress, "registry resolves Bob's wallet to his meta-address");
const PAY = 25_000_000n;
const plan = planStealthSend({ metaAddress: resolved!, amount: PAY, usdc, stealthPay: d.stealthPay });
await send(alice, "USDC.approve(StealthPay, 25)", plan.approve.to, plan.approve.data);
await send(alice, "StealthPay.sendToken(stealth, USDC, 25)", plan.pay.to, plan.pay.data);
note(`one-time address ${plan.stealth.stealthAddress} (unrelated to Bob's wallet ${bob.address} on chain); holds ${formatUsdc(await bal(plan.stealth.stealthAddress))} USDC`);

// ---- 4. Bob scans, finds, spends with USDC as gas
begin("4. Bob scans the announcer, finds the payment and spends it (USDC is the gas)");
const latest = await pub.getBlockNumber();
const found = await scanAnnouncements(pub, d.stealthAnnouncer, BigInt(d.deployBlock), latest, bobKeys, { withBalances: true });
assert(found.length === 1, `exactly one announcement is Bob's, found ${found.length}`);
const m = found[0]!;
assert(m.stealthAddress === getAddress(plan.stealth.stealthAddress), "the match is the address Alice paid");
assert(m.kind === "erc20" && m.amount === PAY && m.token?.toLowerCase() === usdc.toLowerCase(), "metadata decodes to 25 USDC");
assert(m.balance === PAY, "balance at the stealth address is 25 USDC");
const stealthAcct = privateKeyToAccount(m.stealthPrivateKey!);
assert(stealthAcct.address === m.stealthAddress, "the derived private key controls the stealth address");
const nativeView = await nativeBal(m.stealthAddress);
assert(nativeView === PAY * NATIVE_PER_USDC_UNIT, "native balance = ERC-20 balance * 1e12 (same USDC, two views)");
note(`found: ${formatUsdc(m.balance!)} USDC at ${m.stealthAddress} (announced in tx ${m.txHash}); private key derived; native view ${nativeView} wei = ${formatUsdc(m.balance!)} USDC`);
note(`the stealth address holds ONLY USDC, yet it can send transactions: gas is paid in USDC`);
// Bob shields 10 USDC from the stealth address (approve + deposit, both paid in USDC gas by the stealth address itself)
const noteB = generateNote(chainId, pool.address);
const b0 = await bal(m.stealthAddress);
await send(stealthAcct, "USDC.approve(pool, 10) [from the stealth address]", usdc, encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [pool.address, DENOM] }));
await send(stealthAcct, "pool.deposit(commitment) [from the stealth address]", pool.address, encodeFunctionData({ abi: kakushiPoolAbi, functionName: "deposit", args: [fieldToHex(BigInt(noteCommitment(noteB)))] }));
const b1 = await bal(m.stealthAddress);
note(`stealth address: ${formatUsdc(b0)} -> ${formatUsdc(b1)} USDC after shielding 10 (the ${formatUsdc(b0 - DENOM - b1)} USDC difference was gas, paid in USDC)`);

// ---- 5. gasless withdrawals through the relayer
begin("5. Withdraw through the relayer, gasless (fee paid in USDC out of the note)");
const relayer = new Relayer({ account: relayerAcct as never, pools: poolsOf(d), network: "testnet", rpc: RPC, log: (s) => line(`   [relayer] ${s}`) });
const server = relayerServer(relayer);
await new Promise<void>((r) => server.listen(RELAYER_PORT, "127.0.0.1", r));
const relayerUrl = `http://127.0.0.1:${RELAYER_PORT}`;
const proofs: { who: string; ms: number }[] = [];
try {
  const info = await getRelayerInfo(relayerUrl);
  const quotedFee = BigInt(info.feeByPool[pool.address] ?? "-1");
  assert(info.address === relayerAcct.address && quotedFee > 0n && quotedFee < DENOM, "relayer quotes a USDC fee below the note");
  note(`relayer ${info.address} quotes ${formatUsdc(quotedFee)} USDC per withdrawal from ${poolLabel} (4.3M gas x gas price x 1.25, converted from 18-dec native wei to 6-dec USDC; a withdrawal measures about 3.64M gas)`);
  const relayerBefore = await bal(relayerAcct.address);
  
  for (const [who, n, from] of [["Alice's note", noteA, "Alice"], ["Bob's note (shielded from his stealth address)", noteB, "Bob"]] as const) {
    const fresh = privateKeyToAccount(generatePrivateKey());
    assert((await nativeBal(fresh.address)) === 0n && (await bal(fresh.address)) === 0n, "recipient starts with nothing: no USDC, so no gas");
    const tree = await IncrementalMerkleTree.fromDeposits(pub, pool.address, BigInt(d.deployBlock));
    const w = withdrawWitness(n, tree, { recipient: fresh.address, relayer: info.address, fee: quotedFee });
    const proof = await proveWithdraw(w);
    proofs.push({ who, ms: proof.ms });
    note(`${who}: UltraHonk proof made in ${(proof.ms / 1000).toFixed(1)} s (${(proof.proof.length - 2) / 2} bytes), bound to recipient ${fresh.address}, relayer ${info.address}, fee ${formatUsdc(quotedFee)}`);
    const { txHash } = await relayWithdraw(relayerUrl, { chainId, pool: pool.address, proof: proof.proof, args: { root: w.root, nullifierHash: w.nullifierHash, recipient: fresh.address, relayer: info.address, fee: quotedFee } });
    const rc = await pub.waitForTransactionReceipt({ hash: txHash });
    assert(rc.status === "success", "relayed withdraw succeeded");
    cur.txs.push({ label: `relayer -> pool.withdraw (${from} withdraws to a fresh address)`, hash: txHash, gasUsed: rc.gasUsed, gasCostUnits: (rc.gasUsed * rc.effectiveGasPrice + NATIVE_PER_USDC_UNIT - 1n) / NATIVE_PER_USDC_UNIT });
    line(`   tx relayed withdraw: ${txHash}  gas ${rc.gasUsed}`);
    const got = await bal(fresh.address);
    assert(got === DENOM - quotedFee, `fresh address received ${formatUsdc(DENOM - quotedFee)} USDC`);
    assert(rc.from.toLowerCase() === relayerAcct.address.toLowerCase(), "the transaction was sent by the relayer, not the recipient");
    assert((await pub.getTransactionCount({ address: fresh.address })) === 0, "the recipient never sent a transaction");
    note(`${from}'s withdrawal: ${fresh.address} received ${formatUsdc(got)} USDC with zero prior balance and zero transactions sent; nullifier spent: ${await pub.readContract({ address: pool.address, abi: kakushiPoolAbi, functionName: "isSpent", args: [w.nullifierHash] })}`);
    // a replay is refused
    const replay = await relayWithdraw(relayerUrl, { chainId, pool: pool.address, proof: proof.proof, args: { root: w.root, nullifierHash: w.nullifierHash, recipient: fresh.address, relayer: info.address, fee: quotedFee } }).then(() => "accepted", (e: Error) => e.message);
    assert(replay !== "accepted", "replaying a spent note is refused");
    note(`replaying the same proof is refused by the relayer: "${replay.slice(0, 160)}"`);
  }
  const relayerAfter = await bal(relayerAcct.address);
  const relayed = cur.txs.filter((t) => t.label.startsWith("relayer"));
  const gasPaid = relayed.reduce((s, t) => s + t.gasCostUnits, 0n);
  const feesIn = quotedFee * BigInt(relayed.length);
  assert(relayerAfter - relayerBefore >= feesIn - gasPaid - 2n && relayerAfter > relayerBefore, "the relayer is repaid more than its gas");
  note(`relayer USDC: ${formatUsdc(relayerBefore)} -> ${formatUsdc(relayerAfter)}: fees ${formatUsdc(feesIn)} - gas ${formatUsdc(gasPaid)} = net +${formatUsdc(relayerAfter - relayerBefore)} USDC (fee token and gas token are the same asset, so there is no FX or oracle step)`);
} finally {
  server.close();
}

// ---------------------------------------------------------------------------------------------- report
const poolBal = await bal(pool.address);
begin("6. End state");
note(`pool ${poolLabel} USDC balance ${formatUsdc(poolBal)} (both notes withdrawn); Alice ${formatUsdc(aliceStart)} -> ${formatUsdc(await bal(alice.address))} USDC`);
const md: string[] = [];
md.push("# End-to-end on an Arc Foundry fork");
md.push("");
md.push(`Run \`${startedAt.toISOString()}\` by \`node scripts/e2e-fork.ts\` against \`anvil --network arc --fork-url ${arc.publicRpc}\` (Arc testnet, chain ${arc.chainId}, forked at block ${forkBlock}). Every transaction below is a real signed transaction executed by Arc's own USDC implementation (\`0x3600…0000\`, FiatToken-compatible, 6 decimals, native-gas-aware); every withdrawal verifies a real Noir/UltraHonk proof on-chain. Hashes are from the fork, so they have no public explorer page; the same script and contracts deploy to ${arc.name} with \`pnpm deploy:testnet\`.`);
md.push("");
md.push("Every account is a fresh random key funded on the fork with `anvil_setBalance` (anvil's well-known dev keys are blocklisted by Arc's USDC, so they cannot be used). The withdrawal recipients are fresh random keys that start with 0 USDC and never send a transaction.");
md.push("");
md.push("## Deployment (script/Deploy.s.sol)");
md.push("");
md.push("| Contract | Address | Tx | Gas |");
md.push("| --- | --- | --- | --- |");
const addrOf: Record<string, string> = { StealthRegistry: d.stealthRegistry, StealthAnnouncer: d.stealthAnnouncer, StealthPay: d.stealthPay, ShieldedWithdrawVerifier: d.shieldedVerifier };
let poolIdx = 0;
const poolList = Object.values(d.pools);
for (const t of deployTxs) {
  const a = t.name === "KakushiPool" ? poolList[poolIdx++]?.address : addrOf[t.name];
  md.push(`| ${t.name}${t.name === "KakushiPool" ? ` (${Object.keys(d.pools)[poolIdx - 1]})` : ""} | ${a ? `\`${a}\`` : "linked library"} | \`${t.hash}\` | ${t.gas} |`);
}
if (deployTxs.length) md.push(`| **total** | | | **${deployTxs.reduce((s, t) => s + t.gas, 0n)}** |`);
md.push("");
for (const s of steps) {
  md.push(`## ${s.title}`);
  md.push("");
  for (const n of s.notes) md.push(`- ${n}`);
  if (s.txs.length) {
    md.push("");
    md.push("| Transaction | Hash | Gas used | Gas cost (USDC) |");
    md.push("| --- | --- | --- | --- |");
    for (const t of s.txs) md.push(`| ${t.label} | \`${t.hash}\` | ${t.gasUsed} | ${formatUsdc(t.gasCostUnits)} |`);
  }
  md.push("");
}
md.push("## Proof timings");
md.push("");
for (const p of proofs) md.push(`- ${p.who}: ${(p.ms / 1000).toFixed(1)} s (noir_js witness + bb.js UltraHonk, 2 threads, Node ${process.version})`);
md.push("");
mkdirSync(dirname(OUT_DOC), { recursive: true });
writeFileSync(OUT_DOC, md.join("\n"));
line(`\nOK: core loop proven on the fork. Wrote ${OUT_DOC}`);
process.exit(0);
