# ArcPay Contact & Subscription System Implementation Plan

## Objective
Implement a complete contact/alias system with subscription management that allows users to:
1. Send payments using human-readable names instead of hex addresses
2. Track and pay recurring subscriptions with due date management
3. Use voice commands for everything

**This is the KILLER FEATURE for hackathon - no competitor has this.**

**Goal: First place in hackathon.**

---

## The Problem We're Solving

### Current UX (TERRIBLE):
```
"Send 50 USDC to 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78"
```

### Our UX (AMAZING):
```
"Send 50 USDC to Ahmed"
"Pay my Netflix bill"
"What bills are due this week?"
"Pay all my bills"
```

---

# PART 1: CONTACT MANAGER

## Implementation Tasks

### Phase 1.1: ContactManager Module (SDK Core)

**Location:** `src/modules/contacts/`

**Files to create/complete:**

#### `types.ts` (EXISTS - verify complete)
```typescript
export type ContactCategory = 'personal' | 'business' | 'subscription' | 'merchant' | 'agent' | 'other';

export interface ContactMetadata {
  category?: ContactCategory;
  notes?: string;
  tags?: string[];
  // Subscription fields
  monthlyAmount?: string;
  billingDay?: number;        // 1-31
  lastPaidDate?: string;      // ISO date
  nextDueDate?: string;       // ISO date
  autoApprove?: boolean;      // Auto-pay or require confirmation
  // Stats
  totalPaid?: string;
  paymentCount?: number;
}

export interface Contact {
  name: string;           // lowercase, unique
  displayName: string;    // original casing
  address: string;        // 0x...
  metadata: ContactMetadata;
  createdAt: string;
  updatedAt: string;
}
```

#### `storage.ts` (EXISTS - verify complete)
- MemoryStorage (testing)
- LocalStorageAdapter (browser)
- FileStorage (Node.js)
- createStorage() factory

#### `index.ts` (CREATE - MAIN FILE)
```typescript
export class ContactManager {
  // ============ CRUD ============
  async add(name: string, address: string, metadata?: ContactMetadata): Promise<Contact>
  async get(name: string): Promise<Contact | null>
  async getByAddress(address: string): Promise<Contact | null>
  async list(options?: ContactSearchOptions): Promise<Contact[]>
  async update(name: string, updates: Partial<Contact>): Promise<Contact>
  async delete(name: string): Promise<boolean>

  // ============ RESOLUTION (KEY FEATURE) ============
  resolve(nameOrAddress: string): string | null   // "ahmed" → "0x742d..."
  resolveAll(text: string): string                // "send to ahmed" → "send to 0x742d..."

  // ============ FUZZY SEARCH ============
  search(query: string, limit?: number): FuzzyMatchResult[]

  // ============ SUBSCRIPTION HELPERS ============
  async getSubscriptions(): Promise<Contact[]>
  async getDueSubscriptions(): Promise<Contact[]>           // Due today
  async getUpcomingSubscriptions(days: number): Promise<Contact[]>  // Due in X days
  async markPaid(name: string, txHash: string): Promise<Contact>
  async snooze(name: string, days: number): Promise<Contact>

  // ============ BULK ============
  async import(contacts: Contact[]): Promise<number>
  async export(): Promise<Contact[]>
}
```

**Requirements:**
- Names case-insensitive ("Ahmed" = "ahmed")
- Fuzzy matching with Levenshtein distance
- Auto-save on every change
- Calculate nextDueDate automatically

---

# PART 2: SUBSCRIPTION SYSTEM

### Phase 2.1: Subscription Manager

**Location:** `src/modules/subscriptions/` (UPDATE existing)

**Enhance the existing SubscriptionManager or create helper functions:**

