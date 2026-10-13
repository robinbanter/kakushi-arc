// Building blocks of the four user flows, with no wallet or network inside: the app, the widget, the e2e script
// and integrators compose them with whatever signer they have.
import { type Hex, encodeFunctionData, getAddress, toHex } from "viem";
import { STEALTH_SCHEME_ID, generateStealthAddress, type GeneratedStealthAddress } from "./stealth.ts";
import { erc20Abi, stealthPayAbi } from "./pool-abi.ts";

export interface StealthSendPlan {
  stealth: GeneratedStealthAddress;
  /** StealthPay.sendToken(1, stealth, USDC, amount, ephemeralPubKey, viewTag) */
  pay: { to: Hex; data: Hex };
  /** the allowance StealthPay needs first (skip if the payer already approved at least `amount`) */
  approve: { to: Hex; data: Hex; spender: Hex; amount: bigint };
}

/**
 * Plan a private USDC payment to the owner of `metaAddress`: a fresh one-time stealth address, the approval and the
 * single StealthPay transaction that moves the USDC there and announces it (ERC-5564).
 */
export function planStealthSend(p: { metaAddress: string; amount: bigint; usdc: Hex; stealthPay: Hex; ephemeralPrivateKey?: Hex }): StealthSendPlan {
  if (p.amount <= 0n) throw new Error("amount must be greater than zero");
  const stealth = generateStealthAddress(p.metaAddress, p.ephemeralPrivateKey ? { ephemeralPrivateKey: p.ephemeralPrivateKey } : {});
  const spender = getAddress(p.stealthPay);
  return {
    stealth,
    pay: {
      to: spender,
      data: encodeFunctionData({
        abi: stealthPayAbi,
        functionName: "sendToken",
        args: [STEALTH_SCHEME_ID, stealth.stealthAddress, getAddress(p.usdc), p.amount, stealth.ephemeralPublicKey, toHex(stealth.viewTag, { size: 1 })],
      }),
    },
    approve: { to: getAddress(p.usdc), data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [spender, p.amount] }), spender, amount: p.amount },
  };
}
