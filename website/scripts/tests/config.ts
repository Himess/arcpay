/**
 * Test Configuration
 */

import { ethers } from 'ethers';
import { TestContext } from './types';

// Load environment variables from .env.local
import * as fs from 'fs';
import * as path from 'path';

function loadEnv(): Record<string, string> {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local not found. Run from website/ directory.');
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const env: Record<string, string> = {};

  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  }

  return env;
}

export function getTestContext(): TestContext {
  const env = loadEnv();

  const privateKey = env.TEST_PRIVATE_KEY || env.DEMO_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('TEST_PRIVATE_KEY or DEMO_PRIVATE_KEY not set');
  }

  const rpcUrl = env.NEXT_PUBLIC_RPC_URL || 'https://rpc.testnet.arc.network';
  const chainId = parseInt(env.NEXT_PUBLIC_CHAIN_ID || '5042002');

  // Calculate wallet address from private key
  const wallet = new ethers.Wallet(privateKey);

  return {
    rpcUrl,
    chainId,
    privateKey,
    walletAddress: wallet.address,
    contracts: {
      escrow: '0x0a982E2250F1C66487b88286e14D965025dD89D2',
      streamPayment: '0x4678D992De548bddCb5Cd4104470766b5207A855',
      stealthRegistry: '0xbC6d02dBDe96caE69680BDbB63f9A12a14F3a41B',
      agentRegistry: '0x5E3ef9A91AD33270f84B32ACFF91068Eea44c5ee',
      usdc: '0x3600000000000000000000000000000000000000',
      eurc: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
    },
    circleWallet: {
      id: env.CIRCLE_WALLET_ID || '7f5471f0-4261-5b00-836b-9a3746d13490',
      address: env.CIRCLE_WALLET_ADDRESS || '0x4cc48ea31173c5f14999222962a900ae2e945a1a',
    },
    apiBaseUrl: 'http://localhost:3000',
  };
}

// Provider singleton
let provider: ethers.JsonRpcProvider | null = null;

export function getProvider(): ethers.JsonRpcProvider {
  if (!provider) {
    const ctx = getTestContext();
    provider = new ethers.JsonRpcProvider(ctx.rpcUrl);
  }
  return provider;
}

// Signer singleton
let signer: ethers.Wallet | null = null;

export function getSigner(): ethers.Wallet {
  if (!signer) {
    const ctx = getTestContext();
    signer = new ethers.Wallet(ctx.privateKey, getProvider());
  }
  return signer;
}

// ERC20 ABI (minimal)
export const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

// Escrow ABI (from SDK - uses bytes32 IDs)
// Note: Contract doesn't include 'token' field in tuple - native USDC only
export const ESCROW_ABI = [
  'function createAndFundEscrow(address beneficiary, address arbiter, uint256 amount, uint256 expiresAt, string conditionHash) external payable returns (bytes32)',
  'function getEscrow(bytes32 escrowId) view returns (tuple(bytes32 id, address depositor, address beneficiary, address arbiter, uint256 amount, uint256 fundedAt, uint256 expiresAt, uint8 state, string conditionHash, uint256 releasedAmount, uint256 refundedAmount))',
  'function getUserEscrows(address user) view returns (bytes32[])',
  'function releaseEscrow(bytes32 escrowId)',
  'function refundEscrow(bytes32 escrowId)',
  'event EscrowCreated(bytes32 indexed id, address indexed depositor, address indexed beneficiary, address arbiter, uint256 amount, uint256 expiresAt)',
  'event EscrowFunded(bytes32 indexed id, uint256 amount, uint256 fundedAt)',
  'event EscrowReleased(bytes32 indexed id, address indexed beneficiary, uint256 amount)',
];

