# Plan 004: Killer Features - Payment Links, Split, Request, Templates

**Tarih:** 2025-01-19
**Öncelik:** YÜKSEK - Hackathon WOW Factor
**Durum:** Bekliyor

---

## Amaç

4 yeni killer feature ekle:
1. **Payment Links** - Paylaşılabilir ödeme linkleri
2. **Split Payment** - Faturayı bölüştürme
3. **Payment Request** - Para isteme
4. **Payment Templates** - Hazır şablonlar (Netflix, Spotify, Salary)

---

## Feature 1: Payment Links 🔗

### Kullanım Senaryosu
```
Freelancer: "İşte ödeme linkim, tıkla ve öde"
E-ticaret: "Checkout linki oluştur"
Arkadaş: "Bana borç için link atıyorum"
```

### API Tasarımı
```typescript
// Link oluştur
const link = await arc.links.create({
  amount: '100',              // Sabit miktar (opsiyonel)
  recipient: '0x...',         // veya contact name
  description: 'Invoice #123',
  expiresIn: '7d',            // 7 gün geçerli (opsiyonel)
  maxUses: 1,                 // Tek kullanımlık (opsiyonel)
  metadata: { orderId: '456' }
});

// Dönen obje
{
  id: 'link_abc123',
  url: 'https://arcpay.app/pay/abc123',
  shortUrl: 'arcpay.app/p/abc123',
  qrCode: 'data:image/png;base64,...', // Bonus: QR da üret
  amount: '100',
  recipient: '0x...',
  description: 'Invoice #123',
  expiresAt: '2025-01-26T...',
  status: 'active',
  createdAt: '2025-01-19T...'
}

// Link'ten ödeme yap (alıcı tarafı)
await arc.links.pay('link_abc123');
// veya
await arc.links.payFromUrl('https://arcpay.app/pay/abc123');

// Link durumunu kontrol et
const status = await arc.links.getStatus('link_abc123');
// { status: 'paid', paidAt: '...', paidBy: '0x...', txHash: '0x...' }

// Linkleri listele
const myLinks = await arc.links.list({ status: 'active' });

// Link iptal et
await arc.links.cancel('link_abc123');
```

### One-liner API
```typescript
// Simple API
const url = await createPaymentLink('100', 'Coffee payment');
// → 'https://arcpay.app/pay/abc123'

await payLink('https://arcpay.app/pay/abc123');
```

### Storage
- Links localStorage'da saklanır (browser)
- veya file'da (Node.js)
- Her link unique ID'ye sahip

### Voice Commands
```
"Create payment link for 100 dollars"
"Generate link for invoice 123"
"Share payment link for 50 to Ahmed"
```

---

## Feature 2: Split Payment 💸

### Kullanım Senaryosu
```
Restoran: "Hesabı 4 kişiye bölelim"
Kira: "3 ev arkadaşı arasında böl"
Grup hediye: "Herkes 20 dolar versin"
```

### API Tasarımı
```typescript
// Eşit bölüştürme
const result = await arc.split({
  total: '100',
  recipients: ['ahmed', 'ali', 'mehmet', 'ayse'], // Contact names veya addresses
  memo: 'Dinner split'
});

// Dönen obje
{
  id: 'split_xyz789',
  total: '100',
  perPerson: '25',
  recipients: [
    { name: 'ahmed', address: '0x...', amount: '25', txHash: '0x...', status: 'paid' },
    { name: 'ali', address: '0x...', amount: '25', txHash: '0x...', status: 'paid' },
    { name: 'mehmet', address: '0x...', amount: '25', txHash: '0x...', status: 'paid' },
    { name: 'ayse', address: '0x...', amount: '25', txHash: '0x...', status: 'paid' },
  ],
  memo: 'Dinner split',
  createdAt: '2025-01-19T...'
}

// Özel miktarlarla bölüştürme
const result = await arc.split({
  recipients: [
    { to: 'ahmed', amount: '40' },  // Ahmed daha çok yedi
    { to: 'ali', amount: '30' },
    { to: 'mehmet', amount: '30' },
  ],
  memo: 'Lunch - Ahmed had steak'
});

// Yüzdeyle bölüştürme
const result = await arc.split({
  total: '100',
  recipients: [
    { to: 'ahmed', percent: 50 },
    { to: 'ali', percent: 30 },
    { to: 'mehmet', percent: 20 },
  ]
});
```

