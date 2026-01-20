# Combo Module

Combine multiple payment operations into single transactions.

## Quick Start

```typescript
import { combo } from 'arcpay';

// Execute multiple operations atomically
await combo.execute([
  { action: 'pay', to: 'alice', amount: '50' },
  { action: 'pay', to: 'bob', amount: '30' },
  { action: 'escrow', to: 'charlie', amount: '100' }
]);

// All succeed or all fail
```

## Features

- **Atomic Execution** - All or nothing
- **Gas Efficient** - Single transaction
- **Mixed Operations** - Different action types
- **Rollback Safety** - Auto-revert on failure

## API

| Function | Description |
|----------|-------------|
| `combo.execute(operations[])` | Execute combo |
| `combo.simulate(operations[])` | Dry run |
| `combo.estimate(operations[])` | Gas estimate |

## Supported Operations

- `pay` - Simple transfer
- `escrow` - Create escrow
- `stream` - Start stream
- `approve` - Token approval

## Use Cases

- Payroll (pay multiple employees)
- Multi-party settlements
- Complex DeFi operations
