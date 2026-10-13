import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import { type Hex, custom, decodeFunctionData, getAddress, keccak256, numberToHex, parseTransaction } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { kakushiPoolAbi } from "@kakushi/sdk";
import { loadRelayerConfig, poolsOf, type PoolConfig } from "../src/config.ts";
import { Relayer } from "../src/relayer.ts";
import { relayerServer } from "../src/server.ts";
import { RelayError, validateRelayRequest } from "../src/validate.ts";

const KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as Hex; // anvil #1, public
const account = privateKeyToAccount(KEY);
const CHAIN = 5042002;
const POOL = "0xc0ffee254729296a45a3885639AC7E10F9d54979" as Hex;
const BIG_POOL = "0x00000000000000000000000000000000000000AA" as Hex;
const pools: PoolConfig[] = [
  { label: "USDC-1", pool: POOL, denomination: 1_000_000n },
  { label: "USDC-100", pool: BIG_POOL, denomination: 100_000_000n },
];
const RECIPIENT = "0x00000000000000000000000000000000000000bb" as Hex;
const ctx = { relayer: account.address, chainId: CHAIN, pools, minFee: 10_000n };

const body = (over: Record<string, unknown> = {}, args: Record<string, unknown> = {}) => ({
  chainId: CHAIN,
  pool: POOL,
  proof: `0x${"ab".repeat(512)}`,
  args: { root: `0x${"11".repeat(32)}`, nullifierHash: `0x${"22".repeat(32)}`, recipient: RECIPIENT, relayer: account.address, fee: "250000", ...args },
  ...over,
});

function reject(b: unknown, re: RegExp) {
  try {
    validateRelayRequest(b, ctx);
  } catch (e) {
    expect(e).toBeInstanceOf(RelayError);
    expect((e as RelayError).status).toBe(400);
    expect((e as Error).message).toMatch(re);
    return;
  }
  throw new Error("expected a RelayError");
}

