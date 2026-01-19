/**
 * ArcPay Streaming Payments Demo
 *
 * Demonstrates real-time streaming payments for:
 * - AI API calls (per-token billing)
 * - Video streaming (per-second billing)
 * - Usage-based services
 */

import { config } from 'dotenv';
config();

import { ArcPay, createPaymentStream, EventEmitter, EventType } from '../src';

const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const AI_SERVICE_WALLET = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

async function main() {
  console.log('═'.repeat(60));
  console.log('  ArcPay Streaming Payments Demo');
  console.log('═'.repeat(60));

  if (!PRIVATE_KEY) {
    console.error('Set PRIVATE_KEY in .env');
    process.exit(1);
  }

  const arc = await ArcPay.init({
    network: 'arc-testnet',
    privateKey: PRIVATE_KEY,
  });

  console.log('\n✓ Connected to Arc Testnet');

  // ═══════════════════════════════════════════════════════════
  // Scenario 1: Pay-per-token AI API Stream
  // ═══════════════════════════════════════════════════════════
  console.log('\n▸ Scenario 1: AI API Pay-per-Token');

  const aiStream = createPaymentStream({
    rpcUrl: 'https://rpc.testnet.arc.network',
    privateKey: PRIVATE_KEY,
    usdcAddress: '0x9746a23ad3f14ef05c4c1eb54e2f71da9f91b7f8',
    pricePerUnit: '0.0001', // $0.0001 per token
    unitName: 'token',
    maxTotalAmount: '1.00', // Max $1.00 per session
    recipient: AI_SERVICE_WALLET,
  });

  console.log('  Created stream: $0.0001/token, max $1.00');

  // Simulate AI response tokens
  const simulateAIResponse = async () => {
    const tokens = [
      'The', ' answer', ' to', ' your', ' question', ' is', ':',
      ' ArcPay', ' enables', ' real', '-time', ' micropayments',
      ' for', ' AI', ' services', '.', ' Each', ' token',
      ' costs', ' $0.0001', '.', ' [END]',
    ];

    console.log('\n  AI Response (with per-token billing):');
    process.stdout.write('  "');

    for (const token of tokens) {
      process.stdout.write(token);

      // Record usage for each token
      await aiStream.recordUsage(1);
      await new Promise((r) => setTimeout(r, 50));
    }

    console.log('"');

    const session = aiStream.getSession();
    console.log(`\n  Tokens used: ${session.totalUnits}`);
    console.log(`  Total cost: $${session.totalAmount}`);
  };

  await simulateAIResponse();

  // ═══════════════════════════════════════════════════════════
  // Scenario 2: Video Streaming Pay-per-Second
  // ═══════════════════════════════════════════════════════════
  console.log('\n▸ Scenario 2: Video Streaming Pay-per-Second');

  const videoStream = createPaymentStream({
    rpcUrl: 'https://rpc.testnet.arc.network',
    privateKey: PRIVATE_KEY,
    usdcAddress: '0x9746a23ad3f14ef05c4c1eb54e2f71da9f91b7f8',
    pricePerUnit: '0.001', // $0.001 per second
    unitName: 'second',
    maxTotalAmount: '5.00', // Max $5.00
    recipient: AI_SERVICE_WALLET,
  });

  console.log('  Created stream: $0.001/second ($3.60/hour)');

  // Simulate 5 seconds of video
  console.log('  Simulating 5 seconds of video streaming...');

  for (let i = 1; i <= 5; i++) {
    await videoStream.recordUsage(1);
    console.log(`    Second ${i}: $${(i * 0.001).toFixed(3)} accrued`);
    await new Promise((r) => setTimeout(r, 200));
  }

  const videoSession = videoStream.getSession();
  console.log(`\n  Video watched: ${videoSession.totalUnits} seconds`);
  console.log(`  Total cost: $${videoSession.totalAmount}`);

  // ═══════════════════════════════════════════════════════════
  // Scenario 3: Usage Meter with Auto-Settlement
  // ═══════════════════════════════════════════════════════════
  console.log('\n▸ Scenario 3: Usage Meter with Events');

  const emitter = new EventEmitter();

  emitter.on(EventType.STREAM_CLAIMED, (event) => {
    console.log(`  💰 Claimed: $${event.data?.claimedAmount} USDC`);
  });

  const meterStream = createPaymentStream({
    rpcUrl: 'https://rpc.testnet.arc.network',
    privateKey: PRIVATE_KEY,
    usdcAddress: '0x9746a23ad3f14ef05c4c1eb54e2f71da9f91b7f8',
    pricePerUnit: '0.01', // $0.01 per API call
    unitName: 'API call',
    maxTotalAmount: '10.00',
    recipient: AI_SERVICE_WALLET,
  });

  // Simulate burst of API calls
  console.log('  Simulating 10 API calls...');

  for (let i = 1; i <= 10; i++) {
    await meterStream.recordUsage(1);
    if (i % 5 === 0) {
      console.log(`    Batch ${i / 5}: 5 calls recorded`);
    }
  }

  const meterSession = meterStream.getSession();
  console.log(`\n  API calls: ${meterSession.totalUnits}`);
  console.log(`  Total cost: $${meterSession.totalAmount}`);

  // ═══════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('  Demo Complete!');
  console.log('═'.repeat(60));
  console.log('\nStreaming payments enable:');
  console.log('  • Pay-per-token for AI services');
  console.log('  • Pay-per-second for media streaming');
  console.log('  • Usage-based billing for APIs');
  console.log('  • Real-time cost tracking');
  console.log('  • Automatic settlement on-chain');
}

main().catch(console.error);
