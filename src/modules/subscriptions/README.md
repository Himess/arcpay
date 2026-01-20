# Subscriptions Module

Manage recurring payments and subscription billing.

## Quick Start

```typescript
import { addSubscription, getDueBills, payAllDueBills } from 'arcpay';

// Add a subscription
await addSubscription('netflix', '0x...', '15.99', 15); // Bills on 15th

// Check what's due
const dueBills = await getDueBills();

// Pay all due bills
const { paid, total } = await payAllDueBills();
console.log(`Paid ${paid} bills totaling $${total}`);
```

## Features

- **Billing Day Tracking** - Know when each bill is due
- **Auto-pay Option** - Never miss a payment
- **Snooze** - Delay a payment temporarily
- **Monthly Summary** - Total subscription costs

## API

| Function | Description |
|----------|-------------|
| `addSubscription(name, address, amount, billingDay)` | Add subscription |
| `getDueBills()` | Get bills due today |
| `getUpcomingBills(days)` | Get upcoming bills |
| `getOverdueBills()` | Get overdue bills |
| `payBill(name)` | Pay single bill |
| `payAllDueBills()` | Pay all due bills |
| `snoozeBill(name, days)` | Delay a bill |
| `getMonthlySubscriptionTotal()` | Total monthly cost |

## Subscription Status

- `due` - Payment due today
- `upcoming` - Due within 7 days
- `overdue` - Past due date
- `paid` - Paid this month
- `snoozed` - Temporarily delayed

## Voice Commands

- "What bills are due?"
- "Pay my Netflix"
- "Snooze Spotify for 3 days"
- "How much do I spend on subscriptions?"
