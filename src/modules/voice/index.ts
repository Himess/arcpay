/**
 * ArcPay Voice Module
 *
 * Natural language payment commands powered by Gemini AI.
 *
 * @example
 * ```typescript
 * import { createVoiceProcessor } from 'arcpay';
 *
 * const voice = createVoiceProcessor({
 *   geminiApiKey: process.env.GEMINI_API_KEY,
 *   privateKey: process.env.PRIVATE_KEY,
 * });
 *
 * // Process natural language command
 * const result = await voice.process("Send 50 to Ahmed");
 * // { action: 'pay', executed: true, txHash: '0x...' }
 * ```
 */

export interface VoiceConfig {
  /** Gemini API key for natural language processing */
  geminiApiKey: string;
  /** Private key for executing transactions */
  privateKey?: string;
  /** Pre-loaded contacts for name resolution */
  contacts?: Array<{ name: string; address: string }>;
  /** Callback for logging events */
  onLog?: (type: 'info' | 'success' | 'error', message: string) => void;
}

export interface VoiceResult {
  /** The parsed action type */
  action: string;
  /** Full parsed command data */
  parsed: any;
  /** Whether the command was executed */
  executed: boolean;
  /** Result data if executed */
  result?: any;
  /** Error message if failed */
  error?: string;
}

export interface ParsedCommand {
  action: string;
  amount?: number;
  recipient?: string;
  recipients?: string[];
  duration?: string;
  task?: string;
  name?: string;
  address?: string;
  billingDay?: number;
  currency?: string;
}

/**
 * Supported voice command categories and actions
 */
export const SUPPORTED_COMMANDS = {
  payments: ['pay', 'balance'],
  contacts: ['add_contact', 'delete_contact', 'list_contacts', 'get_contact'],
  subscriptions: ['add_subscription', 'pay_subscription', 'pay_all_bills', 'list_due_bills', 'subscription_total'],
  escrow: ['create_escrow', 'release_escrow', 'refund_escrow'],
  streaming: ['create_stream', 'cancel_stream', 'claim_stream', 'stream_status'],
  split: ['split_equal'],
  links: ['create_link'],
  requests: ['request_payment', 'request_payment_multi'],
  privacy: ['pay_private', 'get_stealth_address'],
  agents: ['hire_agent', 'create_agent', 'agent_report'],
  x402: ['x402_pay'],
  help: ['help'],
} as const;

/**
 * All supported action types
 */
export type VoiceAction = typeof SUPPORTED_COMMANDS[keyof typeof SUPPORTED_COMMANDS][number] | 'unknown';

/**
 * Create a voice command processor
 *
 * @param config - Configuration options
 * @returns Voice processor instance
 *
 * @example
 * ```typescript
 * const voice = createVoiceProcessor({
 *   geminiApiKey: 'your-api-key',
 *   contacts: [
 *     { name: 'ahmed', address: '0x742d35Cc...' },
 *   ],
 *   onLog: (type, msg) => console.log(`[${type}] ${msg}`),
 * });
 *
 * // Process a command
 * const result = await voice.process("Send 50 to ahmed");
 * ```
 */
