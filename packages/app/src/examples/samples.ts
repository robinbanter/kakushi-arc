// Generated from typechecked examples; run scripts/sync-examples.mjs.
import type { CodeSample } from "@kakushi/ui";
export default [
  {
    "key": "arc.ts",
    "label": "arc.ts",
    "filename": "arc.ts",
    "language": "ts",
    "code": "import { arcChain } from \"@kakushi/sdk\";\nimport { createPublicClient, createWalletClient, custom, http, type EIP1193Provider } from \"viem\";\n\nexport const chain = arcChain(\"testnet\");\nexport const deployment = {\n  stealthRegistry: \"0xc79A4Aa7396c3e67ee461C3A92fFc4258e49361B\",\n  stealthPay: \"0x234384Adcbcbaf68145A42f13b0E666444961C0e\",\n  usdc: \"0x3600000000000000000000000000000000000000\",\n} as const;\nexport const publicClient = createPublicClient({ chain, transport: http() });\n\n// Call from a user action. The widget asks the wallet to switch to Arc testnet.\nexport async function connectWallet() {\n  const provider = (window as unknown as { ethereum?: EIP1193Provider }).ethereum;\n  if (!provider) throw new Error(\"Install a browser wallet first\");\n  const wallet = createWalletClient({ chain, transport: custom(provider) });\n  const [account] = await wallet.requestAddresses();\n  if (!account) throw new Error(\"No wallet account selected\");\n  return createWalletClient({ account, chain, transport: custom(provider) });\n}\n\n// Shared props for the three-line React integration.\nexport const checkoutConfig = { chain, deployment, publicClient, walletClient: connectWallet };\n"
  },
  {
    "key": "Checkout.tsx",
    "label": "Checkout.tsx",
    "filename": "Checkout.tsx",
    "language": "tsx",
    "code": "\"use client\";\n\nimport { KakushiPay } from \"@kakushi/widget\";\nimport { checkoutConfig } from \"./arc\";\nexport const Checkout = ({ to }: { to: string }) => <KakushiPay to={to} amount=\"0.01\" {...checkoutConfig} />;\n"
  },
  {
    "key": "send.ts",
    "label": "send.ts",
    "filename": "send.ts",
    "language": "ts",
    "code": "import { planStealthSend, readStealthMetaAddress } from \"@kakushi/sdk\";\nimport type { Address } from \"viem\";\nimport { chain, deployment, publicClient, connectWallet } from \"./arc\";\n\nexport async function payRegisteredRecipient(recipient: Address) {\n  const wallet = await connectWallet();\n  await wallet.switchChain({ id: chain.id }); // Add Arc testnet to the wallet first.\n  const meta = await readStealthMetaAddress(\n    publicClient, deployment.stealthRegistry, recipient,\n  );\n  if (!meta) throw new Error(\"Recipient must enable private receiving first\");\n  const plan = planStealthSend({\n    metaAddress: meta, amount: 10_000n, // 0.01 USDC; SDK uses 6-decimal base units.\n    usdc: deployment.usdc, stealthPay: deployment.stealthPay,\n  });\n  const approveHash = await wallet.sendTransaction(plan.approve);\n  const approval = await publicClient.waitForTransactionReceipt({ hash: approveHash });\n  if (approval.status !== \"success\") throw new Error(\"USDC approval reverted\");\n  const hash = await wallet.sendTransaction(plan.pay);\n  const receipt = await publicClient.waitForTransactionReceipt({ hash });\n  if (receipt.status !== \"success\") throw new Error(\"Payment reverted\");\n  return { hash, stealthAddress: plan.stealth.stealthAddress };\n}\n"
  }
] satisfies CodeSample[];
