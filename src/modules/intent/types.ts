/**
 * Intent Engine types - Natural language payment commands
 */

/**
 * Intent representing a parsed user command
 */
export interface Intent {
  /** Unique intent ID */
  id: string;
  /** Original natural language input */
  raw: string;
  /** Parsed intent details */
  parsed: ParsedIntent;
  /** Execution status */
  status: 'pending' | 'executing' | 'completed' | 'failed';
  /** Execution result */
  result?: IntentResult;
  /** Creation timestamp */
  createdAt: string;
}

/**
 * Parsed intent structure
 */
export interface ParsedIntent {
  /** Detected action type */
  action: IntentAction;
  /** Extracted parameters */
  params: IntentParams;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Supported intent actions
 */
export type IntentAction =
  | 'send' // Send USDC to address
  | 'swap' // Swap tokens
  | 'subscribe' // Create subscription
  | 'stream' // Start payment stream
  | 'bridge' // Cross-chain transfer
  | 'split' // Split payment
  | 'schedule' // Scheduled payment
  | 'find_and_pay' // Find service and pay
  | 'add_contact' // Add a new contact
  | 'delete_contact' // Delete a contact
  | 'list_contacts' // List all contacts
  | 'lookup_contact' // Lookup a contact
  | 'pay_bill' // Pay a saved bill/subscription
  | 'send_to_contact' // Send to a contact by name
  | 'add_subscription' // Add a subscription
  | 'check_due_bills' // Check due bills
  | 'list_upcoming_bills' // List upcoming bills
  | 'check_overdue' // Check overdue subscriptions
  | 'pay_all_due' // Pay all due subscriptions
  | 'snooze_subscription' // Snooze a subscription
  | 'subscription_total' // Get subscription total
  | 'list_subscriptions' // List all subscriptions
  // Payment Links
  | 'create_link' // Create a payment link
  | 'pay_link' // Pay a payment link
  | 'list_links' // List payment links
  | 'cancel_link' // Cancel a payment link
  // Split Payment
  | 'split_payment' // Split payment between contacts
  | 'split_bill' // Divide a bill
  // Payment Requests
  | 'request_payment' // Request payment from someone
  | 'list_requests' // List payment requests
  | 'list_incoming_requests' // List what I owe
  | 'list_outgoing_requests' // List who owes me
  | 'decline_request' // Decline a payment request
  // Templates
  | 'use_template' // Use a payment template
  | 'list_templates' // List available templates
  | 'search_templates' // Search templates
  | 'unknown';

/**
 * Intent parameters
 */
export interface IntentParams {
  /** Payment amount */
  amount?: string;
  /** Recipient address or name */
  recipient?: string;
  /** Token type (USDC, EURC, etc.) */
  token?: string;
  /** Payment frequency */
  frequency?: 'once' | 'daily' | 'weekly' | 'monthly';
  /** Duration for recurring payments */
  duration?: string;
  /** Maximum price willing to pay */
  maxPrice?: string;
  /** Service name or URL */
  service?: string;
  /** Search query */
  query?: string;
  /** Multiple addresses for split */
  addresses?: string[];
  /** Target chain */
  chain?: string;
  /** Conditional expression */
  condition?: string;
  /** Contact name (for contact operations) */
  name?: string;
  /** Contact address (for add_contact) */
  address?: string;
  /** Billing day of month (1-31) for subscriptions */
  billingDay?: number;
  /** Time period (today, week, month) */
  period?: string;
  /** Number of days (for snooze) */
  days?: number;
  // Payment Links
  /** Payment link ID */
  linkId?: string;
  /** Description for payment links */
  description?: string;
  // Split Payment
  /** Recipients for split payment */
  recipients?: string[];
  // Payment Requests
  /** Who to request payment from */
  from?: string;
  /** Reason for request */
  reason?: string;
  /** Request ID */
  requestId?: string;
  // Templates
  /** Template ID */
  templateId?: string;
}

/**
 * Intent execution result
 */
export interface IntentResult {
  /** Whether execution succeeded */
  success: boolean;
  /** Transaction hash (if applicable) */
  txHash?: string;
  /** Additional result data */
  data?: unknown;
  /** Error message (if failed) */
  error?: string;
  /** Execution time in ms */
  executionTime: number;
}

/**
 * Intent template for pattern matching
 */
export interface IntentTemplate {
  /** Regex pattern to match */
  pattern: RegExp;
  /** Action type for this pattern */
  action: IntentAction;
  /** Function to extract params from match */
  extract: (match: RegExpMatchArray) => IntentParams;
  /** Example commands */
  examples: string[];
}

/**
 * Intent engine configuration
 */
export interface IntentEngineConfig {
  /** Custom templates to add */
  customTemplates?: IntentTemplate[];
  /** Wallet private key for execution */
  privateKey: string;
  /** Default settings */
  defaults?: {
    /** Default max price */
    maxPrice?: string;
    /** Default token */
    token?: string;
    /** Default chain */
    chain?: string;
  };
}
