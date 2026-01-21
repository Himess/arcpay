# Plan 24: Full Circle Wallet Integration + Voice Gasless

## 🎯 AMAÇ

ArcPay SDK ve Playground'u **hackathon-ready** hale getir:
1. Playground'a Circle Wallet mode ekle (gasless transactions)
2. Voice Agent'ı gasless yap (Circle Wallet ile)
3. Tüm dokümantasyonu güncelle (Circle API, Gateway, Gasless)
4. Test et ve demo-ready yap

**Hackathon Deadline:** 24 Ocak 2026

---

## 📊 MEVCUT DURUM ANALİZİ

### ✅ Zaten Çalışan (Backend)
| Özellik | Endpoint | Status |
|---------|----------|--------|
| Circle SCA Wallet | `/api/circle/wallets` | ✅ Çalışıyor |
| Gasless TX (Gas Station) | `/api/circle/gasless` | ✅ Çalışıyor |
| Circle Gateway | `/api/circle/gateway` | ✅ Çalışıyor |
| Circle Bridge (CCTP) | `/api/circle/bridge` | ✅ Çalışıyor |
| Transaction Status | `/api/circle/transaction/[id]` | ✅ Çalışıyor |
| x402 Micropayments | `/api/x402/*` | ✅ Çalışıyor |

### ⚠️ Eksik (Frontend/Playground)
| Özellik | Mevcut | Hedef |
|---------|--------|-------|
| Wallet Mode | Private Key only | Private Key + Circle Wallet |
| Voice Gasless | ❌ | ✅ Circle Wallet ile |
| Gasless Demo | ❌ | ✅ UI'da göster |

### 📝 Eksik (Dokümantasyon)
| Dosya | Circle API | Gateway | Gasless |
|-------|------------|---------|---------|
| `docs/getting-started.md` | ❌ | ❌ | ❌ |
| `docs/ai-agent-guide.md` | ❌ | ❌ | ❌ |
| `README.md` | ⚠️ Kısmen | ⚠️ Kısmen | ❌ |
| `docs/API-REFERENCE.md` | ❌ | ❌ | ❌ |
| `src/modules/gas-station/README.md` | ❌ Circle yok | N/A | ⚠️ Eski |
| `src/modules/gateway/README.md` | ❌ | ⚠️ Kısmen | N/A |

---

## 🔧 FAZA 1: Playground Circle Wallet Mode (3-4 saat)

### 1.1 Settings Panel Güncelleme
**Dosya:** `website/src/app/playground/page.tsx`

Mevcut:
```typescript
const [privateKey, setPrivateKey] = useState('');
```

Eklenecek:
```typescript
type WalletMode = 'private-key' | 'circle-wallet';
const [walletMode, setWalletMode] = useState<WalletMode>('circle-wallet');
const [circleWalletAddress, setCircleWalletAddress] = useState('');
```

### 1.2 Settings UI Güncelleme
Settings modal'a wallet mode seçici ekle:

```tsx
{/* Wallet Mode Selector */}
<div className="mb-4">
  <label className="block text-sm font-medium mb-2">Wallet Mode</label>
  <div className="flex gap-2">
    <button
      onClick={() => setWalletMode('circle-wallet')}
      className={`flex-1 px-4 py-2 rounded-lg border ${
        walletMode === 'circle-wallet'
          ? 'bg-blue-600 border-blue-500 text-white'
          : 'bg-gray-800 border-gray-700'
      }`}
    >
      🔵 Circle Wallet (Gasless)
      <span className="block text-xs opacity-70">Recommended</span>
    </button>
    <button
      onClick={() => setWalletMode('private-key')}
      className={`flex-1 px-4 py-2 rounded-lg border ${
        walletMode === 'private-key'
          ? 'bg-gray-600 border-gray-500 text-white'
          : 'bg-gray-800 border-gray-700'
      }`}
    >
      🔑 Private Key (Advanced)
    </button>
  </div>
</div>

{/* Conditional Input */}
{walletMode === 'private-key' ? (
  <input
    type="password"
    placeholder="Enter private key (0x...)"
    value={privateKey}
    onChange={(e) => setPrivateKey(e.target.value)}
    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
  />
) : (
  <div className="bg-green-900/30 border border-green-700 rounded-lg p-3">
    <p className="text-green-400 text-sm">✅ Using Circle Wallet</p>
    <p className="text-gray-400 text-xs mt-1">
      Address: 0x46c5...A855 (Gas Station sponsored)
    </p>
  </div>
)}
```