### One-liner API
```typescript
// Eşit böl
await splitPayment('100', ['ahmed', 'ali', 'mehmet']);
// Her birine 33.33 gönderir

// Özel miktarlar
await splitPayment([
  { to: 'ahmed', amount: '50' },
  { to: 'ali', amount: '30' }
]);
```

### Voice Commands
```
"Split 100 dollars between ahmed ali and mehmet"
"Divide the bill with 4 people"
"Split payment 50 50 between ahmed and ali"
```

---

## Feature 3: Payment Request 📨

### Kullanım Senaryosu
```
Arkadaş: "Dünkü yemeğin parasını istiyorum"
Freelancer: "Müşteriden ödeme talep et"
Grup: "Herkes kendi payını ödesin"
```

### API Tasarımı
```typescript
// Para iste
const request = await arc.requests.create({
  from: 'ahmed',              // Kimden istiyorsun (contact veya address)
  amount: '50',
  reason: 'Dinner last night',
  dueDate: '2025-01-25',      // Opsiyonel
});

// Dönen obje
{
  id: 'req_def456',
  from: { name: 'ahmed', address: '0x...' },
  to: { name: 'me', address: '0x...' },  // İsteyen kişi
  amount: '50',
  reason: 'Dinner last night',
  status: 'pending',  // pending | paid | declined | expired
  dueDate: '2025-01-25',
  createdAt: '2025-01-19T...',
  link: 'https://arcpay.app/request/def456'  // Ahmed bu linke tıklayıp ödeyebilir
}

// Birden fazla kişiden iste
const requests = await arc.requests.createBulk({
  from: ['ahmed', 'ali', 'mehmet'],
  amount: '30',
  reason: 'Group gift contribution'
});

// Gelen istekleri gör (Ahmed'in perspektifinden)
const myRequests = await arc.requests.listIncoming();

// İstek kabul et ve öde
await arc.requests.pay('req_def456');

// İstek reddet
await arc.requests.decline('req_def456', 'I already paid cash');

// İstek durumunu kontrol et
const status = await arc.requests.getStatus('req_def456');

// İptal et
await arc.requests.cancel('req_def456');
```

### One-liner API
```typescript
// Basit istek
await requestPayment('ahmed', '50', 'Dinner split');

// Bulk istek
await requestPaymentFrom(['ahmed', 'ali'], '30', 'Gift contribution');
```

### Voice Commands
```
"Request 50 dollars from Ahmed"
"Ask Ahmed for 30 dollars for dinner"
"Send payment request to Ali for 100"
```

---

## Feature 4: Payment Templates 📋

### Kullanım Senaryosu
```
"Netflix aboneliğimi ekle" → Otomatik $15.99, 15. gün
"Spotify ekle" → Otomatik $9.99, 1. gün
"Maaş şablonu kullan" → Aylık streaming
```

