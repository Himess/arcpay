# Invoices Module

Create, manage, and pay invoices with USDC.

## Quick Start

```typescript
import { createInvoice, payInvoice } from 'arcpay';

// Create an invoice
const invoice = await createInvoice({
  amount: '500',
  description: 'Web development services',
  dueDate: '2024-02-15',
  recipient: '0x...'
});

console.log(invoice.qrCode); // QR code for easy payment

// Pay an invoice
await payInvoice(invoice.id);
```

## Features

- **QR Codes** - Scannable payment codes
- **Due Dates** - Track payment deadlines
- **Partial Payments** - Accept installments
- **PDF Export** - Professional invoice documents

## API

| Function | Description |
|----------|-------------|
| `createInvoice(params)` | Create new invoice |
| `payInvoice(invoiceId)` | Pay an invoice |
| `getInvoice(invoiceId)` | Get invoice details |
| `listInvoices(status?)` | List invoices |
| `exportInvoicePDF(invoiceId)` | Generate PDF |

## Invoice Status

- `draft` - Not yet sent
- `sent` - Awaiting payment
- `partial` - Partially paid
- `paid` - Fully paid
- `overdue` - Past due date
- `cancelled` - Cancelled

## Invoice Fields

```typescript
{
  id: 'inv_abc123',
  amount: '500',
  description: 'Web development',
  lineItems: [...],
  recipient: '0x...',
  dueDate: '2024-02-15',
  status: 'sent',
  qrCode: 'data:image/png;base64,...'
}
```
