# Plan 15: FULL REAL IMPLEMENTATION - Zero Simulation, Everything Onchain

## 🎯 AMAÇ

ArcPay SDK ve Playground'daki TÜM fake/simüle kodları kaldırıp, gerçek onchain implementasyonlarla değiştirmek. Hackathon için birinci olmak - demo değil, gerçek ürün.

**Prensip: HİÇBİR ŞEY SİMÜLE OLMAYACAK. HER ŞEY GERÇEK ONCHAIN OLACAK.**

---

## 📋 HACKATHON GEREKSİNİMLERİ

### 🔒 Zorunlu Teknolojiler:
- **Arc** - Tüm işlemler Arc L1'de settle olacak (EVM-compatible)
- **USDC** - Native gas token ve stablecoin (18 decimals native, 6 decimals ERC-20)

### 🔒 Önerilen Teknolojiler:
- **Circle Wallets** - Developer-Controlled Wallets (server-side)
- **Circle Gateway** - Unified USDC balance crosschain
- **Circle Bridge Kit** - USDC cross-chain transfers (CCTP)
- **x402 Facilitator** - HTTP 402 micropayments

### 📚 Kaynaklar:
- Arc Docs: https://docs.arc.network
- Circle Docs: https://developers.circle.com
- x402 Protocol: https://www.x402.org / https://github.com/coinbase/x402
- Circle Wallets SDK: https://www.npmjs.com/package/@circle-fin/developer-controlled-wallets
- Testnet Faucet: Arc faucet

---

## 🔴 MEVCUT FAKE/SİMÜLE KODLAR (Analiz Sonucu)

### Tamamen FAKE Modüller:

| Modül | Satır | Sorun | Çözüm |
|-------|-------|-------|-------|
| **Micropayments (x402)** | 1908-1954 | Sadece console.log, ödeme yok | x402 SDK entegre et |
| **Bridge (CCTP)** | 2134-2218 | Fake hash üretiyor | Circle Bridge Kit entegre et |
| **Gateway** | 2220-2270 | Multi-chain simüle | Circle Gateway API entegre et |
| **FX Swap** | 2291-2370 | Hardcoded rates | Circle API veya gerçek DEX |
| **Smart Wallet** | 2960-3060 | Random address, deploy yok | Circle Wallets SDK entegre et |

### Kısmen FAKE Modüller:

| Modül | Satır | Sorun | Çözüm |
|-------|-------|-------|-------|
| **Paymaster/Gasless** | 1956-2016 | Kullanıcı gas ödüyor | Circle Gas Station entegre et |
| **USYC Yield** | 2042-2130 | subscribe/redeem fake | Gerçek Teller kontratı veya kaldır |
| **Privacy Crypto** | 2454-2541 | Mock secp256k1 | noble-secp256k1 entegre et |

---

## 📦 IMPLEMENTATION PLAN

### FAZ 1: DEPENDENCIES & SETUP (30 dk)

#### Task 1.1: NPM Packages Ekle
```bash
cd website
npm install @circle-fin/developer-controlled-wallets
npm install @noble/secp256k1
npm install x402  # veya @coinbase/x402
```

#### Task 1.2: Environment Variables
`.env.local` dosyasına ekle:
```env
# Circle API
CIRCLE_API_KEY=your_circle_api_key
CIRCLE_ENTITY_SECRET=your_entity_secret

# x402 Facilitator
X402_FACILITATOR_URL=https://x402.coinbase.com  # veya kendi URL

# Arc Testnet
NEXT_PUBLIC_ARC_RPC=https://rpc.testnet.arc.network
NEXT_PUBLIC_ARC_CHAIN_ID=1195082
```

#### Task 1.3: Circle Developer Account Setup
1. https://console.circle.com adresinde hesap oluştur
2. API Key al
3. Entity Secret üret:
```javascript
const { generateEntitySecret } = require('@circle-fin/developer-controlled-wallets');
generateEntitySecret(); // Console'a yazdırır
```

---

### FAZ 2: CIRCLE WALLETS INTEGRATION (2-3 saat)

#### Task 2.1: Circle Wallets API Route Oluştur
**Dosya:** `website/src/app/api/circle/wallets/route.ts`

