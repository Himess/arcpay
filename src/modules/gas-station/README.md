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

## Circle Gas Station Integration

ArcPay uses Circle's Gas Station for ERC-4337 gasless transactions on Arc Testnet.

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/circle/gasless` | GET | Check Gas Station status |
| `/api/circle/gasless` | POST | Execute gasless transaction |
| `/api/circle/transaction/[id]` | GET | Check transaction status |

### Example

```typescript
// Check status
const status = await fetch('/api/circle/gasless').then(r => r.json());
console.log('Gas Station:', status.gasStationEnabled);

// Execute gasless TX
const result = await fetch('/api/circle/gasless', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'contractExecution',
    contractAddress: '0x...',
    callData: '0x...',
  }),
});
```

### How It Works

1. Circle SCA Wallet (ERC-4337) submits UserOperation
2. Bundler processes the operation
3. Gas Station contract sponsors gas fees
4. User pays **0 USDC** for gas

### Verified Gasless TX

[View on Explorer](https://testnet.arcscan.app/tx/0x9f566f944884a8936e0c195269c97cc777dadf632cf08a010852bfbe6ad47228)

## Use Cases

- Onboarding new users
- Mobile app transactions
- Gaming transactions
- Enterprise applications
