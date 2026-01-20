# Intent Module

Natural language command parsing for payment operations.

## Quick Start

```typescript
import { parseIntent, executeIntent } from 'arcpay';

// Parse natural language command
const intent = await parseIntent("Send 50 USDC to alice");
// { action: 'pay', recipient: 'alice', amount: '50' }

// Execute the parsed intent
await executeIntent(intent);
```

## Features

- **Natural Language** - Human-readable commands
- **Fuzzy Matching** - Handles typos and variations
- **Multi-action** - Parse complex commands
- **Context Aware** - Remembers previous context

## API

| Function | Description |
|----------|-------------|
| `parseIntent(text)` | Parse command to intent |
| `executeIntent(intent)` | Execute parsed intent |
| `validateIntent(intent)` | Validate before execution |
| `getIntentHistory()` | Get recent intents |

## Supported Commands

### Payments
- "Send 50 to alice"
- "Pay bob 100 USDC"
- "Transfer 25 dollars to 0x..."

### Escrow
- "Create escrow for 500 to alice"
- "Release escrow 123"

### Streams
- "Stream 5000 to bob over 30 days"
- "Cancel stream 456"

### Queries
- "What's my balance?"
- "Show pending payments"
- "List my contacts"

## Intent Structure

```typescript
{
  action: 'pay',
  recipient: 'alice',
  amount: '50',
  currency: 'USDC',
  confidence: 0.95,
  raw: 'Send 50 USDC to alice'
}
```
