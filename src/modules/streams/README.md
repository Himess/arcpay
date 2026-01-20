# Streams Module

Real-time continuous payments for salaries, subscriptions, and more.

## Quick Start

```typescript
import { stream, claimStream } from 'arcpay';

// Stream $5000 salary over 30 days
const { streamId } = await stream('0x...employee', '5000', '30d');

// Employee claims their earnings anytime
const { amount } = await claimStream(streamId);
console.log(`Claimed: ${amount} USDC`);
```

## Features

- **Per-second Payments** - Funds flow continuously
- **Claim Anytime** - Recipients can claim accrued funds
- **Cancel & Refund** - Sender can cancel, remaining funds returned
- **Multiple Streams** - Manage many streams simultaneously

## API

| Function | Description |
|----------|-------------|
| `stream(recipient, amount, duration)` | Create payment stream |
| `claimStream(streamId)` | Claim available funds |
| `cancelStream(streamId)` | Cancel and refund remaining |
| `getStream(streamId)` | Get stream details |
| `getClaimable(streamId)` | Check claimable amount |

## Use Cases

- Employee salaries
- Subscription payments
- Rent payments
- Vesting schedules

## Smart Contract

Deployed at `0x4678D992DE548BDdCb5cd4104470766b5207A855` on Arc Testnet.