### 1.3 Circle Wallet API Fonksiyonları
Playground'a eklenecek yeni fonksiyonlar:

```typescript
// Circle Wallet ile gasless işlem
async function sendPaymentGasless(to: string, amount: string): Promise<{
  success: boolean;
  txHash?: string;
  explorerUrl?: string;
  error?: string;
}> {
  const response = await fetch('/api/circle/gasless', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'contractExecution',
      // Encode transfer call
      contractAddress: '0x0000...0000', // Native USDC = address(0)
      callData: encodeTransfer(to, amount),
    }),
  });

  const data = await response.json();

  if (data.transactionId && !data.txHash) {
    // Wait for TX to complete
    return await waitForCircleTransaction(data.transactionId);
  }

  return {
    success: data.success,
    txHash: data.txHash,
    explorerUrl: data.explorerUrl,
    error: data.error,
  };
}

// Transaction durumunu bekle
async function waitForCircleTransaction(transactionId: string): Promise<{
  success: boolean;
  txHash?: string;
  explorerUrl?: string;
}> {
  const maxAttempts = 30;
  const delay = 2000;

  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`/api/circle/transaction/${transactionId}`);
    const data = await response.json();

    if (data.state === 'COMPLETE' && data.txHash) {
      return {
        success: true,
        txHash: data.txHash,
        explorerUrl: `https://testnet.arcscan.app/tx/${data.txHash}`,
      };
    }

    if (data.state === 'FAILED') {
      return { success: false };
    }

    await new Promise(r => setTimeout(r, delay));
  }

  return { success: false };
}
```

### 1.4 executeVoiceAction Güncelleme
Voice komutlarını wallet mode'a göre yönlendir:

```typescript
const executeVoiceAction = async (parsed: any) => {
  // ... mevcut kod ...

  if (parsed.action === 'pay') {
    if (walletMode === 'circle-wallet') {
      // Gasless payment via Circle
      addVoiceLog('ai', '🔵 Sending via Circle Wallet (gasless)...');
      const result = await sendPaymentGasless(recipientAddress, parsed.amount.toString());

      if (result.success) {
        addVoiceLog('success', `✅ Sent ${parsed.amount} USDC (gasless)`);
        addVoiceLog('info', `TX: ${result.explorerUrl}`);
      } else {
        addVoiceLog('error', `Failed: ${result.error}`);
      }
    } else {
      // Original private key flow
      // ... mevcut kod ...
    }
  }

  // Diğer action'lar için de benzer...
};
```

---

## 🎤 FAZA 2: Voice Agent Gasless (2-3 saat)

### 2.1 Voice Actions Gasless Mapping

| Voice Command | Circle API Endpoint | Contract Call |
|---------------|---------------------|---------------|
| "Send X to Y" | `/api/circle/gasless` | Native transfer |
| "Create escrow" | `/api/circle/gasless` | `createAndFundEscrow()` |
| "Release escrow" | `/api/circle/gasless` | `releaseEscrow()` |
| "Create stream" | `/api/circle/gasless` | `createStream()` |
| "Claim stream" | `/api/circle/gasless` | `claim()` |
| "Pay private" | `/api/circle/gasless` | `sendStealthPayment()` |

### 2.2 Contract Call Encoding Helper

```typescript
// ABI encoding helpers for gasless calls
const encodeEscrowCreate = (beneficiary: string, amount: string, expiresAt: number) => {
  const iface = new ethers.Interface(ESCROW_ABI);
  return iface.encodeFunctionData('createAndFundEscrow', [
    beneficiary,
    beneficiary, // arbiter = beneficiary for simple case
    ethers.parseUnits(amount, 18),
    expiresAt,
    'voice-command'
  ]);
};

