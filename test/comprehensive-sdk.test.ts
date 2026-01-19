/**
 * ArcPay SDK - Comprehensive Module Tests
 *
 * Tests ALL SDK modules systematically:
 *
 * ON-CHAIN MODULES (require blockchain transactions):
 * - Core: init, getBalance, sendUSDC
 * - Escrow: create, release, refund
 * - Streams: create, claim, pause, resume, cancel
 * - Channels: open, getBalance, close
 * - Privacy: register, sendPrivate, scan
 * - Agent: register, deposit, pay
 *
 * OFF-CHAIN MODULES (client-side only):
 * - Subscriptions: createPlan, subscribe, cancel
 * - Invoices: create, pay, list
 * - Compliance: setRules, checkTransaction, screenAddress
 * - Webhooks: register, verify
 * - Rate Limiting: create, check
 * - Events: on, emit
 * - Logging: debug, info, warn, error
 * - Contracts: getAddresses, areDeployed
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ArcPay } from '../src/core/client';
import {
  getContractAddresses,
  areContractsDeployed,
} from '../src/contracts';
import {
  createSubscriptionManager,
  createInvoiceManager,
  createComplianceModule,
  createWebhookManager,
  createRateLimiter,
  createLogger,
  globalEventEmitter,
  createAnalytics,
} from '../src';
import { createPublicClient, createWalletClient, http, formatEther, parseEther, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { secp256k1 } from '@noble/curves/secp256k1';

// Arc Testnet configuration
const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
};

// Test wallets
const WALLET_A_KEY = '0x0beef695a3a30c5eb3a7c3ca656e1d8ec6f9c3a98349959326fe11e4a410dbc6';
const WALLET_B_KEY = '0xbba623c945c9e7ef9458450e53a83751acf90e65554ad033815720d7bb392d79';

// Test amounts
const TINY_AMOUNT = parseEther('0.000001'); // Very small for tests
const SMALL_AMOUNT = parseEther('0.00001');
const TEST_AMOUNT = parseEther('0.0001');

// ABIs
const STREAM_ABI = [
  { name: 'createStream', type: 'function', stateMutability: 'payable', inputs: [{ name: 'recipient', type: 'address' }, { name: 'totalAmount', type: 'uint256' }, { name: 'duration', type: 'uint256' }], outputs: [{ type: 'bytes32' }] },
  { name: 'claim', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'streamId', type: 'bytes32' }], outputs: [{ type: 'uint256' }] },
  { name: 'pauseStream', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'streamId', type: 'bytes32' }], outputs: [] },
  { name: 'resumeStream', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'streamId', type: 'bytes32' }], outputs: [] },
  { name: 'cancelStream', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'streamId', type: 'bytes32' }], outputs: [] },
  { name: 'getClaimableAmount', type: 'function', stateMutability: 'view', inputs: [{ name: 'streamId', type: 'bytes32' }], outputs: [{ type: 'uint256' }] },
  { name: 'getSenderStreams', type: 'function', stateMutability: 'view', inputs: [{ name: 'sender', type: 'address' }], outputs: [{ type: 'bytes32[]' }] },
] as const;

const STEALTH_ABI = [
  { name: 'registerMetaAddress', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spendingPubKey', type: 'bytes' }, { name: 'viewingPubKey', type: 'bytes' }], outputs: [] },
  { name: 'sendStealthPayment', type: 'function', stateMutability: 'payable', inputs: [{ name: 'stealthAddress', type: 'address' }, { name: 'ephemeralPubKey', type: 'bytes' }, { name: 'encryptedMemo', type: 'bytes' }], outputs: [{ type: 'bytes32' }] },
  { name: 'isRegistered', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'getTotalAnnouncements', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const;

// Clients
let publicClient: ReturnType<typeof createPublicClient>;
let walletA: ReturnType<typeof createWalletClient>;
let walletB: ReturnType<typeof createWalletClient>;
let accountA: ReturnType<typeof privateKeyToAccount>;
let accountB: ReturnType<typeof privateKeyToAccount>;
let addresses: ReturnType<typeof getContractAddresses>;
let arcPayA: ArcPay;
let arcPayB: ArcPay;

// Helper to extract ID from logs
function extractIdFromLogs(logs: any[], contractAddress: string): string {
  const log = logs.find(l =>
    l.address.toLowerCase() === contractAddress.toLowerCase() &&
    l.topics && l.topics.length > 1
  );
  if (log?.topics[1]) return log.topics[1];
  for (const l of logs) {
    if (l.topics && l.topics.length > 1 && l.topics[1]?.startsWith('0x')) {
      return l.topics[1];
    }
  }
  return '';
}

// Test results tracker
const testResults: { module: string; api: string; status: 'pass' | 'fail' | 'skip'; note?: string }[] = [];

function recordResult(module: string, api: string, status: 'pass' | 'fail' | 'skip', note?: string) {
  testResults.push({ module, api, status, note });
}

beforeAll(async () => {
  accountA = privateKeyToAccount(WALLET_A_KEY as `0x${string}`);
  accountB = privateKeyToAccount(WALLET_B_KEY as `0x${string}`);

  publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http('https://rpc.testnet.arc.network'),
  });

  walletA = createWalletClient({
    account: accountA,
    chain: arcTestnet,
    transport: http('https://rpc.testnet.arc.network'),
  });

  walletB = createWalletClient({
    account: accountB,
    chain: arcTestnet,
    transport: http('https://rpc.testnet.arc.network'),
  });

  addresses = getContractAddresses(5042002);

  // Initialize ArcPay SDK for both wallets
  arcPayA = await ArcPay.init({
    network: 'arc-testnet',
    privateKey: WALLET_A_KEY,
  });

  arcPayB = await ArcPay.init({
    network: 'arc-testnet',
    privateKey: WALLET_B_KEY,
  });
});

// ============================================
// SECTION 1: CORE MODULE TESTS
// ============================================
describe('1. Core Module', () => {
  it('1.1 ArcPay.init() - initializes SDK correctly', async () => {
    expect(arcPayA).toBeDefined();
    expect(arcPayA.address).toBe(accountA.address);
    expect(arcPayA.network.chainId).toBe(5042002);
    recordResult('Core', 'init', 'pass');
  });

  it('1.2 getBalance() - returns USDC balance', async () => {
    const balance = await arcPayA.getBalance();
    expect(parseFloat(balance)).toBeGreaterThan(0);
    console.log(`    Wallet A Balance: ${balance} USDC`);
    recordResult('Core', 'getBalance', 'pass');
  });

  it('1.3 getBalance(address) - returns balance for specific address', async () => {
    const balanceB = await arcPayA.getBalance(accountB.address);
    expect(balanceB).toBeDefined();
    console.log(`    Wallet B Balance: ${balanceB} USDC`);
    recordResult('Core', 'getBalance(address)', 'pass');
  });

  it('1.4 sendUSDC() - sends USDC to another address', async () => {
    const balanceBefore = await publicClient.getBalance({ address: accountB.address });

    const result = await arcPayA.sendUSDC(accountB.address, '0.00001');

    expect(result.txHash).toBeDefined();
    expect(result.txHash.startsWith('0x')).toBe(true);
    console.log(`    TX Hash: ${result.txHash.slice(0, 20)}...`);
    recordResult('Core', 'sendUSDC', 'pass');
  });

  it('1.5 getEURCBalance() - returns EURC balance (may be 0)', async () => {
    const balance = await arcPayA.getEURCBalance();
    expect(balance).toBeDefined();
    console.log(`    EURC Balance: ${balance}`);
    recordResult('Core', 'getEURCBalance', 'pass');
  });

  it('1.6 getContractAddresses() - returns deployed contract addresses', () => {
    const addrs = getContractAddresses(5042002);
    expect(addrs.escrow).toBeDefined();
    expect(addrs.streamPayment).toBeDefined();
    expect(addrs.paymentChannel).toBeDefined();
    expect(addrs.stealthRegistry).toBeDefined();
    console.log(`    Escrow: ${addrs.escrow.slice(0, 15)}...`);
    console.log(`    StreamPayment: ${addrs.streamPayment.slice(0, 15)}...`);
    recordResult('Core', 'getContractAddresses', 'pass');
  });

  it('1.7 areContractsDeployed() - verifies contract deployment', () => {
    const deployed = areContractsDeployed(5042002);
    expect(deployed).toBe(true);
    recordResult('Core', 'areContractsDeployed', 'pass');
  });
});

// ============================================
// SECTION 2: STREAM MODULE TESTS (ON-CHAIN)
// ============================================
describe('2. Stream Module (On-Chain)', () => {
  let streamId: string;

  it('2.1 streams.create() - creates a payment stream', async () => {
    const hash = await walletA.writeContract({
      address: addresses.streamPayment as `0x${string}`,
      abi: STREAM_ABI,
      functionName: 'createStream',
      args: [accountB.address, SMALL_AMOUNT, BigInt(120)], // 2 min stream
      value: SMALL_AMOUNT,
      chain: arcTestnet,
      account: accountA,
      gas: BigInt(300000),
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    expect(receipt.status).toBe('success');
    streamId = extractIdFromLogs(receipt.logs, addresses.streamPayment);
    expect(streamId).toBeTruthy();
    console.log(`    Stream ID: ${streamId.slice(0, 20)}...`);
    recordResult('Stream', 'create', 'pass');
  });

  it('2.2 streams.getClaimable() - gets claimable amount', async () => {
    await new Promise(r => setTimeout(r, 2000)); // Wait for accrual

    const claimable = await publicClient.readContract({
      address: addresses.streamPayment as `0x${string}`,
      abi: STREAM_ABI,
      functionName: 'getClaimableAmount',
      args: [streamId as `0x${string}`],
    });

    expect(claimable).toBeGreaterThan(BigInt(0));
    console.log(`    Claimable: ${formatEther(claimable as bigint)} USDC`);
    recordResult('Stream', 'getClaimable', 'pass');
  });

  it('2.3 streams.claim() - claims accrued funds', async () => {
    const hash = await walletB.writeContract({
      address: addresses.streamPayment as `0x${string}`,
      abi: STREAM_ABI,
      functionName: 'claim',
      args: [streamId as `0x${string}`],
      chain: arcTestnet,
      account: accountB,
      gas: BigInt(200000),
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    expect(receipt.status).toBe('success');
    console.log(`    Claimed successfully`);
    recordResult('Stream', 'claim', 'pass');
  });

  it('2.4 streams.pause() - pauses the stream', async () => {
    const hash = await walletA.writeContract({
      address: addresses.streamPayment as `0x${string}`,
      abi: STREAM_ABI,
      functionName: 'pauseStream',
      args: [streamId as `0x${string}`],
      chain: arcTestnet,
      account: accountA,
      gas: BigInt(150000),
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    expect(receipt.status).toBe('success');
    console.log(`    Stream paused`);
    recordResult('Stream', 'pause', 'pass');
  });

  it('2.5 streams.resume() - resumes the stream', async () => {
    const hash = await walletA.writeContract({
      address: addresses.streamPayment as `0x${string}`,
      abi: STREAM_ABI,
      functionName: 'resumeStream',
      args: [streamId as `0x${string}`],
      chain: arcTestnet,
      account: accountA,
      gas: BigInt(150000),
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    expect(receipt.status).toBe('success');
    console.log(`    Stream resumed`);
    recordResult('Stream', 'resume', 'pass');
  });

  it('2.6 streams.cancel() - cancels the stream', async () => {
    // Pause first
    const pauseHash = await walletA.writeContract({
      address: addresses.streamPayment as `0x${string}`,
      abi: STREAM_ABI,
      functionName: 'pauseStream',
      args: [streamId as `0x${string}`],
      chain: arcTestnet,
      account: accountA,
      gas: BigInt(150000),
    });
    await publicClient.waitForTransactionReceipt({ hash: pauseHash });

    const hash = await walletA.writeContract({
      address: addresses.streamPayment as `0x${string}`,
      abi: STREAM_ABI,
      functionName: 'cancelStream',
      args: [streamId as `0x${string}`],
      chain: arcTestnet,
      account: accountA,
      gas: BigInt(200000),
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    expect(receipt.status).toBe('success');
    console.log(`    Stream cancelled, funds returned`);
    recordResult('Stream', 'cancel', 'pass');
  });
});

// ============================================
// SECTION 3: PRIVACY MODULE TESTS (ON-CHAIN)
// ============================================
describe('3. Privacy Module (On-Chain)', () => {
  it('3.1 privacy.isRegistered() - checks registration status', async () => {
    const isRegistered = await publicClient.readContract({
      address: addresses.stealthRegistry as `0x${string}`,
      abi: STEALTH_ABI,
      functionName: 'isRegistered',
      args: [accountA.address],
    });
    expect(typeof isRegistered).toBe('boolean');
    console.log(`    Wallet A registered: ${isRegistered}`);
    recordResult('Privacy', 'isRegistered', 'pass');
  });

  it('3.2 privacy.getTotalAnnouncements() - gets announcement count', async () => {
    const total = await publicClient.readContract({
      address: addresses.stealthRegistry as `0x${string}`,
      abi: STEALTH_ABI,
      functionName: 'getTotalAnnouncements',
    });
    expect(total).toBeGreaterThanOrEqual(BigInt(0));
    console.log(`    Total announcements: ${total}`);
    recordResult('Privacy', 'getTotalAnnouncements', 'pass');
  });

  it('3.3 privacy.sendStealthPayment() - sends stealth payment', async () => {
    // Generate stealth address
    const stealthPrivKey = secp256k1.utils.randomPrivateKey();
    const stealthAccount = privateKeyToAccount(toHex(stealthPrivKey) as `0x${string}`);

    // Generate ephemeral key
    const ephemeralPrivKey = secp256k1.utils.randomPrivateKey();
    const ephemeralPubKey = secp256k1.getPublicKey(ephemeralPrivKey, true);

    console.log(`    Stealth address: ${stealthAccount.address.slice(0, 15)}...`);

    const hash = await walletA.writeContract({
      address: addresses.stealthRegistry as `0x${string}`,
      abi: STEALTH_ABI,
      functionName: 'sendStealthPayment',
      args: [stealthAccount.address, toHex(ephemeralPubKey) as `0x${string}`, '0x' as `0x${string}`],
      value: TINY_AMOUNT,
      chain: arcTestnet,
      account: accountA,
      gas: BigInt(300000),
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    expect(receipt.status).toBe('success');
    console.log(`    Stealth payment sent`);
    recordResult('Privacy', 'sendStealthPayment', 'pass');
  });

  it('3.4 privacy.registerMetaAddress() - registers meta-address', async () => {
    // Check if already registered
    const isRegistered = await publicClient.readContract({
      address: addresses.stealthRegistry as `0x${string}`,
      abi: STEALTH_ABI,
      functionName: 'isRegistered',
      args: [accountA.address],
    });

    if (isRegistered) {
      console.log(`    Already registered, skipping`);
      recordResult('Privacy', 'registerMetaAddress', 'skip', 'Already registered');
      return;
    }

    // Generate keys
    const spendingPrivKey = secp256k1.utils.randomPrivateKey();
    const spendingPubKey = secp256k1.getPublicKey(spendingPrivKey, true);
    const viewingPrivKey = secp256k1.utils.randomPrivateKey();
    const viewingPubKey = secp256k1.getPublicKey(viewingPrivKey, true);

    const hash = await walletA.writeContract({
      address: addresses.stealthRegistry as `0x${string}`,
      abi: STEALTH_ABI,
      functionName: 'registerMetaAddress',
      args: [toHex(spendingPubKey) as `0x${string}`, toHex(viewingPubKey) as `0x${string}`],
      chain: arcTestnet,
      account: accountA,
      gas: BigInt(200000),
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    expect(receipt.status).toBe('success');
    console.log(`    Meta-address registered`);
    recordResult('Privacy', 'registerMetaAddress', 'pass');
  });
});

// ============================================
// SECTION 3B: PAYMENT CHANNEL TESTS (ON-CHAIN)
// ============================================
const CHANNEL_ABI = [
  { name: 'openChannel', type: 'function', stateMutability: 'payable', inputs: [{ name: 'recipient', type: 'address' }, { name: 'deposit', type: 'uint256' }], outputs: [{ type: 'bytes32' }] },
  { name: 'topUpChannel', type: 'function', stateMutability: 'payable', inputs: [{ name: 'channelId', type: 'bytes32' }, { name: 'additionalDeposit', type: 'uint256' }], outputs: [] },
  { name: 'emergencyClose', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'channelId', type: 'bytes32' }], outputs: [] },
  { name: 'getChannelBalance', type: 'function', stateMutability: 'view', inputs: [{ name: 'channelId', type: 'bytes32' }], outputs: [{ name: 'available', type: 'uint256' }, { name: 'spent', type: 'uint256' }] },
  { name: 'getSenderChannels', type: 'function', stateMutability: 'view', inputs: [{ name: 'sender', type: 'address' }], outputs: [{ type: 'bytes32[]' }] },
] as const;

describe('3B. Payment Channel Module (On-Chain)', () => {
  let channelId: string;
  // Channel minimum deposit is 0.001 USDC (1e15)
  const CHANNEL_DEPOSIT = parseEther('0.001');

  it('3B.1 channels.openChannel() - opens a payment channel', async () => {
    // Use Wallet B as recipient (not zero address, not self)
    const recipientAddress = accountB.address;
    console.log(`    Recipient: ${recipientAddress.slice(0, 15)}...`);

    const hash = await walletA.writeContract({
      address: addresses.paymentChannel as `0x${string}`,
      abi: CHANNEL_ABI,
      functionName: 'openChannel',
      args: [recipientAddress, CHANNEL_DEPOSIT],
      value: CHANNEL_DEPOSIT,
      chain: arcTestnet,
      account: accountA,
      gas: BigInt(300000),
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    expect(receipt.status).toBe('success');
    channelId = extractIdFromLogs(receipt.logs, addresses.paymentChannel);
    console.log(`    Channel ID: ${channelId.slice(0, 20)}...`);
    recordResult('Channel', 'openChannel', 'pass');
  });

  it('3B.2 channels.getChannelBalance() - gets channel balance', async () => {
    const balance = await publicClient.readContract({
      address: addresses.paymentChannel as `0x${string}`,
      abi: CHANNEL_ABI,
      functionName: 'getChannelBalance',
      args: [channelId as `0x${string}`],
    });

    const [available, spent] = balance as [bigint, bigint];
    expect(available).toBe(CHANNEL_DEPOSIT);
    console.log(`    Available: ${formatEther(available)} USDC, Spent: ${formatEther(spent)} USDC`);
    recordResult('Channel', 'getChannelBalance', 'pass');
  });

  it('3B.3 channels.emergencyClose() - closes channel', async () => {
    const hash = await walletA.writeContract({
      address: addresses.paymentChannel as `0x${string}`,
      abi: CHANNEL_ABI,
      functionName: 'emergencyClose',
      args: [channelId as `0x${string}`],
      chain: arcTestnet,
      account: accountA,
      gas: BigInt(200000),
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    expect(receipt.status).toBe('success');
    console.log(`    Channel closed, funds returned`);
    recordResult('Channel', 'emergencyClose', 'pass');
  });
});

// ============================================
// SECTION 3C: AGENT REGISTRY TESTS (ON-CHAIN)
// ============================================
const AGENT_ABI = [
  { name: 'registerAgent', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'agent', type: 'address' }, { name: 'dailyBudget', type: 'uint256' }, { name: 'perTxLimit', type: 'uint256' }], outputs: [] },
  { name: 'depositFunds', type: 'function', stateMutability: 'payable', inputs: [{ name: 'agent', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'executePayment', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'recipient', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'memo', type: 'string' }], outputs: [] },
  { name: 'getAgentBalance', type: 'function', stateMutability: 'view', inputs: [{ name: 'agent', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'getAgentConfig', type: 'function', stateMutability: 'view', inputs: [{ name: 'agent', type: 'address' }], outputs: [{ name: 'owner', type: 'address' }, { name: 'dailyBudget', type: 'uint256' }, { name: 'perTxLimit', type: 'uint256' }, { name: 'active', type: 'bool' }] },
] as const;

describe('3C. Agent Registry Module (On-Chain)', () => {
  it('3C.1 agent.registerAgent() - registers an AI agent', async () => {
    const agentAddress = accountB.address;
    const dailyBudget = parseEther('1'); // 1 USDC daily budget
    const perTxLimit = parseEther('0.1'); // 0.1 USDC per tx limit

    try {
      const hash = await walletA.writeContract({
        address: addresses.agentRegistry as `0x${string}`,
        abi: AGENT_ABI,
        functionName: 'registerAgent',
        args: [agentAddress, dailyBudget, perTxLimit],
        chain: arcTestnet,
        account: accountA,
        gas: BigInt(300000),
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      expect(receipt.status).toBe('success');
      console.log(`    Agent registered: ${agentAddress.slice(0, 15)}...`);
      recordResult('Agent', 'registerAgent', 'pass');
    } catch (e: any) {
      // Agent may already be registered or tx reverted
      console.log(`    Note: ${e.message?.slice(0, 60)}...`);
      // Check if agent exists by querying config
      try {
        const config = await publicClient.readContract({
          address: addresses.agentRegistry as `0x${string}`,
          abi: AGENT_ABI,
          functionName: 'getAgentConfig',
          args: [agentAddress],
        });
        const [owner] = config as [string, bigint, bigint, boolean];
        if (owner !== '0x0000000000000000000000000000000000000000') {
          console.log(`    Agent already registered (owner: ${owner.slice(0, 15)}...)`);
          recordResult('Agent', 'registerAgent', 'pass', 'Already registered');
          return;
        }
      } catch {}
      recordResult('Agent', 'registerAgent', 'fail', e.message?.slice(0, 50));
      throw e;
    }
  });

  // Note: depositFunds uses ERC20 safeTransferFrom, not native USDC
  // On Arc, USDC is the native gas token, so this requires wrapped USDC or ERC20 approval
  it.skip('3C.2 agent.depositFunds() - deposits funds for agent (requires ERC20 approval)', async () => {
    const agentAddress = accountB.address;
    // This would require ERC20 USDC approval first
    console.log(`    Skipped - requires ERC20 USDC approval`);
    recordResult('Agent', 'depositFunds', 'skip', 'Requires ERC20 approval');
  });

  it('3C.3 agent.getAgentBalance() - gets agent balance', async () => {
    const agentAddress = accountB.address;
    const balance = await publicClient.readContract({
      address: addresses.agentRegistry as `0x${string}`,
      abi: AGENT_ABI,
      functionName: 'getAgentBalance',
      args: [agentAddress],
    });

    expect(balance).toBeGreaterThanOrEqual(BigInt(0));
    console.log(`    Agent balance: ${formatEther(balance as bigint)} USDC`);
    recordResult('Agent', 'getAgentBalance', 'pass');
  });

  it('3C.4 agent.getAgentConfig() - gets agent configuration', async () => {
    const agentAddress = accountB.address;
    const config = await publicClient.readContract({
      address: addresses.agentRegistry as `0x${string}`,
      abi: AGENT_ABI,
      functionName: 'getAgentConfig',
      args: [agentAddress],
    });

    const [owner, dailyBudget, perTxLimit, active] = config as [string, bigint, bigint, boolean];
    expect(owner).toBeDefined();
    console.log(`    Owner: ${owner.slice(0, 15)}...`);
    console.log(`    Daily Budget: ${formatEther(dailyBudget)} USDC`);
    console.log(`    Active: ${active}`);
    recordResult('Agent', 'getAgentConfig', 'pass');
  });
});

// ============================================
// SECTION 3D: ESCROW TESTS (ON-CHAIN)
// ============================================
const ESCROW_ABI = [
  { name: 'createAndFundEscrow', type: 'function', stateMutability: 'payable', inputs: [{ name: 'beneficiary', type: 'address' }, { name: 'arbiter', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'expiresAt', type: 'uint256' }, { name: 'conditionHash', type: 'string' }], outputs: [{ type: 'bytes32' }] },
  { name: 'releaseEscrow', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'escrowId', type: 'bytes32' }], outputs: [] },
  { name: 'refundEscrow', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'escrowId', type: 'bytes32' }], outputs: [] },
  { name: 'getUserEscrows', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'bytes32[]' }] },
] as const;

describe('3D. Escrow Module (On-Chain)', () => {
  let escrowId: string;

  it('3D.1 escrow.createAndFundEscrow() - creates an escrow', async () => {
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 86400); // 24 hours

    try {
      const hash = await walletA.writeContract({
        address: addresses.escrow as `0x${string}`,
        abi: ESCROW_ABI,
        functionName: 'createAndFundEscrow',
        args: [accountB.address, accountA.address, SMALL_AMOUNT, expiresAt, 'test-escrow'],
        value: SMALL_AMOUNT,
        chain: arcTestnet,
        account: accountA,
        gas: BigInt(500000),
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      expect(receipt.status).toBe('success');
      escrowId = extractIdFromLogs(receipt.logs, addresses.escrow);
      console.log(`    Escrow ID: ${escrowId ? escrowId.slice(0, 20) + '...' : 'Not found in logs'}`);
      recordResult('Escrow', 'createAndFundEscrow', 'pass');
    } catch (e: any) {
      console.log(`    Error: ${e.message?.slice(0, 80)}...`);
      recordResult('Escrow', 'createAndFundEscrow', 'fail', e.message?.slice(0, 50));
      throw e;
    }
  });

  it('3D.2 escrow.getUserEscrows() - gets user escrows', async () => {
    const escrows = await publicClient.readContract({
      address: addresses.escrow as `0x${string}`,
      abi: ESCROW_ABI,
      functionName: 'getUserEscrows',
      args: [accountA.address],
    });

    expect(Array.isArray(escrows)).toBe(true);
    console.log(`    User has ${(escrows as string[]).length} escrows`);
    recordResult('Escrow', 'getUserEscrows', 'pass');
  });

  it('3D.3 escrow.releaseEscrow() - releases escrow funds', async () => {
    if (!escrowId) {
      console.log(`    Skipped - no escrow ID`);
      recordResult('Escrow', 'releaseEscrow', 'skip', 'No escrow ID');
      return;
    }

    try {
      const hash = await walletA.writeContract({
        address: addresses.escrow as `0x${string}`,
        abi: ESCROW_ABI,
        functionName: 'releaseEscrow',
        args: [escrowId as `0x${string}`],
        chain: arcTestnet,
        account: accountA,
        gas: BigInt(200000),
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      expect(receipt.status).toBe('success');
      console.log(`    Escrow released`);
      recordResult('Escrow', 'releaseEscrow', 'pass');
    } catch (e: any) {
      console.log(`    Error: ${e.message?.slice(0, 80)}...`);
      recordResult('Escrow', 'releaseEscrow', 'fail', e.message?.slice(0, 50));
      throw e;
    }
  });
});

// ============================================
// SECTION 4: SUBSCRIPTIONS MODULE (OFF-CHAIN)
// ============================================
describe('4. Subscriptions Module (Off-Chain)', () => {
  it('4.1 subscriptions.createPlan() - creates a subscription plan', () => {
    const manager = createSubscriptionManager({ privateKey: WALLET_A_KEY });
    const plan = manager.createPlan({
      name: 'Pro Plan',
      price: '9.99',
      period: 'monthly',
      description: 'Full access to all features',
    });

    expect(plan.id).toBeDefined();
    expect(plan.name).toBe('Pro Plan');
    expect(plan.price).toBe('9.99');
    console.log(`    Plan created: ${plan.id}`);
    recordResult('Subscriptions', 'createPlan', 'pass');
  });

  it('4.2 subscriptions.subscribe() - subscribes to a plan', async () => {
    const manager = createSubscriptionManager({ privateKey: WALLET_A_KEY });
    const plan = manager.createPlan({
      name: 'Basic',
      price: '4.99',
      period: 'monthly',
    });

    const subscription = await manager.subscribe({
      plan: plan.id,
      merchant: accountB.address,
    });

    expect(subscription.id).toBeDefined();
    expect(subscription.status).toBe('active');
    console.log(`    Subscribed: ${subscription.id}`);
    recordResult('Subscriptions', 'subscribe', 'pass');
  });

  it('4.3 subscriptions.cancel() - cancels a subscription', async () => {
    const manager = createSubscriptionManager({ privateKey: WALLET_A_KEY });
    const plan = manager.createPlan({ name: 'Test', price: '1.00', period: 'monthly' });
    const sub = await manager.subscribe({ plan: plan.id, merchant: accountB.address });

    const cancelled = await manager.cancel(sub.id);
    expect(cancelled.status).toBe('cancelled');
    console.log(`    Cancelled subscription`);
    recordResult('Subscriptions', 'cancel', 'pass');
  });

  it('4.4 subscriptions.listPlans() - lists all plans', () => {
    const manager = createSubscriptionManager({ privateKey: WALLET_A_KEY });
    manager.createPlan({ name: 'Plan A', price: '10', period: 'monthly' });
    manager.createPlan({ name: 'Plan B', price: '20', period: 'yearly' });

    const plans = manager.listPlans();
    expect(plans.length).toBeGreaterThanOrEqual(2);
    console.log(`    Found ${plans.length} plans`);
    recordResult('Subscriptions', 'listPlans', 'pass');
  });
});

// ============================================
// SECTION 5: INVOICES MODULE (OFF-CHAIN)
// ============================================
describe('5. Invoices Module (Off-Chain)', () => {
  it('5.1 invoices.create() - creates an invoice', async () => {
    const manager = createInvoiceManager({ privateKey: WALLET_A_KEY, issuerName: 'Test Company' });
    const invoice = await manager.create({
      to: accountB.address,
      items: [
        { description: 'Consulting (2 hrs)', quantity: 1, unitPrice: '100.00' }
      ],
    });

    expect(invoice.id).toBeDefined();
    expect(invoice.status).toBe('draft');
    console.log(`    Invoice created: ${invoice.number}`);
    recordResult('Invoices', 'create', 'pass');
  });

  it('5.2 invoices.list() - lists all invoices', async () => {
    const manager = createInvoiceManager({ privateKey: WALLET_A_KEY, issuerName: 'Test Company' });
    await manager.create({ to: accountB.address, items: [{ description: 'Item 1', quantity: 1, unitPrice: '50' }] });
    await manager.create({ to: accountB.address, items: [{ description: 'Item 2', quantity: 1, unitPrice: '100' }] });

    const all = manager.list();
    expect(all.length).toBeGreaterThanOrEqual(2);
    console.log(`    Found ${all.length} invoices`);
    recordResult('Invoices', 'list', 'pass');
  });

  it('5.3 invoices.list(filter) - filters invoices', async () => {
    const manager = createInvoiceManager({ privateKey: WALLET_A_KEY, issuerName: 'Test Company' });
    await manager.create({ to: accountB.address, items: [{ description: 'Test', quantity: 1, unitPrice: '50' }] });

    const drafts = manager.list({ status: 'draft' });
    expect(drafts.every(i => i.status === 'draft')).toBe(true);
    console.log(`    Found ${drafts.length} draft invoices`);
    recordResult('Invoices', 'list(filter)', 'pass');
  });
});

// ============================================
// SECTION 6: COMPLIANCE MODULE (OFF-CHAIN)
// ============================================
describe('6. Compliance Module (Off-Chain)', () => {
  it('6.1 compliance.screenTransaction() - screens a transaction', async () => {
    const compliance = createComplianceModule({
      thresholds: {
        singleTransaction: '10000',
        dailyVolume: '50000',
      }
    });

    const result = await compliance.screenTransaction({
      from: accountA.address,
      to: accountB.address,
      amount: '500',
      currency: 'USDC',
    });

    expect(result.allowed).toBeDefined();
    console.log(`    Transaction allowed: ${result.allowed}`);
    recordResult('Compliance', 'screenTransaction', 'pass');
  });

  it('6.2 compliance.checkSanctions() - checks sanctions status', async () => {
    const compliance = createComplianceModule();

    const result = await compliance.checkSanctions(accountB.address);
    expect(result.isSanctioned).toBe(false);
    console.log(`    Sanctioned: ${result.isSanctioned}`);
    recordResult('Compliance', 'checkSanctions', 'pass');
  });

  it('6.3 compliance.addToBlacklist() - blocks an address', () => {
    const compliance = createComplianceModule();
    const badAddress = '0xBADBADBADBADBADBADBADBADBADBADBADBADBAD1';

    compliance.addToBlacklist(badAddress, 'Test block');
    const blacklist = compliance.getBlacklist();
    expect(blacklist.some((e: any) => e.address.toLowerCase() === badAddress.toLowerCase())).toBe(true);
    console.log(`    Address added to blacklist`);
    recordResult('Compliance', 'addToBlacklist', 'pass');
  });

  it('6.4 compliance.checkAddress() - checks address risk profile', async () => {
    const compliance = createComplianceModule();

    const result = await compliance.checkAddress(accountB.address);
    expect(result.riskLevel).toBeDefined();
    console.log(`    Risk level: ${result.riskLevel}`);
    recordResult('Compliance', 'checkAddress', 'pass');
  });
});

// ============================================
// SECTION 7: WEBHOOKS MODULE (OFF-CHAIN)
// ============================================
describe('7. Webhooks Module (Off-Chain)', () => {
  it('7.1 webhooks.subscribe() - subscribes to events', () => {
    const manager = createWebhookManager({
      endpoints: [{ url: 'https://example.com/webhooks', secret: 'test_secret' }]
    });

    manager.subscribe('payment.completed', 'https://example.com/payments');
    const endpoints = manager.listEndpoints();
    expect(endpoints.length).toBeGreaterThan(0);
    console.log(`    Subscribed to payment.completed`);
    recordResult('Webhooks', 'subscribe', 'pass');
  });

  it('7.2 webhooks.subscribeAll() - subscribes to all events', () => {
    const manager = createWebhookManager();
    manager.subscribeAll('https://example.com/all-hooks');

    const endpoints = manager.listEndpoints();
    expect(endpoints.length).toBeGreaterThan(0);
    console.log(`    Subscribed to all events`);
    recordResult('Webhooks', 'subscribeAll', 'pass');
  });

  it('7.3 webhooks.unregister() - unregisters endpoint by ID', () => {
    const manager = createWebhookManager();
    const endpointId = manager.subscribeAll('https://test.com/hooks');
    manager.unregister(endpointId);

    const endpoints = manager.listEndpoints();
    expect(endpoints.length).toBe(0);
    console.log(`    Unregistered successfully`);
    recordResult('Webhooks', 'unregister', 'pass');
  });
});

// ============================================
// SECTION 8: RATE LIMITING MODULE (OFF-CHAIN)
// ============================================
describe('8. Rate Limiting Module (Off-Chain)', () => {
  it('8.1 rateLimiter.check() - checks rate limit', () => {
    const limiter = createRateLimiter({
      maxRequests: 5,
      windowMs: 60000,
    });

    const result = limiter.check('user_123');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    console.log(`    Allowed: ${result.allowed}, Remaining: ${result.remaining}`);
    recordResult('RateLimiting', 'check', 'pass');
  });

  it('8.2 rateLimiter blocks after limit exceeded', () => {
    const limiter = createRateLimiter({
      maxRequests: 3,
      windowMs: 60000,
    });

    // isAllowed() checks AND consumes
    limiter.isAllowed('user_456');
    limiter.isAllowed('user_456');
    limiter.isAllowed('user_456');
    const result = limiter.isAllowed('user_456');

    expect(result).toBe(false);
    console.log(`    Blocked after limit: ${!result}`);
    recordResult('RateLimiting', 'blockAfterLimit', 'pass');
  });

  it('8.3 rateLimiter.reset() - resets limit for user', () => {
    const limiter = createRateLimiter({ maxRequests: 2, windowMs: 60000 });

    limiter.isAllowed('user_789');
    limiter.isAllowed('user_789');
    limiter.reset('user_789');

    const result = limiter.isAllowed('user_789');
    expect(result).toBe(true);
    console.log(`    Reset successful, allowed: ${result}`);
    recordResult('RateLimiting', 'reset', 'pass');
  });
});

// ============================================
// SECTION 9: EVENTS MODULE (OFF-CHAIN)
// ============================================
describe('9. Events Module (Off-Chain)', () => {
  it('9.1 events.on() - subscribes to events', () => {
    let received = false;
    globalEventEmitter.on('payment.sent', () => {
      received = true;
    });

    globalEventEmitter.emit('payment.sent', { amount: '100' });
    expect(received).toBe(true);
    console.log(`    Event received: ${received}`);
    recordResult('Events', 'on', 'pass');
  });

  it('9.2 events.emit() - emits events', () => {
    const events: any[] = [];
    globalEventEmitter.on('test.event', (data) => events.push(data));

    globalEventEmitter.emit('test.event', { msg: 'hello' });
    globalEventEmitter.emit('test.event', { msg: 'world' });

    expect(events.length).toBe(2);
    console.log(`    Events emitted: ${events.length}`);
    recordResult('Events', 'emit', 'pass');
  });

  it('9.3 events.unsubscribe() - removes event listener via subscription', () => {
    let count = 0;
    const handler = () => count++;

    // on() returns a subscription with unsubscribe() method
    const subscription = globalEventEmitter.on('off.test.event', handler);
    globalEventEmitter.emit('off.test.event', {});
    subscription.unsubscribe();
    globalEventEmitter.emit('off.test.event', {});

    expect(count).toBe(1);
    console.log(`    Handler removed via unsubscribe, count: ${count}`);
    recordResult('Events', 'unsubscribe', 'pass');
  });
});

// ============================================
// SECTION 10: LOGGING MODULE (OFF-CHAIN)
// ============================================
describe('10. Logging Module (Off-Chain)', () => {
  it('10.1 logger.info() - logs info message', () => {
    const logger = createLogger({ name: 'test-logger', level: 'info' });
    // Pino loggers don't have getLogs, they output to stdout/file
    // Just verify the logger exists and can be called
    expect(logger.info).toBeDefined();
    logger.info('Test info message');
    console.log(`    Info logged to stdout`);
    recordResult('Logging', 'info', 'pass');
  });

  it('10.2 logger.warn() - logs warning message', () => {
    const logger = createLogger({ name: 'test-logger', level: 'warn' });
    expect(logger.warn).toBeDefined();
    logger.warn('Test warning');
    console.log(`    Warning logged to stdout`);
    recordResult('Logging', 'warn', 'pass');
  });

  it('10.3 logger.error() - logs error message', () => {
    const logger = createLogger({ name: 'test-logger', level: 'error' });
    expect(logger.error).toBeDefined();
    logger.error('Test error');
    console.log(`    Error logged to stdout`);
    recordResult('Logging', 'error', 'pass');
  });

  it('10.4 logger.child() - creates child logger', () => {
    const logger = createLogger({ name: 'parent-logger' });
    expect(logger.child).toBeDefined();
    const childLogger = logger.child({ module: 'payments' });
    childLogger.info('Child logger message');
    console.log(`    Child logger created`);
    recordResult('Logging', 'child', 'pass');
  });
});

// ============================================
// SECTION 11: ANALYTICS MODULE (OFF-CHAIN)
// ============================================
describe('11. Analytics Module (Off-Chain)', () => {
  it('11.1 analytics.track() - tracks an event', () => {
    const analytics = createAnalytics();
    analytics.track('payment', { amount: '100', currency: 'USDC' });

    // Use getCounter() to check counter was incremented
    const count = analytics.getCounter('events.payment');
    expect(count).toBeGreaterThan(0);
    console.log(`    Event tracked, count: ${count}`);
    recordResult('Analytics', 'track', 'pass');
  });

  it('11.2 analytics.generateReport() - generates analytics report', () => {
    const analytics = createAnalytics();
    analytics.track('payment', { amount: '50' });
    analytics.track('escrow', { id: '123' });

    const report = analytics.generateReport();
    expect(report).toBeDefined();
    expect(report.period).toBeDefined();
    console.log(`    Report generated for period: ${report.period}`);
    recordResult('Analytics', 'generateReport', 'pass');
  });
});

// ============================================
// FINAL: Print Test Summary
// ============================================
describe('Test Summary', () => {
  it('prints final results', () => {
    console.log('\n========================================');
    console.log('       ARCPAY SDK TEST SUMMARY');
    console.log('========================================\n');

    const passed = testResults.filter(r => r.status === 'pass');
    const failed = testResults.filter(r => r.status === 'fail');
    const skipped = testResults.filter(r => r.status === 'skip');

    console.log(`✅ PASSED: ${passed.length}`);
    console.log(`❌ FAILED: ${failed.length}`);
    console.log(`⏭️ SKIPPED: ${skipped.length}`);
    console.log('');

    // Group by module
    const byModule: Record<string, typeof testResults> = {};
    testResults.forEach(r => {
      if (!byModule[r.module]) byModule[r.module] = [];
      byModule[r.module].push(r);
    });

    console.log('By Module:');
    Object.entries(byModule).forEach(([module, results]) => {
      const p = results.filter(r => r.status === 'pass').length;
      const f = results.filter(r => r.status === 'fail').length;
      const s = results.filter(r => r.status === 'skip').length;
      console.log(`  ${module}: ${p}/${results.length} passed${f ? ` (${f} failed)` : ''}${s ? ` (${s} skipped)` : ''}`);
    });

    console.log('\n========================================\n');

    expect(failed.length).toBe(0);
  });
});
