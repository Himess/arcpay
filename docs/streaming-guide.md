# Payment Streaming Guide

Real-time continuous payments for salaries, subscriptions, and services.

## Overview

Payment streaming allows funds to flow continuously from sender to recipient over time. Unlike traditional payments where the full amount transfers at once, streaming payments release funds every second.

**Use Cases:**
- Employee salaries
- Subscription services
- Rental payments
- Service billing
- Token vesting

## Creating a Stream

```typescript
import { createStreamManager } from 'arcpay';

const streams = createStreamManager({
  privateKey: process.env.PRIVATE_KEY
});

// Create a stream: $5000 over 30 days
const stream = await streams.createStream({
  recipient: '0x...employee',
  totalAmount: '5000',
  duration: 30 * 24 * 60 * 60  // 30 days in seconds
});

console.log(`Stream ID: ${stream.id}`);
console.log(`Rate: ${stream.ratePerSecond} USDC/second`);
```

## Simple API

Using the one-liner simple API:

```typescript
import { stream, claimStream, cancelStream } from 'arcpay';

// Start a stream
const { streamId } = await stream('0x...recipient', '1000', '7d');

// Claim earnings
await claimStream(streamId);

// Cancel if needed
await cancelStream(streamId);
```

## Duration Formats

The simple API supports various duration formats:

| Format | Duration |
|--------|----------|
| `30s` | 30 seconds |
| `5m` | 5 minutes |
| `24h` | 24 hours |
| `7d` | 7 days |
| `2w` | 2 weeks |
| `1mo` | 1 month (30 days) |
| `1y` | 1 year |

```typescript
// 1 week stream
await stream('0x...', '700', '1w');

// 1 month stream
await stream('0x...', '5000', '1mo');
```

## Claiming Payments

Recipients can claim their earned funds at any time:

```typescript
// Check how much is claimable
const { claimable, progress, totalClaimed, remaining } =
  await streams.getClaimable(streamId);

console.log(`Progress: ${progress.toFixed(2)}%`);
console.log(`Claimable: ${claimable} USDC`);
console.log(`Already claimed: ${totalClaimed} USDC`);
console.log(`Remaining: ${remaining} USDC`);

// Claim the funds
const result = await streams.claim(streamId);
console.log(`Claimed: ${result.amountClaimed} USDC`);
console.log(`Transaction: ${result.txHash}`);
```

## Canceling Streams

Senders can cancel streams at any time:

```typescript
const result = await streams.cancelStream(streamId);

console.log(`Refunded to sender: ${result.refundedAmount} USDC`);
console.log(`Sent to recipient: ${result.recipientAmount} USDC`);
```

When cancelled:
- Recipient receives all earned (streamed) funds
- Sender receives refund of remaining funds

## Stream Lifecycle

```
┌──────────────┐
│   Created    │  totalAmount locked
└──────┬───────┘
       │
       ▼
┌──────────────┐
│    Active    │  funds streaming...
└──────┬───────┘
       │
       ├───────────────┐
       │               │
       ▼               ▼
┌──────────────┐ ┌──────────────┐
│  Completed   │ │  Cancelled   │
└──────────────┘ └──────────────┘
```

## Multiple Claims

Recipients can claim multiple times:

```typescript
// Day 1: Claim first day's earnings
await streams.claim(streamId);

// Day 7: Claim week's earnings
await streams.claim(streamId);

// Day 30: Claim remaining
await streams.claim(streamId);
```

## Monitoring Streams

```typescript
// Get a specific stream
const stream = streams.getStream(streamId);
console.log(`State: ${stream.state}`);
console.log(`Start: ${new Date(stream.startTime * 1000)}`);
console.log(`End: ${new Date(stream.endTime * 1000)}`);

// Get all your outgoing streams
const sent = streams.getSenderStreams();
console.log(`Sending ${sent.length} streams`);

// Get all your incoming streams
const received = streams.getRecipientStreams();
console.log(`Receiving ${received.length} streams`);

// Get stats
const stats = await streams.getStats();
console.log(`Total streams: ${stats.totalCreated}`);
console.log(`Active: ${stats.activeCount}`);
console.log(`Total volume: ${stats.totalVolume} USDC`);
```