const encodeStreamCreate = (recipient: string, amount: string, duration: number) => {
  const iface = new ethers.Interface(STREAM_ABI);
  return iface.encodeFunctionData('createStream', [
    recipient,
    ethers.parseUnits(amount, 18),
    duration
  ]);
};

const encodeStreamClaim = (streamId: string) => {
  const iface = new ethers.Interface(STREAM_ABI);
  return iface.encodeFunctionData('claim', [streamId]);
};
```

### 2.3 Gasless Voice Actions

```typescript
// Voice action handlers for gasless mode
const gaslessVoiceActions = {
  async pay(to: string, amount: string) {
    // For native USDC, use direct transfer via Circle API
    const response = await fetch('/api/circle/gasless', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'transfer',
        to,
        amount,
      }),
    });
    return response.json();
  },

  async createEscrow(beneficiary: string, amount: string) {
    const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
    const callData = encodeEscrowCreate(beneficiary, amount, expiresAt);

    const response = await fetch('/api/circle/gasless', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'contractExecution',
        contractAddress: CONTRACTS.escrow,
        callData,
        value: ethers.parseUnits(amount, 18).toString(),
      }),
    });
    return response.json();
  },

  async createStream(recipient: string, amount: string, duration: number) {
    const callData = encodeStreamCreate(recipient, amount, duration);

    const response = await fetch('/api/circle/gasless', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'contractExecution',
        contractAddress: CONTRACTS.stream,
        callData,
        value: ethers.parseUnits(amount, 18).toString(),
      }),
    });
    return response.json();
  },

  async claimStream(streamId: string) {
    const callData = encodeStreamClaim(streamId);

    const response = await fetch('/api/circle/gasless', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'contractExecution',
        contractAddress: CONTRACTS.stream,
        callData,
      }),
    });
    return response.json();
  },
};
```

---

## 📚 FAZA 3: Dokümantasyon Güncellemeleri (2-3 saat)

### 3.1 `docs/getting-started.md` Güncellemesi

Eklenecek section:

```markdown
## Circle Wallet Integration (Recommended)

For the best experience, use Circle Wallets with Gas Station for gasless transactions.

### Setup Circle Wallet

