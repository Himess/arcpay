# Plan 17: Verification & Onchain Testing - Her Şeyin Gerçekten Çalıştığını Doğrula

## 🎯 AMAÇ

Plan 15'te yapılan tüm değişikliklerin gerçekten çalıştığını doğrulamak. Fake kod kalıntılarını temizlemek. Onchain testler yaparak her modülün gerçek blockchain transaction'ı yaptığını kanıtlamak.

**Prensip: "Güven ama doğrula" - Her şey test edilecek, her transaction explorer'da görülecek.**

---

## 📋 BÖLÜM A: KOD TEMİZLİK KONTROLÜ

### Task A.1: Basit SDK Kontrolü (Voice Commands için)

**Dosya:** `website/src/app/playground/page.tsx` satır 515-570

Bu bölümde hala eski fake kod olabilir. Kontrol et ve güncelle:

```typescript
// KONTROL ET - Bu kod hala fake mi?
paymaster: {
  async sponsorTransaction(request) {
    // Eğer sadece walletClient.sendTransaction varsa → FAKE
    // Eğer /api/circle/gasless çağrısı varsa → GERÇEK
  }
},
micropayments: {
  async pay<T>(url, options) {
    // Eğer sadece console.log varsa → FAKE
    // Eğer x402 headers parse + sendTransaction varsa → GERÇEK
  }
},
```

**Yapılacak:**
- [ ] Basit SDK'daki `paymaster` modülünü kontrol et
- [ ] Basit SDK'daki `micropayments` modülünü kontrol et
- [ ] Eğer fake ise, detaylı SDK ile senkronize et veya detaylı SDK'yı kullan

### Task A.2: Privacy Crypto Kontrolü

**Kontrol edilecek:**
- [ ] `noble-secp256k1` package.json'da var mı?
- [ ] `_derivePublicKey` fonksiyonu gerçek secp256k1 kullanıyor mu?
- [ ] `_generateStealthAddress` gerçek ECDH yapıyor mu?

```bash
# Package kontrolü
grep -r "noble" website/package.json

# Kod kontrolü
grep -n "secp256k1\|_derivePublicKey\|_generateStealthAddress" website/src/app/playground/page.tsx
```

### Task A.3: USYC Modülü Kontrolü

**Kontrol edilecek:**
- [ ] `subscribe()` fonksiyonu kaldırıldı mı veya "coming soon" mu?
- [ ] `redeem()` fonksiyonu kaldırıldı mı veya "coming soon" mu?
- [ ] `getBalance()` gerçek kontrat çağrısı yapıyor mu?

### Task A.4: FX Modülü Kontrolü

**Kontrol edilecek:**
- [ ] FX modülü tamamen kaldırıldı mı?
- [ ] Veya "Coming Soon" / disabled olarak mı işaretli?
- [ ] Hardcoded rates hala var mı?

### Task A.5: SmartWallet Modülü Kontrolü

**Kontrol edilecek:**
- [ ] Eski `smartWallet` modülü kaldırıldı mı?
- [ ] `circleWallets` modülü onun yerini aldı mı?
- [ ] Random address üretimi kaldırıldı mı?

### Task A.6: Console.log Fake Data Kontrolü

Tüm dosyada fake data üreten console.log'ları ara:

```bash
# Fake pattern'leri ara
grep -n "console.log.*simul\|console.log.*mock\|console.log.*fake\|console.log.*demo" website/src/app/playground/page.tsx

# Fake hash üretimi ara
grep -n "Date.now().*toString(16)\|Math.random().*toString" website/src/app/playground/page.tsx
```

---

## 📋 BÖLÜM B: ENVIRONMENT VARIABLES KONTROLÜ

### Task B.1: .env.local Dosyası Kontrolü

**Dosya:** `website/.env.local`

Gerekli değişkenler:
```env
# Circle API (ZORUNLU)
CIRCLE_API_KEY=your_api_key_here
CIRCLE_ENTITY_SECRET=your_entity_secret_here

# x402 Merchant Wallet (ZORUNLU for x402)
NEXT_PUBLIC_MERCHANT_WALLET=0x...

# Arc Testnet RPC (varsayılan var)
NEXT_PUBLIC_RPC_URL=https://rpc.testnet.arc.network

# Gemini API (voice için)
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_key
```

### Task B.2: Vercel Environment Variables

Vercel Dashboard'da kontrol et:
- [ ] CIRCLE_API_KEY eklendi mi?
- [ ] CIRCLE_ENTITY_SECRET eklendi mi?
- [ ] NEXT_PUBLIC_MERCHANT_WALLET eklendi mi?

