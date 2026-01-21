/**
 * Escrow Tests
 * Tests: Create escrow, get details, release, verify balances
 */

import { ethers } from 'ethers';
import { TestResult, runTest, formatUSDC, parseUSDC, waitForTx, sleep } from './types';
import { getTestContext, getProvider, getSigner, ESCROW_ABI, waitForCircleTransaction } from './config';

// Store for test state
let createdEscrowId: string | undefined;

export async function runEscrowTests(): Promise<TestResult[]> {
  console.log('\n🔒 Category 3: Escrow Tests');
  console.log('─'.repeat(40));

  const results: TestResult[] = [];
  const ctx = getTestContext();
  const provider = getProvider();
  const signer = getSigner();

  const escrowContract = new ethers.Contract(ctx.contracts.escrow, ESCROW_ABI, signer);

  // TEST_3_1: Create Escrow (0.01 USDC)
  results.push(await runTest('TEST_3_1', 'Create Escrow (0.01 USDC)', 'Escrow', async () => {
    const balance = await provider.getBalance(ctx.walletAddress);
    const escrowAmount = parseUSDC('0.01');

    if (balance < escrowAmount + parseUSDC('0.01')) {
      throw new Error(`Insufficient balance: ${formatUSDC(balance)} USDC`);
    }

    // Beneficiary is Circle wallet, arbiter is our wallet
    const beneficiary = ctx.circleWallet.address;
    const arbiter = ctx.walletAddress;
    // Expires in 1 hour
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const conditionHash = 'test-condition';

    const tx = await escrowContract.createAndFundEscrow(
      beneficiary,
      arbiter,
      escrowAmount,
      expiresAt,
      conditionHash,
      { value: escrowAmount }
    );

    const receipt = await waitForTx(provider, tx.hash);

    // Get escrow ID from event
    const escrowCreatedEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = escrowContract.interface.parseLog(log);
        return parsed?.name === 'EscrowCreated';
      } catch {
        return false;
      }
    });

    if (escrowCreatedEvent) {
      const parsed = escrowContract.interface.parseLog(escrowCreatedEvent);
      createdEscrowId = parsed?.args[0];
      console.log(`     Escrow ID: ${createdEscrowId}`);
    }

    return {
      txHash: tx.hash,
      details: {
        escrowId: createdEscrowId,
        beneficiary,
        arbiter,
        amount: '0.01 USDC',
        expiresAt: new Date(expiresAt * 1000).toISOString(),
      },
    };
  }));

  // TEST_3_2: Get Escrow Details
  results.push(await runTest('TEST_3_2', 'Get Escrow Details', 'Escrow', async () => {
    if (!createdEscrowId) {
      throw new Error('No escrow created in previous test');
    }

    const escrow = await escrowContract.getEscrow(createdEscrowId);

    // Handle both named property access and array index access
    // Tuple (no token field): (id, depositor, beneficiary, arbiter, amount, fundedAt, expiresAt, state, conditionHash, releasedAmount, refundedAmount)
    const escrowData = {
      id: escrow.id || escrow[0],
      depositor: escrow.depositor || escrow[1],
      beneficiary: escrow.beneficiary || escrow[2],
      arbiter: escrow.arbiter || escrow[3],
      amount: escrow.amount || escrow[4],
      fundedAt: escrow.fundedAt || escrow[5],
      expiresAt: escrow.expiresAt || escrow[6],
      state: escrow.state !== undefined ? escrow.state : escrow[7],
    };

    return {
      details: {
        escrowId: createdEscrowId.slice(0, 18) + '...',
        depositor: escrowData.depositor,
        beneficiary: escrowData.beneficiary,
        arbiter: escrowData.arbiter,
        amount: formatUSDC(BigInt(escrowData.amount)) + ' USDC',
        state: ['Created', 'Funded', 'Released', 'Refunded', 'Cancelled'][Number(escrowData.state)] || escrowData.state?.toString(),
        fundedAt: Number(escrowData.fundedAt) > 0 ? new Date(Number(escrowData.fundedAt) * 1000).toISOString() : 'not funded',
      },
    };
  }));

  // TEST_3_3: Get My Escrows (as depositor)
  results.push(await runTest('TEST_3_3', 'Get My Escrows (as user)', 'Escrow', async () => {
    const escrowIds = await escrowContract.getUserEscrows(ctx.walletAddress);

    return {
      details: {
        user: ctx.walletAddress,
        escrowCount: escrowIds.length,
        escrowIds: escrowIds.slice(0, 5).map((id: string) => id.slice(0, 18) + '...'),
      },
    };
  }));

  // TEST_3_4: Get Escrows (as beneficiary)
  results.push(await runTest('TEST_3_4', 'Get Escrows (as beneficiary)', 'Escrow', async () => {
    const escrowIds = await escrowContract.getUserEscrows(ctx.circleWallet.address);

    return {
      details: {
        beneficiary: ctx.circleWallet.address,
        escrowCount: escrowIds.length,
        escrowIds: escrowIds.slice(0, 5).map((id: string) => id.slice(0, 18) + '...'),
      },
    };
  }));

  // TEST_3_5: Release Escrow
  results.push(await runTest('TEST_3_5', 'Release Escrow', 'Escrow', async () => {
    if (!createdEscrowId) {
      throw new Error('No escrow created to release');
    }

    // As arbiter, we can release the escrow
    const tx = await escrowContract.releaseEscrow(createdEscrowId);
    const receipt = await waitForTx(provider, tx.hash);

    return {
      txHash: tx.hash,
      details: {
        escrowId: createdEscrowId,
        action: 'released',
        gasUsed: receipt.gasUsed.toString(),
      },
    };
  }));

  // TEST_3_6: Verify Final Balances
  results.push(await runTest('TEST_3_6', 'Verify Final Balances', 'Escrow', async () => {
    if (!createdEscrowId) {
      throw new Error('No escrow to verify');
    }

    // Get beneficiary balance directly from provider
    const beneficiaryBalance = await provider.getBalance(ctx.circleWallet.address);

    // Get escrow state with proper tuple handling
    const escrow = await escrowContract.getEscrow(createdEscrowId);

    // Handle both named and indexed access
    // Tuple (no token field): (id, depositor, beneficiary, arbiter, amount, fundedAt, expiresAt, state, conditionHash, releasedAmount, refundedAmount)
    const stateNum = escrow.state !== undefined ? Number(escrow.state) : Number(escrow[7]);
    const releasedAmt = escrow.releasedAmount || escrow[9] || BigInt(0);
    const amount = escrow.amount || escrow[4] || BigInt(0);

    const stateNames = ['Created', 'Funded', 'Released', 'Refunded', 'Cancelled'];
    const escrowState = stateNames[stateNum] || `State(${stateNum})`;

    return {
      details: {
        escrowId: createdEscrowId.slice(0, 18) + '...',
        escrowState,
        originalAmount: formatUSDC(BigInt(amount)) + ' USDC',
        releasedAmount: formatUSDC(BigInt(releasedAmt)) + ' USDC',
        beneficiaryBalance: formatUSDC(beneficiaryBalance) + ' USDC',
        verified: escrowState === 'Released',
      },
    };
  }));

  // TEST_3_7: Gasless Escrow Release via Circle Wallet
  results.push(await runTest('TEST_3_7', 'Gasless Escrow Release (Circle Wallet)', 'Escrow', async () => {
    const apiBaseUrl = 'https://website-beige-six-15.vercel.app';

    // Create a new escrow with Circle wallet as ARBITER (so Circle can release)
    const escrowAmount = parseUSDC('0.005');
    const beneficiary = ctx.walletAddress; // EOA receives funds
    const arbiter = ctx.circleWallet.address; // Circle wallet is arbiter
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;

    console.log('     Creating escrow with Circle wallet as arbiter...');

    const createTx = await escrowContract.createAndFundEscrow(
      beneficiary,
      arbiter,
      escrowAmount,
      expiresAt,
      'gasless-release-test',
      { value: escrowAmount }
    );
    const createReceipt = await waitForTx(provider, createTx.hash);

    // Get escrow ID from event
    const escrowEvent = createReceipt.logs.find((log: any) => {
      try {
        const parsed = escrowContract.interface.parseLog(log);
        return parsed?.name === 'EscrowCreated';
      } catch {
        return false;
      }
    });

    if (!escrowEvent) {
      throw new Error('Failed to create escrow');
    }

    const parsed = escrowContract.interface.parseLog(escrowEvent);
    const gaslessEscrowId = parsed?.args[0];
    console.log(`     Escrow created: ${gaslessEscrowId.slice(0, 18)}...`);
    console.log(`     Create TX: ${createTx.hash}`);

    // Now release via Circle wallet (gasless)
    const releaseCallData = escrowContract.interface.encodeFunctionData('releaseEscrow', [gaslessEscrowId]);

    console.log('     Releasing via Circle Wallet (gasless)...');

    const response = await fetch(`${apiBaseUrl}/api/circle/gasless`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'contractExecution',
        contractAddress: ctx.contracts.escrow,
        callData: releaseCallData,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Gasless release failed');
    }

    let txHash = result.txHash;
    if (!txHash && result.transactionId) {
      console.log('     Waiting for release TX...');
      const txResult = await waitForCircleTransaction(result.transactionId, apiBaseUrl);
      txHash = txResult.txHash;
    }

    console.log(`     ✅ Gasless release complete! TX: ${txHash}`);

    return {
      txHash,
      details: {
        escrowId: gaslessEscrowId.slice(0, 18) + '...',
        createTxHash: createTx.hash,
        releaseTxHash: txHash,
        arbiter: ctx.circleWallet.address,
        beneficiary: ctx.walletAddress,
        amount: '0.005 USDC',
        gasSponsored: true,
      },
    };
  }));

  return results;
}
