/**
 * ArcPay API Endpoint Tests
 *
 * Tests all API endpoints to verify they are working correctly.
 * Run with: npx ts-node scripts/test-api-endpoints.ts
 *
 * Prerequisites:
 * 1. Website running on localhost:3000
 * 2. Environment variables set in .env.local
 */

import { config } from 'dotenv';
config({ path: 'website/.env.local' });

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({
      name,
      passed: true,
      message: 'OK',
      duration: Date.now() - start,
    });
    console.log(`✅ ${name}`);
  } catch (error: any) {
    results.push({
      name,
      passed: false,
      message: error.message,
      duration: Date.now() - start,
    });
    console.log(`❌ ${name}: ${error.message}`);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('ArcPay API Endpoint Tests');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log('');

  // Test 1: Health check (homepage loads)
  await test('Homepage loads', async () => {
    const res = await fetch(`${BASE_URL}/playground`);
    if (!res.ok) throw new Error(`Status: ${res.status}`);
  });

  // Test 2: Circle Wallets API - GET without walletId (should return error)
  await test('Circle Wallets GET - requires walletId', async () => {
    const res = await fetch(`${BASE_URL}/api/circle/wallets`);
    const data = await res.json();
    if (res.status !== 400 && !data.error) {
      throw new Error('Expected 400 or error response');
    }
  });

  // Test 3: Circle Wallets API - POST without API key
  await test('Circle Wallets POST - checks API config', async () => {
    const res = await fetch(`${BASE_URL}/api/circle/wallets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'test-user' }),
    });
    const data = await res.json();
    // Should either succeed (if API key configured) or return config error
    if (!data.success && !data.error) {
      throw new Error('Expected success or error response');
    }
  });

  // Test 4: Circle Transfer API - requires walletId
  await test('Circle Transfer POST - requires params', async () => {
    const res = await fetch(`${BASE_URL}/api/circle/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (res.status !== 400 && !data.error) {
      throw new Error('Expected 400 for missing params');
    }
  });

  // Test 5: Circle Gasless API - requires params
  await test('Circle Gasless POST - requires params', async () => {
    const res = await fetch(`${BASE_URL}/api/circle/gasless`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (res.status !== 400 && !data.error) {
      throw new Error('Expected 400 for missing params');
    }
  });

  // Test 6: Circle Bridge API - requires params
  await test('Circle Bridge POST - requires params', async () => {
    const res = await fetch(`${BASE_URL}/api/circle/bridge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (res.status !== 400 && !data.error) {
      throw new Error('Expected 400 for missing params');
    }
  });

  // Test 7: Circle Gateway API - requires params
  await test('Circle Gateway POST - requires params', async () => {
    const res = await fetch(`${BASE_URL}/api/circle/gateway`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (res.status !== 400 && !data.error) {
      throw new Error('Expected 400 for missing params');
    }
  });

  // Test 8: x402 Premium API - returns 402 without payment
  await test('x402 Premium GET - returns 402', async () => {
    const res = await fetch(`${BASE_URL}/api/x402/premium`);
    if (res.status !== 402) {
      throw new Error(`Expected 402, got ${res.status}`);
    }
    const price = res.headers.get('X-Price');
    const payTo = res.headers.get('X-Pay-To');
    if (!price || !payTo) {
      throw new Error('Missing X-Price or X-Pay-To headers');
    }
  });

  // Test 9: x402 Weather API - returns 402 without payment
  await test('x402 Weather GET - returns 402', async () => {
    const res = await fetch(`${BASE_URL}/api/x402/weather`);
    if (res.status !== 402) {
      throw new Error(`Expected 402, got ${res.status}`);
    }
  });

  // Test 10: Pay API - requires private key
  await test('Pay API POST - requires DEMO_PRIVATE_KEY', async () => {
    const res = await fetch(`${BASE_URL}/api/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: '0x0000000000000000000000000000000000000001',
        amount: '0.01',
      }),
    });
    const data = await res.json();
    // Should error if no private key configured
    if (!data.success && !data.error) {
      throw new Error('Expected success or error response');
    }
  });

  // Print summary
  console.log('');
  console.log('='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total time: ${totalTime}ms`);

  if (failed > 0) {
    console.log('');
    console.log('Failed tests:');
    results
      .filter(r => !r.passed)
      .forEach(r => console.log(`  - ${r.name}: ${r.message}`));
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
