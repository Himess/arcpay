# Streaming Module

Core streaming payment infrastructure.

## Quick Start

```typescript
import { createStreamManager } from 'arcpay';

const manager = createStreamManager({ privateKey });

// Create a stream
const stream = await manager.createStream({
  recipient: '0x...',
  totalAmount: '5000',
  duration: 30 * 24 * 60 * 60 // 30 days in seconds
});

// Get claimable amount
const { claimable, progress } = await manager.getClaimable(stream.id);

// Claim funds
await manager.claim(stream.id);
```

## Features

- **Per-second Streaming** - Continuous fund flow
- **Claimable Tracking** - Real-time balance
- **Cancel & Refund** - Stop stream anytime
- **Multiple Streams** - Manage many simultaneously

## API

| Function | Description |
|----------|-------------|
| `createStream(params)` | Start new stream |
| `getClaimable(streamId)` | Check claimable amount |
| `claim(streamId)` | Claim available funds |
| `cancelStream(streamId)` | Stop and refund |
| `getStream(streamId)` | Get stream details |

## Stream Structure

```typescript
{
  id: 'stream_abc123',
  sender: '0x...',
  recipient: '0x...',
  totalAmount: '5000',
  startTime: 1704067200,
  endTime: 1706659200,
  claimed: '1500',
  status: 'active'
}
```

For simpler API, use `stream()` from simple API.
