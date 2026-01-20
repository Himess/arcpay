# Smart Wallet Module

ERC-4337 smart contract wallets with account abstraction.

## Quick Start

```typescript
import { smartWallet } from 'arcpay';

// Create or load smart wallet
const wallet = await smartWallet.create({
  owner: '0x...ownerEOA',
  salt: 'my-wallet-v1'
});

// Execute transactions
await wallet.execute({
  to: '0x...',
  value: 0,
  data: '0x...'
});

// Batch multiple transactions
await wallet.executeBatch([
  { to: '0x...', data: '0x...' },
  { to: '0x...', data: '0x...' }
]);
```

## Features

- **Account Abstraction** - ERC-4337 compatible
- **Batch Transactions** - Multiple ops in one tx
- **Social Recovery** - Recover with guardians
- **Gas Sponsorship** - Works with paymasters

## API

| Function | Description |
|----------|-------------|
| `smartWallet.create(params)` | Create new wallet |
| `smartWallet.getAddress(owner, salt)` | Predict address |
| `wallet.execute(tx)` | Execute transaction |
| `wallet.executeBatch(txs)` | Batch transactions |
| `wallet.addGuardian(address)` | Add recovery guardian |

## Wallet Features

```typescript
const wallet = await smartWallet.create({
  owner: '0x...',
  salt: 'unique-salt',
  guardians: ['0x...', '0x...'],  // Recovery guardians
  threshold: 2,                    // Required for recovery
});
```

## Use Cases

- Gasless onboarding
- Multi-sig operations
- Session keys
- Social recovery
