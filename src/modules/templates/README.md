# Templates Module

Pre-built payment templates for common subscriptions and services.

## Quick Start

```typescript
import { listTemplates, addFromTemplate } from 'arcpay';

// Browse available templates
const templates = listTemplates('subscription');
// Returns: Netflix, Spotify, OpenAI, AWS, etc.

// Add subscription from template
await addFromTemplate('netflix', '0x...your-netflix-address');

// Templates auto-fill amount, billing day, category
```

## Features

- **Pre-built Templates** - 50+ common services
- **Categories** - Subscription, Business, Personal, Utility
- **Auto-config** - Amount, billing cycle, icons pre-filled
- **Custom Templates** - Create your own

## API

| Function | Description |
|----------|-------------|
| `listTemplates(category?)` | Browse available templates |
| `getTemplate(id)` | Get template details |
| `addFromTemplate(id, address)` | Create contact from template |
| `createTemplate(config)` | Create custom template |

## Available Templates

### Subscriptions
- Netflix, Spotify, Disney+, HBO Max
- OpenAI, GitHub Copilot, Notion
- AWS, Google Cloud, Vercel

### Utilities
- Electricity, Internet, Phone
- Insurance, Rent

### Business
- Payroll, Contractor payments
- Office rent, Software licenses
