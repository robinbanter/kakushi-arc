// createKakushiPayment against viem clients whose transport is a scripted JSON-RPC node: every
// call is real viem encoding/decoding, only the network is fake.
import { describe, expect, it } from "vitest";
import {
  type Address,
  type Hex,
  createPublicClient,
  createWalletClient,
  custom,
  decodeFunctionData,
  defineChain,
  encodeFunctionResult,
  getAddress,
  numberToHex,
  pad,
} from "viem";
import { checkStealthAddress, erc6538RegistryAbi, metaAddressBytes, stealthKeysFromPrivateKeys } from "@kakushi/sdk";
import { type KakushiStatusEvent, KakushiPayError, createKakushiPayment, erc20Abi, resolveRecipient, stealthPayAbi } from "../src/core.ts";

const chain = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:1"] } },
});

const PAYER = getAddress("0x1111111111111111111111111111111111111111");
const RECIPIENT_WALLET = getAddress("0x2222222222222222222222222222222222222222");
const STEALTH_PAY = getAddress("0x3333333333333333333333333333333333333333");
const REGISTRY = getAddress("0x4444444444444444444444444444444444444444");
const TOKEN = getAddress("0x3600000000000000000000000000000000000000"); // Arc USDC
const deployment = { stealthRegistry: REGISTRY, stealthPay: STEALTH_PAY, usdc: TOKEN };

const keys = stealthKeysFromPrivateKeys(pad("0x01", { size: 32 }), pad("0x02", { size: 32 }));

interface SentTx {
  from: Address;
  to: Address;
  data: Hex;
  value: bigint;
  hash: Hex;
}

interface NodeOpts {
  chainId?: number;
  /** what the registry returns for RECIPIENT_WALLET ("0x" = not registered) */
  registered?: Hex;
  allowance?: bigint;
  decimals?: number;
  /** the ERC-20 the node answers for (default USDC) */
  token?: Address;
  reject?: boolean;
  revert?: boolean;
  /** wallet has no hoisted account: answer eth_accounts */
  accounts?: Address[];
}

function fakeNode(o: NodeOpts = {}) {
  let chainId = o.chainId ?? chain.id;
  const sent: SentTx[] = [];
  const calls: { method: string; params: unknown[] }[] = [];
  const reads: { to: Address; functionName: string; args: readonly unknown[] }[] = [];

  const request = async ({ method, params = [] }: { method: string; params?: unknown[] }): Promise<unknown> => {
    calls.push({ method, params });
    switch (method) {
      case "eth_chainId":
        return numberToHex(chainId);
      case "eth_blockNumber":
        return "0x10";
      case "eth_accounts":
      case "eth_requestAccounts":
        return o.accounts ?? [PAYER];
      case "wallet_switchEthereumChain":
        chainId = Number((params[0] as { chainId: Hex }).chainId);
        return null;
      case "eth_call": {
        const { to, data } = params[0] as { to: Address; data: Hex };
        if (getAddress(to) === REGISTRY) {
          const d = decodeFunctionData({ abi: erc6538RegistryAbi, data });
          reads.push({ to, functionName: d.functionName, args: d.args ?? [] });
          const [registrant, scheme] = d.args as [Address, bigint];
          const raw = getAddress(registrant) === RECIPIENT_WALLET && scheme === 1n ? (o.registered ?? "0x") : "0x";
          return encodeFunctionResult({ abi: erc6538RegistryAbi, functionName: "stealthMetaAddressOf", result: raw });
        }
        if (getAddress(to) === (o.token ?? TOKEN)) {
          const d = decodeFunctionData({ abi: erc20Abi, data });
          reads.push({ to, functionName: d.functionName, args: d.args ?? [] });
          if (d.functionName === "allowance") return encodeFunctionResult({ abi: erc20Abi, functionName: "allowance", result: o.allowance ?? 0n });
          if (d.functionName === "decimals") return encodeFunctionResult({ abi: erc20Abi, functionName: "decimals", result: o.decimals ?? 6 });
        }
        throw new Error(`unexpected eth_call to ${to}`);
      }
      case "eth_sendTransaction": {
        if (o.reject) throw { code: 4001, message: "User rejected the request." };
        const tx = params[0] as { from: Address; to: Address; data: Hex; value?: Hex };
        const hash = pad(numberToHex(sent.length + 1), { size: 32 });
        sent.push({ from: getAddress(tx.from), to: getAddress(tx.to), data: tx.data, value: BigInt(tx.value ?? "0x0"), hash });
        return hash;
      }
      case "eth_getTransactionReceipt": {
        const hash = params[0] as Hex;
        const tx = sent.find((t) => t.hash === hash);
        if (!tx) return null;
        const last = tx === sent[sent.length - 1];
        return {
          transactionHash: hash,
          transactionIndex: "0x0",
          blockHash: pad("0xb10c", { size: 32 }),
          blockNumber: "0x10",
          from: tx.from,
          to: tx.to,
          cumulativeGasUsed: "0x5208",
          gasUsed: "0x5208",
          effectiveGasPrice: "0x1",
          contractAddress: null,
          logs: [],
          logsBloom: pad("0x0", { size: 256 }),
          status: o.revert && last ? "0x0" : "0x1",
          type: "0x2",
        };
      }
      default:
        throw new Error(`unexpected RPC ${method}`);
    }
  };

  const transport = custom({ request });
  const publicClient = createPublicClient({ chain, transport, pollingInterval: 5 });
  const walletClient = o.accounts ? createWalletClient({ chain, transport }) : createWalletClient({ chain, account: PAYER, transport });
  return { sent, calls, reads, publicClient, walletClient };
}

