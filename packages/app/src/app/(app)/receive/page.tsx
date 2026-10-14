"use client";

import { CopyButton, PrimaryButton, SecondaryButton, StatusPill, cn } from "@kakushi/ui";
import { ArrowUpRight, Inbox, KeyRound, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { createWalletClient, encodeFunctionData, http, isAddress, type Hex, type PublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { formatUsdc, nativeWeiToUsdcUnits } from "@kakushi/config";
import { arcChain, buildRegisterKeysCalldata, erc20Abi, readStealthMetaAddress, scanAnnouncements, type StealthMatch } from "@kakushi/sdk";
import { ConnectButton } from "@/components/AppShell";
import { UsdcCoin } from "@/components/coins";
import { ChainTx, readError, short } from "@/components/kit";
import { Done, GlassCard, NotLive, ScreenTitle, Well, inputCls } from "@/components/privacy-ui";
import { useDeployment } from "@/lib/privacy";
import { requireSuccessfulReceipt } from "@/lib/receipt";
import { useRuntime } from "@/lib/runtime";
import { useStealthKeys } from "@/lib/stealth-keys";
import { useWallet } from "@/lib/wallet";

/**
 * One payment found in the inbox. The stealth address holds only USDC and pays its own gas in USDC, so "Move" sends
 * everything except the gas it will cost: no other token, no top-up from the sender.
 */
function Payment({ m, onDone }: { m: StealthMatch; onDone: (hash: Hex) => void }) {
  const { client, cfg, rpc } = useRuntime();
  const w = useWallet();
  const [open, setOpen] = useState(false);
  const [dest, setDest] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const bal = m.balance ?? 0n;

  async function move() {
    if (!m.stealthPrivateKey || !isAddress(dest) || busy || !client || !cfg) return;
    setBusy(true);
    setErr(null);
    try {
      const account = privateKeyToAccount(m.stealthPrivateKey);
      const wc = createWalletClient({ account, chain: arcChain(cfg.network, rpc), transport: http(rpc) });
      const data = encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [dest as Hex, 1n] });
      const [gas, fees] = await Promise.all([client.estimateGas({ account, to: cfg.usdc, data }), client.estimateFeesPerGas()]);
      // gas is USDC: keep back the worst-case fee (in 6-decimal units) and send the rest
      const reserve = nativeWeiToUsdcUnits((gas * 12n / 10n) * fees.maxFeePerGas!);
      if (bal <= reserve) throw new Error(`The balance (${formatUsdc(bal)} USDC) doesn't cover the ${formatUsdc(reserve)} USDC of gas to move it`);
      const hash = await wc.sendTransaction({ to: cfg.usdc, data: encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [dest as Hex, bal - reserve] }), gas: (gas * 12n) / 10n });
      requireSuccessfulReceipt(await client.waitForTransactionReceipt({ hash }), "Move");
      onDone(hash);
    } catch (e) {
      setErr(readError((e as { shortMessage?: string }).shortMessage ?? (e as Error).message) ?? "Move failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-[20px] bg-[#04060f]/80 p-4 ring-1 ring-white/[0.04]">
      <div className="flex items-center gap-3">
        <UsdcCoin size={34} />
        <div className="min-w-0 flex-1">
          <div className="ui-figure text-[20px] font-medium">{formatUsdc(bal)} USDC</div>
          <div className="text-[12px] text-ui-muted">one-time address {short(m.stealthAddress)} · block {m.blockNumber.toString()}</div>
        </div>
        {bal > 0n ? <SecondaryButton size="sm" onClick={() => { setOpen((o) => !o); if (!dest && w.address) setDest(w.address); }}>Move</SecondaryButton> : <StatusPill tone="neutral" size="sm">Empty</StatusPill>}
      </div>
      {open ? (
        <div className="mt-3 flex gap-2">
          <input aria-label="Destination address" value={dest} onChange={(e) => setDest(e.target.value.trim())} placeholder="0x… destination" className={cn(inputCls, "rounded-full bg-ui-surface-2 px-4 py-2.5 font-mono text-[13px]")} />
          <PrimaryButton size="sm" loading={busy} disabled={!isAddress(dest)} onClick={move} iconRight={<ArrowUpRight />}>Send</PrimaryButton>
        </div>
      ) : null}
      {err ? <p className="mt-2 text-[13px] text-ui-down">{err}</p> : null}
    </li>
  );
}