describe("validateRelayRequest", () => {
  it("accepts a well-formed request and normalizes it", () => {
    const r = validateRelayRequest(body({ pool: POOL.toLowerCase() }, { fee: 250000 }), ctx);
    expect(r.pool.pool).toBe(getAddress(POOL));
    expect(r.args.fee).toBe(250_000n);
    expect(r.args.relayer).toBe(account.address);
  });
  it("pins chain, pool, relayer address and the fee range", () => {
    reject(body({ chainId: 5042 }), /serves chain 5042002/);
    reject(body({ pool: "0x00000000000000000000000000000000000000cc" }), /not a Kakushi pool/);
    reject(body({}, { relayer: RECIPIENT }), /must be this relayer's address/);
    reject(body({}, { fee: "9999" }), /below this relayer's minimum 10000/);
    reject(body({}, { fee: "1000000" }), /below the pool denomination/);
  });
  it("rejects malformed fields", () => {
    reject(null, /JSON object/);
    reject(body({ proof: "0x" }), /proof must be non-empty/);
    reject(body({ proof: `0x${"ab".repeat(60_000)}` }), /larger than/);
    reject(body({}, { root: "0x12" }), /root must be/);
    reject(body({}, { nullifierHash: `0x${"ff".repeat(32)}` }), /not a BN254 field element/);
    reject(body({}, { recipient: "0x0000000000000000000000000000000000000000" }), /zero address/);
    reject(body({}, { recipient: POOL }), /must not be the pool/);
    reject(body({}, { fee: "-1" }), /fee must be a non-negative integer/);
  });
});

/** a scripted Arc node: gas price 21 gwei, 7M gas per withdrawal */
function fakeNode(opts: { revert?: boolean; gasPrice?: bigint } = {}) {
  const sent: Hex[] = [];
  const gasPrice = opts.gasPrice ?? 21_000_000_000n;
  const transport = custom({
    request: async ({ method, params = [] }: { method: string; params?: unknown[] }) => {
      switch (method) {
        case "eth_chainId":
          return numberToHex(CHAIN);
        case "eth_gasPrice":
          return numberToHex(gasPrice);
        case "eth_getBalance":
          return numberToHex(2n * 10n ** 18n); // 2 USDC
        case "eth_call":
          if (opts.revert) throw Object.assign(new Error("execution reverted: InvalidProof()"), { code: 3, data: "0x09bde339" });
          return "0x";
        case "eth_estimateGas":
          return numberToHex(7_000_000n);
        case "eth_getTransactionCount":
          return "0x5";
        case "eth_getBlockByNumber":
          return { number: "0x10", baseFeePerGas: numberToHex(gasPrice), timestamp: "0x1", transactions: [], gasLimit: "0x1c9c380", hash: `0x${"00".repeat(32)}`, parentHash: `0x${"00".repeat(32)}` };
        case "eth_maxPriorityFeePerGas":
          return "0x1";
        case "eth_feeHistory":
          return { oldestBlock: "0x1", baseFeePerGas: [numberToHex(gasPrice), numberToHex(gasPrice)], gasUsedRatio: [0.5], reward: [["0x1"]] };
        case "eth_sendRawTransaction": {
          sent.push(params[0] as Hex);
          return keccak256(params[0] as Hex);
        }
        default:
          throw Object.assign(new Error(`method not found: ${method}`), { code: -32601 });
      }
    },
  });
  return { sent, transport };
}

const mk = (n: ReturnType<typeof fakeNode>, extra: Partial<ConstructorParameters<typeof Relayer>[0]> = {}) =>
  new Relayer({ account, pools, network: "testnet", transport: n.transport, log: () => {}, ...extra });

describe("Relayer", () => {
  it("quotes the fee in USDC units from gas: 7M gas at 21 gwei is about 0.18 USDC, not 1e18", async () => {
    const info = await mk(fakeNode()).quote();
    // 7_000_000 * 21e9 * 1.25 = 1.8375e17 wei = 183_750 USDC units
    expect(info.feeByPool[POOL]).toBe("183750");
    expect(info.feeByPool[BIG_POOL]).toBe("183750");
    expect(info.chainId).toBe(CHAIN);
  });
  it("floors the fee and drops pools where the fee is too large a share of the note", async () => {
    const cheap = await mk(fakeNode({ gasPrice: 1_000_000_000n })).quote();
    expect(cheap.feeByPool[POOL]).toBe("10000"); // the floor
    const dear = await mk(fakeNode({ gasPrice: 100_000_000_000n })).quote(); // 100 gwei: 0.875 USDC
    expect(dear.feeByPool[POOL]).toBeUndefined(); // 0.875 of a 1 USDC note is too much
    expect(dear.feeByPool[BIG_POOL]).toBe("875000");
  });
  it("reports its balance in USDC units", async () => {
    expect(await mk(fakeNode()).balance()).toBe(2_000_000n);
  });
  it("relays: simulates, checks fee >= gas cost, signs withdraw() with no native value", async () => {
    const n = fakeNode();
    const { txHash } = await mk(n).relay(body());
    expect(n.sent).toHaveLength(1);
    expect(txHash).toBe(keccak256(n.sent[0]!));
    const tx = parseTransaction(n.sent[0]!);
    expect(tx.to?.toLowerCase()).toBe(POOL.toLowerCase());
    expect(tx.value ?? 0n).toBe(0n);
    const d = decodeFunctionData({ abi: kakushiPoolAbi, data: tx.data! });
    expect(d.functionName).toBe("withdraw");
    expect(d.args?.slice(3)).toEqual([RECIPIENT, account.address, 250_000n]);
  });
  it("refuses a fee below the gas it would pay (402) and a revert (422), without sending", async () => {
    const n = fakeNode();
    await expect(mk(n).relay(body({}, { fee: "50000" }))).rejects.toMatchObject({ status: 402 });
    const r = fakeNode({ revert: true });
    await expect(mk(r).relay(body())).rejects.toMatchObject({ status: 422 });
    expect(n.sent).toEqual([]);
    expect(r.sent).toEqual([]);
  });
  it("refuses a nullifier that is already in flight", async () => {
    const n = fakeNode();
    const rel = mk(n);
    const first = rel.relay(body());
    await expect(rel.relay(body())).rejects.toMatchObject({ status: 409 });
    await first;
  });
});

describe("server", () => {
  let base = "";
  let server: ReturnType<typeof relayerServer>;
  const node = fakeNode();
  beforeAll(async () => {
    server = relayerServer(mk(node));
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => void server.close());
  it("serves /health, /info and /relay", async () => {
    expect(await (await fetch(`${base}/health`)).json()).toMatchObject({ ok: true, address: account.address, balanceUsdc: "2000000" });
    const info = await (await fetch(`${base}/info`)).json();
    expect(info.feeByPool[POOL]).toBe("183750");
    const r = await fetch(`${base}/relay`, { method: "POST", body: JSON.stringify(body()) });
    expect(r.status).toBe(200);
    expect((await r.json()).txHash).toMatch(/^0x[0-9a-f]{64}$/);
    const bad = await fetch(`${base}/relay`, { method: "POST", body: JSON.stringify(body({}, { fee: "1" })) });
    expect(bad.status).toBe(400);
    expect((await fetch(`${base}/nope`)).status).toBe(404);
    // an oversized body is cut off: either a 413 or a closed connection, never processed
    const big = await fetch(`${base}/relay`, { method: "POST", body: "x".repeat(200_000) }).then((r) => r.status, () => 0);
    expect([0, 413]).toContain(big);
  });
});

describe("config", () => {
  it("reads pools from a deployment record and requires a key", () => {
    const dep = { network: "testnet", chainId: CHAIN, pools: { "USDC-10": { address: POOL, denomination: "10000000", maxDeposits: 10, decimals: 6 } } } as never;
    expect(poolsOf(dep)).toEqual([{ label: "USDC-10", pool: getAddress(POOL), denomination: 10_000_000n }]);
    expect(() => loadRelayerConfig({})).toThrow(/RELAYER_KEY/);
    expect(() => loadRelayerConfig({ RELAYER_KEY: "0x12" })).toThrow(/RELAYER_KEY/);
  });
});
