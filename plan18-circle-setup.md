# Plan 18: Circle API Setup - Entity Secret ve Wallet Oluşturma

## 🎯 AMAÇ

Circle Developer-Controlled Wallets için gerekli API credentials'ları oluşturmak ve projeye entegre etmek.

---

## 🎉 İYİ HABERLER

1. **Arc Testnet Gas Station'da destekleniyor!**
   - Contract: `0x7ceA357B5AC0639F89F9e378a1f03Aa5005C0a25`
   - Explorer: https://testnet.arcscan.app/address/0x7ceA357B5AC0639F89F9e378a1f03Aa5005C0a25

2. **Testnet'te otomatik policy var!**
   - Circle hesabı açınca default policy otomatik oluşuyor
   - Manuel policy oluşturmana gerek yok

3. **Arc Testnet limitleri:**
   - Sponsored Token: USDC
   - Daily Limit: 50 USDC

4. **SCA Wallet gerekli** (Gas Station için)
   - `accountType: "SCA"` ile wallet oluştur
   - EOA değil, Smart Contract Account

---

## 📋 YAPILACAKLAR

### Adım 1: Circle SDK Kur

```bash
cd website
npm install @circle-fin/developer-controlled-wallets --save
```

### Adım 2: Setup Script Oluştur

`scripts/setup-circle.ts` dosyası oluştur:

```typescript
/**
 * Circle Entity Secret Setup Script
 *
 * Bu script:
 * 1. Entity Secret oluşturur (32-byte hex)
 * 2. Circle'a kaydeder
 * 3. Recovery file'ı kaydeder
 * 4. .env.local'a ekler
 */

import { generateEntitySecret, registerEntitySecretCiphertext } from "@circle-fin/developer-controlled-wallets";
import * as fs from 'fs';
import * as path from 'path';

async function setup() {
  console.log('='.repeat(50));
  console.log('Circle Entity Secret Setup');
  console.log('='.repeat(50));

  // 1. Entity Secret oluştur
  console.log('\n1. Entity Secret oluşturuluyor...');
  const entitySecret = generateEntitySecret();
  console.log('✅ Entity Secret oluşturuldu');
  console.log(`   Secret: ${entitySecret.slice(0, 10)}...${entitySecret.slice(-10)}`);

  // 2. Masaüstüne kaydet (backup)
  const desktopPath = path.join(process.env.USERPROFILE || '', 'Desktop');
  const backupPath = path.join(desktopPath, 'circle-entity-secret-BACKUP.txt');

  fs.writeFileSync(backupPath, `
CIRCLE ENTITY SECRET - GİZLİ TUT!
=================================
Oluşturulma: ${new Date().toISOString()}

Entity Secret: ${entitySecret}

⚠️ UYARI: Bu dosyayı güvenli bir yerde sakla!
Circle bu secret'ı saklamıyor - kaybedersen wallet'lara erişimi kaybedersin.
  `.trim());

  console.log(`✅ Backup kaydedildi: ${backupPath}`);

  // 3. API Key kontrolü
  const apiKey = process.env.CIRCLE_API_KEY;
  if (!apiKey) {
    console.log('\n❌ CIRCLE_API_KEY bulunamadı!');
    console.log('   Circle Console\'dan API key al: https://console.circle.com');
    console.log('   Sonra .env.local dosyasına ekle:');
    console.log('   CIRCLE_API_KEY=your_api_key_here');
    console.log('\n   Entity Secret masaüstüne kaydedildi. API key aldıktan sonra tekrar çalıştır.');
    return;
  }

  // 4. Entity Secret'ı Circle'a kaydet
  console.log('\n2. Entity Secret Circle\'a kaydediliyor...');

  const recoveryPath = path.join(desktopPath, 'circle-recovery-file.txt');

  try {
    const response = await registerEntitySecretCiphertext({
      apiKey: apiKey,
      entitySecret: entitySecret,
      recoveryFileDownloadPath: recoveryPath,
    });

    console.log('✅ Entity Secret kaydedildi!');
    console.log(`✅ Recovery file kaydedildi: ${recoveryPath}`);

    // 5. .env.local güncelle
    const envPath = path.join(process.cwd(), '.env.local');
    let envContent = '';

    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }

    // Entity Secret ekle/güncelle
    if (envContent.includes('CIRCLE_ENTITY_SECRET=')) {
      envContent = envContent.replace(
        /CIRCLE_ENTITY_SECRET=.*/,
        `CIRCLE_ENTITY_SECRET=${entitySecret}`
      );
    } else {
      envContent += `\n# Circle Entity Secret (generated ${new Date().toISOString()})\nCIRCLE_ENTITY_SECRET=${entitySecret}\n`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env.local güncellendi');

  } catch (error: any) {
    console.log(`\n❌ Kayıt hatası: ${error.message}`);
    console.log('   Entity Secret masaüstüne kaydedildi.');
    console.log('   Manuel olarak Circle Console\'dan kayıt yapabilirsin.');
  }

  console.log('\n' + '='.repeat(50));
  console.log('Setup tamamlandı!');
  console.log('='.repeat(50));
}

