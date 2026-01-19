# PLAN-005: Full Onchain Test - All 26 SDK Modules

## Overview
Comprehensive onchain testing of ALL SDK modules on Arc Testnet with real transactions.

---

## Test Configuration

```
Network: Arc Testnet (Chain ID: 5042002)
WALLET_A: Primary test wallet (from PRIVATE_KEY)
WALLET_B: Secondary test wallet (from PRIVATE_KEY_B)
USDC: Native USDC on Arc
```

---

## Module Tests (26 Modules)

### 1. Core Module
```typescript
describe('Core', () => {
  test('getBalance - returns USDC balance')
  test('sendUSDC - transfer between wallets')
  test('transfer - with recipient resolution')
  test('getTransactionHistory - returns recent txs')
})
```
**Verify:** Both wallet balances change correctly

### 2. Escrow Module
```typescript
describe('Escrow', () => {
  test('create - funds locked in contract')
  test('release - seller receives funds')
  test('refund - buyer gets refund')
  test('dispute - create dispute')
  test('resolve - arbiter resolves')
  test('getEscrow - returns escrow details')
  test('getUserEscrows - lists user escrows')
  test('getEscrowStats - returns stats')
})
```
**Verify:** Contract state matches expected

### 3. Streams/Streaming Module
```typescript
describe('Streams', () => {
  test('create - stream started, funds deposited')
  test('getClaimable - returns correct amount over time')
  test('withdraw/claim - recipient receives streamed amount')
  test('pause - streaming stops')
  test('resume - streaming continues')
  test('cancel - remaining returned to sender')
  test('getStream - returns stream details')
})
```
**Verify:** Per-second calculation is accurate

### 4. Channels Module
```typescript
describe('Channels', () => {
  test('open - channel created with deposit')
  test('pay - off-chain payment (no gas)')
  test('getBalance - returns channel balance')
  test('getChannel - returns channel details')
  test('close - settle on-chain')
})
```
**Verify:** Final settlement matches off-chain payments

### 5. Contacts Module
```typescript
describe('Contacts', () => {
  test('add - saves contact with address')
  test('search - fuzzy search works')
  test('resolve - returns address for name')
  test('payByName - transfer using name')
  test('list - returns all contacts')
  test('update - modifies contact')
  test('delete - removes contact')
})
```
**Verify:** Pay by name executes real transaction

### 6. Subscriptions Module
```typescript
describe('Subscriptions', () => {
  test('addSubscription - creates recurring payment')
  test('getDueBills - returns due today/overdue')
  test('getUpcomingBills - returns upcoming')
  test('payBill - pays single subscription')
  test('payAllDueBills - pays all due')
  test('snoozeBill - delays due date')
  test('getMonthlyTotal - calculates sum')
})
```
**Verify:** Billing day logic works correctly

### 7. Templates Module
```typescript
describe('Templates', () => {
  test('list - returns all 25+ templates')
  test('get - returns specific template (netflix, spotify)')
  test('search - finds by keyword')
  test('use - creates contact from template')
  test('create - adds custom template')
  test('getCategories - returns categories')
  test('USE REAL: Netflix template payment')
})
```
**Verify:** Template amounts match presets

### 8. Split Payment Module
```typescript
describe('Split', () => {
  test('preview - calculates without paying')
  test('equal - splits evenly, all receive')
  test('custom - specific amounts each')
  test('byPercent - percentage-based split')
  test('REAL: 3-way split, verify all 3 receive')
})
```
**Verify:** Each recipient receives correct amount

### 9. Payment Links Module
```typescript
describe('Links', () => {
  test('create - generates unique link')
  test('getStatus - returns link status')
  test('list - returns all links')
  test('pay - pays link, updates status')
  test('cancel - cancels unpaid link')
  test('expiration - expired links fail')
  test('maxUses - deactivates after limit')
})
```
**Verify:** Status transitions correctly

### 10. Payment Requests Module
```typescript
describe('Requests', () => {
  test('create - creates request')
  test('createBulk - requests from multiple')
  test('get - returns request details')
  test('pay - fulfills request')
  test('decline - marks declined')
  test('cancel - sender cancels')
  test('listOutgoing - requests I sent')
  test('listIncoming - requests to me')
  test('getTotalRequested - sum of pending')
})
```
**Verify:** Payment completes request

### 11. Gateway Module
```typescript
describe('Gateway', () => {
  test('getUnifiedBalance - cross-chain balance')
  test('deposit - deposit to gateway')
  test('withdraw - withdraw to chain')
  test('getSupportedDomains - lists domains')
  test('getInfo - API info')
})
```
**Verify:** Gateway API responds correctly

### 12. Bridge Module
```typescript
describe('Bridge', () => {
  test('getSupportedChains - lists chains')
  test('isChainSupported - validates chain')
  test('transfer - initiate bridge (if funds available)')
  test('getStatus - check transfer status')
})
```
**Verify:** CCTP integration works

### 13. Micropayments (x402) Module
```typescript
describe('Micropayments', () => {
  test('getBuyer - returns buyer instance')
  test('pay - pays paywalled endpoint')
  test('fetch - fetches with auto-payment')
  test('paywall - creates middleware')
})
```
**Verify:** HTTP 402 flow works

### 14. Privacy Module
```typescript
describe('Privacy', () => {
  test('generateKeyPair - creates keys')
  test('getStealthAddress - derives address')
  test('sendPrivate - private transfer')
  test('scan - finds received payments')
})
```
**Verify:** Stealth address is valid

