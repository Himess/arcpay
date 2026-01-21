/**
 * ArcPay SDK Comprehensive Test Runner
 *
 * Runs all 100 tests across 16 categories.
 *
 * Usage:
 *   npx tsx scripts/test-onchain.ts
 *   npx tsx scripts/test-onchain.ts --category=infrastructure
 *   npx tsx scripts/test-onchain.ts --verbose
 *   npx tsx scripts/test-onchain.ts --dry-run
 */

import * as fs from 'fs';
import * as path from 'path';
import { TestResult, TestSummary } from './tests/types';
import { getTestContext } from './tests/config';

// Import all test modules
import { runInfrastructureTests } from './tests/infrastructure';
import { runCorePaymentTests } from './tests/core-payments';
import { runEscrowTests } from './tests/escrow';
import { runStreamTests } from './tests/streams';
import { runPrivacyTests } from './tests/privacy';
import { runMicropaymentTests } from './tests/micropayments';
import { runGasStationTests } from './tests/circle-gasless';
import { runCircleWalletTests } from './tests/circle-wallets';
import { runGatewayTests } from './tests/circle-gateway';
import { runBridgeTests } from './tests/circle-bridge';
import { runAgentTests } from './tests/agents';
import { runSubscriptionTests } from './tests/subscriptions';
import { runAPITests } from './tests/api-endpoints';
import { runSDKModuleTests } from './tests/sdk-modules';
import { runUtilityTests } from './tests/utilities';
import { runComplianceTests } from './tests/compliance';

// Parse command line arguments
const args = process.argv.slice(2);
const categoryFilter = args.find(a => a.startsWith('--category='))?.split('=')[1];
const verbose = args.includes('--verbose');
const dryRun = args.includes('--dry-run');

// Test category mapping
const testCategories: Record<string, () => Promise<TestResult[]>> = {
  infrastructure: runInfrastructureTests,
  'core-payments': runCorePaymentTests,
  escrow: runEscrowTests,
  streams: runStreamTests,
  privacy: runPrivacyTests,
  micropayments: runMicropaymentTests,
  'circle-gasless': runGasStationTests,
  'circle-wallets': runCircleWalletTests,
  'circle-gateway': runGatewayTests,
  'circle-bridge': runBridgeTests,
  agents: runAgentTests,
  subscriptions: runSubscriptionTests,
  'api-endpoints': runAPITests,
  'sdk-modules': runSDKModuleTests,
  utilities: runUtilityTests,
  compliance: runComplianceTests,
};

