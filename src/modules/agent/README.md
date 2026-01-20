# Agent Module

Autonomous AI agents with budget controls for automated commerce.

## Quick Start

```typescript
import { createAgent } from 'arcpay';

const agent = createAgent({
  privateKey: process.env.AGENT_KEY,
  name: 'trading-bot',
  budget: {
    daily: '1000',
    perTransaction: '100',
    hourly: '200'
  }
});

// Agent pays for API calls automatically
await agent.payForService('openai', '0.05');

// Get spending report
const report = agent.getSpendingReport();
console.log(`Spent today: ${report.totalSpent} USDC`);
```

## Features

- **Budget Controls** - Daily, hourly, and per-transaction limits
- **Spending Reports** - Track where money goes
- **Whitelist/Blacklist** - Control who agent can pay
- **Auto-approve** - Autonomous payments under threshold

## API

| Function | Description |
|----------|-------------|
| `createAgent(config)` | Create new agent |
| `agent.pay(recipient, amount)` | Make payment |
| `agent.payForService(name, amount)` | Pay for a service |
| `agent.getSpendingReport()` | Get spending breakdown |
| `agent.addToWhitelist(address)` | Allow payments to address |

## Budget Configuration

```typescript
budget: {
  daily: '1000',      // Max daily spending
  hourly: '200',      // Max hourly spending
  perTransaction: '100' // Max per payment
}
```

## Smart Contract

AgentRegistry deployed at `0x5E3ef9A91AD33270f84B32ACFF91068Eea44c5ee` on Arc Testnet.
