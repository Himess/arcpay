# FX Module

Stablecoin foreign exchange - swap between USDC and EURC.

## Quick Start

```typescript
import { fx } from 'arcpay';

// Swap USDC to EURC
const result = await fx.swap({
  from: 'USDC',
  to: 'EURC',
  amount: '1000'
});
console.log(`Received: ${result.received} EURC`);

// Get current rate
const rate = await fx.getRate('USDC', 'EURC');
console.log(`1 USDC = ${rate} EURC`);
```

## Features

- **Real-time Rates** - Live forex rates
- **Low Slippage** - Deep liquidity pools
- **Instant Settlement** - No waiting periods
- **Circle-backed** - Uses Circle's FX infrastructure

## API

| Function | Description |
|----------|-------------|
| `fx.swap(params)` | Execute swap |
| `fx.getRate(from, to)` | Get current rate |
| `fx.quote(params)` | Get quote before swap |
| `fx.getSupportedPairs()` | List available pairs |

## Supported Pairs

- USDC ↔ EURC (USD/EUR)
- More pairs coming soon

## Swap Options

```typescript
await fx.swap({
  from: 'USDC',
  to: 'EURC',
  amount: '1000',
  slippage: 0.5,  // Max 0.5% slippage
  deadline: 300   // 5 minute deadline
});
```
