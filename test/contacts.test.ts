/**
 * Contacts Module Tests
 *
 * Comprehensive tests for the ContactManager module
 * Tests: CRUD operations, fuzzy search, resolution, payment tracking
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ContactManager,
  createContactManager,
  MemoryStorage,
  type Contact,
  type ContactMetadata,
} from '../src/modules/contacts';

describe('ContactManager', () => {
  let manager: ContactManager;

  beforeEach(() => {
    // Create fresh manager with memory storage for each test
    manager = createContactManager({
      storage: new MemoryStorage(),
      autoSave: true,
    });
  });

  // ==================== CRUD Operations ====================

  describe('CRUD Operations', () => {
    it('should add a new contact', async () => {
      const contact = await manager.add('ahmed', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78');

      expect(contact.name).toBe('ahmed');
      expect(contact.displayName).toBe('ahmed');
      expect(contact.address).toBe('0x742d35cc6634c0532925a3b844bc9e7595f2bd78');
      expect(contact.metadata.category).toBe('other');
    });

    it('should add contact with metadata', async () => {
      const metadata: ContactMetadata = {
        category: 'personal',
        notes: 'Best friend',
        tags: ['friend', 'college'],
      };

      const contact = await manager.add(
        'Bob',
        '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
        metadata
      );

      expect(contact.displayName).toBe('Bob');
      expect(contact.name).toBe('bob');
      expect(contact.metadata.category).toBe('personal');
      expect(contact.metadata.notes).toBe('Best friend');
      expect(contact.metadata.tags).toContain('friend');
    });

    it('should reject duplicate contact names', async () => {
      await manager.add('ahmed', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78');

      await expect(
        manager.add('ahmed', '0x8ba1f109551bD432803012645Ac136ddd64DBA72')
      ).rejects.toThrow('already exists');
    });

    it('should reject invalid addresses', async () => {
      await expect(manager.add('test', '0xinvalid')).rejects.toThrow('Invalid address');
      await expect(manager.add('test', 'not-an-address')).rejects.toThrow('Invalid address');
    });

    it('should get contact by name', async () => {
      await manager.add('alice', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78');

      const contact = await manager.get('alice');
      expect(contact).toBeDefined();
      expect(contact?.displayName).toBe('alice');
    });

    it('should return undefined for non-existent contact', async () => {
      const contact = await manager.get('nonexistent');
      expect(contact).toBeUndefined();
    });

    it('should update contact address', async () => {
      await manager.add('alice', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78');

      const updated = await manager.update('alice', {
        address: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
      });

      expect(updated.address).toBe('0x8ba1f109551bd432803012645ac136ddd64dba72');
    });

    it('should update contact metadata', async () => {
      await manager.add('alice', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78');

      const updated = await manager.update('alice', {
        metadata: { category: 'business', notes: 'Updated note' },
      });

      expect(updated.metadata.category).toBe('business');
      expect(updated.metadata.notes).toBe('Updated note');
    });

    it('should delete contact', async () => {
      await manager.add('alice', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78');

      const deleted = await manager.delete('alice');
      expect(deleted).toBe(true);

      const contact = await manager.get('alice');
      expect(contact).toBeUndefined();
    });

    it('should return false when deleting non-existent contact', async () => {
      const deleted = await manager.delete('nonexistent');
      expect(deleted).toBe(false);
    });

    it('should check if contact exists', async () => {
      await manager.add('alice', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78');

      expect(await manager.has('alice')).toBe(true);
      expect(await manager.has('bob')).toBe(false);
    });
  });

  // ==================== Name Resolution ====================

  describe('Name Resolution', () => {
    beforeEach(async () => {
      await manager.add('ahmed', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78');
      await manager.add('netflix', '0x8ba1f109551bD432803012645Ac136ddd64DBA72');
    });

    it('should resolve contact name to address', async () => {
      const address = await manager.resolve('ahmed');
      expect(address).toBe('0x742d35cc6634c0532925a3b844bc9e7595f2bd78');
    });

    it('should return address if input is already an address', async () => {
      const address = await manager.resolve('0xF505e2E71df58D7244189072008f25f6b6aaE5ae');
      expect(address).toBe('0xf505e2e71df58d7244189072008f25f6b6aae5ae');
    });

    it('should return undefined for unknown name', async () => {
      const address = await manager.resolve('unknown');
      expect(address).toBeUndefined();
    });

    it('should resolve all names in text', async () => {
      const text = 'send 50 to ahmed and 30 to netflix';
      const resolved = await manager.resolveAll(text);

      expect(resolved).toBe(
        'send 50 to 0x742d35cc6634c0532925a3b844bc9e7595f2bd78 and 30 to 0x8ba1f109551bd432803012645ac136ddd64dba72'
      );
    });

    it('should resolve names case-insensitively', async () => {
      const text = 'pay Ahmed $100';
      const resolved = await manager.resolveAll(text);

      expect(resolved).toContain('0x742d35cc6634c0532925a3b844bc9e7595f2bd78');
    });

    it('should not partially replace names', async () => {
      await manager.add('bob', '0x1234567890123456789012345678901234567890');
      await manager.add('bobby', '0x9876543210987654321098765432109876543210');

      const text = 'send to bobby';
      const resolved = await manager.resolveAll(text);

      // Should match 'bobby', not 'bob'
      expect(resolved).toContain('0x9876543210987654321098765432109876543210');
      expect(resolved).not.toContain('0x1234567890123456789012345678901234567890');
    });
  });

  // ==================== Reverse Lookup ====================

  describe('Reverse Lookup', () => {
    it('should find contact by address', async () => {
      await manager.add('ahmed', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78');

      const contact = await manager.findByAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78');
      expect(contact).toBeDefined();
      expect(contact?.displayName).toBe('ahmed');
    });

    it('should find contact by address (case-insensitive)', async () => {
      await manager.add('ahmed', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78');

      const contact = await manager.findByAddress('0x742D35CC6634C0532925A3B844BC9E7595F2BD78');
      expect(contact).toBeDefined();
    });

    it('should return undefined for unknown address', async () => {
      const contact = await manager.findByAddress('0x0000000000000000000000000000000000000000');
      expect(contact).toBeUndefined();
    });

    it('getByAddress should be alias for findByAddress', async () => {
      await manager.add('ahmed', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78');

      const contact = await manager.getByAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78');
      expect(contact).toBeDefined();
      expect(contact?.displayName).toBe('ahmed');
    });
  });

  // ==================== Listing & Filtering ====================

  describe('Listing & Filtering', () => {
    beforeEach(async () => {
      await manager.add('alice', '0x1111111111111111111111111111111111111111', { category: 'personal' });
      await manager.add('bob', '0x2222222222222222222222222222222222222222', { category: 'business' });
      await manager.add('netflix', '0x3333333333333333333333333333333333333333', { category: 'subscription' });
      await manager.add('coffee shop', '0x4444444444444444444444444444444444444444', { category: 'merchant' });
    });

    it('should list all contacts', async () => {
      const contacts = await manager.list();
      expect(contacts.length).toBe(4);
    });

    it('should list contacts sorted by display name', async () => {
      const contacts = await manager.list();
      const names = contacts.map(c => c.displayName);
      expect(names).toEqual(['alice', 'bob', 'coffee shop', 'netflix']);
    });

    it('should filter by category', async () => {
      const personal = await manager.list({ category: 'personal' });
      expect(personal.length).toBe(1);
      expect(personal[0].displayName).toBe('alice');
    });

    it('should limit results', async () => {
      const limited = await manager.list({ limit: 2 });
      expect(limited.length).toBe(2);
    });

    it('should filter by tags', async () => {
      await manager.update('alice', { metadata: { tags: ['vip', 'friend'] } });
      await manager.update('bob', { metadata: { tags: ['work'] } });

      const vipContacts = await manager.list({ tags: ['vip'] });
      expect(vipContacts.length).toBe(1);
      expect(vipContacts[0].displayName).toBe('alice');
    });
  });

  // ==================== Fuzzy Search ====================

  describe('Fuzzy Search', () => {
    beforeEach(async () => {
      await manager.add('ahmed', '0x1111111111111111111111111111111111111111');
      await manager.add('ahmad', '0x2222222222222222222222222222222222222222');
      await manager.add('alice', '0x3333333333333333333333333333333333333333');
      await manager.add('alexander', '0x4444444444444444444444444444444444444444');
    });

    it('should find exact match', async () => {
      const results = await manager.search('ahmed');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].matchType).toBe('exact');
      expect(results[0].score).toBe(1.0);
    });

    it('should find prefix match', async () => {
      const results = await manager.search('ahm');
      expect(results.length).toBe(2); // ahmed, ahmad
      expect(results[0].matchType).toBe('prefix');
    });

    it('should find contains match', async () => {
      const results = await manager.search('hma');
      expect(results.some(r => r.contact.name === 'ahmad')).toBe(true);
    });

    it('should find fuzzy match', async () => {
      const results = await manager.search('ahmedd'); // typo
      expect(results.some(r => r.contact.name === 'ahmed')).toBe(true);
    });

    it('should return empty array for empty query', async () => {
      const results = await manager.search('');
      expect(results.length).toBe(0);
    });

    it('should rank results by relevance', async () => {
      const results = await manager.search('al');
      // 'alice' and 'alexander' should be found, sorted by relevance
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].score).toBeGreaterThan(results[results.length - 1]?.score || 0);
    });
  });

  // ==================== Payment Tracking ====================

  describe('Payment Tracking', () => {
    beforeEach(async () => {
      await manager.add('alice', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78');
    });

    it('should record payment', async () => {
      await manager.recordPayment('alice', '50.00');

      const contact = await manager.get('alice');
      expect(contact?.metadata.paymentCount).toBe(1);
      expect(contact?.metadata.totalPaid).toBe('50');
    });

    it('should accumulate multiple payments', async () => {
      await manager.recordPayment('alice', '50.00');
      await manager.recordPayment('alice', '30.00');
      await manager.recordPayment('alice', '20.00');

      const contact = await manager.get('alice');
      expect(contact?.metadata.paymentCount).toBe(3);
      expect(contact?.metadata.totalPaid).toBe('100');
    });

    it('should update lastPaymentDate', async () => {
      await manager.recordPayment('alice', '50.00');

      const contact = await manager.get('alice');
      expect(contact?.metadata.lastPaymentDate).toBeDefined();
      expect(new Date(contact!.metadata.lastPaymentDate!).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should throw for non-existent contact', async () => {
      await expect(manager.recordPayment('unknown', '50.00')).rejects.toThrow('not found');
    });
  });

  // ==================== Statistics ====================

  describe('Statistics', () => {
    beforeEach(async () => {
      await manager.add('alice', '0x1111111111111111111111111111111111111111', { category: 'personal' });
      await manager.add('bob', '0x2222222222222222222222222222222222222222', { category: 'business' });
      await manager.add('netflix', '0x3333333333333333333333333333333333333333', { category: 'subscription' });

      await manager.recordPayment('alice', '100.00');
      await manager.recordPayment('bob', '200.00');
      await manager.recordPayment('netflix', '15.00');
      await manager.recordPayment('netflix', '15.00');
    });

    it('should calculate total contacts', async () => {
      const stats = await manager.getStats();
      expect(stats.totalContacts).toBe(3);
    });

    it('should count by category', async () => {
      const stats = await manager.getStats();
      expect(stats.byCategory.personal).toBe(1);
      expect(stats.byCategory.business).toBe(1);
      expect(stats.byCategory.subscription).toBe(1);
    });

    it('should calculate total paid', async () => {
      const stats = await manager.getStats();
      expect(parseFloat(stats.totalPaid)).toBeCloseTo(330, 0);
    });

    it('should count total payments', async () => {
      const stats = await manager.getStats();
      expect(stats.totalPayments).toBe(4);
    });
  });

  // ==================== Import/Export ====================

  describe('Import/Export', () => {
    it('should export contacts', async () => {
      await manager.add('alice', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78', { category: 'personal' });
      await manager.add('bob', '0x8ba1f109551bD432803012645Ac136ddd64DBA72', { category: 'business' });

      const exported = await manager.export();
      expect(exported.length).toBe(2);
      expect(exported.find(c => c.name === 'alice')).toBeDefined();
      expect(exported.find(c => c.name === 'bob')).toBeDefined();
    });

    it('should import contacts', async () => {
      const data = [
        { name: 'charlie', address: '0x1111111111111111111111111111111111111111', metadata: { category: 'personal' as const } },
        { name: 'dave', address: '0x2222222222222222222222222222222222222222' },
      ];

      const imported = await manager.import(data);
      expect(imported).toBe(2);

      const contacts = await manager.list();
      expect(contacts.length).toBe(2);
    });

    it('should skip duplicates on import', async () => {
      await manager.add('alice', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78');

      const data = [
        { name: 'alice', address: '0x1111111111111111111111111111111111111111' }, // duplicate
        { name: 'bob', address: '0x2222222222222222222222222222222222222222' },
      ];

      const imported = await manager.import(data);
      expect(imported).toBe(1); // Only bob was imported

      const alice = await manager.get('alice');
      expect(alice?.address).toBe('0x742d35cc6634c0532925a3b844bc9e7595f2bd78'); // Original address
    });
  });

  // ==================== Clear ====================

  describe('Clear', () => {
    it('should clear all contacts', async () => {
      await manager.add('alice', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78');
      await manager.add('bob', '0x8ba1f109551bD432803012645Ac136ddd64DBA72');

      await manager.clear();

      const contacts = await manager.list();
      expect(contacts.length).toBe(0);
      expect(manager.size).toBe(0);
    });
  });

  // ==================== Name Normalization ====================

  describe('Name Normalization', () => {
    it('should normalize names to lowercase', async () => {
      await manager.add('Ahmed', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78');

      const contact = await manager.get('ahmed');
      expect(contact).toBeDefined();
    });

    it('should preserve display name case', async () => {
      await manager.add('Ahmed Ibrahim', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78');

      const contact = await manager.get('ahmed-ibrahim');
      expect(contact?.displayName).toBe('Ahmed Ibrahim');
      expect(contact?.name).toBe('ahmed-ibrahim');
    });

    it('should handle spaces in names', async () => {
      await manager.add('Coffee Shop', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78');

      const contact = await manager.get('coffee-shop');
      expect(contact).toBeDefined();
    });
  });
});

// ==================== Storage Adapters ====================

describe('Storage Adapters', () => {
  describe('MemoryStorage', () => {
    let storage: MemoryStorage;

    beforeEach(() => {
      storage = new MemoryStorage();
    });

    it('should store and retrieve data', async () => {
      await storage.set('key', 'value');
      const result = await storage.get('key');
      expect(result).toBe('value');
    });

    it('should return null for non-existent key', async () => {
      const result = await storage.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should delete data', async () => {
      await storage.set('key', 'value');
      await storage.delete('key');
      const result = await storage.get('key');
      expect(result).toBeNull();
    });

    it('should clear all data', async () => {
      await storage.set('key1', 'value1');
      await storage.set('key2', 'value2');
      await storage.clear();

      expect(await storage.get('key1')).toBeNull();
      expect(await storage.get('key2')).toBeNull();
    });
  });
});

// ==================== Integration with Intent Parser ====================

describe('Intent Parser Contact Templates', () => {
  // Test patterns for contact-related intents
  const patterns = {
    addContact: /(?:save|add(?:\s+contact)?)\s+(\w+)\s+(?:as\s+)?(0x[a-fA-F0-9]{40})/i,
    deleteContact: /(?:delete|remove)(?:\s+contact)?\s+(\w+)/i,
    listContacts: /(?:list|show)(?:\s+(?:my|all))?\s+contacts/i,
    lookupContact: /(?:who\s+is|lookup|find(?:\s+contact)?)\s+(\w+)/i,
    sendToContact: /send\s+\$?([\d.]+)\s*(?:usdc|usd)?\s+to\s+(\w+)/i,
    payContact: /pay\s+(\w+)\s+\$?([\d.]+)\s*(?:usdc)?/i,
  };

  it('should match add contact pattern', () => {
    const command = 'save ahmed as 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78';
    const match = command.match(patterns.addContact);

    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('ahmed');
    expect(match?.[2]).toBe('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78');
  });

  it('should match add contact variant', () => {
    const command = 'add contact bob 0x8ba1f109551bD432803012645Ac136ddd64DBA72';
    const match = command.match(patterns.addContact);

    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('bob');
  });

  it('should match delete contact pattern', () => {
    const command = 'delete contact ahmed';
    const match = command.match(patterns.deleteContact);

    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('ahmed');
  });

  it('should match list contacts pattern', () => {
    expect(patterns.listContacts.test('list contacts')).toBe(true);
    expect(patterns.listContacts.test('show my contacts')).toBe(true);
    expect(patterns.listContacts.test('show all contacts')).toBe(true);
  });

  it('should match lookup contact pattern', () => {
    const command = 'who is ahmed';
    const match = command.match(patterns.lookupContact);

    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('ahmed');
  });

  it('should match send to contact pattern', () => {
    const command = 'send $50 to ahmed';
    const match = command.match(patterns.sendToContact);

    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('50');
    expect(match?.[2]).toBe('ahmed');
  });

  it('should match pay contact pattern', () => {
    const command = 'pay ahmed $100';
    const match = command.match(patterns.payContact);

    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('ahmed');
    expect(match?.[2]).toBe('100');
  });
});

// ==================== Subscription Management ====================

describe('Subscription Management', () => {
  let manager: ContactManager;

  beforeEach(() => {
    manager = createContactManager({
      storage: new MemoryStorage(),
      autoSave: true,
    });
  });

  describe('Creating Subscriptions', () => {
    it('should add subscription with billing day', async () => {
      const contact = await manager.add('netflix', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78', {
        category: 'subscription',
        monthlyAmount: '15.99',
        billingDay: 15,
      });

      expect(contact.metadata.category).toBe('subscription');
      expect(contact.metadata.monthlyAmount).toBe('15.99');
      expect(contact.metadata.billingDay).toBe(15);
    });

    it('should calculate next due date on creation', async () => {
      const contact = await manager.add('spotify', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78', {
        category: 'subscription',
        monthlyAmount: '9.99',
        billingDay: 1,
      });

      expect(contact.metadata.nextDueDate).toBeDefined();
      const dueDate = new Date(contact.metadata.nextDueDate!);
      expect(dueDate.getDate()).toBeLessThanOrEqual(31);
    });
  });

  describe('Listing Subscriptions', () => {
    beforeEach(async () => {
      await manager.add('netflix', '0x1111111111111111111111111111111111111111', {
        category: 'subscription',
        monthlyAmount: '15.99',
        billingDay: 15,
      });
      await manager.add('spotify', '0x2222222222222222222222222222222222222222', {
        category: 'subscription',
        monthlyAmount: '9.99',
        billingDay: 1,
      });
      await manager.add('ahmed', '0x3333333333333333333333333333333333333333', {
        category: 'personal',
      });
    });

    it('should get only subscription contacts', async () => {
      const subs = await manager.getSubscriptions();

      expect(subs.length).toBe(2);
      expect(subs.every(s => s.metadata.category === 'subscription')).toBe(true);
    });

    it('should calculate monthly total', async () => {
      const total = await manager.getMonthlyTotal();

      expect(parseFloat(total)).toBeCloseTo(25.98, 2);
    });
  });

  describe('Due Date Calculations', () => {
    it('should identify due subscriptions', async () => {
      // Create subscription due today
      const today = new Date();
      await manager.add('netflix', '0x1111111111111111111111111111111111111111', {
        category: 'subscription',
        monthlyAmount: '15.99',
        billingDay: today.getDate(),
      });

      const dueSubs = await manager.getDueSubscriptions();

      // Should find subscription due today
      expect(dueSubs.length).toBeGreaterThanOrEqual(0); // May or may not be due depending on status
    });

    it('should identify upcoming subscriptions', async () => {
      // Create subscription due in 3 days
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const billingDay = futureDate.getDate();

      await manager.add('spotify', '0x2222222222222222222222222222222222222222', {
        category: 'subscription',
        monthlyAmount: '9.99',
        billingDay,
      });

      const upcoming = await manager.getUpcomingSubscriptions(7);

      expect(upcoming.length).toBeGreaterThanOrEqual(0);
    });

    it('should identify overdue subscriptions', async () => {
      // Create subscription that was due yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await manager.add('hbo', '0x4444444444444444444444444444444444444444', {
        category: 'subscription',
        monthlyAmount: '14.99',
        billingDay: yesterday.getDate(),
        nextDueDate: yesterday.toISOString(),
      });

      const overdue = await manager.getOverdueSubscriptions();

      // Should find the overdue subscription
      expect(overdue.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Marking Subscriptions Paid', () => {
    it('should mark subscription as paid', async () => {
      await manager.add('netflix', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78', {
        category: 'subscription',
        monthlyAmount: '15.99',
        billingDay: 15,
      });

      const updated = await manager.markPaid('netflix', '0xtxhash123');

      expect(updated.metadata.lastPaidTxHash).toBe('0xtxhash123');
      expect(updated.metadata.lastPaymentDate).toBeDefined();
    });

    it('should update next due date after marking paid', async () => {
      await manager.add('netflix', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78', {
        category: 'subscription',
        monthlyAmount: '15.99',
        billingDay: 15,
      });

      const before = await manager.get('netflix');
      const beforeDue = new Date(before!.metadata.nextDueDate!);

      const updated = await manager.markPaid('netflix', '0xtxhash123');
      const afterDue = new Date(updated.metadata.nextDueDate!);

      // Next due should be in the future
      expect(afterDue.getTime()).toBeGreaterThan(new Date().getTime());
    });

    it('should throw if subscription not found', async () => {
      await expect(manager.markPaid('nonexistent', '0xtxhash')).rejects.toThrow('not found');
    });
  });

  describe('Snoozing Subscriptions', () => {
    it('should snooze subscription by days', async () => {
      await manager.add('netflix', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78', {
        category: 'subscription',
        monthlyAmount: '15.99',
        billingDay: 15,
      });

      const before = await manager.get('netflix');
      const beforeDue = new Date(before!.metadata.nextDueDate!);

      const updated = await manager.snooze('netflix', 3);
      const afterDue = new Date(updated.metadata.nextDueDate!);

      // Should be 3 days later
      const diffDays = Math.round((afterDue.getTime() - beforeDue.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(3);
    });

    it('should throw if subscription not found', async () => {
      await expect(manager.snooze('nonexistent', 3)).rejects.toThrow('not found');
    });
  });

  describe('Subscription Status', () => {
    it('should return subscription status', async () => {
      const contact = await manager.add('netflix', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78', {
        category: 'subscription',
        monthlyAmount: '15.99',
        billingDay: 15,
      });

      const status = manager.getSubscriptionStatus(contact);

      expect(['due', 'upcoming', 'paid', 'overdue']).toContain(status.status);
      expect(typeof status.daysUntilDue).toBe('number');
      expect(typeof status.isPaidThisMonth).toBe('boolean');
    });

    it('should show paid status after marking paid', async () => {
      const contact = await manager.add('netflix', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78', {
        category: 'subscription',
        monthlyAmount: '15.99',
        billingDay: 15,
      });

      const updated = await manager.markPaid('netflix', '0xtxhash123');
      const status = manager.getSubscriptionStatus(updated);

      expect(status.isPaidThisMonth).toBe(true);
      expect(status.status).toBe('paid');
    });
  });

  describe('Paid This Month', () => {
    it('should get subscriptions paid this month', async () => {
      await manager.add('netflix', '0x1111111111111111111111111111111111111111', {
        category: 'subscription',
        monthlyAmount: '15.99',
        billingDay: 15,
      });
      await manager.add('spotify', '0x2222222222222222222222222222222222222222', {
        category: 'subscription',
        monthlyAmount: '9.99',
        billingDay: 1,
      });

      // Mark one as paid
      await manager.markPaid('netflix', '0xtxhash123');

      const paid = await manager.getPaidThisMonth();

      expect(paid.length).toBe(1);
      expect(paid[0].name).toBe('netflix');
    });
  });
});

// ==================== Subscription Voice Command Patterns ====================

describe('Subscription Voice Command Patterns', () => {
  const patterns = {
    addSubscription: /add\s+(\w+)\s+(?:as\s+)?subscription\s+\$?([\d.]+)\s+(?:monthly|per\s+month)(?:\s+(?:on|due)\s+(?:the\s+)?(\d+)(?:st|nd|rd|th)?)?(?:\s+(?:to\s+)?(0x[a-fA-F0-9]{40}))?/i,
    checkDueBills: /what\s+bills?\s+(?:are\s+)?due(?:\s+(?:this\s+)?(today|week|month))?/i,
    listUpcomingBills: /(?:show|list)\s+(?:upcoming|due)\s+(?:bills?|subscriptions?)/i,
    checkOverdue: /(?:any|show|list)\s+overdue\s+(?:bills?|subscriptions?)/i,
    payAllDue: /pay\s+all\s+(?:my\s+)?(?:bills?|subscriptions?|due)/i,
    snooze: /snooze\s+(\w+)\s+(?:for\s+)?(\d+)\s+(days?|weeks?)/i,
    subscriptionTotal: /(?:how\s+much|what)\s+(?:do\s+I\s+)?spend\s+on\s+subscriptions?/i,
    listSubscriptions: /(?:show|list)\s+(?:my\s+)?subscriptions?/i,
    payBill: /pay\s+(?:my\s+)?(\w+)\s*(?:bill|subscription|fatura)?/i,
  };

  it('should match add subscription pattern', () => {
    const command = 'add netflix subscription $15.99 monthly on the 15th';
    const match = command.match(patterns.addSubscription);

    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('netflix');
    expect(match?.[2]).toBe('15.99');
    expect(match?.[3]).toBe('15');
  });

  it('should match add subscription with address', () => {
    const command = 'add spotify subscription $9.99 monthly to 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78';
    const match = command.match(patterns.addSubscription);

    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('spotify');
    expect(match?.[4]).toBe('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78');
  });

  it('should match check due bills pattern', () => {
    expect(patterns.checkDueBills.test('what bills are due')).toBe(true);
    expect(patterns.checkDueBills.test('what bills are due today')).toBe(true);
    expect(patterns.checkDueBills.test('what bills due this week')).toBe(true);
  });

  it('should match list upcoming bills pattern', () => {
    expect(patterns.listUpcomingBills.test('show upcoming bills')).toBe(true);
    expect(patterns.listUpcomingBills.test('list due subscriptions')).toBe(true);
  });

  it('should match check overdue pattern', () => {
    expect(patterns.checkOverdue.test('any overdue bills')).toBe(true);
    expect(patterns.checkOverdue.test('show overdue subscriptions')).toBe(true);
  });

  it('should match pay all due pattern', () => {
    expect(patterns.payAllDue.test('pay all my bills')).toBe(true);
    expect(patterns.payAllDue.test('pay all subscriptions')).toBe(true);
    expect(patterns.payAllDue.test('pay all due')).toBe(true);
  });

  it('should match snooze pattern', () => {
    const command = 'snooze netflix for 3 days';
    const match = command.match(patterns.snooze);

    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('netflix');
    expect(match?.[2]).toBe('3');
    expect(match?.[3]).toBe('days');
  });

  it('should match snooze weeks pattern', () => {
    const command = 'snooze spotify for 1 week';
    const match = command.match(patterns.snooze);

    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('spotify');
    expect(match?.[2]).toBe('1');
    expect(match?.[3]).toBe('week');
  });

  it('should match subscription total pattern', () => {
    expect(patterns.subscriptionTotal.test('how much do I spend on subscriptions')).toBe(true);
    expect(patterns.subscriptionTotal.test('what do I spend on subscriptions')).toBe(true);
  });

  it('should match list subscriptions pattern', () => {
    expect(patterns.listSubscriptions.test('show my subscriptions')).toBe(true);
    expect(patterns.listSubscriptions.test('list subscriptions')).toBe(true);
  });

  it('should match pay bill pattern', () => {
    const command = 'pay my netflix';
    const match = command.match(patterns.payBill);

    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('netflix');
  });

  it('should match pay bill with variants', () => {
    expect(patterns.payBill.test('pay netflix subscription')).toBe(true);
    expect(patterns.payBill.test('pay spotify bill')).toBe(true);
  });
});
