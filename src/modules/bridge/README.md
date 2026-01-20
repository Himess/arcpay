# Bridge Module

Cross-chain USDC transfers using Circle's Cross-Chain Transfer Protocol (CCTP).

## Quick Start

```typescript
import { bridge } from 'arcpay';

// Bridge USDC from Ethereum to Arc
await bridge.transfer({
  from: 'ethereum',
  to: 'arc',
  amount: '1000',
  recipient: '0x...'
});

// Check supported chains
const chains = bridge.getSupportedChains();
```

## Features

- **Circle CCTP** - Official Circle cross-chain protocol
- **Native USDC** - No wrapped tokens
- **Multiple Chains** - Ethereum, Arbitrum, Base, Arc
- **Fast Finality** - Minutes, not hours

## API

| Function | Description |
|----------|-------------|
| `bridge.transfer(params)` | Bridge USDC between chains |
| `bridge.getStatus(txHash)` | Check bridge status |
| `bridge.getSupportedChains()` | List supported chains |
| `bridge.estimateFee(params)` | Estimate bridge fee |

## Supported Chains

- Ethereum Mainnet
- Arbitrum One
- Base
- Arc Network

## How It Works

1. Burn USDC on source chain
2. Circle attestation service confirms burn
3. Mint USDC on destination chain
4. Native USDC appears in recipient wallet
