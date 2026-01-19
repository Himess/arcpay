/**
 * Payment Channels Example
 *
 * Demonstrates off-chain micropayments using payment channels.
 * Perfect for high-frequency, low-value transactions like API calls.
 *
 * Run: npx ts-node examples/payment-channels.ts
 */

import { createPaymentChannelManager } from 'arcpay';
import 'dotenv/config';

async function main() {
  console.log('=== ArcPay Payment Channels Example ===\n');

  const channels = createPaymentChannelManager({
    privateKey: process.env.PRIVATE_KEY!,
  });

  const apiProvider = '0x742d35Cc6634C0532925a3b844Bc9e7595f7ECEE'; // Example
  const initialDeposit = '10'; // $10 deposit

  // 1. Open a payment channel
  console.log('--- Opening Payment Channel ---');
  const channel = await channels.createChannel({
    recipient: apiProvider,
    deposit: initialDeposit,
  });

  console.log(`Channel opened: ${channel.id}`);
  console.log(`Recipient: ${channel.recipient}`);
  console.log(`Deposit: ${channel.deposit} USDC`);
  console.log(`State: ${channel.state}`);

  // 2. Make micropayments (instant, no gas!)
  console.log('\n--- Making Micropayments ---');
  const payments = [
    { amount: '0.001', description: 'API call #1' },
    { amount: '0.002', description: 'API call #2' },
    { amount: '0.0015', description: 'API call #3' },
    { amount: '0.003', description: 'API call #4' },
    { amount: '0.0005', description: 'API call #5' },
  ];

  for (const payment of payments) {
    const receipt = await channels.pay(channel.id, payment.amount);
    console.log(`${payment.description}: ${payment.amount} USDC - Receipt: ${receipt.signature.slice(0, 20)}...`);
  }

  // 3. Check channel state
  console.log('\n--- Channel State ---');
  const channelInfo = channels.getChannel(channel.id);
  if (channelInfo) {
    console.log(`Total spent: ${channelInfo.totalSpent} USDC`);
    console.log(`Remaining: ${(parseFloat(channelInfo.deposit) - parseFloat(channelInfo.totalSpent)).toFixed(6)} USDC`);
    console.log(`Payment count: ${channelInfo.paymentCount}`);
  }

  // 4. Simulate more API calls
  console.log('\n--- Simulating 100 API Calls ---');
  for (let i = 0; i < 100; i++) {
    await channels.pay(channel.id, '0.001');
  }
  console.log('Completed 100 micropayments instantly (no gas fees!)');

  // Check final state
  const finalInfo = channels.getChannel(channel.id);
  if (finalInfo) {
    console.log(`Total spent: ${finalInfo.totalSpent} USDC`);
    console.log(`Total payments: ${finalInfo.paymentCount}`);
  }

  // 5. Close and settle the channel
  console.log('\n--- Closing Channel ---');
  const settlement = await channels.closeChannel(channel.id);
  console.log('Channel closed and settled on-chain');
  console.log(`Settlement TX: ${settlement.txHash}`);

  // 6. Get all channels
  console.log('\n--- All Channels ---');
  const allChannels = channels.getAllChannels();
  for (const ch of allChannels) {
    console.log(`- ${ch.id}: ${ch.deposit} USDC to ${ch.recipient.slice(0, 10)}... (${ch.state})`);
  }

  // 7. Get stats
  console.log('\n--- Channel Stats ---');
  const stats = channels.getStats();
  console.log(`Total channels: ${stats.totalChannels}`);
  console.log(`Active: ${stats.activeChannels}`);
  console.log(`Total deposited: ${stats.totalDeposited} USDC`);
  console.log(`Total payments: ${stats.totalPayments}`);

  console.log('\n=== Demo Complete ===');
  console.log('\nKey Benefits:');
  console.log('- 100+ instant payments with a single on-chain transaction');
  console.log('- No gas fees for individual payments');
  console.log('- Perfect for API billing, gaming, IoT, etc.');
}

main().catch(console.error);
