/**
 * Micropayments / x402 Tests
 * Tests: 402 responses, X-Payment headers, pay for content
 */

import { ethers } from 'ethers';
import { TestResult, runTest, skipTest, parseUSDC, formatUSDC, waitForTx, sleep } from './types';
import { getTestContext, getProvider, getSigner } from './config';

export async function runMicropaymentTests(): Promise<TestResult[]> {
  console.log('\n💸 Category 6: Micropayments / x402 Tests');
  console.log('─'.repeat(40));

  const results: TestResult[] = [];
  const ctx = getTestContext();

  // Use production URL for x402 tests
  const apiBaseUrl = 'https://website-beige-six-15.vercel.app';

  // TEST_6_1: Check /api/x402/weather returns 402
  results.push(await runTest('TEST_6_1', 'Check /api/x402/weather returns 402', 'Micropayments', async () => {
    const response = await fetch(`${apiBaseUrl}/api/x402/weather`);

    if (response.status !== 402) {
      throw new Error(`Expected 402, got ${response.status}`);
    }

    const data = await response.json();

    return {
      details: {
        status: response.status,
        paymentRequired: true,
        responseBody: data,
      },
    };
  }));

  // TEST_6_2: Check /api/x402/premium returns 402
  results.push(await runTest('TEST_6_2', 'Check /api/x402/premium returns 402', 'Micropayments', async () => {
    const response = await fetch(`${apiBaseUrl}/api/x402/premium`);

    if (response.status !== 402) {
      throw new Error(`Expected 402, got ${response.status}`);
    }

    const data = await response.json();

    return {
      details: {
        status: response.status,
        paymentRequired: true,
        responseBody: data,
      },
    };
  }));

  // TEST_6_3: Parse X-Payment headers
  results.push(await runTest('TEST_6_3', 'Parse X-Payment headers', 'Micropayments', async () => {
    const response = await fetch(`${apiBaseUrl}/api/x402/weather`);

    // Check for x402 headers (actual header names from route)
    const payTo = response.headers.get('X-Pay-To');
    const price = response.headers.get('X-Price');
    const currency = response.headers.get('X-Currency');
    const network = response.headers.get('X-Network');
    const paymentRequired = response.headers.get('X-Payment-Required');

    // Also get from response body
    const data = await response.json();

    const paymentInfo = {
      address: payTo || data.payTo,
      amount: price || data.price,
      currency: currency || data.currency,
      network: network || data.network,
    };

    if (!paymentInfo.address && !paymentInfo.amount) {
      throw new Error('No payment info found in headers or body');
    }

    return {
      details: {
        headers: {
          'X-Pay-To': payTo,
          'X-Price': price,
          'X-Currency': currency,
          'X-Network': network,
          'X-Payment-Required': paymentRequired,
        },
        bodyPaymentInfo: {
          payTo: data.payTo,
          price: data.price,
          currency: data.currency,
          network: data.network,
        },
      },
    };
  }));

  // TEST_6_4: Pay for weather endpoint (REAL payment)
  results.push(await runTest('TEST_6_4', 'Pay for weather endpoint (real TX)', 'Micropayments', async () => {
    const provider = getProvider();
    const signer = getSigner();

    // Step 1: Get 402 response with payment info
    const response402 = await fetch(`${apiBaseUrl}/api/x402/weather?city=Istanbul`);
    const paymentInfo = await response402.json();

    if (response402.status !== 402) {
      throw new Error(`Expected 402, got ${response402.status}`);
    }

    // Convert to lowercase first to bypass bad checksum, then normalize
    const payTo = ethers.getAddress(paymentInfo.payTo.toLowerCase());
    const priceStr = paymentInfo.price; // "0.001"
    const priceWei = ethers.parseUnits(priceStr, 18); // USDC is 18 decimals on Arc

    console.log(`     Payment info: ${priceStr} USDC to ${payTo}`);

    // Step 2: Send actual payment
    console.log('     Sending payment transaction...');
    const tx = await signer.sendTransaction({
      to: payTo,
      value: priceWei,
    });
    const receipt = await waitForTx(provider, tx.hash);
    console.log(`     Payment TX: ${tx.hash}`);

    // Wait a bit for the TX to propagate to the RPC used by the API
    await sleep(3000);

    // Step 3: Request content with payment proof
    console.log('     Requesting content with payment proof...');
    const response200 = await fetch(`${apiBaseUrl}/api/x402/weather?city=Istanbul`, {
      headers: {
        'X-Payment': JSON.stringify({ txHash: tx.hash }),
      },
    });

    const weatherData = await response200.json();

    if (response200.status !== 200) {
      throw new Error(`Expected 200 after payment, got ${response200.status}: ${JSON.stringify(weatherData)}`);
    }

    return {
      txHash: tx.hash,
      details: {
        endpoint: '/api/x402/weather',
        paymentTx: tx.hash,
        paidAmount: priceStr + ' USDC',
        payTo,
        responseStatus: response200.status,
        weatherData: {
          city: weatherData.city,
          temperature: weatherData.temperature + '°C',
          condition: weatherData.condition,
        },
        gasUsed: receipt.gasUsed.toString(),
      },
    };
  }));

  // TEST_6_5: Verify premium content access after payment
  results.push(await runTest('TEST_6_5', 'Verify premium content access', 'Micropayments', async () => {
    const provider = getProvider();
    const signer = getSigner();

    // Get payment info for premium endpoint
    const response402 = await fetch(`${apiBaseUrl}/api/x402/premium`);
    const paymentInfo = await response402.json();

    if (response402.status !== 402) {
      throw new Error(`Expected 402, got ${response402.status}`);
    }

    // Convert to lowercase first to bypass bad checksum, then normalize
    const payTo = ethers.getAddress(paymentInfo.payTo.toLowerCase());
    const priceStr = paymentInfo.price;
    const priceWei = ethers.parseUnits(priceStr, 18);

    console.log(`     Premium price: ${priceStr} USDC to ${payTo}`);

    // Send payment
    console.log('     Sending premium payment...');
    const tx = await signer.sendTransaction({
      to: payTo,
      value: priceWei,
    });
    await waitForTx(provider, tx.hash);
    console.log(`     Payment TX: ${tx.hash}`);

    // Wait a bit for the TX to propagate to the RPC used by the API
    await sleep(3000);

    // Request premium content
    const response200 = await fetch(`${apiBaseUrl}/api/x402/premium`, {
      headers: {
        'X-Payment': JSON.stringify({ txHash: tx.hash }),
      },
    });

    const premiumData = await response200.json();

    if (response200.status !== 200) {
      throw new Error(`Expected 200 after payment, got ${response200.status}: ${JSON.stringify(premiumData)}`);
    }

    return {
      txHash: tx.hash,
      details: {
        endpoint: '/api/x402/premium',
        paymentTx: tx.hash,
        paidAmount: priceStr + ' USDC',
        responseStatus: response200.status,
        contentReceived: !!premiumData.success || !!premiumData.data,
        premiumFeatures: Object.keys(premiumData).slice(0, 5),
      },
    };
  }));

  return results;
}
