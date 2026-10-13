export function requireSuccessfulReceipt<T extends { status: string }>(receipt: T, label: string): T {
  if (receipt.status !== "success") throw new Error(`${label} reverted. Check the transaction and retry.`);
  return receipt;
}
