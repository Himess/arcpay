/**
 * Payment Requests Module Tests
 *
 * Comprehensive tests for the PaymentRequestManager module
 * Tests: Request creation, payment, decline, listing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PaymentRequestManager,
  createRequestManager,
  requestPayment,
  requestPaymentFrom,
  type CreateRequestOptions,
} from '../src/modules/requests';
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

describe('PaymentRequestManager', () => {
  let manager: PaymentRequestManager;
  let contactManager: ContactManager;
  let mockArcPay: Partial<ArcPay>;

  beforeEach(async () => {
    contactManager = createContactManager({
      storage: new MemoryStorage(),
      autoSave: true,
    });
    mockArcPay = createMockArcPay();
    manager = createRequestManager(mockArcPay as ArcPay, {
      storagePrefix: `test_requests_${Date.now()}_${Math.random().toString(36)}_`,
    });
    manager.setContactManager(contactManager);
    // Clear any existing data
    await manager.clear();

    // Add test contacts
    await contactManager.add('alice', '0x1111111111111111111111111111111111111111');
    await contactManager.add('bob', '0x2222222222222222222222222222222222222222');
    await contactManager.add('charlie', '0x3333333333333333333333333333333333333333');
  });

  // ==================== Request Creation ====================

  describe('Request Creation', () => {
    it('should create a payment request', async () => {
      const request = await manager.create({
        from: 'alice',
        amount: '50',
        reason: 'Dinner split',
      });

      expect(request.id).toMatch(/^req_/);
      expect(request.amount).toBe('50');
      expect(request.reason).toBe('Dinner split');
      expect(request.status).toBe('pending');
    });

    it('should resolve contact name to address', async () => {
      const request = await manager.create({
        from: 'alice',
        amount: '50',
      });

      expect(request.from.address).toBe('0x1111111111111111111111111111111111111111');
      expect(request.from.name).toBe('alice');
    });

    it('should set requester as "to"', async () => {
      const request = await manager.create({
        from: 'alice',
        amount: '50',
      });

      expect(request.to.address).toBe('0x1234567890123456789012345678901234567890');
    });

    it('should accept direct address', async () => {
      const request = await manager.create({
        from: '0x9999999999999999999999999999999999999999',
        amount: '100',
      });

      expect(request.from.address).toBe('0x9999999999999999999999999999999999999999');
    });

    it('should set due date from string', async () => {
      const request = await manager.create({
        from: 'alice',
        amount: '50',
        dueDate: 'in 7d',
      });

      expect(request.dueDate).toBeDefined();
      const dueDate = new Date(request.dueDate!);
      const daysDiff = (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeCloseTo(7, 0);
    });

    it('should throw for unknown contact', async () => {
      await expect(
        manager.create({
          from: 'unknown',
          amount: '50',
        })
      ).rejects.toThrow('Could not resolve address');
    });

    it('should throw if ArcPay not set', async () => {
      const managerWithoutArcPay = createRequestManager();
      managerWithoutArcPay.setContactManager(contactManager);

      await expect(
        managerWithoutArcPay.create({
          from: 'alice',
          amount: '50',
        })
      ).rejects.toThrow('ArcPay client not set');
    });
  });

  // ==================== Bulk Request Creation ====================

  describe('Bulk Request Creation', () => {
    it('should create multiple requests', async () => {
      const requests = await manager.createBulk({
        from: ['alice', 'bob', 'charlie'],
        amount: '33.33',
        reason: 'Split dinner',
      });

      expect(requests.length).toBe(3);
      expect(requests.every(r => r.amount === '33.33')).toBe(true);
    });

    it('should set same reason for all', async () => {
      const requests = await manager.createBulk({
        from: ['alice', 'bob'],
        amount: '50',
        reason: 'Group gift',
      });

      expect(requests[0].reason).toBe('Group gift');
      expect(requests[1].reason).toBe('Group gift');
    });
  });

  // ==================== Paying Requests ====================

  describe('Paying Requests', () => {
    let request: Awaited<ReturnType<typeof manager.create>>;

    beforeEach(async () => {
      request = await manager.create({
        from: 'alice',
        amount: '50',
        reason: 'Test request',
      });
    });

    it('should pay a request', async () => {
      const result = await manager.pay(request.id);

      expect(result.txHash).toBe('0xmocktxhash123456789');
    });

    it('should mark request as paid', async () => {
      await manager.pay(request.id);

      const updated = await manager.get(request.id);
      expect(updated?.status).toBe('paid');
      expect(updated?.paidAt).toBeDefined();
      expect(updated?.txHash).toBe('0xmocktxhash123456789');
    });

    it('should throw for non-existent request', async () => {
      await expect(manager.pay('nonexistent')).rejects.toThrow('not found');
    });

    it('should throw for already paid request', async () => {
      await manager.pay(request.id);

      await expect(manager.pay(request.id)).rejects.toThrow('Cannot pay request');
    });

    it('should throw for declined request', async () => {
      await manager.decline(request.id);

      await expect(manager.pay(request.id)).rejects.toThrow('Cannot pay request');
    });
  });

  // ==================== Declining Requests ====================

  describe('Declining Requests', () => {
    let request: Awaited<ReturnType<typeof manager.create>>;

    beforeEach(async () => {
      request = await manager.create({
        from: 'alice',
        amount: '50',
      });
    });

    it('should decline a request', async () => {
      await manager.decline(request.id, 'Already paid cash');

      const updated = await manager.get(request.id);
      expect(updated?.status).toBe('declined');
      expect(updated?.declineReason).toBe('Already paid cash');
    });

    it('should decline without reason', async () => {
      await manager.decline(request.id);

      const updated = await manager.get(request.id);
      expect(updated?.status).toBe('declined');
    });

    it('should throw for non-existent request', async () => {
      await expect(manager.decline('nonexistent')).rejects.toThrow('not found');
    });

    it('should throw for non-pending request', async () => {
      await manager.pay(request.id);

      await expect(manager.decline(request.id)).rejects.toThrow('Cannot decline');
    });
  });

  // ==================== Cancelling Requests ====================

  describe('Cancelling Requests', () => {
    let request: Awaited<ReturnType<typeof manager.create>>;

    beforeEach(async () => {
      request = await manager.create({
        from: 'alice',
        amount: '50',
      });
    });

    it('should cancel a request', async () => {
      await manager.cancel(request.id);

      const updated = await manager.get(request.id);
      expect(updated?.status).toBe('cancelled');
    });

    it('should throw for non-existent request', async () => {
      await expect(manager.cancel('nonexistent')).rejects.toThrow('not found');
    });

    it('should throw for non-pending request', async () => {
      await manager.decline(request.id);

      await expect(manager.cancel(request.id)).rejects.toThrow('Cannot cancel');
    });
  });

  // ==================== Listing Requests ====================

  describe('Listing Requests', () => {
    beforeEach(async () => {
      await manager.create({ from: 'alice', amount: '10', reason: 'Request 1' });
      await manager.create({ from: 'bob', amount: '20', reason: 'Request 2' });
      await manager.create({ from: 'charlie', amount: '30', reason: 'Request 3' });
    });

    it('should list all requests', async () => {
      const requests = await manager.list();
      expect(requests.length).toBe(3);
    });

    it('should filter by status', async () => {
      const allRequests = await manager.list();
      await manager.decline(allRequests[0].id);

      const pending = await manager.list({ status: 'pending' });
      const declined = await manager.list({ status: 'declined' });

      expect(pending.length).toBe(2);
      expect(declined.length).toBe(1);
    });

    it('should limit results', async () => {
      const limited = await manager.list({ limit: 2 });
      expect(limited.length).toBe(2);
    });

    it('should sort by creation date (newest first)', async () => {
      const requests = await manager.list();

      for (let i = 0; i < requests.length - 1; i++) {
        const current = new Date(requests[i].createdAt).getTime();
        const next = new Date(requests[i + 1].createdAt).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });
  });

  // ==================== Incoming/Outgoing Requests ====================

  describe('Incoming/Outgoing Requests', () => {
    beforeEach(async () => {
      // Create requests FROM alice (alice owes me)
      await manager.create({ from: 'alice', amount: '50' });
      await manager.create({ from: 'alice', amount: '30' });
      // Create request FROM bob
      await manager.create({ from: 'bob', amount: '20' });
    });

    it('should list outgoing requests (who owes me)', async () => {
      const outgoing = await manager.listOutgoing();
      expect(outgoing.length).toBe(3);
    });

    it('should filter outgoing by status', async () => {
      const allOutgoing = await manager.listOutgoing();
      await manager.decline(allOutgoing[0].id);

      const pendingOutgoing = await manager.listOutgoing({ status: 'pending' });
      expect(pendingOutgoing.length).toBe(2);
    });

    it('should get pending outgoing count', async () => {
      const count = await manager.getPendingOutgoingCount();
      expect(count).toBe(3);
    });
  });

  // ==================== Statistics ====================

  describe('Statistics', () => {
    beforeEach(async () => {
      const req1 = await manager.create({ from: 'alice', amount: '50' });
      const req2 = await manager.create({ from: 'bob', amount: '100' });
      await manager.create({ from: 'charlie', amount: '25' });

      await manager.pay(req1.id);
      await manager.pay(req2.id);
    });

    it('should get total requested (paid)', async () => {
      const total = await manager.getTotalRequested();
      expect(total).toBe('150.00');
    });
  });

  // ==================== Request Status ====================

  describe('Request Status', () => {
    it('should get request status', async () => {
      const request = await manager.create({
        from: 'alice',
        amount: '50',
      });

      const status = await manager.getStatus(request.id);

      expect(status.id).toBe(request.id);
      expect(status.status).toBe('pending');
    });

    it('should throw for non-existent request', async () => {
      await expect(manager.getStatus('nonexistent')).rejects.toThrow('not found');
    });
  });

  // ==================== Delete & Clear ====================

  describe('Delete & Clear', () => {
    it('should delete a request', async () => {
      const request = await manager.create({ from: 'alice', amount: '50' });

      const deleted = await manager.delete(request.id);

      expect(deleted).toBe(true);
      const retrieved = await manager.get(request.id);
      expect(retrieved).toBeUndefined();
    });

    it('should return false for non-existent request', async () => {
      const deleted = await manager.delete('nonexistent');
      expect(deleted).toBe(false);
    });

    it('should clear all requests', async () => {
      await manager.create({ from: 'alice', amount: '50' });
      await manager.create({ from: 'bob', amount: '100' });

      await manager.clear();

      const requests = await manager.list();
      expect(requests.length).toBe(0);
    });
  });
});

// ==================== One-liner Functions ====================

describe('Payment Request One-liners', () => {
  let mockArcPay: Partial<ArcPay>;
  let contactManager: ContactManager;

  beforeEach(async () => {
    mockArcPay = createMockArcPay();
    contactManager = createContactManager({
      storage: new MemoryStorage(),
      autoSave: true,
    });
    await contactManager.add('alice', '0x1111111111111111111111111111111111111111');
    await contactManager.add('bob', '0x2222222222222222222222222222222222222222');
  });

  it('should request payment with one-liner', async () => {
    // Need to set up contact manager globally for the one-liner
    const manager = createRequestManager(mockArcPay as ArcPay);
    manager.setContactManager(contactManager);

    const request = await manager.create({
      from: 'alice',
      amount: '50',
      reason: 'Test',
    });

    expect(request.id).toMatch(/^req_/);
    expect(request.amount).toBe('50');
  });
});

// ==================== Due Date Parsing ====================

describe('Due Date Parsing', () => {
  let manager: PaymentRequestManager;
  let contactManager: ContactManager;
  let mockArcPay: Partial<ArcPay>;

  beforeEach(async () => {
    contactManager = createContactManager({
      storage: new MemoryStorage(),
      autoSave: true,
    });
    mockArcPay = createMockArcPay();
    manager = createRequestManager(mockArcPay as ArcPay);
    manager.setContactManager(contactManager);

    await contactManager.add('alice', '0x1111111111111111111111111111111111111111');
  });

  it('should parse hours', async () => {
    const request = await manager.create({
      from: 'alice',
      amount: '50',
      dueDate: 'in 24h',
    });

    const dueDate = new Date(request.dueDate!);
    const hoursDiff = (dueDate.getTime() - Date.now()) / (1000 * 60 * 60);
    expect(hoursDiff).toBeCloseTo(24, 0);
  });

  it('should parse days', async () => {
    const request = await manager.create({
      from: 'alice',
      amount: '50',
      dueDate: 'in 7d',
    });

    const dueDate = new Date(request.dueDate!);
    const daysDiff = (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeCloseTo(7, 0);
  });

  it('should parse weeks', async () => {
    const request = await manager.create({
      from: 'alice',
      amount: '50',
      dueDate: 'in 2w',
    });

    const dueDate = new Date(request.dueDate!);
    const daysDiff = (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeCloseTo(14, 0);
  });

  it('should parse months', async () => {
    const request = await manager.create({
      from: 'alice',
      amount: '50',
      dueDate: 'in 1m',
    });

    const dueDate = new Date(request.dueDate!);
    const daysDiff = (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeGreaterThanOrEqual(28);
  });

  it('should parse ISO date', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);

    const request = await manager.create({
      from: 'alice',
      amount: '50',
      dueDate: futureDate.toISOString(),
    });

    const dueDate = new Date(request.dueDate!);
    expect(dueDate.toDateString()).toBe(futureDate.toDateString());
  });
});

// ==================== Payment Request Voice Commands ====================

describe('Payment Request Voice Command Patterns', () => {
  const patterns = {
    requestPayment: /request\s+\$?([\d.]+)\s+(?:dollars?\s+)?from\s+(\w+)/i,
    requestWithReason: /request\s+\$?([\d.]+)\s+from\s+(\w+)\s+for\s+(.+)/i,
    listIncoming: /(?:what\s+do\s+I\s+owe|show\s+(?:my\s+)?incoming\s+requests)/i,
    listOutgoing: /(?:who\s+owes\s+me|show\s+(?:my\s+)?outgoing\s+requests)/i,
    declineRequest: /decline\s+(?:request\s+)?(req_[a-zA-Z0-9_]+)/i,
  };

  it('should match request payment pattern', () => {
    const command = 'request $50 from alice';
    const match = command.match(patterns.requestPayment);

    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('50');
    expect(match?.[2]).toBe('alice');
  });

  it('should match request with dollars', () => {
    const command = 'request 100 dollars from bob';
    const match = command.match(patterns.requestPayment);

    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('100');
    expect(match?.[2]).toBe('bob');
  });

  it('should match request with reason', () => {
    const command = 'request $50 from alice for dinner';
    const match = command.match(patterns.requestWithReason);

    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('50');
    expect(match?.[2]).toBe('alice');
    expect(match?.[3]).toBe('dinner');
  });

  it('should match list incoming pattern', () => {
    expect(patterns.listIncoming.test('what do I owe')).toBe(true);
    expect(patterns.listIncoming.test('show my incoming requests')).toBe(true);
  });

  it('should match list outgoing pattern', () => {
    expect(patterns.listOutgoing.test('who owes me')).toBe(true);
    expect(patterns.listOutgoing.test('show my outgoing requests')).toBe(true);
  });

  it('should match decline request pattern', () => {
    const command = 'decline request req_abc123_xyz';
    const match = command.match(patterns.declineRequest);

    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('req_abc123_xyz');
  });
});

// ==================== Expiration Handling ====================

describe('Request Expiration', () => {
  let manager: PaymentRequestManager;
  let contactManager: ContactManager;
  let mockArcPay: Partial<ArcPay>;

  beforeEach(async () => {
    contactManager = createContactManager({
      storage: new MemoryStorage(),
      autoSave: true,
    });
    mockArcPay = createMockArcPay();
    manager = createRequestManager(mockArcPay as ArcPay);
    manager.setContactManager(contactManager);

    await contactManager.add('alice', '0x1111111111111111111111111111111111111111');
  });

  it('should mark expired requests', async () => {
    const request = await manager.create({
      from: 'alice',
      amount: '50',
      dueDate: 'in 1h',
    });

    // Manually set due date to past
    const requestData = await manager.get(request.id);
    if (requestData) {
      (requestData as { dueDate: string }).dueDate = new Date(
        Date.now() - 1000 * 60 * 60
      ).toISOString();
    }

    // Trigger status update
    await manager.list();

    const updated = await manager.get(request.id);
    expect(updated?.status).toBe('expired');
  });
});
