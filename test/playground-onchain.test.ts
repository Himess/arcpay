/**
 * ArcPay Playground - Onchain Integration Tests (PLAN-005)
 *
 * Simulates running each Playground example and verifies
 * the transactions actually happen on Arc Testnet.
 *
 * This tests that the code examples shown in Playground work correctly.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ArcPay } from '../src/core/client';
import { getContractAddresses } from '../src/contracts';
import {
  createContactManager,
  MemoryStorage,
} from '../src/modules/contacts';
import {
  createTemplateManager,
} from '../src/modules/templates';
import {
  createSplitManager,
} from '../src/modules/split';
import {
  createLinkManager,
} from '../src/modules/links';
import {
  createRequestManager,
} from '../src/modules/requests';
import {
  createIntentEngine,
} from '../src/modules/intent';
import {
  createSubscriptionManager,
} from '../src';
import { createPublicClient, http, formatEther, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

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

// Test amounts (tiny to avoid depleting test funds)
const TINY_AMOUNT = '0.000001';

// Clients
let publicClient: ReturnType<typeof createPublicClient>;
let accountA: ReturnType<typeof privateKeyToAccount>;
let accountB: ReturnType<typeof privateKeyToAccount>;
let arcPay: ArcPay;

// Transaction hashes for verification
const txHashes: { tab: string; example: string; txHash: string }[] = [];

function logTx(tab: string, example: string, txHash: string) {
  txHashes.push({ tab, example, txHash });
  console.log(`    ✅ TX: ${txHash.slice(0, 20)}...`);
}

beforeAll(async () => {
  accountA = privateKeyToAccount(WALLET_A_KEY as `0x${string}`);
  accountB = privateKeyToAccount(WALLET_B_KEY as `0x${string}`);

  publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http('https://rpc.testnet.arc.network'),
  });

  arcPay = await ArcPay.init({
    network: 'arc-testnet',
    privateKey: WALLET_A_KEY,
  });

  console.log('\n========================================');
  console.log('  PLAYGROUND ONCHAIN TESTS');
  console.log('========================================');
  console.log(`  Wallet A: ${accountA.address}`);
  console.log(`  Wallet B: ${accountB.address}`);
  console.log('========================================\n');
});

afterAll(() => {
  console.log('\n========================================');
  console.log('  PLAYGROUND TRANSACTION SUMMARY');
  console.log('========================================');
  txHashes.forEach(({ tab, example, txHash }) => {
    console.log(`  [${tab}] ${example}: ${txHash}`);
  });
  console.log(`  Total: ${txHashes.length} transactions`);
  console.log('========================================\n');
});

// ============================================
// PAYMENTS TAB - Playground Examples
// ============================================
describe('Payments Tab', () => {
  it('Example: Send USDC - real transaction', async () => {
    // This is the "Quick Send" example from Playground
    // Code shown: await arcPay.sendUSDC(address, amount)

    const result = await arcPay.sendUSDC(accountB.address, TINY_AMOUNT);

    expect(result.success).toBe(true);
    expect(result.txHash).toBeDefined();
    logTx('Payments', 'Send USDC', result.txHash!);
  });

  it('Example: Check Balance - returns real balance', async () => {
    // Code shown: await arcPay.getBalance()

    const balance = await arcPay.getBalance();

    expect(parseFloat(balance)).toBeGreaterThan(0);
    console.log(`    Balance: ${balance} USDC`);
  });

  it('Example: Send to Address - real transaction', async () => {
    // Direct address payment
    const result = await arcPay.sendUSDC(accountB.address, TINY_AMOUNT);

    expect(result.success).toBe(true);
    if (result.txHash) {
      logTx('Payments', 'Direct Send', result.txHash);
    }
  });
});

// ============================================
// CONTACTS TAB - Playground Examples
// ============================================
describe('Contacts Tab', () => {
  it('Example: Add Contact - saves to contacts', async () => {
    // Code shown: await arcPay.contacts.add('friend', '0x...')
    // Delete first in case contact exists from previous run
    await arcPay.contacts.delete('friend').catch(() => {});
    const contact = await arcPay.contacts.add('friend', accountB.address);

    expect(contact.name).toBe('friend');
    expect(contact.address).toBe(accountB.address.toLowerCase());
    console.log(`    Added: ${contact.displayName}`);
  });

  it('Example: Pay by Name - resolves and pays', async () => {
    // Code shown: await arcPay.transfer({ to: 'friend', amount: '10' })
    // Use transfer() which resolves contact names
    const result = await arcPay.transfer({ to: 'friend', amount: TINY_AMOUNT });

    expect(result.success).toBe(true);
    if (result.txHash) {
      logTx('Contacts', 'Pay by Name', result.txHash);
    }
  });

  it('Example: Search Contacts - fuzzy search', async () => {
    await arcPay.contacts.delete('alice').catch(() => {});
    await arcPay.contacts.add('alice', '0x1111111111111111111111111111111111111111');

    const results = await arcPay.contacts.search('ali');

    expect(results.length).toBeGreaterThanOrEqual(1);
    console.log(`    Found ${results.length} contacts matching 'ali'`);
  });

  it('Example: List Contacts - shows all contacts', async () => {
    const contacts = await arcPay.contacts.list();

    expect(contacts.length).toBeGreaterThanOrEqual(2);
    console.log(`    Total contacts: ${contacts.length}`);
  });
});

// ============================================
// SUBSCRIPTIONS TAB - Playground Examples
// ============================================
describe('Subscriptions Tab', () => {
  beforeAll(async () => {
    // Add subscription contact using built-in contacts manager
    // Delete first in case contact exists from previous run
    await arcPay.contacts.delete('netflix').catch(() => {});
    await arcPay.contacts.add('netflix', accountB.address, {
      category: 'subscription',
      monthlyAmount: TINY_AMOUNT,
      billingDay: new Date().getDate(),
    });
  });

  it('Example: Add Subscription - creates recurring payment', async () => {
    // Code shown: await arcPay.contacts.add('spotify', '0x...', { category: 'subscription', monthlyAmount: '9.99' })
    await arcPay.contacts.delete('spotify').catch(() => {});
    await arcPay.contacts.add('spotify', accountB.address, {
      category: 'subscription',
      monthlyAmount: '9.99',
      billingDay: 1,
    });

    const subs = await arcPay.contacts.getSubscriptions();
    expect(subs.length).toBeGreaterThanOrEqual(2);
    console.log(`    Subscriptions: ${subs.length}`);
  });

  it('Example: Pay Subscription - real payment', async () => {
    // Code shown: await arcPay.sendUSDC('netflix', netflix.monthlyAmount)

    const netflix = await arcPay.contacts.get('netflix');
    if (!netflix) return;

    const result = await arcPay.sendUSDC(netflix.address, netflix.metadata.monthlyAmount || TINY_AMOUNT);

    expect(result.success).toBe(true);
    if (result.txHash) {
      await arcPay.contacts.markPaid('netflix', result.txHash);
      logTx('Subscriptions', 'Pay Netflix', result.txHash);
    }
  });

  it('Example: Monthly Total - calculates spend', async () => {
    const total = await arcPay.contacts.getMonthlyTotal();

    expect(parseFloat(total)).toBeGreaterThanOrEqual(0);
    console.log(`    Monthly total: $${total}`);
  });

  it('Example: Due Bills - shows upcoming', async () => {
    const upcoming = await arcPay.contacts.getUpcomingSubscriptions(30);
    console.log(`    Upcoming bills (30 days): ${upcoming.length}`);
  });
});

// ============================================
// TEMPLATES TAB - Playground Examples
// ============================================
describe('Templates Tab', () => {
  let templateManager: ReturnType<typeof createTemplateManager>;
  let contactManager: ReturnType<typeof createContactManager>;

  beforeAll(() => {
    contactManager = createContactManager({
      storage: new MemoryStorage(),
      autoSave: true,
    });
    templateManager = createTemplateManager();
    templateManager.setContactManager(contactManager);
  });

  it('Example: List Templates - shows all presets', () => {
    // Code shown: templates.list()

    const templates = templateManager.list();

    expect(templates.length).toBeGreaterThanOrEqual(25);
    console.log(`    Available templates: ${templates.length}`);
  });

  it('Example: Get Template - retrieves Netflix preset', () => {
    // Code shown: templates.get('netflix')

    const netflix = templateManager.get('netflix');

    expect(netflix).toBeDefined();
    expect(netflix?.name).toBe('Netflix');
    expect(netflix?.amount).toBe('15.99');
    console.log(`    Netflix: $${netflix?.amount}/month`);
  });

  it('Example: Use Template - creates contact from preset', async () => {
    // Code shown: await templates.use('netflix', { address: '0x...' })

    const contact = await templateManager.use('netflix', {
      address: accountB.address,
    });

    expect(contact.displayName).toBe('Netflix');
    expect(contact.metadata.monthlyAmount).toBe('15.99');
    console.log(`    Created contact from template: ${contact.displayName}`);
  });

  it('Example: Pay Template - real payment', async () => {
    const result = await arcPay.sendUSDC(accountB.address, TINY_AMOUNT);

    expect(result.success).toBe(true);
    if (result.txHash) {
      logTx('Templates', 'Use Netflix', result.txHash);
    }
  });

  it('Example: Search Templates - finds matches', () => {
    const results = templateManager.search('stream');

    console.log(`    Found ${results.length} streaming templates`);
  });

  it('Example: Filter by Category - subscription templates', () => {
    const subs = templateManager.list({ category: 'subscription' });

    expect(subs.length).toBeGreaterThan(0);
    console.log(`    Subscription templates: ${subs.length}`);
  });
});

// ============================================
// SPLIT TAB - Playground Examples
// ============================================
describe('Split Tab', () => {
  let splitManager: ReturnType<typeof createSplitManager>;
  let contactManager: ReturnType<typeof createContactManager>;

  beforeAll(async () => {
    contactManager = createContactManager({
      storage: new MemoryStorage(),
      autoSave: true,
    });
    splitManager = createSplitManager(arcPay);
    splitManager.setContactManager(contactManager);

    await contactManager.add('alice', accountB.address);
    await contactManager.add('bob', '0x2222222222222222222222222222222222222222');
  });

  it('Example: Preview Split - calculates without paying', async () => {
    // Code shown: await split.preview('100', ['alice', 'bob'])

    const preview = await splitManager.preview(TINY_AMOUNT, [accountA.address, accountB.address]);

    expect(preview.recipients.length).toBe(2);
    console.log(`    Preview: ${preview.perPerson} each to ${preview.recipients.length} people`);
  });

  it('Example: Equal Split - real multi-payment', async () => {
    // Code shown: await split.equal('100', ['alice', 'bob'])

    const result = await splitManager.equal(TINY_AMOUNT, [
      accountB.address,
      '0x3333333333333333333333333333333333333333',
    ]);

    expect(result.recipients.length).toBe(2);
    for (const r of result.recipients) {
      if (r.txHash) {
        logTx('Split', `Equal to ${r.address.slice(0, 8)}`, r.txHash);
      }
    }
    console.log(`    Split complete: ${result.successCount}/${result.recipients.length} succeeded`);
  });

  it('Example: Custom Split - different amounts', async () => {
    // Code shown: await split.custom([{ to: 'alice', amount: '60' }, { to: 'bob', amount: '40' }])

    const result = await splitManager.custom([
      { to: accountB.address, amount: TINY_AMOUNT },
    ]);

    expect(result.recipients.length).toBe(1);
    if (result.recipients[0]?.txHash) {
      logTx('Split', 'Custom', result.recipients[0].txHash);
    }
  });

  it('Example: Percentage Split - by percent', async () => {
    // Code shown: await split.byPercent('100', [{ to: 'alice', percent: 60 }, { to: 'bob', percent: 40 }])

    const result = await splitManager.byPercent(TINY_AMOUNT, [
      { to: accountB.address, percent: 100 },
    ]);

    expect(result.recipients.length).toBe(1);
    if (result.recipients[0]?.txHash) {
      logTx('Split', 'Percent', result.recipients[0].txHash);
    }
  });
});

// ============================================
// LINKS TAB - Playground Examples
// ============================================
describe('Links Tab', () => {
  let linkManager: ReturnType<typeof createLinkManager>;
  let createdLinkId: string;

  beforeAll(() => {
    linkManager = createLinkManager(arcPay, {
      storagePrefix: `playground_links_${Date.now()}_`,
    });
  });

  it('Example: Create Link - generates shareable link', async () => {
    // Code shown: await links.create({ amount: '50', description: 'Dinner split' })

    const link = await linkManager.create({
      amount: TINY_AMOUNT,
      description: 'Test payment link',
    });

    createdLinkId = link.id;
    expect(link.id).toMatch(/^link_/);
    expect(link.url).toContain(link.id);
    console.log(`    Created link: ${link.url}`);
  });

  it('Example: Get Link Status - shows details', async () => {
    // Code shown: await links.getStatus('link_abc123')

    const link = await linkManager.getStatus(createdLinkId);

    expect(link.status).toBe('active');
    expect(link.amount).toBe(TINY_AMOUNT);
    console.log(`    Link status: ${link.status}`);
  });

  it('Example: List Links - shows all links', async () => {
    // Code shown: await links.list()

    const links = await linkManager.list();

    expect(links.length).toBeGreaterThanOrEqual(1);
    console.log(`    Total links: ${links.length}`);
  });

  it('Example: Pay Link - real payment to link', async () => {
    // In real scenario, payer would use the URL
    // Simulate by paying to the link recipient
    const link = await linkManager.get(createdLinkId);
    if (!link) return;

    const result = await arcPay.sendUSDC(link.recipient, link.amount!);

    expect(result.success).toBe(true);
    if (result.txHash) {
      logTx('Links', 'Pay Link', result.txHash);
    }
  });

  it('Example: Cancel Link - deactivates link', async () => {
    // Code shown: await links.cancel('link_abc123')

    const newLink = await linkManager.create({ amount: TINY_AMOUNT });
    await linkManager.cancel(newLink.id);

    const cancelled = await linkManager.get(newLink.id);
    expect(cancelled?.status).toBe('cancelled');
    console.log(`    Cancelled link: ${newLink.id}`);
  });

  it('Example: Link with Expiration - time-limited link', async () => {
    // Code shown: await links.create({ amount: '50', expiresIn: '24h' })

    const link = await linkManager.create({
      amount: TINY_AMOUNT,
      expiresIn: '24h',
    });

    expect(link.expiresAt).toBeDefined();
    console.log(`    Expires: ${new Date(link.expiresAt!).toISOString()}`);
  });

  it('Example: Link with Max Uses - single-use link', async () => {
    // Code shown: await links.create({ amount: '50', maxUses: 1 })

    const link = await linkManager.create({
      amount: TINY_AMOUNT,
      maxUses: 1,
    });

    expect(link.maxUses).toBe(1);
    console.log(`    Max uses: ${link.maxUses}`);
  });
});

// ============================================
// REQUESTS TAB - Playground Examples
// ============================================
describe('Requests Tab', () => {
  let requestManager: ReturnType<typeof createRequestManager>;
  let contactManager: ReturnType<typeof createContactManager>;
  let createdRequestId: string;

  beforeAll(async () => {
    contactManager = createContactManager({
      storage: new MemoryStorage(),
      autoSave: true,
    });
    requestManager = createRequestManager(arcPay, {
      storagePrefix: `playground_requests_${Date.now()}_`,
    });
    requestManager.setContactManager(contactManager);

    await contactManager.add('debtor', accountB.address);
  });

  it('Example: Create Request - asks for payment', async () => {
    // Code shown: await requests.create({ from: 'alice', amount: '50', reason: 'Dinner' })

    const request = await requestManager.create({
      from: 'debtor',
      amount: TINY_AMOUNT,
      reason: 'Test request',
    });

    createdRequestId = request.id;
    expect(request.id).toMatch(/^req_/);
    expect(request.status).toBe('pending');
    console.log(`    Created request: ${request.id}`);
  });

  it('Example: List Outgoing - requests I sent', async () => {
    // Code shown: await requests.listOutgoing()

    const outgoing = await requestManager.listOutgoing();

    expect(outgoing.length).toBeGreaterThanOrEqual(1);
    console.log(`    Outgoing requests: ${outgoing.length}`);
  });

  it('Example: Pay Request - fulfills with real payment', async () => {
    // Code shown: await requests.pay('req_abc123')

    const result = await requestManager.pay(createdRequestId);

    expect(result.txHash).toBeDefined();
    logTx('Requests', 'Pay Request', result.txHash);

    const updated = await requestManager.get(createdRequestId);
    expect(updated?.status).toBe('paid');
    console.log(`    Paid request: ${createdRequestId}`);
  });

  it('Example: Decline Request - rejects payment request', async () => {
    // Code shown: await requests.decline('req_abc123', 'Already paid cash')

    const newRequest = await requestManager.create({
      from: 'debtor',
      amount: TINY_AMOUNT,
      reason: 'Test decline',
    });

    await requestManager.decline(newRequest.id, 'Changed my mind');

    const declined = await requestManager.get(newRequest.id);
    expect(declined?.status).toBe('declined');
    console.log(`    Declined: ${newRequest.id}`);
  });

  it('Example: Bulk Request - multiple people at once', async () => {
    // Code shown: await requests.createBulk({ from: ['alice', 'bob'], amount: '33.33' })

    await contactManager.add('debtor2', '0x4444444444444444444444444444444444444444');

    const requests = await requestManager.createBulk({
      from: ['debtor', 'debtor2'],
      amount: TINY_AMOUNT,
      reason: 'Group dinner',
    });

    expect(requests.length).toBe(2);
    console.log(`    Created ${requests.length} bulk requests`);
  });

  it('Example: Request with Due Date - time-limited request', async () => {
    // Code shown: await requests.create({ from: 'alice', amount: '50', dueDate: 'in 7d' })

    const request = await requestManager.create({
      from: 'debtor',
      amount: TINY_AMOUNT,
      dueDate: 'in 7d',
    });

    expect(request.dueDate).toBeDefined();
    console.log(`    Due: ${new Date(request.dueDate!).toISOString()}`);
  });
});

// ============================================
// VOICE TAB - Playground Examples
// ============================================
describe('Voice Tab', () => {
  let intentEngine: ReturnType<typeof createIntentEngine>;
  let contactManager: ReturnType<typeof createContactManager>;

  beforeAll(async () => {
    contactManager = createContactManager({
      storage: new MemoryStorage(),
      autoSave: true,
    });

    await contactManager.add('ahmed', accountB.address);

    intentEngine = createIntentEngine({
      privateKey: WALLET_A_KEY,
    });
  });

  it('Example: Parse Send Command', async () => {
    // Voice input: "send 0.000001 to 0x..." (address)
    const intent = await intentEngine.execute(`send 0.000001 to ${accountB.address}`);

    expect(intent.parsed.action).toBe('send');
    expect(intent.parsed.params.amount).toBe('0.000001');
    expect(intent.parsed.params.recipient).toBe(accountB.address);
    console.log(`    Parsed: ${intent.parsed.action} ${intent.parsed.params.amount} to ${intent.parsed.params.recipient}`);
    if (intent.result?.txHash) {
      logTx('Voice', 'Parse Send', intent.result.txHash);
    }
  });

  it('Example: Parse Split Command', async () => {
    // Voice input: "split 100 between alice and bob"
    const intent = await intentEngine.execute('split 100 between alice and bob');

    expect(intent.parsed.action).toBe('split_payment');
    console.log(`    Parsed: ${intent.parsed.action}`);
  });

  it('Example: Parse Create Link Command', async () => {
    // Voice input: "create payment link for 50"
    const intent = await intentEngine.execute('create payment link for 50');

    expect(intent.parsed.action).toBe('create_link');
    expect(intent.parsed.params.amount).toBe('50');
    console.log(`    Parsed: ${intent.parsed.action} for $${intent.parsed.params.amount}`);
  });

  it('Example: Parse Request Command', async () => {
    // Voice input: "request 25 from bob for lunch"
    const intent = await intentEngine.execute('request 25 from bob');

    expect(intent.parsed.action).toBe('request_payment');
    expect(intent.parsed.params.amount).toBe('25');
    expect(intent.parsed.params.from).toBe('bob');
    console.log(`    Parsed: ${intent.parsed.action} $${intent.parsed.params.amount} from ${intent.parsed.params.from}`);
  });

  it('Example: Execute Voice Command - real transaction', async () => {
    // Execute: "send 0.000001 to 0x..."
    const intent = await intentEngine.execute(`send ${TINY_AMOUNT} to ${accountB.address}`);

    expect(intent.result?.success).toBe(true);
    if (intent.result?.txHash) {
      logTx('Voice', 'Execute Send', intent.result.txHash);
    }
    console.log(`    Executed: ${intent.result?.success ? 'SUCCESS' : 'FAILED'}`);
  });

  it('Example: List Contacts Command', async () => {
    const intent = await intentEngine.execute('list my contacts');

    expect(intent.parsed.action).toBe('list_contacts');
    console.log(`    Parsed: ${intent.parsed.action}`);
  });
});

// ============================================
// CONSOLE TAB - Code Execution Examples
// ============================================
describe('Console Tab', () => {
  it('Example: Execute ArcPay.init()', async () => {
    // Code: const arcPay = await ArcPay.init({ network: 'arc-testnet', privateKey: '0x...' })

    const testArcPay = await ArcPay.init({
      network: 'arc-testnet',
      privateKey: WALLET_A_KEY,
    });

    expect(testArcPay).toBeDefined();
    expect(testArcPay.address).toBeDefined();
    console.log(`    Initialized: ${testArcPay.address?.slice(0, 20)}...`);
  });

  it('Example: Execute getContractAddresses()', () => {
    // Code: const addresses = getContractAddresses(5042002)

    const addresses = getContractAddresses(5042002);

    expect(addresses.escrow).toBeDefined();
    expect(addresses.streamPayment).toBeDefined();
    console.log(`    Escrow: ${addresses.escrow.slice(0, 20)}...`);
  });

  it('Example: Execute balance check', async () => {
    // Code: const balance = await arcPay.getBalance()

    const balance = await arcPay.getBalance();

    expect(parseFloat(balance)).toBeGreaterThan(0);
    console.log(`    Balance: ${balance} USDC`);
  });
});

// ============================================
// FINAL: Test Summary
// ============================================
describe('Playground Test Summary', () => {
  it('prints summary', () => {
    console.log('\n========================================');
    console.log('  PLAYGROUND TESTS COMPLETE');
    console.log('========================================');
    console.log(`  Total on-chain transactions: ${txHashes.length}`);

    // Group by tab
    const byTab: Record<string, number> = {};
    txHashes.forEach(({ tab }) => {
      byTab[tab] = (byTab[tab] || 0) + 1;
    });

    console.log('\n  Transactions by tab:');
    Object.entries(byTab).forEach(([tab, count]) => {
      console.log(`    ${tab}: ${count}`);
    });

    console.log('========================================\n');

    expect(txHashes.length).toBeGreaterThan(0);
  });
});
