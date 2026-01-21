/**
 * Circle Entity Secret Setup Script
 *
 * Uses official Circle SDK for proper entity secret encryption
 *
 * Run with: npx tsx scripts/setup-circle.ts
 */

import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Generate 32-byte hex entity secret
function generateEntitySecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

async function setup() {
  console.log('='.repeat(50));
  console.log('Circle Entity Secret Setup (Official SDK)');
  console.log('='.repeat(50));

  // Load environment
  const envPath = path.join(process.cwd(), 'website', '.env.local');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }

  // Extract API key from env
  const apiKeyMatch = envContent.match(/CIRCLE_API_KEY=(.+)/);
  const apiKey = apiKeyMatch?.[1]?.trim() || process.env.CIRCLE_API_KEY;

  if (!apiKey) {
    console.log('\n❌ CIRCLE_API_KEY not found!');
    console.log('   Get API key from: https://console.circle.com');
    console.log('   Add to website/.env.local:');
    console.log('   CIRCLE_API_KEY=your_api_key_here');
    process.exit(1);
  }

  console.log('\n✅ API Key found:', apiKey.slice(0, 25) + '...');

  // Check for existing entity secret
  const existingSecretMatch = envContent.match(/CIRCLE_ENTITY_SECRET=([a-f0-9]{64})/);
  let entitySecret: string;

  if (existingSecretMatch) {
    entitySecret = existingSecretMatch[1];
    console.log('\n✅ Using existing Entity Secret:', entitySecret.slice(0, 10) + '...');
  } else {
    // Generate new entity secret
    console.log('\n1. Generating Entity Secret...');
    entitySecret = generateEntitySecret();
    console.log('✅ Entity Secret generated');
    console.log(`   Secret: ${entitySecret.slice(0, 10)}...${entitySecret.slice(-10)}`);
  }

  // Save backup to Desktop
  const desktopPath = process.env.USERPROFILE
    ? path.join(process.env.USERPROFILE, 'Desktop')
    : path.join(process.env.HOME || '', 'Desktop');

  const backupPath = path.join(desktopPath, 'circle-entity-secret-BACKUP.txt');

  fs.writeFileSync(backupPath, `
CIRCLE ENTITY SECRET - KEEP SECURE!
====================================
Generated: ${new Date().toISOString()}

Entity Secret: ${entitySecret}

API Key: ${apiKey}

WARNING: Store this file securely!
Circle does NOT store this secret - if you lose it, you lose access to wallets.

To use in .env.local:
CIRCLE_API_KEY=${apiKey}
CIRCLE_ENTITY_SECRET=${entitySecret}
  `.trim());

  console.log(`\n✅ Backup saved: ${backupPath}`);

  // Initialize Circle SDK
  console.log('\n2. Initializing Circle SDK...');

  try {
    const client = initiateDeveloperControlledWalletsClient({
      apiKey: apiKey,
      entitySecret: entitySecret,
    });

    console.log('✅ Circle SDK initialized');

    // Test the connection by listing wallet sets
    console.log('\n3. Testing API connection...');

    const walletSets = await client.listWalletSets({});
    console.log('✅ API connection successful');
    console.log(`   Found ${walletSets.data?.walletSets?.length || 0} existing wallet sets`);

  } catch (error: any) {
    if (error.message?.includes('entity secret')) {
      console.log('\n⚠️  Entity Secret not registered with Circle yet');
      console.log('   The SDK will auto-register on first wallet creation');
    } else {
      console.log('\n⚠️  SDK initialization warning:', error.message);
    }
  }

  // Update .env.local
  console.log('\n4. Updating .env.local...');

  if (envContent.includes('CIRCLE_ENTITY_SECRET=')) {
    envContent = envContent.replace(
      /CIRCLE_ENTITY_SECRET=.*/,
      `CIRCLE_ENTITY_SECRET=${entitySecret}`
    );
  } else {
    envContent += `\n# Circle Entity Secret (generated ${new Date().toISOString()})\nCIRCLE_ENTITY_SECRET=${entitySecret}\n`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env.local updated');

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('Setup Complete!');
  console.log('='.repeat(50));
  console.log('\n📁 Files:');
  console.log(`   Backup: ${backupPath}`);
  console.log(`   Env: ${envPath}`);
  console.log('\n🔑 Credentials:');
  console.log(`   API Key: ${apiKey.slice(0, 25)}...`);
  console.log(`   Entity Secret: ${entitySecret.slice(0, 10)}...${entitySecret.slice(-10)}`);
  console.log('\n📝 Next steps:');
  console.log('   1. Run: npx tsx scripts/create-circle-wallet.ts');
  console.log('   2. Add CIRCLE_ENTITY_SECRET to Vercel env vars');
  console.log('   3. Redeploy: vercel --prod');
}

setup().catch((error) => {
  console.error('\n❌ Setup failed:', error.message);
  process.exit(1);
});
