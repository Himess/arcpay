# Split Module

Split payments among multiple recipients easily.

## Quick Start

```typescript
import { splitPayment, splitCustom } from 'arcpay';

// Split $100 equally between 3 people
await splitPayment('100', ['alice', 'bob', 'charlie']);
// Each receives $33.33

// Split with custom amounts
await splitCustom([
  { to: 'alice', amount: '50' },
  { to: 'bob', amount: '30' },
  { to: 'charlie', amount: '20' }
]);
```

## Features

- **Equal Split** - Divide equally among recipients
- **Custom Split** - Specify individual amounts
- **Contact Names** - Use names instead of addresses
- **Batch Execution** - Single transaction for all

## API

| Function | Description |
|----------|-------------|
| `splitPayment(total, recipients[])` | Split equally |
| `splitCustom(recipients[])` | Split with custom amounts |
| `splitByPercentage(total, percentages)` | Split by percentage |

## Split Options

```typescript
// By percentage
await splitByPercentage('100', [
  { to: 'alice', percent: 50 },
  { to: 'bob', percent: 30 },
  { to: 'charlie', percent: 20 }
]);

// With memo
await splitPayment('150', recipients, {
  memo: 'Dinner at Italian place'
});
```

## Use Cases

- Restaurant bill splitting
- Group gift contributions
- Shared expense settlements
- Payroll distribution
