/**
 * ArcPay SDK Integration Tests
 *
 * Tests all SDK modules against Arc Testnet
 * Run with: npm run test:run
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createPublicClient, createWalletClient, http, formatEther, parseEther, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { secp256k1 } from '@noble/curves/secp256k1';
import { getContractAddresses, areContractsDeployed } from '../src/contracts';

// Arc Testnet configuration
const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
};

// Test wallet - uses the funded wallet from .env
const TEST_PRIVATE_KEY = '0x0beef695a3a30c5eb3a7c3ca656e1d8ec6f9c3a98349959326fe11e4a410dbc6';
const TEST_RECIPIENT = '0x692724Db457b67627dd1E5e58c29DB15Db02C7E8';

// ABIs for testing (JSON format)
const STREAM_ABI = [
  { name: 'protocolFee', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'createStream', type: 'function', stateMutability: 'payable', inputs: [{ name: 'recipient', type: 'address' }, { name: 'totalAmount', type: 'uint256' }, { name: 'duration', type: 'uint256' }], outputs: [{ type: 'bytes32' }] },
  { name: 'getStream', type: 'function', stateMutability: 'view', inputs: [{ name: 'streamId', type: 'bytes32' }], outputs: [{ type: 'tuple', components: [{ name: 'id', type: 'bytes32' }, { name: 'sender', type: 'address' }, { name: 'recipient', type: 'address' }, { name: 'token', type: 'address' }, { name: 'totalAmount', type: 'uint256' }, { name: 'claimedAmount', type: 'uint256' }, { name: 'ratePerSecond', type: 'uint256' }, { name: 'startTime', type: 'uint256' }, { name: 'endTime', type: 'uint256' }, { name: 'pausedAt', type: 'uint256' }, { name: 'pausedDuration', type: 'uint256' }, { name: 'state', type: 'uint8' }] }] },
  { name: 'getSenderStreams', type: 'function', stateMutability: 'view', inputs: [{ name: 'sender', type: 'address' }], outputs: [{ type: 'bytes32[]' }] },
] as const;

const ESCROW_ABI = [
  { name: 'createAndFundEscrow', type: 'function', stateMutability: 'payable', inputs: [{ name: 'beneficiary', type: 'address' }, { name: 'arbiter', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'expiresAt', type: 'uint256' }, { name: 'conditionHash', type: 'string' }], outputs: [{ type: 'bytes32' }] },
  { name: 'getEscrow', type: 'function', stateMutability: 'view', inputs: [{ name: 'escrowId', type: 'bytes32' }], outputs: [{ type: 'tuple', components: [{ name: 'id', type: 'bytes32' }, { name: 'depositor', type: 'address' }, { name: 'beneficiary', type: 'address' }, { name: 'arbiter', type: 'address' }, { name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'fundedAt', type: 'uint256' }, { name: 'expiresAt', type: 'uint256' }, { name: 'state', type: 'uint8' }, { name: 'conditionHash', type: 'string' }, { name: 'releasedAmount', type: 'uint256' }, { name: 'refundedAmount', type: 'uint256' }] }] },
  { name: 'getUserEscrows', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'bytes32[]' }] },
] as const;

const CHANNEL_ABI = [
  { name: 'DISPUTE_PERIOD', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'MIN_DEPOSIT', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'openChannel', type: 'function', stateMutability: 'payable', inputs: [{ name: 'recipient', type: 'address' }, { name: 'deposit', type: 'uint256' }], outputs: [{ type: 'bytes32' }] },
  { name: 'getChannel', type: 'function', stateMutability: 'view', inputs: [{ name: 'channelId', type: 'bytes32' }], outputs: [{ type: 'tuple', components: [{ name: 'id', type: 'bytes32' }, { name: 'sender', type: 'address' }, { name: 'recipient', type: 'address' }, { name: 'token', type: 'address' }, { name: 'deposit', type: 'uint256' }, { name: 'spent', type: 'uint256' }, { name: 'nonce', type: 'uint256' }, { name: 'state', type: 'uint8' }, { name: 'createdAt', type: 'uint256' }, { name: 'closingAt', type: 'uint256' }, { name: 'closedAt', type: 'uint256' }] }] },
  { name: 'getSenderChannels', type: 'function', stateMutability: 'view', inputs: [{ name: 'sender', type: 'address' }], outputs: [{ type: 'bytes32[]' }] },
] as const;

const STEALTH_ABI = [
  { name: 'isRegistered', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'getTotalAnnouncements', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'registerMetaAddress', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spendingPubKey', type: 'bytes' }, { name: 'viewingPubKey', type: 'bytes' }], outputs: [] },
  { name: 'sendStealthPayment', type: 'function', stateMutability: 'payable', inputs: [{ name: 'stealthAddress', type: 'address' }, { name: 'ephemeralPubKey', type: 'bytes' }, { name: 'encryptedMemo', type: 'bytes' }], outputs: [{ type: 'bytes32' }] },
] as const;

const AGENT_ABI = [
  { name: 'usdc', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'getAgentConfig', type: 'function', stateMutability: 'view', inputs: [{ name: 'agent', type: 'address' }], outputs: [{ type: 'tuple', components: [{ name: 'owner', type: 'address' }, { name: 'dailyBudget', type: 'uint256' }, { name: 'perTxLimit', type: 'uint256' }, { name: 'todaySpent', type: 'uint256' }, { name: 'lastResetTimestamp', type: 'uint256' }, { name: 'active', type: 'bool' }] }] },
  { name: 'getRemainingDailyBudget', type: 'function', stateMutability: 'view', inputs: [{ name: 'agent', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const;

// Clients
let publicClient: ReturnType<typeof createPublicClient>;
let walletClient: ReturnType<typeof createWalletClient>;
let account: ReturnType<typeof privateKeyToAccount>;
let addresses: ReturnType<typeof getContractAddresses>;

beforeAll(() => {
  account = privateKeyToAccount(TEST_PRIVATE_KEY as `0x${string}`);

  publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http('https://rpc.testnet.arc.network'),
  });

  walletClient = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http('https://rpc.testnet.arc.network'),
  });

  addresses = getContractAddresses(5042002);
});

// ============================================
// CONTRACT DEPLOYMENT TESTS
// ============================================
describe('Contract Deployment', () => {
  it('should have valid contract addresses', () => {
    expect(addresses.escrow).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(addresses.streamPayment).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(addresses.paymentChannel).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(addresses.stealthRegistry).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(addresses.agentRegistry).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it('should report contracts as deployed', () => {
    expect(areContractsDeployed(5042002)).toBe(true);
  });

  it('Escrow contract should have bytecode', async () => {
    const bytecode = await publicClient.getCode({ address: addresses.escrow as `0x${string}` });
    expect(bytecode).toBeDefined();
    expect(bytecode?.length).toBeGreaterThan(2);
  });

  it('StreamPayment contract should have bytecode', async () => {
    const bytecode = await publicClient.getCode({ address: addresses.streamPayment as `0x${string}` });
    expect(bytecode).toBeDefined();
    expect(bytecode?.length).toBeGreaterThan(2);
  });

  it('PaymentChannel contract should have bytecode', async () => {
    const bytecode = await publicClient.getCode({ address: addresses.paymentChannel as `0x${string}` });
    expect(bytecode).toBeDefined();
    expect(bytecode?.length).toBeGreaterThan(2);
  });

  it('StealthRegistry contract should have bytecode', async () => {
    const bytecode = await publicClient.getCode({ address: addresses.stealthRegistry as `0x${string}` });
    expect(bytecode).toBeDefined();
    expect(bytecode?.length).toBeGreaterThan(2);
  });

  it('AgentRegistry contract should have bytecode', async () => {
    const bytecode = await publicClient.getCode({ address: addresses.agentRegistry as `0x${string}` });
    expect(bytecode).toBeDefined();
    expect(bytecode?.length).toBeGreaterThan(2);
  });
});

// ============================================
// WALLET TESTS
// ============================================
describe('Wallet', () => {
  it('should have correct address', () => {
    expect(account.address).toBe('0xF505e2E71df58D7244189072008f25f6b6aaE5ae');
  });

  it('should have balance for testing', async () => {
    const balance = await publicClient.getBalance({ address: account.address });
    expect(balance).toBeGreaterThan(BigInt(0));
    console.log(`    Wallet balance: ${formatEther(balance)} USDC`);
  });
});

// ============================================
// STREAM PAYMENT TESTS
// ============================================
describe('Stream Payment Module', () => {
  let streamId: string | null = null;

  it('should read protocol fee', async () => {
    const fee = await publicClient.readContract({
      address: addresses.streamPayment as `0x${string}`,
      abi: STREAM_ABI,
      functionName: 'protocolFee',
    });
    expect(fee).toBeDefined();
    console.log(`    Protocol fee: ${fee}%`);
  });

  it('should create a stream', async () => {
    const amount = parseEther('0.001');
    const duration = BigInt(3600);

    const hash = await walletClient.writeContract({
      address: addresses.streamPayment as `0x${string}`,
      abi: STREAM_ABI,
      functionName: 'createStream',
      args: [TEST_RECIPIENT as `0x${string}`, amount, duration],
      value: amount,
      chain: arcTestnet,
      account,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    expect(receipt.status).toBe('success');

    const streamLog = receipt.logs.find(
      log => log.address.toLowerCase() === addresses.streamPayment.toLowerCase()
    );
    streamId = streamLog?.topics[1] || null;
    expect(streamId).toBeDefined();
    console.log(`    Stream created: ${streamId?.slice(0, 18)}...`);
  });

  it('should get stream details', async () => {
    if (!streamId) return;

    const stream = await publicClient.readContract({
      address: addresses.streamPayment as `0x${string}`,
      abi: STREAM_ABI,
      functionName: 'getStream',
      args: [streamId as `0x${string}`],
    });

    expect((stream as any).sender.toLowerCase()).toBe(account.address.toLowerCase());
    console.log(`    Stream total: ${formatEther((stream as any).totalAmount)} USDC`);
  });

  it('should get sender streams', async () => {
    const streams = await publicClient.readContract({
      address: addresses.streamPayment as `0x${string}`,
      abi: STREAM_ABI,
      functionName: 'getSenderStreams',
      args: [account.address],
    });

    expect((streams as any[]).length).toBeGreaterThan(0);
    console.log(`    Sender has ${(streams as any[]).length} stream(s)`);
  });
});

// ============================================
// ESCROW TESTS
// ============================================
describe('Escrow Module', () => {
  let escrowId: string | null = null;

  it('should create an escrow', async () => {
    const amount = parseEther('0.001');
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 86400);

    const hash = await walletClient.writeContract({
      address: addresses.escrow as `0x${string}`,
      abi: ESCROW_ABI,
      functionName: 'createAndFundEscrow',
      args: [TEST_RECIPIENT as `0x${string}`, account.address, amount, expiresAt, 'test-condition'],
      value: amount,
      chain: arcTestnet,
      account,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    expect(receipt.status).toBe('success');

    const escrowLog = receipt.logs.find(
      log => log.address.toLowerCase() === addresses.escrow.toLowerCase()
    );
    escrowId = escrowLog?.topics[1] || null;
    expect(escrowId).toBeDefined();
    console.log(`    Escrow created: ${escrowId?.slice(0, 18)}...`);
  });

  it('should get escrow details', async () => {
    if (!escrowId) return;

    const escrow = await publicClient.readContract({
      address: addresses.escrow as `0x${string}`,
      abi: ESCROW_ABI,
      functionName: 'getEscrow',
      args: [escrowId as `0x${string}`],
    });

    expect((escrow as any).depositor.toLowerCase()).toBe(account.address.toLowerCase());
    console.log(`    Escrow amount: ${formatEther((escrow as any).amount)} USDC`);
  });

  it('should get user escrows', async () => {
    const escrows = await publicClient.readContract({
      address: addresses.escrow as `0x${string}`,
      abi: ESCROW_ABI,
      functionName: 'getUserEscrows',
      args: [account.address],
    });

    expect((escrows as any[]).length).toBeGreaterThan(0);
    console.log(`    User has ${(escrows as any[]).length} escrow(s)`);
  });
});

// ============================================
// PAYMENT CHANNEL TESTS
// ============================================
describe('Payment Channel Module', () => {
  let channelId: string | null = null;

  it('should read dispute period', async () => {
    const period = await publicClient.readContract({
      address: addresses.paymentChannel as `0x${string}`,
      abi: CHANNEL_ABI,
      functionName: 'DISPUTE_PERIOD',
    });
    expect(period).toBeGreaterThan(BigInt(0));
    console.log(`    Dispute period: ${period} seconds`);
  });

  it('should read min deposit', async () => {
    const minDeposit = await publicClient.readContract({
      address: addresses.paymentChannel as `0x${string}`,
      abi: CHANNEL_ABI,
      functionName: 'MIN_DEPOSIT',
    });
    expect(minDeposit).toBeDefined();
    console.log(`    Min deposit: ${formatEther(minDeposit as bigint)} USDC`);
  });

  it('should open a channel', async () => {
    const deposit = parseEther('0.001');

    const hash = await walletClient.writeContract({
      address: addresses.paymentChannel as `0x${string}`,
      abi: CHANNEL_ABI,
      functionName: 'openChannel',
      args: [TEST_RECIPIENT as `0x${string}`, deposit],
      value: deposit,
      chain: arcTestnet,
      account,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    expect(receipt.status).toBe('success');

    const channelLog = receipt.logs.find(
      log => log.address.toLowerCase() === addresses.paymentChannel.toLowerCase()
    );
    channelId = channelLog?.topics[1] || null;
    expect(channelId).toBeDefined();
    console.log(`    Channel opened: ${channelId?.slice(0, 18)}...`);
  });

  it('should get channel details', async () => {
    if (!channelId) return;

    const channel = await publicClient.readContract({
      address: addresses.paymentChannel as `0x${string}`,
      abi: CHANNEL_ABI,
      functionName: 'getChannel',
      args: [channelId as `0x${string}`],
    });

    expect((channel as any).sender.toLowerCase()).toBe(account.address.toLowerCase());
    console.log(`    Channel deposit: ${formatEther((channel as any).deposit)} USDC`);
  });

  it('should get sender channels', async () => {
    const channels = await publicClient.readContract({
      address: addresses.paymentChannel as `0x${string}`,
      abi: CHANNEL_ABI,
      functionName: 'getSenderChannels',
      args: [account.address],
    });

    expect((channels as any[]).length).toBeGreaterThan(0);
    console.log(`    Sender has ${(channels as any[]).length} channel(s)`);
  });
});

// ============================================
// STEALTH/PRIVACY TESTS
// ============================================
describe('Privacy/Stealth Module', () => {
  it('should generate valid stealth keys', () => {
    const spendingPrivKey = secp256k1.utils.randomPrivateKey();
    const spendingPubKey = secp256k1.getPublicKey(spendingPrivKey, true);
    const viewingPrivKey = secp256k1.utils.randomPrivateKey();
    const viewingPubKey = secp256k1.getPublicKey(viewingPrivKey, true);

    expect(spendingPubKey.length).toBe(33);
    expect(viewingPubKey.length).toBe(33);
    console.log(`    Spending key: ${toHex(spendingPubKey).slice(0, 20)}...`);
    console.log(`    Viewing key: ${toHex(viewingPubKey).slice(0, 20)}...`);
  });

  it('should check registration status', async () => {
    const isReg = await publicClient.readContract({
      address: addresses.stealthRegistry as `0x${string}`,
      abi: STEALTH_ABI,
      functionName: 'isRegistered',
      args: [account.address],
    });
    expect(typeof isReg).toBe('boolean');
    console.log(`    Account registered: ${isReg}`);
  });

  it('should get total announcements', async () => {
    const total = await publicClient.readContract({
      address: addresses.stealthRegistry as `0x${string}`,
      abi: STEALTH_ABI,
      functionName: 'getTotalAnnouncements',
    });
    expect(total).toBeGreaterThanOrEqual(BigInt(0));
    console.log(`    Total announcements: ${total}`);
  });

  it('should send stealth payment', async () => {
    const ephemeralPrivKey = secp256k1.utils.randomPrivateKey();
    const ephemeralPubKey = secp256k1.getPublicKey(ephemeralPrivKey, true);
    const stealthPrivKey = secp256k1.utils.randomPrivateKey();
    const stealthAccount = privateKeyToAccount(toHex(stealthPrivKey) as `0x${string}`);

    const payHash = await walletClient.writeContract({
      address: addresses.stealthRegistry as `0x${string}`,
      abi: STEALTH_ABI,
      functionName: 'sendStealthPayment',
      args: [stealthAccount.address, toHex(ephemeralPubKey) as `0x${string}`, '0x' as `0x${string}`],
      value: parseEther('0.0001'),
      chain: arcTestnet,
      account,
    });

    const payReceipt = await publicClient.waitForTransactionReceipt({ hash: payHash });
    expect(payReceipt.status).toBe('success');

    const stealthBalance = await publicClient.getBalance({ address: stealthAccount.address });
    expect(stealthBalance).toBe(parseEther('0.0001'));
    console.log(`    Stealth payment sent: ${formatEther(stealthBalance)} USDC`);
  });
});

// ============================================
// AGENT REGISTRY TESTS
// ============================================
describe('Agent Registry Module', () => {
  it('should read USDC address', async () => {
    const usdc = await publicClient.readContract({
      address: addresses.agentRegistry as `0x${string}`,
      abi: AGENT_ABI,
      functionName: 'usdc',
    });
    expect(usdc).toBeDefined();
    console.log(`    USDC address: ${usdc}`);
  });

  it('should check agent config', async () => {
    const config = await publicClient.readContract({
      address: addresses.agentRegistry as `0x${string}`,
      abi: AGENT_ABI,
      functionName: 'getAgentConfig',
      args: [account.address],
    });

    expect((config as any).dailyBudget).toBe(BigInt(0));
    console.log(`    Agent registered: ${(config as any).active}`);
  });

  it('should get remaining daily budget', async () => {
    const remaining = await publicClient.readContract({
      address: addresses.agentRegistry as `0x${string}`,
      abi: AGENT_ABI,
      functionName: 'getRemainingDailyBudget',
      args: [account.address],
    });
    expect(remaining).toBeDefined();
    console.log(`    Remaining budget: ${formatEther(remaining as bigint)} USDC`);
  });
});
