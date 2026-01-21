/**
 * Core Payment Tests
 * Tests: USDC balance, transfers, multi-recipient
 */

import { ethers } from 'ethers';
import { TestResult, runTest, formatUSDC, parseUSDC, waitForTx } from './types';
import { getTestContext, getProvider, getSigner, ERC20_ABI } from './config';

// Store for test state
let lastTxHash: string | undefined;

export async function runCorePaymentTests(): Promise<TestResult[]> {
  console.log('\n💰 Category 2: Core Payment Tests');
  console.log('─'.repeat(40));

  const results: TestResult[] = [];
  const ctx = getTestContext();
  const provider = getProvider();
  const signer = getSigner();

  // TEST_2_1: Get USDC Balance (native)
  results.push(await runTest('TEST_2_1', 'Get USDC Balance (native)', 'Core Payments', async () => {
    // On Arc, USDC is the native token (like ETH on Ethereum)
    const balance = await provider.getBalance(ctx.walletAddress);
    const formatted = formatUSDC(balance);
    console.log(`     Balance: ${formatted} USDC`);
    return { details: { balance: balance.toString(), formatted } };
  }));

  // TEST_2_2: Get EURC Balance (ERC-20)
  results.push(await runTest('TEST_2_2', 'Get EURC Balance (ERC-20)', 'Core Payments', async () => {
    const eurc = new ethers.Contract(ctx.contracts.eurc, ERC20_ABI, provider);
    const balance = await eurc.balanceOf(ctx.walletAddress);
    const decimals = await eurc.decimals();
    const formatted = ethers.formatUnits(balance, decimals);
    console.log(`     Balance: ${formatted} EURC`);
    return { details: { balance: balance.toString(), formatted, decimals } };
  }));

  // TEST_2_3: USDC Transfer (0.001 USDC)
  results.push(await runTest('TEST_2_3', 'USDC Transfer (0.001 USDC)', 'Core Payments', async () => {
    // Check balance first
    const balance = await provider.getBalance(ctx.walletAddress);
    const transferAmount = parseUSDC('0.001');

    if (balance < transferAmount + parseUSDC('0.001')) {
      throw new Error(`Insufficient balance: ${formatUSDC(balance)} USDC`);
    }

    // Send to Circle wallet (self-test)
    const recipient = ctx.circleWallet.address;

    const tx = await signer.sendTransaction({
      to: recipient,
      value: transferAmount,
    });

    const receipt = await waitForTx(provider, tx.hash);
    lastTxHash = tx.hash;

    return {
      txHash: tx.hash,
      details: {
        from: ctx.walletAddress,
        to: recipient,
        amount: '0.001 USDC',
        gasUsed: receipt.gasUsed.toString(),
      },
    };
  }));

  // TEST_2_4: Verify TX on Explorer
  results.push(await runTest('TEST_2_4', 'Verify TX on Explorer', 'Core Payments', async () => {
    if (!lastTxHash) {
      throw new Error('No previous transaction to verify');
    }

    const receipt = await provider.getTransactionReceipt(lastTxHash);
    if (!receipt) {
      throw new Error('Transaction not found');
    }

    if (receipt.status !== 1) {
      throw new Error('Transaction failed');
    }

    return {
      txHash: lastTxHash,
      details: {
        status: 'success',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      },
    };
  }));

  // TEST_2_5: Multi-recipient transfer (split)
  results.push(await runTest('TEST_2_5', 'Multi-recipient transfer (split)', 'Core Payments', async () => {
    const balance = await provider.getBalance(ctx.walletAddress);
    const transferAmount = parseUSDC('0.0005');

    if (balance < transferAmount * BigInt(2) + parseUSDC('0.002')) {
      throw new Error(`Insufficient balance for split transfer: ${formatUSDC(balance)} USDC`);
    }

    // Two recipients - send to two addresses
    const recipients = [
      ctx.circleWallet.address,
      '0x000000000000000000000000000000000000dEaD', // Burn address for test
    ];

    const txHashes: string[] = [];

    for (const recipient of recipients) {
      const tx = await signer.sendTransaction({
        to: recipient,
        value: transferAmount,
      });
      await waitForTx(provider, tx.hash);
      txHashes.push(tx.hash);
    }

    return {
      txHash: txHashes[0],
      details: {
        recipients,
        amountEach: '0.0005 USDC',
        totalSent: '0.001 USDC',
        transactions: txHashes,
      },
    };
  }));

  return results;
}
