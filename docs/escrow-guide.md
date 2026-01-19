# Escrow Guide

Secure multi-party payments with conditions and dispute resolution.

## Overview

Escrow is a financial arrangement where a third party holds funds until predetermined conditions are met. ArcPay's escrow system supports:

- Multi-party escrows
- Multiple release conditions
- Dispute resolution
- Milestone payments
- Automatic expiration

## Basic Escrow

```typescript
import { createEscrowManager } from 'arcpay';

const escrow = createEscrowManager({
  privateKey: process.env.PRIVATE_KEY
});

// Create escrow
const { id } = await escrow.createEscrow({
  depositor: '0x...buyer',
  beneficiary: '0x...seller',
  amount: '500',
  conditions: [{
    type: 'approval',
    params: { approver: '0x...buyer' },
    isMet: false
  }],
  description: 'Purchase of goods'
});

// Fund the escrow
await escrow.fundEscrow(id);

// Release when satisfied
await escrow.releaseEscrow(id);
```

## Release Conditions

### Approval-Based

Requires explicit approval from a designated approver:

```typescript
const { id } = await escrow.createEscrow({
  depositor,
  beneficiary,
  amount: '1000',
  conditions: [{
    type: 'approval',
    params: { approver: depositor }, // Buyer approves
    isMet: false
  }]
});
```

### Time-Based

Automatically releases after a specified time:

```typescript
const { id } = await escrow.createEscrow({
  depositor,
  beneficiary,
  amount: '1000',
  conditions: [{
    type: 'time',
    params: { releaseAt: Date.now() + 7 * 24 * 60 * 60 * 1000 }, // 7 days
    isMet: false
  }],
  expiresAt: '2025-06-01' // Expires if not released
});
```

### Multi-Condition

Combine multiple conditions:

```typescript
const { id } = await escrow.createEscrow({
  depositor,
  beneficiary,
  amount: '5000',
  conditions: [
    {
      type: 'approval',
      params: { approver: depositor },
      isMet: false
    },
    {
      type: 'approval',
      params: { approver: '0x...quality-inspector' },
      isMet: false
    }
  ]
});
```

## Dispute Resolution

When parties disagree, arbitrators can resolve disputes:

```typescript
// Create escrow with arbitrator
const { id } = await escrow.createEscrow({
  depositor,
  beneficiary,
  amount: '2000',
  conditions: [{
    type: 'approval',
    params: { approver: depositor },
    isMet: false
  }],
  arbitrators: ['0x...trusted-arbiter']
});

// Buyer isn't happy - create dispute
await escrow.createDispute(id, 'Product not as described');

// Arbiter resolves
await escrow.resolveDispute(
  id,
  'release',  // or 'refund'
  'After review, seller provided adequate product'
);
```

## Milestone Payments

Break large payments into milestones:

```typescript
// For a 3-milestone project
const milestones = [
  { description: 'Design complete', amount: '500' },
  { description: 'Development complete', amount: '1000' },
  { description: 'Testing complete', amount: '500' }
];

// Create separate escrows for each milestone
for (const milestone of milestones) {
  const { id } = await escrow.createEscrow({
    depositor,
    beneficiary,
    amount: milestone.amount,
    description: milestone.description,
    conditions: [{
      type: 'approval',
      params: { approver: depositor },
      isMet: false
    }]
  });
  await escrow.fundEscrow(id);
}
```

## Refunds

Return funds to depositor:

```typescript
// Check if conditions allow refund
const escrowData = escrow.getEscrow(id);

if (escrowData.state === 'funded') {
  // Refund before expiration requires all parties' consent
  // or dispute resolution
  await escrow.refundEscrow(id);
}

// Automatic refund after expiration
// If expiresAt passes without release, depositor can claim refund
```

## Escrow Lifecycle

```
┌──────────────┐
│   Created    │
└──────┬───────┘
       │ fundEscrow()
       ▼
┌──────────────┐
│   Funded     │◄──────────────┐
└──────┬───────┘               │
       │                       │
       ├─────────┬─────────┬───┤
       │         │         │   │
       ▼         ▼         ▼   │
┌────────┐ ┌──────────┐ ┌──────┴─────┐
│Released│ │ Refunded │ │  Disputed  │
└────────┘ └──────────┘ └────────────┘
```

## Getting Escrow Information

```typescript
// Get single escrow
const escrowData = escrow.getEscrow(id);
console.log(`State: ${escrowData.state}`);
console.log(`Amount: ${escrowData.amount}`);
console.log(`Beneficiary: ${escrowData.beneficiary}`);

// Get all escrows for an address
const myEscrows = await escrow.getUserEscrows('0x...myAddress');

// Get stats
const stats = await escrow.getStats();
console.log(`Total Active: ${stats.activeCount}`);
console.log(`Total Volume: ${stats.totalVolume}`);
```

## Simple API

Using the one-liner simple API:

```typescript
import { escrow, releaseEscrow, refundEscrow } from 'arcpay';

// Create and fund escrow in one call
const { escrowId } = await escrow('0x...beneficiary', '500', {
  release: 'on-approval',
  arbiter: '0x...arbiter',
  deadline: '7d',
  description: 'Web design project'
});

// Release
await releaseEscrow(escrowId);

// Or refund
await refundEscrow(escrowId);
```

## Smart Contract

The escrow contract is deployed at:
```
0x02291A7116B07D50794EcAC97bBeE1b956610135
```

### Key Functions

| Function | Description |
|----------|-------------|
| `createEscrow` | Create new escrow |
| `deposit` | Fund the escrow |
| `release` | Release to beneficiary |
| `refund` | Refund to depositor |
| `raiseDispute` | Create dispute |
| `resolveDispute` | Arbiter resolution |

## Best Practices

1. **Use Arbitrators** - Always include a trusted third party for dispute resolution
2. **Set Expiration** - Prevent funds from being locked forever
3. **Clear Descriptions** - Document what the escrow is for
4. **Multiple Approvers** - For large amounts, require multiple approvals
5. **Milestone Payments** - Break large projects into smaller escrows

## Error Handling

```typescript
try {
  await escrow.releaseEscrow(id);
} catch (error) {
  if (error.message.includes('not funded')) {
    console.log('Escrow must be funded first');
  } else if (error.message.includes('conditions not met')) {
    console.log('Release conditions not satisfied');
  } else if (error.message.includes('already released')) {
    console.log('Escrow was already released');
  }
}
```

## Next Steps

- [Streaming Guide](./streaming-guide.md) - Real-time payments
- [AI Agent Guide](./ai-agent-guide.md) - Autonomous escrow management
- [Examples](../examples/escrow-freelance) - Complete escrow example
