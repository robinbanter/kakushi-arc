import { describe, expect, it } from "vitest";
import { ARC, chainById, currentNetwork, formatUsdc, nativeWeiToUsdcUnits, parseUsdc, rpcUrl } from "../chains.ts";
import { parseDeployment } from "../deployments.ts";

describe("arc chains", () => {
  it("knows both networks and the shared USDC address", () => {
    expect(ARC.testnet.chainId).toBe(5042002);
    expect(ARC.mainnet.chainId).toBe(5042);
    expect(ARC.testnet.usdc).toBe(ARC.mainnet.usdc);
    expect(chainById(5042).network).toBe("mainnet");
    expect(() => chainById(1)).toThrow("unknown Arc chain id");
  });
  it("network and rpc come from env", () => {
    expect(currentNetwork({})).toBe("testnet");
    expect(currentNetwork({ KAKUSHI_NETWORK: "mainnet" })).toBe("mainnet");
    expect(() => currentNetwork({ KAKUSHI_NETWORK: "local" })).toThrow();
    expect(rpcUrl(ARC.mainnet, {})).toBe("https://rpc.mainnet.arc.io");
    expect(rpcUrl(ARC.mainnet, { ARC_RPC_URL: "http://127.0.0.1:9200" })).toBe("http://127.0.0.1:9200");
  });
  it("USDC amounts: 6 decimals, never 18", () => {
    expect(parseUsdc("12.5")).toBe(12_500_000n);
    expect(formatUsdc(12_500_000n)).toBe("12.5");
    expect(formatUsdc(1n)).toBe("0.000001");
    expect(() => parseUsdc("1.0000001")).toThrow();
    // gas is quoted in 18-dec native wei: 1 USDC unit = 1e12 wei, rounded up
    expect(nativeWeiToUsdcUnits(1_000_000_000_000n)).toBe(1n);
    expect(nativeWeiToUsdcUnits(1_000_000_000_001n)).toBe(2n);
  });
  it("rejects a malformed deployment record", () => {
    expect(() => parseDeployment({ network: "testnet" })).toThrow("not an address");
  });
});
