// Live end-to-end on Arc TESTNET (chain 5042002) with real transactions and real UltraHonk proofs:
//   1. Bob turns on private receiving                  (ERC-6538 registry)
//   2. shield 1 USDC (twice: one note is withdrawn here, one is kept for the browser check)   (Alice: approve + deposit)
//   3. Alice stealth-pays Bob                          (StealthPay.sendToken)
//   4. Bob scans the announcer through the public RPC, finds the payment and derives the stealth key
//   5. gasless relayer withdrawal of one note to a brand-new address that starts with 0 USDC
// Usage:  node scripts/e2e-testnet.ts            (writes docs/E2E-TESTNET.md)
// State: keys for Alice, Bob and the relayer live in .run/testnet.env (gitignored; testnet-only throwaway keys, never
// printed). On first run the script funds them from the shared deployer wallet (DEPLOYER_ENV_FILE, default
// ../.deployer/deployer.env) under the shared deploy lock; total spend is capped below (FUND_* constants).
import { existsSync, mkdirSync, readFileSync, renameSync, rmdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, encodeFunctionData, getAddress, http, type Account, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { chainByNetwork, explorerAddress, explorerTx, formatUsdc, NATIVE_PER_USDC_UNIT } from "../config/chains.ts";
import { loadDeployment } from "../config/deployments.ts";
import {
  IncrementalMerkleTree, noteCommitment, buildRegisterKeysCalldata, deriveStealthKeys, erc20Abi, fieldToHex, generateNote, kakushiPoolAbi, planStealthSend, readStealthMetaAddress,
  relayWithdraw, getRelayerInfo, scanAnnouncements, serializeNote, viemChain, withdrawWitness,
} from "../packages/sdk/src/index.ts";
import { proveWithdraw } from "../packages/sdk/src/node.ts";
import { Relayer } from "../packages/relayer/src/relayer.ts";
import { poolsOf } from "../packages/relayer/src/config.ts";
import { relayerServer } from "../packages/relayer/src/server.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RUN = join(root, ".run");
const KEYS_FILE = join(RUN, "testnet.env");
const BROWSER_NOTE = join(RUN, "testnet-browser-note.txt");
const OUT_DOC = join(root, "docs", "E2E-TESTNET.md");
const RELAYER_PORT = Number(process.env.E2E_RELAYER_PORT ?? 9201);
const DEPLOYER_ENV = process.env.DEPLOYER_ENV_FILE ?? resolve(root, "../.deployer/deployer.env");
const LOCK = resolve(root, "../.deployer/lock");

// Funding caps (USDC base units, 6 decimals). Total 2.58 USDC.
const FUND_ALICE = 2_250_000n; // 2 x 1 USDC shielded + 0.1 paid to Bob + gas
const FUND_BOB = 30_000n; // registerKeys gas
const FUND_RELAYER = 300_000n; // gas for the withdrawals, repaid by the notes' fees
const PAY = 100_000n; // 0.1 USDC stealth payment

const arc = chainByNetwork("testnet");
const d = loadDeployment("testnet");
if (!d) throw new Error("deployments/arc-testnet.json missing");
const RPC = process.env.ARC_RPC_URL ?? arc.publicRpc;
const chain = viemChain(arc, RPC);
const pub = createPublicClient({ chain, transport: http(RPC) });
const wallet = (account: Account) => createWalletClient({ account, chain, transport: http(RPC) });
const usdc = arc.usdc;
const line = (s: string) => console.log(s);
const tx = (h: string) => `[${h.slice(0, 10)}…](${explorerTx(arc, h)})`;
const addr = (a: string) => `[\`${a}\`](${explorerAddress(arc, a)})`;

// ---------------------------------------------------------------------------------------------- keys (never printed)
function loadKeys(): Record<"ALICE_KEY" | "BOB_KEY" | "RELAYER_KEY", Hex> {
  mkdirSync(RUN, { recursive: true });
  const env: Record<string, string> = {};
  if (existsSync(KEYS_FILE)) for (const l of readFileSync(KEYS_FILE, "utf8").split("\n")) { const m = /^(\w+)=(0x[0-9a-fA-F]{64})$/.exec(l.trim()); if (m) env[m[1]!] = m[2]!; }
  let changed = false;
  for (const k of ["ALICE_KEY", "BOB_KEY", "RELAYER_KEY"]) if (!env[k]) { env[k] = generatePrivateKey(); changed = true; }
  if (changed) writeFileSync(KEYS_FILE, Object.entries(env).map(([k, v]) => `${k}=${v}`).join("\n") + "\n", { mode: 0o600 });
  return env as never;
}
const keys = loadKeys();
const [alice, bob, relayerAcct] = [privateKeyToAccount(keys.ALICE_KEY), privateKeyToAccount(keys.BOB_KEY), privateKeyToAccount(keys.RELAYER_KEY)];

// ---------------------------------------------------------------------------------------------- reporting
interface Step { title: string; txs: { label: string; hash: Hex; gasUsed: bigint; cost: bigint }[]; notes: string[] }
const steps: Step[] = [];
let cur: Step = { title: "", txs: [], notes: [] };
const begin = (title: string) => { cur = { title, txs: [], notes: [] }; steps.push(cur); line(`\n== ${title}`); };
const note = (s: string) => { cur.notes.push(s); line(`   ${s}`); };
const assert = (c: unknown, m: string) => { if (!c) throw new Error(`ASSERTION FAILED: ${m}`); };
const bal = (a: Hex) => pub.readContract({ address: usdc, abi: erc20Abi, functionName: "balanceOf", args: [a] });
const costOf = (gasUsed: bigint, price: bigint) => (gasUsed * price + NATIVE_PER_USDC_UNIT - 1n) / NATIVE_PER_USDC_UNIT;
let spentGas = 0n;

async function send(account: Account, label: string, to: Hex, data: Hex): Promise<Hex> {
  const hash = await wallet(account).sendTransaction({ to, data, account, chain });
  const rc = await pub.waitForTransactionReceipt({ hash });
  if (rc.status !== "success") throw new Error(`${label} reverted (${hash})`);
  const cost = costOf(rc.gasUsed, rc.effectiveGasPrice);
  spentGas += cost;
  cur.txs.push({ label, hash, gasUsed: rc.gasUsed, cost });
  line(`   tx ${label}: ${hash}  gas ${rc.gasUsed} (${formatUsdc(cost)} USDC)`);
  return hash;
}

// ---------------------------------------------------------------------------------------------- fund (shared deployer wallet, under the shared lock)
async function fundFromDeployer(): Promise<void> {
  const want: [string, Account, bigint][] = [["Alice", alice, FUND_ALICE], ["Bob", bob, FUND_BOB], ["relayer", relayerAcct, FUND_RELAYER]];
  const todo: [string, Account, bigint][] = [];
  for (const [n, a, amt] of want) { const have = await bal(a.address); if (have < amt) todo.push([n, a, amt - have]); }
  if (todo.length === 0) return;
  const text = readFileSync(DEPLOYER_ENV, "utf8");
  const dk = /DEPLOYER_PRIVATE_KEY\s*=\s*"?(0x[0-9a-fA-F]{64})/.exec(text)?.[1] as Hex | undefined;
  if (!dk) throw new Error(`no DEPLOYER_PRIVATE_KEY in ${DEPLOYER_ENV}`);
  const deployer = privateKeyToAccount(dk);
  assert(deployer.address.toLowerCase() === d!.deployer.toLowerCase(), "deployer key matches the deployment record");
  const total = todo.reduce((s, [, , a]) => s + a, 0n);
  assert(total <= 3_000_000n, "funding stays within 3 USDC");
  while (true) { try { mkdirSync(LOCK); break; } catch { await new Promise((r) => setTimeout(r, 3000)); } }
  try {
    for (const [n, a, amt] of todo) {
      const hash = await send(deployer, `deployer -> ${n}: USDC.transfer(${formatUsdc(amt)})`, usdc, encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [a.address, amt] }));
      void hash;
    }
  } finally {
    rmdirSync(LOCK);
  }
}