/** The recipient's view: is the paid address one they can find and spend? */
function recipientOwns(stealthAddress: Hex, ephemeralPubKey: Hex, viewTag: Hex) {
  return checkStealthAddress({ stealthAddress, ephemeralPubKey, metadata: viewTag }, keys.viewingKey, keys.spendingPublicKey);
}

const statuses = (events: KakushiStatusEvent[]) => events.map((e) => (e.step ? `${e.status}:${e.step}` : e.status));

describe("createKakushiPayment: USDC on Arc", () => {
  it("approves, then pays a st:eth meta-address through StealthPay.sendToken in USDC", async () => {
    const n = fakeNode({ allowance: 0n });
    const events: KakushiStatusEvent[] = [];
    const r = await createKakushiPayment({ to: keys.metaAddress, amount: "12.5", chain, walletClient: n.walletClient, publicClient: n.publicClient, deployment, onStatus: (e) => events.push(e) });

    expect(n.reads.some((x) => x.functionName === "decimals")).toBe(false); // USDC is 6 decimals, no lookup
    expect(n.reads).toContainEqual({ to: TOKEN, functionName: "allowance", args: [PAYER, STEALTH_PAY] });
    expect(n.sent).toHaveLength(2);
    const [approve, pay] = n.sent as [SentTx, SentTx];
    expect(approve).toMatchObject({ to: TOKEN, value: 0n });
    expect(decodeFunctionData({ abi: erc20Abi, data: approve.data }).args).toEqual([STEALTH_PAY, 12_500_000n]);

    expect(pay).toMatchObject({ from: PAYER, to: STEALTH_PAY, value: 0n }); // never any native value
    const d = decodeFunctionData({ abi: stealthPayAbi, data: pay.data });
    expect(d.functionName).toBe("sendToken");
    const [scheme, stealth, token, amount, eph, viewTag] = d.args as [bigint, Address, Address, bigint, Hex, Hex];
    expect([scheme, getAddress(token), amount]).toEqual([1n, TOKEN, 12_500_000n]);
    expect(eph).toMatch(/^0x0[23][0-9a-f]{64}$/);
    expect(viewTag).toMatch(/^0x[0-9a-f]{2}$/);
    expect(recipientOwns(stealth, eph, viewTag)).toBe(true);

    expect(r).toMatchObject({ txHash: pay.hash, approveTxHash: approve.hash, stealthAddress: getAddress(stealth), ephemeralPublicKey: eph, metaAddress: keys.metaAddress, amount: 12_500_000n, token: TOKEN, chainId: chain.id });
    expect(statuses(events)).toEqual(["resolving", "confirming:approve", "sending:approve", "confirming:pay", "sending:pay", "paid:pay"]);
  });

  it("skips the approval when the allowance already covers the amount", async () => {
    const n = fakeNode({ allowance: 10n ** 30n });
    const r = await createKakushiPayment({ to: keys.metaAddress, amount: 42n, chain, walletClient: n.walletClient, publicClient: n.publicClient, deployment });
    expect(n.sent).toHaveLength(1);
    expect(decodeFunctionData({ abi: stealthPayAbi, data: n.sent[0]!.data }).functionName).toBe("sendToken");
    expect(r.approveTxHash).toBeUndefined();
  });

  it("uses a fresh stealth address every time", async () => {
    const n = fakeNode({ allowance: 10n ** 30n });
    const a = await createKakushiPayment({ to: keys.metaAddress, amount: 1n, chain, walletClient: n.walletClient, publicClient: n.publicClient, deployment });
    const b = await createKakushiPayment({ to: keys.metaAddress, amount: 1n, chain, walletClient: n.walletClient, publicClient: n.publicClient, deployment });
    expect(a.stealthAddress).not.toBe(b.stealthAddress);
    expect(a.ephemeralPublicKey).not.toBe(b.ephemeralPublicKey);
  });

  it("defaults to Arc's USDC when the deployment names none", async () => {
    const n = fakeNode({ allowance: 10n ** 30n });
    const r = await createKakushiPayment({ to: keys.metaAddress, amount: "1", chain, walletClient: n.walletClient, publicClient: n.publicClient, deployment: { stealthPay: STEALTH_PAY } });
    expect(r.token).toBe(TOKEN);
    expect(r.amount).toBe(1_000_000n);
  });
});