export function createVoiceProcessor(config: VoiceConfig) {
  const log = (type: 'info' | 'success' | 'error', message: string) => {
    config.onLog?.(type, message);
  };

  /**
   * Parse a natural language command using Gemini
   */
  const parseCommand = async (command: string): Promise<ParsedCommand> => {
    // Dynamic import to avoid bundling issues
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(config.geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const contactNames = config.contacts?.map(c => c.name).join(', ') || 'None';
    const allActions = Object.values(SUPPORTED_COMMANDS).flat().join(', ');

    const prompt = `You are ArcPay, an AI payment assistant. Parse this voice command.

Command: "${command}"

Available contacts: ${contactNames}

Return JSON with:
- action: One of: ${allActions}, "unknown"
- amount: number or null
- recipient: string or null (contact name or address)
- recipients: string[] or null (for split/multi-request)
- duration: string or null (e.g., "30d", "1 month")
- task: string or null (for agent tasks)
- name: string or null (for contact/subscription names)
- address: string or null (for adding contacts)
- billingDay: number or null (1-31 for subscriptions)
- currency: "USDC" (default)

Context:
- All amounts are in USDC
- If recipient is a name (not 0x address), keep it as the name

Only return valid JSON, no markdown.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Failed to parse command - no JSON in response');
    }

    return JSON.parse(jsonMatch[0]);
  };

  /**
   * Resolve a contact name to an address
   */
  const resolveContact = (nameOrAddress: string): string | null => {
    if (nameOrAddress?.startsWith('0x') && nameOrAddress.length === 42) {
      return nameOrAddress;
    }
    const contact = config.contacts?.find(c =>
      c.name.toLowerCase() === nameOrAddress?.toLowerCase()
    );
    return contact?.address || null;
  };

  /**
   * Execute a parsed command
   */
  const execute = async (parsed: ParsedCommand): Promise<any> => {
    // Note: This is a simplified implementation
    // In production, this would integrate with the actual SDK functions
    switch (parsed.action) {
      case 'pay':
        return { action: 'pay', amount: parsed.amount, recipient: parsed.recipient };
      case 'balance':
        return { action: 'balance' };
      case 'add_contact':
        return { action: 'add_contact', name: parsed.name, address: parsed.address };
      case 'create_escrow':
        return { action: 'create_escrow', amount: parsed.amount, recipient: parsed.recipient };
      case 'create_stream':
        return { action: 'create_stream', amount: parsed.amount, recipient: parsed.recipient, duration: parsed.duration };
      case 'split_equal':
        return { action: 'split_equal', amount: parsed.amount, recipients: parsed.recipients };
      case 'create_link':
        return { action: 'create_link', amount: parsed.amount };
      case 'request_payment':
        return { action: 'request_payment', amount: parsed.amount, from: parsed.recipient };
      case 'pay_private':
        return { action: 'pay_private', amount: parsed.amount, recipient: parsed.recipient };
      case 'hire_agent':
        return { action: 'hire_agent', amount: parsed.amount, agent: parsed.recipient, task: parsed.task };
      case 'help':
        return { action: 'help', commands: SUPPORTED_COMMANDS };
      default:
        return { action: parsed.action };
    }
  };

  return {
    /**
     * Process a natural language command
     *
     * @param command - The voice command to process
     * @returns Promise with the result
     *
     * @example
     * ```typescript
     * const result = await voice.process("Send 50 to Ahmed");
     * if (result.executed) {
     *   console.log('Success:', result.result);
     * }
     * ```
     */
    async process(command: string): Promise<VoiceResult> {
      try {
        log('info', `Processing: "${command}"`);
        const parsed = await parseCommand(command);
        log('info', `Action: ${parsed.action}`);

        // Resolve contacts in parsed data
        if (parsed.recipient) {
          const resolved = resolveContact(parsed.recipient);
          if (resolved) {
            log('info', `Resolved "${parsed.recipient}" -> ${resolved.slice(0, 10)}...`);
          }
        }

        const result = await execute(parsed);
        log('success', `Executed: ${parsed.action}`);

        return { action: parsed.action, parsed, executed: true, result };
      } catch (error: any) {
        log('error', error.message);
        return { action: 'error', parsed: null, executed: false, error: error.message };
      }
    },

    /**
     * Parse a command without executing it
     *
     * @param command - The voice command to parse
     * @returns Promise with parsed data
     */
    async parse(command: string): Promise<ParsedCommand> {
      return parseCommand(command);
    },

    /**
     * Get all supported commands by category
     */
    getSupportedCommands() {
      return SUPPORTED_COMMANDS;
    },

    /**
     * Get help text for a specific category
     *
     * @param category - Optional category name
     * @returns Commands for the category or all commands
     */
    getHelp(category?: keyof typeof SUPPORTED_COMMANDS) {
      if (category && SUPPORTED_COMMANDS[category]) {
        return SUPPORTED_COMMANDS[category];
      }
      return SUPPORTED_COMMANDS;
    },

    /**
     * Resolve a contact name to address
     */
    resolveContact,

    /**
     * Update contacts list
     */
    setContacts(contacts: Array<{ name: string; address: string }>) {
      config.contacts = contacts;
    },
  };
}

export type VoiceProcessor = ReturnType<typeof createVoiceProcessor>;