// ---------------------------------------------------------------------------------------------- main
const startedAt = new Date();
const chainId = await pub.getChainId();
assert(chainId === arc.chainId, `expected Arc testnet (5042002), got ${chainId}`);
const startBlock = await pub.getBlockNumber();
const pool = d.pools["USDC-1"]!;
const poolLabel = "USDC-1";
const DENOM = BigInt(pool.denomination);

begin("0. Network, deployment and funding");
note(`RPC ${RPC}, chain ${chainId}, block ${startBlock}. Contracts from deployments/arc-testnet.json (deployed at block ${d.deployBlock}).`);
note(`Pool ${poolLabel}: ${addr(pool.address)}, StealthPay ${addr(d.stealthPay)}, announcer ${addr(d.stealthAnnouncer)}, registry ${addr(d.stealthRegistry)}, verifier ${addr(d.shieldedVerifier)}`);
note(`Accounts are fresh throwaway keys (kept in a gitignored file): Alice (payer) ${addr(alice.address)}, Bob (recipient) ${addr(bob.address)}, relayer ${addr(relayerAcct.address)}.`);
note(`Pool state before: ${formatUsdc(await bal(pool.address))} USDC held, ${await pub.readContract({ address: pool.address, abi: kakushiPoolAbi, functionName: "nextIndex" }).catch(() => "?")} deposits so far.`);
await fundFromDeployer();
const aliceStart = await bal(alice.address);
const relayerStart = await bal(relayerAcct.address);
note(`Funded from the shared deployer wallet (capped at 3 USDC): Alice ${formatUsdc(aliceStart)} USDC, Bob ${formatUsdc(await bal(bob.address))} USDC, relayer ${formatUsdc(relayerStart)} USDC.`);

