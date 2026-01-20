# USYC Module

Yield-bearing USDC operations using Circle's USYC token.

## Quick Start

```typescript
import { usyc } from 'arcpay';

// Deposit USDC to earn yield
await usyc.deposit('1000');

// Check your USYC balance and accrued yield
const balance = await usyc.getBalance();
console.log(`USYC: ${balance.usyc}, Yield: ${balance.yield}`);

// Withdraw back to USDC
await usyc.withdraw('500');
```

## Features

- **Yield Earning** - Earn interest on USDC
- **Instant Conversion** - USDC ↔ USYC
- **Compounding** - Yield auto-compounds
- **Transparent** - On-chain yield tracking

## API

| Function | Description |
|----------|-------------|
| `usyc.deposit(amount)` | Convert USDC to USYC |
| `usyc.withdraw(amount)` | Convert USYC to USDC |
| `usyc.getBalance()` | Get USYC balance and yield |
| `usyc.getAPY()` | Current annual yield rate |
| `usyc.isAllowlisted(address)` | Check allowlist status |

## Requirements

USYC requires allowlist approval. Apply at https://usyc.dev.hashnote.com/

## USYC Token

Deployed at `0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C` on Arc Testnet.
