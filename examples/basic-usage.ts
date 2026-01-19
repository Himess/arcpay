/**
 * ArcPay Basic Usage Example
 *
 * This example demonstrates basic SDK functionality:
 * - Initializing the client
 * - Checking balances
 * - Sending USDC
 */

import { ArcPay } from 'arcpay';

async function main() {
  // Initialize with read-only access
  const readOnlyArc = await ArcPay.init({
    network: 'arc-testnet',
  });

  // Check balance of any address
  const balance = await readOnlyArc.getBalance('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');
  console.log(`Balance: ${balance} USDC`);

  // Initialize with signer for transactions
  const arc = await ArcPay.init({
    network: 'arc-testnet',
    privateKey: process.env.PRIVATE_KEY,
  });

  // Check your own balance
  const myBalance = await arc.getBalance();
  console.log(`My balance: ${myBalance} USDC`);

  // Send USDC
  const result = await arc.sendUSDC(
    '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    '1.00'
  );

  if (result.success) {
    console.log(`Transaction successful!`);
    console.log(`Hash: ${result.txHash}`);
    console.log(`Explorer: ${result.explorerUrl}`);
  } else {
    console.error(`Transaction failed: ${result.error}`);
  }

  // Network info
  console.log(`\nNetwork: ${arc.network.name}`);
  console.log(`Chain ID: ${arc.network.chainId}`);
  console.log(`Faucet: ${arc.getFaucetUrl()}`);
}

main().catch(console.error);
