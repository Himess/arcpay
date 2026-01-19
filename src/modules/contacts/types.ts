/**
 * ArcPay Contacts Module - Type Definitions
 *
 * Types for managing address aliases and contact information.
 */

/**
 * Contact category for organization
 */
export type ContactCategory =
  | 'personal'
  | 'business'
  | 'subscription'
  | 'merchant'
  | 'agent'
  | 'other';

/**
 * Contact metadata for additional information
 */
export interface ContactMetadata {
  /** Category for organization */
  category?: ContactCategory;
  /** Monthly expected amount (for subscriptions) */
  monthlyAmount?: string;
  /** Billing day of month (1-31) */
  billingDay?: number;
  /** Next due date (ISO string, auto-calculated) */
  nextDueDate?: string;
  /** Auto-approve payments without confirmation */
  autoApprove?: boolean;
  /** Last payment transaction hash */
  lastPaidTxHash?: string;
  /** Notes about this contact */
  notes?: string;
  /** Custom tags */
  tags?: string[];
  /** Last payment date */
  lastPaymentDate?: string;
  /** Total amount paid to this contact */
  totalPaid?: string;
  /** Payment count */
  paymentCount?: number;
  /** Template ID (if created from a template) */
  templateId?: string;
  /** Emoji icon */
  icon?: string;
}

/**
 * Contact record
 */
export interface Contact {
  /** Unique name/alias (lowercase, no spaces) */
  name: string;
  /** Display name (original casing) */
  displayName: string;
  /** Wallet address */
  address: string;
  /** Contact metadata */
  metadata: ContactMetadata;
  /** Creation timestamp */
  createdAt: string;
  /** Last updated timestamp */
  updatedAt: string;
}

/**
 * Storage adapter interface for persistence
 */
export interface StorageAdapter {
  /** Get value by key */
  get(key: string): Promise<string | null>;
  /** Set value by key */
  set(key: string, value: string): Promise<void>;
  /** Delete value by key */
  delete(key: string): Promise<void>;
  /** Check if key exists */
  has(key: string): Promise<boolean>;
  /** Get all keys */
  keys(): Promise<string[]>;
  /** Clear all data */
  clear(): Promise<void>;
}

/**
 * Contact manager configuration
 */
export interface ContactManagerConfig {
  /** Storage adapter (defaults to in-memory) */
  storage?: StorageAdapter;
  /** Storage key prefix */
  storageKey?: string;
  /** Auto-save on changes */
  autoSave?: boolean;
}

/**
 * Search options
 */
export interface ContactSearchOptions {
  /** Filter by category */
  category?: ContactCategory;
  /** Filter by tags */
  tags?: string[];
  /** Limit results */
  limit?: number;
}

/**
 * Fuzzy match result
 */
export interface FuzzyMatchResult {
  contact: Contact;
  score: number;
  matchType: 'exact' | 'prefix' | 'contains' | 'fuzzy';
}

/**
 * Subscription status for a contact
 */
export type SubscriptionStatusType = 'due' | 'upcoming' | 'paid' | 'overdue';

/**
 * Subscription status details
 */
export interface SubscriptionStatus {
  /** The contact */
  contact: Contact;
  /** Current status */
  status: SubscriptionStatusType;
  /** Days until due (negative if overdue) */
  daysUntilDue: number;
  /** Days overdue (0 if not overdue) */
  daysOverdue: number;
  /** Is paid this month */
  isPaidThisMonth: boolean;
}
