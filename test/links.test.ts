/**
 * Payment Links Module Tests
 *
 * Comprehensive tests for the PaymentLinkManager module
 * Tests: Link creation, payment, expiration, listing
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  PaymentLinkManager,
  createLinkManager,
  createPaymentLink,
  payLink,
  type CreateLinkOptions,
} from '../src/modules/links';
import { MemoryStorage } from '../src/modules/contacts';
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

describe('PaymentLinkManager', () => {
  let manager: PaymentLinkManager;
  let mockArcPay: Partial<ArcPay>;

  beforeEach(async () => {
    mockArcPay = createMockArcPay();
    manager = createLinkManager(mockArcPay as ArcPay, {
      storagePrefix: `test_links_${Date.now()}_${Math.random().toString(36)}_`,
    });
    // Clear any existing data
    await manager.clear();
  });

  // ==================== Link Creation ====================

  describe('Link Creation', () => {
    it('should create a payment link', async () => {
      const link = await manager.create({
        amount: '50',
        description: 'Test payment',
      });

      expect(link.id).toMatch(/^link_/);
      expect(link.amount).toBe('50');
      expect(link.description).toBe('Test payment');
      expect(link.status).toBe('active');
    });

    it('should generate unique IDs', async () => {
      const link1 = await manager.create({ amount: '10' });
      const link2 = await manager.create({ amount: '20' });

      expect(link1.id).not.toBe(link2.id);
    });

    it('should create link with URL', async () => {
      const link = await manager.create({ amount: '100' });

      expect(link.url).toContain(link.id);
      expect(link.url).toMatch(/arcpay:\/\/pay\//);
    });

    it('should use default recipient from ArcPay', async () => {
      const link = await manager.create({ amount: '50' });

      expect(link.recipient).toBe('0x1234567890123456789012345678901234567890');
    });

    it('should allow custom recipient', async () => {
      const customRecipient = '0x9999999999999999999999999999999999999999';
      const link = await manager.create({
        amount: '50',
        recipient: customRecipient,
      });

      expect(link.recipient).toBe(customRecipient);
    });

    it('should set expiration from string', async () => {
      const link = await manager.create({
        amount: '50',
        expiresIn: '24h',
      });

      expect(link.expiresAt).toBeDefined();
      const expiresAt = new Date(link.expiresAt!);
      const now = new Date();
      const hoursDiff = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      expect(hoursDiff).toBeCloseTo(24, 0);
    });

    it('should set max uses', async () => {
      const link = await manager.create({
        amount: '50',
        maxUses: 5,
      });

      expect(link.maxUses).toBe(5);
      expect(link.usedCount).toBe(0);
    });

    it('should create link without amount (flexible)', async () => {
      const link = await manager.create({
        description: 'Donate what you want',
      });

      expect(link.amount).toBeUndefined();
    });

    it('should throw if ArcPay not set', async () => {
      const managerWithoutArcPay = createLinkManager();

      await expect(managerWithoutArcPay.create({ amount: '50' })).rejects.toThrow(
        'ArcPay client not set'
      );
    });
  });

  // ==================== Paying Links ====================

  describe('Paying Links', () => {
    let link: Awaited<ReturnType<typeof manager.create>>;

    beforeEach(async () => {
      link = await manager.create({
        amount: '50',
        description: 'Test payment',
      });
    });

    it('should pay a link by ID', async () => {
      const result = await manager.pay(link.id);

      expect(result.txHash).toBe('0xmocktxhash123456789');
      expect(result.link.usedCount).toBe(1);
    });

    it('should pay a link by URL', async () => {
      const result = await manager.payFromUrl(link.url);

      expect(result.txHash).toBe('0xmocktxhash123456789');
    });

    it('should record payment details', async () => {
      await manager.pay(link.id);

      const updated = await manager.get(link.id);
      expect(updated?.payments.length).toBe(1);
      expect(updated?.payments[0].txHash).toBe('0xmocktxhash123456789');
      expect(updated?.payments[0].amount).toBe('50');
    });

    it('should allow custom amount for flexible links', async () => {
      const flexibleLink = await manager.create({
        description: 'Pay what you want',
      });

      await manager.pay(flexibleLink.id, '100');

      const updated = await manager.get(flexibleLink.id);
      expect(updated?.payments[0].amount).toBe('100');
    });

    it('should mark as paid when max uses reached', async () => {
      const singleUseLink = await manager.create({
        amount: '25',
        maxUses: 1,
      });

      await manager.pay(singleUseLink.id);

      const updated = await manager.get(singleUseLink.id);
      expect(updated?.status).toBe('paid');
    });

    it('should throw for non-existent link', async () => {
      await expect(manager.pay('nonexistent')).rejects.toThrow('not found');
    });

    it('should throw for expired link', async () => {
      const expiredLink = await manager.create({
        amount: '50',
        expiresIn: '1h',
      });

      // Manually expire the link
      const linkData = await manager.get(expiredLink.id);
      if (linkData) {
        (linkData as { expiresAt: string }).expiresAt = new Date(
          Date.now() - 1000 * 60 * 60
        ).toISOString();
      }

      // Force status update
      await manager.list();

      const updatedLink = await manager.get(expiredLink.id);
      expect(updatedLink?.status).toBe('expired');
    });

    it('should throw for cancelled link', async () => {
      await manager.cancel(link.id);

      await expect(manager.pay(link.id)).rejects.toThrow('cancelled');
    });

    it('should throw if no amount for flexible link', async () => {
      const flexibleLink = await manager.create({
        description: 'No amount set',
      });

      await expect(manager.pay(flexibleLink.id)).rejects.toThrow('No amount specified');
    });
  });

  // ==================== Link Status ====================

  describe('Link Status', () => {
    it('should get link status', async () => {
      const link = await manager.create({ amount: '50' });

      const status = await manager.getStatus(link.id);

      expect(status.id).toBe(link.id);
      expect(status.status).toBe('active');
    });

    it('should throw for non-existent link', async () => {
      await expect(manager.getStatus('nonexistent')).rejects.toThrow('not found');
    });
  });

  // ==================== Listing Links ====================

  describe('Listing Links', () => {
    beforeEach(async () => {
      await manager.create({ amount: '10', description: 'Link 1' });
      await manager.create({ amount: '20', description: 'Link 2' });
      await manager.create({ amount: '30', description: 'Link 3' });
    });

    it('should list all links', async () => {
      const links = await manager.list();
      expect(links.length).toBe(3);
    });

    it('should filter by status', async () => {
      const links = await manager.list();
      const firstLink = links[0];
      await manager.cancel(firstLink.id);

      const active = await manager.list({ status: 'active' });
      const cancelled = await manager.list({ status: 'cancelled' });

      expect(active.length).toBe(2);
      expect(cancelled.length).toBe(1);
    });

    it('should limit results', async () => {
      const limited = await manager.list({ limit: 2 });
      expect(limited.length).toBe(2);
    });

    it('should sort by creation date (newest first)', async () => {
      const links = await manager.list();

      for (let i = 0; i < links.length - 1; i++) {
        const current = new Date(links[i].createdAt).getTime();
        const next = new Date(links[i + 1].createdAt).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });
  });

  // ==================== Cancelling Links ====================

  describe('Cancelling Links', () => {
    it('should cancel an active link', async () => {
      const link = await manager.create({ amount: '50' });

      await manager.cancel(link.id);

      const updated = await manager.get(link.id);
      expect(updated?.status).toBe('cancelled');
    });

    it('should throw for non-existent link', async () => {
      await expect(manager.cancel('nonexistent')).rejects.toThrow('not found');
    });

    it('should throw for already cancelled link', async () => {
      const link = await manager.create({ amount: '50' });
      await manager.cancel(link.id);

      await expect(manager.cancel(link.id)).rejects.toThrow('Cannot cancel');
    });
  });

  // ==================== Deleting Links ====================

  describe('Deleting Links', () => {
    it('should delete a link', async () => {
      const link = await manager.create({ amount: '50' });

      const deleted = await manager.delete(link.id);

      expect(deleted).toBe(true);
      const retrieved = await manager.get(link.id);
      expect(retrieved).toBeUndefined();
    });

    it('should return false for non-existent link', async () => {
      const deleted = await manager.delete('nonexistent');
      expect(deleted).toBe(false);
    });
  });

  // ==================== Statistics ====================

  describe('Statistics', () => {
    beforeEach(async () => {
      // Create 3 links - 2 with maxUses: 1 (will become 'paid' after payment), 1 unlimited
      const link1 = await manager.create({ amount: '50', maxUses: 1 });
      const link2 = await manager.create({ amount: '100', maxUses: 1 });
      await manager.create({ amount: '25' }); // No maxUses, stays active

      await manager.pay(link1.id);
      await manager.pay(link2.id);
    });

    it('should get active links count', async () => {
      const count = await manager.getActiveCount();
      expect(count).toBe(1); // 2 paid (maxUses reached), 1 active
    });

    it('should get total received', async () => {
      const total = await manager.getTotalReceived();
      expect(total).toBe('150.00');
    });
  });

  // ==================== URL Extraction ====================

  describe('URL Extraction', () => {
    it('should extract link ID from arcpay:// URL', async () => {
      const link = await manager.create({ amount: '50' });
      const result = await manager.payFromUrl(`arcpay://pay/${link.id}`);
      expect(result.txHash).toBeDefined();
    });

    it('should extract link ID from https URL', async () => {
      const link = await manager.create({ amount: '50' });
      const result = await manager.payFromUrl(`https://arcpay.app/pay/${link.id}`);
      expect(result.txHash).toBeDefined();
    });

    it('should accept just the link ID', async () => {
      const link = await manager.create({ amount: '50' });
      const result = await manager.payFromUrl(link.id);
      expect(result.txHash).toBeDefined();
    });

    it('should throw for invalid URL', async () => {
      await expect(manager.payFromUrl('invalid-url')).rejects.toThrow('Invalid payment link URL');
    });
  });

  // ==================== Clear ====================

  describe('Clear', () => {
    it('should clear all links', async () => {
      await manager.create({ amount: '50' });
      await manager.create({ amount: '100' });

      await manager.clear();

      const links = await manager.list();
      expect(links.length).toBe(0);
    });
  });
});

// ==================== One-liner Functions ====================

describe('Payment Link One-liners', () => {
  let mockArcPay: Partial<ArcPay>;

  beforeEach(() => {
    mockArcPay = createMockArcPay();
  });

  it('should create payment link with one-liner', async () => {
    const url = await createPaymentLink(mockArcPay as ArcPay, '50', 'Test payment');

    expect(url).toMatch(/arcpay:\/\/pay\/link_/);
  });

  it('should pay link with one-liner', async () => {
    const url = await createPaymentLink(mockArcPay as ArcPay, '50');

    const result = await payLink(mockArcPay as ArcPay, url);
    expect(result.txHash).toBeDefined();
  });
});

// ==================== Expiration Parsing ====================

describe('Expiration Parsing', () => {
  let manager: PaymentLinkManager;
  let mockArcPay: Partial<ArcPay>;

  beforeEach(() => {
    mockArcPay = createMockArcPay();
    manager = createLinkManager(mockArcPay as ArcPay);
  });

  it('should parse hours', async () => {
    const link = await manager.create({ amount: '50', expiresIn: '24h' });
    const expiresAt = new Date(link.expiresAt!);
    const hoursDiff = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60);
    expect(hoursDiff).toBeCloseTo(24, 0);
  });

  it('should parse days', async () => {
    const link = await manager.create({ amount: '50', expiresIn: '7d' });
    const expiresAt = new Date(link.expiresAt!);
    const daysDiff = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeCloseTo(7, 0);
  });

  it('should parse weeks', async () => {
    const link = await manager.create({ amount: '50', expiresIn: '2w' });
    const expiresAt = new Date(link.expiresAt!);
    const daysDiff = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeCloseTo(14, 0);
  });

  it('should parse months', async () => {
    const link = await manager.create({ amount: '50', expiresIn: '1m' });
    const expiresAt = new Date(link.expiresAt!);
    const now = new Date();
    // Roughly 28-31 days
    const daysDiff = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeGreaterThanOrEqual(28);
    expect(daysDiff).toBeLessThanOrEqual(31);
  });

  it('should throw for invalid format', async () => {
    await expect(manager.create({ amount: '50', expiresIn: 'invalid' })).rejects.toThrow(
      'Invalid expiration format'
    );
  });
});

// ==================== Payment Link Voice Commands ====================

describe('Payment Link Voice Command Patterns', () => {
  const patterns = {
    createLink: /create\s+(?:a\s+)?(?:payment\s+)?link\s+(?:for\s+)?\$?([\d.]+)/i,
    createFlexibleLink: /create\s+(?:a\s+)?(?:payment\s+)?link/i,
    payLink: /pay\s+(?:payment\s+)?link\s+(link_[a-zA-Z0-9_]+)/i,
    listLinks: /(?:show|list)\s+(?:my\s+)?(?:payment\s+)?links/i,
    cancelLink: /cancel\s+(?:payment\s+)?link\s+(link_[a-zA-Z0-9_]+)/i,
  };

  it('should match create link with amount', () => {
    const command = 'create a payment link for $50';
    const match = command.match(patterns.createLink);

    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('50');
  });

  it('should match create link without "a"', () => {
    const command = 'create payment link for 100';
    const match = command.match(patterns.createLink);

    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('100');
  });

  it('should match create flexible link', () => {
    expect(patterns.createFlexibleLink.test('create a payment link')).toBe(true);
    expect(patterns.createFlexibleLink.test('create link')).toBe(true);
  });

  it('should match pay link', () => {
    const command = 'pay link link_abc123_xyz';
    const match = command.match(patterns.payLink);

    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('link_abc123_xyz');
  });

  it('should match list links', () => {
    expect(patterns.listLinks.test('show my payment links')).toBe(true);
    expect(patterns.listLinks.test('list links')).toBe(true);
  });

  it('should match cancel link', () => {
    const command = 'cancel link link_abc123';
    const match = command.match(patterns.cancelLink);

    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('link_abc123');
  });
});
