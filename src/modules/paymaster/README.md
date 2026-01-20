# Paymaster Module

ERC-4337 paymaster for gasless transactions via account abstraction.

## Quick Start

```typescript
import { paymaster } from 'arcpay';

// Create a paymaster-sponsored user operation
const userOp = await paymaster.createUserOp({
  sender: '0x...smartWallet',
  callData: encodedTx,
  paymasterData: await paymaster.getPaymasterData()
});

// Send without user paying gas
const result = await paymaster.sendUserOp(userOp);
```

## Features

- **ERC-4337** - Account abstraction standard
- **Verifying Paymaster** - Signature-based authorization
- **Token Paymaster** - Pay gas in USDC
- **Bundler Integration** - Works with any bundler

## API

| Function | Description |
|----------|-------------|
| `paymaster.createUserOp(params)` | Create user operation |
| `paymaster.sendUserOp(userOp)` | Send to bundler |
| `paymaster.getPaymasterData()` | Get paymaster signature |
| `paymaster.estimateGas(userOp)` | Estimate gas |

## Paymaster Types

### Verifying Paymaster
Sponsor transactions for authorized users.

### Token Paymaster
Let users pay gas in USDC instead of ETH.

## Integration

Works with:
- Safe (Gnosis)
- Biconomy
- ZeroDev
- Pimlico
