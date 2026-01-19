# PLAN-007: Full Playground API Test - All 177 APIs

## Overview
Test EVERY single Playground API example on Arc Testnet with real transactions.

---

## Test Configuration

```
Network: Arc Testnet (Chain ID: 5042002)
WALLET_A: Primary test wallet (PRIVATE_KEY)
WALLET_B: Secondary test wallet (PRIVATE_KEY_B)
Target: 177/177 APIs working
```

---

## API Categories & Tests

### 1. Core (7 APIs)
```typescript
describe('Core', () => {
  test('init - initialize ArcPay client')
  test('getBalance - get USDC balance')
  test('sendUSDC - transfer USDC')
  test('getEURCBalance - get EURC balance')
  test('sendEURC - transfer EURC')
  test('transfer - generic transfer')
  test('getTransactionHistory - list transactions')
})
```

### 2. Simple API (3 APIs)
```typescript
describe('Simple API', () => {
  test('configure - set up client')
  test('pay - one-liner payment')
  test('balance - one-liner balance check')
})
```

### 3. Escrow (9 APIs)
```typescript
describe('Escrow', () => {
  test('createEscrow - create new escrow')
  test('releaseEscrow - release funds to seller')
  test('refundEscrow - refund to buyer')
  test('getEscrow - get escrow details')
  test('getUserEscrows - list user escrows')
  test('createDispute - create dispute')
  test('resolveDispute - arbiter resolves')
  test('getEscrowStats - get statistics')
  test('multisigEscrow - multi-party escrow')
})
```

### 4. Streams (8 APIs)
```typescript
describe('Streams', () => {
  test('createStream - start new stream')
  test('claim - withdraw streamed funds')
  test('cancelStream - cancel and refund')
  test('getClaimable - check claimable amount')
  test('getStream - get stream details')
  test('pauseStream - pause streaming')
  test('resumeStream - resume streaming')
  test('StreamWatcher - watch stream events')
})
```

### 5. Channels (5 APIs)
```typescript
describe('Channels', () => {
  test('openChannel - open payment channel')
  test('pay - off-chain payment')
  test('getChannelBalance - check balance')
  test('getChannel - get channel details')
  test('closeChannel - settle on-chain')
})
```

### 6. Contacts (7 APIs)
```typescript
describe('Contacts', () => {
  test('contacts.add - add new contact')
  test('contacts.search - fuzzy search')
  test('contacts.resolve - name to address')
  test('transfer (pay by name) - pay using name')
  test('contacts.list - list all contacts')
  test('contacts.update - update contact')
  test('contacts.delete - remove contact')
})
```

### 7. Subscriptions (3 APIs)
```typescript
describe('Subscriptions', () => {
  test('createPlan - create subscription plan')
  test('subscribe - subscribe to plan')
  test('cancel - cancel subscription')
})
```

### 8. Templates (6 APIs)
```typescript
describe('Templates', () => {
  test('templates.list - list all 25+ templates')
  test('templates.get - get Netflix template')
  test('templates.get - get Spotify template')
  test('templates.use - use template for payment')
  test('templates.search - search templates')
  test('templates.create - create custom template')
})
```

### 9. Split Payment (4 APIs)
```typescript
describe('Split Payment', () => {
  test('split.preview - preview split calculation')
  test('split.equal - equal split between recipients')
  test('split.custom - custom amounts')
  test('split.byPercent - percentage-based split')
})
```

### 10. Payment Links (5 APIs)
```typescript
describe('Payment Links', () => {
  test('links.create - create shareable link')
  test('links.pay - pay a link')
  test('links.list - list all links')
  test('links.cancel - cancel unpaid link')
  test('links.getStatus - check link status')
})
```

### 11. Payment Requests (7 APIs)
```typescript
describe('Payment Requests', () => {
  test('requests.create - create payment request')
  test('requests.createBulk - bulk request')
  test('requests.pay - pay a request')
  test('requests.decline - decline request')
  test('requests.cancel - cancel own request')
  test('requests.listOutgoing - sent requests')
  test('requests.listIncoming - received requests')
})
```

### 12. Privacy/Stealth (4 APIs)
```typescript
describe('Privacy', () => {
  test('generateKeyPair - generate stealth keys')
  test('registerOnChain - register on contract')
  test('sendPrivate - stealth payment')
  test('scanAnnouncements - find payments')
})
```