begin("1. Bob turns on private receiving (ERC-6538)");
const bobKeys = await deriveStealthKeys({ signMessage: ({ message }) => bob.signMessage!({ message }) });
await send(bob, "registerKeys(1, metaAddress)", d.stealthRegistry, buildRegisterKeysCalldata(bobKeys.metaAddress));
note(`Bob's wallet resolves to a stealth meta-address (spending and viewing keys derived from one signature).`);

begin(`2. Shield: Alice deposits 2 x ${formatUsdc(DENOM)} USDC into pool ${poolLabel}`);
const noteA = generateNote(chainId, pool.address);
const noteB = generateNote(chainId, pool.address);
// persist the browser note BEFORE any money moves so it can never be lost
for (const f of [BROWSER_NOTE, BROWSER_NOTE.replace("browser-note", "note-a")]) if (existsSync(f)) renameSync(f, `${f}.${Date.now()}.bak`);
writeFileSync(BROWSER_NOTE, serializeNote(noteB) + "\n", { mode: 0o600 });
writeFileSync(BROWSER_NOTE.replace("browser-note", "note-a"), serializeNote(noteA) + "\n", { mode: 0o600 });
await send(alice, `USDC.approve(pool, ${formatUsdc(DENOM * 2n)})`, usdc, encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [pool.address, DENOM * 2n] }));
const poolBefore = await bal(pool.address);
await send(alice, "pool.deposit(commitment A)", pool.address, encodeFunctionData({ abi: kakushiPoolAbi, functionName: "deposit", args: [fieldToHex(BigInt(noteCommitment(noteA)))] }));
await send(alice, "pool.deposit(commitment B)", pool.address, encodeFunctionData({ abi: kakushiPoolAbi, functionName: "deposit", args: [fieldToHex(BigInt(noteCommitment(noteB)))] }));
assert((await bal(pool.address)) - poolBefore === DENOM * 2n, "the pool received 2 USDC");
note(`pool ${poolLabel} USDC balance ${formatUsdc(await bal(pool.address))}. Only the commitments are on chain; the notes stay offline (note B is kept in a gitignored file for the in-browser withdrawal check).`);

begin(`3. Alice pays Bob privately (ERC-5564 stealth address, ${formatUsdc(PAY)} USDC)`);
const resolved = await readStealthMetaAddress(pub, d.stealthRegistry, bob.address);
assert(resolved === bobKeys.metaAddress, "registry resolves Bob's wallet to his meta-address");
const plan = planStealthSend({ metaAddress: resolved!, amount: PAY, usdc, stealthPay: d.stealthPay });
await send(alice, `USDC.approve(StealthPay, ${formatUsdc(PAY)})`, plan.approve.to, plan.approve.data);
await send(alice, `StealthPay.sendToken(stealth, USDC, ${formatUsdc(PAY)})`, plan.pay.to, plan.pay.data);
note(`one-time address ${addr(plan.stealth.stealthAddress)} (unrelated to Bob's wallet on chain); holds ${formatUsdc(await bal(plan.stealth.stealthAddress))} USDC.`);

