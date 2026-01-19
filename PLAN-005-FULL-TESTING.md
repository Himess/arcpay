# PLAN-005: Full SDK & Playground Testing

## Overview
Complete end-to-end testing of the entire ArcPay SDK on Arc Testnet, plus verification that Playground UI matches SDK capabilities 1:1.

---

## PHASE 1: Full SDK Onchain Integration Tests

Create `test/full-sdk-onchain.test.ts` that tests EVERY module with REAL transactions.

### 1.1 Core Module Tests
```typescript
describe('Core Module', () => {
  test('getBalance - returns correct USDC balance')
  test('sendUSDC - transfers between wallets, verify both balances change')
  test('getTransactionHistory - returns recent transactions')
})
```

### 1.2 Escrow Module Tests
```typescript
describe('Escrow Module', () => {
  test('create escrow - funds locked in contract')
  test('release escrow - seller receives funds')
  test('refund escrow - buyer gets refund after deadline')
  test('dispute escrow - arbiter can resolve')
})
```

### 1.3 Streaming Module Tests
```typescript
describe('Streaming Module', () => {
  test('create stream - funds deposited')
  test('getStreamable - returns correct withdrawable amount over time')
  test('withdraw - recipient receives streamed amount')
  test('cancel stream - remaining funds returned to sender')
  test('pause/resume stream - streaming stops and resumes')
})
```

### 1.4 Contacts Module Tests
```typescript
describe('Contacts Module', () => {
  test('addContact - saves contact with address')
  test('getContact - retrieves by name')
  test('searchContacts - fuzzy search works')
  test('pay by name - resolves contact and sends payment')
  test('updateContact - modifies existing contact')
  test('removeContact - deletes contact')
})
```

### 1.5 Subscriptions Module Tests
```typescript
describe('Subscriptions Module', () => {
  test('addSubscription - creates recurring payment')
  test('getDueBills - returns bills due today/overdue')
  test('getUpcomingBills - returns bills due in X days')
  test('payBill - pays single subscription')
  test('payAllDueBills - pays all due at once')
  test('snoozeBill - delays due date')
  test('getMonthlyTotal - calculates correct sum')
})
```

### 1.6 Templates Module Tests
```typescript
describe('Templates Module', () => {
  test('listTemplates - returns all 25 templates')
  test('getTemplate - returns specific template')
  test('searchTemplates - finds by keyword')
  test('useTemplate - creates payment with template values')
  test('createTemplate - adds custom template')
  test('use Netflix template - real payment with preset amount')
  test('use Salary template - real payment for business use')
})
```

### 1.7 Split Payment Module Tests
```typescript
describe('Split Payment Module', () => {
  test('equal split - divides evenly between recipients')
  test('custom split - sends specific amounts to each')
  test('percentage split - calculates correct amounts from percentages')
  test('3-way split - verify all 3 receive correct USDC')
  test('split with contacts - uses contact names not addresses')
})
```

### 1.8 Payment Links Module Tests
```typescript
describe('Payment Links Module', () => {
  test('createLink - generates unique shareable link')
  test('payLink - pays link and updates status')
  test('getLink - returns link details and status')
  test('cancelLink - cancels unpaid link')
  test('link expiration - expired links cannot be paid')
  test('max uses - link deactivates after max payments')
})
```

### 1.9 Payment Requests Module Tests
```typescript
describe('Payment Requests Module', () => {
  test('createRequest - creates payment request')
  test('bulkRequest - requests from multiple contacts')
  test('payRequest - fulfills request with payment')
  test('declineRequest - marks as declined')
  test('cancelRequest - sender cancels own request')
  test('getIncoming - lists requests TO me')
  test('getOutgoing - lists requests FROM me')
})
```

### 1.10 Stealth/Privacy Module Tests
```typescript
describe('Privacy Module', () => {
  test('generateStealthAddress - creates valid stealth address')
  test('sendStealth - sends to stealth address')
  test('scanPayments - recipient can find their payments')
})
```

### 1.11 Voice Command Tests
```typescript
describe('Voice Commands', () => {
  test('parse "send 50 to ahmed" - correct intent extraction')
  test('parse "pay my netflix" - triggers subscription payment')
  test('parse "split 100 between alice bob charlie"')
  test('parse "create payment link for 50"')
  test('parse "request 25 from bob"')
  test('execute voice command - real transaction')
})
```

