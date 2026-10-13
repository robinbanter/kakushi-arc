"use client";

import { CopyButton, PrimaryButton, cn } from "@kakushi/ui";
import { Download, Lock, Shield, Unlock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { encodeFunctionData, isAddress, zeroAddress, type Hex, type PublicClient } from "viem";
import { formatUsdc } from "@kakushi/config";
import { IncrementalMerkleTree, erc20Abi, fieldToHex, generateNote, kakushiPoolAbi, noteCommitment, parseNote, serializeNote, withdrawWitness, type Note } from "@kakushi/sdk";
import { ConnectButton } from "@/components/AppShell";
import { ChainTx, readError } from "@/components/kit";
import { Done, GlassCard, NotLive, ScreenTitle, Well, inputCls } from "@/components/privacy-ui";
import { fmtPool, useDeployment, type PoolInfo } from "@/lib/privacy";
import { proveInBrowser } from "@/lib/prove";
import { requireSuccessfulReceipt } from "@/lib/receipt";
import { useRuntime } from "@/lib/runtime";
import { useWallet } from "@/lib/wallet";

function Deposit({ pools }: { pools: PoolInfo[] }) {
  const { client, cfg } = useRuntime();
  const w = useWallet();
  const [addr, setAddr] = useState<string | null>(null);
  const pool = pools.find((p) => p.address === addr) ?? pools[0];
  const [note, setNote] = useState<Note | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ hash: Hex; label: string } | null>(null);

  function download(n: Note) {
    const blob = new Blob([serializeNote(n)], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kakushi-note-${n.chainId}-${pool ? fmtPool(pool).replace(/\s/g, "") : "pool"}.txt`;
    a.click();
    setSaved(true);
  }

  async function deposit() {
    if (!pool || !note || !saved || busy || !client || !cfg) return;
    setErr(null);
    try {
      const wc = await w.walletClient();
      const allowance = (await client.readContract({ address: cfg.usdc, abi: erc20Abi, functionName: "allowance", args: [w.address as Hex, pool.address] })) as bigint;
      if (allowance < pool.denominationUnits) {
        setBusy("Approve USDC in your wallet…");
        const ah = await wc.sendTransaction({ chain: wc.chain, account: wc.account!, to: cfg.usdc, data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [pool.address, pool.denominationUnits] }) });
        requireSuccessfulReceipt(await client.waitForTransactionReceipt({ hash: ah }), "Approval");
      }
      setBusy("Confirm the deposit…");
      const hash = await wc.sendTransaction({ chain: wc.chain, account: wc.account!, to: pool.address, data: encodeFunctionData({ abi: kakushiPoolAbi, functionName: "deposit", args: [fieldToHex(noteCommitment(note))] }) });
      setBusy("Depositing…");
      requireSuccessfulReceipt(await client.waitForTransactionReceipt({ hash }), "Deposit");
      setDone({ hash, label: fmtPool(pool) });
      setNote(null);
      setSaved(false);
    } catch (e) {
      setErr(readError((e as { shortMessage?: string }).shortMessage ?? (e as Error).message) ?? "Deposit failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Well>
        <div className="text-[13px] text-ui-muted">Amount (fixed pools: everyone in a pool deposits the same amount)</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {pools.map((p) => (
            <button key={p.address} type="button" onClick={() => { setAddr(p.address); setNote(null); setSaved(false); }} className={cn("rounded-full px-4 py-2 text-[15px] font-medium ring-1 transition-colors", pool?.address === p.address ? "bg-[#16205a] text-white ring-[#3b55ff]/60" : "bg-ui-surface-2 text-ui-muted ring-transparent hover:text-ui-text")}>
              {fmtPool(p)}
            </button>
          ))}
        </div>
      </Well>
      {note ? (
        <Well className="mt-2">
          <div className="text-[13px] text-ui-muted">Your note: the only way to withdraw. Kakushi cannot recover it.</div>
          <div className="mt-2 break-all font-mono text-[12px] text-[#c4d0ff]">{serializeNote(note).slice(0, 44)}…</div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => download(note)} className="inline-flex items-center gap-1.5 rounded-full bg-ui-surface-2 px-4 py-2 text-[14px] font-medium hover:bg-ui-surface-3">
              <Download size={15} /> {saved ? "Saved. Download again" : "Download note"}
            </button>
            <span onClickCapture={() => setSaved(true)}>
              <CopyButton value={serializeNote(note)} label="note" variant="button" />
            </span>
          </div>
        </Well>
      ) : null}
      <div className="mt-3">
        {!w.address ? (
          <ConnectButton block large />
        ) : !note ? (
          <PrimaryButton size="lg" block className="h-[58px] text-[17px]" icon={<Lock />} disabled={!pool} onClick={() => { setDone(null); setNote(generateNote(cfg!.chainId, pool!.address)); }}>
            Shield {pool ? fmtPool(pool) : ""}
          </PrimaryButton>
        ) : (
          <PrimaryButton size="lg" block className="h-[58px] text-[17px]" icon={<Lock />} disabled={!saved || !!busy} loading={!!busy} onClick={deposit}>
            {busy ?? (saved ? "Deposit" : "Save your note first")}
          </PrimaryButton>
        )}
      </div>
      {pool ? <p className="px-3 pt-3 text-[12px] text-ui-muted">Pool cap: {pool.maxDeposits.toLocaleString("en-US")} notes (beta guard rail).</p> : null}
      {err ? <p role="alert" className="px-3 pt-3 text-[13px] text-ui-down">{err}</p> : null}
      {done && cfg ? <Done headline={`Shielded ${done.label}`} sub="Withdraw any time with your note" details={<span>Tx <ChainTx explorer={cfg.explorer} hash={done.hash} /></span>} /> : null}
    </>
  );
}

interface RelayerInfo { address: Hex; feeByPool: Record<string, string> }

function Withdraw({ pools }: { pools: PoolInfo[] }) {
  const { client, cfg } = useRuntime();
  const { deployment } = useDeployment();
  const w = useWallet();
  const [text, setText] = useState("");
  const [recipient, setRecipient] = useState("");
  const [useRelayer, setUseRelayer] = useState(true);
  const [relayer, setRelayer] = useState<RelayerInfo | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ hash: Hex; ms: number; gasless: boolean } | null>(null);
  useEffect(() => {
    if (!cfg?.relayer) return;
    fetch("/api/relayer/info").then((r) => (r.ok ? r.json() : null)).then(setRelayer).catch(() => setRelayer(null));
  }, [cfg]);

  const note = useMemo(() => {
    try {
      return text.trim() ? parseNote(text.trim()) : null;
    } catch {
      return null;
    }
  }, [text]);
  const pool = note ? pools.find((p) => p.address.toLowerCase() === note.pool.toLowerCase()) : undefined;
  const wrongChain = Boolean(note && cfg && note.chainId !== cfg.chainId);
  const relayFee = relayer && pool ? BigInt(relayer.feeByPool[pool.address] ?? relayer.feeByPool[pool.address.toLowerCase()] ?? "-1") : -1n;
  const relayable = Boolean(relayer && pool && relayFee >= 0n && relayFee < pool.denominationUnits);
  const viaRelayer = useRelayer && relayable;
  const ready = Boolean(pool && !wrongChain && isAddress(recipient));

  async function withdraw() {
    if (!note || !pool || !ready || stage || !client || !cfg || !deployment) return;
    setErr(null);
    setDone(null);
    try {
      setStage("Reading the pool…");
      const tree = await IncrementalMerkleTree.fromDeposits(client as PublicClient, pool.address, BigInt(deployment.deployBlock), undefined, { concurrency: 6 });
      const relayerAddr = viaRelayer ? relayer!.address : (zeroAddress as Hex);
      const fee = viaRelayer ? relayFee : 0n;
      const wit = withdrawWitness(note, tree, { recipient: recipient as Hex, relayer: relayerAddr, fee });
      setStage("Proving in your browser…");
      const proof = await proveInBrowser(wit.inputs, (s) => setStage(s === "witness" ? "Computing the witness…" : "Proving in your browser…"));
      let hash: Hex;
      if (viaRelayer) {
        setStage("Relaying…");
        const r = await fetch("/api/relayer/relay", { method: "POST", body: JSON.stringify({ chainId: cfg.chainId, pool: pool.address, proof: proof.proof, args: { root: wit.root, nullifierHash: wit.nullifierHash, recipient, relayer: relayerAddr, fee: fee.toString() } }) });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "The relayer refused the withdrawal");
        hash = j.txHash;
      } else {
        setStage("Confirm in your wallet…");
        const wc = await w.walletClient();
        hash = await wc.sendTransaction({ chain: wc.chain, account: wc.account!, to: pool.address, data: encodeFunctionData({ abi: kakushiPoolAbi, functionName: "withdraw", args: [proof.proof, wit.root, wit.nullifierHash, recipient as Hex, relayerAddr, 0n] }) });
      }
      setStage("Withdrawing…");
      requireSuccessfulReceipt(await client.waitForTransactionReceipt({ hash }), "Withdrawal");
      setDone({ hash, ms: proof.ms, gasless: viaRelayer });
    } catch (e) {
      setErr(readError((e as { shortMessage?: string }).shortMessage ?? (e as Error).message) ?? "Withdrawal failed");
    } finally {
      setStage(null);
    }
  }

  return (
    <>
      <Well>
        <div className="text-[13px] text-ui-muted">Note</div>
        <textarea aria-label="Your note" value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="kakushi-note-v1-…" className={cn(inputCls, "mt-2 resize-none font-mono text-[13px]")} />
        {text && !note ? <p className="mt-1 text-[13px] text-ui-warn">Not a Kakushi note</p> : null}
        {note && wrongChain ? <p className="mt-1 text-[13px] text-ui-warn">This note is for chain {note.chainId}, not {cfg?.chainName}.</p> : null}
        {note && !wrongChain && !pool ? <p className="mt-1 text-[13px] text-ui-warn">This note&rsquo;s pool isn&rsquo;t in this deployment.</p> : null}
        {pool && !wrongChain ? <p className="mt-1 text-[13px] text-[#c4d0ff]">{fmtPool(pool)} pool</p> : null}
      </Well>
      <Well className="mt-2">
        <div className="text-[13px] text-ui-muted">Send to (a fresh address works: it needs no balance)</div>
        <input aria-label="Recipient" value={recipient} onChange={(e) => setRecipient(e.target.value.trim())} placeholder="0x… a fresh wallet" className={cn(inputCls, "mt-3 font-mono text-[14px]")} />
        {relayable && pool ? (
          <label className="mt-3 flex items-center gap-2 text-[13px] text-ui-muted">
            <input type="checkbox" checked={useRelayer} onChange={(e) => setUseRelayer(e.target.checked)} className="accent-[#2f47f5]" />
            Gasless via relayer · you receive {formatUsdc(pool.denominationUnits - relayFee)} USDC (fee {formatUsdc(relayFee)} USDC, paid from the note)
          </label>
        ) : (
          <p className="mt-3 text-[13px] text-ui-muted">
            {cfg?.relayer ? "Gasless isn't available for this pool right now (the relayer's fee would be too large a share of the note)." : "No relayer is configured for this deployment."} You&rsquo;ll withdraw from your connected wallet and pay its USDC gas; the recipient receives the full amount.
          </p>
        )}
      </Well>
      <div className="mt-3">
        {!viaRelayer && !w.address ? (
          <ConnectButton block large />
        ) : (
          <PrimaryButton size="lg" block className="h-[58px] text-[17px]" icon={<Unlock />} disabled={!ready || !!stage} loading={!!stage} onClick={withdraw}>
            {stage ?? "Withdraw"}
          </PrimaryButton>
        )}
      </div>
      {err ? <p role="alert" className="px-3 pt-3 text-[13px] text-ui-down">{err}</p> : null}
      {done && cfg ? <Done headline={done.gasless ? "Withdrawn, gasless" : "Withdrawn"} sub={`Proof made in ${(done.ms / 1000).toFixed(1)} s`} details={<span>Tx <ChainTx explorer={cfg.explorer} hash={done.hash} /></span>} /> : null}
    </>
  );
}

export default function ShieldPage() {
  const { pools, ready, deployment } = useDeployment();
  const [tab, setTab] = useState<"in" | "out">("in");
  if (ready && !deployment) return <div className="mx-auto max-w-[500px] pt-[6vh]"><ScreenTitle title="Shield" pill={<><Shield size={13} /> ZK pool</>} /><NotLive /></div>;
  if (!deployment) return null;
  return (
    <div className="mx-auto w-full max-w-[500px] pt-6 pb-20 sm:pt-[5vh]">
      <ScreenTitle title="Shield" pill={<><Shield size={13} /> ZK pool</>} />
      <GlassCard>
        <div className="flex gap-1 px-1.5 pt-1 pb-3">
          {(["in", "out"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={cn("rounded-full px-4 py-1.5 text-[14px] font-medium", tab === t ? "bg-ui-surface-2" : "text-ui-muted hover:text-ui-text")}>
              {t === "in" ? "Deposit" : "Withdraw"}
            </button>
          ))}
        </div>
        {tab === "in" ? <Deposit pools={pools} /> : <Withdraw pools={pools} />}
      </GlassCard>
    </div>
  );
}
