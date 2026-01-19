/**
 * ArcPay Micropayments Client Example
 *
 * This example demonstrates how to make paid requests
 * to paywalled API endpoints.
 *
 * Run: npx ts-node examples/micropayments-client.ts
 */

import { ArcPay } from 'arcpay';

const API_BASE = process.env.API_BASE || 'https://api.example.com';

async function main() {
  // Initialize with signer (required for payments)
  const arc = await ArcPay.init({
    network: 'arc-testnet',
    privateKey: process.env.PRIVATE_KEY,
  });

  console.log(`Wallet: ${arc.address}`);
  console.log(`Balance: ${await arc.getBalance()} USDC\n`);

  // Example 1: Simple paid GET request
  console.log('--- Example 1: Paid GET Request ---');
  try {
    const premiumData = await arc.micropayments.pay<{
      message: string;
      data: object;
    }>(`${API_BASE}/api/premium`);

    console.log('Premium data received:', premiumData);
  } catch (error) {
    console.error('Payment failed:', error);
  }

  // Example 2: Paid POST request
  console.log('\n--- Example 2: Paid POST Request ---');
  try {
    const result = await arc.micropayments.fetch(`${API_BASE}/api/generate`, {
      requestInit: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Write a haiku about blockchain' }),
      },
    });

    if (result.success && result.response) {
      const data = await result.response.json();
      console.log('Generation result:', data);
      console.log(`Payment tx: ${result.txHash}`);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }

  // Example 3: With max price limit
  console.log('\n--- Example 3: With Max Price Limit ---');
  try {
    const data = await arc.micropayments.pay(`${API_BASE}/api/expensive`, {
      maxPrice: '0.50', // Won't pay more than $0.50
    });
    console.log('Data:', data);
  } catch (error) {
    console.error('Price too high or request failed:', error);
  }

  // Example 4: Check balance after payments
  console.log('\n--- Final Balance ---');
  const finalBalance = await arc.getBalance();
  console.log(`Remaining balance: ${finalBalance} USDC`);
}

main().catch(console.error);
