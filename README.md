# ArcPay SDK

> **The Payment SDK for AI Agents**
>
> Voice-controlled, ERC-4337 gasless, 28 modules. Built for autonomous commerce on Arc.

[![npm version](https://badge.fury.io/js/arcpay.svg)](https://www.npmjs.com/package/arcpay)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

ArcPay is a powerful SDK designed for building **autonomous commerce experiences** on the Arc blockchain. Whether you're integrating simple payments, building AI agents that handle transactions, or creating complex streaming payment systems, ArcPay provides all the tools you need.

---

## Why ArcPay?

| Feature | Description |
|---------|-------------|
| **ERC-4337 Gasless** | Zero gas fees for users via Circle Gas Station paymaster |
| **Voice & Vision** | Natural language payments with Gemini AI integration |
| **AI-First Design** | Purpose-built SDK for AI agents and autonomous systems |
| **One-liner API** | Simple functions for common operations - `pay()`, `escrow()`, `stream()` |
| **Real Smart Contracts** | 5 contracts deployed and verified on Arc Testnet |
| **Privacy Built-in** | Stealth address support (EIP-5564) for private payments |

---

## Quick Start

```bash
npm install arcpay
```

### One-liner Payments (Simplest Way)

```typescript
import { configure, pay, balance, escrow, stream } from 'arcpay';

// Configure once
configure({ privateKey: process.env.PRIVATE_KEY });

// Simple payment
await pay('0x...recipient', '100');

// Check balance
const { usdc, address } = await balance();
console.log(`Balance: ${usdc} USDC at ${address}`);

// Create escrow for freelance work
const { escrowId } = await escrow('0x...freelancer', '500', {
  release: 'on-approval',
  deadline: '7d'
});

// Stream salary payments
await stream('0x...employee', '5000', '30d');

// Private payment (stealth address)
await pay('0x...recipient', '100', { private: true });
```

### Full Client Usage

```typescript
import { ArcPay } from 'arcpay';

// Initialize
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY,
});

// Send USDC
await arc.sendUSDC('0x...', '100.00');

// Get balance
const balance = await arc.getBalance();
console.log(`Balance: ${balance} USDC`);
```

---

## Features Overview

### All Modules (28)

#### Core Payment
| Module | Description |
|--------|-------------|
| **pay** | Simple USDC transfers |
| **escrow** | Multi-party escrow with arbitration |
| **streaming** | Per-second salary payments |
| **channels** | Off-chain micropayments (x402) |
| **subscriptions** | Recurring payments |

#### AI & Voice (Hackathon Star)
| Module | Description |
|--------|-------------|
| **voice** | Speech-to-payment with Gemini |
| **ai** | Multimodal invoice/receipt analysis |
| **agent** | Autonomous AI agents with budgets |
| **intent** | Natural language command parsing |

#### Payment Tools
| Module | Description |
|--------|-------------|
| **contacts** | Address book, pay by name |
| **templates** | Reusable payment templates |
| **links** | Shareable payment links |
| **requests** | Payment request management |
| **split** | Split bills among multiple people |
| **invoices** | Create and pay invoices |

#### Advanced
| Module | Description |
|--------|-------------|
| **privacy/stealth** | EIP-5564 stealth addresses |
| **bridge** | Cross-chain USDC (Circle CCTP) |
| **gateway** | Unified multi-chain balance |
| **fx** | USDC ↔ EURC swaps |
| **usyc** | Yield-bearing USDC |

#### Infrastructure (ERC-4337 Gasless)
| Module | Description |
|--------|-------------|
| **smart-wallet** | ERC-4337 Smart Contract Accounts |
| **gas-station** | Circle Gas Station paymaster integration |
| **paymaster** | Zero gas fees for all user transactions |
| **compliance** | KYC/AML/Sanctions checks |
| **micropayments** | x402 protocol server/client |

### 📚 Module Documentation

Each module has detailed documentation with examples:

| Module | Docs | Description |
|--------|------|-------------|
| Escrow | [README](src/modules/escrow/README.md) | Multi-party secure payments |
| Streams | [README](src/modules/streams/README.md) | Real-time salary streaming |
| Channels | [README](src/modules/channels/README.md) | Off-chain micropayments |
| Privacy | [README](src/modules/privacy/README.md) | Stealth address payments |
| Stealth | [README](src/modules/stealth/README.md) | EIP-5564 implementation |
| Agent | [README](src/modules/agent/README.md) | Autonomous AI agents |
| AI Wallet | [README](src/modules/ai-wallet/README.md) | AI-powered wallet |
| Contacts | [README](src/modules/contacts/README.md) | Address book |
| Templates | [README](src/modules/templates/README.md) | Payment templates |
| Links | [README](src/modules/links/README.md) | Shareable payment links |
| Requests | [README](src/modules/requests/README.md) | Payment requests |
| Split | [README](src/modules/split/README.md) | Split payments |
| Invoices | [README](src/modules/invoices/README.md) | Invoice management |
| Subscriptions | [README](src/modules/subscriptions/README.md) | Recurring payments |
| Micropayments | [README](src/modules/micropayments/README.md) | x402 protocol |
| Bridge | [README](src/modules/bridge/README.md) | Cross-chain CCTP |
| Gateway | [README](src/modules/gateway/README.md) | Multi-chain balance |
| FX | [README](src/modules/fx/README.md) | USDC/EURC swaps |
| USYC | [README](src/modules/usyc/README.md) | Yield-bearing USDC |
| Smart Wallet | [README](src/modules/smart-wallet/README.md) | ERC-4337 AA |
| Gas Station | [README](src/modules/gas-station/README.md) | Gas sponsorship |
| Paymaster | [README](src/modules/paymaster/README.md) | Gasless txs |
| Compliance | [README](src/modules/compliance/README.md) | KYC/AML checks |
| Intent | [README](src/modules/intent/README.md) | NL command parsing |
| Streaming | [README](src/modules/streaming/README.md) | Audio streaming |
| Combo | [README](src/modules/combo/README.md) | Combined operations |

---

## Hackathon Features

Built for **Arc Hackathon 2026** - targeting Best Dev Tools, Best Trustless AI Agent, and Best Gemini Use.

### x402 Protocol (Micropayments)
Pay-per-request API monetization without gas fees.

```typescript
// Server: Add paywall
app.use(arc.micropayments.paywall('0xYourAddress', {
  'GET /api/premium': { price: '0.10' },
}));

// Client: Pay for access
const data = await arc.micropayments.pay('https://api.example.com/premium');
```

### ERC-4337 Gasless Payments (Circle Gas Station)
Users pay **zero gas fees** - all transactions sponsored by Circle's Gas Station paymaster.

```typescript
// Enable gasless mode with Circle Wallet
const arc = await ArcPay.init({
  network: 'arc-testnet',
  useCircleWallet: true,  // Enable ERC-4337 gasless
});

// This transaction costs 0 gas for the user!
await arc.sendUSDC('0x...', '100');

// Gasless escrow release
await arc.escrow.release(escrowId);  // 0 gas

// Gasless stream claim
await arc.streams.claim(streamId);   // 0 gas
```

**ERC-4337 Account Abstraction Flow:**
```
User Intent → Circle SCA Wallet → UserOperation
                    ↓
            ERC-4337 Bundler → EntryPoint Contract
                    ↓
         Gas Station Paymaster → Sponsors Gas Fee
                    ↓
              Transaction Executed (User pays $0)
```

**Verified Gasless Transactions:**
- [Stream Claim TX](https://testnet.arcscan.app/tx/0x9f566f944884a8936e0c195269c97cc777dadf632cf08a010852bfbe6ad47228) - Gas paid by paymaster
- [Contract Execution](https://testnet.arcscan.app/tx/0x98b231a56080bb62acff9558ff8d99a541a20b47f8774b526eb8851d432ce0ca) - Zero user gas

### Circle Gateway
Unified balance across Ethereum, Arbitrum, Base, Arc.

```typescript
const balance = await gateway.getUnifiedBalance('0x...user');
// { total: '1500', chains: { ethereum: '500', arc: '1000' } }
```

### Circle Integration Overview

| Feature | Description |
|---------|-------------|
| **ERC-4337 SCA Wallets** | Smart Contract Accounts with account abstraction |
| **Gas Station Paymaster** | `0x7ceA357B5AC0639F89F9e378a1f03Aa5005C0a25` |
| **EntryPoint** | `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789` |
| **Gateway** | Unified USDC balance across chains |
| **CCTP Bridge** | Cross-chain USDC transfers (Domain 26) |

Environment variables for Circle features:
```bash
CIRCLE_API_KEY=your_api_key
CIRCLE_ENTITY_SECRET=your_entity_secret
CIRCLE_WALLET_ID=your_wallet_id
```

### AI Voice Commands
"Send 50 to Ahmed" - Gemini understands and executes.

```typescript
const voiceAgent = createVoiceAgent({ geminiApiKey: '...' });
await voiceAgent.executeVoiceCommand();
// User speaks: "Send 50 USDC to Alice"
// Agent: "Sent 50 USDC to Alice. Transaction confirmed."
```

---

## AI Agent SDK

Build **autonomous AI agents** that handle payments without human intervention. Perfect for trading bots, AI assistants, and machine-to-machine payments.

```typescript
import { createAgent } from 'arcpay';

// Create an AI agent with budget controls
const agent = createAgent({
  privateKey: process.env.AGENT_PRIVATE_KEY,
  name: 'trading-bot',
  budget: {
    daily: '1000',        // Max daily spending
    perTransaction: '100', // Max per transaction
    hourly: '200'          // Max hourly spending
  },
  autoApprove: true,
  verbose: true
});

// Agent pays for API calls automatically
await agent.payForService('openai', '0.05');

// Agent hires a freelancer with escrow protection
const task = await agent.createTask({
  description: 'Write a blog post about AI',
  payment: '50',
  worker: '0x...freelancer',
  deadline: '48h'
});

// Agent approves and releases payment when work is done
await agent.approveTask(task.id);

// Agent starts streaming salary to an employee
await agent.startStream({
  recipient: '0x...employee',
  amount: '5000',
  duration: '30d'
});

// Open payment channel for high-frequency micropayments
await agent.openChannel('api-provider', '0x...', '10');
await agent.channelPay('api-provider', '0.001');
await agent.channelPay('api-provider', '0.002');

// Get spending report
const report = agent.getSpendingReport();
console.log(`Total spent today: ${report.totalSpent} USDC`);
console.log(`Remaining budget: ${report.remainingBudget.daily} USDC`);
```

---

## Gemini AI Integration

ArcPay integrates **Gemini 3.0 Flash** for intelligent payment processing. Use natural language commands, analyze invoices from images, and enable voice-controlled payments.

### Function Calling

Gemini directly calls ArcPay payment functions based on natural language:

```typescript
import { createAIAgent } from 'arcpay';

// Create AI-powered agent with Gemini
const aiAgent = createAIAgent({
  privateKey: process.env.PRIVATE_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  confirmBeforeExecute: true,
  confirmThreshold: '100' // Confirm payments over 100 USDC
});

// Natural language payment commands
await aiAgent.processCommand("Send 50 USDC to 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78");
await aiAgent.processCommand("Create an escrow for 500 USDC to alice.eth for website development");
await aiAgent.processCommand("Start streaming 5000 USDC to 0x... over 30 days");
await aiAgent.processCommand("What's my current balance?");
await aiAgent.processCommand("Show me my spending report for today");
```

### Multimodal - Invoice & Receipt Analysis

Analyze images of invoices, receipts, and delivery proofs:

```typescript
import { createMultimodalAnalyzer, createAIAgent } from 'arcpay';

const aiAgent = createAIAgent({
  privateKey: process.env.PRIVATE_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
});

// Analyze and pay invoice from image
const result = await aiAgent.analyzeAndPayInvoice(
  invoiceImageBase64,
  false // Set to true for auto-pay
);

console.log(`Invoice detected: ${result.data.analysis.amount} USDC`);
console.log(`Recipient: ${result.data.analysis.recipientName}`);
console.log(`Confidence: ${result.data.analysis.confidence * 100}%`);

// If confirmation needed
if (result.needsConfirmation) {
  console.log(result.confirmationPrompt);
  // User confirms...
  await aiAgent.confirmExecution();
}

// Verify delivery and release escrow
const deliveryResult = await aiAgent.analyzeDeliveryAndRelease(
  deliveryProofImage,
  escrowId,
  "MacBook Pro 14-inch",
  false // Set to true for auto-release
);
```

---

## Voice Commands

Enable hands-free payments with voice recognition and speech synthesis:

```typescript
import { createVoiceAgent } from 'arcpay';

// Create voice-enabled agent
const voiceAgent = createVoiceAgent({
  privateKey: process.env.PRIVATE_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  voice: {
    language: 'en-US',
    speakResponses: true,
    confirmLargePayments: true,
    largePaymentThreshold: '100'
  },
  aliases: {
    'alice': '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78',
    'bob': '0x8ba1f109551bD432803012645Ac136ddd64DBA72'
  }
});

// Execute voice command (listen -> AI -> execute -> speak)
const result = await voiceAgent.executeVoiceCommand();
// User says: "Send 25 USDC to Alice"
// Agent responds: "Sent 25 USDC to Alice. Transaction confirmed."

// Continuous listening mode
voiceAgent.startContinuousListening(
  (result) => console.log('Command result:', result),
  (error) => console.error('Error:', error)
);

// Stop listening
voiceAgent.stopContinuousListening();

// Check voice availability
if (voiceAgent.isVoiceAvailable()) {
  console.log('Voice features are available');
}
```

### React Components

```tsx
import { VoiceButton, ImagePayment, useVoiceAgent } from 'arcpay/react';

function PaymentApp() {
  const { processCommand, isVoiceAvailable } = useVoiceAgent({
    privateKey: process.env.PRIVATE_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
  });

  return (
    <div>
      {/* Voice command button */}
      <VoiceButton
        processCommand={processCommand}
        isVoiceAvailable={isVoiceAvailable}
        showTranscript={true}
        showStatus={true}
        onResult={(result) => console.log('Payment:', result)}
      />

      {/* Image-based payment */}
      <ImagePayment
        processWithImage={processWithImage}
        analyzeInvoice={analyzeInvoice}
        confirmPayment={confirmPayment}
        autoAnalyze={true}
        showPreview={true}
        allowCamera={true}
      />
    </div>
  );
}
```

---

## Escrow System

Secure multi-party payments with conditions and dispute resolution.

```typescript
import { createEscrowManager } from 'arcpay';

const escrow = createEscrowManager({ privateKey });

// Create escrow with conditions
const { id } = await escrow.createEscrow({
  depositor: '0x...buyer',
  beneficiary: '0x...seller',
  amount: '1000',
  conditions: [{
    type: 'approval',
    params: { approver: '0x...buyer' },
    isMet: false
  }],
  arbitrators: ['0x...arbiter'],
  expiresAt: '2025-12-31',
  description: 'Website development project'
});

// Fund the escrow
await escrow.fundEscrow(id);

// Release when conditions met
await escrow.releaseEscrow(id);

// Or refund if needed
await escrow.refundEscrow(id);

// Handle disputes
await escrow.createDispute(id, 'Work not delivered as specified');
await escrow.resolveDispute(id, 'release', 'Both parties agreed');
```

---

## Payment Streaming

Real-time continuous payments for salaries, subscriptions, and more.

```typescript
import { createStreamManager } from 'arcpay';

const streams = createStreamManager({ privateKey });

// Create a salary stream - $5000 over 30 days
const stream = await streams.createStream({
  recipient: '0x...employee',
  totalAmount: '5000',
  duration: 30 * 24 * 60 * 60, // 30 days in seconds
});

// Check claimable amount at any time
const { claimable, progress } = await streams.getClaimable(stream.id);
console.log(`Progress: ${progress.toFixed(2)}%`);
console.log(`Claimable: ${claimable} USDC`);

// Recipient claims their earnings (can be done anytime)
const claim = await streams.claim(stream.id);
console.log(`Claimed: ${claim.amountClaimed} USDC`);

// Cancel stream (refunds remaining to sender)
await streams.cancelStream(stream.id);
```

---

## Payment Channels

Off-chain micropayments with instant settlement. Perfect for API calls, gaming, and IoT.

```typescript
import { createPaymentChannelManager } from 'arcpay';

const channels = createPaymentChannelManager({ privateKey });

// Open a channel with $10 deposit
const channel = await channels.createChannel({
  recipient: '0x...api-provider',
  deposit: '10'
});

// Make instant micropayments (NO GAS FEES!)
await channels.pay(channel.id, '0.001');
await channels.pay(channel.id, '0.002');
await channels.pay(channel.id, '0.0015');
// ... thousands of payments possible

// Close and settle on-chain when done
const settlement = await channels.closeChannel(channel.id);
console.log(`Final settlement: ${settlement.txHash}`);
```

---

## Privacy (Stealth Addresses)

Private payments using EIP-5564 stealth addresses. Recipient addresses are hidden on-chain.

```typescript
import { createPrivacyModule, payPrivate, getStealthAddress } from 'arcpay';

// Get your stealth meta-address (share this to receive private payments)
const stealthAddress = await getStealthAddress();
console.log('Share this address:', stealthAddress);

// Send private payment
await payPrivate('st:arc:0x...recipient', '100');

// Using the full module
const privacy = createPrivacyModule({ privateKey });

// Scan for incoming private payments
const { payments } = await privacy.scanAnnouncements();
for (const payment of payments) {
  if (!payment.claimed) {
    await privacy.claimPayment(payment);
    console.log(`Claimed ${payment.amount} USDC privately!`);
  }
}
```

---

## Micropayments (x402 Protocol)

Implement pay-per-use APIs using the x402 protocol.

```typescript
// Server-side: Create paywall
import express from 'express';

const app = express();
app.use(arc.micropayments.paywall('0xYourAddress', {
  'GET /api/premium': { price: '0.10', description: 'Premium data' },
  'POST /api/generate': { price: '1.00', description: 'AI generation' },
}));

// Client-side: Make paid requests
const data = await arc.micropayments.pay('https://api.example.com/premium');
```

---

## Simple API Reference

### Configuration

```typescript
configure({
  privateKey: '0x...',
  network: 'arc-testnet'  // or 'arc-mainnet'
});
```

### Payments

| Function | Description |
|----------|-------------|
| `pay(to, amount, options?)` | Send USDC payment |
| `balance(options?)` | Get USDC balance |
| `payPrivate(to, amount)` | Send private payment |
| `getStealthAddress()` | Get stealth meta-address |

### Escrow

| Function | Description |
|----------|-------------|
| `escrow(beneficiary, amount, options?)` | Create escrow |
| `releaseEscrow(escrowId)` | Release to beneficiary |
| `refundEscrow(escrowId)` | Refund to depositor |

### Streaming

| Function | Description |
|----------|-------------|
| `stream(recipient, amount, duration)` | Start payment stream |
| `claimStream(streamId)` | Claim from stream |
| `cancelStream(streamId)` | Cancel stream |

### Payment Channels

| Function | Description |
|----------|-------------|
| `openChannel(recipient, deposit)` | Open channel |
| `channelPay(channelId, amount)` | Instant payment |
| `closeChannel(channelId)` | Settle and close |

---

## Deployed Smart Contracts

All contracts are deployed on **Arc Testnet** (Chain ID: 5042002):

| Contract | Address | Purpose |
|----------|---------|---------|
| **Escrow** | `0x0a982E2250F1C66487b88286e14D965025dD89D2` | Multi-party escrow with conditions |
| **Stream Payment** | `0x4678D992DE548BDdCb5cd4104470766b5207A855` | Real-time payment streaming |
| **Stealth Registry** | `0xbC6d02dBDe96caE69680BDbB63f9A12a14F3a41B` | Private payment announcements (EIP-5564) |
| **Payment Channel** | `0x3FF7bC1C52e7DdD2B7B915bDAdBe003037B0FA2E` | Off-chain micropayments |
| **Agent Registry** | `0x5E3ef9A91AD33270f84B32ACFF91068Eea44c5ee` | On-chain AI agent budget management |

---

## Network Configuration

### Arc Testnet

| Property | Value |
|----------|-------|
| **Chain ID** | 5042002 |
| **RPC URL** | https://rpc.testnet.arc.network |
| **Explorer** | https://testnet.arcscan.app |
| **Faucet** | https://faucet.arc.network |
| **Native Token** | USDC (used for gas) |

```typescript
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY,
});
```

---

## React Hooks

ArcPay includes React hooks for easy frontend integration:

```typescript
import {
  useArcPay,
  useEscrow,
  useStream,
  useChannel,
  usePrivacy,
  useAgent
} from 'arcpay/react';

function PaymentButton() {
  const { pay, balance, loading, error } = useArcPay();

  return (
    <button
      onClick={() => pay('0x...', '10')}
      disabled={loading}
    >
      Pay 10 USDC (Balance: {balance})
    </button>
  );
}

function SalaryStream() {
  const { createStream, claimable, claim, loading } = useStream();

  return (
    <div>
      <p>Claimable: {claimable} USDC</p>
      <button onClick={claim} disabled={loading}>
        Claim Earnings
      </button>
    </div>
  );
}
```

---

## Error Handling

```typescript
import {
  ArcPayError,
  SignerRequiredError,
  NetworkError,
  InsufficientBalanceError
} from 'arcpay';

try {
  await arc.sendUSDC('0x...', '1000000');
} catch (error) {
  if (error instanceof InsufficientBalanceError) {
    console.log(`Need ${error.required}, have ${error.available}`);
  } else if (error instanceof SignerRequiredError) {
    console.log('Please provide a private key');
  } else if (error instanceof NetworkError) {
    console.log('Network connection failed');
  }
}
```

---

## Resilience & Reliability

ArcPay includes built-in resilience features:

```typescript
import { retry, CircuitBreaker, FallbackRPCManager } from 'arcpay';

// Automatic retry with exponential backoff
const result = await retry(() => arc.sendUSDC(to, amount), {
  maxRetries: 3,
  baseDelay: 1000
});

// Circuit breaker for failing services
const breaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 30000
});
```

---

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type {
  ArcPayConfig,
  TransactionResult,
  Escrow,
  Stream,
  PaymentChannel,
  AgentConfig,
  SpendingReport,
  StealthAddress,
} from 'arcpay';
```

---

## Environment Variables

```bash
# Required
PRIVATE_KEY=0x...

# AI Features (for Gemini integration)
GEMINI_API_KEY=AIzaSy...

# Optional - Circle APIs
CIRCLE_API_KEY=...           # For FX swaps
CIRCLE_ENTITY_SECRET=...     # For Circle services

# Optional - Network
ARCPAY_NETWORK=arc-testnet
ARCPAY_RPC_URL=https://rpc.testnet.arc.network
```

---

## Examples

See the [examples](./examples) directory for complete working examples:

- **basic-payment** - Simple USDC transfers
- **escrow-freelance** - Freelancer payment with escrow
- **streaming-salary** - Employee salary streaming
- **ai-agent-commerce** - Autonomous AI agent making payments
- **private-payment** - Stealth address payments
- **payment-channels** - High-frequency micropayments

---

## Use Cases

### AI Agent Marketplace
AI agents autonomously hiring and paying other AI agents for services.

### Freelance Platform
Secure escrow-based payments with milestone tracking and dispute resolution.

### Subscription Services
Real-time streaming payments - users pay per second of usage.

### API Monetization
Payment channels for per-request API billing without gas fees.

### Private Payments
Stealth addresses for privacy-preserving transactions.

---

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) for details.

---

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

## Links

- [GitHub](https://github.com/Himess/arcpay)
- [NPM](https://www.npmjs.com/package/arcpay)
- [Arc Network](https://arc.network)
- [Circle](https://circle.com)

---

Built with love for the **Agentic Commerce on Arc Hackathon 2026** - Best Dev Tools Track