```typescript
// In ContactManager or separate SubscriptionHelper

interface SubscriptionStatus {
  contact: Contact;
  status: 'due' | 'upcoming' | 'paid' | 'overdue';
  daysUntilDue: number;
  daysOverdue: number;
}

// Get subscription status
getSubscriptionStatus(name: string): SubscriptionStatus

// Get all due subscriptions (billingDay === today)
getDueToday(): Contact[]

// Get upcoming (within X days)
getUpcoming(days: number): Contact[]

// Get overdue (billingDay < today && not paid this month)
getOverdue(): Contact[]

// Pay a subscription
async paySubscription(name: string): Promise<{ txHash: string; contact: Contact }>

// Pay all due subscriptions
async payAllDue(): Promise<{ paid: Contact[]; failed: Contact[]; totalAmount: string }>

// Snooze (delay nextDueDate by X days)
async snoozeSubscription(name: string, days: number): Promise<Contact>

// Get monthly spending summary
getMonthlyTotal(): string
```

### Phase 2.2: Due Date Calculation Logic

```typescript
function calculateNextDueDate(billingDay: number, lastPaidDate?: string): string {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // If already paid this month, next due is next month
  if (lastPaidDate) {
    const lastPaid = new Date(lastPaidDate);
    if (lastPaid.getMonth() === currentMonth && lastPaid.getFullYear() === currentYear) {
      // Already paid this month, due next month
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      return new Date(nextYear, nextMonth, billingDay).toISOString();
    }
  }

  // Due this month if billingDay hasn't passed, otherwise next month
  if (today.getDate() <= billingDay) {
    return new Date(currentYear, currentMonth, billingDay).toISOString();
  } else {
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    return new Date(nextYear, nextMonth, billingDay).toISOString();
  }
}

function getDaysUntilDue(nextDueDate: string): number {
  const due = new Date(nextDueDate);
  const today = new Date();
  const diff = due.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
```

---

# PART 3: VOICE COMMANDS

### Phase 3.1: New Voice Command Patterns

**Location:** `src/voice/voice-agent.ts` and `src/modules/intent/parser.ts`

**Contact Commands:**
```typescript
// Add contact
"save ahmed as 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78"
"add contact netflix 0x8ba1f109551bD432803012645Ac136ddd64DBA72"

// Delete contact
"delete contact ahmed"
"remove netflix"

// List contacts
"list my contacts"
"show contacts"

// Lookup
"who is ahmed"
"what is netflix address"
```

**Subscription Commands:**
```typescript
// Add subscription
"add netflix as subscription 15.99 monthly on the 15th to 0x..."
"save spotify subscription 9.99 per month due on 1st 0x..."

// Check due bills
"what bills are due"
"what bills are due this week"
"show upcoming bills"
"any overdue bills"

// Pay bills
"pay my netflix"
"pay netflix bill"
"pay all my bills"
"pay all due subscriptions"

// Snooze
"snooze netflix for 3 days"
"delay spotify payment by 1 week"

// Stats
"how much do I spend on subscriptions"
"what is my monthly subscription total"
```

**Payment with Contact Names:**
```typescript
"send 50 to ahmed"
"pay ahmed 100 dollars"
"transfer 25 USDC to netflix"
"create escrow for 500 to freelancer"
```

### Phase 3.2: Intent Parser Patterns

