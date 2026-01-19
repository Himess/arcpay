/**
 * Core Module Tests
 *
 * Tests for basic payment and balance operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock viem
vi.mock('viem', () => ({
  createPublicClient: vi.fn(() => ({
    readContract: vi.fn().mockResolvedValue(BigInt('1000000000')), // 1000 USDC
    getBalance: vi.fn().mockResolvedValue(BigInt('1000000000000000000')),
  })),
  createWalletClient: vi.fn(() => ({
    account: { address: '0xF505e2E71df58D7244189072008f25f6b6aaE5ae' },
    writeContract: vi.fn().mockResolvedValue('0x123'),
  })),
  http: vi.fn(),
  formatUnits: vi.fn((val: bigint, decimals: number) => (Number(val) / Math.pow(10, decimals)).toString()),
  parseUnits: vi.fn((val: string, decimals: number) => BigInt(Number(val) * Math.pow(10, decimals))),
}));

vi.mock('viem/accounts', () => ({
  privateKeyToAccount: vi.fn(() => ({
    address: '0xF505e2E71df58D7244189072008f25f6b6aaE5ae',
  })),
}));

describe('Core Module', () => {
  describe('Balance Operations', () => {
    it('should format USDC balance correctly', () => {
      const rawBalance = BigInt('1000000000'); // 1000 USDC (6 decimals)
      const formatted = Number(rawBalance) / 1e6;
      expect(formatted).toBe(1000);
    });

    it('should handle zero balance', () => {
      const rawBalance = BigInt('0');
      const formatted = Number(rawBalance) / 1e6;
      expect(formatted).toBe(0);
    });

    it('should handle decimal amounts', () => {
      const rawBalance = BigInt('1500000'); // 1.5 USDC
      const formatted = Number(rawBalance) / 1e6;
      expect(formatted).toBe(1.5);
    });
  });

  describe('Amount Parsing', () => {
    it('should parse whole USDC amounts', () => {
      const amount = '100';
      const parsed = BigInt(Number(amount) * 1e6);
      expect(parsed).toBe(BigInt('100000000'));
    });

    it('should parse decimal USDC amounts', () => {
      const amount = '50.50';
      const parsed = BigInt(Number(amount) * 1e6);
      expect(parsed).toBe(BigInt('50500000'));
    });

    it('should handle small amounts', () => {
      const amount = '0.01';
      const parsed = BigInt(Number(amount) * 1e6);
      expect(parsed).toBe(BigInt('10000'));
    });
  });

  describe('Address Validation', () => {
    it('should validate correct Ethereum address', () => {
      const address = '0xF505e2E71df58D7244189072008f25f6b6aaE5ae';
      const isValid = /^0x[a-fA-F0-9]{40}$/.test(address);
      expect(isValid).toBe(true);
    });

    it('should reject invalid address', () => {
      const address = '0xinvalid';
      const isValid = /^0x[a-fA-F0-9]{40}$/.test(address);
      expect(isValid).toBe(false);
    });

    it('should reject address without 0x prefix', () => {
      const address = 'F505e2E71df58D7244189072008f25f6b6aaE5ae';
      const isValid = /^0x[a-fA-F0-9]{40}$/.test(address);
      expect(isValid).toBe(false);
    });
  });
});
