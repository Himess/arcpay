/**
 * Basic Payment Example
 *
 * Demonstrates simple USDC transfers using ArcPay.
 *
 * Run: npx ts-node examples/basic-payment.ts
 */

import { configure, pay, balance } from 'arcpay';
import 'dotenv/config';

async function main() {
  console.log('=== ArcPay Basic Payment Example ===\n');

  // Configure ArcPay with your private key
  configure({
    privateKey: process.env.PRIVATE_KEY!,
    network: 'arc-testnet',
  });

  // Check balance
  console.log('Checking balance...');
  const { usdc, address } = await balance();
  console.log(`Address: ${address}`);
  console.log(`Balance: ${usdc} USDC\n`);

  // Send a payment
  const recipient = '0x742d35Cc6634C0532925a3b844Bc9e7595f7ECEE'; // Example address
  const amount = '1';

  console.log(`Sending ${amount} USDC to ${recipient}...`);
  const result = await pay(recipient, amount);

  console.log('Payment successful!');
  console.log(`Transaction hash: ${result.txHash}`);

  // Check updated balance
  const { usdc: newBalance } = await balance();
  console.log(`\nNew balance: ${newBalance} USDC`);
}

main().catch(console.error);
