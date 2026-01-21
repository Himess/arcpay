# Plan 20: Comprehensive Onchain & SDK Tests

## 🎯 AMAÇ

Tüm ArcPay SDK modüllerini gerçek onchain testlerle doğrulamak. Hiçbir simülasyon yok - her test gerçek blockchain transaction'ı veya gerçek API çağrısı yapacak.

**Hedef:** %100 çalışan SDK, hackathon birinciliği için hazır!

---

## 📊 TEST WALLETLARİ

### EOA Wallet (Senin Testnet Cüzdanın)
```
Private Key: 0beef695a3a30c5eb3a7c3ca656e1d8ec6f9c3a98349959326fe11e4a410dbc6
Address: [script hesaplayacak]
Kullanım: Core onchain testler (USDC transfer, escrow, streams, privacy, x402)
```

### Circle SCA Wallet (Gas Station)
```
Wallet ID: 7f5471f0-4261-5b00-836b-9a3746d13490
Address: 0x4cc48ea31173c5f14999222962a900ae2e945a1a
Blockchain: ARC-TESTNET
Kullanım: Gasless transaction testleri
```

---

## 📁 DOSYA YAPISI

```
website/
├── scripts/
│   ├── test-onchain.ts          # Ana test runner
│   ├── tests/
│   │   ├── infrastructure.ts    # RPC, contracts
│   │   ├── core-payments.ts     # USDC transfer
│   │   ├── escrow.ts            # Escrow full flow
│   │   ├── streams.ts           # Streams full flow
│   │   ├── privacy.ts           # Stealth addresses
│   │   ├── micropayments.ts     # x402 protocol
│   │   ├── circle-gasless.ts    # Gas Station
│   │   ├── circle-wallets.ts    # Circle Wallets API
│   │   ├── circle-gateway.ts    # Unified balance
│   │   ├── circle-bridge.ts     # CCTP bridge
│   │   ├── agents.ts            # Agent registry
│   │   ├── subscriptions.ts     # Subscription management
│   │   ├── api-endpoints.ts     # All API routes
│   │   └── sdk-modules.ts       # SDK method tests
│   └── test-results/
│       └── [timestamp].json     # Test results
├── tests/                       # Eski testler (referans)
│   └── legacy/
```

---

## 🧪 TEST KATEGORİLERİ VE MODÜLLER

### Kategori 1: Infrastructure (5 test)
```typescript
// tests/infrastructure.ts
- [ ] TEST_1_1: RPC Connection (Arc Testnet)
- [ ] TEST_1_2: Chain ID Verification (5042002)
- [ ] TEST_1_3: Escrow Contract Bytecode Check
- [ ] TEST_1_4: Stream Contract Bytecode Check
- [ ] TEST_1_5: Stealth Contract Bytecode Check
```

### Kategori 2: Core Payments (5 test)
```typescript
// tests/core-payments.ts
- [ ] TEST_2_1: Get USDC Balance (native)
- [ ] TEST_2_2: Get EURC Balance (ERC-20)
- [ ] TEST_2_3: USDC Transfer (0.001 USDC)
- [ ] TEST_2_4: Verify TX on Explorer
- [ ] TEST_2_5: Multi-recipient transfer (split)
```

### Kategori 3: Escrow (6 test)
```typescript
// tests/escrow.ts
- [ ] TEST_3_1: Create Escrow (0.01 USDC)
- [ ] TEST_3_2: Get Escrow Details
- [ ] TEST_3_3: Get My Escrows (as depositor)
- [ ] TEST_3_4: Get My Escrows (as beneficiary)
- [ ] TEST_3_5: Release Escrow
- [ ] TEST_3_6: Verify Final Balances
```

### Kategori 4: Streams (7 test)
```typescript
// tests/streams.ts
- [ ] TEST_4_1: Create Stream (0.01 USDC, 60 seconds)
- [ ] TEST_4_2: Get Stream Details
- [ ] TEST_4_3: Get My Streams (as payer)
- [ ] TEST_4_4: Get My Streams (as payee)
- [ ] TEST_4_5: Get Claimable Amount
- [ ] TEST_4_6: Claim Stream (partial)
- [ ] TEST_4_7: Cancel Stream (if unclaimed)
```