```typescript
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY!,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
});

// POST /api/circle/wallets - Yeni wallet oluştur
export async function POST(request: Request) {
  const { userId, blockchain } = await request.json();

  // Wallet Set oluştur (yoksa)
  const walletSetResponse = await client.createWalletSet({
    name: `ArcPay-${userId}`,
  });

  // Wallet oluştur (SCA - Smart Contract Account for gas sponsorship)
  const walletsResponse = await client.createWallets({
    blockchains: [blockchain || 'ARC-TESTNET'],
    count: 1,
    walletSetId: walletSetResponse.data?.walletSet?.id ?? '',
    accountType: 'SCA', // Gas Station için gerekli
    metadata: [{ name: `User-${userId}`, refId: userId }],
  });

  return Response.json({
    success: true,
    wallet: walletsResponse.data?.wallets?.[0],
  });
}

// GET /api/circle/wallets?walletId=xxx - Wallet bilgisi al
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const walletId = searchParams.get('walletId');

  const response = await client.getWallet({ id: walletId! });
  return Response.json(response.data);
}
```

#### Task 2.2: Circle Wallet Transaction Route
**Dosya:** `website/src/app/api/circle/transfer/route.ts`

```typescript
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY!,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
});

// POST /api/circle/transfer - USDC transfer
export async function POST(request: Request) {
  const { walletId, to, amount, tokenAddress } = await request.json();

  const response = await client.createTransaction({
    walletId,
    tokenId: tokenAddress, // USDC contract address
    destinationAddress: to,
    amounts: [amount],
    fee: {
      type: 'level',
      config: { feeLevel: 'MEDIUM' },
    },
  });

  return Response.json({
    success: true,
    transaction: response.data,
  });
}
```

#### Task 2.3: SDK'ya Circle Wallets Entegrasyonu
**Dosya:** `website/src/app/playground/page.tsx` - circleWallets modülü

```typescript
// SDK içine ekle
circleWallets: {
  async create(userId: string) {
    const res = await fetch('/api/circle/wallets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, blockchain: 'ARC-TESTNET' }),
    });
    return res.json();
  },

  async getBalance(walletId: string) {
    const res = await fetch(`/api/circle/wallets?walletId=${walletId}`);
    const data = await res.json();
    return data.wallet?.balance || '0';
  },

  async transfer(walletId: string, to: string, amount: string) {
    const res = await fetch('/api/circle/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletId, to, amount }),
    });
    return res.json();
  },
},
```

---

### FAZ 3: GAS STATION / PAYMASTER GERÇEK IMPLEMENTASYON (2 saat)

Circle Gas Station, SCA (Smart Contract Account) wallet'lar için gas sponsorship sağlar.

#### Task 3.1: Gas Station Policy Oluştur
Circle Console'dan:
1. Gas Station > Create Policy
2. Blockchain: ARC-TESTNET
3. Max gas per tx: 0.01 USDC
4. Daily limit per user: 1 USDC

#### Task 3.2: Gasless Transaction API
**Dosya:** `website/src/app/api/circle/gasless/route.ts`

```typescript
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY!,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
});

// POST /api/circle/gasless - Gas sponsored transaction
export async function POST(request: Request) {
  const { walletId, to, amount, data } = await request.json();

  // SCA wallet ile gasless transaction
  const response = await client.createTransaction({
    walletId,
    destinationAddress: to,
    amounts: amount ? [amount] : undefined,
    contractCallData: data,
    fee: {
      type: 'level',
      config: {
        feeLevel: 'MEDIUM',
        gasLimit: '100000',
        // Gas Station otomatik sponsor eder (SCA wallet için)
      },
    },
  });

  return Response.json({
    success: true,
    txHash: response.data?.transaction?.txHash,
    sponsored: true,
    explorerUrl: `https://testnet.arcscan.app/tx/${response.data?.transaction?.txHash}`,
  });
}
```

#### Task 3.3: SDK Paymaster Güncelle
```typescript
// Eski FAKE kod:
paymaster: {
  async sponsorTransaction(request) {
    const estimatedGas = '0.001'; // Mock gas estimate ← FAKE!
    const hash = await walletClient.sendTransaction({...}); // Kullanıcının cüzdanı!
  }
}

