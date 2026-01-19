/**
 * Transaction Explainer
 *
 * Converts blockchain transactions into human-readable explanations.
 * Uses Gemini to generate natural language summaries.
 */

import { GeminiClient } from './gemini-client';

// ============ Types ============

export interface TransactionData {
  hash: string;
  from: string;
  to: string;
  value?: string;
  data?: string;
  gasUsed?: string;
  gasPrice?: string;
  status?: 'success' | 'failed' | 'pending';
  timestamp?: number;
  blockNumber?: number;
  type?: TransactionType;
  decoded?: DecodedTransaction;
}

export type TransactionType =
  | 'transfer'
  | 'escrow_create'
  | 'escrow_release'
  | 'escrow_refund'
  | 'stream_create'
  | 'stream_cancel'
  | 'stream_claim'
  | 'channel_open'
  | 'channel_close'
  | 'agent_hire'
  | 'agent_approve'
  | 'stealth_payment'
  | 'approval'
  | 'unknown';

export interface DecodedTransaction {
  functionName: string;
  args: Record<string, unknown>;
}

export interface TransactionExplanation {
  summary: string;
  details: string;
  type: TransactionType;
  parties: {
    sender: string;
    senderLabel?: string;
    receiver: string;
    receiverLabel?: string;
  };
  amounts?: {
    value: string;
    currency: string;
    usdValue?: string;
  };
  fees?: {
    gas: string;
    usdValue?: string;
  };
  timeline?: string;
  warnings?: string[];
  relatedActions?: string[];
}

// ============ Known Addresses ============

const KNOWN_ADDRESSES: Record<string, string> = {
  '0x0000000000000000000000000000000000000000': 'Null Address',
  // Add more known addresses like contracts, popular wallets, etc.
};

// ============ Function Signatures ============

const FUNCTION_SIGNATURES: Record<string, { name: string; type: TransactionType }> = {
  '0xa9059cbb': { name: 'transfer', type: 'transfer' },
  '0x23b872dd': { name: 'transferFrom', type: 'transfer' },
  '0x095ea7b3': { name: 'approve', type: 'approval' },
  // Escrow
  '0x2e1a7d4d': { name: 'createEscrow', type: 'escrow_create' },
  '0x86d1a69f': { name: 'releaseEscrow', type: 'escrow_release' },
  '0x590e1ae3': { name: 'refundEscrow', type: 'escrow_refund' },
  // Streams
  '0x1a695230': { name: 'createStream', type: 'stream_create' },
  '0x40c10f19': { name: 'cancelStream', type: 'stream_cancel' },
  '0x4e71d92d': { name: 'claimFromStream', type: 'stream_claim' },
  // Channels
  '0x5c975abb': { name: 'openChannel', type: 'channel_open' },
  '0x8456cb59': { name: 'closeChannel', type: 'channel_close' },
  // Agent
  '0x3ccfd60b': { name: 'hireAgent', type: 'agent_hire' },
  '0x4e71e0c8': { name: 'approveWork', type: 'agent_approve' },
};

// ============ Transaction Explainer Class ============

export class TransactionExplainer {
  private gemini: GeminiClient | null = null;
  private addressLabels: Map<string, string>;

  constructor(geminiClient?: GeminiClient) {
    this.gemini = geminiClient || null;
    this.addressLabels = new Map(Object.entries(KNOWN_ADDRESSES));
  }

  /**
   * Add custom address labels
   */
  addAddressLabel(address: string, label: string): void {
    this.addressLabels.set(address.toLowerCase(), label);
  }

  /**
   * Get label for an address
   */
  getAddressLabel(address: string): string | undefined {
    return this.addressLabels.get(address.toLowerCase());
  }

  /**
   * Explain a transaction in human-readable format
   */
  async explain(tx: TransactionData): Promise<TransactionExplanation> {
    // Detect transaction type
    const type = this.detectTransactionType(tx);

    // Build basic explanation
    const basicExplanation = this.buildBasicExplanation(tx, type);

    // If Gemini is available, enhance with AI
    if (this.gemini) {
      try {
        return await this.enhanceWithAI(tx, basicExplanation);
      } catch {
        // Fall back to basic explanation
      }
    }

    return basicExplanation;
  }

  /**
   * Detect transaction type from data
   */
  private detectTransactionType(tx: TransactionData): TransactionType {
    if (tx.type) return tx.type;

    if (tx.decoded?.functionName) {
      const sig = Object.entries(FUNCTION_SIGNATURES).find(
        ([, info]) => info.name === tx.decoded?.functionName
      );
      if (sig) return sig[1].type;
    }

    if (tx.data && tx.data.length >= 10) {
      const selector = tx.data.slice(0, 10);
      const sigInfo = FUNCTION_SIGNATURES[selector];
      if (sigInfo) return sigInfo.type;
    }

    if (tx.value && BigInt(tx.value) > 0n && (!tx.data || tx.data === '0x')) {
      return 'transfer';
    }

    return 'unknown';
  }

