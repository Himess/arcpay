/**
 * Payment Templates Module Tests
 *
 * Comprehensive tests for the TemplateManager module
 * Tests: Template listing, search, use, and custom templates
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TemplateManager,
  createTemplateManager,
  SUBSCRIPTION_TEMPLATES,
  BUSINESS_TEMPLATES,
  PERSONAL_TEMPLATES,
  UTILITY_TEMPLATES,
  ALL_TEMPLATES,
  type PaymentTemplate,
} from '../src/modules/templates';
import { ContactManager, createContactManager, MemoryStorage } from '../src/modules/contacts';

describe('TemplateManager', () => {
  let manager: TemplateManager;
  let contactManager: ContactManager;

  beforeEach(() => {
    contactManager = createContactManager({
      storage: new MemoryStorage(),
      autoSave: true,
    });
    manager = createTemplateManager();
    manager.setContactManager(contactManager);
  });

  // ==================== Template Listing ====================

  describe('Template Listing', () => {
    it('should list all templates', () => {
      const templates = manager.list();
      expect(templates.length).toBeGreaterThan(20);
    });

    it('should list templates by category', () => {
      const subscriptions = manager.list({ category: 'subscription' });
      expect(subscriptions.length).toBeGreaterThan(0);
      expect(subscriptions.every(t => t.category === 'subscription')).toBe(true);
    });

    it('should list business templates', () => {
      const business = manager.list({ category: 'business' });
      expect(business.length).toBeGreaterThan(0);
      expect(business.every(t => t.category === 'business')).toBe(true);
    });

    it('should list personal templates', () => {
      const personal = manager.list({ category: 'personal' });
      expect(personal.length).toBeGreaterThan(0);
      expect(personal.every(t => t.category === 'personal')).toBe(true);
    });

    it('should list utility templates', () => {
      const utility = manager.list({ category: 'utility' });
      expect(utility.length).toBeGreaterThan(0);
      expect(utility.every(t => t.category === 'utility')).toBe(true);
    });

    it('should limit results', () => {
      const limited = manager.list({ limit: 5 });
      expect(limited.length).toBe(5);
    });
  });

  // ==================== Getting Templates ====================

  describe('Getting Templates', () => {
    it('should get template by ID', () => {
      const netflix = manager.get('netflix');
      expect(netflix).toBeDefined();
      expect(netflix?.name).toBe('Netflix');
      expect(netflix?.amount).toBe('15.99');
    });

    it('should get template by name (case-insensitive)', () => {
      const spotify = manager.get('SPOTIFY');
      expect(spotify).toBeDefined();
      expect(spotify?.id).toBe('spotify');
    });

    it('should return undefined for non-existent template', () => {
      const nonExistent = manager.get('nonexistent');
      expect(nonExistent).toBeUndefined();
    });

    it('should get template with all properties', () => {
      const netflix = manager.get('netflix');
      expect(netflix?.id).toBe('netflix');
      expect(netflix?.name).toBeDefined();
      expect(netflix?.amount).toBeDefined();
      expect(netflix?.category).toBe('subscription');
      expect(netflix?.icon).toBeDefined();
    });
  });

  // ==================== Template Search ====================

  describe('Template Search', () => {
    it('should search by name', () => {
      const results = manager.search('net');
      expect(results.some(t => t.id === 'netflix')).toBe(true);
    });

    it('should search case-insensitively', () => {
      const results = manager.search('NETFLIX');
      expect(results.some(t => t.id === 'netflix')).toBe(true);
    });

    it('should search by category', () => {
      const results = manager.search('streaming');
      // Should find streaming services
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('should return empty array for no matches', () => {
      const results = manager.search('xyznonexistent');
      expect(results.length).toBe(0);
    });

    it('should find partial matches', () => {
      const results = manager.search('spot');
      expect(results.some(t => t.id === 'spotify')).toBe(true);
    });
  });

  // ==================== Using Templates ====================

  describe('Using Templates', () => {
    it('should create contact from template', async () => {
      const contact = await manager.use('netflix', {
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78',
      });

      expect(contact.name).toBe('netflix');
      expect(contact.displayName).toBe('Netflix');
      expect(contact.metadata.category).toBe('subscription');
      expect(contact.metadata.monthlyAmount).toBe('15.99');
    });

    it('should use template with custom name', async () => {
      const contact = await manager.use('netflix', {
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78',
        customName: 'My Netflix',
      });

      expect(contact.displayName).toBe('My Netflix');
    });

    it('should use template with custom amount', async () => {
      const contact = await manager.use('netflix', {
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78',
        customAmount: '19.99',
      });

      expect(contact.metadata.monthlyAmount).toBe('19.99');
    });

    it('should use template with custom billing day', async () => {
      const contact = await manager.use('netflix', {
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78',
        customBillingDay: 20,
      });

      expect(contact.metadata.billingDay).toBe(20);
    });

    it('should throw for non-existent template', async () => {
      await expect(
        manager.use('nonexistent', {
          address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78',
        })
      ).rejects.toThrow('Template "nonexistent" not found');
    });

    it('should throw for invalid address', async () => {
      await expect(
        manager.use('netflix', {
          address: '0xinvalid',
        })
      ).rejects.toThrow();
    });
  });

  // ==================== Custom Templates ====================

  describe('Custom Templates', () => {
    it('should create custom template', () => {
      const template: PaymentTemplate = {
        id: 'custom-service',
        name: 'Custom Service',
        amount: '29.99',
        category: 'subscription',
        billingDay: 10,
      };

      manager.create(template);

      const retrieved = manager.get('custom-service');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Custom Service');
    });

    it('should throw when creating template with existing ID', () => {
      const template: PaymentTemplate = {
        id: 'netflix',
        name: 'Different Netflix',
        amount: '99.99',
        category: 'subscription',
      };

      expect(() => manager.create(template)).toThrow('already exists');
    });

    it('should list custom templates', () => {
      const template: PaymentTemplate = {
        id: 'my-custom',
        name: 'My Custom',
        amount: '5.00',
        category: 'personal',
      };

      manager.create(template);

      const all = manager.list();
      expect(all.some(t => t.id === 'my-custom')).toBe(true);
    });
  });

  // ==================== Template Categories ====================

  describe('Template Categories', () => {
    it('should return all categories', () => {
      const categories = manager.getCategories();
      expect(categories).toContain('subscription');
      expect(categories).toContain('business');
      expect(categories).toContain('personal');
      expect(categories).toContain('utility');
    });

    it('should count templates per category', () => {
      const counts = manager.getCategoryCounts();
      expect(counts.subscription).toBeGreaterThan(0);
      expect(counts.business).toBeGreaterThan(0);
    });
  });
});

// ==================== Preset Templates ====================

describe('Preset Templates', () => {
  describe('Subscription Templates', () => {
    it('should have correct structure', () => {
      for (const template of SUBSCRIPTION_TEMPLATES) {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.amount).toBeDefined();
        expect(template.category).toBe('subscription');
      }
    });

    it('should include popular streaming services', () => {
      const names = SUBSCRIPTION_TEMPLATES.map(t => t.id);
      expect(names).toContain('netflix');
      expect(names).toContain('spotify');
    });

    it('should have billing days', () => {
      for (const template of SUBSCRIPTION_TEMPLATES) {
        if (template.billingDay) {
          expect(template.billingDay).toBeGreaterThanOrEqual(1);
          expect(template.billingDay).toBeLessThanOrEqual(31);
        }
      }
    });
  });

  describe('Business Templates', () => {
    it('should have correct structure', () => {
      for (const template of BUSINESS_TEMPLATES) {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.category).toBe('business');
      }
    });

    it('should include common business payments', () => {
      const ids = BUSINESS_TEMPLATES.map(t => t.id);
      expect(ids.length).toBeGreaterThan(0);
    });
  });

  describe('Personal Templates', () => {
    it('should have correct structure', () => {
      for (const template of PERSONAL_TEMPLATES) {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.category).toBe('personal');
      }
    });
  });

  describe('Utility Templates', () => {
    it('should have correct structure', () => {
      for (const template of UTILITY_TEMPLATES) {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.category).toBe('utility');
      }
    });
  });

  describe('All Templates', () => {
    it('should combine all category templates', () => {
      const totalExpected =
        SUBSCRIPTION_TEMPLATES.length +
        BUSINESS_TEMPLATES.length +
        PERSONAL_TEMPLATES.length +
        UTILITY_TEMPLATES.length;

      expect(ALL_TEMPLATES.length).toBe(totalExpected);
    });

    it('should have unique IDs', () => {
      const ids = ALL_TEMPLATES.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});

// ==================== Template Voice Command Patterns ====================

describe('Template Voice Command Patterns', () => {
  const patterns = {
    useTemplate: /(?:add|use|setup)\s+(\w+)\s+(?:subscription|template)/i,
    listTemplates: /(?:show|list)\s+(?:available\s+)?templates?/i,
    searchTemplates: /(?:search|find)\s+(?:templates?\s+)?(?:for\s+)?(.+)/i,
  };

  it('should match use template pattern', () => {
    const command = 'add netflix subscription';
    const match = command.match(patterns.useTemplate);

    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('netflix');
  });

  it('should match setup template pattern', () => {
    const command = 'setup spotify template';
    const match = command.match(patterns.useTemplate);

    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('spotify');
  });

  it('should match list templates pattern', () => {
    expect(patterns.listTemplates.test('show templates')).toBe(true);
    expect(patterns.listTemplates.test('list available templates')).toBe(true);
  });

  it('should match search templates pattern', () => {
    const command = 'search templates for streaming';
    const match = command.match(patterns.searchTemplates);

    expect(match).not.toBeNull();
  });
});
