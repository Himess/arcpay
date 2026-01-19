/**
 * ArcPay SDK Live Demo
 *
 * This script demonstrates all major features of the ArcPay SDK
 * running against Arc Testnet with real USDC transactions.
 *
 * Prerequisites:
 * - Set PRIVATE_KEY in .env with a funded Arc Testnet wallet
 * - Have at least 10 USDC in the wallet
 *
 * Usage:
 * npx ts-node examples/live-demo.ts
 */

import { config } from 'dotenv';
config();

import {
  ArcPay,
  retry,
  CircuitBreaker,
  FallbackRPCManager,
  EventEmitter,
  EventType,
  TransactionWatcher,
  Logger,
  createLogger,
  NetworkError,
  ValidationError,
} from '../src';

// Configuration
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const DEMO_RECIPIENT = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

// Demo logger
const logger = createLogger({
  name: 'arcpay-demo',
  level: 'info',
  pretty: true,
});

// Color helpers for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function header(text: string) {
  console.log('\n' + colors.bright + colors.cyan + '═'.repeat(60) + colors.reset);
  console.log(colors.bright + colors.cyan + '  ' + text + colors.reset);
  console.log(colors.bright + colors.cyan + '═'.repeat(60) + colors.reset + '\n');
}

function subHeader(text: string) {
  console.log('\n' + colors.yellow + '▸ ' + text + colors.reset);
}

function success(text: string) {
  console.log(colors.green + '  ✓ ' + text + colors.reset);
}

