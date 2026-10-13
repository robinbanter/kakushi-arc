// The relayer: validate, simulate with eth_call, check the fee covers the gas, then submit KakushiPool.withdraw from
// its own key. Arc specifics: gas is USDC. A gas price is quoted per unit of 18-decimal native balance, the fee is in
// 6-decimal USDC token units, and 1 token unit = 1e12 wei, so cost(units) = ceil(gas * gasPrice / 1e12).
import { type Hex, type PublicClient, type Transport, type WalletClient, createPublicClient, createWalletClient, http } from "viem";
import type { LocalAccount } from "viem/accounts";
import { chainByNetwork, nativeWeiToUsdcUnits, rpcUrl, type ArcNetwork } from "@kakushi/config";
import { errText, kakushiPoolAbi, viemChain } from "@kakushi/sdk";
import type { PoolConfig } from "./config.ts";
import { RelayError, type RelayRequest, validateRelayRequest } from "./validate.ts";

export interface RelayerOptions {
  account: LocalAccount;
  pools: PoolConfig[];
  network: ArcNetwork;
  rpc?: string;
  /** floor for every fee, USDC base units */
  minFee?: bigint;
  /** a pool whose quoted fee is above this share of its denomination is not offered */
  maxFeeBps?: bigint;
  /** gas assumed when quoting */
  quoteGas?: bigint;
  transport?: Transport;
  log?: (msg: string) => void;
}

export interface RelayerInfo {
  address: Hex;
  chainId: number;
  /** pool address -> fee to ask, USDC base units (decimal string). Pools that cost too much to relay are absent. */
  feeByPool: Record<string, string>;
  /** gas price in wei per gas, and what the quote assumed */
  gasPrice: string;
  quoteGas: string;
}

/** Safety margin on the live gas price between quote and submission. */
const GAS_MARGIN_NUM = 125n;
const GAS_MARGIN_DEN = 100n;

export class Relayer {
  readonly account: LocalAccount;
  readonly pools: readonly PoolConfig[];
  readonly chainId: number;
  readonly minFee: bigint;
  private readonly maxFeeBps: bigint;
  private readonly quoteGas: bigint;
  private readonly pub: PublicClient;
  private readonly wallet: WalletClient;
  /** one submission at a time, so nonces never collide */
  private queue: Promise<unknown> = Promise.resolve();
  /** nullifierHashes with a submission in progress */
  private inFlight = new Set<string>();
  private log: (m: string) => void;

  constructor(opts: RelayerOptions) {
    this.account = opts.account;
    this.pools = opts.pools;
    this.minFee = opts.minFee ?? 10_000n;
    this.maxFeeBps = opts.maxFeeBps ?? 3000n;
    this.quoteGas = opts.quoteGas ?? 4_300_000n;
    this.log = opts.log ?? ((m) => console.log(`[relayer] ${m}`));
    const c = chainByNetwork(opts.network);
    this.chainId = c.chainId;
    const url = opts.rpc ?? rpcUrl(c);
    const chain = viemChain(c, url);
    const transport = opts.transport ?? http(url, { retryCount: 2, retryDelay: 250 });
    this.pub = createPublicClient({ chain, transport }) as PublicClient;
    this.wallet = createWalletClient({ account: this.account, chain, transport });
  }

  get address(): Hex {
    return this.account.address;
  }

  /** The fee the relayer asks right now for withdrawing from a pool: quote gas at the live gas price plus a margin. */
  async quote(): Promise<RelayerInfo> {
    const gasPrice = await this.pub.getGasPrice();
    const cost = nativeWeiToUsdcUnits((this.quoteGas * gasPrice * GAS_MARGIN_NUM) / GAS_MARGIN_DEN);
    const fee = cost > this.minFee ? cost : this.minFee;
    const feeByPool: Record<string, string> = {};
    for (const p of this.pools) {
      if (fee * 10_000n <= p.denomination * this.maxFeeBps) feeByPool[p.pool] = fee.toString();
    }
    return { address: this.address, chainId: this.chainId, feeByPool, gasPrice: gasPrice.toString(), quoteGas: this.quoteGas.toString() };
  }

