/**
 * AI Agent Commerce Example
 *
 * Demonstrates how an AI agent can autonomously handle payments,
 * create tasks, manage escrows, and stream payments.
 *
 * Run: npx ts-node examples/ai-agent-commerce.ts
 */

import { createAgent } from 'arcpay';
import 'dotenv/config';

async function main() {
  console.log('=== ArcPay AI Agent Commerce Example ===\n');

  // Create an AI agent with budget controls
  const agent = createAgent({
    privateKey: process.env.PRIVATE_KEY!,
    name: 'demo-agent',
    budget: {
      daily: '100',         // Max $100/day
      hourly: '25',         // Max $25/hour
      perTransaction: '10', // Max $10/transaction
    },
    autoApprove: true,
    verbose: true,
  });

  // Check agent's balance
  const balance = await agent.getBalance();
  console.log(`Agent balance: ${balance} USDC\n`);

  // 1. Pay for API service
  console.log('--- Paying for API Services ---');
  await agent.payForService('openai-api', '0.05');
  await agent.payForService('anthropic-api', '0.10');
  console.log('API payments completed\n');

  // 2. Create a task with escrow
  console.log('--- Creating Task with Escrow ---');
  const task = await agent.createTask({
    description: 'Write a technical blog post about blockchain',
    payment: '5',
    worker: '0x742d35Cc6634C0532925a3b844Bc9e7595f7ECEE', // Example worker
    deadline: '48h',
  });
  console.log(`Task created: ${task.id}`);
  console.log(`Escrow ID: ${task.escrowId}`);
  console.log(`Status: ${task.status}\n`);

  // 3. List all tasks
  console.log('--- All Tasks ---');
  const tasks = agent.listTasks();
  for (const t of tasks) {
    console.log(`- ${t.description}: ${t.payment} USDC (${t.status})`);
  }
  console.log();

  // 4. Get spending report
  console.log('--- Spending Report ---');
  const report = agent.getSpendingReport();
  console.log(`Total spent: ${report.totalSpent} USDC`);
  console.log(`Transactions: ${report.transactionCount}`);
  console.log(`Remaining daily budget: ${report.remainingBudget.daily} USDC`);
  console.log(`Remaining hourly budget: ${report.remainingBudget.hourly} USDC`);
  console.log('\nSpending by category:');
  for (const [category, amount] of Object.entries(report.byCategory)) {
    console.log(`  ${category}: ${amount} USDC`);
  }

  console.log('\n=== Demo Complete ===');
}

main().catch(console.error);
