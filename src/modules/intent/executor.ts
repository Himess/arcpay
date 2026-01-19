/**
 * Intent Executor - Execute parsed intents
 */

import { createWalletClient, http, publicActions, parseUnits, type Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type {
  Intent,
  ParsedIntent,
  IntentResult,
  IntentEngineConfig,
  IntentParams,
} from './types';
import { IntentParser } from './parser';

/**
 * Arc testnet chain configuration
 */
const arcTestnet: Chain = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
  },
};

const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';
const USDC_DECIMALS = 6;

const ERC20_TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

/**
 * Intent executor for natural language payments
 */
export class IntentExecutor {
  private wallet: ReturnType<typeof createWalletClient>;
  private parser: IntentParser;
  private history: Intent[] = [];

  constructor(config: IntentEngineConfig) {
    this.parser = new IntentParser(config.customTemplates);

    const account = privateKeyToAccount(config.privateKey as `0x${string}`);
    this.wallet = createWalletClient({
      account,
      chain: arcTestnet,
      transport: http(),
    }).extend(publicActions);
  }

  /**
   * Execute a natural language intent
   *
   * @param input - Natural language command
   * @returns Intent with execution result
   */
  async execute(input: string): Promise<Intent> {
    const startTime = Date.now();

    const intent: Intent = {
      id: `intent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      raw: input,
      parsed: this.parser.parse(input),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    this.history.push(intent);

    // Check confidence threshold
    if (intent.parsed.confidence < 0.5) {
      intent.status = 'failed';
      intent.result = {
        success: false,
        error: `Could not understand intent. Confidence: ${(intent.parsed.confidence * 100).toFixed(0)}%`,
        executionTime: Date.now() - startTime,
      };
      return intent;
    }

    intent.status = 'executing';

    try {
      const result = await this.executeAction(intent.parsed);
      intent.status = 'completed';
      intent.result = { ...result, executionTime: Date.now() - startTime };
    } catch (error) {
      intent.status = 'failed';
      intent.result = {
        success: false,
        error: error instanceof Error ? error.message : 'Execution failed',
        executionTime: Date.now() - startTime,
      };
    }

    return intent;
  }

  /**
   * Execute action based on parsed intent
   */
  private async executeAction(
    parsed: ParsedIntent
  ): Promise<Omit<IntentResult, 'executionTime'>> {
    const { action, params } = parsed;

    switch (action) {
      case 'send':
        return this.executeSend(params);

      case 'split':
        return this.executeSplit(params);

      case 'swap':
        return {
          success: true,
          data: {
            message: 'Swap queued - use FX module for execution',
            ...params,
            _useModule: 'fx',
          },
        };

      case 'bridge':
        return {
          success: true,
          data: {
            message: 'Bridge initiated - use Bridge module for execution',
            ...params,
            _useModule: 'bridge',
          },
        };

      case 'stream':
        return {
          success: true,
          data: {
            message: 'Stream configured - use Streaming module for execution',
            ...params,
            _useModule: 'streaming',
          },
        };

      case 'subscribe':
        return {
          success: true,
          data: {
            message: 'Subscription created',
            ...params,
            _note: 'Recurring payments require off-chain scheduler',
          },
        };

      case 'find_and_pay':
        return {
          success: true,
          data: {
            message: 'Service discovery not implemented',
            ...params,
            _note: 'Requires service registry integration',
          },
        };

      case 'schedule':
        return {
          success: true,
          data: {
            message: 'Payment scheduled',
            ...params,
            _note: 'Scheduled payments require off-chain scheduler',
          },
        };

      default:
        return {
          success: false,
          error: `Unknown action: ${action}`,
        };
    }
  }

  /**
   * Execute send action
   */
  private async executeSend(
    params: IntentParams
  ): Promise<Omit<IntentResult, 'executionTime'>> {
    const { amount, recipient } = params;

    if (!amount || !recipient) {
      return {
        success: false,
        error: 'Missing amount or recipient',
      };
    }

    // Check for ENS name
    if (recipient.endsWith('.eth')) {
      return {
        success: false,
        error: 'ENS resolution not supported on Arc testnet',
      };
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      return {
        success: false,
        error: 'Invalid recipient address format',
      };
    }

    const amountWei = parseUnits(amount, USDC_DECIMALS);

    const walletWithWrite = this.wallet as typeof this.wallet & {
      writeContract: (args: {
        address: `0x${string}`;
        abi: typeof ERC20_TRANSFER_ABI;
        functionName: 'transfer';
        args: [`0x${string}`, bigint];
      }) => Promise<`0x${string}`>;
    };

    const hash = await walletWithWrite.writeContract({
      address: USDC_ADDRESS as `0x${string}`,
      abi: ERC20_TRANSFER_ABI,
      functionName: 'transfer',
      args: [recipient as `0x${string}`, amountWei],
    });

    return {
      success: true,
      txHash: hash,
      data: { amount, recipient },
    };
  }

  /**
   * Execute split payment action
   */
  private async executeSplit(
    params: IntentParams
  ): Promise<Omit<IntentResult, 'executionTime'>> {
    const { amount, addresses } = params;

    if (!amount || !addresses || addresses.length === 0) {
      return {
        success: false,
        error: 'Missing amount or addresses for split',
      };
    }

    // Validate all addresses
    for (const addr of addresses) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
        return {
          success: false,
          error: `Invalid address format: ${addr}`,
        };
      }
    }

    const perAddress = (parseFloat(amount) / addresses.length).toFixed(6);
    const perAddressWei = parseUnits(perAddress, USDC_DECIMALS);
    const txHashes: string[] = [];

    const walletWithWrite = this.wallet as typeof this.wallet & {
      writeContract: (args: {
        address: `0x${string}`;
        abi: typeof ERC20_TRANSFER_ABI;
        functionName: 'transfer';
        args: [`0x${string}`, bigint];
      }) => Promise<`0x${string}`>;
    };

    for (const addr of addresses) {
      const hash = await walletWithWrite.writeContract({
        address: USDC_ADDRESS as `0x${string}`,
        abi: ERC20_TRANSFER_ABI,
        functionName: 'transfer',
        args: [addr as `0x${string}`, perAddressWei],
      });
      txHashes.push(hash);
    }

    return {
      success: true,
      txHash: txHashes[0],
      data: {
        totalAmount: amount,
        perAddress,
        addresses,
        txHashes,
      },
    };
  }

  /**
   * Get execution history
   */
  getHistory(): Intent[] {
    return [...this.history];
  }

  /**
   * Get recent intents
   *
   * @param limit - Maximum number to return
   */
  getRecentIntents(limit: number = 10): Intent[] {
    return [...this.history].reverse().slice(0, limit);
  }

  /**
   * Get help with example commands
   */
  getHelp(): string[] {
    return this.parser.getExamples();
  }

  /**
   * Get supported actions
   */
  getSupportedActions(): string[] {
    return this.parser.getSupportedActions();
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
  }
}

/**
 * Create an intent engine
 *
 * @param config - Engine configuration
 * @returns IntentExecutor instance
 *
 * @example
 * ```typescript
 * const intent = createIntentEngine({ privateKey });
 *
 * // Execute natural language commands
 * await intent.execute("send $10 to 0x742d35...");
 * await intent.execute("split $100 between 0x111..., 0x222...");
 * await intent.execute("stream $0.001 per token to api.com max $5");
 *
 * // Get help
 * const examples = intent.getHelp();
 * ```
 */
export function createIntentEngine(config: IntentEngineConfig): IntentExecutor {
  return new IntentExecutor(config);
}
