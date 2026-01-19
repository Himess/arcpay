/**
 * Streaming Salary Example
 *
 * Demonstrates real-time payment streaming for employee salaries.
 * Funds flow continuously from employer to employee every second.
 *
 * Run: npx ts-node examples/streaming-salary.ts
 */

import { createStreamManager } from 'arcpay';
import 'dotenv/config';

async function main() {
  console.log('=== ArcPay Streaming Salary Example ===\n');

  const streams = createStreamManager({
    privateKey: process.env.PRIVATE_KEY!,
  });

  const employee = '0x742d35Cc6634C0532925a3b844Bc9e7595f7ECEE'; // Example
  const monthlySalary = '5000'; // $5000/month
  const durationSeconds = 30 * 24 * 60 * 60; // 30 days

  // 1. Create salary stream
  console.log('--- Creating Salary Stream ---');
  const stream = await streams.createStream({
    recipient: employee,
    totalAmount: monthlySalary,
    duration: durationSeconds,
  });

  console.log(`Stream created: ${stream.id}`);
  console.log(`Recipient: ${stream.recipient}`);
  console.log(`Total amount: ${stream.totalAmount} USDC`);
  console.log(`Rate: ${stream.ratePerSecond} USDC/second`);
  console.log(`Duration: ${durationSeconds / 86400} days`);
  console.log(`Start: ${new Date(stream.startTime * 1000).toISOString()}`);
  console.log(`End: ${new Date(stream.endTime * 1000).toISOString()}`);

  // 2. Wait a bit and check claimable amount
  console.log('\n--- Simulating Time Passing ---');
  console.log('Waiting 5 seconds...');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // 3. Check claimable
  console.log('\n--- Checking Claimable Amount ---');
  const claimable = await streams.getClaimable(stream.id);
  console.log(`Progress: ${claimable.progress.toFixed(6)}%`);
  console.log(`Claimable: ${claimable.claimable} USDC`);
  console.log(`Already claimed: ${claimable.totalClaimed} USDC`);
  console.log(`Remaining: ${claimable.remaining} USDC`);

  // 4. Employee claims their earnings
  console.log('\n--- Claiming Earnings ---');
  const claim = await streams.claim(stream.id);
  console.log(`Claimed: ${claim.amountClaimed} USDC`);
  console.log(`Transaction: ${claim.txHash}`);

  // 5. Check updated status
  console.log('\n--- Updated Status ---');
  const updated = await streams.getClaimable(stream.id);
  console.log(`Total claimed: ${updated.totalClaimed} USDC`);
  console.log(`Claimable now: ${updated.claimable} USDC`);

  // 6. Get all streams
  console.log('\n--- All Streams ---');
  const allStreams = streams.getAllStreams();
  for (const s of allStreams) {
    console.log(`- ${s.id}: ${s.totalAmount} USDC to ${s.recipient.slice(0, 10)}... (${s.state})`);
  }

  // 7. Get stats
  console.log('\n--- Stream Stats ---');
  const stats = await streams.getStats();
  console.log(`Total streams: ${stats.totalCreated}`);
  console.log(`Active: ${stats.activeCount}`);
  console.log(`Total volume: ${stats.totalVolume} USDC`);
  console.log(`Total claimed: ${stats.totalClaimed} USDC`);

  console.log('\n=== Demo Complete ===');
  console.log('\nNote: In production, the stream would continue for 30 days.');
  console.log('Employee can claim their earnings at any time.');
}

main().catch(console.error);
