/**
 * Streams Tests
 * Tests: Create stream, get details, claim, cancel
 */

import { ethers } from 'ethers';
import { TestResult, runTest, formatUSDC, parseUSDC, waitForTx, sleep } from './types';
import { getTestContext, getProvider, getSigner, STREAM_ABI, waitForCircleTransaction } from './config';

// Store for test state
let createdStreamId: string | undefined;

export async function runStreamTests(): Promise<TestResult[]> {
  console.log('\n🌊 Category 4: Stream Tests');
  console.log('─'.repeat(40));

  const results: TestResult[] = [];
  const ctx = getTestContext();
  const provider = getProvider();
  const signer = getSigner();

  const streamContract = new ethers.Contract(ctx.contracts.streamPayment, STREAM_ABI, signer);

  // TEST_4_1: Create Stream (0.01 USDC, 60 seconds)
  results.push(await runTest('TEST_4_1', 'Create Stream (0.01 USDC, 60 seconds)', 'Streams', async () => {
    const balance = await provider.getBalance(ctx.walletAddress);
    const streamAmount = parseUSDC('0.01');

    if (balance < streamAmount + parseUSDC('0.01')) {
      throw new Error(`Insufficient balance: ${formatUSDC(balance)} USDC`);
    }

    // Recipient is Circle wallet
    const recipient = ctx.circleWallet.address;
    const duration = 60; // 60 seconds

    const tx = await streamContract.createStream(recipient, streamAmount, duration, {
      value: streamAmount,
    });

    const receipt = await waitForTx(provider, tx.hash);

    // Get stream ID from event
    const streamCreatedEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = streamContract.interface.parseLog(log);
        return parsed?.name === 'StreamCreated';
      } catch {
        return false;
      }
    });

    if (streamCreatedEvent) {
      const parsed = streamContract.interface.parseLog(streamCreatedEvent);
      createdStreamId = parsed?.args[0];
      console.log(`     Stream ID: ${createdStreamId?.slice(0, 18)}...`);
    }

    return {
      txHash: tx.hash,
      details: {
        streamId: createdStreamId?.slice(0, 18) + '...',
        recipient,
        totalAmount: '0.01 USDC',
        duration: '60 seconds',
      },
    };
  }));

  // TEST_4_2: Get Stream Details
  results.push(await runTest('TEST_4_2', 'Get Stream Details', 'Streams', async () => {
    if (!createdStreamId) {
      throw new Error('No stream created in previous test');
    }

    const stream = await streamContract.getStream(createdStreamId);

    // Handle both named and indexed access
    // Tuple structure (no token field): (id, sender, recipient, totalAmount, claimedAmount, ratePerSecond, startTime, endTime, pausedAt, pausedDuration, state)
    const streamData = {
      id: stream.id || stream[0],
      sender: stream.sender || stream[1],
      recipient: stream.recipient || stream[2],
      totalAmount: stream.totalAmount || stream[3],
      claimedAmount: stream.claimedAmount || stream[4],
      ratePerSecond: stream.ratePerSecond || stream[5],
      startTime: stream.startTime || stream[6],
      endTime: stream.endTime || stream[7],
      pausedAt: stream.pausedAt || stream[8],
      pausedDuration: stream.pausedDuration || stream[9],
      state: stream.state !== undefined ? stream.state : stream[10],
    };

    const stateNames = ['Active', 'Paused', 'Completed', 'Cancelled'];
    const stateNum = Number(streamData.state);

    return {
      details: {
        streamId: createdStreamId.slice(0, 18) + '...',
        sender: streamData.sender,
        recipient: streamData.recipient,
        totalAmount: formatUSDC(BigInt(streamData.totalAmount)) + ' USDC',
        claimedAmount: formatUSDC(BigInt(streamData.claimedAmount)) + ' USDC',
        ratePerSecond: formatUSDC(BigInt(streamData.ratePerSecond)) + ' USDC/s',
        startTime: new Date(Number(streamData.startTime) * 1000).toISOString(),
        endTime: new Date(Number(streamData.endTime) * 1000).toISOString(),
        state: stateNames[stateNum] || `State(${stateNum})`,
      },
    };
  }));

  // TEST_4_3: Get My Streams (as sender)
  results.push(await runTest('TEST_4_3', 'Get My Streams (as sender)', 'Streams', async () => {
    const streamIds = await streamContract.getSenderStreams(ctx.walletAddress);

    return {
      details: {
        sender: ctx.walletAddress,
        streamCount: streamIds.length,
        streamIds: streamIds.slice(0, 5).map((id: string) => id.slice(0, 18) + '...'),
      },
    };
  }));

  // TEST_4_4: Get Streams (as recipient)
  results.push(await runTest('TEST_4_4', 'Get Streams (as recipient)', 'Streams', async () => {
    const streamIds = await streamContract.getRecipientStreams(ctx.circleWallet.address);

    return {
      details: {
        recipient: ctx.circleWallet.address,
        streamCount: streamIds.length,
        streamIds: streamIds.slice(0, 5).map((id: string) => id.slice(0, 18) + '...'),
      },
    };
  }));

  // TEST_4_5: Get Claimable Amount
  results.push(await runTest('TEST_4_5', 'Get Claimable Amount', 'Streams', async () => {
    if (!createdStreamId) {
      throw new Error('No stream created to check');
    }

    // Wait a bit for some amount to become claimable
    console.log('     Waiting 10 seconds for stream to accumulate...');
    await sleep(10000);

    const claimable = await streamContract.getClaimableAmount(createdStreamId);
    console.log(`     Claimable: ${formatUSDC(claimable)} USDC`);

    return {
      details: {
        streamId: createdStreamId.slice(0, 18) + '...',
        claimableAmount: formatUSDC(claimable) + ' USDC',
      },
    };
  }));

  // TEST_4_6: Claim Stream via Circle Wallet (GASLESS - REAL ONCHAIN TX)
  results.push(await runTest('TEST_4_6', 'Claim Stream (Circle Wallet Gasless)', 'Streams', async () => {
    // Use the stream created in TEST_4_1 where Circle wallet is the recipient
    // Circle wallet will claim via gasless API
    const apiBaseUrl = 'https://website-beige-six-15.vercel.app';

    if (!createdStreamId) {
      throw new Error('No stream created in TEST_4_1');
    }

    // Check claimable amount
    const claimable = await streamContract.getClaimableAmount(createdStreamId);
    console.log(`     Stream ${createdStreamId.slice(0, 18)}... has ${formatUSDC(claimable)} USDC claimable`);

    if (claimable === BigInt(0)) {
      throw new Error('No claimable amount - wait for stream to accumulate');
    }

    // Encode claim function call for Circle wallet
    const claimCallData = streamContract.interface.encodeFunctionData('claim', [createdStreamId]);

    console.log('     Claiming via Circle Wallet (gasless)...');

    // Call Circle gasless API to execute claim
    const response = await fetch(`${apiBaseUrl}/api/circle/gasless`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'contractExecution',
        contractAddress: ctx.contracts.streamPayment,
        callData: claimCallData,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Claim failed');
    }

    // Wait for TX to complete
    let txHash = result.txHash;

    if (!txHash && result.transactionId) {
      console.log('     Waiting for transaction to complete...');
      const txResult = await waitForCircleTransaction(result.transactionId, apiBaseUrl);
      txHash = txResult.txHash;
    }

    console.log(`     ✅ Stream claimed! TX: ${txHash}`);

    return {
      txHash,
      details: {
        streamId: createdStreamId.slice(0, 18) + '...',
        claimedAmount: formatUSDC(claimable) + ' USDC',
        claimedBy: ctx.circleWallet.address,
        gasSponsored: true,
        action: 'claimed',
      },
    };
  }));

  // TEST_4_7: Cancel Stream
  results.push(await runTest('TEST_4_7', 'Cancel Stream', 'Streams', async () => {
    // Create a new stream specifically to cancel
    const amount = parseUSDC('0.005');
    const recipient = ctx.circleWallet.address;

    const tx1 = await streamContract.createStream(recipient, amount, 120, {
      value: amount,
    });
    const receipt1 = await waitForTx(provider, tx1.hash);

    // Get stream ID
    const event = receipt1.logs.find((log: any) => {
      try {
        const parsed = streamContract.interface.parseLog(log);
        return parsed?.name === 'StreamCreated';
      } catch {
        return false;
      }
    });

    if (!event) {
      throw new Error('Failed to create stream for cancellation');
    }

    const parsed = streamContract.interface.parseLog(event);
    const streamIdToCancel = parsed?.args[0];

    // Cancel immediately
    const tx2 = await streamContract.cancelStream(streamIdToCancel);
    const receipt2 = await waitForTx(provider, tx2.hash);

    return {
      txHash: tx2.hash,
      details: {
        streamId: streamIdToCancel.slice(0, 18) + '...',
        action: 'cancelled',
        gasUsed: receipt2.gasUsed.toString(),
      },
    };
  }));

  return results;
}