```typescript
// Contact management
{ pattern: /(?:save|add)\s+(\w+)\s+(?:as|=)\s+(0x[a-fA-F0-9]{40})/i, action: 'add_contact' },
{ pattern: /add\s+contact\s+(\w+)\s+(0x[a-fA-F0-9]{40})/i, action: 'add_contact' },
{ pattern: /(?:delete|remove)\s+(?:contact\s+)?(\w+)/i, action: 'delete_contact' },
{ pattern: /(?:list|show)\s+(?:my\s+)?contacts/i, action: 'list_contacts' },
{ pattern: /who\s+is\s+(\w+)/i, action: 'lookup_contact' },

// Subscription management
{ pattern: /add\s+(\w+)\s+(?:as\s+)?subscription\s+([\d.]+)\s+(?:monthly|per\s+month)(?:\s+(?:on|due)\s+(?:the\s+)?(\d+)(?:st|nd|rd|th)?)?(?:\s+(?:to\s+)?(0x[a-fA-F0-9]{40}))?/i, action: 'add_subscription' },
{ pattern: /what\s+bills?\s+(?:are\s+)?due/i, action: 'check_due_bills' },
{ pattern: /(?:show|list)\s+(?:upcoming|due)\s+bills?/i, action: 'list_upcoming_bills' },
{ pattern: /pay\s+(?:my\s+)?(\w+)(?:\s+bill)?/i, action: 'pay_subscription' },
{ pattern: /pay\s+all\s+(?:my\s+)?(?:bills?|subscriptions?|due)/i, action: 'pay_all_due' },
{ pattern: /snooze\s+(\w+)\s+(?:for\s+)?(\d+)\s+days?/i, action: 'snooze_subscription' },
{ pattern: /(?:how\s+much|what)\s+(?:do\s+I\s+)?spend\s+on\s+subscriptions?/i, action: 'subscription_total' },
```

---

# PART 4: PLAYGROUND UI

### Phase 4.1: Contacts Panel

