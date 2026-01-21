/**
 * Register Entity Secret with Circle
 *
 * This script registers the entity secret ciphertext with Circle API.
 * The entity secret must be encrypted with Circle's public key first.
 *
 * Run with: npx tsx scripts/register-entity-secret.ts
 */

import {
  initiateDeveloperControlledWalletsClient,
} from '@circle-fin/developer-controlled-wallets';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { createCipheriv, publicEncrypt, constants } from 'crypto';
import { Buffer } from 'buffer';
import * as forge from 'node-forge';

function loadConfig() {
  const envPath = path.join(process.cwd(), 'website', '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local not found');
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const apiKeyMatch = envContent.match(/CIRCLE_API_KEY=(.+)/);
  const entitySecretMatch = envContent.match(/CIRCLE_ENTITY_SECRET=([a-f0-9]{64})/);

  return {
    apiKey: apiKeyMatch?.[1]?.trim() || '',
    entitySecret: entitySecretMatch?.[1]?.trim() || '',
  };
}

async function getPublicKey(apiKey: string): Promise<string> {
  const response = await fetch('https://api.circle.com/v1/w3s/config/entity/publicKey', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });
  const data = await response.json();
  return data.data?.publicKey || '';
}

function encryptEntitySecret(entitySecret: string, publicKeyPem: string): string {
  // Convert hex entity secret to bytes
  const entitySecretBytes = Buffer.from(entitySecret, 'hex');

  // Parse the PEM public key
  const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);

  // Encrypt using RSA-OAEP with SHA-256
  const encrypted = publicKey.encrypt(entitySecretBytes.toString('binary'), 'RSA-OAEP', {
    md: forge.md.sha256.create(),
    mgf1: {
      md: forge.md.sha256.create()
    }
  });

  // Return base64 encoded ciphertext
  return forge.util.encode64(encrypted);
}

async function registerEntitySecret() {
  console.log('='.repeat(50));
  console.log('Register Entity Secret with Circle');
  console.log('='.repeat(50));

  const { apiKey, entitySecret } = loadConfig();

  if (!apiKey || !entitySecret) {
    throw new Error('Missing API key or entity secret');
  }

  console.log('\n✅ API Key:', apiKey.slice(0, 25) + '...');
  console.log('✅ Entity Secret:', entitySecret.slice(0, 10) + '...');

  // Get Circle's public key
  console.log('\n1. Fetching Circle public key...');
  const publicKey = await getPublicKey(apiKey);

  if (!publicKey) {
    throw new Error('Could not get Circle public key');
  }
  console.log('✅ Got public key');

  // Encrypt entity secret
  console.log('\n2. Encrypting entity secret...');
  const encryptedSecret = encryptEntitySecret(entitySecret, publicKey);
  console.log('✅ Entity secret encrypted');
  console.log('   Ciphertext length:', encryptedSecret.length);

  // Register with Circle
  console.log('\n3. Registering with Circle...');

  const response = await fetch('https://api.circle.com/v1/w3s/config/entity/entitySecret', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      entitySecretCiphertext: encryptedSecret,
    }),
  });

  const result = await response.json();

  if (response.ok || result.data) {
    console.log('✅ Entity secret registered successfully!');

    // Save recovery file
    const desktopPath = process.env.USERPROFILE
      ? path.join(process.env.USERPROFILE, 'Desktop')
      : path.join(process.env.HOME || '', 'Desktop');

    const recoveryPath = path.join(desktopPath, 'circle-recovery-file.json');
    fs.writeFileSync(recoveryPath, JSON.stringify({
      registeredAt: new Date().toISOString(),
      entitySecretCiphertext: encryptedSecret,
      apiKey: apiKey.slice(0, 20) + '...',
    }, null, 2));

    console.log(`✅ Recovery file saved: ${recoveryPath}`);
  } else {
    console.log('❌ Registration failed:', result.message || JSON.stringify(result));
  }

  console.log('\n' + '='.repeat(50));
  console.log('Next: Run npx tsx scripts/create-circle-wallet.ts');
  console.log('='.repeat(50));
}

registerEntitySecret().catch((error) => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