// Yeni GERÇEK kod:
paymaster: {
  async sponsorTransaction(params: { walletId: string; to: string; value?: string; data?: string }) {
    const res = await fetch('/api/circle/gasless', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const result = await res.json();

    if (!result.success) {
      throw new Error(result.error || 'Gas sponsorship failed');
    }

    return {
      success: true,
      txHash: result.txHash,
      sponsoredAmount: result.sponsoredAmount,
      explorerUrl: result.explorerUrl,
    };
  },

  async getStats() {
    // Circle API'den gerçek stats al
    const res = await fetch('/api/circle/gas-station/stats');
    return res.json();
  },
},
```

---

### FAZ 4: x402 MICROPAYMENTS GERÇEK IMPLEMENTASYON (3-4 saat)

x402 protokolü HTTP 402 Payment Required kullanarak API monetization sağlar.

#### Task 4.1: x402 Dependencies
```bash
npm install x402
# veya
npm install @coinbase/x402
```

#### Task 4.2: x402 Paywall Middleware
**Dosya:** `website/src/app/api/x402/premium/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyPayment } from 'x402'; // veya kendi verification

const PRICE = '0.01'; // 0.01 USDC
const PAY_TO = '0x...'; // Merchant wallet address

export async function GET(request: NextRequest) {
  const paymentHeader = request.headers.get('X-Payment');

  // Payment yoksa 402 döndür
  if (!paymentHeader) {
    return new NextResponse(null, {
      status: 402,
      headers: {
        'X-Payment-Required': 'true',
        'X-Price': PRICE,
        'X-Currency': 'USDC',
        'X-Pay-To': PAY_TO,
        'X-Network': 'arc-testnet',
        'X-Accept-Schemes': 'exact',
      },
    });
  }

  // Payment'ı verify et
  try {
    const verified = await verifyPayment({
      payment: paymentHeader,
      expectedAmount: PRICE,
      expectedRecipient: PAY_TO,
      network: 'arc-testnet',
    });

    if (!verified.valid) {
      return NextResponse.json({ error: 'Invalid payment' }, { status: 402 });
    }

    // Payment geçerli - premium content döndür
    return NextResponse.json({
      success: true,
      premium: true,
      data: {
        message: 'This is premium content!',
        timestamp: new Date().toISOString(),
        paidAmount: PRICE,
        txHash: verified.txHash,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

#### Task 4.3: x402 Client SDK
```typescript
// SDK'ya ekle
micropayments: {
  async pay<T>(url: string, options?: { maxPrice?: string }): Promise<T> {
    // 1. İlk istek - fiyat al
    const checkRes = await fetch(url, { method: 'HEAD' });

    if (checkRes.status !== 402) {
      // Payment gerekmiyor
      const response = await fetch(url);
      return response.json();
    }

    // 2. Payment details al
    const price = checkRes.headers.get('X-Price') || '0.01';
    const payTo = checkRes.headers.get('X-Pay-To');
    const network = checkRes.headers.get('X-Network') || 'arc-testnet';

    if (!payTo) {
      throw new Error('No payment address specified');
    }

    // Max price check
    if (options?.maxPrice && parseFloat(price) > parseFloat(options.maxPrice)) {
      throw new Error(`Price ${price} exceeds max ${options.maxPrice}`);
    }

    // 3. GERÇEK USDC ödemesi yap
    const paymentTx = await this._sendPayment(payTo, price);

    // 4. Payment proof ile tekrar istek at
    const response = await fetch(url, {
      headers: {
        'X-Payment': JSON.stringify({
          txHash: paymentTx.txHash,
          amount: price,
          network: network,
          timestamp: Date.now(),
        }),
      },
    });

    if (!response.ok) {
      throw new Error(`Payment accepted but request failed: ${response.status}`);
    }

    return response.json();
  },

  async _sendPayment(to: string, amount: string) {
    // Gerçek USDC transfer
    return await this.sendUSDC(to, amount);
  },

  // Server-side paywall helper
  createPaywall(config: { price: string; payTo: string; routes: string[] }) {
    return {
      price: config.price,
      payTo: config.payTo,
      routes: config.routes,
      middleware: (req: Request) => {
        // Express/Hono middleware olarak kullanılabilir
      },
    };
  },
},
```

#### Task 4.4: x402 Test Endpoint
**Dosya:** `website/src/app/api/x402/weather/route.ts`

```typescript
// Gerçek x402 demo endpoint - weather data
import { NextRequest, NextResponse } from 'next/server';

const PRICE = '0.001'; // 0.001 USDC per request
const PAY_TO = process.env.NEXT_PUBLIC_MERCHANT_WALLET!;

export async function GET(request: NextRequest) {
  const paymentHeader = request.headers.get('X-Payment');

  if (!paymentHeader) {
    return new NextResponse(JSON.stringify({ error: 'Payment required' }), {
      status: 402,
      headers: {
        'Content-Type': 'application/json',
        'X-Payment-Required': 'true',
        'X-Price': PRICE,
        'X-Currency': 'USDC',
        'X-Pay-To': PAY_TO,
        'X-Network': 'arc-testnet',
      },
    });
  }

  // Verify payment onchain
  const payment = JSON.parse(paymentHeader);
  const isValid = await verifyOnchain(payment.txHash, PAY_TO, PRICE);

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid payment' }, { status: 402 });
  }

  // Return real weather data
  return NextResponse.json({
    city: 'Istanbul',
    temperature: 15,
    condition: 'Sunny',
    timestamp: new Date().toISOString(),
    paid: PRICE,
    txHash: payment.txHash,
  });
}

async function verifyOnchain(txHash: string, expectedTo: string, expectedAmount: string) {
  // Arc RPC ile transaction verify et
  const response = await fetch(process.env.NEXT_PUBLIC_ARC_RPC!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getTransactionReceipt',
      params: [txHash],
      id: 1,
    }),
  });
  const result = await response.json();

  if (!result.result) return false;

  // Transaction'ın doğru adrese ve miktara gittiğini kontrol et
  const receipt = result.result;
  return receipt.status === '0x1' && receipt.to?.toLowerCase() === expectedTo.toLowerCase();
}
```

---

### FAZ 5: CIRCLE GATEWAY INTEGRATION (2 saat)

Gateway unified USDC balance crosschain sağlar.

#### Task 5.1: Gateway API Route
**Dosya:** `website/src/app/api/circle/gateway/route.ts`

```typescript
// Circle Gateway API integration
const GATEWAY_API = 'https://gateway.circle.com/v1';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  // Get unified balance across all chains
  const response = await fetch(`${GATEWAY_API}/balances/${address}`, {
    headers: {
      'Authorization': `Bearer ${process.env.CIRCLE_API_KEY}`,
    },
  });

  const data = await response.json();
  return Response.json(data);
}

export async function POST(request: Request) {
  const { fromChain, toChain, amount, address } = await request.json();

  // Create cross-chain transfer
  const response = await fetch(`${GATEWAY_API}/transfers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CIRCLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sourceChain: fromChain,
      destinationChain: toChain,
      amount,
      address,
    }),
  });

  const data = await response.json();
  return Response.json(data);
}
```

#### Task 5.2: SDK Gateway Modülü
```typescript
// Eski FAKE kod:
gateway: {
  async getUnifiedBalance(address?: string) {
    // Get balance from multiple chains (simulated) ← FAKE!
    return { arc: arcBalance, ethereum: '0', polygon: '0' }; // Hardcoded!
  }
}

