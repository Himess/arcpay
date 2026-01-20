# Voice Module

Natural language payment commands powered by Gemini AI.

## Quick Start

```typescript
import { createVoiceProcessor } from 'arcpay';

const voice = createVoiceProcessor({
  geminiApiKey: process.env.GEMINI_API_KEY,
  privateKey: process.env.PRIVATE_KEY,
  contacts: [
    { name: 'ahmed', address: '0x742d35Cc...' },
    { name: 'bob', address: '0x8ba1f109...' },
  ],
});

// Process commands
await voice.process("Send 50 to Ahmed");
await voice.process("What's my balance?");
await voice.process("Create escrow for 500 to Bob");
```

## Features

- **Natural Language** - Speak naturally, AI understands
- **Contact Resolution** - Use names instead of addresses
- **Full SDK Access** - All ArcPay features via voice
- **Gemini Powered** - Fast, accurate intent parsing

## Supported Commands

### Payments
- "Send 50 to Ahmed"
- "Pay 100 USDC to 0x..."
- "What's my balance?"

### Contacts
- "Add Ahmed as contact with address 0x..."
- "Remove contact Bob"
- "List my contacts"
- "Who is Ahmed?"

### Subscriptions
- "Add Netflix subscription for 15 dollars monthly"
- "Pay my Netflix bill"
- "Pay all due bills"
- "What bills are due?"

### Escrow
- "Create escrow for 500 to Ahmed"
- "Release escrow"
- "Refund my escrow"

### Streaming
- "Stream 5000 to Ahmed over 30 days"
- "Cancel stream to Bob"
- "Claim my stream earnings"

### Split Payments
- "Split 100 between Ahmed, Bob and Charlie"

### Payment Links
- "Create payment link for 50 dollars"

### Payment Requests
- "Request 50 from Ahmed"
- "Request 100 from Ahmed and Bob"

### Privacy
- "Send 100 privately to Ahmed"
- "What's my stealth address?"

### AI Agents
- "Hire writer-bot for 50 to write a blog"

### x402 Micropayments
- "Pay for API call"

## API

| Function | Description |
|----------|-------------|
| `createVoiceProcessor(config)` | Create voice processor |
| `voice.process(command)` | Process and execute command |
| `voice.parse(command)` | Parse without executing |
| `voice.getSupportedCommands()` | Get all commands |
| `voice.getHelp(category?)` | Get help for category |
| `voice.resolveContact(name)` | Resolve name to address |
| `voice.setContacts(contacts)` | Update contacts list |

## Configuration

```typescript
interface VoiceConfig {
  geminiApiKey: string;      // Required: Gemini API key
  privateKey?: string;       // Optional: For executing transactions
  contacts?: Contact[];      // Optional: Pre-loaded contacts
  onLog?: LogCallback;       // Optional: Logging callback
}
```

## Response Format

```typescript
interface VoiceResult {
  action: string;      // The parsed action
  parsed: object;      // Full parsed data
  executed: boolean;   // Whether it was executed
  result?: any;        // Execution result
  error?: string;      // Error if failed
}
```

## Example with Logging

```typescript
const voice = createVoiceProcessor({
  geminiApiKey: 'your-key',
  onLog: (type, message) => {
    console.log(`[${type.toUpperCase()}] ${message}`);
  },
});

const result = await voice.process("Send 50 to ahmed");
// [INFO] Processing: "Send 50 to ahmed"
// [INFO] Action: pay
// [INFO] Resolved "ahmed" -> 0x742d35Cc...
// [SUCCESS] Executed: pay
```

## Use Cases

- Voice-controlled payment apps
- Accessibility features
- Hands-free payments
- Smart home integrations
- AI assistant integrations