### API Tasarımı
```typescript
// Hazır şablonlar
const TEMPLATES = {
  // Streaming Services
  netflix: { name: 'Netflix', amount: '15.99', billingDay: 15, category: 'subscription', icon: '🎬' },
  spotify: { name: 'Spotify', amount: '9.99', billingDay: 1, category: 'subscription', icon: '🎵' },
  youtube: { name: 'YouTube Premium', amount: '13.99', billingDay: 1, category: 'subscription', icon: '📺' },
  disney: { name: 'Disney+', amount: '10.99', billingDay: 15, category: 'subscription', icon: '🏰' },
  hbo: { name: 'HBO Max', amount: '15.99', billingDay: 1, category: 'subscription', icon: '📺' },
  apple_music: { name: 'Apple Music', amount: '10.99', billingDay: 1, category: 'subscription', icon: '🎵' },

  // Cloud & Storage
  icloud: { name: 'iCloud', amount: '2.99', billingDay: 1, category: 'subscription', icon: '☁️' },
  dropbox: { name: 'Dropbox', amount: '11.99', billingDay: 1, category: 'subscription', icon: '📦' },
  google_one: { name: 'Google One', amount: '2.99', billingDay: 1, category: 'subscription', icon: '🔵' },

  // Gaming
  xbox: { name: 'Xbox Game Pass', amount: '14.99', billingDay: 15, category: 'subscription', icon: '🎮' },
  playstation: { name: 'PlayStation Plus', amount: '17.99', billingDay: 1, category: 'subscription', icon: '🎮' },

  // Work & Productivity
  github: { name: 'GitHub Pro', amount: '4', billingDay: 1, category: 'subscription', icon: '🐙' },
  figma: { name: 'Figma', amount: '15', billingDay: 1, category: 'subscription', icon: '🎨' },
  notion: { name: 'Notion', amount: '10', billingDay: 1, category: 'subscription', icon: '📝' },

  // Custom types
  salary: { name: 'Monthly Salary', category: 'business', icon: '💼', isStream: true },
  rent: { name: 'Rent', billingDay: 1, category: 'business', icon: '🏠' },
  gym: { name: 'Gym Membership', billingDay: 1, category: 'personal', icon: '💪' },
};

// Şablon kullan
await arc.templates.use('netflix', {
  address: '0x...',  // Netflix'in adresi
  // amount ve billingDay otomatik gelir
});

// Özelleştirilmiş şablon
await arc.templates.use('netflix', {
  address: '0x...',
  amount: '22.99',  // Premium plan
  billingDay: 20,   // Farklı gün
});

// Maaş şablonu (streaming)
await arc.templates.use('salary', {
  employee: 'ahmed',
  amount: '5000',
  duration: 30,  // 30 günlük stream
});

// Şablonları listele
const templates = arc.templates.list();
const streamingTemplates = arc.templates.list({ category: 'subscription' });

// Özel şablon oluştur
arc.templates.create('my_saas', {
  name: 'My SaaS Product',
  amount: '29',
  billingDay: 1,
  category: 'subscription',
  icon: '🚀'
});
```

### One-liner API
```typescript
// Şablon ile subscription ekle
await addFromTemplate('netflix', '0xNetflixAddress...');
await addFromTemplate('spotify', '0xSpotifyAddress...');

// Maaş stream başlat
await startSalaryStream('ahmed', '5000');
```

### Voice Commands
```
"Add Netflix subscription to 0x..."
"Use Spotify template"
"Set up salary stream for Ahmed 5000 monthly"
"Add rent payment template"
```

---

## Implementation Structure

### Dosya Yapısı
```
src/modules/
├── links/
│   ├── index.ts      # PaymentLinkManager class
│   └── types.ts      # PaymentLink, LinkStatus types
├── split/
│   ├── index.ts      # SplitManager class
│   └── types.ts      # SplitPayment, SplitRecipient types
├── requests/
│   ├── index.ts      # PaymentRequestManager class
│   └── types.ts      # PaymentRequest, RequestStatus types
└── templates/
    ├── index.ts      # TemplateManager class
    ├── types.ts      # Template types
    └── presets.ts    # Netflix, Spotify, etc. presets
```

### Integration Points
```typescript
// ArcPayClient'a ekle
class ArcPayClient {
  public links: PaymentLinkManager;
  public split: SplitManager;
  public requests: PaymentRequestManager;
  public templates: TemplateManager;
}

// Simple API'ye ekle
export { createPaymentLink, payLink } from './modules/links';
export { splitPayment } from './modules/split';
export { requestPayment, requestPaymentFrom } from './modules/requests';
export { addFromTemplate, startSalaryStream } from './modules/templates';
```

---

## Playground UI

