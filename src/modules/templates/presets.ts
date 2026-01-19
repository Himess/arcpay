/**
 * ArcPay Payment Templates - Preset Templates
 *
 * Pre-configured payment templates for popular services
 */

import type { PaymentTemplate } from './types';

/**
 * Subscription templates - streaming, software, etc.
 */
export const SUBSCRIPTION_TEMPLATES: PaymentTemplate[] = [
  {
    id: 'netflix',
    name: 'Netflix',
    amount: '15.99',
    billingDay: 15,
    category: 'subscription',
    icon: '🎬',
    description: 'Netflix streaming subscription',
  },
  {
    id: 'spotify',
    name: 'Spotify',
    amount: '9.99',
    billingDay: 1,
    category: 'subscription',
    icon: '🎵',
    description: 'Spotify music subscription',
  },
  {
    id: 'youtube',
    name: 'YouTube Premium',
    amount: '13.99',
    billingDay: 1,
    category: 'subscription',
    icon: '📺',
    description: 'YouTube Premium subscription',
  },
  {
    id: 'disney',
    name: 'Disney+',
    amount: '10.99',
    billingDay: 15,
    category: 'subscription',
    icon: '🏰',
    description: 'Disney+ streaming subscription',
  },
  {
    id: 'hbo',
    name: 'HBO Max',
    amount: '15.99',
    billingDay: 1,
    category: 'subscription',
    icon: '🎭',
    description: 'HBO Max streaming subscription',
  },
  {
    id: 'apple_music',
    name: 'Apple Music',
    amount: '10.99',
    billingDay: 1,
    category: 'subscription',
    icon: '🍎',
    description: 'Apple Music subscription',
  },
  {
    id: 'amazon_prime',
    name: 'Amazon Prime',
    amount: '14.99',
    billingDay: 1,
    category: 'subscription',
    icon: '📦',
    description: 'Amazon Prime membership',
  },
  {
    id: 'github',
    name: 'GitHub Pro',
    amount: '4.00',
    billingDay: 1,
    category: 'subscription',
    icon: '🐙',
    description: 'GitHub Pro subscription',
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT Plus',
    amount: '20.00',
    billingDay: 1,
    category: 'subscription',
    icon: '🤖',
    description: 'ChatGPT Plus subscription',
  },
  {
    id: 'notion',
    name: 'Notion',
    amount: '10.00',
    billingDay: 1,
    category: 'subscription',
    icon: '📝',
    description: 'Notion workspace subscription',
  },
];

/**
 * Business templates - payroll, contractors, etc.
 */
export const BUSINESS_TEMPLATES: PaymentTemplate[] = [
  {
    id: 'salary',
    name: 'Monthly Salary',
    category: 'business',
    icon: '💼',
    isStream: true,
    streamDuration: 30,
    description: 'Monthly salary payment stream',
  },
  {
    id: 'contractor',
    name: 'Contractor Payment',
    category: 'business',
    icon: '🔧',
    description: 'One-time contractor payment',
  },
  {
    id: 'bonus',
    name: 'Bonus',
    category: 'business',
    icon: '🎁',
    description: 'Employee bonus payment',
  },
  {
    id: 'invoice',
    name: 'Invoice Payment',
    category: 'business',
    icon: '📄',
    description: 'Pay an invoice',
  },
  {
    id: 'commission',
    name: 'Sales Commission',
    category: 'business',
    icon: '💰',
    description: 'Sales commission payment',
  },
];

/**
 * Personal templates - rent, allowance, etc.
 */
export const PERSONAL_TEMPLATES: PaymentTemplate[] = [
  {
    id: 'rent',
    name: 'Rent',
    billingDay: 1,
    category: 'personal',
    icon: '🏠',
    description: 'Monthly rent payment',
  },
  {
    id: 'allowance',
    name: 'Allowance',
    billingDay: 1,
    category: 'personal',
    icon: '🎒',
    isStream: true,
    streamDuration: 7,
    description: 'Weekly allowance stream',
  },
  {
    id: 'gift',
    name: 'Gift',
    category: 'personal',
    icon: '🎀',
    description: 'Gift payment',
  },
  {
    id: 'loan_repayment',
    name: 'Loan Repayment',
    billingDay: 15,
    category: 'personal',
    icon: '🤝',
    description: 'Monthly loan repayment',
  },
  {
    id: 'savings',
    name: 'Savings Transfer',
    billingDay: 1,
    category: 'personal',
    icon: '🐷',
    description: 'Monthly savings transfer',
  },
];

/**
 * Utility templates - phone, internet, etc.
 */
export const UTILITY_TEMPLATES: PaymentTemplate[] = [
  {
    id: 'phone',
    name: 'Phone Bill',
    billingDay: 15,
    category: 'utility',
    icon: '📱',
    description: 'Monthly phone bill',
  },
  {
    id: 'internet',
    name: 'Internet',
    billingDay: 1,
    category: 'utility',
    icon: '🌐',
    description: 'Monthly internet bill',
  },
  {
    id: 'electricity',
    name: 'Electricity',
    billingDay: 20,
    category: 'utility',
    icon: '⚡',
    description: 'Monthly electricity bill',
  },
  {
    id: 'water',
    name: 'Water',
    billingDay: 15,
    category: 'utility',
    icon: '💧',
    description: 'Monthly water bill',
  },
  {
    id: 'insurance',
    name: 'Insurance',
    billingDay: 1,
    category: 'utility',
    icon: '🛡️',
    description: 'Monthly insurance payment',
  },
];

/**
 * All preset templates combined
 */
export const ALL_TEMPLATES: PaymentTemplate[] = [
  ...SUBSCRIPTION_TEMPLATES,
  ...BUSINESS_TEMPLATES,
  ...PERSONAL_TEMPLATES,
  ...UTILITY_TEMPLATES,
];

/**
 * Template lookup map by ID
 */
export const TEMPLATES_BY_ID: Map<string, PaymentTemplate> = new Map(
  ALL_TEMPLATES.map((t) => [t.id, t])
);

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): PaymentTemplate | undefined {
  return TEMPLATES_BY_ID.get(id.toLowerCase());
}

/**
 * Search templates by name (case-insensitive)
 */
export function searchTemplates(query: string): PaymentTemplate[] {
  const lowerQuery = query.toLowerCase();
  return ALL_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.id.toLowerCase().includes(lowerQuery) ||
      t.description?.toLowerCase().includes(lowerQuery)
  );
}
