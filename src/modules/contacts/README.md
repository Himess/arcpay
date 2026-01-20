# Contacts Module

Human-readable address book for ArcPay. Pay by name instead of 0x addresses.

## Quick Start

```typescript
import { addContact, pay, searchContacts } from 'arcpay';

// Add a contact
await addContact('alice', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78');

// Pay by name - no more copying addresses!
await pay('alice', '50');

// Fuzzy search
const results = await searchContacts('ali'); // Finds "alice"
```

## Features

- **Address Book** - Store addresses with human-readable names
- **Fuzzy Search** - Find contacts even with typos
- **Categories** - Organize contacts (personal, business, subscription)
- **Voice Support** - "Send 50 to Alice" just works
- **Auto-save** - Contacts persist across sessions

## API

| Function | Description |
|----------|-------------|
| `addContact(name, address, metadata?)` | Add a new contact |
| `getContact(name)` | Get contact by name |
| `listContacts(options?)` | List all contacts |
| `searchContacts(query)` | Fuzzy search contacts |
| `deleteContact(name)` | Remove a contact |
| `resolveContact(nameOrAddress)` | Resolve name to address |

## Voice Commands

- "Save alice as 0x742d35..."
- "Who is alice?"
- "Send 50 to alice"
- "List my contacts"
