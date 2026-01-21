/**
 * Test Types and Utilities for ArcPay Onchain Tests
 */

export interface TestResult {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  duration: number;
  txHash?: string;
  explorerUrl?: string;
  error?: string;
  details?: any;
  isOnchain?: boolean;   // True if test produced a real blockchain transaction
  isMock?: boolean;      // True if test uses local/mock data
}

export interface TestSummary {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  results: TestResult[];
  onchainStats: {
    onchainTxCount: number;      // Tests that produced real TXs
    mockTestCount: number;       // Tests using mock/local data
    onchainPercentage: number;   // % of tests that are real onchain
  };
}

export interface TestContext {
  rpcUrl: string;
  chainId: number;
  privateKey: string;
  walletAddress: string;
  contracts: {
    escrow: string;
    streamPayment: string;
    stealthRegistry: string;
    agentRegistry: string;
    usdc: string;
    eurc: string;
  };
  circleWallet: {
    id: string;
    address: string;
  };
  apiBaseUrl: string;
}

// Categories that are known to be mock/local (no onchain TX)
const MOCK_CATEGORIES = ['Subscriptions', 'Compliance', 'Utilities', 'Contacts'];

// Test runner helper
export async function runTest(
  id: string,
  name: string,
  category: string,
  testFn: () => Promise<{ txHash?: string; details?: any }>
): Promise<TestResult> {
  const startTime = Date.now();
  const isMockCategory = MOCK_CATEGORIES.includes(category);

  try {
    const result = await testFn();
    const duration = Date.now() - startTime;
    const hasOnchainTx = !!result.txHash;

    const emoji = hasOnchainTx ? '🔗' : (isMockCategory ? '📋' : '✅');
    console.log(`  ${emoji} ${id}: ${name} (${duration}ms)`);
    if (result.txHash) {
      console.log(`     TX: https://testnet.arcscan.app/tx/${result.txHash}`);
    }

    // Add rate limit delay between tests
    await sleep(RATE_LIMIT_DELAY);

    return {
      id,
      name,
      category,
      passed: true,
      duration,
      txHash: result.txHash,
      explorerUrl: result.txHash ? `https://testnet.arcscan.app/tx/${result.txHash}` : undefined,
      details: result.details,
      isOnchain: hasOnchainTx,
      isMock: isMockCategory,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isSkipped = error.message?.includes('SKIPPED');

    if (isSkipped) {
      console.log(`  ⏭️  ${id}: ${name} - SKIPPED`);
    } else {
      console.log(`  ❌ ${id}: ${name} - ${error.message}`);
    }

    // Add rate limit delay even after failures
    await sleep(RATE_LIMIT_DELAY);

    return {
      id,
      name,
      category,
      passed: false,
      duration,
      error: error.message || 'Unknown error',
      isOnchain: false,
      isMock: isMockCategory,
    };
  }
}

// Helper to skip a test
export function skipTest(reason: string): never {
  throw new Error(`SKIPPED: ${reason}`);
}

// Helper to wait for transaction
export async function waitForTx(provider: any, txHash: string, timeout = 30000): Promise<any> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const receipt = await provider.getTransactionReceipt(txHash);
    if (receipt) {
      if (receipt.status === 0) {
        throw new Error(`Transaction failed: ${txHash}`);
      }
      return receipt;
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error(`Transaction timeout: ${txHash}`);
}

// Format USDC amount (18 decimals on Arc)
export function formatUSDC(amount: bigint): string {
  const whole = amount / BigInt(10 ** 18);
  const fraction = amount % BigInt(10 ** 18);
  const fractionStr = fraction.toString().padStart(18, '0').slice(0, 6);
  return `${whole}.${fractionStr}`;
}

// Parse USDC amount to bigint
export function parseUSDC(amount: string): bigint {
  const [whole, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(18, '0').slice(0, 18);
  return BigInt(whole) * BigInt(10 ** 18) + BigInt(paddedFraction);
}

// Sleep helper
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Rate limit delay - used between tests to avoid RPC throttling
export const RATE_LIMIT_DELAY = 500; // ms
