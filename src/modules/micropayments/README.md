# Micropayments Module

x402 protocol implementation for pay-per-use API monetization.

## Quick Start

```typescript
// Server: Add paywall to your API
import { micropayments } from 'arcpay';

app.use(micropayments.paywall('0xYourAddress', {
  'GET /api/premium': { price: '0.10', description: 'Premium data' },
  'POST /api/generate': { price: '1.00', description: 'AI generation' },
}));

// Client: Pay for API access
const data = await micropayments.pay('https://api.example.com/premium');
```

## Features

- **HTTP 402** - Standard payment required protocol
- **Pay-per-request** - No subscriptions needed
- **Gasless** - Uses payment channels under the hood
- **Automatic** - SDK handles payment negotiation

## API

### Server Side
| Function | Description |
|----------|-------------|
| `micropayments.paywall(address, routes)` | Express middleware |
| `micropayments.verify(payment)` | Verify payment receipt |

### Client Side
| Function | Description |
|----------|-------------|
| `micropayments.pay(url)` | Pay and fetch resource |
| `micropayments.getPrice(url)` | Check price before paying |

## x402 Protocol

The x402 protocol uses HTTP 402 Payment Required:

1. Client requests resource
2. Server returns 402 with price in header
3. Client pays via payment channel
4. Client retries with payment proof
5. Server verifies and returns resource

## Use Cases

- API monetization
- Premium content access
- AI model inference
- Data marketplace
