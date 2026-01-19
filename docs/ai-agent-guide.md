# AI Agent SDK Guide

Build autonomous AI agents that handle payments without human intervention. Perfect for:
- Trading bots
- AI assistants
- Machine-to-machine payments
- Autonomous services

## Overview

The AI Agent SDK provides a high-level API for agents to:
- Make payments within budget limits
- Create and manage escrow tasks
- Stream payments continuously
- Open payment channels for micropayments

## Creating an Agent

```typescript
import { createAgent } from 'arcpay';

const agent = createAgent({
  privateKey: process.env.AGENT_PRIVATE_KEY,
  name: 'my-trading-bot',
  budget: {
    daily: '1000',         // Maximum $1000 per day
    hourly: '100',         // Maximum $100 per hour
    perTransaction: '50',  // Maximum $50 per transaction
    approvalThreshold: '25' // Auto-approve under $25
  },
  autoApprove: true,
  verbose: true  // Log all actions
});
```

## Budget Controls

Budget controls prevent runaway spending:

```typescript
const agent = createAgent({
  privateKey,
  budget: {
    daily: '500',           // Daily limit
    hourly: '50',           // Hourly limit
    perTransaction: '25',   // Per-tx limit
    approvalThreshold: '10' // Auto-approve threshold
  }
});

// This will succeed (under limits)
await agent.pay('0x...', '5');

// This will fail (exceeds per-transaction limit)
await agent.pay('0x...', '100');
// Error: Transaction amount 100 exceeds per-transaction limit 25

// After many transactions, daily limit triggers
// Error: Daily spending limit exceeded (500 USDC)
```

## Paying for Services

Ideal for API calls, compute costs, and micropayments:

```typescript
// Pay for an API call
await agent.payForService('openai', '0.05');

// Pay with metadata (for tracking)
await agent.payForService('anthropic', '0.10', {
  model: 'claude-3',
  tokens: 1500
});
```

## Task Management (Escrow)

Create tasks with escrow protection for hiring workers:

```typescript
// Create a task
const task = await agent.createTask({
  description: 'Write documentation for API',
  payment: '100',
  worker: '0x...freelancer',
  deadline: '48h',
  arbiter: '0x...arbiter'  // Optional dispute resolver
});

console.log(`Task created: ${task.id}`);
console.log(`Escrow ID: ${task.escrowId}`);

// Check task status
const status = agent.getTask(task.id);
console.log(`Status: ${status.status}`); // 'pending'

// Approve when work is done
await agent.approveTask(task.id);

// Or reject with reason
await agent.rejectTask(task.id, 'Work quality insufficient');
```

## Streaming Payments

Set up continuous payment streams for salaries:

```typescript
// Stream $5000 over 30 days
const { streamId } = await agent.startStream({
  recipient: '0x...employee',
  amount: '5000',
  duration: '30d'
});

// Or use rate format
await agent.startStream({
  recipient: '0x...contractor',
  amount: '100/day',  // $100 per day
  duration: '2w'      // 2 weeks
});

// Stop a stream early
await agent.stopStream(streamId);
```

## Payment Channels

Open channels for high-frequency micropayments:

```typescript
// Open channel with $10 deposit
await agent.openChannel('api-service', '0x...provider', '10');

// Make instant payments (no gas!)
await agent.channelPay('api-service', '0.001');
await agent.channelPay('api-service', '0.002');
// ... hundreds of payments

// Close and settle
await agent.closeChannel('api-service');
```

## Privacy

Send and receive private payments:

```typescript
// Get stealth address
const stealthAddr = agent.getStealthAddress();

// Send privately
await agent.payPrivate('0x...', '100');

// Scan for incoming private payments
const payments = await agent.scanPrivatePayments();
for (const p of payments) {
  if (!p.claimed) {
    console.log(`Unclaimed: ${p.amount} USDC`);
  }
}
```

## Spending Reports

Monitor agent spending:

```typescript
const report = agent.getSpendingReport();

console.log(`Period: ${report.period}`);
console.log(`Total Spent: ${report.totalSpent} USDC`);
console.log(`Transactions: ${report.transactionCount}`);
console.log(`Remaining Daily: ${report.remainingBudget.daily} USDC`);
console.log(`Remaining Hourly: ${report.remainingBudget.hourly} USDC`);

// Breakdown by category
for (const [service, amount] of Object.entries(report.byCategory)) {
  console.log(`  ${service}: ${amount} USDC`);
}
```

## Complete Example

```typescript
import { createAgent } from 'arcpay';

async function runTradingBot() {
  const agent = createAgent({
    privateKey: process.env.BOT_KEY,
    name: 'trading-bot',
    budget: {
      daily: '500',
      perTransaction: '50'
    },
    verbose: true
  });

  // Check balance
  const balance = await agent.getBalance();
  console.log(`Agent balance: ${balance} USDC`);

  // Pay for market data
  await agent.payForService('market-data-api', '0.50');

  // Pay for AI analysis
  await agent.payForService('ai-analysis', '0.10');

  // If we find a good trade, pay the executor
  await agent.pay('0x...executor', '5');

  // Generate spending report
  const report = agent.getSpendingReport();
  console.log('=== Daily Report ===');
  console.log(`Spent: ${report.totalSpent} USDC`);
  console.log(`Remaining: ${report.remainingBudget.daily} USDC`);
}

runTradingBot();
```

## Best Practices

1. **Set Conservative Limits** - Start with low limits and increase as needed
2. **Use Service Names** - Track spending by service for analysis
3. **Monitor Reports** - Regularly check spending reports
4. **Use Channels for Micropayments** - Save gas on frequent small payments
5. **Enable Verbose Logging** - Useful for debugging

## Error Handling

```typescript
try {
  await agent.pay('0x...', '1000');
} catch (error) {
  if (error.message.includes('exceeds per-transaction limit')) {
    console.log('Payment too large for auto-approval');
  } else if (error.message.includes('Daily spending limit exceeded')) {
    console.log('Daily budget exhausted');
  }
}
```

## Next Steps

- [Escrow Guide](./escrow-guide.md) - Deep dive into escrow mechanics
- [Streaming Guide](./streaming-guide.md) - Advanced streaming patterns
- [Examples](../examples) - Complete working examples
