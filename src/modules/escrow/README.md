# Escrow Module

Secure multi-party payments with conditions and dispute resolution.

## Quick Start

```typescript
import { escrow, releaseEscrow } from 'arcpay';

// Create escrow for freelance work
const { escrowId } = await escrow('0x...freelancer', '500', {
  release: 'on-approval',
  arbiter: '0x...arbiter',
  deadline: '7d'
});

// Release when work is done
await releaseEscrow(escrowId);
```

## Features

- **Multi-party** - Depositor, beneficiary, and arbitrators
- **Conditions** - Time-based, approval-based, or milestone-based release
- **Dispute Resolution** - Arbitrators can resolve disputes
- **Auto-refund** - Funds return if deadline passes

## API

| Function | Description |
|----------|-------------|
| `escrow(beneficiary, amount, options?)` | Create new escrow |
| `releaseEscrow(escrowId)` | Release funds to beneficiary |
| `refundEscrow(escrowId)` | Refund funds to depositor |
| `getEscrow(escrowId)` | Get escrow details |
| `disputeEscrow(escrowId, reason)` | Open a dispute |

## Smart Contract

Deployed at `0x0a982E2250F1C66487b88286e14D965025dD89D2` on Arc Testnet.