### 15. Stealth Module
```typescript
describe('Stealth', () => {
  test('generateStealthMetaAddress - creates meta address')
  test('generateStealthAddress - derives one-time address')
  test('sendToStealth - sends to stealth')
  test('scanAnnouncements - finds payments')
  test('registerOnChain - registers keys')
})
```
**Verify:** EIP-5564 compliance

### 16. Agent Module
```typescript
describe('Agent', () => {
  test('register - registers agent on-chain')
  test('deposit - deposits funds for agent')
  test('pay - agent makes payment')
  test('getConfig - returns agent config')
  test('getBalance - returns agent balance')
  test('getAgentInfo - returns info')
})
```
**Verify:** Agent registry contract works

### 17. AI Module
```typescript
describe('AI', () => {
  test('parseCommand - extracts intent')
  test('explainTransaction - explains tx')
  test('chat - AI conversation')
})
```
**Verify:** Gemini API integration

### 18. AI-Wallet Module
```typescript
describe('AI-Wallet', () => {
  test('getInfo - wallet info')
  test('deploy - deploys smart wallet')
  test('execute - executes transaction')
})
```
**Verify:** Smart wallet deployment

### 19. Smart-Wallet Module
```typescript
describe('Smart-Wallet', () => {
  test('deploy - deploys wallet')
  test('execute - executes tx')
  test('addGuardian - adds guardian')
  test('batchExecute - batch operations')
})
```
**Verify:** Multi-sig works

### 20. Compliance Module
```typescript
describe('Compliance', () => {
  test('setRules - sets compliance rules')
  test('checkTransaction - validates tx')
  test('screenAddress - screens address')
  test('addToBlocklist - blocks address')
})
```
**Verify:** Rules are enforced

### 21. FX Module
```typescript
describe('FX', () => {
  test('getQuote - gets exchange rate')
  test('getSupportedPairs - lists pairs')
  test('swap - USDC to EURC swap')
})
```
**Verify:** Swap executes correctly

### 22. Gas-Station Module
```typescript
describe('Gas-Station', () => {
  test('deposit - deposits gas funds')
  test('getBalance - returns balance')
  test('sponsorGas - sponsors transaction')
})
```
**Verify:** Gas sponsorship works

### 23. Paymaster Module
```typescript
describe('Paymaster', () => {
  test('setRules - sets sponsor rules')
  test('sponsorTransaction - sponsors tx')
})
```
**Verify:** ERC-4337 integration

### 24. Invoices Module
```typescript
describe('Invoices', () => {
  test('create - creates invoice')
  test('pay - pays invoice')
  test('list - lists invoices')
  test('get - gets invoice details')
})
```
**Verify:** Invoice workflow complete

### 25. USYC Module
```typescript
describe('USYC', () => {
  test('getBalance - USYC balance')
  test('getExchangeRate - current rate')
  test('subscribe - mint USYC')
  test('redeem - redeem for USDC')
})
```
**Verify:** Yield token works

### 26. Combo Module
```typescript
describe('Combo', () => {
  test('batch - multiple operations')
  test('getInfo - combo info')
})
```
**Verify:** Batch execution

### 27. Intent Module
```typescript
describe('Intent', () => {
  test('parseIntent - parses natural language')
  test('executeIntent - executes parsed intent')
  test('execute - full flow')
})
```
**Verify:** NLP to transaction

### 28. Voice Module
```typescript
describe('Voice', () => {
  test('isSupported - checks browser support')
  test('parse "send 5 to wallet B"')
  test('execute voice command - REAL TX')
})
```
**Verify:** Voice to blockchain

---

## Test Output Format

For each module, log:
```
=== MODULE_NAME ===
Test: test_name
Status: PASS/FAIL
Tx Hash: 0x...
Explorer: https://testnet.arcscan.app/tx/0x...
Balance Before: X USDC
Balance After: Y USDC
---
```

---

## Success Criteria

1. ALL 28 test groups pass
2. ALL transactions confirmed on Arc Testnet
3. ALL balances verified correct
4. ALL contract states verified
5. Transaction hashes logged for each
6. Explorer URLs provided

---

## Wallets

```env
WALLET_A = process.env.PRIVATE_KEY (primary)
WALLET_B = process.env.PRIVATE_KEY_B (secondary)
```

Ensure both wallets have sufficient USDC for all tests.

---

## Expected Result

```
FULL SDK ONCHAIN TEST REPORT
============================
Core:           PASS (4/4 tests)
Escrow:         PASS (8/8 tests)
Streams:        PASS (7/7 tests)
Channels:       PASS (5/5 tests)
Contacts:       PASS (7/7 tests)
Subscriptions:  PASS (7/7 tests)
Templates:      PASS (7/7 tests)
Split:          PASS (5/5 tests)
Links:          PASS (7/7 tests)
Requests:       PASS (9/9 tests)
Gateway:        PASS (5/5 tests)
Bridge:         PASS (4/4 tests)
Micropayments:  PASS (4/4 tests)
Privacy:        PASS (4/4 tests)
Stealth:        PASS (5/5 tests)
Agent:          PASS (6/6 tests)
AI:             PASS (3/3 tests)
AI-Wallet:      PASS (3/3 tests)
Smart-Wallet:   PASS (4/4 tests)
Compliance:     PASS (4/4 tests)
FX:             PASS (3/3 tests)
Gas-Station:    PASS (3/3 tests)
Paymaster:      PASS (2/2 tests)
Invoices:       PASS (4/4 tests)
USYC:           PASS (4/4 tests)
Combo:          PASS (2/2 tests)
Intent:         PASS (3/3 tests)
Voice:          PASS (3/3 tests)
============================
TOTAL: 28/28 modules PASS
TRANSACTIONS: 50+ confirmed
```
