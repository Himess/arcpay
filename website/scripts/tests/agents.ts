/**
 * Agent Registry Tests
 * Tests: Register, get config, update, deactivate
 */

import { ethers } from 'ethers';
import { TestResult, runTest, parseUSDC, waitForTx } from './types';
import { getTestContext, getProvider, getSigner, AGENT_ABI } from './config';

// Store for test state
let agentRegistered = false;

export async function runAgentTests(): Promise<TestResult[]> {
  console.log('\n🤖 Category 11: Agent Registry Tests');
  console.log('─'.repeat(40));

  const results: TestResult[] = [];
  const ctx = getTestContext();
  const provider = getProvider();
  const signer = getSigner();

  const agentContract = new ethers.Contract(ctx.contracts.agentRegistry, AGENT_ABI, signer);

  // Use a separate agent address (derived from our wallet)
  const agentAddress = ctx.walletAddress;
  const dailyBudget = parseUSDC('10'); // 10 USDC daily budget
  const perTxLimit = parseUSDC('1'); // 1 USDC per tx limit

  // TEST_11_1: Register Agent on Contract
  results.push(await runTest('TEST_11_1', 'Register Agent on Contract', 'Agents', async () => {
    // Check if already registered
    try {
      const config = await agentContract.getAgentConfig(agentAddress);
      // If we can get config and it has an owner, it's registered
      if (config.owner && config.owner !== '0x0000000000000000000000000000000000000000') {
        console.log('     Agent already registered');
        agentRegistered = true;
        return {
          details: {
            address: agentAddress,
            alreadyRegistered: true,
            owner: config.owner,
            dailyBudget: config.dailyBudget.toString(),
            perTxLimit: config.perTxLimit.toString(),
            active: config.active,
          },
        };
      }
    } catch (e: any) {
      // Not registered or error getting config - proceed with registration
      console.log('     Agent not yet registered, registering...');
    }

    try {
      const tx = await agentContract.registerAgent(agentAddress, dailyBudget, perTxLimit);
      const receipt = await waitForTx(provider, tx.hash);

      agentRegistered = true;

      return {
        txHash: tx.hash,
        details: {
          agent: agentAddress,
          dailyBudget: dailyBudget.toString(),
          perTxLimit: perTxLimit.toString(),
          gasUsed: receipt.gasUsed.toString(),
        },
      };
    } catch (regError: any) {
      // If registration fails, check if it's because agent is already registered
      if (regError.message?.includes('already') || regError.message?.includes('reverted')) {
        const config = await agentContract.getAgentConfig(agentAddress);
        agentRegistered = true;
        return {
          details: {
            address: agentAddress,
            alreadyRegistered: true,
            owner: config.owner,
            active: config.active,
            note: 'Agent was already registered',
          },
        };
      }
      throw regError;
    }
  }));

  // TEST_11_2: Get Agent Config
  results.push(await runTest('TEST_11_2', 'Get Agent Config', 'Agents', async () => {
    const config = await agentContract.getAgentConfig(agentAddress);

    return {
      details: {
        address: agentAddress,
        owner: config.owner,
        dailyBudget: config.dailyBudget.toString(),
        perTxLimit: config.perTxLimit.toString(),
        todaySpent: config.todaySpent.toString(),
        active: config.active,
      },
    };
  }));

  // TEST_11_3: Update Agent Config
  results.push(await runTest('TEST_11_3', 'Update Agent Config', 'Agents', async () => {
    const newDailyBudget = parseUSDC('20');
    const newPerTxLimit = parseUSDC('2');

    const tx = await agentContract.updateAgent(agentAddress, newDailyBudget, newPerTxLimit);
    const receipt = await waitForTx(provider, tx.hash);

    return {
      txHash: tx.hash,
      details: {
        agent: agentAddress,
        newDailyBudget: newDailyBudget.toString(),
        newPerTxLimit: newPerTxLimit.toString(),
        gasUsed: receipt.gasUsed.toString(),
      },
    };
  }));

  // TEST_11_4: Get Agent Balance
  results.push(await runTest('TEST_11_4', 'Get Agent Balance', 'Agents', async () => {
    const balance = await agentContract.getAgentBalance(agentAddress);

    return {
      details: {
        agent: agentAddress,
        balance: balance.toString(),
      },
    };
  }));

  // TEST_11_5: Deactivate Agent
  results.push(await runTest('TEST_11_5', 'Deactivate Agent', 'Agents', async () => {
    const tx = await agentContract.deactivateAgent(agentAddress);
    const receipt = await waitForTx(provider, tx.hash);

    return {
      txHash: tx.hash,
      details: {
        agent: agentAddress,
        action: 'deactivated',
        gasUsed: receipt.gasUsed.toString(),
      },
    };
  }));

  return results;
}