### Links Tab
```
┌─────────────────────────────────────────────────────────────┐
│  🔗 PAYMENT LINKS                              [+ Create]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Invoice #123                           $100.00     │   │
│  │  arcpay.app/p/abc123                               │   │
│  │  Status: Active · Expires: Jan 26                  │   │
│  │  [Copy Link] [Share] [Cancel]                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Coffee Payment                         $5.00       │   │
│  │  arcpay.app/p/def456                    ✓ PAID     │   │
│  │  Paid by: 0x742d... on Jan 19                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Split Tab
```
┌─────────────────────────────────────────────────────────────┐
│  💸 SPLIT PAYMENT                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Total Amount:  [$________]                                 │
│                                                             │
│  Split Between:                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  👤 Ahmed                              $25.00       │   │
│  │  👤 Ali                                $25.00       │   │
│  │  👤 Mehmet                             $25.00       │   │
│  │  👤 Ayse                               $25.00       │   │
│  │                                  [+ Add Person]     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ○ Split Equally  ○ Custom Amounts  ○ By Percentage        │
│                                                             │
│                              [Split & Send All]             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Requests Tab
```
┌─────────────────────────────────────────────────────────────┐
│  📨 PAYMENT REQUESTS                         [+ Request]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📤 SENT REQUESTS                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  From: Ahmed                            $50.00      │   │
│  │  "Dinner last night"                               │   │
│  │  Status: ⏳ Pending                                │   │
│  │  [Remind] [Cancel]                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  📥 RECEIVED REQUESTS                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  To: Ali                                $30.00      │   │
│  │  "Group gift contribution"                         │   │
│  │  [Pay Now] [Decline]                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Templates Section (in Subscriptions)
```
┌─────────────────────────────────────────────────────────────┐
│  📋 QUICK ADD FROM TEMPLATE                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Popular:                                                   │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐             │
│  │ 🎬   │ │ 🎵   │ │ 🎮   │ │ ☁️   │ │ 📺   │             │
│  │Netflix│ │Spotify│ │ Xbox │ │iCloud│ │Disney│             │
│  │$15.99│ │$9.99 │ │$14.99│ │$2.99 │ │$10.99│             │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘             │
│                                                             │
│  Work:                                                      │
│  ┌──────┐ ┌──────┐ ┌──────┐                               │
│  │ 🐙   │ │ 🎨   │ │ 📝   │                               │
│  │GitHub│ │Figma │ │Notion│                               │
│  │$4    │ │$15   │ │$10   │                               │
│  └──────┘ └──────┘ └──────┘                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Voice Commands Summary

```typescript
// Payment Links
"Create payment link for 100 dollars"
"Generate link for invoice 123"
"Cancel payment link abc123"

// Split Payment
"Split 100 dollars between ahmed ali and mehmet"
"Divide 200 equally with 4 people"
"Split the bill"

// Payment Request
"Request 50 dollars from Ahmed"
"Ask Ali for 30 dollars"
"Send payment request to team for 25 each"

// Templates
"Add Netflix subscription"
"Use Spotify template"
"Set up salary stream for Ahmed"
```

---

## Test Cases

```typescript
describe('PaymentLinks', () => {
  it('should create a payment link')
  it('should pay via link')
  it('should expire after deadline')
  it('should respect maxUses')
  it('should cancel link')
  it('should list links by status')
});

describe('SplitPayment', () => {
  it('should split equally')
  it('should split with custom amounts')
  it('should split by percentage')
  it('should resolve contact names')
  it('should handle failed payments')
});

describe('PaymentRequest', () => {
  it('should create request')
  it('should pay request')
  it('should decline request')
  it('should list incoming requests')
  it('should list outgoing requests')
  it('should expire after dueDate')
});

describe('Templates', () => {
  it('should list all templates')
  it('should use Netflix template')
  it('should customize template values')
  it('should create custom template')
  it('should start salary stream')
});
```

---

## Success Criteria

1. ✅ Payment Links: Create, share, pay, cancel
2. ✅ Split Payment: Equal, custom, percentage splits
3. ✅ Payment Request: Create, pay, decline
4. ✅ Templates: 15+ preset templates
5. ✅ Voice commands work for all features
6. ✅ Playground UI for each feature
7. ✅ All tests pass

---

## Priority Order

1. **Templates** - En kolay, 30 dk (preset data + helper functions)
2. **Split Payment** - Orta, 1 saat (multi-transfer logic)
3. **Payment Links** - Orta, 1-2 saat (storage + URL generation)
4. **Payment Request** - En karmaşık, 2 saat (two-way communication)

---

## Notes

- Payment Links için gerçek URL hosting gerekmiyor - local storage + deep link pattern yeterli
- Split Payment atomik olmalı - ya hepsi başarılı ya hiçbiri
- Templates'te icon'lar emoji olarak kalabilir
- Voice commands mevcut intent parser'a eklenmeli
