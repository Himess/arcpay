import { describe, it, expect, beforeAll } from 'vitest';
import { ArcPay } from '../src';

describe('ArcPay Client', () => {
  describe('Initialization', () => {
    it('should initialize with arc-testnet', async () => {
      const arc = await ArcPay.init({
        network: 'arc-testnet',
      });

      expect(arc).toBeDefined();
      expect(arc.network.chainId).toBe(5042002);
      expect(arc.network.name).toBe('Arc Testnet');
    });

    it('should have correct network configuration', async () => {
      const arc = await ArcPay.init({
        network: 'arc-testnet',
      });

      expect(arc.network.rpcUrl).toBe('https://rpc.testnet.arc.network');
      expect(arc.network.explorerUrl).toBe('https://testnet.arcscan.app');
      expect(arc.network.usdc).toBe('0x3600000000000000000000000000000000000000');
    });

    it('should not have signer when no private key provided', async () => {
      const arc = await ArcPay.init({
        network: 'arc-testnet',
      });

      expect(arc.hasSigner()).toBe(false);
      expect(arc.address).toBeUndefined();
    });

    it('should have signer when private key provided', async () => {
      // Test private key (never use real keys in tests)
      const testPrivateKey = '0x0123456789012345678901234567890123456789012345678901234567890123';

      const arc = await ArcPay.init({
        network: 'arc-testnet',
        privateKey: testPrivateKey,
      });

      expect(arc.hasSigner()).toBe(true);
      expect(arc.address).toBeDefined();
      expect(arc.address?.startsWith('0x')).toBe(true);
    });

    it('should throw on invalid network', async () => {
      await expect(
        ArcPay.init({
          network: 'invalid-network' as never,
        })
      ).rejects.toThrow('Unknown network');
    });
  });

  describe('Modules', () => {
    let arc: ArcPay;

    beforeAll(async () => {
      arc = await ArcPay.init({
        network: 'arc-testnet',
      });
    });

    it('should have micropayments module', () => {
      expect(arc.micropayments).toBeDefined();
      expect(typeof arc.micropayments.paywall).toBe('function');
    });

    it('should have paymaster module', () => {
      expect(arc.paymaster).toBeDefined();
      expect(typeof arc.paymaster.setRules).toBe('function');
      expect(typeof arc.paymaster.sponsorTransaction).toBe('function');
    });

    it('should have usyc module', () => {
      expect(arc.usyc).toBeDefined();
      expect(typeof arc.usyc.isAvailable).toBe('function');
      expect(typeof arc.usyc.subscribe).toBe('function');
      expect(typeof arc.usyc.redeem).toBe('function');
    });

    it('usyc should be available on testnet', () => {
      expect(arc.usyc.isAvailable()).toBe(true);
    });
  });

  describe('Utility Methods', () => {
    let arc: ArcPay;

    beforeAll(async () => {
      arc = await ArcPay.init({
        network: 'arc-testnet',
      });
    });

    it('should return explorer URL', () => {
      const url = arc.getExplorerUrl('0x123456');
      expect(url).toBe('https://testnet.arcscan.app/tx/0x123456');
    });

    it('should return faucet URL', () => {
      const url = arc.getFaucetUrl();
      expect(url).toBe('https://faucet.circle.com');
    });
  });
});

describe('Validation', () => {
  it('should validate address format', async () => {
    const arc = await ArcPay.init({
      network: 'arc-testnet',
    });

    // Invalid address should throw
    await expect(arc.getBalance('invalid')).rejects.toThrow();
    await expect(arc.getBalance('0x123')).rejects.toThrow();
  });
});

describe('Paymaster', () => {
  let arc: ArcPay;

  beforeAll(async () => {
    arc = await ArcPay.init({
      network: 'arc-testnet',
    });
  });

  it('should set and get rules', () => {
    arc.paymaster.setRules({
      maxPerTransaction: '0.01',
      maxPerUserDaily: '1.00',
      dailyBudget: '100.00',
    });

    const rules = arc.paymaster.getRules();
    expect(rules.maxPerTransaction).toBe('0.01');
    expect(rules.maxPerUserDaily).toBe('1.00');
    expect(rules.dailyBudget).toBe('100.00');
  });

  it('should track stats', () => {
    const stats = arc.paymaster.getStats();
    expect(stats).toHaveProperty('totalSponsored');
    expect(stats).toHaveProperty('transactionCount');
    expect(stats).toHaveProperty('uniqueUsers');
  });
});

describe('USYC', () => {
  let arc: ArcPay;

  beforeAll(async () => {
    arc = await ArcPay.init({
      network: 'arc-testnet',
    });
  });

  it('should return allowlist URL', () => {
    const url = arc.usyc.getAllowlistUrl();
    expect(url).toBe('https://usyc.dev.hashnote.com/');
  });

  it('should return status', () => {
    const status = arc.usyc.getStatus();
    expect(status.available).toBe(true);
    expect(status.contractAddress).toBeDefined();
    expect(status.tellerAddress).toBeDefined();
  });
});