## AI Agent Streaming

Using the AI Agent SDK:

```typescript
import { createAgent } from 'arcpay';

const agent = createAgent({
  privateKey,
  budget: { daily: '1000' }
});

// Start a salary stream
const { streamId } = await agent.startStream({
  recipient: '0x...employee',
  amount: '5000',
  duration: '30d'
});

// Or use rate format
await agent.startStream({
  recipient: '0x...contractor',
  amount: '100/day',
  duration: '2w'
});

// Stop a stream
await agent.stopStream(streamId);
```

## Smart Contract

The stream payment contract is deployed at:
```
0x4aC6108858A2ba9C715d3E1694d413b01919A043
```

### Key Functions

| Function | Description |
|----------|-------------|
| `createStream` | Create new stream |
| `claim` | Claim earned funds |
| `cancelStream` | Cancel and refund |
| `getStream` | Get stream details |
| `getClaimable` | Get claimable amount |

## Calculations

### Rate Per Second

```
ratePerSecond = totalAmount / duration

Example: $5000 over 30 days
ratePerSecond = 5000 / (30 * 24 * 60 * 60)
             = 5000 / 2592000
             = 0.001929 USDC/second
```

### Claimable Amount

```
elapsed = min(now, endTime) - startTime
streamed = ratePerSecond * elapsed
claimable = streamed - alreadyClaimed
```

## Best Practices

1. **Fund Enough** - Ensure you have enough USDC before creating streams
2. **Set Reasonable Durations** - Match payment period to service period
3. **Monitor Active Streams** - Keep track of your streaming obligations
4. **Claim Regularly** - Recipients should claim periodically
5. **Budget for Streams** - Account for streaming commitments in budget

## Error Handling

```typescript
try {
  await streams.createStream({
    recipient: '0x...',
    totalAmount: '10000',
    duration: 30 * 24 * 60 * 60
  });
} catch (error) {
  if (error.message.includes('insufficient balance')) {
    console.log('Not enough USDC to fund stream');
  } else if (error.message.includes('invalid recipient')) {
    console.log('Invalid recipient address');
  }
}

try {
  await streams.claim(streamId);
} catch (error) {
  if (error.message.includes('nothing to claim')) {
    console.log('No funds available to claim yet');
  } else if (error.message.includes('stream not found')) {
    console.log('Stream does not exist');
  }
}
```

## Example: Salary Payment

```typescript
import { createStreamManager } from 'arcpay';

const streams = createStreamManager({ privateKey: process.env.EMPLOYER_KEY });

// Create monthly salary streams for employees
const employees = [
  { address: '0x...alice', salary: '5000' },
  { address: '0x...bob', salary: '6000' },
  { address: '0x...charlie', salary: '4500' }
];

for (const emp of employees) {
  const stream = await streams.createStream({
    recipient: emp.address,
    totalAmount: emp.salary,
    duration: 30 * 24 * 60 * 60  // 30 days
  });
  console.log(`Created salary stream for ${emp.address}: ${stream.id}`);
}

// Employee claims their earnings
const employeeStreams = createStreamManager({
  privateKey: process.env.EMPLOYEE_KEY
});

const myStreams = employeeStreams.getRecipientStreams();
for (const stream of myStreams) {
  const { claimable } = await employeeStreams.getClaimable(stream.id);
  if (parseFloat(claimable) > 0) {
    await employeeStreams.claim(stream.id);
    console.log(`Claimed ${claimable} USDC`);
  }
}
```

## Next Steps

- [Payment Channels Guide](./payment-channels-guide.md) - Instant micropayments
- [Privacy Guide](./privacy-guide.md) - Stealth addresses
- [Examples](../examples/streaming-salary) - Complete streaming example