begin("4. Bob scans the announcer through the public RPC and finds the payment");
const latest = await pub.getBlockNumber();
const t0 = Date.now();
const found = await scanAnnouncements(pub, d.stealthAnnouncer, BigInt(d.deployBlock), latest, bobKeys, { withBalances: true, concurrency: 6 });
const scanMs = Date.now() - t0;
const m = found.find((x) => x.stealthAddress === getAddress(plan.stealth.stealthAddress));
assert(m, `Bob finds Alice's payment (found ${found.length} match(es))`);
assert(m!.kind === "erc20" && m!.amount === PAY && m!.token?.toLowerCase() === usdc.toLowerCase(), "metadata decodes to the paid USDC amount");
assert(m!.balance === PAY, "balance at the stealth address equals the payment");
assert(privateKeyToAccount(m!.stealthPrivateKey!).address === m!.stealthAddress, "the derived private key controls the stealth address");
note(`Scanned blocks ${d.deployBlock}..${latest} (${Math.ceil(Number(latest - BigInt(d.deployBlock)) / 5000)} pages of 5,000 blocks, 6 in parallel) in ${(scanMs / 1000).toFixed(1)} s: ${found.length} announcement(s) belong to Bob. Found ${formatUsdc(m!.balance!)} USDC at ${addr(m!.stealthAddress)}, announced in ${tx(m!.txHash)}; stealth private key derived and checked.`);

begin("5. Gasless withdrawal through the relayer (fee paid in USDC out of the note)");
const relayer = new Relayer({ account: relayerAcct as never, pools: poolsOf(d), network: "testnet", rpc: RPC, log: (s) => line(`   [relayer] ${s}`) });
const server = relayerServer(relayer);
await new Promise<void>((r) => server.listen(RELAYER_PORT, "127.0.0.1", r));
const relayerUrl = `http://127.0.0.1:${RELAYER_PORT}`;
let proofMs = 0;
try {
  const info = await getRelayerInfo(relayerUrl);
  const quotedFee = BigInt(info.feeByPool[pool.address] ?? "-1");
  assert(info.address === relayerAcct.address && quotedFee > 0n && quotedFee < DENOM, `relayer quotes a USDC fee below the 1 USDC note (quote ${quotedFee})`);
  note(`relayer ${addr(info.address)} quotes ${formatUsdc(quotedFee)} USDC for a ${poolLabel} withdrawal (that is ${(Number(quotedFee) / Number(DENOM) * 100).toFixed(0)}% of the note, the price of gas for a ~3.6M-gas proof verification).`);
  const recipient = privateKeyToAccount(generatePrivateKey());
  assert((await bal(recipient.address)) === 0n && (await pub.getBalance({ address: recipient.address })) === 0n, "recipient starts with nothing");
  const tree = await IncrementalMerkleTree.fromDeposits(pub, pool.address, BigInt(d.deployBlock), undefined, { concurrency: 6 });
  const w = withdrawWitness(noteA, tree, { recipient: recipient.address, relayer: info.address, fee: quotedFee });
  const proof = await proveWithdraw(w);
  proofMs = proof.ms;
  note(`UltraHonk proof made in Node in ${(proof.ms / 1000).toFixed(1)} s (${(proof.proof.length - 2) / 2} bytes), bound to recipient ${addr(recipient.address)}, relayer and fee.`);
  const { txHash } = await relayWithdraw(relayerUrl, { chainId, pool: pool.address, proof: proof.proof, args: { root: w.root, nullifierHash: w.nullifierHash, recipient: recipient.address, relayer: info.address, fee: quotedFee } });
  const rc = await pub.waitForTransactionReceipt({ hash: txHash });
  assert(rc.status === "success", "relayed withdraw succeeded");
  cur.txs.push({ label: "relayer -> pool.withdraw (Alice's note A, to a fresh address)", hash: txHash, gasUsed: rc.gasUsed, cost: costOf(rc.gasUsed, rc.effectiveGasPrice) });
  line(`   tx relayed withdraw: ${txHash}  gas ${rc.gasUsed}`);
  const got = await bal(recipient.address);
  assert(got === DENOM - quotedFee, `fresh address received ${formatUsdc(DENOM - quotedFee)} USDC (got ${got})`);
  assert(rc.from.toLowerCase() === relayerAcct.address.toLowerCase(), "the transaction was sent by the relayer");
  assert((await pub.getTransactionCount({ address: recipient.address })) === 0, "the recipient never sent a transaction");
  note(`${addr(recipient.address)} received ${formatUsdc(got)} USDC with zero prior balance and zero transactions sent. Nullifier spent: ${await pub.readContract({ address: pool.address, abi: kakushiPoolAbi, functionName: "isSpent", args: [w.nullifierHash] })}.`);
  const replay = await relayWithdraw(relayerUrl, { chainId, pool: pool.address, proof: proof.proof, args: { root: w.root, nullifierHash: w.nullifierHash, recipient: recipient.address, relayer: info.address, fee: quotedFee } }).then(() => "accepted", (e: Error) => e.message);
  assert(replay !== "accepted", "replaying a spent note is refused");
  note(`Replaying the same proof is refused by the relayer: "${replay.slice(0, 140)}"`);
  const relayerEnd = await bal(relayerAcct.address);
  note(`relayer USDC: ${formatUsdc(relayerStart)} -> ${formatUsdc(relayerEnd)} (fee ${formatUsdc(quotedFee)} received, gas ${formatUsdc(costOf(rc.gasUsed, rc.effectiveGasPrice))} paid)`);
} finally {
  server.close();
}