async function runAllTests(): Promise<TestSummary> {
  const results: TestResult[] = [];
  const startTime = Date.now();

  console.log('');
  console.log('═'.repeat(60));
  console.log('  ArcPay SDK Comprehensive Test Suite');
  console.log('═'.repeat(60));
  console.log('');

  // Show test context
  try {
    const ctx = getTestContext();
    console.log('📋 Test Configuration:');
    console.log(`   RPC URL: ${ctx.rpcUrl}`);
    console.log(`   Chain ID: ${ctx.chainId}`);
    console.log(`   Test Wallet: ${ctx.walletAddress}`);
    console.log(`   Circle Wallet: ${ctx.circleWallet.address}`);
    console.log('');
  } catch (error: any) {
    console.error('❌ Configuration Error:', error.message);
    console.log('   Make sure .env.local is configured with TEST_PRIVATE_KEY');
    process.exit(1);
  }

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No transactions will be executed');
    console.log('');
  }

  // Determine which categories to run
  const categoriesToRun = categoryFilter
    ? [categoryFilter]
    : Object.keys(testCategories);

  // Run test categories
  for (const category of categoriesToRun) {
    const testFn = testCategories[category];

    if (!testFn) {
      console.log(`⚠️  Unknown category: ${category}`);
      continue;
    }

    try {
      const categoryResults = await testFn();
      results.push(...categoryResults);
    } catch (error: any) {
      console.log(`❌ Category ${category} failed: ${error.message}`);
      results.push({
        id: `${category}_ERROR`,
        name: `Category ${category} Error`,
        category,
        passed: false,
        duration: 0,
        error: error.message,
      });
    }
  }

  // Calculate onchain statistics
  const onchainTxCount = results.filter(r => r.isOnchain).length;
  const mockTestCount = results.filter(r => r.isMock).length;
  const totalNonMock = results.length - mockTestCount;
  const onchainPercentage = totalNonMock > 0
    ? Math.round((onchainTxCount / totalNonMock) * 100)
    : 0;

  // Calculate summary
  const summary: TestSummary = {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed && !r.error?.includes('SKIPPED')).length,
    skipped: results.filter(r => r.error?.includes('SKIPPED')).length,
    duration: Date.now() - startTime,
    results,
    onchainStats: {
      onchainTxCount,
      mockTestCount,
      onchainPercentage,
    },
  };

  // Save results to file
  const resultsDir = path.join(process.cwd(), 'scripts', 'test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const resultsPath = path.join(resultsDir, `${Date.now()}.json`);
  // Handle BigInt serialization
  const jsonString = JSON.stringify(summary, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  , 2);
  fs.writeFileSync(resultsPath, jsonString);

  // Print summary
  console.log('');
  console.log('═'.repeat(60));
  console.log('  TEST SUMMARY');
  console.log('═'.repeat(60));
  console.log('');
  console.log(`  📊 Total Tests:  ${summary.totalTests}`);
  console.log(`  ✅ Passed:       ${summary.passed}`);
  console.log(`  ❌ Failed:       ${summary.failed}`);
  console.log(`  ⏭️  Skipped:      ${summary.skipped}`);
  console.log(`  ⏱️  Duration:     ${(summary.duration / 1000).toFixed(2)}s`);
  console.log('');

  // Print pass rate
  const passRate = ((summary.passed / summary.totalTests) * 100).toFixed(1);
  console.log(`  📈 Pass Rate:    ${passRate}%`);
  console.log('');

  // Print onchain statistics
  console.log('─'.repeat(60));
  console.log('  🔗 ONCHAIN STATISTICS');
  console.log('─'.repeat(60));
  console.log(`  🔗 Real TX Count:    ${summary.onchainStats.onchainTxCount}`);
  console.log(`  📋 Mock/Local Tests: ${summary.onchainStats.mockTestCount}`);
  console.log(`  📈 Onchain Rate:     ${summary.onchainStats.onchainPercentage}% (of non-mock tests)`);
  console.log('');

  // List all onchain transactions
  const onchainTests = results.filter(r => r.isOnchain);
  if (onchainTests.length > 0) {
    console.log('  📜 Onchain Transactions:');
    for (const test of onchainTests) {
      console.log(`     ${test.id}: ${test.explorerUrl}`);
    }
    console.log('');
  }

  // Print failed tests
  if (summary.failed > 0) {
    console.log('  ❌ Failed Tests:');
    const failedTests = results.filter(r => !r.passed && !r.error?.includes('SKIPPED'));
    for (const test of failedTests) {
      console.log(`     - ${test.id}: ${test.name}`);
      if (verbose && test.error) {
        console.log(`       Error: ${test.error}`);
      }
    }
    console.log('');
  }

  // Print skipped tests
  if (summary.skipped > 0 && verbose) {
    console.log('  ⏭️  Skipped Tests:');
    const skippedTests = results.filter(r => r.error?.includes('SKIPPED'));
    for (const test of skippedTests) {
      console.log(`     - ${test.id}: ${test.name}`);
      console.log(`       Reason: ${test.error?.replace('SKIPPED: ', '')}`);
    }
    console.log('');
  }

  console.log(`  📁 Results saved to: ${resultsPath}`);
  console.log('');
  console.log('═'.repeat(60));

  // Success criteria check
  const successThreshold = 95;
  if (summary.passed >= summary.totalTests * (successThreshold / 100)) {
    console.log(`  🎉 SUCCESS! Pass rate meets ${successThreshold}% threshold`);
  } else {
    console.log(`  ⚠️  Pass rate below ${successThreshold}% threshold`);
  }
  console.log('═'.repeat(60));
  console.log('');

  return summary;
}

// Run tests
runAllTests()
  .then(summary => {
    process.exit(summary.failed > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
