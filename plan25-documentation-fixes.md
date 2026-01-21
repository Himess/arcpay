# Plan 25: Documentation Fixes & Final Polish

## AMAÇ

Dokümantasyondaki tutarsızlıkları düzelt ve projeyi hackathon-ready yap:
1. Contract adreslerini düzelt
2. Circle Wallet address'i tutarlı yap
3. Module README'lere Circle bilgisi ekle
4. Eksik guide'ları oluştur
5. URL'leri düzelt

**Tahmini Süre:** 1-2 saat
**Hackathon Deadline:** 24 Ocak 2026

---

## SORUNLAR ANALİZİ

### 1. Contract Adresi Tutarsızlıkları

| Dosya | Problem |
|-------|---------|
| `docs/escrow-guide.md` (line ~244) | Eski adres: `0x02291A7116B07D50794EcAC97bBeE1b956610135` |
| `docs/streaming-guide.md` (line ~201) | Eski adres: `0x4aC6108858A2ba9B715d3E1694d413b01919A043` |
| `docs/API-REFERENCE.md` | Bazı adresler güncel değil |

### 2. Circle Wallet Address Tutarsızlığı

| Dosya | Gösterilen | Gerçek |
|-------|------------|--------|
| `playground/page.tsx` (Settings) | `0x46c5...A855` | `0x4cc48ea31173c5f14999222962a900ae2e945a1a` |
| `docs/API-REFERENCE.md` | `0x46c5...A855` | `0x4cc4...5a1a` |

### 3. Module README'lerde Circle Eksik

| Modül | Durum |
|-------|-------|
| `gas-station/README.md` | Circle Gas Station bilgisi YOK |
| `gateway/README.md` | API endpoint detayı YOK |
| `bridge/README.md` | Arc Testnet Domain 26 bilgisi YOK |
| `escrow/README.md` | Gasless release bilgisi YOK |
| `streams/README.md` | Gasless claim bilgisi YOK |

### 4. Explorer URL Hatası

Bazı dosyalarda `testnet.arcscan.io` kullanılmış, doğrusu `testnet.arcscan.app`

---

## DOĞRU REFERANS DEĞERLERİ

### Contract Adresleri (Arc Testnet)

```
Escrow:           0x0a982E2250F1C66487b88286e14D965025dD89D2
Stream Payment:   0x4678D992De548bddCb5Cd4104470766b5207A855
Stealth Registry: 0xbC6d02dBDe96caE69680BDbB63f9A12a14F3a41B
Payment Channel:  0x3FF7bC1C52e7DdD2B7B915bDAdBe003037B0FA2E
Agent Registry:   0x5E3ef9A91AD33270f84B32ACFF91068Eea44c5ee
Circle Wallet:    0x4cc48ea31173c5f14999222962a900ae2e945a1a
```

### URL'ler

```
Explorer:   https://testnet.arcscan.app
RPC:        https://rpc.testnet.arc.network
Chain ID:   5042002
Playground: https://website-beige-six-15.vercel.app/playground
```

---

## FAZ 1: Contract Adresleri Düzelt (15 dk)

### 1.1 docs/escrow-guide.md

**Satır ~244:**
```markdown
# Mevcut (YANLIŞ):
0x02291A7116B07D50794EcAC97bBeE1b956610135

# Olması Gereken:
0x84E9F5D7c89ADfEe7C8946a21Cc4Ea69F7A96AAa
```

### 1.2 docs/streaming-guide.md

**Satır ~201:**
```markdown
# Mevcut (YANLIŞ):
0x4aC6108858A2ba9B715d3E1694d413b01919A043

# Olması Gereken:
0x21a2F4c86102cCe59B2D02B4d00F59C8cDF61c42
```

---

## FAZ 2: Circle Wallet Address Düzelt (10 dk)

### 2.1 playground/page.tsx

**Settings panelinde hardcoded address düzelt:**
```tsx
// Mevcut (line ~4020):
<code className="text-cyan-400">0x46c5...A855</code>

// Değişiklik: API'den dinamik çek veya doğru göster
<code className="text-cyan-400">0x4cc4...5a1a</code>
```

### 2.2 docs/API-REFERENCE.md

Circle wallet address'i güncelle:
```json
"address": "0x4cc4...5a1a"
```

---

## FAZ 3: Module README Güncellemeleri (30 dk)

### 3.1 src/modules/gas-station/README.md

Eklenecek section:

```markdown
## Circle Gas Station Integration

ArcPay uses Circle's Gas Station for ERC-4337 gasless transactions on Arc Testnet.

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/circle/gasless` | GET | Check Gas Station status |
| `/api/circle/gasless` | POST | Execute gasless transaction |
| `/api/circle/transaction/[id]` | GET | Check transaction status |

### Example