function info(text: string) {
  console.log(colors.blue + '  ℹ ' + text + colors.reset);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  header('ArcPay SDK Live Demo');

  if (!PRIVATE_KEY) {
    console.error('Error: PRIVATE_KEY not set in environment');
    console.log('Please set PRIVATE_KEY in .env file or environment variable');
    process.exit(1);
  }

  try {
    // ═══════════════════════════════════════════════════════════
    // 1. Initialize SDK
    // ═══════════════════════════════════════════════════════════
    subHeader('1. Initializing ArcPay SDK');

    const arc = await ArcPay.init({
      network: 'arc-testnet',
      privateKey: PRIVATE_KEY,
    });

    const network = arc.getNetwork();
    success(`Connected to ${network.name} (Chain ID: ${network.chainId})`);

    const balance = await arc.getBalance();
    success(`Wallet balance: ${balance.formatted} USDC`);

    // ═══════════════════════════════════════════════════════════
    // 2. Error Handling Demo
    // ═══════════════════════════════════════════════════════════
    subHeader('2. Error Handling System');

    try {
      // Simulate a network error
      throw new NetworkError('Simulated RPC failure', {
        metadata: { endpoint: 'https://rpc.testnet.arc.network' },
      });
    } catch (error) {
      if (error instanceof NetworkError) {
        success('NetworkError caught with proper typing');
        info(`  Retryable: ${error.retryable}`);
        info(`  Recovery: ${error.recovery}`);
      }
    }

    try {
      throw new ValidationError('Invalid address format', {
        metadata: { address: '0xinvalid' },
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        success('ValidationError caught with metadata');
        info(`  Code: ${error.code}`);
      }
    }

    // ═══════════════════════════════════════════════════════════
    // 3. Retry & Resilience Demo
    // ═══════════════════════════════════════════════════════════
    subHeader('3. Retry & Resilience System');

    // Retry with exponential backoff
    let attemptCount = 0;
    const retryResult = await retry(
      async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return 'Success after retries!';
      },
      {
        maxAttempts: 5,
        initialDelayMs: 100,
        jitter: true,
        onRetry: (error, attempt, delay) => {
          info(`  Retry attempt ${attempt}, waiting ${delay}ms...`);
        },
      }
    );
    success(`Retry completed: ${retryResult}`);

    // Circuit Breaker
    const breaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 5000,
      successThreshold: 2,
      onStateChange: (from, to) => {
        info(`  Circuit state: ${from} → ${to}`);
      },
    });

    success(`Circuit breaker initialized (state: ${breaker.getState()})`);

    // Fallback RPC Manager
    const rpcManager = new FallbackRPCManager({
      endpoints: [
        'https://rpc.testnet.arc.network',
        'https://rpc-backup.testnet.arc.network',
      ],
      useCircuitBreaker: true,
    });

    success('Fallback RPC manager configured with 2 endpoints');

    // ═══════════════════════════════════════════════════════════
    // 4. Event System Demo
    // ═══════════════════════════════════════════════════════════
    subHeader('4. Event Emitter System');

    const emitter = new EventEmitter({ maxHistorySize: 1000 });

    // Subscribe to events
    emitter.on(EventType.TRANSACTION_PENDING, (event) => {
      info(`  Event received: ${event.type}`);
    });

    emitter.on(EventType.TRANSACTION_CONFIRMED, (event) => {
      info(`  Transaction confirmed: ${event.data?.hash}`);
    });

    // Emit test events
    await emitter.emit(EventType.TRANSACTION_PENDING, {
      type: EventType.TRANSACTION_PENDING,
      source: 'demo',
      data: {
        hash: '0xdemo123',
        from: '0xsender',
        to: '0xrecipient',
        value: '1000000',
      },
    });

    success('Event system working');

    // Event history
    const history = emitter.getHistory();
    success(`Event history contains ${history.length} events`);

    // ═══════════════════════════════════════════════════════════
    // 5. Logging System Demo
    // ═══════════════════════════════════════════════════════════
    subHeader('5. Structured Logging');

    const txLogger = logger.withTransaction('0xdemo', '0xsender', '0xrecipient');
    txLogger.info('Processing payment', { amount: '100', currency: 'USDC' });

    const timer = logger.startTimer('sample-operation');
    await sleep(100);
    timer();

    success('Structured logging with pino');

    // ═══════════════════════════════════════════════════════════
    // 6. Real Transaction Demo (Optional)
    // ═══════════════════════════════════════════════════════════
    subHeader('6. Real Transaction Demo');

    const currentBalance = parseFloat(balance.formatted);
    if (currentBalance >= 0.01) {
      info('Sending 0.001 USDC to demo recipient...');

      const txResult = await arc.sendUSDC(DEMO_RECIPIENT, '0.001');

      if (txResult.success) {
        success(`Transaction sent: ${txResult.hash}`);
        info(`  Block: ${txResult.blockNumber}`);

        const newBalance = await arc.getBalance();
        success(`New balance: ${newBalance.formatted} USDC`);
      }
    } else {
      info('Skipping real transaction (insufficient balance)');
      info('Deposit USDC to your wallet to enable this demo');
    }

    // ═══════════════════════════════════════════════════════════
    // 7. SDK Modules Overview
    // ═══════════════════════════════════════════════════════════
    subHeader('7. Available SDK Modules');

    const modules = [
      { name: 'Micropayments', desc: 'x402 protocol for pay-per-use APIs' },
      { name: 'Paymaster', desc: 'Gas sponsorship for your users' },
      { name: 'Streaming', desc: 'Real-time per-second payments' },
      { name: 'Intent', desc: 'Natural language payment commands' },
      { name: 'Privacy', desc: 'Stealth address payments' },
      { name: 'Combo', desc: 'Combined payment workflows' },
      { name: 'Gas Station', desc: 'Circle-style gas sponsorship' },
      { name: 'Smart Wallet', desc: 'ERC-4337 account abstraction' },
      { name: 'Channels', desc: 'x402 payment channels' },
      { name: 'AI Wallet', desc: 'Natural language wallet control' },
      { name: 'Compliance', desc: 'KYC/AML/Sanctions screening' },
      { name: 'Escrow', desc: 'Multi-party conditional payments' },
    ];

    modules.forEach((m) => {
      info(`${m.name}: ${m.desc}`);
    });

    // ═══════════════════════════════════════════════════════════
    // Summary
    // ═══════════════════════════════════════════════════════════
    header('Demo Complete!');

    console.log('ArcPay SDK is ready for autonomous commerce on Arc blockchain.');
    console.log('\nKey Features Demonstrated:');
    console.log('  • Error handling with typed errors and recovery hints');
    console.log('  • Retry with exponential backoff and jitter');
    console.log('  • Circuit breaker for fault tolerance');
    console.log('  • Event system for real-time notifications');
    console.log('  • Structured logging with pino');
    console.log('  • Real USDC transactions on Arc Testnet');
    console.log('\nFor more examples, see the /examples directory.');
    console.log('Documentation: https://arcpay.vercel.app');
  } catch (error) {
    console.error('Demo failed:', error);
    process.exit(1);
  }
}

main();
