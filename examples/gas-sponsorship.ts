/**
 * ArcPay Gas Sponsorship Example
 *
 * This example demonstrates how to sponsor gas fees for your users.
 * On Arc, USDC is the native gas token, so sponsorship means
 * paying USDC gas on behalf of users.
 *
 * Run: npx ts-node examples/gas-sponsorship.ts
 */

import { ArcPay } from 'arcpay';
import { encodeFunctionData } from 'viem';

// Example ERC20 ABI for demo
const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

async function main() {
  // Initialize as sponsor (needs funded wallet)
  const arc = await ArcPay.init({
    network: 'arc-testnet',
    privateKey: process.env.SPONSOR_PRIVATE_KEY,
  });

  console.log(`Sponsor wallet: ${arc.address}`);
  console.log(`Sponsor balance: ${await arc.getBalance()} USDC\n`);

  // Configure spending rules
  arc.paymaster.setRules({
    // Limit gas cost per transaction
    maxPerTransaction: '0.01', // Max 0.01 USDC (~$0.01)

    // Limit spending per user per day
    maxPerUserDaily: '1.00', // Max 1 USDC per user daily

    // Total daily budget for all users
    dailyBudget: '100.00', // 100 USDC total daily

    // Optional: Whitelist specific contracts
    // allowedContracts: ['0xContractAddress...'],

    // Optional: Whitelist specific methods
    // allowedMethods: ['0xa9059cbb'], // transfer method selector
  });

  console.log('Spending rules configured:');
  console.log(arc.paymaster.getRules());

  // Example: Sponsor a token transfer for a user
  const userAddress = '0x1234567890123456789012345678901234567890';
  const tokenContract = '0xTokenContractAddress';
  const recipient = '0xRecipientAddress';
  const amount = 1000000n; // 1 USDC (6 decimals)

  // Encode the function call
  const calldata = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [recipient, amount],
  });

  console.log('\n--- Sponsoring Transaction ---');
  console.log(`User: ${userAddress}`);
  console.log(`Contract: ${tokenContract}`);
  console.log(`Action: Transfer tokens`);

  // Sponsor the transaction
  const result = await arc.paymaster.sponsorTransaction({
    userAddress,
    to: tokenContract,
    data: calldata,
  });

  if (result.success) {
    console.log(`\n✅ Transaction sponsored!`);
    console.log(`Gas cost: ${result.sponsoredAmount} USDC`);
    console.log(`Tx hash: ${result.txHash}`);
    console.log(`Explorer: ${result.explorerUrl}`);
  } else {
    console.log(`\n❌ Sponsorship failed: ${result.error}`);
  }

  // Check stats
  console.log('\n--- Paymaster Stats ---');
  const stats = arc.paymaster.getStats();
  console.log(`Total sponsored: ${stats.totalSponsored} USDC`);
  console.log(`Transactions: ${stats.transactionCount}`);
  console.log(`Unique users: ${stats.uniqueUsers}`);

  // Check user-specific stats
  const userStats = arc.paymaster.getUserStats(userAddress);
  console.log(`\nUser ${userAddress}:`);
  console.log(`Daily spent: ${userStats.dailySpent} USDC`);

  // Reset daily limits (for testing)
  // arc.paymaster.resetDailyLimits();
}

main().catch(console.error);
