/**
 * Test Circle Authentication
 */

import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import * as fs from 'fs';
import * as path from 'path';

function loadConfig() {
  const envPath = path.join(process.cwd(), 'website', '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf-8');

  const apiKeyMatch = envContent.match(/CIRCLE_API_KEY=(.+)/);
  const entitySecretMatch = envContent.match(/CIRCLE_ENTITY_SECRET=([a-f0-9]{64})/);
  const walletIdMatch = envContent.match(/CIRCLE_WALLET_ID=(.+)/);

  return {
    apiKey: apiKeyMatch?.[1]?.trim(),
    entitySecret: entitySecretMatch?.[1]?.trim(),
    walletId: walletIdMatch?.[1]?.trim(),
  };
}

async function testAuth() {
  console.log('='.repeat(50));
  console.log('Testing Circle Authentication');
  console.log('='.repeat(50));

  const { apiKey, entitySecret, walletId } = loadConfig();

  console.log('\nCredentials:');
  console.log('  API Key:', apiKey?.slice(0, 30) + '...');
  console.log('  Entity Secret:', entitySecret?.slice(0, 16) + '...');
  console.log('  Wallet ID:', walletId);

  if (!apiKey || !entitySecret) {
    throw new Error('Missing credentials');
  }

  console.log('\n1. Initializing SDK...');
  const client = initiateDeveloperControlledWalletsClient({
    apiKey,
    entitySecret,
  });
  console.log('✅ SDK initialized');

  console.log('\n2. Testing list wallet sets...');
  try {
    const response = await client.listWalletSets({});
    console.log('✅ Success!');
    console.log('   Wallet sets:', response.data?.walletSets?.length || 0);
    if (response.data?.walletSets) {
      for (const ws of response.data.walletSets) {
        console.log(`   - ${ws.id}: ${ws.name}`);
      }
    }
  } catch (error: any) {
    console.log('❌ Failed:', error.message);
    if (error.response?.data) {
      console.log('   Response:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.response?.status) {
      console.log('   Status:', error.response.status);
    }
  }

  console.log('\n3. Testing get wallet...');
  if (walletId) {
    try {
      const response = await client.getWallet({ id: walletId });
      console.log('✅ Success!');
      console.log('   Wallet:', JSON.stringify(response.data, null, 2));
    } catch (error: any) {
      console.log('❌ Failed:', error.message);
      if (error.response?.data) {
        console.log('   Response:', JSON.stringify(error.response.data, null, 2));
      }
    }
  } else {
    console.log('   Skipped - no wallet ID');
  }
}

testAuth().catch(console.error);
