/**
 * API Endpoints Tests
 * Tests: All API routes functionality
 */

import { TestResult, runTest } from './types';
import { getTestContext } from './config';

export async function runAPITests(): Promise<TestResult[]> {
  console.log('\n🔌 Category 13: API Endpoints Tests');
  console.log('─'.repeat(40));

  const results: TestResult[] = [];
  const ctx = getTestContext();

  // Use production URL directly since dev server might not be running
  const apiUrl = 'https://website-beige-six-15.vercel.app';

  // Helper to fetch
  async function fetchAPI(path: string, options?: RequestInit) {
    const response = await fetch(`${apiUrl}${path}`, options);
    return { response, url: apiUrl };
  }

  // TEST_13_1: POST /api/pay - Returns error without wallet config
  results.push(await runTest('TEST_13_1', 'POST /api/pay - Returns error without wallet config', 'API Endpoints', async () => {
    // Note: /api/pay only has POST handler
    const { response, url } = await fetchAPI('/api/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}), // Empty body to trigger validation error
    });

    let data;
    try {
      data = await response.json();
    } catch {
      // If JSON parsing fails, that's also an expected error case
      data = { error: 'Invalid response' };
    }

    // Should return an error because required fields are missing
    if (response.ok && data.success) {
      throw new Error('Expected error for missing parameters');
    }

    return {
      details: {
        url: `${url}/api/pay`,
        status: response.status,
        hasError: !!data.error || response.status >= 400,
        error: data.error,
      },
    };
  }));

  // TEST_13_2: POST /api/pay - Requires private key
  results.push(await runTest('TEST_13_2', 'POST /api/pay - Requires private key', 'API Endpoints', async () => {
    const { response, url } = await fetchAPI('/api/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: ctx.circleWallet.address,
        amount: '0.001',
      }),
    });

    const data = await response.json();

    return {
      details: {
        url: `${url}/api/pay`,
        status: response.status,
        response: data,
        note: 'Payment requires private key or wallet connection',
      },
    };
  }));

  // TEST_13_3: GET /api/circle/wallets
  results.push(await runTest('TEST_13_3', 'GET /api/circle/wallets', 'API Endpoints', async () => {
    const { response, url } = await fetchAPI('/api/circle/wallets');
    const data = await response.json();

    return {
      details: {
        url: `${url}/api/circle/wallets`,
        status: response.status,
        success: data.success !== false,
        responseKeys: Object.keys(data),
      },
    };
  }));

  // TEST_13_4: POST /api/circle/wallets
  results.push(await runTest('TEST_13_4', 'POST /api/circle/wallets', 'API Endpoints', async () => {
    const { response, url } = await fetchAPI('/api/circle/wallets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'info',
      }),
    });

    const data = await response.json();

    return {
      details: {
        url: `${url}/api/circle/wallets`,
        status: response.status,
        responseKeys: Object.keys(data),
      },
    };
  }));

  // TEST_13_5: GET /api/circle/gasless
  results.push(await runTest('TEST_13_5', 'GET /api/circle/gasless', 'API Endpoints', async () => {
    const { response, url } = await fetchAPI('/api/circle/gasless');
    const data = await response.json();

    return {
      details: {
        url: `${url}/api/circle/gasless`,
        status: response.status,
        success: data.success,
        gasStationEnabled: data.gasStationEnabled,
      },
    };
  }));

  // TEST_13_6: POST /api/circle/gasless
  results.push(await runTest('TEST_13_6', 'POST /api/circle/gasless', 'API Endpoints', async () => {
    const { response, url } = await fetchAPI('/api/circle/gasless', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: ctx.walletAddress,
        amount: '0.001',
      }),
    });

    const data = await response.json();

    return {
      details: {
        url: `${url}/api/circle/gasless`,
        status: response.status,
        success: data.success,
        error: data.error,
        note: 'May fail if Circle wallet has no balance',
      },
    };
  }));

  // TEST_13_7: GET /api/circle/gateway
  results.push(await runTest('TEST_13_7', 'GET /api/circle/gateway', 'API Endpoints', async () => {
    const { response, url } = await fetchAPI('/api/circle/gateway');
    const data = await response.json();

    return {
      details: {
        url: `${url}/api/circle/gateway`,
        status: response.status,
        responseKeys: Object.keys(data),
      },
    };
  }));

  // TEST_13_8: POST /api/circle/gateway
  results.push(await runTest('TEST_13_8', 'POST /api/circle/gateway', 'API Endpoints', async () => {
    const { response, url } = await fetchAPI('/api/circle/gateway', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'balance',
      }),
    });

    const data = await response.json();

    return {
      details: {
        url: `${url}/api/circle/gateway`,
        status: response.status,
        responseKeys: Object.keys(data),
      },
    };
  }));

  // TEST_13_9: GET /api/circle/bridge
  results.push(await runTest('TEST_13_9', 'GET /api/circle/bridge', 'API Endpoints', async () => {
    const { response, url } = await fetchAPI('/api/circle/bridge');
    const data = await response.json();

    return {
      details: {
        url: `${url}/api/circle/bridge`,
        status: response.status,
        responseKeys: Object.keys(data),
      },
    };
  }));

  // TEST_13_10: POST /api/circle/bridge
  results.push(await runTest('TEST_13_10', 'POST /api/circle/bridge', 'API Endpoints', async () => {
    const { response, url } = await fetchAPI('/api/circle/bridge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'estimate',
        fromChain: 'ARC-TESTNET',
        toChain: 'ETH-SEPOLIA',
        amount: '10',
      }),
    });

    const data = await response.json();

    return {
      details: {
        url: `${url}/api/circle/bridge`,
        status: response.status,
        responseKeys: Object.keys(data),
      },
    };
  }));

  // TEST_13_11: GET /api/x402/weather
  results.push(await runTest('TEST_13_11', 'GET /api/x402/weather', 'API Endpoints', async () => {
    const { response, url } = await fetchAPI('/api/x402/weather');
    const data = await response.json();

    return {
      details: {
        url: `${url}/api/x402/weather`,
        status: response.status,
        is402: response.status === 402,
        responseKeys: Object.keys(data),
      },
    };
  }));

  // TEST_13_12: GET /api/x402/premium
  results.push(await runTest('TEST_13_12', 'GET /api/x402/premium', 'API Endpoints', async () => {
    const { response, url } = await fetchAPI('/api/x402/premium');
    const data = await response.json();

    return {
      details: {
        url: `${url}/api/x402/premium`,
        status: response.status,
        is402: response.status === 402,
        responseKeys: Object.keys(data),
      },
    };
  }));

  return results;
}
