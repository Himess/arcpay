# Payment Channels Module

Off-chain micropayments with instant settlement. Perfect for APIs, gaming, and IoT.

## Quick Start

```typescript
import { openChannel, channelPay, closeChannel } from 'arcpay';

// Open channel with $10 deposit
const { channelId } = await openChannel('0x...api-provider', '10');

// Make instant micropayments (NO GAS FEES!)
await channelPay(channelId, '0.001');
await channelPay(channelId, '0.002');
// ... thousands more possible

// Close and settle on-chain
await closeChannel(channelId);
```

## Features

- **Instant Payments** - No blockchain confirmation needed
- **Zero Gas** - Only pay gas when opening/closing
- **High Throughput** - Thousands of payments per channel
- **x402 Compatible** - Works with HTTP 402 protocol

## API

| Function | Description |
|----------|-------------|
| `openChannel(recipient, deposit)` | Open new channel |
| `channelPay(channelId, amount)` | Make instant payment |
| `closeChannel(channelId)` | Settle and close |
| `getChannel(channelId)` | Get channel details |
| `topUpChannel(channelId, amount)` | Add more funds |

## Use Cases

- API monetization (pay-per-request)
- Gaming microtransactions
- IoT device payments
- Streaming tips

## Smart Contract

Deployed at `0x3FF7bC1C52e7DdD2B7B915bDAdBe003037B0FA2E` on Arc Testnet.
