# Links Module

Shareable payment links that anyone can use to pay you.

## Quick Start

```typescript
import { createPaymentLink, payLink } from 'arcpay';

// Create a payment link
const link = await createPaymentLink('25', 'Coffee meetup');
console.log(link.url); // https://pay.arcpay.io/link/abc123

// Anyone can pay the link
await payLink('link_abc123');
```

## Features

- **Shareable URLs** - Send via text, email, or QR code
- **Fixed or Open Amount** - Set amount or let payer choose
- **Expiration** - Links can expire after time or use
- **Tracking** - See who paid and when

## API

| Function | Description |
|----------|-------------|
| `createPaymentLink(amount?, description?)` | Create new link |
| `payLink(urlOrId, amount?)` | Pay a link |
| `getPaymentLink(id)` | Get link details |
| `listPaymentLinks(status?)` | List your links |
| `cancelPaymentLink(id)` | Cancel a link |

## Link Options

```typescript
await createPaymentLink({
  amount: '50',           // Fixed amount (optional)
  description: 'Dinner',  // Description shown to payer
  expiresIn: '7d',        // Expiration time
  maxUses: 1,             // Single use or unlimited
  metadata: { ... }       // Custom data
});
```

## Use Cases

- Request money from friends
- Freelance invoice links
- Donation links
- Event ticket payments
