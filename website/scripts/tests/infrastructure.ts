/**
 * Infrastructure Tests
 * Tests: RPC connection, chain ID, contract bytecode verification
 */

import { ethers } from 'ethers';
import { TestResult, runTest } from './types';
import { getTestContext, getProvider } from './config';

export async function runInfrastructureTests(): Promise<TestResult[]> {
  console.log('\n📦 Category 1: Infrastructure Tests');
  console.log('─'.repeat(40));

  const results: TestResult[] = [];
  const ctx = getTestContext();
  const provider = getProvider();

  // TEST_1_1: RPC Connection
  results.push(await runTest('TEST_1_1', 'RPC Connection (Arc Testnet)', 'Infrastructure', async () => {
    const blockNumber = await provider.getBlockNumber();
    if (blockNumber <= 0) {
      throw new Error('Invalid block number');
    }
    return { details: { blockNumber, rpcUrl: ctx.rpcUrl } };
  }));

  // TEST_1_2: Chain ID Verification
  results.push(await runTest('TEST_1_2', 'Chain ID Verification (5042002)', 'Infrastructure', async () => {
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    if (chainId !== ctx.chainId) {
      throw new Error(`Expected chain ID ${ctx.chainId}, got ${chainId}`);
    }
    return { details: { chainId, networkName: network.name } };
  }));

  // TEST_1_3: Escrow Contract Bytecode Check
  results.push(await runTest('TEST_1_3', 'Escrow Contract Bytecode Check', 'Infrastructure', async () => {
    const code = await provider.getCode(ctx.contracts.escrow);
    if (code === '0x' || code.length < 100) {
      throw new Error('No bytecode at escrow contract address');
    }
    return { details: { address: ctx.contracts.escrow, codeLength: code.length } };
  }));

  // TEST_1_4: Stream Contract Bytecode Check
  results.push(await runTest('TEST_1_4', 'Stream Contract Bytecode Check', 'Infrastructure', async () => {
    const code = await provider.getCode(ctx.contracts.streamPayment);
    if (code === '0x' || code.length < 100) {
      throw new Error('No bytecode at stream contract address');
    }
    return { details: { address: ctx.contracts.streamPayment, codeLength: code.length } };
  }));

  // TEST_1_5: Stealth Contract Bytecode Check
  results.push(await runTest('TEST_1_5', 'Stealth Contract Bytecode Check', 'Infrastructure', async () => {
    const code = await provider.getCode(ctx.contracts.stealthRegistry);
    if (code === '0x' || code.length < 100) {
      throw new Error('No bytecode at stealth registry address');
    }
    return { details: { address: ctx.contracts.stealthRegistry, codeLength: code.length } };
  }));

  return results;
}