describe("createKakushiPayment: recipient resolution", () => {
  it("resolves a plain address on the ERC-6538 registry", async () => {
    const n = fakeNode({ registered: metaAddressBytes(keys.metaAddress) });
    const r = await createKakushiPayment({ to: RECIPIENT_WALLET.toLowerCase(), amount: 5n, chain, walletClient: n.walletClient, publicClient: n.publicClient, deployment });
    expect(n.reads.filter((x) => x.to === REGISTRY)).toEqual([{ to: REGISTRY, functionName: "stealthMetaAddressOf", args: [RECIPIENT_WALLET, 1n] }]);
    expect(r.metaAddress).toBe(keys.metaAddress);
    const [, stealth, , , eph, viewTag] = decodeFunctionData({ abi: stealthPayAbi, data: n.sent[n.sent.length - 1]!.data }).args as unknown as [bigint, Address, Address, bigint, Hex, Hex];
    expect(recipientOwns(stealth, eph, viewTag)).toBe(true);
  });

  it("fails clearly, before any transaction, when the recipient hasn't enabled private receiving", async () => {
    const n = fakeNode();
    const events: KakushiStatusEvent[] = [];
    const p = createKakushiPayment({ to: RECIPIENT_WALLET, amount: 5n, chain, walletClient: n.walletClient, publicClient: n.publicClient, deployment, onStatus: (e) => events.push(e) });
    await expect(p).rejects.toBeInstanceOf(KakushiPayError);
    await expect(p).rejects.toMatchObject({ code: "RECIPIENT_NOT_REGISTERED", message: expect.stringMatching(/hasn't enabled private receiving/) });
    expect(n.sent).toEqual([]);
    expect(statuses(events)).toEqual(["resolving", "error"]);
  });

  it("rejects garbage and a plain address without a registry", async () => {
    const n = fakeNode();
    await expect(resolveRecipient("bob.eth", n.publicClient, deployment)).rejects.toMatchObject({ code: "INVALID_RECIPIENT" });
    await expect(resolveRecipient("st:eth:0x1234", n.publicClient, deployment)).rejects.toMatchObject({ code: "INVALID_RECIPIENT" });
    await expect(resolveRecipient(RECIPIENT_WALLET, n.publicClient, {})).rejects.toMatchObject({ code: "NO_REGISTRY" });
    // bare 66 key bytes (as stored on ERC-6538) are accepted as a meta-address
    await expect(resolveRecipient(metaAddressBytes(keys.metaAddress), n.publicClient, {})).resolves.toBe(keys.metaAddress);
  });
});

describe("createKakushiPayment: other tokens", () => {
  it("scales a decimal string by the token's decimals() when it is not USDC", async () => {
    const OTHER = getAddress("0x5555555555555555555555555555555555555555");
    const n = fakeNode({ token: OTHER, allowance: 10n ** 30n, decimals: 8 });
    const r = await createKakushiPayment({ to: keys.metaAddress, amount: "1.5", token: OTHER, chain, walletClient: n.walletClient, publicClient: n.publicClient, deployment });
    expect(r.amount).toBe(150_000_000n);
  });
});

describe("createKakushiPayment: wallet and failures", () => {
  it("maps a wallet rejection to USER_REJECTED", async () => {
    const n = fakeNode({ reject: true, allowance: 10n ** 30n });
    await expect(createKakushiPayment({ to: keys.metaAddress, amount: 1n, chain, walletClient: n.walletClient, publicClient: n.publicClient, deployment })).rejects.toMatchObject({ code: "USER_REJECTED" });
  });

  it("reports a reverted payment as TX_REVERTED", async () => {
    const n = fakeNode({ revert: true, allowance: 10n ** 30n });
    await expect(createKakushiPayment({ to: keys.metaAddress, amount: 1n, chain, walletClient: n.walletClient, publicClient: n.publicClient, deployment })).rejects.toMatchObject({ code: "TX_REVERTED" });
  });

  it("refuses zero amounts and bad tokens without sending", async () => {
    const n = fakeNode({ allowance: 10n ** 30n });
    const base = { to: keys.metaAddress, chain, walletClient: n.walletClient, publicClient: n.publicClient, deployment };
    await expect(createKakushiPayment({ ...base, amount: 0n })).rejects.toMatchObject({ code: "INVALID_AMOUNT" });
    await expect(createKakushiPayment({ ...base, amount: "abc" })).rejects.toMatchObject({ code: "INVALID_AMOUNT" });
    await expect(createKakushiPayment({ ...base, amount: 1n, token: "native" as Address })).rejects.toMatchObject({ code: "INVALID_TOKEN" });
    expect(n.sent).toEqual([]);
  });

  it("asks the wallet to switch to the payment chain", async () => {
    const n = fakeNode({ chainId: 1, allowance: 10n ** 30n });
    await createKakushiPayment({ to: keys.metaAddress, amount: 1n, chain, walletClient: n.walletClient, publicClient: n.publicClient, deployment });
    const sw = n.calls.find((c) => c.method === "wallet_switchEthereumChain");
    expect(sw?.params).toEqual([{ chainId: numberToHex(chain.id) }]);
    expect(n.sent).toHaveLength(1);
  });

  it("takes a lazy wallet client without a hoisted account", async () => {
    const n = fakeNode({ accounts: [PAYER], allowance: 10n ** 30n });
    const r = await createKakushiPayment({ to: keys.metaAddress, amount: 3n, chain, walletClient: async () => n.walletClient, publicClient: n.publicClient, deployment });
    expect(n.sent[0]!.from).toBe(PAYER);
    expect(r.txHash).toBe(n.sent[0]!.hash);
  });
});
