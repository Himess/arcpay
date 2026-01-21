# Getting Started with ArcPay

This guide will help you get started with ArcPay SDK for building payment applications on Arc blockchain.

## Prerequisites

- Node.js 18.0.0 or higher
- An Arc Testnet wallet with USDC (get free USDC from faucet)
- Basic TypeScript/JavaScript knowledge

## Installation

```bash
npm install arcpay
```

## Quick Setup

### 1. Get Testnet USDC

Visit the [Arc Faucet](https://faucet.arc.network) to get free testnet USDC for development.

### 2. Set Environment Variables

Create a `.env` file:

```bash
ARCPAY_PRIVATE_KEY=0x...your_private_key
```

### 3. Initialize ArcPay

There are two ways to use ArcPay:

#### Simple API (Recommended for Quick Start)

```typescript
import { configure, pay, balance } from 'arcpay';

// Configure once
configure({ privateKey: process.env.ARCPAY_PRIVATE_KEY });

// Check balance
const { usdc, address } = await balance();
console.log(`Balance: ${usdc} USDC at ${address}`);

// Send payment
await pay('0x...recipient', '10');
```

#### Full Client API

```typescript
import { ArcPay } from 'arcpay';

const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.ARCPAY_PRIVATE_KEY,
});

// Get balance
const balance = await arc.getBalance();
console.log(`Balance: ${balance} USDC`);

// Send payment
const result = await arc.sendUSDC('0x...recipient', '10');
console.log(`Transaction: ${result.txHash}`);
```

## Circle Wallet Integration (Recommended)

For the best experience, use Circle Wallets with Gas Station for **gasless transactions**.

### Setup Circle Wallet

1. Create a Circle Developer Account at [console.circle.com](https://console.circle.com)
2. Get your API credentials
3. Set environment variables:

```bash
# Circle API (for gasless/gateway features)
CIRCLE_API_KEY=your_api_key
CIRCLE_ENTITY_SECRET=your_entity_secret
CIRCLE_WALLET_ID=your_wallet_id
```

### Gasless Transactions

With Circle Wallet, all transactions are sponsored by Gas Station - users pay **no gas fees**!

```typescript
import { ArcPay } from 'arcpay';

const arc = await ArcPay.init({
  network: 'arc-testnet',
  useCircleWallet: true,  // Enable gasless mode
});

// This transaction costs 0 gas for the user!
await arc.sendUSDC('0x...recipient', '100');
```

### How Gasless Works

1. Transaction submitted to Circle's ERC-4337 bundler
2. Gas Station sponsors the gas fee
3. Transaction executes on-chain
4. User pays: **0 USDC for gas**

**Verify on Explorer:** Check any transaction on [Arc Explorer](https://testnet.arcscan.app) - Method will show `handleOps` (ERC-4337) and gas paid by Gas Station contract.

## Core Concepts

### Network

Arc is a blockchain that uses USDC as its native gas token. This means:
- All gas fees are paid in USDC
- No need to acquire a separate native token
- Simpler UX for users

### Circle Integration

ArcPay deeply integrates with Circle's infrastructure:

| Feature | Description |
|---------|-------------|
| **Circle Wallets** | SCA wallets with ERC-4337 support |
| **Gas Station** | Sponsored gas fees for users |
| **Gateway** | Unified USDC balance across chains |
| **CCTP Bridge** | Cross-chain USDC transfers |

### Modules

ArcPay provides several modules:

| Module | Use Case |
|--------|----------|
| **Simple API** | One-liner functions for quick operations |
| **AI Agent** | Autonomous commerce with budget controls |
| **Escrow** | Multi-party conditional payments |
| **Streaming** | Real-time payment streaming |
| **Channels** | Off-chain micropayments |
| **Privacy** | Stealth address payments |

## Next Steps

- [AI Agent Guide](./ai-agent-guide.md) - Build autonomous commerce agents
- [Escrow Guide](./escrow-guide.md) - Set up secure multi-party payments
- [Streaming Guide](./streaming-guide.md) - Implement real-time payments
- [Privacy Guide](./privacy-guide.md) - Use stealth addresses

## Troubleshooting

### "Insufficient balance" Error

Make sure you have enough USDC in your wallet. Get more from the faucet.

### "Network connection failed" Error

Check your internet connection and RPC URL. The default RPC is:
```
https://rpc.testnet.arc.network
```

### Transaction Pending Forever

Arc testnet can sometimes be slow. Wait a few minutes or check the explorer:
```
https://testnet.arcscan.io
```

## Support

- [GitHub Issues](https://github.com/Himess/arcpay/issues)
- [Discord](https://discord.gg/arcpay)
