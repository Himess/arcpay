# Plan 002: Contact & Subscription System

**Tarih:** 2025-01-19
**Öncelik:** YÜKSEK - Hackathon Killer Feature
**Durum:** Bekliyor

---

## Özet

Contact alias sistemi + Subscription yönetimi. Kullanıcılar hex adres yerine isim kullanabilecek ve aylık ödemelerini takip edebilecek.

---

## Hedef UX

```
ÖNCE (Kötü):
"Send 50 USDC to 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78"

SONRA (Harika):
"Send 50 to Ahmed"
"Pay my Netflix bill"
"What bills are due this week?"
```

---

## Bileşenler

### 1. ContactManager (SDK)
- CRUD: add, get, list, update, delete
- Resolution: "ahmed" → "0x742d..."
- Fuzzy search: "ahmet" → "ahmed" bulur
- Persistence: localStorage (browser), file (Node.js)

### 2. Subscription Tracking
- Due date hesaplama
- Overdue/Upcoming/Paid kategorileri
- markPaid(), snooze() fonksiyonları
- Aylık toplam hesaplama

### 3. Voice Commands
```
"save ahmed as 0x..."
"add netflix subscription 15.99 monthly on 15th"
"what bills are due"
"pay my netflix"
"pay all my bills"
"snooze netflix for 3 days"
```

### 4. Playground UI
- Contacts panel (add/edit/delete)
- Subscriptions dashboard:
  - 🔴 DUE TODAY
  - 🟠 OVERDUE
  - 🟡 UPCOMING
  - 🟢 PAID THIS MONTH
- Pay Now / Pay All Due / Snooze butonları

---

## Dosyalar

```
CREATE:
├── src/modules/contacts/index.ts
└── test/contacts.test.ts

UPDATE:
├── src/modules/contacts/types.ts (verify)
├── src/modules/contacts/storage.ts (verify)
├── src/index.ts (exports)
├── src/voice/voice-agent.ts
├── src/modules/intent/parser.ts
├── src/core/client.ts
├── src/simple/index.ts
└── website/src/app/playground/page.tsx
```

---

## Detaylı Plan

Tam detaylar için bkz: `CONTACT-SYSTEM-PLAN.md`

---

## Claude Code Komutu

```
Read CLAUDE-INSTRUCTIONS.md and CONTACT-SYSTEM-PLAN.md, then implement everything step by step. Do not stop until the quality checklist is complete. No shortcuts.
```
