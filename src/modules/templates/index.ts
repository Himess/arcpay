/**
 * ArcPay Payment Templates Module
 *
 * Pre-configured payment templates for subscriptions, business payments, etc.
 *
 * @example
 * ```typescript
 * import { createTemplateManager } from 'arcpay';
 *
 * const templates = createTemplateManager();
 *
 * // List all templates
 * const all = templates.list();
 *
 * // Get subscription templates
 * const subs = templates.list({ category: 'subscription' });
 *
 * // Use a template to create a contact
 * const contact = await templates.use('netflix', {
 *   address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78',
 *   amount: '15.99'
 * });
 * ```
 */

import type {
  PaymentTemplate,
  UseTemplateOptions,
  TemplateManagerConfig,
  TemplateCategory,
} from './types';
import {
  ALL_TEMPLATES,
  SUBSCRIPTION_TEMPLATES,
  BUSINESS_TEMPLATES,
  PERSONAL_TEMPLATES,
  UTILITY_TEMPLATES,
  getTemplateById,
  searchTemplates,
} from './presets';
import {
  ContactManager,
  createContactManager,
  type Contact,
  type ContactManagerConfig,
} from '../contacts';

// Re-export types
export type {
  PaymentTemplate,
  UseTemplateOptions,
  TemplateManagerConfig,
  TemplateCategory,
};

// Re-export preset constants
export {
  ALL_TEMPLATES,
  SUBSCRIPTION_TEMPLATES,
  BUSINESS_TEMPLATES,
  PERSONAL_TEMPLATES,
  UTILITY_TEMPLATES,
  getTemplateById,
  searchTemplates,
};

/**
 * List filter options
 */
export interface TemplateListOptions {
  /** Filter by category */
  category?: TemplateCategory;
  /** Filter by stream capability */
  isStream?: boolean;
  /** Search query */
  query?: string;
  /** Limit results */
  limit?: number;
}

/**
 * Template Manager
 *
 * Manages payment templates and integrates with contacts for easy setup.
 */
export class TemplateManager {
  private customTemplates: Map<string, PaymentTemplate> = new Map();
  private contactManager: ContactManager;

  constructor(config: TemplateManagerConfig = {}, contactConfig?: ContactManagerConfig) {
    this.contactManager = createContactManager(contactConfig);

    // Add custom templates if provided
    if (config.customTemplates) {
      for (const template of config.customTemplates) {
        this.customTemplates.set(template.id.toLowerCase(), template);
      }
    }
  }

  /**
   * Set the contact manager to use
   */
  setContactManager(manager: ContactManager): void {
    this.contactManager = manager;
  }