### Kategori 5: Privacy / Stealth Addresses (6 test)
```typescript
// tests/privacy.ts
- [ ] TEST_5_1: Generate Stealth Meta Address (noble-secp256k1)
- [ ] TEST_5_2: Register Meta Address on Contract
- [ ] TEST_5_3: Check Registration Status
- [ ] TEST_5_4: Get Registered Meta Address
- [ ] TEST_5_5: Generate Stealth Address for Recipient
- [ ] TEST_5_6: Send Private Payment (stealth transfer)
```

### Kategori 6: Micropayments / x402 (5 test)
```typescript
// tests/micropayments.ts
- [ ] TEST_6_1: Check /api/x402/weather returns 402
- [ ] TEST_6_2: Check /api/x402/premium returns 402
- [ ] TEST_6_3: Parse X-Payment headers
- [ ] TEST_6_4: Pay for weather endpoint (0.001 USDC)
- [ ] TEST_6_5: Verify payment TX and receive content
```

### Kategori 7: Circle Gas Station (5 test)
```typescript
// tests/circle-gasless.ts
- [ ] TEST_7_1: GET /api/circle/gasless - Status check
- [ ] TEST_7_2: Verify SCA wallet type
- [ ] TEST_7_3: Verify Gas Station enabled
- [ ] TEST_7_4: Send gasless transfer (0.001 USDC)
- [ ] TEST_7_5: Verify gas was sponsored (sender balance unchanged)
```

### Kategori 8: Circle Wallets (4 test)
```typescript
// tests/circle-wallets.ts
- [ ] TEST_8_1: GET /api/circle/wallets - Get wallet info
- [ ] TEST_8_2: Verify wallet address matches
- [ ] TEST_8_3: Verify wallet state is LIVE
- [ ] TEST_8_4: Get wallet balance via Circle API
```

### Kategori 9: Circle Gateway (4 test)
```typescript
// tests/circle-gateway.ts
- [ ] TEST_9_1: GET /api/circle/gateway - Unified balance
- [ ] TEST_9_2: Verify multi-chain balance structure
- [ ] TEST_9_3: Verify Arc Testnet balance included
- [ ] TEST_9_4: Cross-chain transfer simulation (dry-run)
```

### Kategori 10: Circle Bridge / CCTP (3 test)
```typescript
// tests/circle-bridge.ts
- [ ] TEST_10_1: GET /api/circle/bridge - Bridge status
- [ ] TEST_10_2: Get supported chains
- [ ] TEST_10_3: Estimate bridge fee (dry-run)
```

### Kategori 11: Agent Registry (5 test)
```typescript
// tests/agents.ts
- [ ] TEST_11_1: Register Agent on Contract
- [ ] TEST_11_2: Get Agent Info
- [ ] TEST_11_3: Update Agent Info
- [ ] TEST_11_4: Get All Registered Agents
- [ ] TEST_11_5: Deregister Agent
```

### Kategori 12: Subscriptions (4 test)
```typescript
// tests/subscriptions.ts
- [ ] TEST_12_1: Create Subscription Plan (local)
- [ ] TEST_12_2: Subscribe to Plan (local)
- [ ] TEST_12_3: Check Subscription Status
- [ ] TEST_12_4: Cancel Subscription
```

### Kategori 13: API Endpoints (12 test)
```typescript
// tests/api-endpoints.ts
- [ ] TEST_13_1: GET /api/pay - Returns error without params
- [ ] TEST_13_2: POST /api/pay - Requires private key
- [ ] TEST_13_3: GET /api/circle/wallets
- [ ] TEST_13_4: POST /api/circle/wallets
- [ ] TEST_13_5: GET /api/circle/gasless
- [ ] TEST_13_6: POST /api/circle/gasless
- [ ] TEST_13_7: GET /api/circle/gateway
- [ ] TEST_13_8: POST /api/circle/gateway
- [ ] TEST_13_9: GET /api/circle/bridge
- [ ] TEST_13_10: POST /api/circle/bridge
- [ ] TEST_13_11: GET /api/x402/weather
- [ ] TEST_13_12: GET /api/x402/premium
```

