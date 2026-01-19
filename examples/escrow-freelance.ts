/**
 * Escrow Freelance Example
 *
 * Demonstrates how to use escrow for freelance payments with
 * conditions, disputes, and release.
 *
 * Run: npx ts-node examples/escrow-freelance.ts
 */

import { createEscrowManager } from 'arcpay';
import 'dotenv/config';

async function main() {
  console.log('=== ArcPay Escrow Freelance Example ===\n');

  const escrow = createEscrowManager({
    privateKey: process.env.PRIVATE_KEY!,
  });

  const buyer = '0x...'; // Will be derived from private key
  const freelancer = '0x742d35Cc6634C0532925a3b844Bc9e7595f7ECEE'; // Example
  const arbiter = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199'; // Example

  // 1. Create escrow for a project
  console.log('--- Creating Escrow ---');
  const { id } = await escrow.createEscrow({
    depositor: buyer,
    beneficiary: freelancer,
    amount: '500',
    conditions: [
      {
        type: 'approval',
        params: { approver: buyer },
        isMet: false,
      },
    ],
    arbitrators: [arbiter],
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    description: 'Website redesign project',
  });

  console.log(`Escrow created: ${id}`);

  // 2. Fund the escrow
  console.log('\n--- Funding Escrow ---');
  await escrow.fundEscrow(id);
  console.log('Escrow funded with 500 USDC');

  // 3. Check escrow status
  console.log('\n--- Escrow Status ---');
  const escrowData = escrow.getEscrow(id);
  if (escrowData) {
    console.log(`ID: ${escrowData.id}`);
    console.log(`Amount: ${escrowData.amount} USDC`);
    console.log(`State: ${escrowData.state}`);
    console.log(`Beneficiary: ${escrowData.beneficiary}`);
    console.log(`Description: ${escrowData.description}`);
  }

  // 4. Simulate work completion - release payment
  console.log('\n--- Releasing Payment ---');
  console.log('(Simulating: Work completed, buyer approves)');

  // In real scenario, buyer would call this after reviewing work
  const releaseResult = await escrow.releaseEscrow(id);
  console.log(`Released! TX: ${releaseResult.txHash || 'local'}`);

  // 5. Check final status
  console.log('\n--- Final Status ---');
  const finalData = escrow.getEscrow(id);
  if (finalData) {
    console.log(`State: ${finalData.state}`);
    console.log('Freelancer received payment!');
  }

  // 6. Get stats
  console.log('\n--- Escrow Stats ---');
  const stats = await escrow.getStats();
  console.log(`Total escrows: ${stats.totalCount}`);
  console.log(`Active: ${stats.activeCount}`);
  console.log(`Total volume: ${stats.totalVolume} USDC`);

  console.log('\n=== Demo Complete ===');
}

main().catch(console.error);
