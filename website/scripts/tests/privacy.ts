/**
 * Privacy / Stealth Address Tests
 * Tests: Generate meta address, register, check status, send private payment
 */

import { ethers } from 'ethers';
import { randomBytes } from 'crypto';
import * as secp from '@noble/secp256k1';
import { TestResult, runTest, formatUSDC, parseUSDC, waitForTx } from './types';
import { getTestContext, getProvider, getSigner, STEALTH_ABI } from './config';

// Helper to generate random private key
function randomPrivateKey(): Uint8Array {
  return new Uint8Array(randomBytes(32));
}

// Store for test state
let spendingPubKey: Uint8Array | undefined;
let viewingPubKey: Uint8Array | undefined;

export async function runPrivacyTests(): Promise<TestResult[]> {
  console.log('\n🕵️ Category 5: Privacy / Stealth Tests');
  console.log('─'.repeat(40));

  const results: TestResult[] = [];
  const ctx = getTestContext();
  const provider = getProvider();
  const signer = getSigner();

  const stealthContract = new ethers.Contract(ctx.contracts.stealthRegistry, STEALTH_ABI, signer);

  // TEST_5_1: Generate Stealth Meta Address
  results.push(await runTest('TEST_5_1', 'Generate Stealth Meta Address', 'Privacy', async () => {
    // Generate a spending key and viewing key pair
    const spendingPrivKey = randomPrivateKey();
    const viewingPrivKey = randomPrivateKey();

    spendingPubKey = secp.getPublicKey(spendingPrivKey, true);
    viewingPubKey = secp.getPublicKey(viewingPrivKey, true);

    console.log(`     Spending PubKey: 0x${Buffer.from(spendingPubKey).toString('hex').slice(0, 20)}...`);
    console.log(`     Viewing PubKey: 0x${Buffer.from(viewingPubKey).toString('hex').slice(0, 20)}...`);

    return {
      details: {
        spendingPubKeyLength: spendingPubKey.length,
        viewingPubKeyLength: viewingPubKey.length,
      },
    };
  }));

  // TEST_5_2: Register Meta Address on Contract
  results.push(await runTest('TEST_5_2', 'Register Meta Address on Contract', 'Privacy', async () => {
    if (!spendingPubKey || !viewingPubKey) {
      throw new Error('No meta address generated');
    }

    // Check if already registered
    const isRegistered = await stealthContract.isRegistered(ctx.walletAddress);
    if (isRegistered) {
      console.log('     Already registered');
      return {
        details: {
          registrant: ctx.walletAddress,
          alreadyRegistered: true,
        },
      };
    }

    const tx = await stealthContract.registerMetaAddress(
      '0x' + Buffer.from(spendingPubKey).toString('hex'),
      '0x' + Buffer.from(viewingPubKey).toString('hex')
    );
    const receipt = await waitForTx(provider, tx.hash);

    return {
      txHash: tx.hash,
      details: {
        registrant: ctx.walletAddress,
        gasUsed: receipt.gasUsed.toString(),
      },
    };
  }));

  // TEST_5_3: Check Registration Status
  results.push(await runTest('TEST_5_3', 'Check Registration Status', 'Privacy', async () => {
    const isRegistered = await stealthContract.isRegistered(ctx.walletAddress);

    return {
      details: {
        address: ctx.walletAddress,
        isRegistered,
      },
    };
  }));

  // TEST_5_4: Get Registered Meta Address
  results.push(await runTest('TEST_5_4', 'Get Registered Meta Address', 'Privacy', async () => {
    const metaAddress = await stealthContract.getMetaAddress(ctx.walletAddress);

    return {
      details: {
        address: ctx.walletAddress,
        spendingPubKeyLength: metaAddress.spendingPubKey?.length || 0,
        viewingPubKeyLength: metaAddress.viewingPubKey?.length || 0,
        registeredAt: metaAddress.registeredAt > 0 ? new Date(Number(metaAddress.registeredAt) * 1000).toISOString() : 'not registered',
        active: metaAddress.active,
      },
    };
  }));

  // TEST_5_5: Generate Stealth Address for Recipient
  results.push(await runTest('TEST_5_5', 'Generate Stealth Address for Recipient', 'Privacy', async () => {
    // Get recipient's meta address (use our own for testing)
    const metaAddress = await stealthContract.getMetaAddress(ctx.walletAddress);

    if (!metaAddress.active) {
      throw new Error('Recipient meta address not active');
    }

    const recipientSpendingPubKey = ethers.getBytes(metaAddress.spendingPubKey);
    const recipientViewingPubKey = ethers.getBytes(metaAddress.viewingPubKey);

    // Generate ephemeral keypair
    const ephemeralPrivKey = randomPrivateKey();
    const ephemeralPubKey = secp.getPublicKey(ephemeralPrivKey, true);

    // Compute shared secret: ephemeral_priv * viewing_pub
    const sharedSecret = secp.getSharedSecret(ephemeralPrivKey, recipientViewingPubKey, true);

    // Derive stealth public key using hash of shared secret
    const hashOfSecret = ethers.keccak256(sharedSecret);
    const hashAsPrivKey = ethers.getBytes(hashOfSecret).slice(0, 32);

    // Add to spending key to get stealth pubkey
    // Convert Uint8Array to hex string for Point.fromHex (noble-secp256k1 v3)
    const spendingPubKeyHex = Buffer.from(recipientSpendingPubKey).toString('hex');
    const spendingPoint = secp.Point.fromHex(spendingPubKeyHex);
    // Derive point from hash - multiply base point by hash scalar
    const hashPoint = secp.Point.BASE.multiply(secp.etc.bytesToNumberBE(hashAsPrivKey));
    const stealthPoint = spendingPoint.add(hashPoint);
    const stealthPubKey = stealthPoint.toBytes(true);

    // Convert to Ethereum address - get uncompressed pubkey
    const uncompressedPubKey = stealthPoint.toBytes(false);
    const stealthAddress = ethers.getAddress(
      '0x' + ethers.keccak256(uncompressedPubKey.slice(1)).slice(-40)
    );

    console.log(`     Stealth Address: ${stealthAddress}`);

    return {
      details: {
        recipientAddress: ctx.walletAddress,
        stealthAddress,
        ephemeralPubKey: '0x' + Buffer.from(ephemeralPubKey).toString('hex').slice(0, 20) + '...',
      },
    };
  }));

  // TEST_5_6: Send Private Payment (stealth transfer)
  results.push(await runTest('TEST_5_6', 'Send Private Payment (stealth transfer)', 'Privacy', async () => {
    // Generate a stealth address for the payment
    const ephemeralPrivKey = randomPrivateKey();
    const ephemeralPubKey = secp.getPublicKey(ephemeralPrivKey, true);

    // Generate a random stealth address for testing
    const randomKey = randomPrivateKey();
    const randomPubKey = secp.getPublicKey(randomKey, false);
    const stealthAddress = ethers.getAddress(
      '0x' + ethers.keccak256(randomPubKey.slice(1)).slice(-40)
    );

    const balance = await provider.getBalance(ctx.walletAddress);
    const transferAmount = parseUSDC('0.001');

    if (balance < transferAmount + parseUSDC('0.001')) {
      throw new Error(`Insufficient balance: ${formatUSDC(balance)} USDC`);
    }

    // Use the contract's sendStealthPayment function
    const tx = await stealthContract.sendStealthPayment(
      stealthAddress,
      '0x' + Buffer.from(ephemeralPubKey).toString('hex'),
      '0x', // Empty memo
      { value: transferAmount }
    );

    const receipt = await waitForTx(provider, tx.hash);

    return {
      txHash: tx.hash,
      details: {
        from: ctx.walletAddress,
        to: stealthAddress,
        amount: '0.001 USDC',
        gasUsed: receipt.gasUsed.toString(),
      },
    };
  }));

  return results;
}
