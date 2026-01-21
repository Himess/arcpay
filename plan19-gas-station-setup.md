# Plan 19: Gas Station Setup - Gasless Transactions

## 🎯 AMAÇ

Circle Gas Station'ı ArcPay SDK'ya entegre etmek. Kullanıcılar gas ödemeden USDC transfer edebilecek.

**Önkoşul: Plan 18 tamamlanmış olmalı (Circle API Key + Entity Secret + SCA Wallet)**

---

## 🎉 İYİ HABERLER

1. **Arc Testnet Gas Station'da destekleniyor!**
   - Contract: `0x7ceA357B5AC0639F89F9e378a1f03Aa5005C0a25`
   - Explorer: https://testnet.arcscan.app/address/0x7ceA357B5AC0639F89F9e378a1f03Aa5005C0a25

2. **Testnet'te otomatik policy var!**
   - Circle hesabı açınca default policy otomatik oluşuyor
   - Manuel policy oluşturmana gerek yok
   - Hemen gasless transaction gönderebilirsin

3. **Arc Testnet limitleri:**
   - Sponsored Token: USDC
   - Daily Limit: 50 USDC
   - İşlem başına limit yok (testnet)

4. **Billing:**
   - Testnet: ÜCRETSİZ
   - Mainnet: Kredi kartı ile ödeme (%5 fee)

---

## 📚 GAS STATION NASIL ÇALIŞIYOR?

```
Kullanıcı İsteği → Circle API → Gas Station (Paymaster) → Arc Testnet
                                     ↓
                              Gas fee'yi Circle öder
                              (ERC-4337 / Account Abstraction)
```

**Önemli Kavramlar:**
- **Paymaster**: Gas fee'yi ödeyen akıllı kontrat (ERC-4337)
- **SCA Wallet**: Smart Contract Account - Gas Station için şart
- **Policy**: Hangi işlemlerin sponsor edileceğini belirler (testnet'te otomatik)

---

## 📋 YAPILACAKLAR

### Adım 1: Plan 18 Tamamlandığını Kontrol Et

```bash
# .env.local dosyasında şunlar olmalı:
cat website/.env.local | grep CIRCLE
# CIRCLE_API_KEY=...
# CIRCLE_ENTITY_SECRET=...
# CIRCLE_WALLET_ID=...
```

Eğer yoksa önce Plan 18'i tamamla!

### Adım 2: Gas Station API Route'u Güncelle

`website/src/app/api/circle/gasless/route.ts` dosyasını kontrol et ve güncelle:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

// Circle client oluştur
function getCircleClient() {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

  if (!apiKey || !entitySecret) {
    throw new Error('Circle API credentials not configured');
  }

  return initiateDeveloperControlledWalletsClient({
    apiKey,
    entitySecret,
  });
}

// POST /api/circle/gasless - Gasless transaction gönder
export async function POST(request: NextRequest) {
  try {
    const { walletId, to, amount, tokenId = 'USDC' } = await request.json();

    if (!walletId || !to || !amount) {
      return NextResponse.json({
        error: 'walletId, to, and amount are required',
      }, { status: 400 });
    }

    const client = getCircleClient();

    // Gasless transfer - Gas Station otomatik sponsor eder (SCA wallet için)
    const response = await client.createTransaction({
      walletId,
      tokenId,
      destinationAddress: to,
      amounts: [amount],
      fee: {
        type: 'level',
        config: {
          feeLevel: 'MEDIUM',
        },
      },
    });

    const transaction = response.data?.transaction;

    return NextResponse.json({
      success: true,
      transactionId: transaction?.id,
      txHash: transaction?.txHash,
      state: transaction?.state,
      sponsored: true,
      explorerUrl: transaction?.txHash
        ? `https://testnet.arcscan.app/tx/${transaction.txHash}`
        : null,
    });
  } catch (error: any) {
    console.error('Gasless transaction error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gasless transaction failed',
    }, { status: 500 });
  }
}