function Register({ meta }: { meta: string }) {
  const { client, cfg } = useRuntime();
  const { deployment } = useDeployment();
  const w = useWallet();
  const [state, setState] = useState<"unknown" | "on" | "off" | "busy">("unknown");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!client || !w.address || !deployment) return;
    let live = true;
    readStealthMetaAddress(client as PublicClient, deployment.stealthRegistry, w.address as Hex)
      .then((m) => live && setState(m && m.toLowerCase() === meta.toLowerCase() ? "on" : "off"))
      .catch(() => live && setState("off"));
    return () => {
      live = false;
    };
  }, [client, w.address, deployment, meta]);
  async function register() {
    if (!client || !deployment) return;
    setState("busy");
    setError(null);
    try {
      const wc = await w.walletClient();
      const hash = await wc.sendTransaction({ chain: wc.chain, account: wc.account!, to: deployment.stealthRegistry, data: buildRegisterKeysCalldata(meta) });
      requireSuccessfulReceipt(await client.waitForTransactionReceipt({ hash }), "Register");
      setState("on");
    } catch (e) {
      setError(readError((e as Error).message));
      setState("off");
    }
  }
  return state === "on" ? (
    <StatusPill tone="lime" size="sm">Listed on {cfg?.chainName ?? "Arc"}: anyone can pay your address</StatusPill>
  ) : (
    <div><SecondaryButton size="sm" loading={state === "busy"} disabled={state === "unknown"} onClick={register}>
      List my address on {cfg?.chainName ?? "Arc"} (one transaction)
    </SecondaryButton>{error ? <p role="alert" className="mt-2 text-sm text-ui-warn">{error}</p> : null}</div>
  );
}

export default function ReceivePage() {
  const { client } = useRuntime();
  const w = useWallet();
  const { keys, unlock } = useStealthKeys();
  const { deployment, ready } = useDeployment();
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [scan, setScan] = useState<{ busy: boolean; found: StealthMatch[] | null; err: string | null }>({ busy: false, found: null, err: null });
  const [moved, setMoved] = useState<Hex | null>(null);
  const { cfg } = useRuntime();

  async function runScan() {
    if (!keys || !client || !deployment) return;
    setScan({ busy: true, found: null, err: null });
    try {
      const latest = await client.getBlockNumber();
      const matches = await scanAnnouncements(client as PublicClient, deployment.stealthAnnouncer, BigInt(deployment.deployBlock), latest, { viewingKey: keys.viewingKey, spendingPublicKey: keys.spendingPublicKey, spendingKey: keys.spendingKey }, { withBalances: true, concurrency: 1 });
      setScan({ busy: false, found: matches.sort((a, b) => Number(b.blockNumber - a.blockNumber)), err: null });
    } catch (e) {
      setScan({ busy: false, found: null, err: readError((e as Error).message) });
    }
  }

  useEffect(() => {
    if (keys && deployment && client && scan.found === null && !scan.busy) void runScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys, deployment, client]);

  if (ready && !deployment) return <div className="mx-auto max-w-[520px] pt-[6vh]"><ScreenTitle title="Receive privately" pill={<><Inbox size={13} /> Inbox</>} /><NotLive /></div>;

  return (
    <div className="mx-auto w-full max-w-[520px] pt-6 pb-20 sm:pt-[5vh]">
      <ScreenTitle title="Receive privately" pill={<><Inbox size={13} /> Inbox</>} />
      <GlassCard>
        <Well>
          <div className="text-[13px] text-ui-muted">Your private address</div>
          {keys ? (
            <>
              <div className="mt-2 flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-mono text-[15px]">{keys.metaAddress.slice(0, 22)}…{keys.metaAddress.slice(-6)}</span>
                <CopyButton value={keys.metaAddress} label="private address" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2"><Register meta={keys.metaAddress} /></div>
            </>
          ) : w.address ? (
            <PrimaryButton size="lg" block className="mt-3" icon={<KeyRound />} loading={unlocking} onClick={() => { setUnlocking(true); setUnlockError(null); unlock().catch((e) => setUnlockError(readError((e as Error).message))).finally(() => setUnlocking(false)); }}>
              Unlock with your wallet
            </PrimaryButton>
          ) : (
            <div className="mt-3"><ConnectButton block large /></div>
          )}
        </Well>
        {unlockError ? <p role="alert" className="p-3 text-sm text-ui-warn">{unlockError}</p> : null}
        {keys ? (
          <div className="mt-2 px-1">
            <div className="flex items-center justify-between px-2 py-2">
              <span className="text-[15px] font-medium">Inbox{scan.found ? ` · ${scan.found.length}` : ""}</span>
              <button type="button" onClick={runScan} disabled={scan.busy} className="inline-flex items-center gap-1.5 text-[13px] text-ui-muted hover:text-ui-text disabled:opacity-50">
                <RefreshCw size={14} className={scan.busy ? "animate-spin" : undefined} /> {scan.busy ? "Scanning…" : "Scan"}
              </button>
            </div>
            {scan.err ? <p className="px-2 pb-2 text-[13px] text-ui-warn">{scan.err}</p> : null}
            {scan.found?.length === 0 ? <p className="px-2 pb-3 text-[14px] text-ui-muted">No payments yet. Share your private address to get paid.</p> : null}
            <ul className="grid gap-2 pb-1">
              {scan.found?.map((m) => (
                <Payment key={`${m.txHash}-${m.logIndex}`} m={m} onDone={(h) => { setMoved(h); void runScan(); }} />
              ))}
            </ul>
          </div>
        ) : null}
      </GlassCard>
      {moved && cfg ? <Done headline="Moved to your wallet" sub="The gas was paid in USDC from the same balance" details={<span>Tx <ChainTx explorer={cfg.explorer} hash={moved} /></span>} /> : null}
    </div>
  );
}
