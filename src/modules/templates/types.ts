/**
 * ArcPay Payment Templates - Type Definitions
 *
 * Types for pre-configured payment templates like Netflix, Spotify, etc.
 */

/**
 * Template category
 */
export type TemplateCategory = 'subscription' | 'business' | 'personal' | 'utility';

/**
 * Payment template definition
 */
export interface PaymentTemplate {
  /** Unique template ID */
  id: string;
  /** Display name */
  name: string;
  /** Default amount (can be overridden) */
  amount?: string;
  /** Default billing day (1-31) */
  billingDay?: number;
  /** Template category */
  category: TemplateCategory;
  /** Emoji icon */
  icon: string;
  /** If true, this is a streaming payment template */
  isStream?: boolean;
  /** Default duration in days (for streams) */
  streamDuration?: number;
  /** Description */
  description?: string;
}

/**
 * Options for using a template
 */
export interface UseTemplateOptions {
  /** Recipient address */
  address: string;
  /** Override the default amount */
  amount?: string;
  /** Override the default billing day */
  billingDay?: number;
  /** For streams: recipient name */
  employee?: string;
  /** For streams: duration in days */
  duration?: number;
  /** Custom name for the contact (alternative to amount) */
  customName?: string;
  /** Custom amount (alternative to amount) */
  customAmount?: string;
  /** Custom billing day (alternative to billingDay) */
  customBillingDay?: number;
}

/**
 * Template manager configuration
 */
export interface TemplateManagerConfig {
  /** Custom templates to add */
  customTemplates?: PaymentTemplate[];
}
