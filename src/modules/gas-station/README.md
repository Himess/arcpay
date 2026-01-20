# Gas Station Module

Sponsor gas fees for your users. They pay in USDC, you cover the ETH.

## Quick Start

```typescript
import { gasStation } from 'arcpay';

// Sponsor a user's transaction
const result = await gasStation.sponsorTransaction({
  userAddress: '0x...user',
  transaction: {
    to: '0x...recipient',
    data: '0x...'
  },
  maxGasUSDC: '1.00'
});

console.log(result.txHash); // Transaction sent without user paying gas!
```

## Features

- **Gasless UX** - Users don't need ETH
- **USDC Payment** - Gas paid in stablecoins
- **Budget Controls** - Set max gas per transaction
- **Meta-transactions** - EIP-2771 compatible

## API

| Function | Description |
|----------|-------------|
| `gasStation.sponsorTransaction(params)` | Sponsor a transaction |
| `gasStation.estimateGas(tx)` | Estimate gas cost in USDC |
| `gasStation.getBalance()` | Check sponsor balance |
| `gasStation.deposit(amount)` | Add funds to gas station |

## Configuration

```typescript
const station = createGasStation({
  privateKey: process.env.SPONSOR_KEY,
  maxGasPerTx: '2.00',     // Max gas per transaction
  dailyBudget: '100.00',   // Daily gas budget
  allowedContracts: [...], // Whitelist contracts
});
```

## Use Cases

- Onboarding new users
- Mobile app transactions
- Gaming transactions
- Enterprise applications
