/**
 * Split Payment Module Tests
 *
 * Comprehensive tests for the SplitManager module
 * Tests: Equal split, custom split, percentage split, calculations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SplitManager,
  createSplitManager,
  calculateEqualSplit,
  calculatePercentSplit,
  type SplitRecipient,
} from '../src/modules/split';
import { ContactManager, createContactManager, MemoryStorage } from '../src/modules/contacts';
import type { ArcPay } from '../src/core/client';

// Mock ArcPay client
function createMockArcPay(address = '0x1234567890123456789012345678901234567890'): Partial<ArcPay> {
  return {
    address,
    sendUSDC: vi.fn().mockResolvedValue({
      success: true,
      txHash: '0xmocktxhash123456789',
    }),
  };
}

describe('SplitManager', () => {
  let manager: SplitManager;
  let contactManager: ContactManager;
  let mockArcPay: Partial<ArcPay>;

  beforeEach(async () => {
    contactManager = createContactManager({
      storage: new MemoryStorage(),
      autoSave: true,
    });
    mockArcPay = createMockArcPay();
    manager = createSplitManager(mockArcPay as ArcPay);
    manager.setContactManager(contactManager);

    // Add some test contacts
    await contactManager.add('alice', '0x1111111111111111111111111111111111111111');
    await contactManager.add('bob', '0x2222222222222222222222222222222222222222');
    await contactManager.add('charlie', '0x3333333333333333333333333333333333333333');
  });

  // ==================== Equal Split ====================

  describe('Equal Split', () => {
    it('should split equally between recipients', async () => {
      const result = await manager.equal('100', ['alice', 'bob']);

      expect(result.recipients.length).toBe(2);
      expect(result.recipients[0].amount).toBe('50.00');
      expect(result.recipients[1].amount).toBe('50.00');
    });

    it('should handle three-way split', async () => {
      const result = await manager.equal('99', ['alice', 'bob', 'charlie']);

      expect(result.recipients.length).toBe(3);
      expect(result.recipients[0].amount).toBe('33.00');
      expect(result.recipients[1].amount).toBe('33.00');
      expect(result.recipients[2].amount).toBe('33.00');
    });

    it('should resolve contact names to addresses', async () => {
      const result = await manager.equal('100', ['alice', 'bob']);

      expect(result.recipients[0].address).toBe('0x1111111111111111111111111111111111111111');
      expect(result.recipients[1].address).toBe('0x2222222222222222222222222222222222222222');
    });

    it('should handle direct addresses', async () => {
      const result = await manager.equal('100', [
        '0x4444444444444444444444444444444444444444',
        '0x5555555555555555555555555555555555555555',
      ]);

      expect(result.recipients[0].address).toBe('0x4444444444444444444444444444444444444444');
      expect(result.recipients[1].address).toBe('0x5555555555555555555555555555555555555555');
    });

    it('should send payments to all recipients', async () => {
      await manager.equal('100', ['alice', 'bob']);

      expect(mockArcPay.sendUSDC).toHaveBeenCalledTimes(2);
    });

    it('should return transaction hashes', async () => {
      const result = await manager.equal('100', ['alice', 'bob']);

      expect(result.recipients[0].txHash).toBe('0xmocktxhash123456789');
      expect(result.recipients[1].txHash).toBe('0xmocktxhash123456789');
    });

    it('should throw for unknown contacts', async () => {
      await expect(manager.equal('100', ['alice', 'unknown'])).rejects.toThrow(
        'Could not resolve address'
      );
    });

    it('should throw for empty recipients', async () => {
      await expect(manager.equal('100', [])).rejects.toThrow('At least 2 recipients required');
    });

    it('should throw for single recipient', async () => {
      await expect(manager.equal('100', ['alice'])).rejects.toThrow('At least 2 recipients required');
    });
  });

  // ==================== Custom Split ====================

  describe('Custom Split', () => {
    it('should split with custom amounts', async () => {
      const recipients: SplitRecipient[] = [
        { to: 'alice', amount: '60' },
        { to: 'bob', amount: '40' },
      ];

      const result = await manager.custom(recipients);

      expect(result.recipients.length).toBe(2);
      expect(result.recipients[0].amount).toBe('60');
      expect(result.recipients[1].amount).toBe('40');
    });

    it('should send correct amounts', async () => {
      const recipients: SplitRecipient[] = [
        { to: 'alice', amount: '75' },
        { to: 'bob', amount: '25' },
      ];

      await manager.custom(recipients);

      expect(mockArcPay.sendUSDC).toHaveBeenCalledWith(
        '0x1111111111111111111111111111111111111111',
        '75'
      );
      expect(mockArcPay.sendUSDC).toHaveBeenCalledWith(
        '0x2222222222222222222222222222222222222222',
        '25'
      );
    });

    it('should handle unequal custom splits', async () => {
      const recipients: SplitRecipient[] = [
        { to: 'alice', amount: '10' },
        { to: 'bob', amount: '30' },
        { to: 'charlie', amount: '60' },
      ];

      const result = await manager.custom(recipients);

      expect(result.total).toBe('100.00');
      expect(result.recipients[0].amount).toBe('10');
      expect(result.recipients[1].amount).toBe('30');
      expect(result.recipients[2].amount).toBe('60');
    });
  });

  // ==================== Percentage Split ====================

  describe('Percentage Split', () => {
    it('should split by percentage', async () => {
      const result = await manager.byPercent('100', [
        { to: 'alice', percent: 60 },
        { to: 'bob', percent: 40 },
      ]);

      expect(result.recipients[0].amount).toBe('60.00');
      expect(result.recipients[1].amount).toBe('40.00');
    });

    it('should handle three-way percentage split', async () => {
      const result = await manager.byPercent('300', [
        { to: 'alice', percent: 50 },
        { to: 'bob', percent: 30 },
        { to: 'charlie', percent: 20 },
      ]);

      expect(result.recipients[0].amount).toBe('150.00');
      expect(result.recipients[1].amount).toBe('90.00');
      expect(result.recipients[2].amount).toBe('60.00');
    });

    it('should handle decimal percentages', async () => {
      const result = await manager.byPercent('1000', [
        { to: 'alice', percent: 33.33 },
        { to: 'bob', percent: 33.33 },
        { to: 'charlie', percent: 33.34 },
      ]);

      expect(parseFloat(result.recipients[0].amount)).toBeCloseTo(333.3, 0);
      expect(parseFloat(result.recipients[1].amount)).toBeCloseTo(333.3, 0);
      expect(parseFloat(result.recipients[2].amount)).toBeCloseTo(333.4, 0);
    });

    it('should throw if percentages do not sum to 100', async () => {
      await expect(
        manager.byPercent('100', [
          { to: 'alice', percent: 60 },
          { to: 'bob', percent: 30 },
        ])
      ).rejects.toThrow('Percentages must sum to 100');
    });

    it('should throw if percentages exceed 100', async () => {
      await expect(
        manager.byPercent('100', [
          { to: 'alice', percent: 60 },
          { to: 'bob', percent: 50 },
        ])
      ).rejects.toThrow('Percentages must sum to 100');
    });
  });

  // ==================== Split Calculation ====================

  describe('Split Calculation', () => {
    it('should preview equal split without sending', async () => {
      const calculation = await manager.preview('100', ['alice', 'bob']);

      expect(calculation.total).toBe('100');
      expect(calculation.perPerson).toBe('50.00');
      expect(calculation.recipients.length).toBe(2);
      expect(mockArcPay.sendUSDC).not.toHaveBeenCalled();
    });

    it('should preview with remainder', async () => {
      const calculation = await manager.preview('100', ['alice', 'bob', 'charlie']);

      expect(calculation.total).toBe('100');
      expect(parseFloat(calculation.perPerson)).toBeCloseTo(33.33, 1);
    });
  });

  // ==================== Error Handling ====================

  describe('Error Handling', () => {
    it('should handle payment failure gracefully', async () => {
      const failingArcPay = {
        ...mockArcPay,
        sendUSDC: vi.fn()
          .mockResolvedValueOnce({ success: true, txHash: '0xfirst' })
          .mockResolvedValueOnce({ success: false, error: 'Insufficient funds' }),
      };

      manager.setArcPay(failingArcPay as unknown as ArcPay);

      const result = await manager.equal('100', ['alice', 'bob']);

      expect(result.recipients[0].status).toBe('success');
      expect(result.recipients[1].status).toBe('failed');
      expect(result.recipients[1].error).toBe('Insufficient funds');
    });

    it('should throw if ArcPay not set', async () => {
      const managerWithoutArcPay = createSplitManager();
      managerWithoutArcPay.setContactManager(contactManager);

      await expect(managerWithoutArcPay.equal('100', ['alice', 'bob'])).rejects.toThrow(
        'ArcPay client not set'
      );
    });
  });
});

// ==================== Pure Calculation Functions ====================

describe('Split Calculation Functions', () => {
  describe('calculateEqualSplit', () => {
    it('should calculate equal split', () => {
      const result = calculateEqualSplit('100', 2);
      expect(result.perPerson).toBe('50.00');
      expect(result.remainder).toBe('0.00');
    });

    it('should handle remainder', () => {
      const result = calculateEqualSplit('100', 3);
      expect(result.perPerson).toBe('33.33');
      expect(result.remainder).toBe('0.01');
    });

    it('should handle large amounts', () => {
      const result = calculateEqualSplit('10000', 7);
      expect(parseFloat(result.perPerson)).toBeCloseTo(1428.57, 1);
    });

    it('should handle small amounts', () => {
      const result = calculateEqualSplit('1', 4);
      expect(result.perPerson).toBe('0.25');
    });
  });

  describe('calculatePercentSplit', () => {
    it('should calculate percentage split', () => {
      const result = calculatePercentSplit('100', [60, 40]);
      expect(result[0]).toBe('60.00');
      expect(result[1]).toBe('40.00');
    });

    it('should handle decimal results', () => {
      const result = calculatePercentSplit('333', [33.33, 33.33, 33.34]);
      expect(parseFloat(result[0])).toBeCloseTo(110.99, 0);
      expect(parseFloat(result[1])).toBeCloseTo(110.99, 0);
      expect(parseFloat(result[2])).toBeCloseTo(111.02, 0);
    });
  });
});

// ==================== Split Voice Command Patterns ====================

describe('Split Voice Command Patterns', () => {
  const patterns = {
    splitEqual: /split\s+\$?([\d.]+)\s+(?:between|among|with)\s+(.+)/i,
    splitBill: /(?:divide|split)\s+(?:the\s+)?bill\s+(?:of\s+)?\$?([\d.]+)/i,
    splitWithMe: /split\s+\$?([\d.]+)\s+with\s+me\s+and\s+(.+)/i,
  };

  it('should match split between pattern', () => {
    const command = 'split $100 between alice and bob';
    const match = command.match(patterns.splitEqual);

    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('100');
    expect(match?.[2]).toBe('alice and bob');
  });

  it('should match split among pattern', () => {
    const command = 'split 50 among alice, bob, charlie';
    const match = command.match(patterns.splitEqual);

    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('50');
    expect(match?.[2]).toBe('alice, bob, charlie');
  });

  it('should match divide bill pattern', () => {
    const command = 'divide the bill of $150';
    const match = command.match(patterns.splitBill);

    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('150');
  });

  it('should match split bill pattern', () => {
    const command = 'split bill $200';
    const match = command.match(patterns.splitBill);

    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('200');
  });

  it('should match split with me pattern', () => {
    const command = 'split $90 with me and alice and bob';
    const match = command.match(patterns.splitWithMe);

    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('90');
    expect(match?.[2]).toBe('alice and bob');
  });
});
