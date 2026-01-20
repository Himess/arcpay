# Requests Module

Request payments from others with notifications and tracking.

## Quick Start

```typescript
import { requestPayment, getIncomingRequests, payRequest } from 'arcpay';

// Request payment from someone
const request = await requestPayment('alice', '50', 'Dinner split');

// Check incoming requests (what you owe)
const incoming = await getIncomingRequests();

// Pay a request
await payRequest('req_abc123');
```

## Features

- **Request Anyone** - By name or address
- **Bulk Requests** - Request from multiple people at once
- **Track Status** - Pending, paid, declined
- **Notifications** - Alert recipients of requests

## API

| Function | Description |
|----------|-------------|
| `requestPayment(from, amount, reason?)` | Request from one person |
| `requestPaymentFrom(addresses[], amount)` | Request from multiple |
| `getIncomingRequests()` | What you owe others |
| `getOutgoingRequests()` | What others owe you |
| `payRequest(requestId)` | Pay a request |
| `declineRequest(requestId, reason?)` | Decline a request |

## Request Status

- `pending` - Waiting for payment
- `paid` - Payment received
- `declined` - Recipient declined
- `expired` - Request expired

## Use Cases

- Split dinner bills
- Collect group expenses
- Freelance invoicing
- Rent collection
