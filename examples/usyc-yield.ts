/**
 * ArcPay USYC Yield Example
 *
 * This example demonstrates how to earn yield on idle USDC
 * using Circle's USYC token (backed by short-term US Treasuries).
 *
 * IMPORTANT: USYC requires your wallet to be on the allowlist.
 * Apply at: https://usyc.dev.hashnote.com/
 *
 * Run: npx ts-node examples/usyc-yield.ts
 */

import { ArcPay } from 'arcpay';

async function main() {
  // Initialize with signer
  const arc = await ArcPay.init({
    network: 'arc-testnet',
    privateKey: process.env.PRIVATE_KEY,
  });

  console.log(`Wallet: ${arc.address}`);
  console.log(`USDC Balance: ${await arc.getBalance()} USDC\n`);

  // Check if USYC is available on this network
  if (!arc.usyc.isAvailable()) {
    console.log('USYC is not available on this network');
    return;
  }

  const status = arc.usyc.getStatus();
  console.log('USYC Status:');
  console.log(`  Contract: ${status.contractAddress}`);
  console.log(`  Teller: ${status.tellerAddress}`);

  // Check allowlist status
  console.log('\n--- Checking Allowlist ---');
  const isAllowed = await arc.usyc.isAllowlisted();

  if (!isAllowed) {
    console.log('❌ Your wallet is NOT on the USYC allowlist.');
    console.log(`\nTo use USYC, apply for allowlist access at:`);
    console.log(arc.usyc.getAllowlistUrl());
    console.log('\nProcessing typically takes 24-48 hours.');
    return;
  }

  console.log('✅ Your wallet is on the allowlist!');

  // Check current USYC balance
  console.log('\n--- Current USYC Balance ---');
  const balance = await arc.usyc.getBalance();
  console.log(`USYC Balance: ${balance.usyc}`);
  console.log(`USDC Value: ${balance.usdcValue} USDC`);
  console.log(`Yield Earned: ${balance.yield} USDC`);
  console.log(`Exchange Rate: ${balance.exchangeRate}`);

  // Subscribe (deposit USDC to get USYC)
  console.log('\n--- Subscribing (USDC → USYC) ---');
  const subscribeAmount = '100'; // Subscribe 100 USDC

  const subscribeResult = await arc.usyc.subscribe(subscribeAmount, {
    minimumReceived: '99', // Slippage protection
  });

  if (subscribeResult.success) {
    console.log(`✅ Subscribed ${subscribeAmount} USDC`);
    console.log(`Received: ${subscribeResult.usycReceived} USYC`);
    console.log(`Tx: ${subscribeResult.explorerUrl}`);
  } else {
    console.log(`❌ Subscribe failed: ${subscribeResult.error}`);
  }

  // Check updated balance
  console.log('\n--- Updated Balance ---');
  const newBalance = await arc.usyc.getBalance();
  console.log(`USYC Balance: ${newBalance.usyc}`);
  console.log(`USDC Value: ${newBalance.usdcValue} USDC`);

  // Simulate waiting for yield...
  console.log('\n💰 Now earning yield on your USYC!');
  console.log('USYC accrues yield from US Treasury bills (~4-5% APY)');

  // Redeem (burn USYC to get USDC + yield)
  console.log('\n--- Redeeming (USYC → USDC) ---');
  const redeemAmount = newBalance.usyc; // Redeem all

  const redeemResult = await arc.usyc.redeem(redeemAmount, {
    minimumReceived: '99', // Slippage protection
    deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour deadline
  });

  if (redeemResult.success) {
    console.log(`✅ Redeemed ${redeemAmount} USYC`);
    console.log(`Received: ${redeemResult.usdcReceived} USDC`);
    console.log(`Tx: ${redeemResult.explorerUrl}`);
  } else {
    console.log(`❌ Redeem failed: ${redeemResult.error}`);
  }

  // Final balances
  console.log('\n--- Final Balances ---');
  console.log(`USDC: ${await arc.getBalance()} USDC`);
  const finalUsyc = await arc.usyc.getBalance();
  console.log(`USYC: ${finalUsyc.usyc}`);
}

main().catch(console.error);