**Location:** `website/src/app/playground/page.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│  📇 MY CONTACTS                                    [+ Add]  │
├─────────────────────────────────────────────────────────────┤
│  🔍 Search contacts...                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  👤 Ahmed                                                   │
│     0x742d35Cc...5f2bD78                                   │
│     Personal                              [Edit] [Delete]   │
│  ─────────────────────────────────────────────────────────  │
│  💼 Freelancer                                              │
│     0xabcd1234...efgh5678                                  │
│     Business                              [Edit] [Delete]   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Phase 4.2: Subscriptions Panel (THE WOW FACTOR)

```
┌─────────────────────────────────────────────────────────────┐
│  📅 MY SUBSCRIPTIONS                      Total: $43.96/mo  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔴 DUE TODAY                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🎬 Netflix                              $15.99     │   │
│  │     Due: Today (Jan 19)                             │   │
│  │     0x8ba1...DBA72                                  │   │
│  │                        [Pay Now]  [Snooze 3 days]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  🟠 OVERDUE                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📺 HBO Max                              $15.99     │   │
│  │     Due: Jan 17 (2 days overdue!)                   │   │
│  │     0x1234...5678                                   │   │
│  │                        [Pay Now]  [Snooze 3 days]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  🟡 UPCOMING (Next 7 days)                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🎵 Spotify                              $9.99      │   │
│  │     Due: Jan 22 (in 3 days)                         │   │
│  │     0xdef0...1234                                   │   │
│  │                                       [Pay Early]   │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🎮 Xbox Game Pass                       $14.99     │   │
│  │     Due: Jan 25 (in 6 days)                         │   │
│  │     0x5678...90ab                                   │   │
│  │                                       [Pay Early]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  🟢 PAID THIS MONTH                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ☁️  iCloud                               $2.99   ✓ │   │
│  │     Paid: Jan 5 · TX: 0xabc...123                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  │ Due Now: $31.98        [Pay All Due]               │   │
└─────────────────────────────────────────────────────────────┘
```

### Phase 4.3: Add Contact/Subscription Modal

```
┌─────────────────────────────────────────────────────────────┐
│  Add New Contact                                       [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Name:          [_________________________]                 │
│                                                             │
│  Address:       [0x________________________]                │
│                                                             │
│  Category:      ○ Personal                                  │
│                 ○ Business                                  │
│                 ● Subscription                              │
│                 ○ Merchant                                  │
│                                                             │
│  ─── Subscription Details (if subscription) ───            │
│                                                             │
│  Monthly Amount: [$________]                                │
│                                                             │
│  Billing Day:    [15_______] (1-31)                        │
│                                                             │
│  Auto-pay:       [ ] Automatically pay when due            │
│                                                             │
│  Notes:          [_________________________]                │
│                  [_________________________]                │
│                                                             │
│                        [Cancel]    [Save Contact]           │
└─────────────────────────────────────────────────────────────┘
```

---

# PART 5: SDK INTEGRATION

### Phase 5.1: ArcPayClient Updates

**Location:** `src/core/client.ts`

```typescript
export class ArcPayClient {
  public contacts: ContactManager;

  constructor(config: ArcPayClientConfig) {
    // ... existing
    this.contacts = createContactManager({
      storage: config.contactStorage,
      autoSave: true
    });
  }

  // Auto-resolve contacts in transfer
  async transfer(params: TransferParams): Promise<TransferResult> {
    const resolved = this.contacts.resolve(params.to);
    const toAddress = resolved || params.to;

    // Validate it's an address
    if (!toAddress.startsWith('0x') || toAddress.length !== 42) {
      throw new Error(`Cannot resolve "${params.to}" to an address. Add it as a contact first.`);
    }

    const result = await this._transfer({ ...params, to: toAddress });

    // If this was a subscription payment, mark it as paid
    const contact = await this.contacts.get(params.to);
    if (contact?.metadata.category === 'subscription') {
      await this.contacts.markPaid(params.to, result.txHash);
    }

    return result;
  }
}
```

### Phase 5.2: Simple API Updates

**Location:** `src/simple/index.ts`

```typescript
// Contact functions
export async function addContact(name: string, address: string, metadata?: ContactMetadata): Promise<Contact>
export async function getContact(name: string): Promise<Contact | null>
export async function listContacts(): Promise<Contact[]>
export async function deleteContact(name: string): Promise<boolean>

// Subscription functions
export async function addSubscription(name: string, address: string, amount: string, billingDay: number): Promise<Contact>
export async function getDueBills(): Promise<Contact[]>
export async function getUpcomingBills(days?: number): Promise<Contact[]>
export async function payBill(name: string): Promise<{ txHash: string }>
export async function payAllDueBills(): Promise<{ paid: number; total: string }>
export async function snoozeBill(name: string, days: number): Promise<Contact>
export async function getMonthlySubscriptionTotal(): Promise<string>

// Enhanced pay (already exists, just resolves contacts now)
export async function pay(to: string, amount: string): Promise<TransferResult>
```

---

# PART 6: TESTS

### Phase 6.1: Contact Tests

**Location:** `test/contacts.test.ts`

```typescript
describe('ContactManager', () => {
  describe('CRUD', () => {
    it('should add a contact')
    it('should add a contact with subscription metadata')
    it('should get contact by name (case insensitive)')
    it('should get contact by address')
    it('should list all contacts')
    it('should list contacts by category')
    it('should update a contact')
    it('should delete a contact')
    it('should not allow duplicate names')
  });

  describe('Resolution', () => {
    it('should resolve name to address')
    it('should resolve address to itself')
    it('should return null for unknown name')
    it('should resolve all names in text')
    it('should handle mixed names and addresses in text')
  });

  describe('Fuzzy Search', () => {
    it('should find exact matches first')
    it('should find prefix matches')
    it('should find fuzzy matches (typos)')
    it('should rank results by relevance')
  });

  describe('Subscriptions', () => {
    it('should get all subscriptions')
    it('should get due subscriptions')
    it('should get upcoming subscriptions')
    it('should get overdue subscriptions')
    it('should calculate next due date correctly')
    it('should mark subscription as paid')
    it('should snooze subscription')
    it('should calculate monthly total')
  });

  describe('Persistence', () => {
    it('should save to storage')
    it('should load from storage')
    it('should handle empty storage')
  });
});
```

---

# FILE CHECKLIST

```
CREATE/UPDATE:
├── src/modules/contacts/
│   ├── types.ts          [VERIFY EXISTS]
│   ├── storage.ts        [VERIFY EXISTS]
│   └── index.ts          [CREATE - main ContactManager]
│
├── src/voice/
│   └── voice-agent.ts    [UPDATE - add contact integration]
│
├── src/modules/intent/
│   └── parser.ts         [UPDATE - add patterns]
│
├── src/core/
│   └── client.ts         [UPDATE - add contacts, auto-resolve]
│
├── src/simple/
│   └── index.ts          [UPDATE - add contact/subscription functions]
│
├── src/index.ts          [UPDATE - export contacts module]
│
├── website/src/app/playground/
│   └── page.tsx          [UPDATE - add Contacts & Subscriptions UI]
│
└── test/
    └── contacts.test.ts  [CREATE - comprehensive tests]
```

---

# SUCCESS CRITERIA

## 1. Voice Demo Works:
```
User: "Save Ahmed as 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78"
Bot: "Contact Ahmed saved!"

User: "Add Netflix subscription 15.99 monthly on the 15th to 0x8ba1..."
Bot: "Netflix subscription added! Due on the 15th of each month."

User: "Send 50 to Ahmed"
Bot: "Sending 50 USDC to Ahmed (0x742d...5f2bD78)... Done! TX: 0xabc..."

User: "What bills are due?"
Bot: "You have 1 bill due today: Netflix $15.99. Say 'pay my netflix' to pay."

User: "Pay all my bills"
Bot: "Paying Netflix $15.99... Done! Total paid: $15.99"
```

## 2. Playground Works:
- Can add/edit/delete contacts via UI
- Can add subscriptions with billing day and amount
- Shows due/upcoming/paid subscriptions clearly
- "Pay Now" and "Pay All Due" buttons work
- Snooze functionality works
- Persists across page refreshes

## 3. SDK Works:
```typescript
const arc = new ArcPay({ privateKey: '...' });

// Add contacts
await arc.contacts.add('ahmed', '0x742d...');
await arc.contacts.add('netflix', '0x8ba1...', {
  category: 'subscription',
  monthlyAmount: '15.99',
  billingDay: 15
});

// Pay using name
await arc.transfer({ to: 'ahmed', amount: '50' });

// Check bills
const due = await arc.contacts.getDueSubscriptions();
console.log(due); // [{ name: 'netflix', ... }]

// Pay subscription
await arc.transfer({ to: 'netflix', amount: '15.99' });
// Automatically marks as paid!
```

## 4. All Tests Pass:
```bash
npm test -- contacts
# All tests green
```

---

# ORDER OF IMPLEMENTATION

1. **Complete `src/modules/contacts/index.ts`** - ContactManager with all methods
2. **Export from `src/index.ts`**
3. **Create `test/contacts.test.ts`** - Write all tests
4. **Run tests** - `npm test -- contacts` - Fix any failures
5. **Update `src/voice/voice-agent.ts`** - Add contact/subscription voice commands
6. **Update `src/modules/intent/parser.ts`** - Add new patterns
7. **Update `src/core/client.ts`** - Add contacts property, auto-resolve
8. **Update `src/simple/index.ts`** - Add one-liner functions
9. **Update `website/src/app/playground/page.tsx`** - Add UI panels
10. **Full integration test** - Test everything end-to-end
11. **Final cleanup** - Remove any debug code, polish

---

# IMPORTANT RULES

- **DO NOT** take shortcuts. Implement EVERYTHING.
- **DO NOT** skip tests. Every feature needs tests.
- **DO NOT** leave TODO/FIXME comments. Finish everything.
- **DO NOT** use `any` type. Full TypeScript.
- **DO** add JSDoc comments to all public APIs.
- **DO** handle all edge cases.
- **DO** make it production-quality.
- **DO** test voice commands work with contact names.
- **DO** verify persistence works (refresh page, contacts still there).

---

# THIS WILL WIN THE HACKATHON. BUILD IT PERFECTLY.
