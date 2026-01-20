# AI Wallet Module

Intelligent wallet with AI-powered transaction suggestions.

## Quick Start

```typescript
import { createAIWallet } from 'arcpay';

const wallet = createAIWallet({
  privateKey: process.env.PRIVATE_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY
});

// Get smart suggestions
const suggestions = await wallet.getSuggestions();
// "You have 3 subscriptions due this week totaling $45.97"

// Natural language operations
await wallet.execute("Pay my Netflix subscription");
```

## Features

- **Smart Suggestions** - AI-powered payment recommendations
- **Spending Analysis** - Understand spending patterns
- **Anomaly Detection** - Flag unusual transactions
- **Natural Language** - Command wallet with text

## API

| Function | Description |
|----------|-------------|
| `wallet.execute(command)` | Natural language execution |
| `wallet.getSuggestions()` | Get AI suggestions |
| `wallet.analyzeSpending()` | Spending breakdown |
| `wallet.predictBills()` | Upcoming bill predictions |

## AI Features

- Bill payment reminders
- Spending category analysis
- Unusual activity alerts
- Budget recommendations
