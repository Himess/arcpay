/**
 * Private Payment Example
 *
 * Demonstrates private payments using stealth addresses.
 * Recipient addresses are hidden on-chain for privacy.
 *
 * Run: npx ts-node examples/private-payment.ts
 */

import { createPrivacyModule, getStealthAddress, payPrivate, configure } from 'arcpay';
import 'dotenv/config';

async function main() {
  console.log('=== ArcPay Private Payment Example ===\n');

  // Configure
  configure({
    privateKey: process.env.PRIVATE_KEY!,
  });

  // 1. Get stealth meta-address
  console.log('--- Getting Stealth Address ---');
  const stealthAddr = await getStealthAddress();
  console.log('Your stealth meta-address (share this to receive private payments):');
  console.log(stealthAddr);

  // 2. Create privacy module for advanced operations
  const privacy = createPrivacyModule({
    privateKey: process.env.PRIVATE_KEY!,
  });

  // 3. Send a private payment
  console.log('\n--- Sending Private Payment ---');
  const recipient = stealthAddr; // Sending to ourselves for demo
  const amount = '10';

  console.log(`Sending ${amount} USDC privately...`);
  const result = await payPrivate(recipient, amount);

  console.log('Private payment sent!');
  console.log(`Transaction hash: ${result.txHash}`);
  if (result.stealthAddress) {
    console.log(`One-time stealth address: ${result.stealthAddress}`);
  }

  // 4. Scan for incoming private payments
  console.log('\n--- Scanning for Private Payments ---');
  const scanResult = await privacy.scanAnnouncements();

  console.log(`Found ${scanResult.payments.length} private payment(s)`);
  for (const payment of scanResult.payments) {
    console.log(`- Amount: ${payment.amount} USDC`);
    console.log(`  Time: ${new Date(payment.timestamp).toISOString()}`);
    console.log(`  Claimed: ${payment.claimed}`);
  }

  // 5. Claim unclaimed payments
  console.log('\n--- Claiming Private Payments ---');
  for (const payment of scanResult.payments) {
    if (!payment.claimed) {
      console.log(`Claiming ${payment.amount} USDC...`);
      const claimResult = await privacy.claimPayment(payment);
      console.log(`Claimed! TX: ${claimResult.txHash || 'local'}`);
    }
  }

  console.log('\n=== Demo Complete ===');
  console.log('\nNote: Private payments use stealth addresses (EIP-5564).');
  console.log('The recipient address on-chain is a one-time address that');
  console.log('only the recipient can derive and spend from.');
}

main().catch(console.error);