---

## 📋 BÖLÜM C: ONCHAIN TEST SUITE

### Task C.1: Test Wallet Setup

Önce test wallet'ları oluştur:

```bash
cd /c/Users/USER/Desktop/Arc/arcpay
npx ts-node scripts/setup-test-wallets.ts
```

Çıktıyı `website/src/lib/test-wallets.ts`'e kopyala.

### Task C.2: Manuel Onchain Testler

Her test için:
1. İşlemi çalıştır
2. TX hash'i al
3. Explorer'da doğrula: `https://testnet.arcscan.app/tx/{hash}`

---

### TEST 1: USDC Transfer
```javascript
// Playground'da çalıştır
const result = await arc.sendUSDC('0x742d35Cc6634C0532925a3b844Bc9e7595f5bB71', '0.01');
console.log('TX:', result.txHash);
// Explorer'da kontrol et
```
- [ ] TX hash alındı
- [ ] Explorer'da confirmed
- [ ] Alıcı bakiyesi arttı

---

### TEST 2: x402 Micropayment
```javascript
// Playground'da çalıştır
const result = await arc.micropayments.pay('/api/x402/weather?city=istanbul', {
  maxPrice: '0.01'
});
console.log('Paid:', result._x402?.paid);
console.log('TX:', result._x402?.txHash);
console.log('Weather:', result.temperature);
```
- [ ] 402 response alındı
- [ ] USDC ödemesi yapıldı
- [ ] TX hash explorer'da görünüyor
- [ ] Weather data döndü

---

### TEST 3: Gasless Transaction (Circle Gas Station)

**Önkoşul:** Circle Wallet oluşturulmuş olmalı

```javascript
// Circle wallet oluştur
const wallet = await arc.circleWallets.create('test-user');
console.log('Wallet:', wallet.address);

// Gasless transaction
arc.paymaster.setCircleWalletId(wallet.walletId);
const result = await arc.paymaster.sponsorTransaction({
  to: '0x742d35Cc6634C0532925a3b844Bc9e7595f5bB71',
  amount: '0.01'
});
console.log('TX:', result.txHash);
console.log('Sponsored:', result.sponsored);
```
- [ ] Circle wallet oluşturuldu
- [ ] Transaction gönderildi
- [ ] `sponsored: true` döndü
- [ ] Kullanıcı gas ödemedi

---

### TEST 4: Escrow Create
```javascript
const result = await arc.escrow.create({
  beneficiary: '0x742d35Cc6634C0532925a3b844Bc9e7595f5bB71',
  amount: '1',
  duration: 86400,
  description: 'Test escrow'
});
console.log('TX:', result.txHash);
console.log('Escrow ID:', result.escrowId);
```
- [ ] TX hash alındı
- [ ] Escrow ID alındı
- [ ] Kontrat'ta escrow görünüyor

---

### TEST 5: Stream Create
```javascript
const result = await arc.streams.create({
  recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f5bB71',
  amount: '10',
  duration: 86400 * 7 // 7 days
});
console.log('TX:', result.txHash);
console.log('Stream ID:', result.streamId);
```
- [ ] TX hash alındı
- [ ] Stream ID alındı
- [ ] Stream aktif

---

### TEST 6: Privacy - Stealth Registration
```javascript
const result = await arc.privacy.registerMetaAddress();
console.log('TX:', result.txHash);
```
- [ ] TX hash alındı
- [ ] Meta address kontrata kaydedildi

---

### TEST 7: Privacy - Send Private
**Önkoşul:** Alıcı registerMetaAddress yapmış olmalı

```javascript
const result = await arc.privacy.sendPrivate({
  recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f5bB71',
  amount: '0.5'
});
console.log('TX:', result.txHash);
console.log('Stealth:', result.stealthAddress);
```
- [ ] TX hash alındı
- [ ] Stealth address üretildi
- [ ] Para gönderildi

---

### TEST 8: Gateway Balance
```javascript
const balance = await arc.gateway.getUnifiedBalance();
console.log('Total:', balance.total);
console.log('Chains:', balance.byChain);
```
- [ ] Balance döndü
- [ ] Birden fazla chain görünüyor (Circle wallet varsa)

---

### TEST 9: Bridge Transfer (CCTP)
**Önkoşul:** Circle wallet gerekli