  /** USDC the relayer can still spend on gas (base units): it must not run dry. */
  async balance(): Promise<bigint> {
    return nativeWeiToUsdcUnits(await this.pub.getBalance({ address: this.address }));
  }

  validate(body: unknown): RelayRequest {
    return validateRelayRequest(body, { relayer: this.address, chainId: this.chainId, pools: this.pools, minFee: this.minFee });
  }

  /** Validate, simulate, submit. Resolves with the transaction hash once the node accepted it. */
  async relay(body: unknown): Promise<{ txHash: Hex }> {
    const req = this.validate(body);
    const key = req.args.nullifierHash;
    if (this.inFlight.has(key)) throw new RelayError(409, "a withdrawal for this nullifierHash is already being relayed");
    this.inFlight.add(key);
    try {
      const next = this.queue.then(() => this.submit(req), () => this.submit(req));
      this.queue = next.catch(() => undefined);
      return await next;
    } finally {
      this.inFlight.delete(key);
    }
  }

  private async submit(req: RelayRequest): Promise<{ txHash: Hex }> {
    const a = req.args;
    const args = [req.proof, a.root, a.nullifierHash, a.recipient, a.relayer, a.fee] as const;
    let gas: bigint;
    let gasPrice: bigint;
    try {
      await this.pub.simulateContract({ account: this.account, address: req.pool.pool, abi: kakushiPoolAbi, functionName: "withdraw", args } as never);
      [gas, gasPrice] = await Promise.all([
        this.pub.estimateContractGas({ account: this.account, address: req.pool.pool, abi: kakushiPoolAbi, functionName: "withdraw", args } as never).then((g) => (g * 115n) / 100n),
        this.pub.getGasPrice(),
      ]);
    } catch (e) {
      throw new RelayError(422, `withdraw would revert: ${oneLine(e)}`);
    }
    // The relayer must not pay more gas than it is paid, or anyone could drain it with withdrawals.
    const cost = nativeWeiToUsdcUnits(gas * gasPrice);
    if (a.fee < cost) throw new RelayError(402, `fee ${a.fee} is below the gas cost of about ${cost} (USDC base units); raise the fee or withdraw from your own wallet`);
    let txHash: Hex;
    try {
      txHash = await this.wallet.writeContract({ account: this.account, chain: this.wallet.chain, address: req.pool.pool, abi: kakushiPoolAbi, functionName: "withdraw", args, gas } as never);
    } catch (e) {
      throw new RelayError(502, `submission failed: ${oneLine(e)}`);
    }
    this.log(`pool ${req.pool.pool} withdraw nullifierHash ${a.nullifierHash} fee ${a.fee} gas~${gas} -> ${txHash}`);
    return { txHash };
  }
}

/** Arc's node reports pool reverts as raw selectors; name the ones a user can act on. */
const KNOWN_ERRORS: Record<string, string> = {
  "0x2d8b76eb": "this note was already spent (NullifierSpent)",
  "0x8730d7c8": "the proof's Merkle root is not one of the pool's recent roots (UnknownRoot)",
  "0x09bde339": "the proof does not verify for these recipient/relayer/fee values (InvalidProof)",
  "0x90b8ec18": "the USDC transfer failed, e.g. a blocklisted recipient (TransferFailed)",
  "0xe757126a": "the fee is larger than the note (FeeTooHigh)",
};
const oneLine = (e: unknown): string => {
  const text = errText(e).replace(/\s+/g, " ").trim();
  const hit = Object.entries(KNOWN_ERRORS).find(([sel]) => text.includes(sel));
  return hit ? `${hit[1]} [${text.slice(0, 120)}]` : text;
};