### 13. Bridge (3 APIs)
```typescript
describe('Bridge', () => {
  test('transfer - initiate bridge')
  test('getStatus - check bridge status')
  test('getSupportedChains - list chains')
})
```

### 14. FX (3 APIs)
```typescript
describe('FX', () => {
  test('getQuote - get exchange rate')
  test('swap - USDC to EURC')
  test('getSupportedPairs - list pairs')
})
```

### 15. Gateway (4 APIs)
```typescript
describe('Gateway', () => {
  test('getUnifiedBalance - cross-chain balance')
  test('deposit - deposit to gateway')
  test('withdraw - withdraw from gateway')
  test('getSupportedDomains - list domains')
})
```

### 16. Agent (5 APIs)
```typescript
describe('Agent', () => {
  test('registerAgent - register AI agent')
  test('depositToAgent - fund agent')
  test('agentPay - agent makes payment')
  test('getAgentConfig - get config')
  test('getAgentBalance - check balance')
})
```

### 17. Onchain Agent (3 APIs)
```typescript
describe('Onchain Agent', () => {
  test('createOnchainAgentManager - create manager')
  test('getAgentInfo - get agent info')
  test('executeTask - run agent task')
})
```

### 18. AI (4 APIs)
```typescript
describe('AI', () => {
  test('parseCommand - parse natural language')
  test('explainTransaction - explain tx')
  test('chat - AI conversation')
  test('advancedAI - complex reasoning')
})
```

### 19. Voice (3 APIs)
```typescript
describe('Voice', () => {
  test('isSupported - check browser support')
  test('speak - text to speech')
  test('startListening - speech to text')
})
```

### 20. Intent (3 APIs)
```typescript
describe('Intent', () => {
  test('parseIntent - parse user intent')
  test('executeIntent - execute parsed intent')
  test('CommandParser - parse commands')
})
```

### 21. Smart Wallet (4 APIs)
```typescript
describe('Smart Wallet', () => {
  test('deploy - deploy smart wallet')
  test('execute - execute transaction')
  test('addGuardian - add guardian')
  test('batchExecute - batch operations')
})
```

### 22. AI Wallet (2 APIs)
```typescript
describe('AI Wallet', () => {
  test('deploy - deploy AI wallet')
  test('aiWalletInfo - get wallet info')
})
```

### 23. Compliance (4 APIs)
```typescript
describe('Compliance', () => {
  test('setRules - set compliance rules')
  test('checkTransaction - validate tx')
  test('screenAddress - screen address')
  test('addToBlocklist - block address')
})
```

### 24. Micropayments/x402 (3 APIs)
```typescript
describe('Micropayments', () => {
  test('pay - pay paywalled endpoint')
  test('fetch - fetch with payment')
  test('paywall - create middleware')
})
```

### 25. USYC (4 APIs)
```typescript
describe('USYC', () => {
  test('getBalance - USYC balance')
  test('subscribe - mint USYC')
  test('redeem - redeem for USDC')
  test('getExchangeRate - current rate')
})
```

### 26. Gas Station (3 APIs)
```typescript
describe('Gas Station', () => {
  test('deposit - deposit gas funds')
  test('getBalance - check balance')
  test('sponsorGas - sponsor transaction')
})
```

### 27. Paymaster (2 APIs)
```typescript
describe('Paymaster', () => {
  test('setRules - set sponsor rules')
  test('sponsorTransaction - sponsor tx')
})
```

### 28. Invoices (3 APIs)
```typescript
describe('Invoices', () => {
  test('create - create invoice')
  test('pay - pay invoice')
  test('list - list invoices')
})
```

### 29. Combo (2 APIs)
```typescript
describe('Combo', () => {
  test('batchExecute - batch operations')
  test('comboInfo - get combo info')
})
```

### 30. Contracts (2 APIs)
```typescript
describe('Contracts', () => {
  test('getContractAddresses - get addresses')
  test('ABIs - get contract ABIs')
})
```

### 31. Utilities (15+ APIs)
```typescript
describe('Utilities', () => {
  test('formatAmount - format USDC amount')
  test('validateAddress - validate address')
  test('verifySignature - verify signature')
  test('createLogger - create logger')
  test('defaultLogger - default logger')
  test('createEvent - create event')
  test('globalEventEmitter - event emitter')
  test('createRateLimiter - rate limiter')
  test('checkLimit - check rate limit')
  test('createWebhookManager - webhooks')
  test('registerEndpoint - register webhook')
  test('CircuitBreaker - circuit breaker')
  test('FallbackRPCManager - RPC fallback')
  test('analyticsInfo - analytics')
  test('TransactionWatcher - watch txs')
  test('TransactionExplainer - explain txs')
  test('SpendingAdvisor - spending advice')
})
```