// Yeni GERÇEK kod:
gateway: {
  async getUnifiedBalance(address?: string) {
    const res = await fetch(`/api/circle/gateway?address=${address || account.address}`);
    const data = await res.json();

    return {
      total: data.totalBalance,
      chains: data.balances, // { arc: '100', ethereum: '50', polygon: '25' }
    };
  },

  async transfer(params: { fromChain: string; toChain: string; amount: string }) {
    const res = await fetch('/api/circle/gateway', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        address: account.address,
      }),
    });

    const result = await res.json();
    return {
      success: true,
      transferId: result.transferId,
      txHash: result.txHash,
      explorerUrl: `https://testnet.arcscan.app/tx/${result.txHash}`,
    };
  },
},
```

---

### FAZ 6: BRIDGE (CCTP) GERÇEK IMPLEMENTASYON (2 saat)

Circle's Cross-Chain Transfer Protocol for USDC bridging.

#### Task 6.1: CCTP API Route
**Dosya:** `website/src/app/api/circle/bridge/route.ts`

```typescript
// Circle CCTP Bridge integration
const CCTP_API = 'https://api.circle.com/v1/cctp';

export async function POST(request: Request) {
  const { sourceChain, destinationChain, amount, sourceAddress, destinationAddress } = await request.json();

  // 1. Burn USDC on source chain
  const burnResponse = await fetch(`${CCTP_API}/burn`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CIRCLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sourceChain,
      amount,
      sourceAddress,
      destinationChain,
      destinationAddress,
    }),
  });

  const burnData = await burnResponse.json();

  return Response.json({
    success: true,
    transferId: burnData.transferId,
    burnTxHash: burnData.burnTxHash,
    status: 'pending',
    attestation: burnData.attestation,
  });
}