```javascript
arc.bridge.setCircleWalletId(walletId);
const result = await arc.bridge.transfer({
  destinationChain: 'ethereum-sepolia',
  amount: '1',
  destinationAddress: '0x...'
});
console.log('Transfer ID:', result.transferId);
console.log('Burn TX:', result.burnTxHash);
```
- [ ] Transfer başlatıldı
- [ ] Burn TX hash alındı
- [ ] Status sorgulanabiliyor

---

### TEST 10: Voice Command (Onchain)
```
Sesli komut: "Send 0.01 to Ahmed"
```
- [ ] Gemini komutu parse etti
- [ ] Gerçek USDC transferi yapıldı
- [ ] TX hash activity log'da görünüyor
- [ ] Explorer'da confirmed

---

## 📋 BÖLÜM D: AUTOMATED TEST FILE

### Task D.1: E2E Test Dosyası Oluştur

**Dosya:** `website/src/__tests__/onchain.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';

// Test configuration
const TEST_PRIVATE_KEY = process.env.TEST_PRIVATE_KEY;
const RPC_URL = 'https://rpc.testnet.arc.network';

describe('ArcPay SDK - Onchain Tests', () => {
  let sdk: any;

  beforeAll(async () => {
    // Initialize SDK with test wallet
    // ... setup code
  });

  describe('Core Payments', () => {
    it('should transfer USDC onchain', async () => {
      const result = await sdk.sendUSDC('0x...', '0.001');

      expect(result.txHash).toMatch(/^0x[a-f0-9]{64}$/);
      expect(result.explorerUrl).toContain('arcscan.app');

      // Verify on chain
      // ... verification code
    }, 30000); // 30s timeout for blockchain
  });

  describe('x402 Micropayments', () => {
    it('should pay for x402 content', async () => {
      const result = await sdk.micropayments.pay('/api/x402/weather', {
        maxPrice: '0.01'
      });

      expect(result._x402.txHash).toMatch(/^0x[a-f0-9]{64}$/);
      expect(result.temperature).toBeDefined();
    }, 60000);
  });

  describe('Escrow', () => {
    it('should create escrow onchain', async () => {
      const result = await sdk.escrow.create({
        beneficiary: '0x...',
        amount: '0.1',
        duration: 3600,
      });

      expect(result.txHash).toMatch(/^0x[a-f0-9]{64}$/);
      expect(result.escrowId).toBeDefined();
    }, 30000);
  });

  describe('Streams', () => {
    it('should create payment stream', async () => {
      const result = await sdk.streams.create({
        recipient: '0x...',
        amount: '1',
        duration: 86400,
      });

      expect(result.txHash).toMatch(/^0x[a-f0-9]{64}$/);
      expect(result.streamId).toBeDefined();
    }, 30000);
  });

  describe('Privacy', () => {
    it('should register stealth meta-address', async () => {
      const result = await sdk.privacy.registerMetaAddress();
      expect(result.txHash).toMatch(/^0x[a-f0-9]{64}$/);
    }, 30000);
  });

  describe('Circle Integration', () => {
    it('should create Circle wallet via API', async () => {
      const result = await sdk.circleWallets.create('test-user');

      expect(result.success).toBe(true);
      expect(result.wallet.address).toMatch(/^0x[a-f0-9]{40}$/i);
    }, 30000);

    it('should send gasless transaction', async () => {
      // Requires Circle wallet
      const result = await sdk.paymaster.sponsorTransaction({
        walletId: 'test-wallet-id',
        to: '0x...',
        amount: '0.01',
      });

      expect(result.success).toBe(true);
      expect(result.sponsored).toBe(true);
    }, 60000);
  });
});
```

### Task D.2: Test Scripti Ekle

**package.json'a ekle:**
```json
{
  "scripts": {
    "test:onchain": "vitest run src/__tests__/onchain.test.ts",
    "test:onchain:watch": "vitest watch src/__tests__/onchain.test.ts"
  }
}
```

---

## 📋 BÖLÜM E: REGRESSION CHECK

### Task E.1: Mevcut Çalışan Özellikleri Test Et

Plan 15 öncesi çalışan özelliklerin hala çalıştığını doğrula:

| Özellik | Test | Sonuç |
|---------|------|-------|
| Wallet bağlantısı | Private key ile bağlan | ⬜ |
| Balance görüntüleme | Bakiye göster | ⬜ |
| USDC transfer | Ahmed'e 0.01 gönder | ⬜ |
| Contacts | Contact ekle/listele | ⬜ |
| Voice recognition | Sesli komut çalıştır | ⬜ |
| Activity log | İşlem geçmişi görüntüle | ⬜ |

