"use client";

import { PrimaryButton, cn } from "@kakushi/ui";
import { Check, EyeOff, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { isAddress, type Hex } from "viem";
import { formatUsdc, parseUsdc } from "@kakushi/config";
import { erc20Abi, planStealthSend, readStealthMetaAddress } from "@kakushi/sdk";
import { ConnectButton } from "@/components/AppShell";
import { UsdcCoin } from "@/components/coins";
import { ChainTx, readError, short } from "@/components/kit";
import { Done, GlassCard, NotLive, ScreenTitle, Well, inputCls } from "@/components/privacy-ui";
import { useDeployment } from "@/lib/privacy";
import { requireSuccessfulReceipt } from "@/lib/receipt";
import { useRuntime } from "@/lib/runtime";
import { useWallet } from "@/lib/wallet";

type Resolved = { meta: string; via: "meta" | "registry" } | { error: string } | null;

export default function SendPage() {
  const { client, cfg } = useRuntime();
  const w = useWallet();
  const { deployment, ready } = useDeployment();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("5");
  const [resolved, setResolved] = useState<Resolved>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [done, setDone] = useState<{ hash: Hex; stealth: Hex; amount: string } | null>(null);

  // A meta-address works as is; a wallet address is looked up in the ERC-6538 registry.
  useEffect(() => {
    const v = to.trim();
    setResolved(null);
    if (!v) return;
    if (v.startsWith("st:")) return setResolved({ meta: v, via: "meta" });
    if (!isAddress(v)) return setResolved({ error: "Paste a meta-address (st:eth:0x…) or a wallet address" });
    if (!client || !deployment) return;
    let live = true;
    readStealthMetaAddress(client, deployment.stealthRegistry, v as Hex)
      .then((m) => live && setResolved(m ? { meta: m, via: "registry" } : { error: "This wallet hasn't turned on private receiving. Ask them to open Kakushi → Receive once, or paste their st:eth: meta-address." }))
      .catch((e) => live && setResolved({ error: readError((e as Error).message) ?? "Lookup failed" }));
    return () => {
      live = false;
    };
  }, [to, client, deployment]);

  useEffect(() => {
    if (!client || !cfg || !w.address) return setBalance(null);
    let live = true;
    client.readContract({ address: cfg.usdc, abi: erc20Abi, functionName: "balanceOf", args: [w.address] }).then((b) => live && setBalance(b as bigint)).catch(() => live && setBalance(null));
    return () => {
      live = false;
    };
  }, [client, cfg, w.address, done]);

  if (ready && !deployment) return <div className="mx-auto max-w-[500px] pt-[6vh]"><ScreenTitle title="Send privately" pill={<><EyeOff size={13} /> Stealth</>} /><NotLive /></div>;
  if (!deployment || !cfg || !client) return null;

  const meta = resolved && "meta" in resolved ? resolved.meta : null;
  let value: bigint | null = null;
  try {
    value = parseUsdc(amount || "0");
    if (value <= 0n) value = null;
  } catch {}
  const short1 = value !== null && balance !== null && value > balance;

  async function send() {
    if (!meta || !value || !deployment || !cfg || !client || busy) return;
    setErr(null);
    setDone(null);
    try {
      setBusy("Making a one-time address…");
      const plan = planStealthSend({ metaAddress: meta, amount: value, usdc: cfg.usdc, stealthPay: deployment.stealthPay });
      const wc = await w.walletClient();
      const allowance = (await client.readContract({ address: cfg.usdc, abi: erc20Abi, functionName: "allowance", args: [w.address as Hex, deployment.stealthPay] })) as bigint;
      if (allowance < value) {
        setBusy("Approve USDC in your wallet…");
        const ah = await wc.sendTransaction({ chain: wc.chain, account: wc.account!, to: plan.approve.to, data: plan.approve.data });
        requireSuccessfulReceipt(await client.waitForTransactionReceipt({ hash: ah }), "Approval");
      }
      setBusy("Confirm in your wallet…");
      const hash = await wc.sendTransaction({ chain: wc.chain, account: wc.account!, to: plan.pay.to, data: plan.pay.data });
      setBusy("Sending…");
      requireSuccessfulReceipt(await client.waitForTransactionReceipt({ hash }), "Private send");
      setDone({ hash, stealth: plan.stealth.stealthAddress, amount: formatUsdc(value) });
    } catch (e) {
      setErr(readError((e as { shortMessage?: string }).shortMessage ?? (e as Error).message) ?? "Send failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[500px] pt-6 pb-20 sm:pt-[5vh]">
      <ScreenTitle title="Send privately" pill={<><EyeOff size={13} /> Stealth</>} />
      <GlassCard>
        <Well>
          <div className="flex items-center justify-between text-[13px] text-ui-muted">
            <span>To</span>
            {meta ? <span className="inline-flex items-center gap-1 text-[#c4d0ff]"><Check size={13} /> {resolved && "via" in resolved && resolved.via === "registry" ? "Private address found" : "Meta-address"}</span> : null}
          </div>
          <input aria-label="Recipient meta-address or wallet" value={to} onChange={(e) => setTo(e.target.value.trim())} placeholder="st:eth:0x… or 0x wallet" className={cn(inputCls, "mt-2 font-mono text-[14px]")} />
          {resolved && "error" in resolved ? <p className="mt-2 text-[13px] text-ui-warn">{resolved.error}</p> : null}
        </Well>
        <Well className="mt-2">
          <div className="flex items-center justify-between text-[13px] text-ui-muted">
            <span>Amount</span>
            {balance !== null ? <button type="button" className="hover:text-ui-text" onClick={() => setAmount(formatUsdc(balance))}>Balance {formatUsdc(balance, 2)} USDC</button> : null}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input aria-label="Amount of USDC" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} className="ui-figure min-w-0 flex-1 bg-transparent text-[40px] font-medium tracking-[-0.03em] outline-none" />
            <span className="inline-flex items-center gap-2 text-[17px] font-semibold"><UsdcCoin size={28} /> USDC</span>
          </div>
          {short1 ? <p className="mt-2 text-[13px] text-ui-warn">More than your balance.</p> : null}
        </Well>
        <div className="mt-3">
          {w.address ? (
            <PrimaryButton size="lg" block icon={<Send />} className="h-[58px] text-[17px]" disabled={!meta || !value || short1 || !!busy} loading={!!busy} onClick={send}>
              {busy ?? "Send privately"}
            </PrimaryButton>
          ) : (
            <ConnectButton block large />
          )}
        </div>
        <p className="px-3 pt-3 text-[12px] text-ui-muted">Gas is USDC too: you need no other token. The recipient gets USDC at a one-time address that only their viewing key can find.</p>
        {err ? <p role="alert" className="px-3 pt-3 text-[13px] text-ui-down">{err}</p> : null}
      </GlassCard>
      {done ? (
        <Done
          headline={<>Sent {done.amount} USDC</>}
          sub="Only the recipient can find it"
          details={
            <>
              <span>One-time address {short(done.stealth, 6)}</span>
              <span>Tx <ChainTx explorer={cfg.explorer} hash={done.hash} /></span>
            </>
          }
        />
      ) : null}
    </div>
  );
}
