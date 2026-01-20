# Privacy Module

Private payments using EIP-5564 stealth addresses. Recipient addresses are hidden on-chain.

## Quick Start

```typescript
import { getStealthAddress, payPrivate } from 'arcpay';

// Get your stealth meta-address (share this to receive private payments)
const stealthAddress = await getStealthAddress();
console.log('Share this:', stealthAddress);

// Send private payment
await payPrivate('st:arc:0x...recipient', '100');
```

## Features

- **Stealth Addresses** - One-time addresses per payment
- **On-chain Privacy** - Real recipient hidden from observers
- **EIP-5564 Compatible** - Standard stealth address protocol
- **Announcement Registry** - Recipients can scan for payments

## API

| Function | Description |
|----------|-------------|
| `getStealthAddress()` | Get your stealth meta-address |
| `payPrivate(to, amount)` | Send private payment |
| `scanAnnouncements()` | Find incoming private payments |
| `claimPrivatePayment(payment)` | Claim received payment |

## How It Works

1. Sender generates one-time stealth address from recipient's meta-address
2. Payment goes to stealth address (not linked to recipient)
3. Recipient scans announcement registry to find payments
4. Only recipient can derive private key to claim funds

## Smart Contract

StealthRegistry deployed at `0xbC6d02dBDe96caE69680BDbB63f9A12a14F3a41B` on Arc Testnet.