### Task E.2: API Endpoints Test Et

```bash
# Health check
curl https://website-beige-six-15.vercel.app/api/pay -X POST -H "Content-Type: application/json" -d '{"test": true}'

# x402 endpoint (should return 402)
curl -I https://website-beige-six-15.vercel.app/api/x402/weather

# Circle endpoints (will fail without API key)
curl https://website-beige-six-15.vercel.app/api/circle/wallets -X POST -H "Content-Type: application/json" -d '{"userId": "test"}'
```

---

## 📊 EXECUTION CHECKLIST

### Bölüm A: Kod Temizlik ⬜
- [ ] A.1 - Basit SDK kontrolü
- [ ] A.2 - Privacy crypto kontrolü
- [ ] A.3 - USYC modülü kontrolü
- [ ] A.4 - FX modülü kontrolü
- [ ] A.5 - SmartWallet modülü kontrolü
- [ ] A.6 - Console.log fake data kontrolü

### Bölüm B: Environment Variables ⬜
- [ ] B.1 - .env.local kontrolü
- [ ] B.2 - Vercel env vars eklendi

### Bölüm C: Onchain Testler ⬜
- [ ] C.1 - Test wallet setup
- [ ] TEST 1 - USDC Transfer
- [ ] TEST 2 - x402 Micropayment
- [ ] TEST 3 - Gasless Transaction
- [ ] TEST 4 - Escrow Create
- [ ] TEST 5 - Stream Create
- [ ] TEST 6 - Privacy Registration
- [ ] TEST 7 - Privacy Send
- [ ] TEST 8 - Gateway Balance
- [ ] TEST 9 - Bridge Transfer
- [ ] TEST 10 - Voice Command

### Bölüm D: Automated Tests ⬜
- [ ] D.1 - Test dosyası oluştur
- [ ] D.2 - Test scripti ekle
- [ ] D.3 - Testleri çalıştır

### Bölüm E: Regression ⬜
- [ ] E.1 - Mevcut özellikler çalışıyor
- [ ] E.2 - API endpoints çalışıyor

---

## ⏱️ ESTIMATED TIME

| Bölüm | Süre |
|-------|------|
| A: Kod Temizlik | 1-2 saat |
| B: Environment | 30 dk |
| C: Onchain Testler | 2-3 saat |
| D: Automated Tests | 1-2 saat |
| E: Regression | 1 saat |

**Toplam: ~6-8 saat**

---

## 🎯 SUCCESS CRITERIA

### Her Test İçin:
1. ✅ TX hash `0x[64 hex chars]` formatında
2. ✅ Explorer'da `confirmed` status
3. ✅ Beklenen sonuç döndü
4. ✅ Hata yok

### Genel:
1. ✅ **Zero Fake Code** - Hiçbir console.log fake data, hiçbir mock hash
2. ✅ **All Tests Pass** - Tüm 10 onchain test geçti
3. ✅ **Explorer Verified** - Her TX explorer'da görünüyor
4. ✅ **Circle API Working** - Wallet, gasless, gateway çalışıyor
5. ✅ **x402 Working** - Gerçek ödeme + data akışı

---

## 📝 TEST SONUÇLARI ŞABLONU

Her test için doldur:

```
### TEST X: [Test Adı]
- Tarih: YYYY-MM-DD HH:mm
- Sonuç: ✅ PASS / ❌ FAIL
- TX Hash: 0x...
- Explorer: https://testnet.arcscan.app/tx/0x...
- Notlar: ...
```

---

## 🚨 HATA DURUMUNDA

Eğer test başarısız olursa:

1. **TX yok** → Wallet bağlı mı? Balance var mı?
2. **TX failed** → Gas yeterli mi? Kontrat adresi doğru mu?
3. **API error** → Environment variables doğru mu?
4. **Circle error** → API key geçerli mi? Entity secret doğru mu?
5. **x402 error** → Merchant wallet ayarlandı mı?

---

## 📎 İLGİLİ DOSYALAR

- `website/src/app/playground/page.tsx` - Ana SDK dosyası
- `website/src/app/api/circle/*` - Circle API routes
- `website/src/app/api/x402/*` - x402 API routes
- `website/src/lib/test-wallets.ts` - Test wallet config
- `scripts/setup-test-wallets.ts` - Wallet setup script
- `website/.env.local` - Environment variables
