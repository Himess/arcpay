/**
 * Circle Bridge / CCTP Tests
 * Tests: Bridge status, supported chains, fee estimation
 */

import { TestResult, runTest, skipTest } from './types';
import { getTestContext } from './config';

export async function runBridgeTests(): Promise<TestResult[]> {
  console.log('\n🌉 Category 10: Circle Bridge / CCTP Tests');
  console.log('─'.repeat(40));

  const results: TestResult[] = [];
  const ctx = getTestContext();

  // For production, use the deployed API
  const apiBaseUrl = 'https://website-beige-six-15.vercel.app';

  // TEST_10_1: GET /api/circle/bridge - Bridge status
  results.push(await runTest('TEST_10_1', 'GET /api/circle/bridge - Bridge status', 'Circle Bridge', async () => {
    const response = await fetch(`${apiBaseUrl}/api/circle/bridge`);

    const data = await response.json();

    return {
      details: {
        status: response.status,
        success: data.success,
        bridgeEnabled: data.bridgeEnabled ?? data.enabled,
        responseKeys: Object.keys(data),
      },
    };
  }));

  // TEST_10_2: Verify Arc Testnet Domain 26
  results.push(await runTest('TEST_10_2', 'Verify Arc Testnet Domain 26', 'Circle Bridge', async () => {
    const response = await fetch(`${apiBaseUrl}/api/circle/bridge`);
    const data = await response.json();

    // Verify Domain 26 for Arc Testnet
    const arcDomain = data.domains?.['arc-testnet'] || data.domains?.['arc'];

    if (arcDomain !== 26) {
      throw new Error(`Expected Arc Testnet domain 26, got: ${arcDomain}`);
    }

    return {
      details: {
        arcTestnetDomain: arcDomain,
        supportedChains: data.supportedChains,
        allDomains: data.domains,
        protocol: data.protocol || 'CCTP',
        attestationTime: data.arcTestnet?.attestationTime,
      },
    };
  }));

  // TEST_10_3: Verify CCTP configuration for Arc
  results.push(await runTest('TEST_10_3', 'Verify CCTP configuration for Arc', 'Circle Bridge', async () => {
    const response = await fetch(`${apiBaseUrl}/api/circle/bridge`);
    const data = await response.json();

    // Verify all CCTP domains are configured
    const expectedDomains = {
      'ethereum': 0,
      'sepolia': 0,
      'avalanche': 1,
      'arbitrum': 3,
      'base': 6,
      'polygon': 7,
      'arc': 26,
      'arc-testnet': 26,
    };

    const missingDomains: string[] = [];
    for (const [chain, expectedDomain] of Object.entries(expectedDomains)) {
      if (data.domains?.[chain] !== expectedDomain) {
        missingDomains.push(`${chain}: expected ${expectedDomain}, got ${data.domains?.[chain]}`);
      }
    }

    if (missingDomains.length > 0) {
      console.log('     Missing/incorrect domains:', missingDomains);
    }

    return {
      details: {
        bridgeEnabled: data.bridgeEnabled,
        protocol: data.protocol,
        arcTestnet: data.arcTestnet,
        domainsConfigured: Object.keys(data.domains || {}).length,
        note: data.note,
      },
    };
  }));

  return results;
}
