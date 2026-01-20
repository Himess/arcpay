# Gateway Module

Unified balance and payments across multiple chains via Circle's Gateway.

## Quick Start

```typescript
import { gateway } from 'arcpay';

// Get unified balance across all chains
const balance = await gateway.getUnifiedBalance('0x...');
console.log(balance);
// { total: '1500', chains: { ethereum: '500', arc: '1000' } }

// Pay from any chain (gateway handles routing)
await gateway.payFrom({
  recipient: '0x...',
  amount: '100',
  preferredChain: 'cheapest'
});
```

## Features

- **Unified View** - See all chain balances at once
- **Smart Routing** - Automatically picks best chain
- **Gas Optimization** - Route to cheapest chain
- **Multi-chain Wallet** - One interface, all chains

## API

| Function | Description |
|----------|-------------|
| `gateway.getUnifiedBalance(address)` | Get balance across chains |
| `gateway.payFrom(params)` | Pay with smart routing |
| `gateway.getPreferredChain(amount)` | Find optimal chain |
| `gateway.rebalance(config)` | Redistribute across chains |

## Routing Options

```typescript
preferredChain: 'arc'       // Use specific chain
preferredChain: 'cheapest'  // Minimize gas
preferredChain: 'fastest'   // Minimize time
preferredChain: 'auto'      // SDK decides
```

## Use Cases

- Multi-chain dApps
- Cross-chain payments
- Portfolio rebalancing
- Chain-agnostic services