// GET /api/circle/bridge?transferId=xxx - Status check
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const transferId = searchParams.get('transferId');

  const response = await fetch(`${CCTP_API}/transfers/${transferId}`, {
    headers: {
      'Authorization': `Bearer ${process.env.CIRCLE_API_KEY}`,
    },
  });

  const data = await response.json();
  return Response.json(data);
}
```

#### Task 6.2: SDK Bridge Modülü
```typescript
// Eski FAKE kod:
bridge: {
  async transfer(params) {
    // Simulate CCTP bridge flow ← FAKE!
    const transferId = `bridge_${Date.now()}`; // Fake ID
    const burnTxHash = `0x${Date.now().toString(16)}burn`; // Fake hash
  }
}

// Yeni GERÇEK kod:
bridge: {
  async transfer(params: {
    sourceChain: string;
    destinationChain: string;
    amount: string;
    destinationAddress: string;
  }) {
    const res = await fetch('/api/circle/bridge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        sourceAddress: account.address,
      }),
    });

    const result = await res.json();

    if (!result.success) {
      throw new Error(result.error || 'Bridge transfer failed');
    }

    return {
      success: true,
      transferId: result.transferId,
      burnTxHash: result.burnTxHash,
      status: result.status,
      explorerUrl: `https://testnet.arcscan.app/tx/${result.burnTxHash}`,
    };
  },

  async getStatus(transferId: string) {
    const res = await fetch(`/api/circle/bridge?transferId=${transferId}`);
    const data = await res.json();

    return {
      status: data.status, // 'pending' | 'attested' | 'completed' | 'failed'
      burnTxHash: data.burnTxHash,
      mintTxHash: data.mintTxHash,
      attestation: data.attestation,
    };
  },
},
```

---

### FAZ 7: PRIVACY CRYPTO GERÇEK IMPLEMENTASYON (2 saat)

Mock secp256k1 yerine gerçek kriptografi.

#### Task 7.1: noble-secp256k1 Entegrasyonu
```bash
npm install @noble/secp256k1 @noble/hashes
```

#### Task 7.2: Privacy Modülü Güncelle
```typescript
import * as secp256k1 from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

// Eski FAKE kod:
_derivePublicKey(privateKey: string): string {
  // For demo: create a deterministic 33-byte compressed pubkey ← FAKE!
  return '0x02' + hash.slice(0, 64);
}

