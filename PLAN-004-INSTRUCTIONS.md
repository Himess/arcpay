# Instructions for Claude Code - Plan 004

## YOUR MISSION

Implement 4 killer features that will WOW the hackathon judges:
1. **Payment Links** - Shareable payment URLs
2. **Split Payment** - Bill splitting
3. **Payment Request** - Ask for money
4. **Payment Templates** - Netflix, Spotify, etc. presets

Read `PLAN-004-KILLER-FEATURES.md` for full details.

---

## ALSO FIX: Contract Addresses in Docs

Before starting the new features, fix the contract addresses in `website/src/app/docs/page.tsx`:

**Current (WRONG):**
```
Escrow: 0x0229...0135
```

**Should be (from src/contracts/addresses.ts):**
```
Escrow: 0x0a982E2250F1C66487b88286e14D965025dD89D2
PaymentChannel: 0x3FF7bC1C52e7DdD2B7B915bDAdBe003037B0FA2E
StealthRegistry: 0xbC6d02dBDe96caE69680BDbB63f9A12a14F3a41B
StreamPayment: 0x4678D992De548bddCb5Cd4104470766b5207A855
AgentRegistry: 0x5E3ef9A91AD33270f84B32ACFF91068Eea44c5ee
USDC: 0x3600000000000000000000000000000000000000
```

**Make each address:**
1. Full address (not truncated)
2. Clickable link to `https://testnet.arcscan.app/address/{address}`
3. Copy button on hover

---

## IMPLEMENTATION ORDER

### Phase 1: Fix Contract Addresses (5 min)
1. Update `website/src/app/docs/page.tsx`
2. Use correct addresses from `src/contracts/addresses.ts`
3. Make clickable links to explorer

### Phase 2: Payment Templates (30 min)
Create `src/modules/templates/`:

```typescript
// types.ts
interface PaymentTemplate {
  id: string;
  name: string;
  amount?: string;
  billingDay?: number;
  category: 'subscription' | 'business' | 'personal';
  icon: string;
  isStream?: boolean;
}

// presets.ts - 15+ templates
const TEMPLATES = {
  netflix: { name: 'Netflix', amount: '15.99', billingDay: 15, icon: '🎬' },
  spotify: { name: 'Spotify', amount: '9.99', billingDay: 1, icon: '🎵' },
  // ... more
};

// index.ts
class TemplateManager {
  list(filter?: { category?: string }): PaymentTemplate[]
  get(id: string): PaymentTemplate | null
  use(id: string, config: { address: string, amount?: string }): Promise<Contact>
  create(id: string, template: PaymentTemplate): void
}
```

### Phase 3: Split Payment (1 hour)
Create `src/modules/split/`:

```typescript
// types.ts
interface SplitRecipient {
  to: string;  // contact name or address
  amount?: string;
  percent?: number;
}

interface SplitResult {
  id: string;
  total: string;
  recipients: Array<{
    name: string;
    address: string;
    amount: string;
    txHash: string;
    status: 'success' | 'failed';
  }>;
}

// index.ts
class SplitManager {
  async split(params: {
    total?: string;
    recipients: string[] | SplitRecipient[];
    memo?: string;
  }): Promise<SplitResult>
}

// One-liner
async function splitPayment(
  totalOrRecipients: string | SplitRecipient[],
  recipients?: string[]
): Promise<SplitResult>
```

### Phase 4: Payment Links (1.5 hours)
Create `src/modules/links/`:

```typescript
// types.ts
interface PaymentLink {
  id: string;
  url: string;
  amount?: string;
  recipient: string;
  description?: string;
  expiresAt?: string;
  maxUses?: number;
  usedCount: number;
  status: 'active' | 'paid' | 'expired' | 'cancelled';
  payments: Array<{ paidBy: string; txHash: string; paidAt: string }>;
  createdAt: string;
}

// index.ts
class PaymentLinkManager {
  private storage: StorageAdapter;

  async create(params: {
    amount?: string;
    recipient?: string;
    description?: string;
    expiresIn?: string;
    maxUses?: number;
  }): Promise<PaymentLink>

  async pay(linkId: string): Promise<{ txHash: string }>
  async payFromUrl(url: string): Promise<{ txHash: string }>
  async getStatus(linkId: string): Promise<PaymentLink>
  async list(filter?: { status?: string }): Promise<PaymentLink[]>
  async cancel(linkId: string): Promise<void>
}

// URL format: arcpay://pay/{linkId} or https://arcpay.app/pay/{linkId}
// For local/demo: just use the linkId, playground can handle it
```

### Phase 5: Payment Request (1.5 hours)
Create `src/modules/requests/`:

```typescript
// types.ts
interface PaymentRequest {
  id: string;
  from: { name?: string; address: string };  // Who should pay
  to: { name?: string; address: string };    // Who is requesting
  amount: string;
  reason?: string;
  dueDate?: string;
  status: 'pending' | 'paid' | 'declined' | 'expired' | 'cancelled';
  paidAt?: string;
  txHash?: string;
  declineReason?: string;
  createdAt: string;
}

// index.ts
class PaymentRequestManager {
  async create(params: {
    from: string;
    amount: string;
    reason?: string;
    dueDate?: string;
  }): Promise<PaymentRequest>

  async createBulk(params: {
    from: string[];
    amount: string;
    reason?: string;
  }): Promise<PaymentRequest[]>

  async pay(requestId: string): Promise<{ txHash: string }>
  async decline(requestId: string, reason?: string): Promise<void>
  async cancel(requestId: string): Promise<void>
  async listIncoming(): Promise<PaymentRequest[]>
  async listOutgoing(): Promise<PaymentRequest[]>
  async getStatus(requestId: string): Promise<PaymentRequest>
}
```

### Phase 6: Voice Commands
Update `src/modules/intent/templates.ts` with new patterns:

```typescript
// Payment Links
{ pattern: /create\s+(?:payment\s+)?link\s+(?:for\s+)?(\d+(?:\.\d+)?)/i, action: 'create_link' },
{ pattern: /pay\s+link\s+(\w+)/i, action: 'pay_link' },

// Split Payment
{ pattern: /split\s+(\d+(?:\.\d+)?)\s+(?:between|with)\s+(.+)/i, action: 'split_payment' },
{ pattern: /divide\s+(?:the\s+)?bill/i, action: 'split_bill' },

// Payment Request
{ pattern: /request\s+(\d+(?:\.\d+)?)\s+(?:from|dollars?\s+from)\s+(\w+)/i, action: 'request_payment' },
{ pattern: /ask\s+(\w+)\s+for\s+(\d+(?:\.\d+)?)/i, action: 'request_payment' },

// Templates
{ pattern: /add\s+(\w+)\s+(?:subscription|template)/i, action: 'use_template' },
{ pattern: /use\s+(\w+)\s+template/i, action: 'use_template' },
```

### Phase 7: Simple API Exports
Update `src/simple/index.ts`:

```typescript
// Payment Links
export async function createPaymentLink(amount: string, description?: string): Promise<string>
export async function payLink(urlOrId: string): Promise<{ txHash: string }>

// Split Payment
export async function splitPayment(total: string, recipients: string[]): Promise<SplitResult>
export async function splitCustom(recipients: SplitRecipient[]): Promise<SplitResult>

// Payment Request
export async function requestPayment(from: string, amount: string, reason?: string): Promise<PaymentRequest>
export async function requestPaymentFrom(from: string[], amount: string, reason?: string): Promise<PaymentRequest[]>

// Templates
export async function addFromTemplate(templateId: string, address: string): Promise<Contact>
export async function listTemplates(): PaymentTemplate[]
```

### Phase 8: ArcPayClient Integration
Update `src/core/client.ts`:

```typescript
class ArcPayClient {
  public links: PaymentLinkManager;
  public split: SplitManager;
  public requests: PaymentRequestManager;
  public templates: TemplateManager;
}
```

### Phase 9: Playground UI
Update `website/src/app/playground/page.tsx`:

Add new tabs or sections:
- Templates quick-add section (in Subscriptions tab)
- Split Payment form
- Payment Links list
- Payment Requests (sent/received)

### Phase 10: Tests
Create tests for each module:
- `test/templates.test.ts`
- `test/split.test.ts`
- `test/links.test.ts`
- `test/requests.test.ts`

### Phase 11: Export from Index
Update `src/index.ts` with all new exports.

---

## QUALITY CHECKLIST

Before done, verify:
- [ ] Contract addresses fixed and clickable
- [ ] 15+ payment templates available
- [ ] Split payment works (equal, custom, percent)
- [ ] Payment links can be created and paid
- [ ] Payment requests can be sent and paid
- [ ] Voice commands work for all features
- [ ] Playground UI updated
- [ ] All new tests pass

---

## FILES TO CREATE

```
src/modules/templates/
├── index.ts
├── types.ts
└── presets.ts

src/modules/split/
├── index.ts
└── types.ts

src/modules/links/
├── index.ts
└── types.ts

src/modules/requests/
├── index.ts
└── types.ts

test/
├── templates.test.ts
├── split.test.ts
├── links.test.ts
└── requests.test.ts
```

## FILES TO UPDATE

```
website/src/app/docs/page.tsx (fix contract addresses)
src/modules/intent/templates.ts (voice patterns)
src/simple/index.ts (one-liners)
src/core/client.ts (add managers)
src/index.ts (exports)
website/src/app/playground/page.tsx (UI)
```

---

## START NOW

1. First fix contract addresses in docs
2. Then implement Templates (easiest)
3. Then Split Payment
4. Then Payment Links
5. Then Payment Requests
6. Add voice commands
7. Update Playground UI
8. Write tests

**These features will WIN the hackathon. Build them perfectly!**