begin("6. End state");
note(`pool ${poolLabel}: ${formatUsdc(await bal(pool.address))} USDC (note B still unspent, reserved for the browser withdrawal check). Alice ${formatUsdc(aliceStart)} -> ${formatUsdc(await bal(alice.address))} USDC.`);

const md: string[] = [];
md.push("# End-to-end on Arc testnet (live)");
md.push("");
md.push(`Run \`${startedAt.toISOString()}\` by \`node scripts/e2e-testnet.ts\` against the public Arc testnet RPC (${arc.publicRpc}, chain ${arc.chainId}). Every transaction below is real and public: the hashes link to ${arc.explorer}. Every withdrawal verifies a real Noir/UltraHonk proof on-chain in the deployed verifier. The contracts are the ones in \`deployments/arc-testnet.json\`.`);
md.push("");
md.push("Accounts are fresh random keys funded from the shared deployer wallet (about 2.6 USDC in total); the withdrawal recipient is a fresh key that starts with 0 USDC and never sends a transaction. A single relayer (its own fresh key, funded with 0.3 USDC) submits the withdrawal and is repaid in USDC.");
md.push("");
for (const s of steps) {
  md.push(`## ${s.title}`);
  md.push("");
  for (const n of s.notes) md.push(`- ${n}`);
  if (s.txs.length) {
    md.push("");
    md.push("| Transaction | Hash | Gas used | Gas cost (USDC) |");
    md.push("| --- | --- | --- | --- |");
    for (const t of s.txs) md.push(`| ${t.label} | [\`${t.hash}\`](${explorerTx(arc, t.hash)}) | ${t.gasUsed} | ${formatUsdc(t.cost)} |`);
  }
  md.push("");
}
md.push("## Timings");
md.push("");
md.push(`- Node proof: ${(proofMs / 1000).toFixed(1)} s (noir_js witness + bb.js UltraHonk, Node ${process.version}).`);
md.push(`- Receive scan over the public RPC: ${(scanMs / 1000).toFixed(1)} s for ${Math.ceil(Number(latest - BigInt(d.deployBlock)) / 5000)} pages of 5,000 blocks.`);
md.push("");
mkdirSync(dirname(OUT_DOC), { recursive: true });
writeFileSync(OUT_DOC, md.join("\n"));
line(`\nOK: live testnet loop proven. Wrote ${OUT_DOC}. Gas spent by the run's own accounts: ${formatUsdc(spentGas)} USDC`);
process.exit(0);