---

## Test Output Format

```
=== CATEGORY_NAME ===
[✅ PASS] api_name - description
  TX: 0x... (if on-chain)

[❌ FAIL] api_name - error message

---
Category Result: X/Y passed
```

---

## Final Report Format

```
╔══════════════════════════════════════════════════════════╗
║          PLAYGROUND FULL API TEST REPORT                 ║
╠══════════════════════════════════════════════════════════╣
║ Category          │ Status    │ Passed │ Total │ TX Count║
╠═══════════════════╪═══════════╪════════╪═══════╪═════════╣
║ Core              │ ✅ PASS   │ 7      │ 7     │ 3       ║
║ Simple API        │ ✅ PASS   │ 3      │ 3     │ 1       ║
║ Escrow            │ ✅ PASS   │ 9      │ 9     │ 5       ║
║ Streams           │ ✅ PASS   │ 8      │ 8     │ 4       ║
║ Channels          │ ✅ PASS   │ 5      │ 5     │ 3       ║
║ Contacts          │ ✅ PASS   │ 7      │ 7     │ 2       ║
║ Subscriptions     │ ✅ PASS   │ 3      │ 3     │ 1       ║
║ Templates         │ ✅ PASS   │ 6      │ 6     │ 1       ║
║ Split Payment     │ ✅ PASS   │ 4      │ 4     │ 3       ║
║ Payment Links     │ ✅ PASS   │ 5      │ 5     │ 2       ║
║ Payment Requests  │ ✅ PASS   │ 7      │ 7     │ 2       ║
║ Privacy           │ ✅ PASS   │ 4      │ 4     │ 2       ║
║ Bridge            │ ✅ PASS   │ 3      │ 3     │ 0       ║
║ FX                │ ✅ PASS   │ 3      │ 3     │ 1       ║
║ Gateway           │ ✅ PASS   │ 4      │ 4     │ 1       ║
║ Agent             │ ✅ PASS   │ 5      │ 5     │ 2       ║
║ Onchain Agent     │ ✅ PASS   │ 3      │ 3     │ 1       ║
║ AI                │ ✅ PASS   │ 4      │ 4     │ 0       ║
║ Voice             │ ✅ PASS   │ 3      │ 3     │ 0       ║
║ Intent            │ ✅ PASS   │ 3      │ 3     │ 1       ║
║ Smart Wallet      │ ✅ PASS   │ 4      │ 4     │ 2       ║
║ AI Wallet         │ ✅ PASS   │ 2      │ 2     │ 1       ║
║ Compliance        │ ✅ PASS   │ 4      │ 4     │ 0       ║
║ Micropayments     │ ✅ PASS   │ 3      │ 3     │ 0       ║
║ USYC              │ ✅ PASS   │ 4      │ 4     │ 2       ║
║ Gas Station       │ ✅ PASS   │ 3      │ 3     │ 1       ║
║ Paymaster         │ ✅ PASS   │ 2      │ 2     │ 0       ║
║ Invoices          │ ✅ PASS   │ 3      │ 3     │ 1       ║
║ Combo             │ ✅ PASS   │ 2      │ 2     │ 1       ║
║ Contracts         │ ✅ PASS   │ 2      │ 2     │ 0       ║
║ Utilities         │ ✅ PASS   │ 15     │ 15    │ 0       ║
╠═══════════════════╧═══════════╧════════╧═══════╧═════════╣
║ TOTAL             │ ✅ PASS   │ 177    │ 177   │ 40+     ║
╚══════════════════════════════════════════════════════════╝
```

---

## Success Criteria

1. ✅ ALL 177 APIs tested
2. ✅ ALL on-chain APIs execute real transactions
3. ✅ ALL off-chain APIs return expected data
4. ✅ Transaction hashes logged
5. ✅ Final report shows 177/177 PASS

---

## Wallets

```env
WALLET_A = process.env.PRIVATE_KEY
WALLET_B = process.env.PRIVATE_KEY_B
```

Ensure sufficient USDC balance for all tests (~100 USDC recommended).