### 1.12 AI Agent Tests
```typescript
describe('AI Agent Module', () => {
  test('register agent - registers on contract')
  test('hire agent - creates job with budget')
  test('deposit funds - funds locked for job')
  test('approve work - releases payment to agent')
})
```

---

## PHASE 2: Playground-SDK Parity Check

Verify that EVERY feature in Playground works and matches SDK exactly.

### 2.1 Playground Tab Verification

Check each Playground tab has working examples:

| Tab | SDK Feature | Status |
|-----|-------------|--------|
| Payments | sendUSDC, pay | |
| Balance | getBalance | |
| Escrow | escrow.create, release, refund | |
| Streaming | stream.create, withdraw, cancel | |
| Contacts | addContact, pay by name | |
| Subscriptions | addSubscription, payBill, payAllDue | |
| Templates | useTemplate, listTemplates | |
| Split | split.equal, split.custom, split.byPercent | |
| Links | createLink, payLink | |
| Requests | createRequest, payRequest | |
| Privacy | stealthPay | |
| Voice | voice command execution | |
| AI Agent | agent.register, agent.hire | |

### 2.2 Playground Code Examples Update

For each tab, ensure:
1. Example code matches actual SDK API
2. "Run" button executes real transaction
3. Results display correctly (tx hash, explorer URL)
4. Error handling shows meaningful messages

### 2.3 Missing Playground Features

Add these if missing:
- Templates tab with template browser
- Split Payment tab with visual splitter
- Payment Links tab with QR code generation
- Payment Requests tab with inbox/outbox view

---

## PHASE 3: Onchain Playground Testing

Create `test/playground-onchain.test.ts` that:

1. Simulates running each Playground example
2. Verifies the transaction actually happens on Arc Testnet
3. Checks blockchain state matches expected result

```typescript
describe('Playground Onchain Tests', () => {
  describe('Payments Tab', () => {
    test('Run "Send Payment" example - real tx on chain')
    test('Run "Check Balance" example - returns real balance')
  })

  describe('Escrow Tab', () => {
    test('Run "Create Escrow" example - escrow created on chain')
    test('Run "Release Escrow" example - funds transferred')
  })

  describe('Streaming Tab', () => {
    test('Run "Create Stream" example - stream active on chain')
    test('Run "Withdraw" example - recipient balance increases')
  })

  describe('Templates Tab', () => {
    test('Run Netflix template - payment sent')
    test('Run Salary template - payment sent')
  })

  describe('Split Tab', () => {
    test('Run equal split - all recipients receive funds')
  })

  describe('Links Tab', () => {
    test('Create link - link is payable')
    test('Pay link - status updates')
  })

  describe('Requests Tab', () => {
    test('Create request - appears in outgoing')
    test('Pay request - funds transferred')
  })
})
```

---

## PHASE 4: Fix Any Missing Tests

After running all tests, identify and add missing test coverage:

1. Edge cases (zero amounts, invalid addresses, expired items)
2. Error scenarios (insufficient balance, unauthorized actions)
3. Concurrent operations (multiple streams, multiple escrows)
4. Large numbers (test with big USDC amounts)

---

## Expected Test Output

```
PASS test/full-sdk-onchain.test.ts
  Core Module
    ✓ getBalance - returns correct USDC balance
    ✓ sendUSDC - transfers between wallets
    ...
  Escrow Module
    ✓ create escrow - funds locked
    ✓ release escrow - seller receives
    ...
  (all modules...)

PASS test/playground-onchain.test.ts
  Payments Tab
    ✓ Send Payment example works
    ...
  (all tabs...)

Test Suites: 2 passed, 2 total
Tests:       100+ passed, 100+ total
```

---

## Success Criteria

1. ALL SDK modules have onchain tests
2. ALL tests pass with real transactions
3. ALL Playground tabs work and match SDK
4. Transaction hashes logged for verification
5. Zero regressions in existing tests

---

## Wallets for Testing

Use from .env:
- WALLET_A (PRIVATE_KEY) - Primary test wallet
- WALLET_B (PRIVATE_KEY_B) - Secondary test wallet

Ensure both have sufficient USDC balance for all tests.
