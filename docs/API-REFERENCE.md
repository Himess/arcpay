# ArcPay SDK - API Reference

> Complete API documentation for ArcPay SDK v0.2.1

## Table of Contents

- [Core](#core)
- [Simple API](#simple-api)
- [Escrow](#escrow)
- [Streams](#streams)
- [Payment Channels](#payment-channels)
- [Privacy](#privacy)
- [AI Agent](#ai-agent)
- [On-Chain Agent Registry](#on-chain-agent-registry)
- [Circle Integration](#circle-integration) *(Gasless, Gateway, CCTP)*
- [Compliance](#compliance)
- [Subscriptions](#subscriptions)
- [Invoices](#invoices)
- [Webhooks](#webhooks)
- [Analytics](#analytics)
- [Events](#events)
- [Rate Limiting](#rate-limiting)
- [Logging](#logging)

---

## Core

### ArcPay.init(config)

Initialize the ArcPay SDK.

```typescript
const arc = await ArcPay.init({
  network: 'arc-testnet',    // 'arc-testnet' | 'arc-mainnet'
  privateKey: '0x...',       // Optional: for read-only, omit this
});
```

### arc.getBalance(address?)

Get USDC balance.

```typescript
const balance = await arc.getBalance();
// Returns: { usdc: '100.00', eurc: '0.00', address: '0x...' }

// Or for a specific address
const balance = await arc.getBalance('0x...');
```

### arc.sendUSDC(to, amount)

Send USDC to an address.

```typescript
const result = await arc.sendUSDC('0x...recipient', '100');
// Returns: { txHash: '0x...', success: true }
```

### arc.getContractAddresses()

Get deployed contract addresses.

```typescript
const addresses = arc.getContractAddresses();
// Returns: { escrow, streamPayment, stealthRegistry, paymentChannel, agentRegistry }
```

---

## Simple API

One-liner functions for common operations.

### configure(options)

Configure the SDK globally.

```typescript
import { configure } from 'arcpay';

configure({
  privateKey: '0x...',
  network: 'arc-testnet'
});
```

### pay(to, amount, options?)

Send a payment.

```typescript
import { pay } from 'arcpay';

await pay('0x...', '100');

// With options
await pay('0x...', '100', { private: true }); // Stealth payment
```

### balance(address?)

Get USDC balance.

```typescript
import { balance } from 'arcpay';

const { usdc, address } = await balance();
```

### escrow(beneficiary, amount, options?)

Create an escrow.

```typescript
import { escrow } from 'arcpay';

const { escrowId } = await escrow('0x...beneficiary', '500', {
  release: 'on-approval',
  deadline: '7d'
});
```

### stream(recipient, amount, duration)

Start a payment stream.

```typescript
import { stream } from 'arcpay';

const { streamId } = await stream('0x...', '5000', '30d');
```

---

## Escrow

### createEscrowManager(config)

Create an escrow manager instance.

```typescript
import { createEscrowManager } from 'arcpay';

const escrow = createEscrowManager({
  privateKey: '0x...',
  network: 'arc-testnet'
});
```

### escrow.create(params)

Create a new escrow.

```typescript
const result = await escrow.create({
  beneficiary: '0x...seller',
  amount: '1000',
  arbitrators: ['0x...arbiter'],     // Optional
  feePercentage: 100,                // Optional: 100 = 1%
  description: 'Website project'     // Optional
});

// Returns: { escrowId: '0x...', txHash: '0x...', success: true }
```

### escrow.getUserEscrows(address)

Get all escrows for a user.

```typescript
const escrows = await escrow.getUserEscrows('0x...');
// Returns: Array of escrow objects
```

### escrow.releaseEscrow(escrowId)

Release funds to beneficiary.

```typescript
const result = await escrow.releaseEscrow('0x...escrowId');
```

### escrow.refundEscrow(escrowId)

Refund funds to depositor.

```typescript
const result = await escrow.refundEscrow('0x...escrowId');
```

### escrow.createDispute(escrowId, reason)

Create a dispute on an escrow.

```typescript
await escrow.createDispute('0x...escrowId', 'Work not delivered');
```

### escrow.resolveDispute(escrowId, resolution, notes?)

Resolve a dispute (arbiter only).

```typescript
await escrow.resolveDispute(
  '0x...escrowId',
  'release',  // 'release' | 'refund' | 'split'
  'Both parties agreed'
);
```

---

## Streams

### createStreamManager(config)

Create a stream manager instance.

```typescript
import { createStreamManager } from 'arcpay';

const streams = createStreamManager({
  privateKey: '0x...'
});
```

### streams.create(params)

Create a payment stream.

```typescript
const result = await streams.create({
  recipient: '0x...',
  totalAmount: '5000',
  duration: 2592000  // 30 days in seconds
});

// Returns: { id: '0x...', txHash: '0x...', success: true }
```

### streams.getClaimable(streamId)

Get claimable amount from a stream.

```typescript
const info = await streams.getClaimable('0x...streamId');
// Returns: { claimable: '100.50', progress: 45.5 }
```

### streams.claim(streamId)

Claim accrued funds from a stream.

```typescript
const result = await streams.claim('0x...streamId');
// Returns: { amountClaimed: '100.50', txHash: '0x...' }
```

### streams.pause(streamId)

Pause a stream.

```typescript
const result = await streams.pause('0x...streamId');
```

### streams.resume(streamId)

Resume a paused stream.

```typescript
const result = await streams.resume('0x...streamId');
```

### streams.cancel(streamId)

Cancel a stream (refunds remaining to sender).

```typescript
const result = await streams.cancel('0x...streamId');
```

---

## Payment Channels

### createPaymentChannelManager(config)

Create a payment channel manager.

```typescript
import { createPaymentChannelManager } from 'arcpay';

const channels = createPaymentChannelManager({
  privateKey: '0x...'
});
```

### channels.openChannel(params)

Open a new payment channel.

```typescript
const channel = await channels.openChannel({
  recipient: '0x...',
  deposit: '10'  // Min: 0.001 USDC
});

// Returns: { channelId: '0x...', txHash: '0x...' }
```

### channels.getChannelBalance(channelId)

Get channel balance.

```typescript
const balance = await channels.getChannelBalance('0x...channelId');
// Returns: { balance: '8.5', spent: '1.5' }
```

### channels.pay(channelId, amount)

Make an instant payment through channel (no gas!).

```typescript
const receipt = await channels.pay('0x...channelId', '0.001');
// Returns: { signature: '0x...', amount: '0.001' }
```

### channels.emergencyClose(channelId)

Close channel and settle on-chain.

```typescript
const result = await channels.emergencyClose('0x...channelId');
// Returns: { txHash: '0x...', refundAmount: '8.5' }
```

---

## Privacy

### createPrivacyModule(config)

Create a privacy module for stealth payments.

```typescript
import { createPrivacyModule } from 'arcpay';

const privacy = createPrivacyModule({
  privateKey: '0x...'
});
```

### privacy.isRegistered(address?)

Check if address is registered for stealth payments.

```typescript
const isRegistered = await privacy.isRegistered();
```

### privacy.registerMetaAddress()

Register for receiving stealth payments.

```typescript
const result = await privacy.registerMetaAddress();
// Returns: { txHash: '0x...', metaAddress: 'st:arc:0x...' }
```

### privacy.sendStealthPayment(params)

Send a private payment.

```typescript
const result = await privacy.sendStealthPayment({
  to: 'st:arc:0x...recipient-meta-address',
  amount: '100'
});
```

### privacy.getTotalAnnouncements()

Get total number of stealth announcements.

```typescript
const count = await privacy.getTotalAnnouncements();
```

---

## AI Agent

### createAgent(config)

Create an AI agent for autonomous commerce.

```typescript
import { createAgent } from 'arcpay';

const agent = createAgent({
  privateKey: '0x...',
  name: 'trading-bot',
  budget: {
    daily: '1000',
    perTransaction: '100',
    hourly: '200'
  },
  autoApprove: true,
  verbose: true,

  // Security options
  allowedRecipients: ['0x...', '0x...'],   // Whitelist
  blockedRecipients: ['0x...'],             // Blacklist
  categoryBudgets: {
    'api-calls': '200',
    'freelance': '500'
  }
});
```

### agent.pay(to, amount, options?)

Quick payment.

```typescript
await agent.pay('0x...', '50', {
  note: 'API payment',
  private: false,
  category: 'api-calls'
});
```

### agent.payForService(service, amount, metadata?)

Pay for a service.

```typescript
await agent.payForService('openai', '0.05', {
  category: 'api-calls',
  model: 'gpt-4'
});
```

### agent.createTask(config)

Create a task with escrow protection.

```typescript
const task = await agent.createTask({
  description: 'Write a blog post',
  payment: '50',
  worker: '0x...freelancer',
  deadline: '48h',
  arbiter: '0x...arbiter'
});
```

### agent.approveTask(taskId)

Approve task and release payment.

```typescript
await agent.approveTask(task.id);
```

### agent.getSpendingReport()

Get spending report.

```typescript
const report = agent.getSpendingReport();
// Returns: { totalSpent, remainingBudget, byCategory, byRecipient }
```

---

## On-Chain Agent Registry

### createOnchainAgentManager(config)

Create an on-chain agent manager for trustless budget enforcement.

```typescript
import { createOnchainAgentManager } from 'arcpay';

const registry = createOnchainAgentManager({
  privateKey: '0x...',
  network: 'arc-testnet'
});
```

### registry.registerAgent(params)

Register an agent with budget limits.

```typescript
await registry.registerAgent({
  agentAddress: '0x...',
  dailyBudget: '1000',
  perTxLimit: '100'
});
```

### registry.depositFundsNative(params)

Deposit native USDC for agent (Arc Testnet compatible).

```typescript
await registry.depositFundsNative({
  agentAddress: '0x...',
  amount: '500'
});
```

### registry.executePayment(params)

Execute a payment from agent's deposited funds.

```typescript
await registry.executePayment({
  recipient: '0x...',
  amount: '50',
  memo: 'API payment'
});
```

### registry.getAgentInfo(address?)

Get agent configuration and balance.

```typescript
const info = await registry.getAgentInfo();
// Returns: { owner, dailyBudget, perTxLimit, todaySpent, balance, active }
```

---

## Compliance

### createComplianceModule(config)

Create a compliance module for KYC/AML checks.

```typescript
import { createComplianceModule } from 'arcpay';

const compliance = createComplianceModule();
```

### compliance.screenTransaction(params)

Screen a transaction for compliance.

```typescript
const result = await compliance.screenTransaction({
  from: '0x...',
  to: '0x...',
  amount: '10000'
});
// Returns: { allowed: true, riskScore: 'low', flags: [] }
```

### compliance.checkSanctions(address)

Check if an address is sanctioned.

```typescript
const result = await compliance.checkSanctions('0x...');
```

### compliance.addToBlacklist(address)

Block an address.

```typescript
await compliance.addToBlacklist('0x...bad-actor');
```

### compliance.checkAddress(address)

Get full risk profile for an address.

```typescript
const profile = await compliance.checkAddress('0x...');
```

---

## Subscriptions

### createSubscriptionManager(config)

Create a subscription manager.

```typescript
import { createSubscriptionManager } from 'arcpay';

const subs = createSubscriptionManager();
```

### subs.createPlan(params)

Create a subscription plan.

```typescript
const plan = await subs.createPlan({
  name: 'Pro Plan',
  price: '29.99',
  interval: 'monthly'
});
```

### subs.subscribe(params)

Subscribe to a plan.

```typescript
const subscription = await subs.subscribe({
  plan: plan.id,
  subscriber: '0x...'
});
```

### subs.cancel(subscriptionId)

Cancel a subscription.

```typescript
await subs.cancel(subscription.id);
```

### subs.listPlans()

List all plans.

```typescript
const plans = await subs.listPlans();
```

---

## Invoices

### createInvoiceManager(config)

Create an invoice manager.

```typescript
import { createInvoiceManager } from 'arcpay';

const invoices = createInvoiceManager();
```

### invoices.create(params)

Create an invoice.

```typescript
const invoice = await invoices.create({
  recipient: {
    name: 'Client Corp',
    email: 'client@example.com',
    address: '0x...'
  },
  items: [
    { description: 'Web Development', quantity: 1, unitPrice: '5000' },
    { description: 'Hosting (1 year)', quantity: 1, unitPrice: '500' }
  ],
  dueDate: '2025-02-15'
});
```

### invoices.list(filter?)

List invoices.

```typescript
const all = await invoices.list();
const pending = await invoices.list({ status: 'pending' });
```

---

## Webhooks

### createWebhookManager(config)

Create a webhook manager.

```typescript
import { createWebhookManager } from 'arcpay';

const webhooks = createWebhookManager();
```

### webhooks.subscribe(endpoint, events)

Subscribe to specific events.

```typescript
const sub = await webhooks.subscribe('https://my-app.com/webhook', [
  'payment.sent',
  'escrow.created',
  'stream.claimed'
]);
```

### webhooks.subscribeAll(endpoint)

Subscribe to all events.

```typescript
await webhooks.subscribeAll('https://my-app.com/webhook');
```

### webhooks.unregister(endpointId)

Unregister a webhook endpoint.

```typescript
await webhooks.unregister(sub.id);
```

---

## Analytics

### createAnalytics(config)

Create an analytics instance.

```typescript
import { createAnalytics } from 'arcpay';

const analytics = createAnalytics();
```

### analytics.track(event)

Track an event.

```typescript
await analytics.track({
  category: 'payment',
  action: 'send',
  value: 100
});
```

### analytics.generateReport(params)

Generate an analytics report.

```typescript
const report = await analytics.generateReport({
  startDate: '2025-01-01',
  endDate: '2025-01-31'
});
```

---

## Events

### events.on(eventType, handler)

Subscribe to events.

```typescript
const subscription = arc.events.on('payment.sent', (data) => {
  console.log('Payment sent:', data);
});
```

### events.emit(eventType, data)

Emit an event.

```typescript
arc.events.emit('custom.event', { foo: 'bar' });
```

### subscription.unsubscribe()

Unsubscribe from events.

```typescript
subscription.unsubscribe();
```

---

## Rate Limiting

### createRateLimiter(config)

Create a rate limiter.

```typescript
import { createRateLimiter } from 'arcpay';

const limiter = createRateLimiter({
  maxRequests: 100,
  windowMs: 60000  // 1 minute
});
```

### limiter.check(userId)

Check rate limit status.

```typescript
const status = limiter.check('user123');
// Returns: { allowed: true, remaining: 95, resetAt: 1234567890 }
```

### limiter.isAllowed(userId)

Check if request is allowed.

```typescript
if (limiter.isAllowed('user123')) {
  // Process request
}
```

### limiter.reset(userId)

Reset limit for a user.

```typescript
limiter.reset('user123');
```

---

## Logging

### createLogger(config)

Create a logger instance.

```typescript
import { createLogger } from 'arcpay';

const logger = createLogger({
  level: 'info',
  prefix: 'MyApp'
});
```

### logger.info/warn/error(message, data?)

Log messages.

```typescript
logger.info('Payment processed', { amount: '100', to: '0x...' });
logger.warn('Low balance', { balance: '5' });
logger.error('Transaction failed', { error: 'Insufficient funds' });
```

### logger.child(options)

Create a child logger with additional context.

```typescript
const txLogger = logger.child({ txId: '0x...' });
txLogger.info('Processing...');  // Includes txId in all logs
```

---

## Circle Integration

ArcPay integrates with Circle's infrastructure for gasless transactions and unified USDC management.

### Gasless Transactions

#### POST /api/circle/gasless

Execute a gasless transaction via Circle Gas Station.

**Request (Transfer):**
```json
{
  "type": "transfer",
  "to": "0x...",
  "amount": "10.00"
}
```

**Request (Contract Execution):**
```json
{
  "type": "contractExecution",
  "contractAddress": "0x...",
  "callData": "0x...",
  "value": "0"
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "...",
  "txHash": "0x...",
  "state": "COMPLETE",
  "sponsored": true,
  "explorerUrl": "https://testnet.arcscan.app/tx/0x..."
}
```

#### GET /api/circle/gasless

Check Gas Station status.

**Response:**
```json
{
  "success": true,
  "gasStationEnabled": true,
  "wallet": {
    "id": "...",
    "address": "0x4cc4...5a1a",
    "accountType": "SCA",
    "state": "LIVE"
  },
  "limits": {
    "dailyLimit": "50 USDC",
    "perTransaction": "No limit (testnet)"
  }
}
```

---

### Circle Gateway

#### GET /api/circle/gateway

Get unified USDC balance across chains.

**Response:**
```json
{
  "success": true,
  "balances": {
    "arc": "150.00",
    "ethereum": "500.00",
    "arbitrum": "250.00"
  },
  "totalBalance": "900.00"
}
```

---

### Transaction Status

#### GET /api/circle/transaction/[id]

Get Circle transaction status.

**Response:**
```json
{
  "success": true,
  "transactionId": "...",
  "state": "COMPLETE",
  "txHash": "0x...",
  "explorerUrl": "https://testnet.arcscan.app/tx/0x..."
}
```

---

### CCTP Bridge

#### POST /api/circle/bridge

Bridge USDC cross-chain via Circle CCTP.

**Request:**
```json
{
  "amount": "100.00",
  "sourceChain": "ethereum-sepolia",
  "destinationChain": "arc-testnet",
  "destinationAddress": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "...",
  "sourceDomain": 0,
  "destinationDomain": 26,
  "estimatedArrival": "~15 minutes"
}
```

---

## Contract Addresses (Arc Testnet)

| Contract | Address |
|----------|---------|
| Escrow | `0x0a982E2250F1C66487b88286e14D965025dD89D2` |
| Stream Payment | `0x4678D992De548bddCb5Cd4104470766b5207A855` |
| Stealth Registry | `0xbC6d02dBDe96caE69680BDbB63f9A12a14F3a41B` |
| Payment Channel | `0x3FF7bC1C52e7DdD2B7B915bDAdBe003037B0FA2E` |
| Agent Registry | `0x5E3ef9A91AD33270f84B32ACFF91068Eea44c5ee` |
| Gas Station | `0x7ceA357B5AC0639F89F9e378a1f03Aa5005C0a25` |

---

## Network Configuration

| Property | Value |
|----------|-------|
| Chain ID | 5042002 |
| RPC URL | https://rpc.testnet.arc.network |
| Explorer | https://testnet.arcscan.app |
| Native Token | USDC (18 decimals, used for gas) |

---

Generated for ArcPay SDK v0.2.1 | [GitHub](https://github.com/Himess/arcpay)