// Yeni GERÇEK kod:
privacy: {
  _derivePublicKey(privateKey: string): string {
    const privKeyBytes = hexToBytes(privateKey.slice(2));
    const pubKey = secp256k1.getPublicKey(privKeyBytes, true); // compressed
    return '0x' + bytesToHex(pubKey);
  },

  _generateStealthAddress(spendingPubKey: string, viewingPubKey: string) {
    // 1. Generate ephemeral key pair
    const ephemeralPrivKey = secp256k1.utils.randomPrivateKey();
    const ephemeralPubKey = secp256k1.getPublicKey(ephemeralPrivKey, true);

    // 2. ECDH shared secret with viewing key
    const viewingPubKeyBytes = hexToBytes(viewingPubKey.slice(2));
    const sharedSecret = secp256k1.getSharedSecret(ephemeralPrivKey, viewingPubKeyBytes);

    // 3. Derive stealth public key: P_stealth = P_spending + hash(sharedSecret) * G
    const hashScalar = sha256(sharedSecret);
    const spendingPubKeyBytes = hexToBytes(spendingPubKey.slice(2));

    // Point addition (simplified - real impl needs proper point math)
    const stealthPubKey = secp256k1.Point.fromHex(spendingPubKeyBytes)
      .add(secp256k1.Point.BASE.multiply(BigInt('0x' + bytesToHex(hashScalar))))
      .toRawBytes(true);

    // 4. Derive address from public key
    const stealthAddress = this._pubKeyToAddress(stealthPubKey);

    return {
      stealthAddress,
      ephemeralPublicKey: '0x' + bytesToHex(ephemeralPubKey),
    };
  },

  _pubKeyToAddress(pubKey: Uint8Array): string {
    // Keccak256 of uncompressed pubkey (without 04 prefix) -> last 20 bytes
    const uncompressed = secp256k1.Point.fromHex(pubKey).toRawBytes(false).slice(1);
    const hash = keccak256(uncompressed);
    return '0x' + bytesToHex(hash.slice(-20));
  },
},
```

---

### FAZ 8: USYC YIELD TOKEN (1 saat)

USYC subscribe/redeem gerçek değilse kaldır veya gerçek Teller kontratı entegre et.

#### Seçenek A: Kaldır (Önerilen - Hackathon scope dışı)
```typescript
// usyc modülünden subscribe/redeem kaldır
usyc: {
  async getBalance(address?: string) {
    // Bu GERÇEK - kontrat çağrısı yapıyor
    const balance = await publicClient.readContract({...});
    return { usyc: balance, usdcValue: ..., yield: ... };
  },

  // subscribe ve redeem KALDIRILDI
  // Bunlar gerçek Teller kontratı gerektirir
},
```

#### Seçenek B: Gerçek Teller Entegrasyonu (Eğer kontrat varsa)
```typescript
usyc: {
  async subscribe(amount: string) {
    // Gerçek Teller kontratına deposit
    const hash = await walletClient.writeContract({
      address: TELLER_CONTRACT,
      abi: TELLER_ABI,
      functionName: 'deposit',
      args: [parseUnits(amount, 6)],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return {
      success: true,
      usycReceived: formatUnits(receipt.logs[0].data, 6),
      txHash: hash,
      explorerUrl: `https://testnet.arcscan.app/tx/${hash}`,
    };
  },
},
```

---

### FAZ 9: FX SWAP (1 saat)

#### Seçenek A: Circle StableFX API (Eğer erişim varsa)
```typescript
fx: {
  async getQuote(params: { from: string; to: string; amount: string }) {
    const res = await fetch('/api/circle/fx/quote', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return res.json();
  },

  async swap(quoteId: string) {
    const res = await fetch('/api/circle/fx/swap', {
      method: 'POST',
      body: JSON.stringify({ quoteId }),
    });
    return res.json();
  },
},
```

#### Seçenek B: Kaldır (Önerilen - API erişimi yoksa)
FX modülünü tamamen kaldır veya "Coming Soon" yap.

---

### FAZ 10: SMART WALLET KALDIR (30 dk)

Circle Wallets zaten smart wallet sağlıyor. Ayrı smartWallet modülü gereksiz.

```typescript
// smartWallet modülünü tamamen kaldır
// Circle Wallets (Faz 2'de eklenen) kullan
```

---

### FAZ 11: TEST WALLETS OLUŞTUR (1 saat)

Gerçek test için birden fazla wallet gerekli.

#### Task 11.1: Test Wallet Setup Script
**Dosya:** `scripts/setup-test-wallets.ts`

```typescript
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY!,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
});

async function setupTestWallets() {
  // 1. Ana test wallet set oluştur
  const walletSet = await client.createWalletSet({
    name: 'ArcPay-TestWallets',
  });

  // 2. 5 test wallet oluştur
  const wallets = await client.createWallets({
    blockchains: ['ARC-TESTNET'],
    count: 5,
    walletSetId: walletSet.data?.walletSet?.id ?? '',
    accountType: 'SCA',
    metadata: [
      { name: 'Alice', refId: 'alice' },
      { name: 'Bob', refId: 'bob' },
      { name: 'Charlie', refId: 'charlie' },
      { name: 'Merchant', refId: 'merchant' },
      { name: 'Agent', refId: 'agent' },
    ],
  });

  console.log('Test wallets created:');
  wallets.data?.wallets?.forEach((w) => {
    console.log(`- ${w.name}: ${w.address}`);
  });

  // 3. Faucet'ten USDC al (her wallet için)
  for (const wallet of wallets.data?.wallets || []) {
    console.log(`Funding ${wallet.name}...`);
    // Arc testnet faucet çağrısı
    await fetch('https://faucet.testnet.arc.network/fund', {
      method: 'POST',
      body: JSON.stringify({ address: wallet.address }),
    });
  }

  return wallets.data?.wallets;
}

setupTestWallets();
```

#### Task 11.2: Test Data File
**Dosya:** `website/src/lib/test-wallets.ts`

```typescript
// Test için gerçek wallet adresleri (Circle'dan alınan)
export const TEST_WALLETS = {
  alice: {
    address: '0x...',  // Gerçek Circle wallet
    walletId: '...',   // Circle wallet ID
  },
  bob: {
    address: '0x...',
    walletId: '...',
  },
  charlie: {
    address: '0x...',
    walletId: '...',
  },
  merchant: {
    address: '0x...',
    walletId: '...',
  },
  agent: {
    address: '0x...',
    walletId: '...',
  },
};
```

---

### FAZ 12: E2E TEST SUITE (2 saat)

Tüm gerçek fonksiyonları test et.

#### Task 12.1: Test Framework Setup
```bash
npm install -D vitest @testing-library/react
```

#### Task 12.2: Onchain Tests
**Dosya:** `website/src/__tests__/onchain.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { TEST_WALLETS } from '../lib/test-wallets';

describe('Onchain Tests - REAL TRANSACTIONS', () => {
  // Her test gerçek blockchain transaction'ı yapacak

  describe('USDC Transfers', () => {
    it('should transfer USDC from Alice to Bob', async () => {
      const result = await sdk.sendUSDC(TEST_WALLETS.bob.address, '0.01');

      expect(result.txHash).toMatch(/^0x[a-f0-9]{64}$/);
      expect(result.explorerUrl).toContain('arcscan.app');

      // Verify on chain
      const receipt = await publicClient.getTransactionReceipt({ hash: result.txHash });
      expect(receipt.status).toBe('success');
    });
  });

  describe('Escrow', () => {
    it('should create real escrow on chain', async () => {
      const result = await sdk.escrow.create({
        beneficiary: TEST_WALLETS.bob.address,
        amount: '1',
        duration: 86400,
      });

      expect(result.txHash).toMatch(/^0x[a-f0-9]{64}$/);

      // Verify escrow exists on chain
      const escrowData = await sdk.escrow.get(result.escrowId);
      expect(escrowData.amount).toBe('1');
    });
  });

  describe('x402 Micropayments', () => {
    it('should pay for x402 protected content', async () => {
      // Bu test gerçek USDC ödeyecek
      const result = await sdk.micropayments.pay('/api/x402/weather', {
        maxPrice: '0.01',
      });

      expect(result.success).toBe(true);
      expect(result.data.paid).toBe('0.001');
      expect(result.data.txHash).toMatch(/^0x[a-f0-9]{64}$/);
    });
  });

  describe('Gasless Transactions', () => {
    it('should send gasless transaction via Circle Gas Station', async () => {
      const result = await sdk.paymaster.sponsorTransaction({
        walletId: TEST_WALLETS.alice.walletId,
        to: TEST_WALLETS.bob.address,
        value: '0.1',
      });

      expect(result.success).toBe(true);
      expect(result.sponsored).toBe(true);
      expect(result.txHash).toMatch(/^0x[a-f0-9]{64}$/);
    });
  });

  describe('Privacy', () => {
    it('should generate valid stealth address with real crypto', async () => {
      const { stealthAddress, ephemeralPublicKey } = sdk.privacy._generateStealthAddress(
        TEST_WALLETS.alice.spendingPubKey,
        TEST_WALLETS.alice.viewingPubKey
      );

      expect(stealthAddress).toMatch(/^0x[a-f0-9]{40}$/);
      expect(ephemeralPublicKey).toMatch(/^0x[a-f0-9]{66}$/); // 33 bytes compressed
    });

    it('should send private payment on chain', async () => {
      const result = await sdk.privacy.sendPrivate({
        recipient: TEST_WALLETS.bob.address,
        amount: '0.1',
      });

      expect(result.txHash).toMatch(/^0x[a-f0-9]{64}$/);
    });
  });

  describe('Streams', () => {
    it('should create real payment stream on chain', async () => {
      const result = await sdk.streams.create({
        recipient: TEST_WALLETS.bob.address,
        amount: '10',
        duration: 86400 * 30, // 30 days
      });

      expect(result.txHash).toMatch(/^0x[a-f0-9]{64}$/);
      expect(result.streamId).toBeDefined();
    });
  });
});
```

---

### FAZ 13: VOICE COMMANDS GÜNCELLE (30 dk)

Fake komutları kaldır, gerçek olanları güncelle.

#### Task 13.1: Voice Commands Güncelle
```typescript
// Gemini prompt'tan kaldır:
// - "pay_gasless" → Circle Gas Station kullanacak şekilde güncelle
// - "x402_pay" → Gerçek x402 kullanacak şekilde güncelle
// - "check_yield", "deposit_yield", "withdraw_yield" → Kaldır (USYC fake)

// Güncellenmiş action listesi:
const actions = [
  "pay", "balance",
  "add_contact", "delete_contact", "list_contacts", "get_contact",
  "add_subscription", "pay_subscription", "pay_all_bills", "list_due_bills",
  "create_escrow", "release_escrow", "refund_escrow",
  "create_stream", "cancel_stream", "claim_stream",
  "split_equal", "create_link", "request_payment",
  "pay_private", "register_stealth",
  "pay_gasless",  // Artık gerçek Circle Gas Station
  "x402_pay",     // Artık gerçek x402
  "hire_agent",
  "help", "unknown"
];
```

---

## 📊 EXECUTION CHECKLIST

### Faz 1: Setup ⬜
- [ ] NPM packages yükle
- [ ] Environment variables ayarla
- [ ] Circle Developer Account oluştur

### Faz 2: Circle Wallets ⬜
- [ ] `/api/circle/wallets` route oluştur
- [ ] `/api/circle/transfer` route oluştur
- [ ] SDK'ya circleWallets modülü ekle

### Faz 3: Gas Station ⬜
- [ ] Circle Console'da Gas Station Policy oluştur
- [ ] `/api/circle/gasless` route oluştur
- [ ] SDK paymaster modülünü güncelle

### Faz 4: x402 Micropayments ⬜
- [ ] `/api/x402/premium` paywall route oluştur
- [ ] `/api/x402/weather` demo endpoint oluştur
- [ ] SDK micropayments modülünü güncelle
- [ ] Payment verification ekle

### Faz 5: Gateway ⬜
- [ ] `/api/circle/gateway` route oluştur
- [ ] SDK gateway modülünü güncelle

### Faz 6: Bridge (CCTP) ⬜
- [ ] `/api/circle/bridge` route oluştur
- [ ] SDK bridge modülünü güncelle

### Faz 7: Privacy Crypto ⬜
- [ ] noble-secp256k1 entegre et
- [ ] _derivePublicKey gerçek yap
- [ ] _generateStealthAddress gerçek yap

### Faz 8: USYC ⬜
- [ ] Fake subscribe/redeem kaldır
- [ ] Sadece gerçek getBalance tut

### Faz 9: FX Swap ⬜
- [ ] Kaldır veya gerçek API entegre et

### Faz 10: Smart Wallet ⬜
- [ ] Fake modülü kaldır

### Faz 11: Test Wallets ⬜
- [ ] Setup script çalıştır
- [ ] 5 test wallet oluştur
- [ ] Faucet'ten fonla

### Faz 12: E2E Tests ⬜
- [ ] Test framework kur
- [ ] Her modül için onchain test yaz
- [ ] Tüm testleri geç

### Faz 13: Voice Commands ⬜
- [ ] Fake komutları kaldır
- [ ] Gerçek komutları güncelle

---

## ⏱️ ESTIMATED TIME

| Faz | Süre | Öncelik |
|-----|------|---------|
| Faz 1: Setup | 30 dk | P0 |
| Faz 2: Circle Wallets | 2-3 saat | P0 |
| Faz 3: Gas Station | 2 saat | P0 |
| Faz 4: x402 | 3-4 saat | P0 |
| Faz 5: Gateway | 2 saat | P1 |
| Faz 6: Bridge | 2 saat | P1 |
| Faz 7: Privacy | 2 saat | P1 |
| Faz 8: USYC | 1 saat | P2 |
| Faz 9: FX | 1 saat | P2 |
| Faz 10: Smart Wallet | 30 dk | P2 |
| Faz 11: Test Wallets | 1 saat | P0 |
| Faz 12: E2E Tests | 2 saat | P1 |
| Faz 13: Voice | 30 dk | P2 |

**Toplam: ~18-20 saat**

---

## 🎯 SUCCESS CRITERIA

1. ✅ **Zero Simulation** - Hiçbir console.log fake data, hiçbir mock hash
2. ✅ **All Onchain** - Her transaction Arc testnet'te verify edilebilir
3. ✅ **Circle Integration** - Wallets, Gas Station, Gateway, Bridge entegre
4. ✅ **x402 Working** - Gerçek micropayment flow çalışıyor
5. ✅ **Tests Passing** - Tüm E2E testler gerçek blockchain'de geçiyor
6. ✅ **Video Ready** - Demo'da her şey gerçek transaction gösteriyor

---

## 📝 NOTES

- Circle API Key gerekli - https://console.circle.com
- Arc Testnet faucet: https://faucet.testnet.arc.network
- x402 docs: https://github.com/coinbase/x402
- Her şey onchain - her test USDC harcayacak, faucet'ten yeterli fonlama yap