\`\`\`typescript
// Check status
const status = await fetch('/api/circle/gasless').then(r => r.json());
console.log('Gas Station:', status.gasStationEnabled);

// Execute gasless TX
const result = await fetch('/api/circle/gasless', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'contractExecution',
    contractAddress: '0x...',
    callData: '0x...',
  }),
});
\`\`\`

### How It Works

1. Circle SCA Wallet (ERC-4337) submits UserOperation
2. Bundler processes the operation
3. Gas Station contract sponsors gas fees
4. User pays **0 USDC** for gas

### Verified Gasless TX

[View on Explorer](https://testnet.arcscan.app/tx/0x9f566f944884a8936e0c195269c97cc777dadf632cf08a010852bfbe6ad47228)
```

### 3.2 src/modules/gateway/README.md

Eklenecek API section:

```markdown
## Circle Gateway API

### Endpoint

\`\`\`
GET /api/circle/gateway
\`\`\`

### Response

\`\`\`json
{
  "success": true,
  "balances": {
    "arc": "150.00",
    "ethereum": "500.00",
    "arbitrum": "250.00"
  },
  "totalBalance": "900.00"
}
\`\`\`
```

### 3.3 src/modules/bridge/README.md

Eklenecek CCTP section:

```markdown
## Arc Testnet CCTP (Domain 26)

Arc Testnet is registered as Domain 26 in Circle's CCTP network.

### Supported Routes

| Source | Destination | Domain |
|--------|-------------|--------|
| Ethereum Sepolia | Arc Testnet | 0 → 26 |
| Arbitrum Sepolia | Arc Testnet | 3 → 26 |
| Base Sepolia | Arc Testnet | 6 → 26 |

### API Endpoint

\`\`\`
POST /api/circle/bridge
\`\`\`
```

---

## FAZ 4: URL Düzeltmeleri (10 dk)

### Aranacak ve Değiştirilecek

| Eski | Yeni |
|------|------|
| `testnet.arcscan.io` | `testnet.arcscan.app` |

### Komut

```bash
grep -r "arcscan.io" --include="*.md" --include="*.tsx" --include="*.ts"
```

---

## FAZ 5: Eksik Guide'lar (Opsiyonel - 45 dk)

### 5.1 docs/circle-integration-guide.md (YENİ)

Circle entegrasyonu için kapsamlı guide.

### 5.2 docs/gasless-guide.md (YENİ)

Gasless transaction'lar için kullanıcı guide'ı.

### 5.3 docs/privacy-guide.md (EKSIK)

Streaming-guide'da referans var ama dosya yok.

---

## UYGULAMA KONTROL LİSTESİ

### Faz 1: Contract Adresleri
- [ ] `docs/escrow-guide.md` - Escrow contract address güncelle
- [ ] `docs/streaming-guide.md` - Stream contract address güncelle

### Faz 2: Circle Wallet Address
- [ ] `website/src/app/playground/page.tsx` - Settings'de doğru address göster
- [ ] `docs/API-REFERENCE.md` - Örnek response'da doğru address

### Faz 3: Module README
- [ ] `src/modules/gas-station/README.md` - Circle section ekle
- [ ] `src/modules/gateway/README.md` - API section ekle
- [ ] `src/modules/bridge/README.md` - CCTP Domain 26 ekle

### Faz 4: URL Düzeltme
- [ ] Tüm `arcscan.io` → `arcscan.app`

### Faz 5: Eksik Guide (Opsiyonel)
- [ ] `docs/circle-integration-guide.md` oluştur
- [ ] `docs/gasless-guide.md` oluştur

---

## TEST KOMUTLARI

```bash
# Eski contract adresleri ara
grep -r "0x02291A7116B07D50794EcAC97bBeE1b956610135" --include="*.md"
grep -r "0x4aC6108858A2ba9" --include="*.md"

# Yanlış explorer URL ara
grep -r "arcscan.io" --include="*.md" --include="*.tsx"

# Yanlış Circle wallet address ara
grep -r "0x46c5" --include="*.md" --include="*.tsx"

# Build test
cd website && npm run build
```

---

## ZAMAN TAHMİNİ

| Faz | Süre | Öncelik |
|-----|------|---------|
| Faz 1: Contract Adresleri | 15 dk | 🔴 Kritik |
| Faz 2: Circle Wallet Address | 10 dk | 🔴 Kritik |
| Faz 3: Module README | 30 dk | 🟡 Önemli |
| Faz 4: URL Düzeltme | 10 dk | 🟡 Önemli |
| Faz 5: Eksik Guide | 45 dk | 🟢 İyi olur |
| **TOPLAM** | **~2 saat** | |

---

## BAŞARI KRİTERLERİ

1. ✅ Tüm contract adresleri güncel ve tutarlı
2. ✅ Circle Wallet address tüm dosyalarda `0x4cc4...5a1a`
3. ✅ Module README'leri Circle integration içeriyor
4. ✅ Tüm explorer URL'leri `testnet.arcscan.app`
5. ✅ Build hatasız

---

**Plan Oluşturulma:** 21 Ocak 2026
**Hedef Tamamlanma:** 21-22 Ocak 2026
**Hackathon Deadline:** 24 Ocak 2026
