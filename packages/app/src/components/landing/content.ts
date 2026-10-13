/**
 * Kakushi landing copy (Arc). Everything here is a claim the code and docs/E2E-TESTNET.md (live Arc testnet) or docs/E2E-FORK.md (fork) back up.
 */

export const nav = {
  links: [
    { label: "How it works", href: "#how" },
    { label: "Arc stack", href: "#stack" },
    { label: "Plugin", href: "#developers" },
    { label: "FAQ", href: "#faq" },
  ],
};

export const hero = {
  pill: "Private USDC payments on Arc",
  headline: ["Pay in USDC.", "Keep it private."],
  primary: "Open app",
  secondary: "Add privacy to your app",
  line: "Stealth addresses, a zero-knowledge USDC pool and a gasless relayer, on Circle's Arc.",
};

export const how = {
  eyebrow: "How it works",
  heading: ["Three moves.", "One private dollar."],
  sub: "Your keys stay in your wallet; proofs run in your browser. Gas is USDC, so there is nothing else to hold.",
  cards: [
    { key: "pay", title: "Send", body: "Each payment lands on a fresh one-time address that only the recipient can find.", foot: "ERC-5564 + ERC-6538" },
    { key: "shield", title: "Shield", body: "Deposit a fixed amount of USDC into a pool. Later withdraw to any address with a proof.", foot: "Noir / UltraHonk" },
    { key: "relay", title: "Withdraw, gasless", body: "A relayer submits the withdrawal and is paid in USDC from the note. The new address needs no balance.", foot: "Relayer" },
  ],
} as const;

export const stack = {
  eyebrow: "Arc stack",
  heading: ["Built for how", "Arc works."],
  sub: "Arc pays gas in USDC and finalizes in under a second. That removes the two things that usually give private payments away.",
  cards: [
    { key: "gas", engine: "USDC as gas", title: "No gas token to link", items: ["A stealth address that holds only USDC can still send transactions", "The relayer is repaid in the same asset it spends", "No ETH-style top-up that ties a fresh wallet to an old one"] },
    { key: "usdc", engine: "Native USDC", title: "6 and 18 decimals, handled", items: ["Pools hold the 6-decimal ERC-20 at 0x3600…0000", "Relayer fees convert 18-decimal gas cost to USDC units", "Tested against Circle's FiatToken v2.2 bytecode"] },
    { key: "final", engine: "Deterministic finality", title: "Final in under a second", items: ["Arc's published finality is sub-second, so a payment is done when it lands", "A proof is verified on-chain in one transaction", "A withdrawal measured about 3.6M gas, roughly 0.09 USDC on testnet"] },
  ],
} as const;

export const developers = {
  eyebrow: "Developers",
  heading: ["One plugin.", "Any checkout, private."],
  sub: "Drop in the widget, or call the SDK. A relayer pays the gas so nothing links back to your users' wallets.",
  bullets: ["<KakushiPay/> for USDC checkouts", "A shielded USDC pool with a gasless relayer", "ERC-5564 / ERC-6538 stealth addresses"],
  note: "@kakushi/sdk",
  samples: [
    {
      key: "send",
      label: "Send",
      filename: "send.ts",
      language: "ts",
      code: `import { planStealthSend, readStealthMetaAddress } from "@kakushi/sdk";

// The recipient's meta-address, from the ERC-6538 registry or a QR code
const meta = await readStealthMetaAddress(client, d.stealthRegistry, recipient);

// One approval, one transaction: USDC lands on a one-time address, announced on-chain
const plan = planStealthSend({ metaAddress: meta!, amount: 25_000_000n, usdc, stealthPay: d.stealthPay });
await wallet.sendTransaction(plan.approve);
await wallet.sendTransaction(plan.pay);`,
    },
    {
      key: "shield",
      label: "Shield",
      filename: "shield.ts",
      language: "ts",
      code: `import { generateNote, noteCommitment, fieldToHex, withdrawWitness } from "@kakushi/sdk";
import { proveWithdraw } from "@kakushi/sdk/node";

// Deposit: only the commitment goes on chain
const note = generateNote(chainId, pool);
await pool.write.deposit([fieldToHex(noteCommitment(note))]);

// Later, from anywhere: a proof, submitted by the relayer, fee paid in USDC
const w = withdrawWitness(note, tree, { recipient: fresh, relayer, fee });
const { proof } = await proveWithdraw(w);
await relayWithdraw(relayerUrl, { chainId, pool, proof, args: { ...w, recipient: fresh, relayer, fee } });`,
    },
    {
      key: "widget",
      label: "Widget",
      filename: "Checkout.tsx",
      language: "tsx",
      code: `import { KakushiPay } from "@kakushi/widget";

// Drop it next to your existing pay button. Amounts are USDC.
<KakushiPay
  to={merchantMetaAddress}
  amount="25"
  chain={arc}
  deployment={deployment}
  walletClient={wallet}
  publicClient={client}
  onPaid={(tx) => markOrderPaid(tx.txHash)}
/>`,
    },
  ],
};

export const fees = {
  eyebrow: "Fees",
  line: "No protocol cut. Gas, and a relayer fee you can see.",
  sub: "A gasless withdrawal pays the relayer a fee shown before you sign (about 0.13 USDC on the 1 USDC pool at the testnet gas price we measured); withdraw from your own wallet and pay only gas.",
  compare: "Open source, MIT. No API key.",
};

export const faq = {
  eyebrow: "FAQ",
  heading: ["Questions,", "answered."],
  sub: "About keys, proofs and what stays public.",
  items: [
    { q: "What does a stealth address hide?", a: "Who gets paid. Each payment goes to a fresh address derived from the recipient's meta-address; only their viewing key can find it. The amount and the sender are still public." },
    { q: "What does the pool hide?", a: "The link between a deposit and a withdrawal. You deposit a fixed amount of USDC with a commitment and later withdraw with a zero-knowledge proof that you own one of the deposits, without saying which. Pools are fixed at 1, 10 and 100 USDC; a small pool has a small anonymity set." },
    { q: "Who can see my keys?", a: "Nobody. Stealth keys come from a signature in your wallet and proofs run in your browser. Your note is the only way to withdraw: lose it and the funds stay in the pool." },
    { q: "Why a relayer?", a: "A fresh address has no balance. The relayer submits the withdrawal, pays the gas in USDC and keeps a fee from the note, so the new address never touches your old one. The fee is inside the proof, so the relayer cannot raise it." },
    { q: "Is this audited?", a: "No. It is a beta with an immutable cap on how many notes each pool will accept. The Noir circuit and the verifier come from an earlier project and have not had an external audit." },
    { q: "What about Arc's own privacy?", a: "Arc's confidential execution environment is on Arc's roadmap and not live. Kakushi works today, on the public EVM, as an application." },
  ],
};

export const closing = {
  heading: "Private dollars.",
  sub: "Pay, shield and withdraw USDC on Arc without leaving a trail back to you.",
};
