/**
 * Command Parser (Fallback)
 *
 * Parses natural language commands into structured commands.
 * Used as fallback when Gemini function calling is not available.
 */

import { GeminiClient } from './gemini-client';

// ============ Types ============

export interface ParsedCommand {
  action: CommandAction;
  confidence: number;
  params: CommandParams;
  originalText: string;
  suggestions?: string[];
}

export type CommandAction =
  | 'pay'
  | 'create_escrow'
  | 'release_escrow'
  | 'refund_escrow'
  | 'create_stream'
  | 'cancel_stream'
  | 'hire_agent'
  | 'approve_work'
  | 'pay_private'
  | 'get_balance'
  | 'get_report'
  | 'whitelist'
  | 'blacklist'
  | 'pay_invoice'
  | 'subscribe'
  | 'unknown';

export interface CommandParams {
  recipient?: string;
  amount?: string;
  currency?: string;
  memo?: string;
  duration?: string;
  task?: string;
  escrowId?: string;
  streamId?: string;
  workId?: string;
  interval?: string;
  address?: string;
  [key: string]: unknown;
}

// ============ Patterns ============

const INTENT_PATTERNS: Array<{
  pattern: RegExp;
  action: CommandAction;
  extractParams: (match: RegExpMatchArray) => CommandParams;
}> = [
  // Pay patterns
  {
    pattern: /(?:send|pay|transfer)\s+(\d+(?:\.\d+)?)\s*(?:usdc|dollars?|usd)?\s+(?:to\s+)?(.+)/i,
    action: 'pay',
    extractParams: (match) => ({
      amount: match[1],
      recipient: match[2].trim(),
      currency: 'USDC'
    })
  },
  {
    pattern: /(?:send|pay|transfer)\s+(.+?)\s+(\d+(?:\.\d+)?)\s*(?:usdc|dollars?|usd)?/i,
    action: 'pay',
    extractParams: (match) => ({
      recipient: match[1].trim(),
      amount: match[2],
      currency: 'USDC'
    })
  },

  // Escrow patterns
  {
    pattern: /(?:create|start|open)\s+(?:an?\s+)?escrow\s+(?:for\s+)?(\d+(?:\.\d+)?)\s*(?:usdc)?\s+(?:to|for)\s+(.+)/i,
    action: 'create_escrow',
    extractParams: (match) => ({
      amount: match[1],
      recipient: match[2].trim()
    })
  },
  {
    pattern: /release\s+escrow\s+(.+)/i,
    action: 'release_escrow',
    extractParams: (match) => ({
      escrowId: match[1].trim()
    })
  },
  {
    pattern: /refund\s+escrow\s+(.+)/i,
    action: 'refund_escrow',
    extractParams: (match) => ({
      escrowId: match[1].trim()
    })
  },

  // Stream patterns
  {
    pattern: /(?:start|create)\s+(?:a\s+)?stream\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*(?:usdc)?\s+(?:to\s+)?(.+?)\s+(?:over|for)\s+(.+)/i,
    action: 'create_stream',
    extractParams: (match) => ({
      amount: match[1],
      recipient: match[2].trim(),
      duration: match[3].trim()
    })
  },
  {
    pattern: /cancel\s+stream\s+(.+)/i,
    action: 'cancel_stream',
    extractParams: (match) => ({
      streamId: match[1].trim()
    })
  },

  // Hire agent patterns
  {
    pattern: /hire\s+(.+?)\s+(?:to|for)\s+(.+?)\s+(?:for\s+)?(\d+(?:\.\d+)?)\s*(?:usdc|dollars?)?/i,
    action: 'hire_agent',
    extractParams: (match) => ({
      recipient: match[1].trim(),
      task: match[2].trim(),
      amount: match[3]
    })
  },
  {
    pattern: /approve\s+(?:work|task)\s+(.+)/i,
    action: 'approve_work',
    extractParams: (match) => ({
      workId: match[1].trim()
    })
  },

  // Balance and report
  {
    pattern: /(?:check|get|show|what(?:'s| is))\s+(?:my\s+)?balance/i,
    action: 'get_balance',
    extractParams: () => ({})
  },
  {
    pattern: /(?:spending|expense)\s+report/i,
    action: 'get_report',
    extractParams: () => ({})
  },

  // Whitelist/Blacklist
  {
    pattern: /(?:add|whitelist)\s+(.+?)\s+(?:to\s+)?whitelist/i,
    action: 'whitelist',
    extractParams: (match) => ({
      address: match[1].trim()
    })
  },
  {
    pattern: /(?:block|blacklist|ban)\s+(.+)/i,
    action: 'blacklist',
    extractParams: (match) => ({
      address: match[1].trim()
    })
  },

  // Invoice
  {
    pattern: /pay\s+(?:this\s+)?invoice/i,
    action: 'pay_invoice',
    extractParams: () => ({})
  },

  // Subscribe
  {
    pattern: /subscribe\s+(?:to\s+)?(.+?)\s+(?:for\s+)?(\d+(?:\.\d+)?)\s*(?:usdc)?\s+(?:per\s+)?(daily|weekly|monthly|yearly)/i,
    action: 'subscribe',
    extractParams: (match) => ({
      recipient: match[1].trim(),
      amount: match[2],
      interval: match[3].toLowerCase()
    })
  }
];

// ============ Intent Parser Class ============

export class CommandParser {
  private gemini: GeminiClient | null = null;

  constructor(geminiClient?: GeminiClient) {
    this.gemini = geminiClient || null;
  }

  /**
   * Parse a natural language command into structured intent
   */
  async parse(text: string): Promise<ParsedCommand> {
    // First try pattern matching (fast)
    const patternResult = this.parseWithPatterns(text);

    if (patternResult.confidence >= 0.8) {
      return patternResult;
    }

    // If pattern matching is not confident enough, try Gemini
    if (this.gemini) {
      try {
        const geminiResult = await this.parseWithGemini(text);

        // Use Gemini result if more confident
        if (geminiResult.confidence > patternResult.confidence) {
          return geminiResult;
        }
      } catch {
        // Fall back to pattern result on error
      }
    }

    return patternResult;
  }

  /**
   * Parse using regex patterns (fast, offline)
   */
  parseWithPatterns(text: string): ParsedCommand {
    const normalizedText = text.toLowerCase().trim();

    for (const { pattern, action, extractParams } of INTENT_PATTERNS) {
      const match = normalizedText.match(pattern);

      if (match) {
        return {
          action,
          confidence: 0.85,
          params: extractParams(match),
          originalText: text
        };
      }
    }

    return {
      action: 'unknown',
      confidence: 0,
      params: {},
      originalText: text,
      suggestions: [
        'Try "send 50 USDC to 0x..."',
        'Try "check my balance"',
        'Try "create escrow for 100 USDC to 0x..."'
      ]
    };
  }

  /**
   * Parse using Gemini AI (more accurate, requires API)
   */
  async parseWithGemini(text: string): Promise<ParsedCommand> {
    if (!this.gemini) {
      throw new Error('Gemini client not initialized');
    }

    const prompt = `Parse the following payment command and extract the intent.

Command: "${text}"

Respond with JSON only:
{
  "action": "pay" | "create_escrow" | "release_escrow" | "refund_escrow" | "create_stream" | "cancel_stream" | "hire_agent" | "approve_work" | "pay_private" | "get_balance" | "get_report" | "whitelist" | "blacklist" | "pay_invoice" | "subscribe" | "unknown",
  "confidence": 0.0-1.0,
  "params": {
    "recipient": "address or alias if mentioned",
    "amount": "numeric amount if mentioned",
    "currency": "currency if mentioned (default USDC)",
    "memo": "any memo or description",
    "duration": "time duration if mentioned",
    "task": "task description if hiring",
    "escrowId": "escrow ID if mentioned",
    "streamId": "stream ID if mentioned",
    "interval": "billing interval if subscribing"
  }
}

Only include params that are explicitly mentioned in the command.`;

    const result = await this.gemini.generateJSON<{
      action: CommandAction;
      confidence: number;
      params: CommandParams;
    }>(prompt);

    return {
      ...result,
      originalText: text
    };
  }

  /**
   * Validate parsed intent params
   */
  validateIntent(intent: ParsedCommand): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (intent.action) {
      case 'pay':
      case 'pay_private':
        if (!intent.params.recipient) errors.push('Recipient is required');
        if (!intent.params.amount) errors.push('Amount is required');
        break;

      case 'create_escrow':
        if (!intent.params.recipient) errors.push('Beneficiary is required');
        if (!intent.params.amount) errors.push('Amount is required');
        break;

      case 'release_escrow':
      case 'refund_escrow':
        if (!intent.params.escrowId) errors.push('Escrow ID is required');
        break;

      case 'create_stream':
        if (!intent.params.recipient) errors.push('Recipient is required');
        if (!intent.params.amount) errors.push('Amount is required');
        if (!intent.params.duration) errors.push('Duration is required');
        break;

      case 'cancel_stream':
        if (!intent.params.streamId) errors.push('Stream ID is required');
        break;

      case 'hire_agent':
        if (!intent.params.recipient) errors.push('Agent address is required');
        if (!intent.params.task) errors.push('Task description is required');
        if (!intent.params.amount) errors.push('Payment amount is required');
        break;

      case 'approve_work':
        if (!intent.params.workId) errors.push('Work ID is required');
        break;

      case 'whitelist':
      case 'blacklist':
        if (!intent.params.address) errors.push('Address is required');
        break;

      case 'subscribe':
        if (!intent.params.recipient) errors.push('Merchant is required');
        if (!intent.params.amount) errors.push('Amount is required');
        if (!intent.params.interval) errors.push('Billing interval is required');
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// ============ Factory ============

export function createCommandParser(geminiClient?: GeminiClient): CommandParser {
  return new CommandParser(geminiClient);
}