1. Create a Circle Developer Account at [console.circle.com](https://console.circle.com)
2. Get your API credentials
3. Set environment variables:

\`\`\`bash
CIRCLE_API_KEY=your_api_key
CIRCLE_ENTITY_SECRET=your_entity_secret
CIRCLE_WALLET_ID=your_wallet_id
\`\`\`

### Gasless Transactions

With Circle Wallet, all transactions are sponsored by Gas Station - users pay no gas fees!

\`\`\`typescript
import { ArcPay } from 'arcpay';

const arc = await ArcPay.init({
  network: 'arc-testnet',
  useCircleWallet: true,  // Enable gasless mode
});

// This transaction costs 0 gas for the user!
await arc.sendUSDC('0x...recipient', '100');
\`\`\`

### Verify Gasless Transaction

Check any transaction on [Arc Explorer](https://testnet.arcscan.app):
- Method: `handleOps` (ERC-4337)
- Gas paid by: Gas Station contract
- User paid: 0 USDC for gas
```

### 3.2 `docs/ai-agent-guide.md` Güncellemesi

Eklenecek section:

```markdown
## Gasless AI Agents (Circle Wallet)

Create AI agents that operate without worrying about gas fees.

\`\`\`typescript
import { createAgent } from 'arcpay';

const agent = createAgent({
  name: 'trading-bot',
  useCircleWallet: true,  // Gasless mode
  budget: {
    daily: '1000',
    perTransaction: '100'
  }
});

// All payments are gasless!
await agent.pay('0x...', '50');
await agent.payForService('openai', '0.05');
\`\`\`

### Voice Agent with Gasless

\`\`\`typescript
import { createVoiceAgent } from 'arcpay';

const voiceAgent = createVoiceAgent({
  geminiApiKey: process.env.GEMINI_API_KEY,
  useCircleWallet: true,  // Gasless voice commands
});

// User says: "Send 25 USDC to Alice"
// Agent executes gasless transaction
await voiceAgent.executeVoiceCommand();
\`\`\`
```

### 3.3 `README.md` Güncellemesi

Eklenecek/güncellenecek sections:

```markdown
## 🆕 Gasless Transactions (Circle Gas Station)

ArcPay supports fully gasless transactions via Circle's Gas Station. Users never pay gas fees!

\`\`\`typescript
// Enable gasless mode
const arc = await ArcPay.init({
  network: 'arc-testnet',
  useCircleWallet: true,
});

// 0 gas fee for this transaction!
await arc.sendUSDC('0x...', '100');
\`\`\`

**How it works:**
1. Transaction submitted to Circle's ERC-4337 bundler
2. Gas Station sponsors the gas fee
3. Transaction executes on-chain
4. User sees: `Gas Fee: 0 USDC`

**Proof:** [View gasless TX on explorer](https://testnet.arcscan.app/tx/0xf02b0ee708950a74f9e61e57262e1133f4528785361ff189ce09f9514f1e298b)

---

## Circle Integration

ArcPay deeply integrates with Circle's infrastructure:

| Feature | Description |
|---------|-------------|
| **Circle Wallets** | SCA wallets with ERC-4337 support |
| **Gas Station** | Sponsored gas fees for users |
| **Gateway** | Unified USDC balance across chains |
| **CCTP Bridge** | Cross-chain USDC transfers |

### Environment Variables

\`\`\`bash
# Circle API (for gasless/gateway features)
CIRCLE_API_KEY=your_api_key
CIRCLE_ENTITY_SECRET=your_entity_secret
CIRCLE_WALLET_ID=your_wallet_id

# Gemini AI (for voice/image features)
GEMINI_API_KEY=your_gemini_key
\`\`\`
```

### 3.4 `docs/API-REFERENCE.md` Güncellemesi

Eklenecek section:

```markdown
## Circle Integration

### Gasless Transactions

#### POST /api/circle/gasless

Execute a gasless transaction via Circle Gas Station.

**Request (Transfer):**
\`\`\`json
{
  "type": "transfer",
  "to": "0x...",
  "amount": "10.00"
}
\`\`\`

**Request (Contract Execution):**
\`\`\`json
{
  "type": "contractExecution",
  "contractAddress": "0x...",
  "callData": "0x...",
  "value": "0"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "transactionId": "...",
  "txHash": "0x...",
  "state": "COMPLETE",
  "sponsored": true,
  "explorerUrl": "https://testnet.arcscan.app/tx/0x..."
}
\`\`\`

#### GET /api/circle/gasless

Check Gas Station status.

**Response:**
\`\`\`json
{
  "success": true,
  "gasStationEnabled": true,
  "wallet": {
    "id": "...",
    "address": "0x46c5...A855",
    "accountType": "SCA",
    "state": "LIVE"
  },
  "limits": {
    "dailyLimit": "50 USDC",
    "perTransaction": "No limit (testnet)"
  }
}
\`\`\`

---

### Circle Gateway

#### GET /api/circle/gateway

Get unified USDC balance across chains.

**Response:**
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

---

### Transaction Status

#### GET /api/circle/transaction/[id]

Get Circle transaction status.

**Response:**
\`\`\`json
{
  "success": true,
  "transactionId": "...",
  "state": "COMPLETE",
  "txHash": "0x...",
  "explorerUrl": "https://testnet.arcscan.app/tx/0x..."
}
\`\`\`
```

### 3.5 Module README Güncellemeleri

#### `src/modules/gas-station/README.md`

```markdown
# Gas Station Module

Sponsor gas fees for your users via Circle's Gas Station.

## Quick Start (Circle Integration)

\`\`\`typescript
import { gasStation } from 'arcpay';

// Check Gas Station status
const status = await gasStation.getStatus();
console.log('Gas Station enabled:', status.gasStationEnabled);
console.log('Wallet:', status.wallet.address);

// Execute gasless transaction
const result = await gasStation.executeGasless({
  type: 'contractExecution',
  contractAddress: '0x...',
  callData: '0x...',
});

console.log('TX Hash:', result.txHash);
console.log('Gas paid by Gas Station!');
\`\`\`

## How It Works

1. **Circle SCA Wallet** - Smart Contract Account wallet
2. **ERC-4337 Bundler** - Submits UserOperations
3. **Gas Station** - Pays gas fees on behalf of users
4. **On-chain execution** - Transaction executes with 0 user gas cost

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/circle/gasless` | GET | Check Gas Station status |
| `/api/circle/gasless` | POST | Execute gasless transaction |
| `/api/circle/transaction/[id]` | GET | Check transaction status |

## Example: Gasless Escrow

\`\`\`typescript
const escrowCallData = encodeEscrowCreate(beneficiary, amount, expiresAt);

const result = await gasStation.executeGasless({
  type: 'contractExecution',
  contractAddress: ESCROW_CONTRACT,
  callData: escrowCallData,
  value: parseUnits(amount, 18).toString(),
});

// User paid 0 gas!
console.log('Escrow created:', result.txHash);
\`\`\`
```

#### `src/modules/gateway/README.md`

```markdown
# Gateway Module

Unified USDC balance across multiple chains via Circle Gateway.

## Quick Start

\`\`\`typescript
import { gateway } from 'arcpay';

// Get unified balance
const balance = await gateway.getUnifiedBalance();
console.log('Total:', balance.totalBalance, 'USDC');
console.log('Arc:', balance.balances.arc, 'USDC');
console.log('Ethereum:', balance.balances.ethereum, 'USDC');

// Smart routing - pay from optimal chain
await gateway.payFrom({
  recipient: '0x...',
  amount: '100',
  preferredChain: 'cheapest'  // Auto-select cheapest chain
});
\`\`\`

## Features

- **Unified View** - Single balance across Arc, Ethereum, Arbitrum, Base
- **Smart Routing** - Automatically picks optimal chain
- **Cross-chain Payments** - Pay anyone from any chain
- **Real-time Sync** - Balance updates across chains

## API Endpoint

\`\`\`
GET /api/circle/gateway
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "balances": {
    "arc": "150.00",
    "ethereum": "500.00",
    "arbitrum": "250.00",
    "base": "100.00"
  },
  "totalBalance": "1000.00"
}
\`\`\`
```

---

## 🧪 FAZA 4: Test ve Doğrulama (1-2 saat)

### 4.1 Manual Test Checklist

#### Playground Tests
- [ ] Settings'de wallet mode değiştirilebiliyor
- [ ] Circle Wallet mode seçildiğinde private key input gizleniyor
- [ ] Circle Wallet address gösteriliyor
- [ ] Gasless transfer çalışıyor
- [ ] TX explorer'da görünüyor
- [ ] Gas fee = 0 USDC

#### Voice Agent Tests
- [ ] "Send 1 USDC to Ahmed" - gasless çalışıyor
- [ ] "Create escrow for 5 USDC" - gasless çalışıyor
- [ ] "Create stream for 10 USDC over 1 hour" - gasless çalışıyor
- [ ] TX'ler explorer'da handleOps method ile görünüyor

#### Documentation Tests
- [ ] getting-started.md Circle section var
- [ ] ai-agent-guide.md gasless section var
- [ ] README.md Circle integration section var
- [ ] API-REFERENCE.md Circle endpoints var

### 4.2 Automated Test (Opsiyonel)

```bash
# Test runner
npx tsx scripts/test-onchain.ts --category=circle-gasless
```

---

## 📁 DEĞİŞECEK DOSYALAR

### Frontend/Playground
1. `website/src/app/playground/page.tsx` - Wallet mode + gasless functions
2. `website/src/components/playground/apiExamples.ts` - Circle API örnekleri (varsa)

### Documentation
3. `docs/getting-started.md` - Circle Wallet setup
4. `docs/ai-agent-guide.md` - Gasless agents
5. `docs/API-REFERENCE.md` - Circle API endpoints
6. `README.md` - Circle integration overview
7. `src/modules/gas-station/README.md` - Circle Gas Station
8. `src/modules/gateway/README.md` - Circle Gateway

### API (Kontrol - muhtemelen değişiklik gerekmez)
9. `website/src/app/api/circle/gasless/route.ts` - ✅ Zaten çalışıyor
10. `website/src/app/api/circle/gateway/route.ts` - ✅ Zaten çalışıyor
11. `website/src/app/api/circle/transaction/[id]/route.ts` - ✅ Zaten çalışıyor

---

## ⏱️ ZAMAN TAHMİNİ

| Faz | Süre | Öncelik |
|-----|------|---------|
| Faz 1: Playground Circle Mode | 3-4 saat | 🔴 Kritik |
| Faz 2: Voice Gasless | 2-3 saat | 🔴 Kritik |
| Faz 3: Dokümantasyon | 2-3 saat | 🟡 Önemli |
| Faz 4: Test | 1-2 saat | 🟡 Önemli |
| **TOPLAM** | **8-12 saat** | |

---

## 🎯 BAŞARI KRİTERLERİ

1. ✅ Playground'da Circle Wallet mode çalışıyor
2. ✅ Voice agent gasless TX yapabiliyor
3. ✅ Tüm TX'ler explorer'da `handleOps` method ile görünüyor
4. ✅ Dokümantasyonda Circle integration açıklanmış
5. ✅ Demo-ready: "Send 5 USDC to Ahmed" voice command çalışıyor

---

## 🔗 İLGİLİ KAYNAKLAR

### Circle Documentation
- [Developer Controlled Wallets](https://developers.circle.com/w3s/developer-controlled-wallets)
- [Gas Station](https://developers.circle.com/w3s/gas-station)
- [Gateway](https://developers.circle.com/gateway)

### ArcPay Mevcut API'ler
- `GET /api/circle/gasless` - Gas Station status
- `POST /api/circle/gasless` - Gasless transaction
- `GET /api/circle/gateway` - Unified balance
- `GET /api/circle/transaction/[id]` - TX status

### Kanıtlanmış Gasless TX
- [TX on Explorer](https://testnet.arcscan.app/tx/0xf02b0ee708950a74f9e61e57262e1133f4528785361ff189ce09f9514f1e298b)
- Method: `handleOps`
- Gas sponsored by: Gas Station

---

## 📋 UYGULAMA SIRASI

1. **Önce** Faz 1 (Playground) - Temel UI değişiklikleri
2. **Sonra** Faz 2 (Voice) - Gasless voice actions
3. **Sonra** Faz 3 (Docs) - Dokümantasyon güncellemeleri
4. **Son** Faz 4 (Test) - Doğrulama ve demo hazırlığı

---

**Plan Oluşturulma Tarihi:** 21 Ocak 2026
**Hedef Tamamlanma:** 22-23 Ocak 2026
**Hackathon Deadline:** 24 Ocak 2026
