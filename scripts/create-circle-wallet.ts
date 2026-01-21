/**
 * Circle Wallet Creation Script
 *
 * Uses official Circle SDK to create Developer-Controlled Wallets
 *
 * Run with: npx tsx scripts/create-circle-wallet.ts
 */

import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import * as fs from 'fs';
import * as path from 'path';

function loadConfig() {
  const envPath = path.join(process.cwd(), 'website', '.env.local');

  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local not found. Run from project root.');
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');

  const apiKeyMatch = envContent.match(/CIRCLE_API_KEY=(.+)/);
  const entitySecretMatch = envContent.match(/CIRCLE_ENTITY_SECRET=([a-f0-9]{64})/);

  const apiKey = apiKeyMatch?.[1]?.trim();
  const entitySecret = entitySecretMatch?.[1]?.trim();

  if (!apiKey) {
    throw new Error('CIRCLE_API_KEY not found in .env.local');
  }

  if (!entitySecret) {
    throw new Error('CIRCLE_ENTITY_SECRET not found. Run setup-circle.ts first.');
  }

  return { apiKey, entitySecret, envPath, envContent };
}

async function createWallet() {
  console.log('='.repeat(50));
  console.log('Circle Wallet Creation (Official SDK)');
  console.log('='.repeat(50));

  // Load config
  console.log('\n1. Loading configuration...');
  const { apiKey, entitySecret, envPath, envContent } = loadConfig();
  console.log('✅ API Key:', apiKey.slice(0, 25) + '...');
  console.log('✅ Entity Secret:', entitySecret.slice(0, 10) + '...');

  // Initialize SDK
  console.log('\n2. Initializing Circle SDK...');
  const client = initiateDeveloperControlledWalletsClient({
    apiKey,
    entitySecret,
  });
  console.log('✅ SDK initialized');

  // Create Wallet Set
  console.log('\n3. Creating Wallet Set...');
  const walletSetResponse = await client.createWalletSet({
    name: `ArcPay-${Date.now()}`,
  });

  const walletSetId = walletSetResponse.data?.walletSet?.id;

  if (!walletSetId) {
    console.log('Response:', JSON.stringify(walletSetResponse, null, 2));
    throw new Error('Failed to create wallet set');
  }

  console.log('✅ Wallet Set created:', walletSetId);

  // Create SCA Wallet (Gas Station enabled)
  console.log('\n4. Creating SCA Wallet...');

  const walletResponse = await client.createWallets({
    walletSetId,
    blockchains: ['ARC-TESTNET'], // Arc Testnet
    count: 1,
    accountType: 'SCA', // Smart Contract Account for Gas Station
  });

  const wallet = walletResponse.data?.wallets?.[0];

  if (!wallet) {
    console.log('Response:', JSON.stringify(walletResponse, null, 2));
    throw new Error('Failed to create wallet');
  }

  console.log('✅ Wallet created!');
  console.log('');
  console.log('   Wallet ID:', wallet.id);
  console.log('   Address:', wallet.address);
  console.log('   Blockchain:', wallet.blockchain);
  console.log('   Account Type:', wallet.accountType);
  console.log('   State:', wallet.state);

  // Update .env.local
  console.log('\n5. Updating .env.local...');
  let updatedEnv = envContent;

  // Add/update wallet ID
  if (updatedEnv.includes('CIRCLE_WALLET_ID=')) {
    updatedEnv = updatedEnv.replace(/CIRCLE_WALLET_ID=.*/, `CIRCLE_WALLET_ID=${wallet.id}`);
  } else {
    updatedEnv += `\n# Circle Wallet (created ${new Date().toISOString()})\nCIRCLE_WALLET_ID=${wallet.id}\n`;
  }

  // Add/update wallet address
  if (updatedEnv.includes('CIRCLE_WALLET_ADDRESS=')) {
    updatedEnv = updatedEnv.replace(/CIRCLE_WALLET_ADDRESS=.*/, `CIRCLE_WALLET_ADDRESS=${wallet.address}`);
  } else {
    updatedEnv += `CIRCLE_WALLET_ADDRESS=${wallet.address}\n`;
  }

  // Add/update wallet set ID
  if (updatedEnv.includes('CIRCLE_WALLET_SET_ID=')) {
    updatedEnv = updatedEnv.replace(/CIRCLE_WALLET_SET_ID=.*/, `CIRCLE_WALLET_SET_ID=${walletSetId}`);
  } else {
    updatedEnv += `CIRCLE_WALLET_SET_ID=${walletSetId}\n`;
  }

  fs.writeFileSync(envPath, updatedEnv);
  console.log('✅ .env.local updated');

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('Wallet Creation Complete!');
  console.log('='.repeat(50));
  console.log('\n🔑 Wallet Details:');
  console.log(`   ID: ${wallet.id}`);
  console.log(`   Address: ${wallet.address}`);
  console.log(`   Blockchain: ${wallet.blockchain}`);
  console.log(`   Type: ${wallet.accountType}`);
  console.log('\n📝 Next steps:');
  console.log('1. Fund wallet with testnet ETH');
  console.log('   Sepolia Faucet: https://sepoliafaucet.com');
  console.log('2. Configure Gas Station in Circle Console');
  console.log('3. Update Vercel environment variables');
  console.log('4. Redeploy: vercel --prod');
}

createWallet().catch((error) => {
  console.error('\n❌ Error:', error.message);
  if (error.response?.data) {
    console.error('   Details:', JSON.stringify(error.response.data, null, 2));
  }
  process.exit(1);
});