  /**
   * List all templates with optional filtering
   *
   * @example
   * ```typescript
   * // Get all templates
   * const all = templates.list();
   *
   * // Get subscription templates only
   * const subs = templates.list({ category: 'subscription' });
   *
   * // Search for templates
   * const results = templates.list({ query: 'music' });
   * ```
   */
  list(options?: TemplateListOptions): PaymentTemplate[] {
    // Combine built-in and custom templates
    let results = [...ALL_TEMPLATES, ...this.customTemplates.values()];

    // Filter by category
    if (options?.category) {
      results = results.filter((t) => t.category === options.category);
    }

    // Filter by stream capability
    if (options?.isStream !== undefined) {
      results = results.filter((t) => !!t.isStream === options.isStream);
    }

    // Search by query
    if (options?.query) {
      const query = options.query.toLowerCase();
      results = results.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.id.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query)
      );
    }

    // Limit results
    if (options?.limit && options.limit > 0) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Get a template by ID
   *
   * @example
   * ```typescript
   * const netflix = templates.get('netflix');
   * console.log(netflix?.amount); // '15.99'
   * ```
   */
  get(id: string): PaymentTemplate | undefined {
    const normalizedId = id.toLowerCase();

    // Check custom templates first
    const custom = this.customTemplates.get(normalizedId);
    if (custom) return custom;

    // Check built-in templates
    return getTemplateById(normalizedId);
  }

  /**
   * Search templates by name or description
   *
   * @example
   * ```typescript
   * const results = templates.search('streaming');
   * ```
   */
  search(query: string): PaymentTemplate[] {
    if (!query) return [];

    const builtIn = searchTemplates(query);
    const customResults = Array.from(this.customTemplates.values()).filter(
      (t) =>
        t.name.toLowerCase().includes(query.toLowerCase()) ||
        t.id.toLowerCase().includes(query.toLowerCase()) ||
        t.description?.toLowerCase().includes(query.toLowerCase())
    );

    return [...builtIn, ...customResults];
  }

  /**
   * Use a template to create a contact
   *
   * @example
   * ```typescript
   * // Create Netflix contact with default settings
   * const contact = await templates.use('netflix', {
   *   address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78'
   * });
   *
   * // Override the amount
   * const contact = await templates.use('netflix', {
   *   address: '0x...',
   *   amount: '22.99'  // Family plan
   * });
   * ```
   */
  async use(id: string, options: UseTemplateOptions): Promise<Contact> {
    const template = this.get(id);
    if (!template) {
      throw new Error(`Template "${id}" not found`);
    }

    // Use provided amount or template default
    const amount = options.customAmount ?? options.amount ?? template.amount;
    const billingDay = options.customBillingDay ?? options.billingDay ?? template.billingDay;

    // Create contact name (use custom name, template name, or employee name for streams)
    const contactName = options.customName
      ? options.customName
      : template.isStream && options.employee
        ? options.employee
        : template.name;

    // Check if contact already exists
    const existingContact = await this.contactManager.get(contactName);
    if (existingContact) {
      // Update existing contact
      return this.contactManager.update(contactName, {
        address: options.address,
        metadata: {
          category: template.isStream ? 'business' : 'subscription',
          monthlyAmount: amount,
          billingDay,
          templateId: template.id,
          icon: template.icon,
        },
      });
    }

    // Create new contact from template
    const contact = await this.contactManager.add(contactName, options.address, {
      category: template.isStream ? 'business' : 'subscription',
      monthlyAmount: amount,
      billingDay,
      templateId: template.id,
      icon: template.icon,
      notes: template.description,
    });

    return contact;
  }

  /**
   * Create a custom template
   *
   * @example
   * ```typescript
   * templates.create({
   *   id: 'gym',
   *   name: 'Gym Membership',
   *   amount: '49.99',
   *   billingDay: 1,
   *   category: 'personal',
   *   icon: '🏋️'
   * });
   * ```
   */
  create(template: PaymentTemplate): void {
    const normalizedId = template.id.toLowerCase();

    // Check if template already exists
    if (this.get(normalizedId)) {
      throw new Error(`Template "${template.id}" already exists`);
    }

    this.customTemplates.set(normalizedId, {
      ...template,
      id: normalizedId,
    });
  }

  /**
   * Delete a custom template
   */
  delete(id: string): boolean {
    return this.customTemplates.delete(id.toLowerCase());
  }

  /**
   * Get templates by category
   */
  getByCategory(category: TemplateCategory): PaymentTemplate[] {
    return this.list({ category });
  }

  /**
   * Get subscription templates
   */
  getSubscriptions(): PaymentTemplate[] {
    return this.list({ category: 'subscription' });
  }

  /**
   * Get business templates
   */
  getBusinessTemplates(): PaymentTemplate[] {
    return this.list({ category: 'business' });
  }

  /**
   * Get personal templates
   */
  getPersonalTemplates(): PaymentTemplate[] {
    return this.list({ category: 'personal' });
  }

  /**
   * Get utility templates
   */
  getUtilityTemplates(): PaymentTemplate[] {
    return this.list({ category: 'utility' });
  }

  /**
   * Get stream templates
   */
  getStreamTemplates(): PaymentTemplate[] {
    return this.list({ isStream: true });
  }

  /**
   * Get template count
   */
  get count(): number {
    return ALL_TEMPLATES.length + this.customTemplates.size;
  }

  /**
   * Get custom template count
   */
  get customCount(): number {
    return this.customTemplates.size;
  }

  /**
   * Get all categories with counts
   */
  getCategoryCounts(): Record<TemplateCategory, number> {
    const counts: Record<TemplateCategory, number> = {
      subscription: 0,
      business: 0,
      personal: 0,
      utility: 0,
    };

    for (const template of this.list()) {
      counts[template.category]++;
    }

    return counts;
  }

  /**
   * Get list of all available categories
   */
  getCategories(): TemplateCategory[] {
    return ['subscription', 'business', 'personal', 'utility'];
  }
}

/**
 * Create a template manager instance
 */
export function createTemplateManager(
  config?: TemplateManagerConfig,
  contactConfig?: ContactManagerConfig
): TemplateManager {
  return new TemplateManager(config, contactConfig);
}

// Global instance for convenience
let globalTemplateManager: TemplateManager | null = null;

/**
 * Get global template manager instance
 */
export function getGlobalTemplateManager(): TemplateManager {
  if (!globalTemplateManager) {
    globalTemplateManager = createTemplateManager();
  }
  return globalTemplateManager;
}

export default TemplateManager;