### Kategori 14: SDK Module Methods (20 test)
```typescript
// tests/sdk-modules.ts
// CORE
- [ ] TEST_14_1: arc.getBalance()
- [ ] TEST_14_2: arc.sendUSDC()
- [ ] TEST_14_3: arc.getTransactionHistory()

// ESCROW
- [ ] TEST_14_4: arc.escrow.create()
- [ ] TEST_14_5: arc.escrow.release()
- [ ] TEST_14_6: arc.escrow.getMyEscrows()

// STREAMS
- [ ] TEST_14_7: arc.streams.create()
- [ ] TEST_14_8: arc.streams.claim()
- [ ] TEST_14_9: arc.streams.getMyStreams()

// PRIVACY
- [ ] TEST_14_10: arc.privacy.generateMetaAddress()
- [ ] TEST_14_11: arc.privacy.registerMetaAddress()
- [ ] TEST_14_12: arc.privacy.sendPrivate()

// MICROPAYMENTS
- [ ] TEST_14_13: arc.micropayments.pay()
- [ ] TEST_14_14: arc.micropayments.createPaywall()

// PAYMASTER
- [ ] TEST_14_15: arc.paymaster.sponsorTransaction()
- [ ] TEST_14_16: arc.paymaster.isEnabled()

// CIRCLE WALLETS
- [ ] TEST_14_17: arc.circleWallets.create()
- [ ] TEST_14_18: arc.circleWallets.get()

// GATEWAY
- [ ] TEST_14_19: arc.gateway.getUnifiedBalance()

// BRIDGE
- [ ] TEST_14_20: arc.bridge.transfer()
```

### Kategori 15: Contacts & Utilities (5 test)
```typescript
// tests/utilities.ts
- [ ] TEST_15_1: contacts.add()
- [ ] TEST_15_2: contacts.get()
- [ ] TEST_15_3: contacts.list()
- [ ] TEST_15_4: contacts.resolveAddress()
- [ ] TEST_15_5: utils.formatUSDC()
```

### Kategori 16: Compliance & Safety (4 test)
```typescript
// tests/compliance.ts
- [ ] TEST_16_1: compliance.screenAddress() - Clean address
- [ ] TEST_16_2: compliance.screenAddress() - Blocked address
- [ ] TEST_16_3: circuitBreaker.checkTransaction()
- [ ] TEST_16_4: rateLimiter.checkLimit()
```

---

## 📊 TOPLAM TEST SAYISI

| Kategori | Test Sayısı |
|----------|-------------|
| Infrastructure | 5 |
| Core Payments | 5 |
| Escrow | 6 |
| Streams | 7 |
| Privacy | 6 |
| Micropayments | 5 |
| Circle Gas Station | 5 |
| Circle Wallets | 4 |
| Circle Gateway | 4 |
| Circle Bridge | 3 |
| Agent Registry | 5 |
| Subscriptions | 4 |
| API Endpoints | 12 |
| SDK Modules | 20 |
| Utilities | 5 |
| Compliance | 4 |
| **TOPLAM** | **100 test** |

---

## 🔧 TEST RUNNER YAPISI

```typescript
// scripts/test-onchain.ts
import { runInfrastructureTests } from './tests/infrastructure';
import { runCorePaymentTests } from './tests/core-payments';
// ... diğer importlar

interface TestResult {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  duration: number;
  txHash?: string;
  explorerUrl?: string;
  error?: string;
  details?: any;
}

interface TestSummary {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  results: TestResult[];
}

async function runAllTests(): Promise<TestSummary> {
  const results: TestResult[] = [];
  const startTime = Date.now();

  console.log('='.repeat(60));
  console.log('ArcPay SDK Comprehensive Test Suite');
  console.log('='.repeat(60));
  console.log('');

  // Run all test categories
  results.push(...await runInfrastructureTests());
  results.push(...await runCorePaymentTests());
  results.push(...await runEscrowTests());
  results.push(...await runStreamTests());
  results.push(...await runPrivacyTests());
  results.push(...await runMicropaymentTests());
  results.push(...await runGasStationTests());
  results.push(...await runCircleWalletTests());
  results.push(...await runGatewayTests());
  results.push(...await runBridgeTests());
  results.push(...await runAgentTests());
  results.push(...await runSubscriptionTests());
  results.push(...await runAPITests());
  results.push(...await runSDKModuleTests());
  results.push(...await runUtilityTests());
  results.push(...await runComplianceTests());

  const summary: TestSummary = {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed && !r.error?.includes('SKIPPED')).length,
    skipped: results.filter(r => r.error?.includes('SKIPPED')).length,
    duration: Date.now() - startTime,
    results,
  };

  // Save results
  const resultsPath = `./test-results/${Date.now()}.json`;
  await fs.writeFile(resultsPath, JSON.stringify(summary, null, 2));

  // Print summary
  console.log('');
  console.log('='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total:   ${summary.totalTests}`);
  console.log(`Passed:  ${summary.passed} ✅`);
  console.log(`Failed:  ${summary.failed} ❌`);
  console.log(`Skipped: ${summary.skipped} ⏭️`);
  console.log(`Duration: ${(summary.duration / 1000).toFixed(2)}s`);
  console.log('');
  console.log(`Results saved to: ${resultsPath}`);

  return summary;
}

