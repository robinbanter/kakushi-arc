import { afterEach, expect, it, vi } from "vitest";
import { retryRpcRead } from "../src/rpc-retry.ts";
afterEach(() => vi.useRealTimers());
it("retries throttled reads without losing the result", async () => {
  vi.useFakeTimers();
  const read = vi.fn().mockRejectedValueOnce(new Error("Request exceeds defined limit.")).mockResolvedValueOnce(["event"]);
  const result = retryRpcRead(read);
  await vi.runAllTimersAsync();
  expect(await result).toEqual(["event"]);
  expect(read).toHaveBeenCalledTimes(2);
});
it("does not retry other failures", async () => {
  const read = vi.fn().mockRejectedValue(new Error("invalid range"));
  await expect(retryRpcRead(read)).rejects.toThrow("invalid range");
  expect(read).toHaveBeenCalledTimes(1);
});
it("stops after five attempts and surfaces persistent throttling", async () => {
  vi.useFakeTimers();
  const read = vi.fn().mockRejectedValue(new Error("rate limit exceeded"));
  const result = expect(retryRpcRead(read)).rejects.toThrow("rate limit exceeded");
  await vi.runAllTimersAsync(); await result;
  expect(read).toHaveBeenCalledTimes(5);
});
