/**
 * ArcPay Contacts Module
 *
 * Manage address aliases and contacts for easier payments.
 * Supports fuzzy matching, categories, and payment tracking.
 *
 * @example
 * ```typescript
 * import { createContactManager } from 'arcpay';
 *
 * const contacts = createContactManager();
 *
 * // Add contacts
 * await contacts.add('alice', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78', {
 *   category: 'personal',
 *   notes: 'Best friend'
 * });
 *
 * // Resolve name to address
 * const address = await contacts.resolve('alice');
 *
 * // Fuzzy search
 * const results = await contacts.search('ali');
 * ```
 */

import type {
  Contact,
  ContactMetadata,
  ContactCategory,
  ContactManagerConfig,
  ContactSearchOptions,
  FuzzyMatchResult,
  StorageAdapter,
} from './types';
import { createStorage } from './storage';

// Re-export types
export type {
  Contact,
  ContactMetadata,
  ContactCategory,
  ContactManagerConfig,
  ContactSearchOptions,
  FuzzyMatchResult,
  StorageAdapter,
};

// Re-export storage utilities
export { MemoryStorage, LocalStorageAdapter, FileStorage, createStorage } from './storage';

const CONTACTS_KEY = 'contacts';

/**
 * Contact Manager
 *
 * Manages address aliases with persistence, fuzzy matching, and payment tracking.
 */
export class ContactManager {
  private storage: StorageAdapter;
  private contacts: Map<string, Contact> = new Map();
  private loaded: boolean = false;
  private autoSave: boolean;

  constructor(config: ContactManagerConfig = {}) {
    this.storage = config.storage ?? createStorage();
    this.autoSave = config.autoSave ?? true;
  }

  /**
   * Ensure contacts are loaded from storage
   */
  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;

    const data = await this.storage.get(CONTACTS_KEY);
    if (data) {
      try {
        const parsed = JSON.parse(data) as Contact[];
        for (const contact of parsed) {
          this.contacts.set(contact.name, contact);
        }
      } catch {
        // Ignore parse errors
      }
    }