setup().catch(console.error);
```

### Adım 3: Script'i Çalıştır

```bash
cd website
npx tsx scripts/setup-circle.ts
```

### Adım 4: Wallet Set ve Wallet Oluştur (ZORUNLU - Gas Station için)

Entity Secret kaydedildikten sonra **ARC-TESTNET üzerinde SCA wallet** oluşturmak için:

```typescript
// scripts/create-circle-wallet.ts
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

async function createWallet() {
  const client = initiateDeveloperControlledWalletsClient({
    apiKey: process.env.CIRCLE_API_KEY!,
    entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
  });

  // 1. Wallet Set oluştur
  console.log('Wallet Set oluşturuluyor...');
  const walletSetResponse = await client.createWalletSet({
    name: "ArcPay Wallet Set",
  });

  const walletSetId = walletSetResponse.data?.walletSet?.id;
  console.log('✅ Wallet Set:', walletSetId);

  // 2. SCA Wallet oluştur - ARC TESTNET üzerinde (Gas Station destekli)
  console.log('SCA Wallet oluşturuluyor (Arc Testnet)...');
  const walletResponse = await client.createWallets({
    accountType: "SCA",  // ÖNEMLİ: Gas Station için SCA şart!
    blockchains: ["ARC-TESTNET"],  // Arc Testnet
    count: 1,
    walletSetId: walletSetId!,
  });

  const wallet = walletResponse.data?.wallets?.[0];
  console.log('✅ Wallet oluşturuldu!');
  console.log('   Address:', wallet?.address);
  console.log('   ID:', wallet?.id);
  console.log('   Blockchain:', wallet?.blockchain);
  console.log('   Account Type:', wallet?.accountType);

  // 3. Wallet ID'yi kaydet
  console.log('\n📝 Bu ID\'yi .env.local\'a ekle:');
  console.log(`CIRCLE_WALLET_ID=${wallet?.id}`);
}

createWallet().catch(console.error);
```

**ÖNEMLİ NOTLAR:**
- `accountType: "SCA"` - Smart Contract Account (Gas Station için şart!)
- `blockchains: ["ARC-TESTNET"]` - Arc Testnet üzerinde oluştur
- Testnet'te otomatik Gas Station policy var, manuel oluşturmana gerek yok
- Günlük 50 USDC gas sponsorship limiti var

---

## 📁 OLUŞTURULACAK DOSYALAR

| Dosya | Konum | İçerik |
|-------|-------|--------|
| `setup-circle.ts` | `website/scripts/` | Entity Secret setup script |
| `create-circle-wallet.ts` | `website/scripts/` | Wallet oluşturma script |
| `circle-entity-secret-BACKUP.txt` | Masaüstü | Entity Secret backup |
| `circle-recovery-file.txt` | Masaüstü | Recovery file |

---

## 🔐 .env.local Örnek

```env
# Circle API (Console'dan al)
CIRCLE_API_KEY=TEST_API_KEY:xxxxxxxx:yyyyyyyy

# Circle Entity Secret (script oluşturur)
CIRCLE_ENTITY_SECRET=ecd4d5e33b8e7a9f...

# Circle Wallet ID (wallet oluşturduktan sonra)
CIRCLE_WALLET_ID=ce714f5b-0d8e-4062-9454-61aa1154869b
```

---

## ⚠️ GÜVENLİK UYARILARI

1. **Entity Secret'ı GİT'e COMMIT ETME!** - `.env.local` zaten `.gitignore`'da
2. **Recovery File'ı güvenli sakla** - Entity Secret'ı kaybedersen tek kurtarma yolu
3. **API Key'i paylaşma** - Testnet bile olsa güvenli tut

---

## 📊 EXECUTION CHECKLIST

- [ ] Circle SDK kuruldu (`npm install @circle-fin/developer-controlled-wallets`)
- [ ] `scripts/setup-circle.ts` oluşturuldu
- [ ] Circle Console'dan API Key alındı
- [ ] API Key `.env.local`'a eklendi
- [ ] Setup script çalıştırıldı
- [ ] Entity Secret masaüstüne kaydedildi
- [ ] Recovery file masaüstüne kaydedildi
- [ ] `.env.local` güncellendi

---

## 🎯 SUCCESS CRITERIA

1. ✅ Entity Secret oluşturuldu ve masaüstüne kaydedildi
2. ✅ Entity Secret Circle'a kaydedildi
3. ✅ Recovery file masaüstüne kaydedildi
4. ✅ `.env.local` dosyası güncellendi
5. ✅ (Opsiyonel) Circle Wallet oluşturuldu

---

## 📝 NOTLAR

- Circle Testnet API key ile başla (ücretsiz)
- Arc Testnet henüz Circle'da desteklenmiyor olabilir - ETH-SEPOLIA veya MATIC-AMOY kullan
- Gas Station için SCA (Smart Contract Account) tipinde wallet gerekli
- Wallet oluşturduktan sonra CIRCLE_WALLET_ID'yi `.env.local`'a ekle
