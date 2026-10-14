import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ network: 'mainnet', deployment: { chainId: 5042 }, options: null as any }));
vi.mock('../src/lib/server-config', () => ({ network: () => state.network, loadRuntimeDeployment: () => state.deployment, serverRpc: () => 'http://rpc.invalid' }));
vi.mock('../../relayer/src/config', () => ({ poolsOf: () => [] }));
vi.mock('../../relayer/src/relayer', () => ({ Relayer: class {
  address = '0x0000000000000000000000000000000000000001';
  constructor(options: unknown) { state.options = options; }
  async balance() { return 1000000n; }
} }));
describe('hosted relayer network selection', () => {
  beforeEach(() => { vi.resetModules(); state.options = null; process.env.RELAYER_KEY = '0x' + '1'.repeat(64); });
  it.each([['mainnet', 5042], ['testnet', 5042002]])('uses the %s deployment and health chain ID', async (network, chainId) => {
    state.network = network as string; state.deployment = { chainId: chainId as number };
    const { localRelay } = await import('../src/lib/hosted-relayer');
    const r = await localRelay(new Request('http://localhost/api/relayer/health'), 'health');
    expect(r.status).toBe(200); expect((await r.json()).chainId).toBe(chainId); expect(state.options.network).toBe(network);
  });
  it('refuses a deployment from the other network before constructing a signer client', async () => {
    state.network = 'mainnet'; state.deployment = { chainId: 5042002 };
    const { localRelay } = await import('../src/lib/hosted-relayer');
    const r = await localRelay(new Request('http://localhost/api/relayer/health'), 'health');
    expect(r.status).toBe(503); expect(state.options).toBeNull();
  });
});
