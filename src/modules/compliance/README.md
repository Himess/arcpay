# Compliance Module

KYC/AML/Sanctions screening for enterprise payment applications.

## Quick Start

```typescript
import { compliance } from 'arcpay';

// Screen address before sending
const check = await compliance.screenAddress('0x...');

if (check.passed) {
  await pay('0x...', '1000');
} else {
  console.log('Blocked:', check.reason);
  // e.g., "Address on OFAC sanctions list"
}
```

## Features

- **Sanctions Screening** - OFAC, UN, EU lists
- **Address Analysis** - Check for risky patterns
- **Transaction Monitoring** - Flag suspicious activity
- **Audit Trail** - Compliance logging

## API

| Function | Description |
|----------|-------------|
| `compliance.screenAddress(address)` | Check single address |
| `compliance.screenTransaction(tx)` | Check transaction |
| `compliance.batchScreen(addresses)` | Bulk screening |
| `compliance.getReport(address)` | Detailed risk report |

## Screening Result

```typescript
{
  passed: false,
  risk: 'high',
  reason: 'Address on OFAC SDN list',
  lists: ['OFAC-SDN'],
  recommendation: 'block'
}
```

## Risk Levels

- `low` - No issues found
- `medium` - Some risk indicators
- `high` - On sanctions list or high-risk
- `critical` - Known bad actor

## Compliance Features

- OFAC SDN list
- EU sanctions
- UN sanctions
- Tornado Cash addresses
- Known scam addresses