    this.loaded = true;
  }

  /**
   * Save contacts to storage
   */
  private async save(): Promise<void> {
    const data = Array.from(this.contacts.values());
    await this.storage.set(CONTACTS_KEY, JSON.stringify(data));
  }

  /**
   * Add a new contact
   *
   * @param name - Contact name/alias (will be normalized to lowercase)
   * @param address - Wallet address
   * @param metadata - Optional metadata
   *
   * @example
   * ```typescript
   * await contacts.add('alice', '0x...', {
   *   category: 'personal',
   *   notes: 'Friend from college'
   * });
   * ```
   */
  async add(name: string, address: string, metadata: ContactMetadata = {}): Promise<Contact> {
    await this.ensureLoaded();

    const normalizedName = this.normalizeName(name);

    if (this.contacts.has(normalizedName)) {
      throw new Error(`Contact "${name}" already exists`);
    }

    if (!this.isValidAddress(address)) {
      throw new Error(`Invalid address: ${address}`);
    }

    const now = new Date().toISOString();

    // Calculate nextDueDate for subscriptions with billingDay
    let nextDueDate = metadata.nextDueDate;
    if (
      metadata.category === 'subscription' &&
      metadata.billingDay &&
      !nextDueDate
    ) {
      nextDueDate = this.calculateNextDueDate(metadata.billingDay, metadata.lastPaymentDate);
    }

    const contact: Contact = {
      name: normalizedName,
      displayName: name,
      address: address.toLowerCase(),
      metadata: {
        category: metadata.category ?? 'other',
        paymentCount: 0,
        totalPaid: '0',
        ...metadata,
        nextDueDate,
      },
      createdAt: now,
      updatedAt: now,
    };

    this.contacts.set(normalizedName, contact);

    if (this.autoSave) {
      await this.save();
    }

    return contact;
  }

  /**
   * Update an existing contact
   */
  async update(name: string, updates: Partial<Pick<Contact, 'address'> & { metadata: Partial<ContactMetadata> }>): Promise<Contact> {
    await this.ensureLoaded();

    const normalizedName = this.normalizeName(name);
    const contact = this.contacts.get(normalizedName);

    if (!contact) {
      throw new Error(`Contact "${name}" not found`);
    }

    if (updates.address) {
      if (!this.isValidAddress(updates.address)) {
        throw new Error(`Invalid address: ${updates.address}`);
      }
      contact.address = updates.address.toLowerCase();
    }

    if (updates.metadata) {
      contact.metadata = { ...contact.metadata, ...updates.metadata };
    }

    contact.updatedAt = new Date().toISOString();
    this.contacts.set(normalizedName, contact);

    if (this.autoSave) {
      await this.save();
    }

    return contact;
  }

  /**
   * Remove a contact
   */
  async remove(name: string): Promise<boolean> {
    await this.ensureLoaded();

    const normalizedName = this.normalizeName(name);
    const deleted = this.contacts.delete(normalizedName);

    if (deleted && this.autoSave) {
      await this.save();
    }

    return deleted;
  }

  /**
   * Get a contact by name
   */
  async get(name: string): Promise<Contact | undefined> {
    await this.ensureLoaded();
    return this.contacts.get(this.normalizeName(name));
  }

  /**
   * Check if a contact exists
   */
  async has(name: string): Promise<boolean> {
    await this.ensureLoaded();
    return this.contacts.has(this.normalizeName(name));
  }

  /**
   * Resolve a name or address to an address
   * Returns the address if input is already an address
   *
   * @example
   * ```typescript
   * const addr = await contacts.resolve('alice'); // Returns alice's address
   * const addr = await contacts.resolve('0x...'); // Returns the same address
   * ```
   */
  async resolve(nameOrAddress: string): Promise<string | undefined> {
    // If it's already an address, return it
    if (this.isValidAddress(nameOrAddress)) {
      return nameOrAddress.toLowerCase();
    }

    const contact = await this.get(nameOrAddress);
    return contact?.address;
  }

  /**
   * Resolve all contact names in a text string to their addresses
   * Useful for voice commands like "send 50 to ahmed and 30 to bob"
   *
   * @param text - Text containing contact names
   * @returns Text with contact names replaced by addresses
   *
   * @example
   * ```typescript
   * const resolved = await contacts.resolveAll('send 50 to ahmed');
   * // Returns: 'send 50 to 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78'
   * ```
   */
  async resolveAll(text: string): Promise<string> {
    await this.ensureLoaded();

    let result = text;

    // Sort contacts by name length (longest first) to avoid partial replacements
    const sortedContacts = Array.from(this.contacts.values())
      .sort((a, b) => b.name.length - a.name.length);

    for (const contact of sortedContacts) {
      // Create regex that matches the contact name as a whole word (case-insensitive)
      const regex = new RegExp(`\\b${this.escapeRegex(contact.name)}\\b`, 'gi');
      result = result.replace(regex, contact.address);

      // Also match display name if different
      if (contact.displayName.toLowerCase() !== contact.name) {
        const displayRegex = new RegExp(`\\b${this.escapeRegex(contact.displayName)}\\b`, 'gi');
        result = result.replace(displayRegex, contact.address);
      }
    }

    return result;
  }

  /**
   * Synchronous resolve (requires ensureLoaded to be called first)
   * Used internally for fast resolution when contacts are already loaded
   */
  resolveSync(nameOrAddress: string): string | undefined {
    if (this.isValidAddress(nameOrAddress)) {
      return nameOrAddress.toLowerCase();
    }

    const contact = this.contacts.get(this.normalizeName(nameOrAddress));
    return contact?.address;
  }

  /**
   * Reverse lookup - find contact by address
   * Alias: getByAddress
   */
  async findByAddress(address: string): Promise<Contact | undefined> {
    await this.ensureLoaded();

    const normalizedAddress = address.toLowerCase();
    for (const contact of this.contacts.values()) {
      if (contact.address === normalizedAddress) {
        return contact;
      }
    }

    return undefined;
  }

  /**
   * Get contact by address (alias for findByAddress)
   */
  async getByAddress(address: string): Promise<Contact | undefined> {
    return this.findByAddress(address);
  }

  /**
   * Delete a contact (alias for remove)
   */
  async delete(name: string): Promise<boolean> {
    return this.remove(name);
  }

  /**
   * List all contacts
   */
  async list(options?: ContactSearchOptions): Promise<Contact[]> {
    await this.ensureLoaded();

    let results = Array.from(this.contacts.values());

    // Filter by category
    if (options?.category) {
      results = results.filter((c) => c.metadata.category === options.category);
    }

    // Filter by tags
    if (options?.tags && options.tags.length > 0) {
      results = results.filter((c) =>
        options.tags!.some((tag) => c.metadata.tags?.includes(tag))
      );
    }

    // Sort by display name
    results.sort((a, b) => a.displayName.localeCompare(b.displayName));

    // Limit results
    if (options?.limit && options.limit > 0) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Search contacts with fuzzy matching
   *
   * @param query - Search query
   * @returns Matches sorted by relevance
   */
  async search(query: string): Promise<FuzzyMatchResult[]> {
    await this.ensureLoaded();

    if (!query || query.length === 0) {
      return [];
    }

    const normalizedQuery = query.toLowerCase();
    const results: FuzzyMatchResult[] = [];

    for (const contact of this.contacts.values()) {
      const name = contact.name;
      const displayName = contact.displayName.toLowerCase();

      // Exact match
      if (name === normalizedQuery || displayName === normalizedQuery) {
        results.push({ contact, score: 1.0, matchType: 'exact' });
        continue;
      }

      // Prefix match
      if (name.startsWith(normalizedQuery) || displayName.startsWith(normalizedQuery)) {
        const score = normalizedQuery.length / name.length;
        results.push({ contact, score: 0.8 + score * 0.2, matchType: 'prefix' });
        continue;
      }

      // Contains match
      if (name.includes(normalizedQuery) || displayName.includes(normalizedQuery)) {
        const score = normalizedQuery.length / name.length;
        results.push({ contact, score: 0.5 + score * 0.3, matchType: 'contains' });
        continue;
      }

      // Fuzzy match (simple Levenshtein-based)
      const distance = this.levenshteinDistance(normalizedQuery, name);
      const maxLen = Math.max(normalizedQuery.length, name.length);
      const similarity = 1 - distance / maxLen;

      if (similarity >= 0.5) {
        results.push({ contact, score: similarity * 0.5, matchType: 'fuzzy' });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results;
  }

  /**
   * Record a payment to a contact
   */
  async recordPayment(name: string, amount: string, txHash?: string): Promise<void> {
    await this.ensureLoaded();

    const contact = await this.get(name);
    if (!contact) {
      throw new Error(`Contact "${name}" not found`);
    }

    const currentTotal = parseFloat(contact.metadata.totalPaid || '0');
    const newTotal = currentTotal + parseFloat(amount);

    contact.metadata.totalPaid = newTotal.toString();
    contact.metadata.paymentCount = (contact.metadata.paymentCount || 0) + 1;
    contact.metadata.lastPaymentDate = new Date().toISOString();
    if (txHash) {
      contact.metadata.lastPaidTxHash = txHash;
    }

    // If this is a subscription, update next due date
    if (contact.metadata.category === 'subscription' && contact.metadata.billingDay) {
      contact.metadata.nextDueDate = this.calculateNextDueDate(
        contact.metadata.billingDay,
        contact.metadata.lastPaymentDate
      );
    }

    contact.updatedAt = new Date().toISOString();

    this.contacts.set(contact.name, contact);

    if (this.autoSave) {
      await this.save();
    }
  }

  // ========== SUBSCRIPTION METHODS ==========

  /**
   * Get all subscription contacts
   */
  async getSubscriptions(): Promise<Contact[]> {
    await this.ensureLoaded();

    return Array.from(this.contacts.values()).filter(
      (c) => c.metadata.category === 'subscription'
    );
  }

  /**
   * Get subscriptions due today
   */
  async getDueSubscriptions(): Promise<Contact[]> {
    await this.ensureLoaded();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Array.from(this.contacts.values()).filter((c) => {
      if (c.metadata.category !== 'subscription') return false;
      if (!c.metadata.billingDay) return false;

      const status = this.getSubscriptionStatusSync(c);
      return status.status === 'due';
    });
  }

  /**
   * Get upcoming subscriptions within X days
   */
  async getUpcomingSubscriptions(days: number = 7): Promise<Contact[]> {
    await this.ensureLoaded();

    return Array.from(this.contacts.values()).filter((c) => {
      if (c.metadata.category !== 'subscription') return false;
      if (!c.metadata.billingDay) return false;

      const status = this.getSubscriptionStatusSync(c);
      return status.status === 'upcoming' && status.daysUntilDue <= days;
    });
  }

  /**
   * Get overdue subscriptions
   */
  async getOverdueSubscriptions(): Promise<Contact[]> {
    await this.ensureLoaded();

    return Array.from(this.contacts.values()).filter((c) => {
      if (c.metadata.category !== 'subscription') return false;
      if (!c.metadata.billingDay) return false;

      const status = this.getSubscriptionStatusSync(c);
      return status.status === 'overdue';
    });
  }

  /**
   * Get subscriptions paid this month
   */
  async getPaidThisMonth(): Promise<Contact[]> {
    await this.ensureLoaded();

    return Array.from(this.contacts.values()).filter((c) => {
      if (c.metadata.category !== 'subscription') return false;

      const status = this.getSubscriptionStatusSync(c);
      return status.isPaidThisMonth;
    });
  }

  /**
   * Get subscription status for a contact
   */
  getSubscriptionStatus(contact: Contact): {
    status: 'due' | 'upcoming' | 'paid' | 'overdue';
    daysUntilDue: number;
    daysOverdue: number;
    isPaidThisMonth: boolean;
  } {
    return this.getSubscriptionStatusSync(contact);
  }

  /**
   * Mark a subscription as paid
   */
  async markPaid(name: string, txHash: string): Promise<Contact> {
    await this.ensureLoaded();

    const contact = await this.get(name);
    if (!contact) {
      throw new Error(`Contact "${name}" not found`);
    }

    if (contact.metadata.category !== 'subscription') {
      throw new Error(`Contact "${name}" is not a subscription`);
    }

    const amount = contact.metadata.monthlyAmount || '0';
    await this.recordPayment(name, amount, txHash);

    return (await this.get(name))!;
  }

  /**
   * Snooze a subscription by X days
   */
  async snooze(name: string, days: number): Promise<Contact> {
    await this.ensureLoaded();

    const contact = await this.get(name);
    if (!contact) {
      throw new Error(`Contact "${name}" not found`);
    }

    if (contact.metadata.category !== 'subscription') {
      throw new Error(`Contact "${name}" is not a subscription`);
    }

    // Calculate new due date
    const currentDue = contact.metadata.nextDueDate
      ? new Date(contact.metadata.nextDueDate)
      : new Date();
    currentDue.setDate(currentDue.getDate() + days);
    contact.metadata.nextDueDate = currentDue.toISOString();
    contact.updatedAt = new Date().toISOString();

    this.contacts.set(contact.name, contact);

    if (this.autoSave) {
      await this.save();
    }

    return contact;
  }

  /**
   * Get monthly subscription total
   */
  async getMonthlyTotal(): Promise<string> {
    const subscriptions = await this.getSubscriptions();

    const total = subscriptions.reduce((sum, c) => {
      return sum + parseFloat(c.metadata.monthlyAmount || '0');
    }, 0);

    return total.toFixed(2);
  }

  /**
   * Calculate next due date based on billing day
   */
  private calculateNextDueDate(billingDay: number, lastPaidDate?: string): string {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // If already paid this month, next due is next month
    if (lastPaidDate) {
      const lastPaid = new Date(lastPaidDate);
      if (lastPaid.getMonth() === currentMonth && lastPaid.getFullYear() === currentYear) {
        // Already paid this month, due next month
        const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
        const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
        // Handle months with fewer days
        const daysInMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
        const actualDay = Math.min(billingDay, daysInMonth);
        return new Date(nextYear, nextMonth, actualDay).toISOString();
      }
    }

    // Due this month if billingDay hasn't passed, otherwise next month
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const actualBillingDay = Math.min(billingDay, daysInCurrentMonth);

    if (today.getDate() <= actualBillingDay) {
      return new Date(currentYear, currentMonth, actualBillingDay).toISOString();
    } else {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const daysInNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
      const actualDay = Math.min(billingDay, daysInNextMonth);
      return new Date(nextYear, nextMonth, actualDay).toISOString();
    }
  }

  /**
   * Get subscription status (sync version)
   */
  private getSubscriptionStatusSync(contact: Contact): {
    status: 'due' | 'upcoming' | 'paid' | 'overdue';
    daysUntilDue: number;
    daysOverdue: number;
    isPaidThisMonth: boolean;
  } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Check if paid this month
    let isPaidThisMonth = false;
    if (contact.metadata.lastPaymentDate) {
      const lastPaid = new Date(contact.metadata.lastPaymentDate);
      isPaidThisMonth =
        lastPaid.getMonth() === currentMonth && lastPaid.getFullYear() === currentYear;
    }

    // If paid this month, status is 'paid'
    if (isPaidThisMonth) {
      // Calculate days until next due
      const nextDue = contact.metadata.nextDueDate
        ? new Date(contact.metadata.nextDueDate)
        : this.calculateNextDueDateSync(contact.metadata.billingDay || 1, contact.metadata.lastPaymentDate);
      const dueDate = typeof nextDue === 'string' ? new Date(nextDue) : nextDue;
      dueDate.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      return {
        status: 'paid',
        daysUntilDue,
        daysOverdue: 0,
        isPaidThisMonth: true,
      };
    }

    // Calculate due date for this month
    const billingDay = contact.metadata.billingDay || 1;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const actualBillingDay = Math.min(billingDay, daysInMonth);
    const dueDate = new Date(currentYear, currentMonth, actualBillingDay);
    dueDate.setHours(0, 0, 0, 0);

    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) {
      // Overdue
      return {
        status: 'overdue',
        daysUntilDue,
        daysOverdue: Math.abs(daysUntilDue),
        isPaidThisMonth: false,
      };
    } else if (daysUntilDue === 0) {
      // Due today
      return {
        status: 'due',
        daysUntilDue: 0,
        daysOverdue: 0,
        isPaidThisMonth: false,
      };
    } else {
      // Upcoming
      return {
        status: 'upcoming',
        daysUntilDue,
        daysOverdue: 0,
        isPaidThisMonth: false,
      };
    }
  }

  /**
   * Calculate next due date (sync version for internal use)
   */
  private calculateNextDueDateSync(billingDay: number, lastPaidDate?: string): Date {
    const result = this.calculateNextDueDate(billingDay, lastPaidDate);
    return new Date(result);
  }

  /**
   * Get payment statistics
   */
  async getStats(): Promise<{
    totalContacts: number;
    byCategory: Record<ContactCategory, number>;
    totalPaid: string;
    totalPayments: number;
  }> {
    await this.ensureLoaded();

    const byCategory: Record<ContactCategory, number> = {
      personal: 0,
      business: 0,
      subscription: 0,
      merchant: 0,
      agent: 0,
      other: 0,
    };

    let totalPaid = 0;
    let totalPayments = 0;

    for (const contact of this.contacts.values()) {
      const category = contact.metadata.category || 'other';
      byCategory[category]++;
      totalPaid += parseFloat(contact.metadata.totalPaid || '0');
      totalPayments += contact.metadata.paymentCount || 0;
    }

    return {
      totalContacts: this.contacts.size,
      byCategory,
      totalPaid: totalPaid.toFixed(2),
      totalPayments,
    };
  }

  /**
   * Import contacts from JSON
   */
  async import(data: Array<{ name: string; address: string; metadata?: ContactMetadata }>): Promise<number> {
    let imported = 0;

    for (const item of data) {
      try {
        if (!await this.has(item.name)) {
          await this.add(item.name, item.address, item.metadata);
          imported++;
        }
      } catch {
        // Skip invalid entries
      }
    }

    return imported;
  }

  /**
   * Export contacts to JSON
   */
  async export(): Promise<Array<{ name: string; address: string; metadata: ContactMetadata }>> {
    const contacts = await this.list();
    return contacts.map((c) => ({
      name: c.displayName,
      address: c.address,
      metadata: c.metadata,
    }));
  }

  /**
   * Clear all contacts
   */
  async clear(): Promise<void> {
    this.contacts.clear();
    await this.storage.delete(CONTACTS_KEY);
  }

  /**
   * Get contact count
   */
  get size(): number {
    return this.contacts.size;
  }

  // ========== Private Helpers ==========

  private normalizeName(name: string): string {
    return name.toLowerCase().trim().replace(/\s+/g, '-');
  }

  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}

/**
 * Create a contact manager instance
 */
export function createContactManager(config?: ContactManagerConfig): ContactManager {
  return new ContactManager(config);
}

// Global instance for convenience
let globalContactManager: ContactManager | null = null;

/**
 * Get global contact manager instance
 */
export function getGlobalContactManager(): ContactManager {
  if (!globalContactManager) {
    globalContactManager = createContactManager();
  }
  return globalContactManager;
}

export default ContactManager;
