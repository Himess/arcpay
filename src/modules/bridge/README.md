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

## Arc Testnet CCTP (Domain 26)

Arc Testnet is registered as **Domain 26** in Circle's CCTP network.

### Supported Routes

| Source | Destination | Domain |
|--------|-------------|--------|
| Ethereum Sepolia | Arc Testnet | 0 → 26 |
| Arbitrum Sepolia | Arc Testnet | 3 → 26 |
| Base Sepolia | Arc Testnet | 6 → 26 |

### API Endpoint

```
POST /api/circle/bridge
```

### Request

```json
{
  "sourceChain": "ethereum-sepolia",
  "amount": "100",
  "recipientAddress": "0x..."
}
```

### Response

```json
{
  "success": true,
  "transactionHash": "0x...",
  "destinationDomain": 26,
  "estimatedTime": "10-15 minutes"
}