runAllTests().catch(console.error);
```

---

## 🏃 ÇALIŞTIRMA

```bash
# Tüm testleri çalıştır
cd website
npm run test:onchain

# Sadece belirli kategori
npm run test:onchain -- --category=escrow

# Verbose mode
npm run test:onchain -- --verbose

# Dry-run (transaction yapmadan)
npm run test:onchain -- --dry-run
```

### package.json'a ekle:
```json
{
  "scripts": {
    "test:onchain": "tsx scripts/test-onchain.ts"
  }
}
```

---

## ⚠️ ÖNCEKİ TESTLER

Eski testler `website/tests/legacy/` klasörüne taşınacak (referans için saklanacak).

---

## 🔐 ENVIRONMENT VARIABLES

```env
# EOA Wallet (testler için)
TEST_PRIVATE_KEY=0beef695a3a30c5eb3a7c3ca656e1d8ec6f9c3a98349959326fe11e4a410dbc6

# Circle API (zaten var)
CIRCLE_API_KEY=...
CIRCLE_ENTITY_SECRET=...
CIRCLE_WALLET_ID=7f5471f0-4261-5b00-836b-9a3746d13490

# Arc Testnet
NEXT_PUBLIC_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_CHAIN_ID=5042002
```

---

## 📊 EXECUTION CHECKLIST

### Hazırlık
- [ ] EOA wallet'ta yeterli USDC var (en az 1 USDC)
- [ ] Circle SCA wallet'ta USDC var (en az 0.1 USDC)
- [ ] Dev server çalışıyor (npm run dev)
- [ ] Environment variables set

### Test Kategorileri
- [ ] Kategori 1: Infrastructure ✅
- [ ] Kategori 2: Core Payments
- [ ] Kategori 3: Escrow
- [ ] Kategori 4: Streams
- [ ] Kategori 5: Privacy
- [ ] Kategori 6: Micropayments
- [ ] Kategori 7: Circle Gas Station
- [ ] Kategori 8: Circle Wallets
- [ ] Kategori 9: Circle Gateway
- [ ] Kategori 10: Circle Bridge
- [ ] Kategori 11: Agent Registry
- [ ] Kategori 12: Subscriptions
- [ ] Kategori 13: API Endpoints
- [ ] Kategori 14: SDK Modules
- [ ] Kategori 15: Utilities
- [ ] Kategori 16: Compliance

### Sonuç
- [ ] 100 testin tamamı çalıştı
- [ ] Sonuçlar JSON dosyasına kaydedildi
- [ ] Failed testler analiz edildi
- [ ] Gerekli düzeltmeler yapıldı

---

## 🎯 SUCCESS CRITERIA

1. ✅ **95+ test passed** (100 üzerinden)
2. ✅ Tüm onchain işlemler explorer'da görünüyor
3. ✅ Circle API integration çalışıyor
4. ✅ x402 micropayments çalışıyor
5. ✅ Gasless transactions çalışıyor
6. ✅ Privacy (stealth) çalışıyor
7. ✅ Test results JSON'a kaydedildi

---

## 📝 NOTLAR

1. **Testler sıralı çalışmalı** - Bazı testler önceki testlerin sonucuna bağlı (örn: escrow create → release)
2. **USDC harcanacak** - Gerçek testnet USDC kullanılacak (~0.5-1 USDC toplam)
3. **Rate limiting** - Circle API için testler arası bekleme eklenebilir
4. **Timeout** - Onchain testler için 30s timeout
5. **Retry** - Failed testler 1 kez retry edilecek