// GET /api/circle/gasless - Gas Station durumunu kontrol et
export async function GET() {
  try {
    const client = getCircleClient();

    // Wallet bilgisini al
    const walletId = process.env.CIRCLE_WALLET_ID;
    if (!walletId) {
      return NextResponse.json({
        success: false,
        error: 'CIRCLE_WALLET_ID not configured',
        gasStationEnabled: false,
      });
    }

    const walletResponse = await client.getWallet({ id: walletId });
    const wallet = walletResponse.data?.wallet;

    return NextResponse.json({
      success: true,
      gasStationEnabled: wallet?.accountType === 'SCA',
      wallet: {
        id: wallet?.id,
        address: wallet?.address,
        blockchain: wallet?.blockchain,
        accountType: wallet?.accountType,
      },
      limits: {
        dailyLimit: '50 USDC',
        perTransaction: 'No limit (testnet)',
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      gasStationEnabled: false,
    }, { status: 500 });
  }
}
```

### Adım 3: SDK Paymaster Modülünü Güncelle

`website/src/app/playground/page.tsx` içindeki paymaster modülünü kontrol et:

```typescript
// Playground'daki SDK paymaster modülü
paymaster: {
  _circleWalletId: null as string | null,

  setCircleWalletId(walletId: string) {
    this._circleWalletId = walletId;
    console.log('[Paymaster] Circle wallet configured:', walletId);
  },

  async sponsorTransaction(request: { to: string; amount: string }) {
    const walletId = this._circleWalletId;

    if (!walletId) {
      throw new Error('Circle wallet not configured. Call setCircleWalletId() first.');
    }

    console.log('[Paymaster] Sending gasless transaction via Circle Gas Station');

    const response = await fetch('/api/circle/gasless', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletId,
        to: request.to,
        amount: request.amount,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Gasless transaction failed');
    }

    return {
      txHash: result.txHash,
      transactionId: result.transactionId,
      sponsored: true,
      explorerUrl: result.explorerUrl,
    };
  },

  async isEnabled() {
    const response = await fetch('/api/circle/gasless');
    const result = await response.json();
    return result.gasStationEnabled;
  },
},
```

### Adım 4: Voice Command Güncelle

Gasless voice command'ın çalıştığını kontrol et:

```typescript
// Voice command: "Send 10 gasless to Bob"
case 'pay_gasless': {
  if (!recipient) {
    addVoiceLog('error', 'Recipient required for gasless payment');
    break;
  }

  addVoiceLog('info', 'Sending gasless (sponsored) transaction...');

  // Circle wallet ID'yi al (environment'tan veya state'ten)
  const circleWalletId = process.env.NEXT_PUBLIC_CIRCLE_WALLET_ID || arc!.paymaster._circleWalletId;

  if (!circleWalletId) {
    addVoiceLog('error', 'Circle wallet not configured for gasless transactions');
    speakResponse('Gasless transactions require a Circle wallet');
    break;
  }

  const result = await arc!.paymaster.sponsorTransaction({
    to: resolveAddress(recipient),
    amount: String(amount || 0.1),
  });

  addVoiceLog('success', `⛽ Gasless payment sent!`);
  addVoiceLog('info', `  Amount: ${amount || 0.1} USDC`);
  addVoiceLog('info', `  TX: ${result.txHash}`);
  addVoiceLog('info', `  Gas sponsored by Circle`);

  speakResponse(`Sent ${amount || 0.1} USDC gasless to ${recipient}`);
  break;
}
```

### Adım 5: Test Et

```bash
# 1. Dev server başlat
cd website
npm run dev

# 2. Gas Station durumunu kontrol et
curl http://localhost:3000/api/circle/gasless
# Beklenen: { gasStationEnabled: true, wallet: {...} }

# 3. Gasless transaction gönder (Playground'dan veya curl ile)
curl -X POST http://localhost:3000/api/circle/gasless \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "YOUR_CIRCLE_WALLET_ID",
    "to": "0x...",
    "amount": "1"
  }'
```

---

## 🧪 TEST CHECKLIST

### API Tests
- [ ] `GET /api/circle/gasless` - Gas Station durumu döner
- [ ] `POST /api/circle/gasless` - Transaction başarılı

### Playground Tests
- [ ] Circle Wallet ID set edilebiliyor
- [ ] "Send gasless" butonu çalışıyor
- [ ] Voice command: "Send 10 gasless to Bob" çalışıyor
- [ ] Transaction explorer'da görünüyor

### Onchain Tests
- [ ] Transaction Arc Testnet'te confirm edildi
- [ ] Gas fee Circle tarafından ödendi (sender'dan gas alınmadı)
- [ ] USDC transfer başarılı

---

## 📊 EXECUTION CHECKLIST

- [ ] Plan 18 tamamlandı (API Key + Entity Secret + SCA Wallet)
- [ ] `/api/circle/gasless` route güncellendi
- [ ] SDK paymaster modülü güncellendi
- [ ] Voice command çalışıyor
- [ ] Test transaction gönderildi
- [ ] Explorer'da transaction görüntülendi

---

## 🎯 SUCCESS CRITERIA

1. ✅ `GET /api/circle/gasless` → `gasStationEnabled: true`
2. ✅ Gasless transaction gönderiliyor
3. ✅ Transaction Arc Testnet'te confirm ediliyor
4. ✅ Gas fee kullanıcıdan alınmıyor (Circle sponsor ediyor)
5. ✅ Voice command çalışıyor

---

## ⚠️ TROUBLESHOOTING

### "Circle wallet not configured"
- `.env.local`'da `CIRCLE_WALLET_ID` var mı kontrol et
- Plan 18'de wallet oluşturuldu mu kontrol et

### "Gas Station not enabled"
- Wallet tipi SCA mı kontrol et (EOA olmamalı)
- `accountType: "SCA"` ile wallet oluşturuldu mu

### "Transaction failed"
- Wallet'ta USDC var mı kontrol et
- Circle Console'dan USDC faucet kullan: https://faucet.circle.com/
- Daily limit (50 USDC) aşıldı mı kontrol et

### "Invalid blockchain"
- Wallet `ARC-TESTNET` üzerinde mi kontrol et
- Diğer chain'ler için farklı wallet gerekebilir

---

## 📝 NOTLAR

1. **Testnet ücretsiz** - Mainnet'te kredi kartı gerekli
2. **Daily limit 50 USDC** - Testnet için yeterli
3. **SCA wallet şart** - EOA wallet Gas Station kullanamaz
4. **Policy otomatik** - Testnet'te manuel policy gerekmez
5. **ERC-4337** - Account Abstraction standardı kullanılıyor
