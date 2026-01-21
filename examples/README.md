# ArcPay Examples

This directory contains working examples demonstrating various ArcPay features.

## Prerequisites

1. Install dependencies:
```bash
cd arcpay
npm install
```

2. Create a `.env` file with your private key:
```bash
PRIVATE_KEY=0x...your_private_key
```

3. Get testnet USDC from the [Arc Faucet](https://faucet.arc.network)

## Running Examples

```bash
# Basic payment
npx ts-node examples/basic-payment.ts

# AI Agent commerce
npx ts-node examples/ai-agent-commerce.ts

# Escrow for freelance work
npx ts-node examples/escrow-freelance.ts

# Streaming salary payments
npx ts-node examples/streaming-salary.ts

# Private payments with stealth addresses
npx ts-node examples/private-payment.ts

# Payment channels for micropayments
npx ts-node examples/payment-channels.ts
```

## Examples Overview

### basic-payment.ts
Simple USDC transfers using the one-liner API.

```typescript
await pay('0x...', '10');
```

### ai-agent-commerce.ts
Autonomous AI agent with budget controls that can:
- Pay for API services
- Create escrow tasks
- Manage spending limits

### escrow-freelance.ts
Multi-party escrow for freelance work:
- Create escrow with conditions
- Fund escrow
- Release or refund

### streaming-salary.ts
Real-time payment streaming:
- Create salary stream
- Check claimable amount
- Claim earnings

### private-payment.ts
Stealth address payments for privacy:
- Generate stealth address
- Send private payment
- Scan and claim incoming payments

### payment-channels.ts
Off-chain micropayments:
- Open channel with deposit
- Make instant payments (no gas)
- Settle on-chain when done

## Network

All examples run on Arc Testnet:
- Chain ID: 5042002
- RPC: https://rpc.testnet.arc.network
- Explorer: https://testnet.arcscan.app

## Need Help?

- [Documentation](../docs)
- [GitHub Issues](https://github.com/Himess/arcpay/issues)
