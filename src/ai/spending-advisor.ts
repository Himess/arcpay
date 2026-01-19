/**
 * Spending Advisor
 *
 * AI-powered spending recommendations and budget analysis.
 * Uses Gemini to provide personalized financial insights.
 */

import { GeminiClient } from './gemini-client';

// ============ Types ============

export interface SpendingData {
  transactions: TransactionRecord[];
  balance: string;
  period?: 'day' | 'week' | 'month';
  budget?: BudgetInfo;
}

export interface TransactionRecord {
  id: string;
  type: 'payment' | 'escrow' | 'stream' | 'channel' | 'received';
  amount: string;
  recipient?: string;
  sender?: string;
  category?: string;
  timestamp: number;
  memo?: string;
}

export interface BudgetInfo {
  daily?: string;
  weekly?: string;
  monthly?: string;
  categories?: Record<string, string>;
}

export interface SpendingAnalysis {
  totalSpent: string;
  totalReceived: string;
  netFlow: string;
  byCategory: Record<string, string>;
  byType: Record<string, string>;
  topRecipients: Array<{ address: string; total: string; count: number }>;
  trend: 'increasing' | 'decreasing' | 'stable';
  averageTransaction: string;
}

export interface SpendingAdvice {
  summary: string;
  insights: string[];
  warnings: string[];
  recommendations: string[];
  budgetStatus?: BudgetStatus;
  savingsOpportunities?: string[];
}

export interface BudgetStatus {
  dailyUsed: string;
  dailyRemaining: string;
  dailyPercentage: number;
  weeklyUsed?: string;
  weeklyRemaining?: string;
  weeklyPercentage?: number;
  monthlyUsed?: string;
  monthlyRemaining?: string;
  monthlyPercentage?: number;
  onTrack: boolean;
}

// ============ Spending Advisor Class ============

export class SpendingAdvisor {
  private gemini: GeminiClient | null = null;

  constructor(geminiClient?: GeminiClient) {
    this.gemini = geminiClient || null;
  }

  /**
   * Analyze spending patterns
   */
  analyzeSpending(data: SpendingData): SpendingAnalysis {
    const { transactions } = data;

    // Calculate totals
    let totalSpent = 0;
    let totalReceived = 0;
    const byCategory: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const recipientTotals: Record<string, { total: number; count: number }> = {};

    for (const tx of transactions) {
      const amount = parseFloat(tx.amount);

      if (tx.type === 'received') {
        totalReceived += amount;
      } else {
        totalSpent += amount;

        // By category
        const category = tx.category || 'uncategorized';
        byCategory[category] = (byCategory[category] || 0) + amount;

        // By type
        byType[tx.type] = (byType[tx.type] || 0) + amount;

        // Top recipients
        if (tx.recipient) {
          if (!recipientTotals[tx.recipient]) {
            recipientTotals[tx.recipient] = { total: 0, count: 0 };
          }
          recipientTotals[tx.recipient].total += amount;
          recipientTotals[tx.recipient].count += 1;
        }
      }
    }

    // Calculate trend (compare first half vs second half)
    const midpoint = Math.floor(transactions.length / 2);
    const firstHalf = transactions.slice(0, midpoint);
    const secondHalf = transactions.slice(midpoint);

    const firstHalfTotal = firstHalf
      .filter(tx => tx.type !== 'received')
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

    const secondHalfTotal = secondHalf
      .filter(tx => tx.type !== 'received')
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (secondHalfTotal > firstHalfTotal * 1.1) trend = 'increasing';
    else if (secondHalfTotal < firstHalfTotal * 0.9) trend = 'decreasing';

    // Top recipients
    const topRecipients = Object.entries(recipientTotals)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([address, data]) => ({
        address,
        total: data.total.toFixed(2),
        count: data.count
      }));

    const outgoingTx = transactions.filter(tx => tx.type !== 'received');
    const averageTransaction = outgoingTx.length > 0
      ? (totalSpent / outgoingTx.length).toFixed(2)
      : '0';

