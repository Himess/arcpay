/**
 * Setup Test Wallets Script
 *
 * This script creates Circle Developer-Controlled Wallets for testing.
 * Run with: npx ts-node scripts/setup-test-wallets.ts
 *
 * Prerequisites:
 * 1. Set CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET in .env
 * 2. npm install @circle-fin/developer-controlled-wallets
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

const CIRCLE_API_URL = 'https://api.circle.com/v1/w3s';

interface CircleWallet {
  id: string;
  address: string;
  blockchain: string;
  state: string;
  name?: string;
}

async function circleRequest(endpoint: string, options: RequestInit = {}) {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

  if (!apiKey || !entitySecret) {
    throw new Error('CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET required in .env');
  }

  const response = await fetch(`${CIRCLE_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Entity-Secret': entitySecret,
      ...options.headers,
    },
  });

  return response.json();
}

async function createWalletSet(name: string) {
  console.log(`Creating wallet set: ${name}...`);

  const response = await circleRequest('/walletSets', {
    method: 'POST',
    body: JSON.stringify({
      name,
      idempotencyKey: `walletset-${name}-${Date.now()}`,
    }),
  });

  if (response.code && response.code !== 0) {
    console.error('Failed to create wallet set:', response);
    return null;
  }

  return response.data?.walletSet?.id;
}

async function createWallets(walletSetId: string, users: string[]) {
  console.log(`Creating ${users.length} wallets...`);

  const response = await circleRequest('/wallets', {
    method: 'POST',
    body: JSON.stringify({
      idempotencyKey: `wallets-${Date.now()}`,
      walletSetId,
      blockchains: ['ARC-TESTNET'],
      count: users.length,
      accountType: 'SCA', // Smart Contract Account for Gas Station
      metadata: users.map((name, i) => ({
        name,
        refId: name.toLowerCase(),
      })),
    }),
  });

  if (response.code && response.code !== 0) {
    console.error('Failed to create wallets:', response);
    return [];
  }

  return response.data?.wallets || [];
}

async function fundWalletFromFaucet(address: string) {
  console.log(`Funding wallet ${address} from faucet...`);

  try {
    // Arc Testnet faucet (if available)
    const response = await fetch('https://faucet.testnet.arc.network/fund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    });

    if (response.ok) {
      console.log(`  Funded successfully`);
      return true;
    } else {
      console.log(`  Faucet request failed: ${response.status}`);
      return false;
    }
  } catch (e: any) {
    console.log(`  Faucet error: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log('ArcPay Test Wallets Setup');
  console.log('='.repeat(50));
  console.log('');

  // Test wallet users
  const testUsers = ['Alice', 'Bob', 'Charlie', 'Merchant', 'Agent'];

  // 1. Create wallet set
  const walletSetId = await createWalletSet('ArcPay-TestWallets');
  if (!walletSetId) {
    console.error('Failed to create wallet set');
    process.exit(1);
  }
  console.log(`Wallet set created: ${walletSetId}`);
  console.log('');

  // 2. Create wallets
  const wallets = await createWallets(walletSetId, testUsers);
  if (wallets.length === 0) {
    console.error('Failed to create wallets');
    process.exit(1);
  }

  console.log('');
  console.log('Test wallets created:');
  console.log('-'.repeat(50));

  const walletData: Record<string, { address: string; walletId: string }> = {};

  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];
    const name = testUsers[i];

    console.log(`${name}:`);
    console.log(`  Address:  ${wallet.address}`);
    console.log(`  WalletId: ${wallet.id}`);

    walletData[name.toLowerCase()] = {
      address: wallet.address,
      walletId: wallet.id,
    };

    // 3. Fund from faucet
    await fundWalletFromFaucet(wallet.address);
    console.log('');
  }

  // 4. Output TypeScript file
  console.log('');
  console.log('='.repeat(50));
  console.log('Copy this to website/src/lib/test-wallets.ts:');
  console.log('='.repeat(50));
  console.log('');
  console.log(`// Auto-generated test wallets - ${new Date().toISOString()}`);
  console.log(`export const TEST_WALLETS = ${JSON.stringify(walletData, null, 2)};`);
  console.log('');
}

main().catch(console.error);