  /**
   * Build basic explanation without AI
   */
  private buildBasicExplanation(
    tx: TransactionData,
    type: TransactionType
  ): TransactionExplanation {
    const senderLabel = this.getAddressLabel(tx.from);
    const receiverLabel = this.getAddressLabel(tx.to);

    const explanation: TransactionExplanation = {
      summary: this.getSummary(tx, type),
      details: this.getDetails(tx, type),
      type,
      parties: {
        sender: tx.from,
        senderLabel,
        receiver: tx.to,
        receiverLabel
      }
    };

    if (tx.value) {
      explanation.amounts = {
        value: tx.value,
        currency: 'USDC'
      };
    }

    if (tx.gasUsed && tx.gasPrice) {
      const gasCost = BigInt(tx.gasUsed) * BigInt(tx.gasPrice);
      explanation.fees = {
        gas: gasCost.toString()
      };
    }

    if (tx.timestamp) {
      explanation.timeline = new Date(tx.timestamp * 1000).toLocaleString();
    }

    return explanation;
  }

  /**
   * Get summary based on transaction type
   */
  private getSummary(tx: TransactionData, type: TransactionType): string {
    const receiver = this.getAddressLabel(tx.to) || this.shortenAddress(tx.to);
    const amount = tx.decoded?.args?.amount || tx.value || 'unknown';

    switch (type) {
      case 'transfer':
        return `Sent ${amount} USDC to ${receiver}`;
      case 'escrow_create':
        return `Created escrow for ${amount} USDC`;
      case 'escrow_release':
        return `Released escrow funds`;
      case 'escrow_refund':
        return `Refunded escrow`;
      case 'stream_create':
        return `Started payment stream to ${receiver}`;
      case 'stream_cancel':
        return `Cancelled payment stream`;
      case 'stream_claim':
        return `Claimed from payment stream`;
      case 'channel_open':
        return `Opened payment channel with ${receiver}`;
      case 'channel_close':
        return `Closed payment channel`;
      case 'agent_hire':
        return `Hired agent ${receiver}`;
      case 'agent_approve':
        return `Approved agent work`;
      case 'stealth_payment':
        return `Sent private payment`;
      case 'approval':
        return `Approved token spending`;
      default:
        return `Transaction to ${receiver}`;
    }
  }

  /**
   * Get detailed description
   */
  private getDetails(tx: TransactionData, type: TransactionType): string {
    const status = tx.status === 'success' ? 'completed successfully' :
                   tx.status === 'failed' ? 'failed' : 'pending';

    let details = `This transaction ${status}.`;

    if (tx.blockNumber) {
      details += ` Confirmed in block ${tx.blockNumber}.`;
    }

    switch (type) {
      case 'escrow_create':
        details += ' Funds are held securely until conditions are met.';
        break;
      case 'stream_create':
        details += ' Funds will be streamed continuously over the specified period.';
        break;
      case 'stealth_payment':
        details += ' The recipient address is hidden using stealth address technology.';
        break;
    }

    return details;
  }

  /**
   * Enhance explanation with AI
   */
  private async enhanceWithAI(
    tx: TransactionData,
    basic: TransactionExplanation
  ): Promise<TransactionExplanation> {
    if (!this.gemini) return basic;

    const prompt = `Explain this blockchain transaction in simple terms:

Transaction:
- Type: ${basic.type}
- From: ${tx.from}${basic.parties.senderLabel ? ` (${basic.parties.senderLabel})` : ''}
- To: ${tx.to}${basic.parties.receiverLabel ? ` (${basic.parties.receiverLabel})` : ''}
- Value: ${tx.value || 'N/A'}
- Status: ${tx.status || 'unknown'}
- Function: ${tx.decoded?.functionName || 'N/A'}
- Args: ${tx.decoded?.args ? JSON.stringify(tx.decoded.args) : 'N/A'}

Provide a JSON response:
{
  "summary": "One sentence summary",
  "details": "2-3 sentence detailed explanation",
  "warnings": ["any security concerns or unusual aspects"],
  "relatedActions": ["suggested follow-up actions"]
}`;

    try {
      const aiResponse = await this.gemini.generateJSON<{
        summary: string;
        details: string;
        warnings?: string[];
        relatedActions?: string[];
      }>(prompt);

      return {
        ...basic,
        summary: aiResponse.summary || basic.summary,
        details: aiResponse.details || basic.details,
        warnings: aiResponse.warnings,
        relatedActions: aiResponse.relatedActions
      };
    } catch {
      return basic;
    }
  }

  /**
   * Shorten address for display
   */
  private shortenAddress(address: string): string {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Explain multiple transactions
   */
  async explainBatch(transactions: TransactionData[]): Promise<TransactionExplanation[]> {
    return Promise.all(transactions.map(tx => this.explain(tx)));
  }

  /**
   * Generate a summary for multiple transactions
   */
  async summarizeActivity(transactions: TransactionData[]): Promise<string> {
    if (transactions.length === 0) return 'No recent activity.';

    const explanations = await this.explainBatch(transactions);

    if (!this.gemini) {
      // Simple summary without AI
      const totalSent = explanations
        .filter(e => e.type === 'transfer' && e.amounts)
        .reduce((sum, e) => sum + parseFloat(e.amounts?.value || '0'), 0);

      return `${transactions.length} transactions. Total sent: ${totalSent} USDC.`;
    }

    // AI-powered summary
    const prompt = `Summarize this transaction activity in 2-3 sentences:

${explanations.map(e => `- ${e.summary}`).join('\n')}

Focus on: total amounts, types of transactions, and any patterns.`;

    return this.gemini.generate(prompt);
  }
}

// ============ Factory ============

export function createTransactionExplainer(geminiClient?: GeminiClient): TransactionExplainer {
  return new TransactionExplainer(geminiClient);
}
