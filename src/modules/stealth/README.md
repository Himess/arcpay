# Stealth Module

Low-level stealth address cryptography (EIP-5564).

## Quick Start

```typescript
import { stealth } from 'arcpay';

// Generate stealth meta-address
const { spendingKey, viewingKey, metaAddress } = stealth.generateKeys();

// Derive stealth address for payment
const { stealthAddress, ephemeralPubKey } = stealth.deriveStealthAddress(metaAddress);

// Recipient recovers private key
const privateKey = stealth.recoverStealthKey(
  stealthAddress,
  ephemeralPubKey,
  spendingKey,
  viewingKey
);
```

## Features

- **EIP-5564** - Standard stealth address protocol
- **Key Generation** - Spending and viewing keys
- **Address Derivation** - One-time stealth addresses
- **Key Recovery** - Recipient key derivation

## API

| Function | Description |
|----------|-------------|
| `stealth.generateKeys()` | Generate key pair |
| `stealth.deriveStealthAddress(meta)` | Derive payment address |
| `stealth.recoverStealthKey(...)` | Recover private key |
| `stealth.parseMetaAddress(addr)` | Parse meta-address |

## Cryptographic Flow

1. **Setup**: Recipient generates spending + viewing keys
2. **Meta-address**: Recipient shares `st:arc:...` address
3. **Payment**: Sender derives one-time stealth address
4. **Announcement**: Sender posts ephemeral key on-chain
5. **Scanning**: Recipient scans announcements with viewing key
6. **Recovery**: Recipient derives private key to claim funds

## Meta-address Format

```
st:arc:0x[spending_pubkey][viewing_pubkey]
```

For higher-level API, use the Privacy module instead.