    return {
      totalSpent: totalSpent.toFixed(2),
      totalReceived: totalReceived.toFixed(2),
      netFlow: (totalReceived - totalSpent).toFixed(2),
      byCategory: Object.fromEntries(
        Object.entries(byCategory).map(([k, v]) => [k, v.toFixed(2)])
      ),
      byType: Object.fromEntries(
        Object.entries(byType).map(([k, v]) => [k, v.toFixed(2)])
      ),
      topRecipients,
      trend,
      averageTransaction
    };
  }

  /**
   * Calculate budget status
   */
  calculateBudgetStatus(data: SpendingData): BudgetStatus | null {
    if (!data.budget) return null;

    const analysis = this.analyzeSpending(data);
    const spent = parseFloat(analysis.totalSpent);

    const status: BudgetStatus = {
      dailyUsed: '0',
      dailyRemaining: '0',
      dailyPercentage: 0,
      onTrack: true
    };

    if (data.budget.daily) {
      const daily = parseFloat(data.budget.daily);
      status.dailyUsed = spent.toFixed(2);
      status.dailyRemaining = Math.max(0, daily - spent).toFixed(2);
      status.dailyPercentage = Math.min(100, (spent / daily) * 100);

      if (status.dailyPercentage > 90) status.onTrack = false;
    }

    if (data.budget.weekly) {
      const weekly = parseFloat(data.budget.weekly);
      status.weeklyUsed = spent.toFixed(2);
      status.weeklyRemaining = Math.max(0, weekly - spent).toFixed(2);
      status.weeklyPercentage = Math.min(100, (spent / weekly) * 100);

      if (status.weeklyPercentage! > 100) status.onTrack = false;
    }

    if (data.budget.monthly) {
      const monthly = parseFloat(data.budget.monthly);
      status.monthlyUsed = spent.toFixed(2);
      status.monthlyRemaining = Math.max(0, monthly - spent).toFixed(2);
      status.monthlyPercentage = Math.min(100, (spent / monthly) * 100);

      if (status.monthlyPercentage! > 100) status.onTrack = false;
    }

    return status;
  }

  /**
   * Get spending advice
   */
  async getAdvice(data: SpendingData): Promise<SpendingAdvice> {
    const analysis = this.analyzeSpending(data);
    const budgetStatus = this.calculateBudgetStatus(data);

    // Generate basic advice
    const basicAdvice = this.generateBasicAdvice(analysis, budgetStatus, data);

    // Enhance with AI if available
    if (this.gemini) {
      try {
        return await this.enhanceWithAI(data, analysis, budgetStatus, basicAdvice);
      } catch {
        // Fall back to basic advice
      }
    }

    return basicAdvice;
  }

  /**
   * Generate basic advice without AI
   */
  private generateBasicAdvice(
    analysis: SpendingAnalysis,
    budgetStatus: BudgetStatus | null,
    data: SpendingData
  ): SpendingAdvice {
    const insights: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Trend insights
    if (analysis.trend === 'increasing') {
      insights.push('Your spending has been increasing recently.');
      recommendations.push('Consider reviewing your recent transactions to identify areas to cut back.');
    } else if (analysis.trend === 'decreasing') {
      insights.push('Great job! Your spending has been decreasing.');
    }

    // Net flow
    const netFlow = parseFloat(analysis.netFlow);
    if (netFlow < 0) {
      warnings.push(`You've spent ${Math.abs(netFlow)} USDC more than you've received.`);
    } else if (netFlow > 0) {
      insights.push(`You've received ${netFlow} USDC more than you've spent.`);
    }

    // Category analysis
    const categories = Object.entries(analysis.byCategory);
    if (categories.length > 0) {
      const topCategory = categories.sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]))[0];
      insights.push(`Your largest spending category is "${topCategory[0]}" at ${topCategory[1]} USDC.`);
    }

    // Top recipient
    if (analysis.topRecipients.length > 0) {
      const top = analysis.topRecipients[0];
      insights.push(`Your top recipient received ${top.total} USDC across ${top.count} transactions.`);
    }

    // Budget warnings
    if (budgetStatus) {
      if (budgetStatus.dailyPercentage > 90) {
        warnings.push(`You've used ${budgetStatus.dailyPercentage.toFixed(0)}% of your daily budget.`);
      }
      if (budgetStatus.weeklyPercentage && budgetStatus.weeklyPercentage > 80) {
        warnings.push(`You've used ${budgetStatus.weeklyPercentage.toFixed(0)}% of your weekly budget.`);
      }
      if (!budgetStatus.onTrack) {
        recommendations.push('Consider reducing spending to stay within budget.');
      }
    }

    // Low balance warning
    const balance = parseFloat(data.balance);
    const avgTx = parseFloat(analysis.averageTransaction);
    if (balance < avgTx * 5) {
      warnings.push('Your balance is running low. Consider topping up soon.');
    }

    // Summary
    const summary = `Total spent: ${analysis.totalSpent} USDC. ${
      analysis.trend === 'stable' ? 'Spending is stable.' :
      analysis.trend === 'increasing' ? 'Spending is trending up.' :
      'Spending is trending down.'
    }`;

    return {
      summary,
      insights,
      warnings,
      recommendations,
      budgetStatus: budgetStatus || undefined
    };
  }

  /**
   * Enhance advice with AI
   */
  private async enhanceWithAI(
    data: SpendingData,
    analysis: SpendingAnalysis,
    budgetStatus: BudgetStatus | null,
    basic: SpendingAdvice
  ): Promise<SpendingAdvice> {
    if (!this.gemini) return basic;

    const prompt = `You are a financial advisor AI. Analyze this spending data and provide personalized advice.

Spending Analysis:
- Total Spent: ${analysis.totalSpent} USDC
- Total Received: ${analysis.totalReceived} USDC
- Net Flow: ${analysis.netFlow} USDC
- Trend: ${analysis.trend}
- Average Transaction: ${analysis.averageTransaction} USDC
- Categories: ${JSON.stringify(analysis.byCategory)}
- Top Recipients: ${JSON.stringify(analysis.topRecipients)}

Current Balance: ${data.balance} USDC
${budgetStatus ? `Budget Status: ${JSON.stringify(budgetStatus)}` : 'No budget set'}

Recent Transactions (last 5):
${data.transactions.slice(-5).map(tx =>
  `- ${tx.type}: ${tx.amount} USDC ${tx.recipient ? `to ${tx.recipient.slice(0, 10)}...` : ''} ${tx.memo || ''}`
).join('\n')}

Provide advice in JSON format:
{
  "summary": "2-3 sentence summary of spending health",
  "insights": ["3-5 specific insights about spending patterns"],
  "warnings": ["any concerning patterns or issues"],
  "recommendations": ["3-5 actionable recommendations"],
  "savingsOpportunities": ["specific ways to save money"]
}`;

    try {
      const aiResponse = await this.gemini.generateJSON<{
        summary: string;
        insights: string[];
        warnings: string[];
        recommendations: string[];
        savingsOpportunities?: string[];
      }>(prompt);

      return {
        summary: aiResponse.summary || basic.summary,
        insights: aiResponse.insights || basic.insights,
        warnings: aiResponse.warnings || basic.warnings,
        recommendations: aiResponse.recommendations || basic.recommendations,
        budgetStatus: budgetStatus || undefined,
        savingsOpportunities: aiResponse.savingsOpportunities
      };
    } catch {
      return basic;
    }
  }

  /**
   * Categorize a transaction using AI
   */
  async categorizeTransaction(tx: TransactionRecord): Promise<string> {
    if (!this.gemini) {
      return tx.category || 'uncategorized';
    }

    const prompt = `Categorize this transaction into one of these categories:
- services (freelance, consulting, etc.)
- subscriptions (recurring payments)
- purchases (one-time buys)
- transfers (moving money between wallets)
- escrow (held payments)
- streaming (continuous payments)
- other

Transaction:
- Amount: ${tx.amount} USDC
- Type: ${tx.type}
- Recipient: ${tx.recipient || 'N/A'}
- Memo: ${tx.memo || 'N/A'}

Respond with just the category name, nothing else.`;

    const category = await this.gemini.generate(prompt);
    return category.trim().toLowerCase();
  }

  /**
   * Predict future spending
   */
  async predictSpending(data: SpendingData, days: number = 30): Promise<{
    predicted: string;
    confidence: string;
    factors: string[];
  }> {
    const analysis = this.analyzeSpending(data);

    // Simple prediction based on average
    const avgDaily = parseFloat(analysis.totalSpent) /
      (data.period === 'week' ? 7 : data.period === 'month' ? 30 : 1);

    const predicted = (avgDaily * days).toFixed(2);

    if (!this.gemini) {
      return {
        predicted,
        confidence: 'low',
        factors: ['Based on simple average calculation']
      };
    }

    const prompt = `Predict spending for the next ${days} days based on this data:

Current Analysis:
- Total Spent: ${analysis.totalSpent} USDC
- Trend: ${analysis.trend}
- Average Transaction: ${analysis.averageTransaction} USDC
- Categories: ${JSON.stringify(analysis.byCategory)}

Simple Prediction: ${predicted} USDC

Provide a JSON response:
{
  "predicted": "your predicted amount as string",
  "confidence": "low" | "medium" | "high",
  "factors": ["factors influencing the prediction"]
}`;

    try {
      return await this.gemini.generateJSON<{
        predicted: string;
        confidence: string;
        factors: string[];
      }>(prompt);
    } catch {
      return {
        predicted,
        confidence: 'low',
        factors: ['Based on simple average calculation']
      };
    }
  }
}

// ============ Factory ============

export function createSpendingAdvisor(geminiClient?: GeminiClient): SpendingAdvisor {
  return new SpendingAdvisor(geminiClient);
}
