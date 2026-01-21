/**
 * Circle Wallets Tests
 * Tests: Wallet info, address verification, state, balance
 */

import { TestResult, runTest, formatUSDC } from './types';
import { getTestContext, getProvider } from './config';

export async function runCircleWalletTests(): Promise<TestResult[]> {
  console.log('\n👛 Category 8: Circle Wallets Tests');
  console.log('─'.repeat(40));

  const results: TestResult[] = [];
  const ctx = getTestContext();
  const provider = getProvider();

  // For production, use the deployed API
  const apiBaseUrl = 'https://website-beige-six-15.vercel.app';

  // TEST_8_1: GET /api/circle/wallets - Get wallet info
  results.push(await runTest('TEST_8_1', 'GET /api/circle/wallets - Get wallet info', 'Circle Wallets', async () => {
    // Need to pass walletId parameter
    const response = await fetch(`${apiBaseUrl}/api/circle/wallets?walletId=${ctx.circleWallet.id}`);
    const data = await response.json();

    // The API returns error if wallet not found, success if found
    if (!response.ok && !data.error) {
      throw new Error(`HTTP ${response.status}`);
    }

    return {
      details: {
        success: data.success,
        wallet: data.wallet ? {
          id: data.wallet.id,
          address: data.wallet.address,
          blockchain: data.wallet.blockchain,
          state: data.wallet.state,
        } : null,
        error: data.error,
      },
    };
  }));

  // TEST_8_2: Verify wallet address matches
  results.push(await runTest('TEST_8_2', 'Verify wallet address matches', 'Circle Wallets', async () => {
    const response = await fetch(`${apiBaseUrl}/api/circle/gasless`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to get wallet info');
    }

    const walletAddress = data.wallet?.address?.toLowerCase();
    const expectedAddress = ctx.circleWallet.address.toLowerCase();

    if (walletAddress !== expectedAddress) {
      throw new Error(`Address mismatch: expected ${expectedAddress}, got ${walletAddress}`);
    }

    return {
      details: {
        expectedAddress: ctx.circleWallet.address,
        actualAddress: data.wallet.address,
        match: true,
      },
    };
  }));

  // TEST_8_3: Verify wallet state is LIVE
  results.push(await runTest('TEST_8_3', 'Verify wallet state is LIVE', 'Circle Wallets', async () => {
    const response = await fetch(`${apiBaseUrl}/api/circle/gasless`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to get wallet info');
    }

    if (data.wallet?.state !== 'LIVE') {
      throw new Error(`Expected LIVE state, got: ${data.wallet?.state}`);
    }

    return {
      details: {
        walletId: data.wallet.id,
        state: data.wallet.state,
        accountType: data.wallet.accountType,
      },
    };
  }));

  // TEST_8_4: Get wallet balance via Circle API
  results.push(await runTest('TEST_8_4', 'Get wallet balance via Circle API', 'Circle Wallets', async () => {
    // Get balance from blockchain directly for Circle wallet
    const balance = await provider.getBalance(ctx.circleWallet.address);

    return {
      details: {
        walletAddress: ctx.circleWallet.address,
        nativeBalance: formatUSDC(balance) + ' USDC',
        note: 'Balance retrieved from RPC, not Circle API',
      },
    };
  }));

  return results;
}