// Stream Payment ABI (from SDK - uses bytes32 IDs)
// Note: Contract doesn't include 'token' field in tuple - native USDC only
export const STREAM_ABI = [
  'function createStream(address recipient, uint256 totalAmount, uint256 duration) external payable returns (bytes32)',
  'function getStream(bytes32 streamId) view returns (tuple(bytes32 id, address sender, address recipient, uint256 totalAmount, uint256 claimedAmount, uint256 ratePerSecond, uint256 startTime, uint256 endTime, uint256 pausedAt, uint256 pausedDuration, uint8 state))',
  'function getSenderStreams(address sender) view returns (bytes32[])',
  'function getRecipientStreams(address recipient) view returns (bytes32[])',
  'function getClaimableAmount(bytes32 streamId) view returns (uint256)',
  'function claim(bytes32 streamId) returns (uint256)',
  'function cancelStream(bytes32 streamId)',
  'event StreamCreated(bytes32 indexed id, address indexed sender, address indexed recipient, uint256 totalAmount, uint256 ratePerSecond, uint256 startTime, uint256 endTime)',
  'event StreamClaimed(bytes32 indexed id, address indexed recipient, uint256 amount)',
  'event StreamCancelled(bytes32 indexed id, uint256 senderRefund, uint256 recipientPayment)',
];

// Stealth Registry ABI (from SDK)
export const STEALTH_ABI = [
  'function registerMetaAddress(bytes spendingPubKey, bytes viewingPubKey)',
  'function getMetaAddress(address user) view returns (tuple(bytes spendingPubKey, bytes viewingPubKey, uint256 registeredAt, bool active))',
  'function isRegistered(address user) view returns (bool)',
  'function sendStealthPayment(address stealthAddress, bytes ephemeralPubKey, bytes encryptedMemo) external payable returns (bytes32)',
  'event MetaAddressRegistered(address indexed user, bytes spendingPubKey, bytes viewingPubKey)',
  'event StealthPayment(bytes32 indexed id, address indexed stealthAddress, uint256 amount, bytes ephemeralPubKey, bytes encryptedMemo)',
];

// Agent Registry ABI (from SDK)
export const AGENT_ABI = [
  'function registerAgent(address agent, uint256 dailyBudget, uint256 perTxLimit)',
  'function getAgentConfig(address agent) view returns (tuple(address owner, uint256 dailyBudget, uint256 perTxLimit, uint256 todaySpent, uint256 lastResetTimestamp, bool active))',
  'function getAgentBalance(address agent) view returns (uint256)',
  'function updateAgent(address agent, uint256 newDailyBudget, uint256 newPerTxLimit)',
  'function deactivateAgent(address agent)',
  'function depositFundsNative(address agent) external payable',
  'event AgentRegistered(address indexed agent, address indexed owner, uint256 dailyBudget, uint256 perTxLimit)',
  'event AgentUpdated(address indexed agent, uint256 newDailyBudget, uint256 newPerTxLimit)',
  'event AgentDeactivated(address indexed agent)',
];

// Circle Transaction polling helper
export async function waitForCircleTransaction(
  transactionId: string,
  apiBaseUrl: string,
  maxWait = 30000
): Promise<{ txHash: string; explorerUrl: string; state: string }> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    try {
      const response = await fetch(`${apiBaseUrl}/api/circle/transaction/${transactionId}`);

      if (response.ok) {
        const data = await response.json();

        if (data.state === 'COMPLETE' && data.txHash) {
          return {
            txHash: data.txHash,
            explorerUrl: `https://testnet.arcscan.app/tx/${data.txHash}`,
            state: data.state,
          };
        }

        if (data.state === 'CONFIRMED' && data.txHash) {
          return {
            txHash: data.txHash,
            explorerUrl: `https://testnet.arcscan.app/tx/${data.txHash}`,
            state: data.state,
          };
        }

        if (data.state === 'FAILED' || data.state === 'DENIED') {
          throw new Error(`Transaction failed: ${data.state}`);
        }
      }
    } catch (error: any) {
      if (error.message.includes('failed')) {
        throw error;
      }
      // Continue polling on other errors
    }

    // Wait 2 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error(`Transaction timeout - did not complete within ${maxWait}ms`);
}
