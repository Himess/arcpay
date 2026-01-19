/**
 * Intent Templates - Built-in patterns for natural language parsing
 */

import type { IntentTemplate } from './types';

/**
 * Built-in intent templates
 */
export const builtInTemplates: IntentTemplate[] = [
  // SEND: "send $10 to 0x123..."
  {
    pattern: /send\s+\$?([\d.]+)\s*(?:usdc|usd)?\s+to\s+(0x[a-fA-F0-9]{40})/i,
    action: 'send',
    extract: (match) => ({
      amount: match[1],
      recipient: match[2],
      token: 'USDC',
    }),
    examples: [
      'send $10 to 0x742d35Cc6634C0532925a3b844Bc9e7595f5E123',
      'send 5.50 USDC to 0x742d35Cc6634C0532925a3b844Bc9e7595f5E123',
    ],
  },

  // SEND with ENS: "send $10 to alice.eth"
  {
    pattern: /send\s+\$?([\d.]+)\s*(?:usdc|usd)?\s+to\s+([a-zA-Z0-9-]+\.eth)/i,
    action: 'send',
    extract: (match) => ({
      amount: match[1],
      recipient: match[2],
      token: 'USDC',
    }),
    examples: ['send $25 to vitalik.eth'],
  },

  // SPLIT: "split $100 between 0x123, 0x456, 0x789"
  {
    pattern:
      /split\s+\$?([\d.]+)\s+(?:between|among)\s+((?:0x[a-fA-F0-9]{40}(?:\s*,\s*)?)+)/i,
    action: 'split',
    extract: (match) => ({
      amount: match[1],
      addresses: match[2].match(/0x[a-fA-F0-9]{40}/g) || [],
      token: 'USDC',
    }),
    examples: [
      'split $100 between 0x111..., 0x222..., 0x333...',
      'split $30 among 0xabc..., 0xdef...',
    ],
  },

  // STREAM: "stream $0.001 per token to api.llm.com"
  {
    pattern:
      /stream\s+\$?([\d.]+)\s+per\s+(token|second|request|kb)\s+to\s+(\S+)(?:\s+max\s+\$?([\d.]+))?/i,
    action: 'stream',
    extract: (match) => ({
      amount: match[1],
      service: match[3],
      maxPrice: match[4] || '10.00',
      frequency: match[2] as 'once',
    }),
    examples: [
      'stream $0.0001 per token to api.openai.com max $5',
      'stream $0.01 per second to compute.api.com',
    ],
  },

  // SUBSCRIBE: "subscribe to api.news.com for $9.99/month"
  {
    pattern:
      /subscribe\s+to\s+(\S+)\s+(?:for\s+)?\$?([\d.]+)\s*\/\s*(month|week|day)/i,
    action: 'subscribe',
    extract: (match) => ({
      service: match[1],
      amount: match[2],
      frequency:
        match[3] === 'month'
          ? 'monthly'
          : match[3] === 'week'
            ? 'weekly'
            : 'daily',
    }),
    examples: [
      'subscribe to api.premium.com for $9.99/month',
      'subscribe to news.api.com for $2.50/week',
    ],
  },

  // BRIDGE: "bridge $100 from ethereum to arc"
  {
    pattern: /bridge\s+\$?([\d.]+)\s*(?:usdc)?\s+from\s+(\w+)\s+to\s+(\w+)/i,
    action: 'bridge',
    extract: (match) => ({
      amount: match[1],
      chain: match[2], // source chain
      recipient: match[3], // destination chain stored here
      token: 'USDC',
    }),
    examples: [
      'bridge $100 from ethereum to arc',
      'bridge $50 USDC from base to arc',
    ],
  },

  // FIND AND PAY: "find cheapest weather API under $0.05 and get Istanbul forecast"
  {
    pattern:
      /find\s+(?:the\s+)?(?:cheapest|best)?\s*(\w+(?:\s+\w+)?)\s+(?:api|service)?\s*(?:under\s+\$?([\d.]+))?\s+and\s+(.+)/i,
    action: 'find_and_pay',
    extract: (match) => ({
      service: match[1],
      maxPrice: match[2] || '1.00',
      query: match[3],
    }),
    examples: [
      'find cheapest weather API under $0.05 and get Istanbul forecast',
      'find best image generation service and create a sunset photo',
    ],
  },

  // SCHEDULE: "schedule $50 to 0x123 every week for 3 months"
  {
    pattern:
      /schedule\s+\$?([\d.]+)\s+to\s+(0x[a-fA-F0-9]{40})\s+every\s+(day|week|month)\s+for\s+(\d+)\s+(days?|weeks?|months?)/i,
    action: 'schedule',
    extract: (match) => ({
      amount: match[1],
      recipient: match[2],
      frequency:
        match[3] === 'day'
          ? 'daily'
          : match[3] === 'week'
            ? 'weekly'
            : 'monthly',
      duration: `${match[4]} ${match[5]}`,
    }),
    examples: [
      'schedule $50 to 0x123... every week for 3 months',
      'schedule $100 to 0xabc... every month for 1 year',
    ],
  },

  // SWAP: "swap $100 USDC to EURC"
  {
    pattern: /swap\s+\$?([\d.]+)\s*(\w+)\s+(?:to|for)\s+(\w+)/i,
    action: 'swap',
    extract: (match) => ({
      amount: match[1],
      token: match[2].toUpperCase(),
      recipient: match[3].toUpperCase(), // destination token stored here
    }),
    examples: ['swap $100 USDC to EURC', 'swap $50 USDC for EURC'],
  },

  // Simple SEND without "to": "pay 0x123 $50"
  {
    pattern: /pay\s+(0x[a-fA-F0-9]{40})\s+\$?([\d.]+)\s*(?:usdc)?/i,
    action: 'send',
    extract: (match) => ({
      recipient: match[1],
      amount: match[2],
      token: 'USDC',
    }),
    examples: ['pay 0x123... $50', 'pay 0xabc... $25 USDC'],
  },

  // Transfer: "transfer $100 to 0x123"
  {
    pattern: /transfer\s+\$?([\d.]+)\s*(?:usdc)?\s+to\s+(0x[a-fA-F0-9]{40})/i,
    action: 'send',
    extract: (match) => ({
      amount: match[1],
      recipient: match[2],
      token: 'USDC',
    }),
    examples: ['transfer $100 to 0x123...', 'transfer $50 USDC to 0xabc...'],
  },

  // ============ CONTACT MANAGEMENT ============

  // ADD CONTACT: "save ahmed as 0x123..." or "add contact ahmed 0x123..."
  {
    pattern: /(?:save|add(?:\s+contact)?)\s+(\w+)\s+(?:as\s+)?(0x[a-fA-F0-9]{40})/i,
    action: 'add_contact',
    extract: (match) => ({
      name: match[1],
      address: match[2],
    }),
    examples: [
      'save ahmed as 0x742d35Cc6634C0532925a3b844Bc9e7595f5E123',
      'add contact bob 0x8ba1f109551bD432803012645Ac136ddd64DBA72',
    ],
  },

  // DELETE CONTACT: "delete contact ahmed" or "remove ahmed"
  {
    pattern: /(?:delete|remove)(?:\s+contact)?\s+(\w+)/i,
    action: 'delete_contact',
    extract: (match) => ({
      name: match[1],
    }),
    examples: ['delete contact ahmed', 'remove bob'],
  },

  // LIST CONTACTS: "list contacts" or "show my contacts"
  {
    pattern: /(?:list|show)(?:\s+(?:my|all))?\s+contacts/i,
    action: 'list_contacts',
    extract: () => ({}),
    examples: ['list contacts', 'show my contacts', 'show all contacts'],
  },

  // LOOKUP CONTACT: "who is ahmed" or "lookup ahmed"
  {
    pattern: /(?:who\s+is|lookup|find(?:\s+contact)?)\s+(\w+)/i,
    action: 'lookup_contact',
    extract: (match) => ({
      name: match[1],
    }),
    examples: ['who is ahmed', 'lookup bob', 'find contact alice'],
  },

  // PAY BILL: "pay my netflix" or "pay netflix bill"
  {
    pattern: /pay\s+(?:my\s+)?(\w+)\s*(?:bill|subscription|fatura)?/i,
    action: 'pay_bill',
    extract: (match) => ({
      name: match[1],
    }),
    examples: ['pay my netflix', 'pay spotify bill', 'pay netflix subscription'],
  },

  // ============ CONTACT-FRIENDLY SEND ============

  // SEND TO NAME: "send $10 to ahmed" (name instead of address)
  {
    pattern: /send\s+\$?([\d.]+)\s*(?:usdc|usd)?\s+to\s+(\w+)/i,
    action: 'send_to_contact',
    extract: (match) => ({
      amount: match[1],
      recipient: match[2],
      token: 'USDC',
    }),
    examples: [
      'send $10 to ahmed',
      'send 50 USDC to bob',
      'send $25 to netflix',
    ],
  },

  // PAY NAME AMOUNT: "pay ahmed $50"
  {
    pattern: /pay\s+(\w+)\s+\$?([\d.]+)\s*(?:usdc)?/i,
    action: 'send_to_contact',
    extract: (match) => ({
      recipient: match[1],
      amount: match[2],
      token: 'USDC',
    }),
    examples: ['pay ahmed $50', 'pay bob $25 USDC'],
  },

  // ============ SUBSCRIPTION MANAGEMENT ============

  // ADD SUBSCRIPTION: "add netflix subscription $15.99 monthly on the 15th to 0x..."
  {
    pattern:
      /add\s+(\w+)\s+(?:as\s+)?subscription\s+\$?([\d.]+)\s+(?:monthly|per\s+month)(?:\s+(?:on|due)\s+(?:the\s+)?(\d+)(?:st|nd|rd|th)?)?(?:\s+(?:to\s+)?(0x[a-fA-F0-9]{40}))?/i,
    action: 'add_subscription',
    extract: (match) => ({
      name: match[1],
      amount: match[2],
      billingDay: match[3] ? parseInt(match[3]) : undefined,
      address: match[4],
    }),
    examples: [
      'add netflix subscription $15.99 monthly on the 15th to 0x8ba1...',
      'add spotify subscription 9.99 monthly',
      'add hbo as subscription $15.99 per month due on 17th',
    ],
  },

  // CHECK DUE BILLS: "what bills are due"
  {
    pattern: /what\s+bills?\s+(?:are\s+)?due(?:\s+(?:this\s+)?(today|week|month))?/i,
    action: 'check_due_bills',
    extract: (match) => ({
      period: match[1] || 'today',
    }),
    examples: ['what bills are due', 'what bills are due today', 'what bills are due this week'],
  },

  // LIST UPCOMING BILLS: "show upcoming bills"
  {
    pattern: /(?:show|list)\s+(?:upcoming|due)\s+(?:bills?|subscriptions?)/i,
    action: 'list_upcoming_bills',
    extract: () => ({}),
    examples: ['show upcoming bills', 'list due subscriptions', 'show due bills'],
  },

  // ANY OVERDUE: "any overdue bills"
  {
    pattern: /(?:any|show|list)\s+overdue\s+(?:bills?|subscriptions?)/i,
    action: 'check_overdue',
    extract: () => ({}),
    examples: ['any overdue bills', 'show overdue subscriptions'],
  },

  // PAY ALL BILLS: "pay all my bills"
  {
    pattern: /pay\s+all\s+(?:my\s+)?(?:bills?|subscriptions?|due)/i,
    action: 'pay_all_due',
    extract: () => ({}),
    examples: ['pay all my bills', 'pay all subscriptions', 'pay all due'],
  },

  // SNOOZE: "snooze netflix for 3 days"
  {
    pattern: /snooze\s+(\w+)\s+(?:for\s+)?(\d+)\s+(days?|weeks?)/i,
    action: 'snooze_subscription',
    extract: (match) => ({
      name: match[1],
      days: match[3].startsWith('week') ? parseInt(match[2]) * 7 : parseInt(match[2]),
    }),
    examples: ['snooze netflix for 3 days', 'snooze spotify for 1 week'],
  },

  // DELAY PAYMENT: "delay spotify payment by 1 week"
  {
    pattern: /delay\s+(\w+)\s+(?:payment\s+)?(?:by\s+)?(\d+)\s+(days?|weeks?)/i,
    action: 'snooze_subscription',
    extract: (match) => ({
      name: match[1],
      days: match[3].startsWith('week') ? parseInt(match[2]) * 7 : parseInt(match[2]),
    }),
    examples: ['delay spotify payment by 1 week', 'delay netflix by 5 days'],
  },

  // SUBSCRIPTION TOTAL: "how much do I spend on subscriptions"
  {
    pattern: /(?:how\s+much|what)\s+(?:do\s+I\s+)?spend\s+on\s+subscriptions?/i,
    action: 'subscription_total',
    extract: () => ({}),
    examples: ['how much do I spend on subscriptions', 'what do I spend on subscriptions'],
  },

  // MONTHLY TOTAL: "what is my monthly subscription total"
  {
    pattern: /(?:what\s+is\s+)?(?:my\s+)?monthly\s+(?:subscription\s+)?total/i,
    action: 'subscription_total',
    extract: () => ({}),
    examples: ['what is my monthly subscription total', 'monthly total'],
  },

  // LIST SUBSCRIPTIONS: "show my subscriptions"
  {
    pattern: /(?:show|list)\s+(?:my\s+)?subscriptions?/i,
    action: 'list_subscriptions',
    extract: () => ({}),
    examples: ['show my subscriptions', 'list subscriptions'],
  },

  // ============ PAYMENT LINKS ============

  // CREATE LINK: "create payment link for $50"
  {
    pattern: /create\s+(?:a\s+)?(?:payment\s+)?link\s+(?:for\s+)?\$?([\d.]+)(?:\s+(?:for|description)\s+(.+))?/i,
    action: 'create_link',
    extract: (match) => ({
      amount: match[1],
      description: match[2],
    }),
    examples: [
      'create payment link for $50',
      'create link for $25 for dinner split',
      'create a link for 100',
    ],
  },

  // CREATE LINK (no amount): "create a payment link"
  {
    pattern: /create\s+(?:a\s+)?(?:payment\s+)?link(?:\s+(?:for|description)\s+(.+))?$/i,
    action: 'create_link',
    extract: (match) => ({
      description: match[1],
    }),
    examples: ['create payment link', 'create a link for donations'],
  },

  // PAY LINK: "pay link abc123"
  {
    pattern: /pay\s+(?:payment\s+)?link\s+(\S+)(?:\s+\$?([\d.]+))?/i,
    action: 'pay_link',
    extract: (match) => ({
      linkId: match[1],
      amount: match[2],
    }),
    examples: ['pay link link_abc123', 'pay payment link link_xyz $25'],
  },

  // LIST LINKS: "show my payment links"
  {
    pattern: /(?:show|list)\s+(?:my\s+)?(?:payment\s+)?links/i,
    action: 'list_links',
    extract: () => ({}),
    examples: ['show my payment links', 'list links', 'show payment links'],
  },

  // CANCEL LINK: "cancel link abc123"
  {
    pattern: /cancel\s+(?:payment\s+)?link\s+(\S+)/i,
    action: 'cancel_link',
    extract: (match) => ({
      linkId: match[1],
    }),
    examples: ['cancel link link_abc123', 'cancel payment link link_xyz'],
  },

  // ============ SPLIT PAYMENT ============

  // SPLIT EQUAL: "split $100 between alice, bob and charlie"
  {
    pattern: /split\s+\$?([\d.]+)\s+(?:between|among|with)\s+(.+)/i,
    action: 'split_payment',
    extract: (match) => ({
      amount: match[1],
      recipients: match[2].split(/\s*(?:,|and)\s*/).map((s: string) => s.trim()).filter((s: string) => s),
    }),
    examples: [
      'split $100 between alice, bob and charlie',
      'split 50 with alice and bob',
      'split $30 among alice, bob, charlie',
    ],
  },

  // DIVIDE BILL: "divide the bill with alice and bob"
  {
    pattern: /divide\s+(?:the\s+)?(?:bill|check)\s+(?:between|among|with)\s+(.+)/i,
    action: 'split_bill',
    extract: (match) => ({
      recipients: match[1].split(/\s*(?:,|and)\s*/).map((s: string) => s.trim()).filter((s: string) => s),
    }),
    examples: [
      'divide the bill with alice and bob',
      'divide the check between alice, bob and charlie',
    ],
  },

  // ============ PAYMENT REQUESTS ============

  // REQUEST PAYMENT: "request $50 from alice"
  {
    pattern: /request\s+\$?([\d.]+)\s+(?:dollars?\s+)?from\s+(\w+)(?:\s+(?:for|reason)\s+(.+))?/i,
    action: 'request_payment',
    extract: (match) => ({
      amount: match[1],
      from: match[2],
      reason: match[3],
    }),
    examples: [
      'request $50 from alice',
      'request 25 from bob for dinner',
      'request $100 dollars from charlie',
    ],
  },

  // ASK FOR MONEY: "ask alice for $50"
  {
    pattern: /ask\s+(\w+)\s+for\s+\$?([\d.]+)(?:\s+(?:for|reason)\s+(.+))?/i,
    action: 'request_payment',
    extract: (match) => ({
      from: match[1],
      amount: match[2],
      reason: match[3],
    }),
    examples: [
      'ask alice for $50',
      'ask bob for 25 for lunch',
    ],
  },

  // LIST REQUESTS: "show my payment requests"
  {
    pattern: /(?:show|list)\s+(?:my\s+)?(?:payment\s+)?requests/i,
    action: 'list_requests',
    extract: () => ({}),
    examples: ['show my payment requests', 'list requests'],
  },

  // LIST MONEY OWED: "who owes me money"
  {
    pattern: /who\s+owes\s+me(?:\s+money)?/i,
    action: 'list_outgoing_requests',
    extract: () => ({}),
    examples: ['who owes me money', 'who owes me'],
  },

  // LIST WHAT I OWE: "what do I owe"
  {
    pattern: /what\s+do\s+I\s+owe/i,
    action: 'list_incoming_requests',
    extract: () => ({}),
    examples: ['what do I owe'],
  },

  // DECLINE REQUEST: "decline request req_abc123"
  {
    pattern: /decline\s+(?:payment\s+)?request\s+(\S+)(?:\s+(?:because|reason)\s+(.+))?/i,
    action: 'decline_request',
    extract: (match) => ({
      requestId: match[1],
      reason: match[2],
    }),
    examples: ['decline request req_abc123', 'decline request req_xyz because already paid'],
  },

  // ============ PAYMENT TEMPLATES ============

  // USE TEMPLATE: "add netflix subscription" or "use spotify template"
  {
    pattern: /(?:add|use|setup)\s+(\w+)\s+(?:subscription|template)/i,
    action: 'use_template',
    extract: (match) => ({
      templateId: match[1].toLowerCase(),
    }),
    examples: [
      'add netflix subscription',
      'use spotify template',
      'setup youtube subscription',
    ],
  },

  // ADD TEMPLATE WITH ADDRESS: "add netflix template to 0x123..."
  {
    pattern: /(?:add|use|setup)\s+(\w+)\s+(?:subscription|template)\s+(?:to|for)\s+(0x[a-fA-F0-9]{40}|\w+)/i,
    action: 'use_template',
    extract: (match) => ({
      templateId: match[1].toLowerCase(),
      address: match[2],
    }),
    examples: [
      'add netflix template to 0x742d35Cc6634C0532925a3b844Bc9e7595f5E123',
      'setup spotify subscription for alice',
    ],
  },

  // LIST TEMPLATES: "show available templates"
  {
    pattern: /(?:show|list)\s+(?:available\s+)?templates/i,
    action: 'list_templates',
    extract: () => ({}),
    examples: ['show available templates', 'list templates'],
  },

  // SEARCH TEMPLATES: "search templates for streaming"
  {
    pattern: /search\s+templates?\s+(?:for\s+)?(.+)/i,
    action: 'search_templates',
    extract: (match) => ({
      query: match[1],
    }),
    examples: ['search templates for streaming', 'search template music'],
  },
];

/**
 * Get all templates including custom ones
 *
 * @param custom - Custom templates to add
 * @returns Combined template list
 */
export function getTemplates(custom?: IntentTemplate[]): IntentTemplate[] {
  return [...builtInTemplates, ...(custom || [])];
}

/**
 * Get all example commands
 *
 * @returns Array of example commands
 */
export function getAllExamples(): string[] {
  return builtInTemplates.flatMap((t) => t.examples);
}
