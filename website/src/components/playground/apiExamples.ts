/**
 * ArcPay SDK - Complete API Reference with Code Examples
 *
 * Total: 150+ APIs across 28 modules
 */

export interface APIItem {
  name: string;
  description: string;
  code: string;
  params?: string[];
  returns?: string;
}

export interface APICategory {
  name: string;
  icon: string;
  description: string;
  apis: APIItem[];
}

export const API_CATEGORIES: APICategory[] = [
  {
    name: 'Micropayments',
    icon: '💰',
    description: 'x402 protocol for pay-per-use APIs',
    apis: [
      {
        name: 'pay',
        description: 'Pay for access to a paywalled API',
        params: ['url', 'options?'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Pay for access to a paywalled endpoint
const PAYWALLED_URL = 'https://api.example.com/premium-data';

console.log('Accessing paywalled endpoint...');
const result = await arc.micropayments.pay(PAYWALLED_URL, {
  maxPrice: '0.01' // Maximum willing to pay in USDC
});

console.log('✅ Access granted!');
console.log('Paid:', result.paid, 'USDC');
console.log('URL:', result.url);`,
      },
      {
        name: 'fetch',
        description: 'Fetch data from paywalled URL with auto-payment',
        params: ['url', 'options?'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Fetch from paywalled URL - automatically handles 402 payments
const { data, response } = await arc.micropayments.fetch(
  'https://api.example.com/premium-content',
  { maxPrice: '0.05' }
);

console.log('Response status:', response.status);
console.log('Data:', data);`,
      },
      {
        name: 'paywall',
        description: 'Create a paywall middleware (server-side)',
        params: ['payTo', 'routes'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Create paywall middleware (for Express/Hono)
const middleware = arc.micropayments.paywall(
  arc.address, // Payments go to your address
  {
    '/api/premium': { price: '0.01', description: 'Premium API access' },
    '/api/data': { price: '0.005', description: 'Data endpoint' },
  }
);

console.log('Paywall middleware created!');
console.log('Use with Express: app.use(middleware)');`,
      },
    ],
  },
  {
    name: 'Channels',
    icon: '⚡',
    description: '✅ Fully tested - Payment channels for micropayments',
    apis: [
      {
        name: 'openChannel',
        description: 'Open payment channel for micropayments',
        params: ['recipient', 'deposit'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

console.log('Opening channel from:', arc.address);

// ============ EDIT BELOW ============
const MERCHANT = '0xc01A5abCF3719C7Ed9021847E686087214edCefb';  // ← Merchant address
const DEPOSIT = '1';  // ← Initial deposit (USDC) - minimum 0.001 USDC
// ====================================

const result = await arc.channels.open({
  recipient: MERCHANT,
  deposit: DEPOSIT
});

console.log('✅ Channel Opened!');
console.log('');
console.log('📋 CHANNEL ID:', result.channelId);
console.log('');
console.log('💰 Deposited:', DEPOSIT, 'USDC');
console.log('🏪 Merchant:', MERCHANT.slice(0, 15) + '...');
console.log('');
console.log('TX Hash:', result.txHash);
console.log('Explorer:', result.explorerUrl);
console.log('');
console.log('📌 HOW IT WORKS:');
console.log('  1. You sign off-chain payments (instant, free)');
console.log('  2. Merchant collects signatures');
console.log('  3. Merchant closes channel → gets paid on-chain');
console.log('');
console.log('💡 Perfect for: API calls, streaming, gaming, IoT');`,
      },
      {
        name: 'getChannelBalance',
        description: 'Get channel balance',
        params: ['channelId'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// ============ EDIT BELOW ============
const CHANNEL_ID = '0x...';  // ← Your channel ID
// ====================================

const balance = await arc.channels.getBalance(CHANNEL_ID);
console.log('Available:', balance.available, 'USDC');
console.log('Spent:', balance.spent, 'USDC');`,
      },
      {
        name: 'getChannel',
        description: 'Get channel details',
        params: ['channelId'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// ============ EDIT BELOW ============
const CHANNEL_ID = '0x...';  // ← Your channel ID
// ====================================

const channel = await arc.channels.get(CHANNEL_ID);
console.log('Channel details:', channel);`,
      },
      {
        name: 'closeChannel',
        description: 'Close channel and settle on-chain',
        params: ['channelId'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// ============ EDIT BELOW ============
const CHANNEL_ID = '0x...';  // ← Your channel ID
// ====================================

console.log('Closing channel:', CHANNEL_ID.slice(0, 15) + '...');

// Get balance before closing
const balance = await arc.channels.getBalance(CHANNEL_ID);
console.log('Available balance:', balance.available, 'USDC');
console.log('Total spent:', balance.spent, 'USDC');
console.log('');

// Emergency close (returns funds to sender)
const result = await arc.channels.emergencyClose(CHANNEL_ID);

console.log('✅ Channel Closed!');
console.log('');
console.log('TX Hash:', result.txHash);
console.log('Explorer:', result.explorerUrl);
console.log('');
console.log('💡 Remaining funds returned to your wallet');`,
      },
    ],
  },
  {
    name: 'Gateway',
    icon: '🌐',
    description: 'Unified balance across chains',
    apis: [
      {
        name: 'getUnifiedBalance',
        description: 'Get unified balance across all chains',
        params: [],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Get unified balance from all supported chains
const balance = await arc.gateway.getUnifiedBalance();

console.log('=== Unified Gateway Balance ===');
console.log('Total:', balance.total, 'USDC');
console.log('Available:', balance.available, 'USDC');
console.log('Pending:', balance.pending, 'USDC');
console.log('');
console.log('By Chain:');
Object.entries(balance.byChain).forEach(([chain, amount]) => {
  console.log(\`  \${chain}: \${amount} USDC\`);
});`,
      },
      {
        name: 'deposit',
        description: 'Deposit to Gateway wallet',
        params: ['amount'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Deposit USDC to Gateway wallet
const result = await arc.gateway.deposit({
  amount: '100'
});

console.log('=== Gateway Deposit ===');
console.log('Success:', result.success);
console.log('TX:', result.txHash);`,
      },
      {
        name: 'withdraw',
        description: 'Withdraw from Gateway to specific chain',
        params: ['chain', 'amount', 'recipient?'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Withdraw USDC to Base Sepolia
const result = await arc.gateway.withdraw({
  chain: 'base-sepolia',
  amount: '50',
  recipient: arc.address
});

console.log('=== Gateway Withdrawal ===');
console.log('Success:', result.success);
console.log('Init TX:', result.initTxHash);`,
      },
      {
        name: 'getSupportedDomains',
        description: 'Get supported CCTP domains',
        params: [],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Get CCTP domain IDs
const domains = arc.gateway.getSupportedDomains();

console.log('=== CCTP Domain IDs ===');
Object.entries(domains).forEach(([name, id]) => {
  console.log(\`\${name}: \${id}\`);
});`,
      },
    ],
  },
  {
    name: 'Voice',
    icon: '🎤',
    description: 'Voice-controlled payments',
    apis: [
      {
        name: 'isSupported',
        description: 'Check if voice is supported',
        params: [],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Check voice support
const supported = arc.voice.isSupported();

console.log('=== Voice Module ===');
console.log('Speech recognition:', supported ? '✅ Supported' : '❌ Not supported');
console.log('');
console.log('Supported commands:');
console.log('- "Send X USDC to address"');
console.log('- "Check my balance"');
console.log('- "Create escrow for X USDC"');`,
      },
      {
        name: 'speak',
        description: 'Speak text (text-to-speech)',
        params: ['text', 'options?'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Speak a message
const result = await arc.voice.speak(
  'Payment of 50 USDC sent successfully!',
  { lang: 'en-US', rate: 1.0 }
);

console.log('Spoken:', result.spoken);
console.log('Text:', result.text);`,
      },
      {
        name: 'startListening',
        description: 'Start voice recognition',
        params: ['onResult', 'onError?'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

console.log('Voice recognition starting...');
console.log('(Note: Requires microphone permission)');

// Start listening
try {
  await arc.voice.startListening(
    (text) => {
      console.log('You said:', text);
    },
    (error) => {
      console.log('Error:', error);
    }
  );
  console.log('Listening...');
} catch (e) {
  console.log('Voice not supported or permission denied');
}`,
      },
    ],
  },
  {
    name: 'Agent',
    icon: '🤖',
    description: '✅ Fully tested - AI Agent payment engine (read-only, deposit requires ERC20)',
    apis: [
      {
        name: 'registerAgent',
        description: 'Register an AI payment agent',
        params: ['dailyBudget', 'perTxLimit'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

console.log('Registering agent:', arc.address);

// ============ EDIT BELOW ============
const DAILY_BUDGET = '10';  // USDC per day
const PER_TX_LIMIT = '1';   // Max USDC per transaction
// ====================================

const result = await arc.agent.register({
  dailyBudget: DAILY_BUDGET,
  perTxLimit: PER_TX_LIMIT
});

console.log('✅ Agent registered!');
console.log('TX:', result.txHash);`,
      },
      {
        name: 'depositToAgent',
        description: 'Deposit funds for agent to use',
        params: ['amount'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// ============ EDIT BELOW ============
const AMOUNT = '1';  // USDC to deposit
// ====================================

const result = await arc.agent.deposit({ amount: AMOUNT });
console.log('✅ Deposited to agent!');
console.log('TX:', result.txHash);`,
      },
      {
        name: 'agentPay',
        description: 'Agent makes a payment',
        params: ['to', 'amount', 'memo?'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// ============ EDIT BELOW ============
const RECIPIENT = '0xc01A5abCF3719C7Ed9021847E686087214edCefb';
const AMOUNT = '0.1';
const MEMO = 'Task payment';
// ====================================

const result = await arc.agent.pay({
  recipient: RECIPIENT,
  amount: AMOUNT,
  memo: MEMO
});

console.log('✅ Agent paid!');
console.log('TX:', result.txHash);`,
      },
      {
        name: 'getAgentConfig',
        description: 'Get agent configuration',
        params: ['address?'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

const config = await arc.agent.getConfig();
console.log('Agent config:', config);`,
      },
      {
        name: 'getAgentBalance',
        description: 'Get agent balance',
        params: ['address?'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

const balance = await arc.agent.getBalance();
console.log('Agent balance:', balance, 'USDC');`,
      },
    ],
  },
  {
    name: 'Split Payment',
    icon: '➗',
    description: '✅ Fully tested - Split bills between multiple recipients',
    apis: [
      {
        name: 'split.equal',
        description: 'Split amount equally between recipients',
        params: ['amount', 'recipients'],
        returns: 'SplitResult',
        code: `import { ArcPay, createSplitManager } from 'arcpay';

const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

const split = createSplitManager(arc);

// Split $100 equally between 3 people
const result = await split.equal('100', [
  '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78',
  '0xc01A5abCF3719C7Ed9021847E686087214edCefb',
  '0x8ba1f109551bD432803012645Ac136ddd64DBA72'
]);

console.log('✅ Split complete!');
console.log('Recipients:', result.recipients.length);
console.log('Success:', result.successCount, '/', result.recipients.length);
console.log('Per person:', result.perPerson);

result.recipients.forEach(r => {
  console.log('-', r.to.slice(0, 10) + '...', r.success ? '✅' : '❌');
});`,
      },
      {
        name: 'split.custom',
        description: 'Split with custom amounts per recipient',
        params: ['recipients'],
        returns: 'SplitResult',
        code: `import { ArcPay, createSplitManager } from 'arcpay';

const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

const split = createSplitManager(arc);

// Custom split - different amounts per person
const result = await split.custom([
  { to: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78', amount: '50' },
  { to: '0xc01A5abCF3719C7Ed9021847E686087214edCefb', amount: '30' },
  { to: '0x8ba1f109551bD432803012645Ac136ddd64DBA72', amount: '20' }
]);

console.log('✅ Custom split complete!');
console.log('Total sent:', result.total);
console.log('Success:', result.successCount);

result.recipients.forEach(r => {
  console.log('-', '$' + r.amount, 'to', r.to.slice(0, 10) + '...');
});`,
      },
      {
        name: 'split.byPercent',
        description: 'Split by percentage',
        params: ['amount', 'recipients'],
        returns: 'SplitResult',
        code: `import { ArcPay, createSplitManager } from 'arcpay';

const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

const split = createSplitManager(arc);

// Split $100 by percentage (must sum to 100)
const result = await split.byPercent('100', [
  { to: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78', percent: 50 },
  { to: '0xc01A5abCF3719C7Ed9021847E686087214edCefb', percent: 30 },
  { to: '0x8ba1f109551bD432803012645Ac136ddd64DBA72', percent: 20 }
]);

console.log('✅ Percentage split complete!');
result.recipients.forEach(r => {
  console.log('-', r.percent + '%', '=', '$' + r.amount);
});`,
      },
      {
        name: 'split.preview',
        description: 'Preview split without paying',
        params: ['amount', 'recipients'],
        returns: 'SplitCalculation',
        code: `import { ArcPay, createSplitManager } from 'arcpay';

const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

const split = createSplitManager(arc);

// Preview the split (no transactions)
const preview = await split.preview('100', [
  '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78',
  '0xc01A5abCF3719C7Ed9021847E686087214edCefb',
  '0x8ba1f109551bD432803012645Ac136ddd64DBA72'
]);

console.log('📋 Split Preview');
console.log('Total:', '$' + preview.total);
console.log('Per person:', '$' + preview.perPerson);
console.log('Recipients:', preview.recipients.length);

preview.recipients.forEach(r => {
  console.log('-', r.to.slice(0, 10) + '...', '→', '$' + r.amount);
});`,
      },
    ],
  },
  {
    name: 'Payment Links',
    icon: '🔗',
    description: '✅ Fully tested - Shareable payment URLs',
    apis: [
      {
        name: 'links.create',
        description: 'Create a shareable payment link',
        params: ['options'],
        returns: 'PaymentLink',
        code: `import { ArcPay, createLinkManager } from 'arcpay';

const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

const links = createLinkManager(arc);

// Create a payment link
const link = await links.create({
  amount: '50.00',
  description: 'Dinner split',
  expiresIn: '7d',   // Expires in 7 days
  maxUses: 5         // Max 5 payments
});

console.log('✅ Payment link created!');
console.log('ID:', link.id);
console.log('URL:', link.url);
console.log('Amount:', '$' + link.amount);
console.log('Expires:', link.expiresAt);`,
      },
      {
        name: 'links.pay',
        description: 'Pay a payment link',
        params: ['linkId'],
        returns: 'TransactionResult',
        code: `import { ArcPay, createLinkManager } from 'arcpay';

const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

const links = createLinkManager(arc);

// Pay a link
const result = await links.pay('link_abc123');

if (result.success) {
  console.log('✅ Payment sent!');
  console.log('TX Hash:', result.txHash);
} else {
  console.log('❌ Payment failed:', result.error);
}`,
      },
      {
        name: 'links.list',
        description: 'List all payment links',
        params: ['options?'],
        returns: 'PaymentLink[]',
        code: `import { ArcPay, createLinkManager } from 'arcpay';

const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

const links = createLinkManager(arc);

// List all links
const allLinks = await links.list();
console.log('Total links:', allLinks.length);

// List only active links
const active = await links.list({ status: 'active' });
console.log('Active links:', active.length);

active.forEach(link => {
  console.log('-', link.description, '|', '$' + link.amount, '|', link.useCount + '/' + (link.maxUses || '∞'));
});`,
      },
      {
        name: 'links.cancel',
        description: 'Cancel a payment link',
        params: ['linkId'],
        returns: 'boolean',
        code: `import { ArcPay, createLinkManager } from 'arcpay';

const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

const links = createLinkManager(arc);

// Cancel a link
const cancelled = await links.cancel('link_abc123');

if (cancelled) {
  console.log('✅ Link cancelled');
} else {
  console.log('❌ Link not found or already cancelled');
}`,
      },
      {
        name: 'links.getStatus',
        description: 'Get status of a payment link',
        params: ['linkId'],
        returns: 'PaymentLink | undefined',
        code: `import { ArcPay, createLinkManager } from 'arcpay';

const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

const links = createLinkManager(arc);

// Get link status
const link = await links.getStatus('link_abc123');

if (link) {
  console.log('📊 Link Status');
  console.log('Status:', link.status);
  console.log('Amount:', '$' + link.amount);
  console.log('Uses:', link.useCount + '/' + (link.maxUses || '∞'));
  console.log('Total Received:', '$' + link.totalReceived);
  console.log('Created:', link.createdAt);
} else {
  console.log('❌ Link not found');
}`,
      },
    ],
  },
  {
    name: 'Templates',
    icon: '📋',
    description: '✅ Fully tested - Pre-configured payment templates',
    apis: [
      {
        name: 'templates.list',
        description: 'List all available templates',
        params: ['options?'],
        returns: 'PaymentTemplate[]',
        code: `import { createTemplateManager } from 'arcpay';

// Create template manager
const templates = createTemplateManager();

// List all templates (25+ built-in)
const all = templates.list();
console.log('Total templates:', all.length);

// Filter by category
const subscriptions = templates.list({ category: 'subscription' });
console.log('\\nSubscription templates:', subscriptions.length);
subscriptions.forEach(t => {
  console.log('-', t.name, ':', '$' + t.amount + '/mo');
});

// Filter stream templates (for salaries)
const streams = templates.list({ isStream: true });
console.log('\\nStream templates:', streams.length);`,
      },
      {
        name: 'templates.get',
        description: 'Get a specific template by ID',
        params: ['id'],
        returns: 'PaymentTemplate | undefined',
        code: `import { createTemplateManager } from 'arcpay';

const templates = createTemplateManager();

// Get Netflix template
const netflix = templates.get('netflix');

if (netflix) {
  console.log('📺 Netflix Template');
  console.log('Amount:', '$' + netflix.amount);
  console.log('Category:', netflix.category);
  console.log('Icon:', netflix.icon);
  console.log('Description:', netflix.description);
}

// Get Spotify template
const spotify = templates.get('spotify');
console.log('\\n🎵 Spotify:', '$' + spotify?.amount);`,
      },
      {
        name: 'templates.use',
        description: 'Use a template to create a contact',
        params: ['id', 'options'],
        returns: 'Contact',
        code: `import { createTemplateManager } from 'arcpay';

const templates = createTemplateManager();

// Use Netflix template to create a contact
const contact = await templates.use('netflix', {
  address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78',
  amount: '22.99'  // Override default $15.99 for family plan
});

console.log('✅ Created contact from template');
console.log('Name:', contact.displayName);
console.log('Amount:', contact.metadata.monthlyAmount);
console.log('Billing Day:', contact.metadata.billingDay);`,
      },
      {
        name: 'templates.search',
        description: 'Search templates by name or description',
        params: ['query'],
        returns: 'PaymentTemplate[]',
        code: `import { createTemplateManager, searchTemplates } from 'arcpay';

const templates = createTemplateManager();

// Search for music templates
const music = templates.search('music');
console.log('Music templates:', music.length);
music.forEach(t => console.log('-', t.name));

// Search for streaming templates
const streaming = templates.search('streaming');
console.log('\\nStreaming templates:', streaming.length);

// Also works with standalone function
const results = searchTemplates('gaming');
console.log('\\nGaming templates:', results.length);`,
      },
      {
        name: 'templates.create',
        description: 'Create a custom template',
        params: ['template'],
        returns: 'void',
        code: `import { createTemplateManager } from 'arcpay';

const templates = createTemplateManager();

// Create a custom template
templates.create({
  id: 'gym',
  name: 'Gym Membership',
  amount: '49.99',
  billingDay: 1,
  category: 'personal',
  icon: '🏋️',
  description: 'Monthly gym membership'
});

console.log('✅ Custom template created');

// Now you can use it
const gym = templates.get('gym');
console.log('Gym template:', gym?.name, '-', '$' + gym?.amount);

// It appears in list
const personal = templates.list({ category: 'personal' });
console.log('\\nPersonal templates:', personal.map(t => t.name));`,
      },
    ],
  },
  {
    name: 'Core',
    icon: '⚡',
    description: '✅ Fully tested - Essential payment operations',
    apis: [
      {
        name: 'init',
        description: 'Initialize the ArcPay SDK',
        params: ['network', 'privateKey?', 'rpcUrl?'],
        returns: 'ArcPay instance',
        code: `// Initialize ArcPay SDK
// Note: Set your private key in Settings (⚙️) for write operations
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY, // from Settings, optional
});

console.log('Connected to:', arc.network.name);
console.log('Address:', arc.address);

// Now you can use arc.getBalance(), arc.sendUSDC(), etc.`,
      },
      {
        name: 'getBalance',
        description: 'Get USDC balance for an address',
        params: ['address?'],
        returns: 'string (balance)',
        code: `// Initialize with your private key from Settings
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Get YOUR balance (uses your address automatically)
const myBalance = await arc.getBalance();
console.log('Your Address:', arc.address);
console.log('Your Balance:', myBalance, 'USDC');`,
      },
      {
        name: 'sendUSDC',
        description: 'Send USDC to an address',
        params: ['to', 'amount'],
        returns: 'TransactionResult',
        code: `// Initialize with private key (set in Settings ⚙️)
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

console.log('Sending from:', arc.address);

// ============ EDIT BELOW ============
const RECIPIENT = '0xc01A5abCF3719C7Ed9021847E686087214edCefb';  // ← Change this
const AMOUNT = '0.01';  // ← Change this (USDC)
// ====================================

const result = await arc.sendUSDC(RECIPIENT, AMOUNT);

console.log('✅ TX Hash:', result.txHash);
console.log('🔗 Explorer:', result.explorerUrl);`,
      },
      {
        name: 'getEURCBalance',
        description: 'Get EURC balance for an address',
        params: ['address?'],
        returns: 'string (balance)',
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Get EURC balance
const eurcBalance = await arc.getEURCBalance();
console.log('Your Address:', arc.address);
console.log('EURC Balance:', eurcBalance);`,
      },
      {
        name: 'sendEURC',
        description: 'Send EURC to an address',
        params: ['to', 'amount'],
        returns: 'TransactionResult',
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

console.log('Sending from:', arc.address);

// ============ EDIT BELOW ============
const RECIPIENT = '0xc01A5abCF3719C7Ed9021847E686087214edCefb';  // ← Change this
const AMOUNT = '0.01';  // ← Change this (EURC)
// ====================================

const result = await arc.sendEURC(RECIPIENT, AMOUNT);

console.log('✅ EURC sent! TX:', result.txHash);
console.log('🔗 Explorer:', result.explorerUrl);`,
      },
    ],
  },
  {
    name: 'Contacts',
    icon: '📇',
    description: '✅ Fully tested - Address book & contact management',
    apis: [
      {
        name: 'contacts.add',
        description: 'Add a new contact',
        params: ['name', 'address', 'metadata?'],
        returns: 'Contact',
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Add a contact
const contact = await arc.contacts.add('ahmed', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78', {
  category: 'personal',
  notes: 'My friend Ahmed'
});

console.log('✅ Contact added:', contact.displayName);
console.log('Address:', contact.address);
console.log('Category:', contact.metadata.category);`,
      },
      {
        name: 'contacts.search',
        description: 'Search contacts by name (fuzzy match)',
        params: ['query'],
        returns: 'Contact[]',
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Search for contacts
const results = await arc.contacts.search('ahm');

console.log('Found', results.length, 'contacts:');
results.forEach(contact => {
  console.log('-', contact.displayName, ':', contact.address.slice(0, 10) + '...');
});`,
      },
      {
        name: 'contacts.resolve',
        description: 'Resolve contact name to address',
        params: ['nameOrAddress'],
        returns: 'string | undefined',
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Resolve a contact name to address
const address = await arc.contacts.resolve('ahmed');

if (address) {
  console.log('✅ Resolved "ahmed" to:', address);
} else {
  console.log('❌ Contact not found');
}

// Also works with addresses (returns as-is)
const addr2 = await arc.contacts.resolve('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78');
console.log('Address pass-through:', addr2);`,
      },
      {
        name: 'transfer (pay by name)',
        description: 'Pay a contact by name',
        params: ['to', 'amount'],
        returns: 'TransactionResult',
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// First add a contact
await arc.contacts.add('bob', '0xc01A5abCF3719C7Ed9021847E686087214edCefb');

// Pay by name - auto-resolves contact
const result = await arc.transfer({
  to: 'bob',      // Contact name OR address
  amount: '10.00'
});

console.log('✅ Paid bob!');
console.log('TX Hash:', result.txHash);`,
      },
      {
        name: 'contacts.list',
        description: 'List all contacts',
        params: [],
        returns: 'Contact[]',
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// List all contacts
const contacts = await arc.contacts.list();

console.log('Total contacts:', contacts.length);
console.log('\\nContacts:');
contacts.forEach(c => {
  console.log('-', c.displayName, '|', c.metadata.category || 'uncategorized');
});`,
      },
      {
        name: 'contacts.delete',
        description: 'Delete a contact',
        params: ['name'],
        returns: 'boolean',
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Delete a contact
const deleted = await arc.contacts.delete('ahmed');

if (deleted) {
  console.log('✅ Contact deleted');
} else {
  console.log('❌ Contact not found');
}`,
      },
    ],
  },
  {
    name: 'Escrow',
    icon: '🔒',
    description: '✅ Fully tested - Secure multi-party conditional payments',
    apis: [
      {
        name: 'createEscrow',
        description: 'Create escrow with arbiter & fee (OTC trade ready)',
        params: ['beneficiary', 'amount', 'arbitrators?', 'feePercentage?'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

console.log('Creating escrow from:', arc.address);

// ============ EDIT BELOW ============
const SELLER = '0xc01A5abCF3719C7Ed9021847E686087214edCefb';  // ← Seller/Beneficiary
const AMOUNT = '1';  // ← USDC amount
const ARBITER = '0xE749269D212e223Ce82C008067A3606442b1e938';  // ← Arbiter (Wallet C)
const FEE_BPS = 100;  // ← 100 = %1 fee (basis points)
// ====================================

const result = await arc.escrow.create({
  beneficiary: SELLER,
  amount: AMOUNT,
  arbitrators: [ARBITER],
  feePercentage: FEE_BPS,
  description: 'OTC Trade: 0.001 BTC for 100 USDC'
});

console.log('✅ Escrow Created!');
console.log('');
console.log('📋 ESCROW ID:', result.escrowId);
console.log('');
console.log('💰 Amount:', AMOUNT, 'USDC');
console.log('💸 Fee:', (parseFloat(AMOUNT) * FEE_BPS / 10000).toFixed(4), 'USDC (' + (FEE_BPS/100) + '%)');
console.log('⚖️ Arbiter:', ARBITER.slice(0,10) + '...');
console.log('');
console.log('TX Hash:', result.txHash);
console.log('Explorer:', result.explorerUrl);
console.log('');
console.log('📌 NEXT STEPS:');
console.log('  • Seller delivers → Buyer calls release()');
console.log('  • Problem? → Buyer/Seller calls createDispute()');
console.log('  • Arbiter resolves → resolveDispute()');`,
      },
      {
        name: 'releaseEscrow',
        description: 'Release funds to beneficiary',
        params: ['escrowId'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// ============ EDIT BELOW ============
const ESCROW_ID = '0x...';  // ← Paste your ESCROW ID from createEscrow here!
// ====================================

console.log('Releasing escrow:', ESCROW_ID);
const result = await arc.escrow.release(ESCROW_ID);

console.log('✅ Escrow released! Funds sent to beneficiary.');
console.log('');
console.log('TX Hash:', result.txHash);
console.log('Explorer:', result.explorerUrl);`,
      },
      {
        name: 'refundEscrow',
        description: 'Refund funds to depositor',
        params: ['escrowId'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// ============ EDIT BELOW ============
const ESCROW_ID = '0x...';  // ← Paste your ESCROW ID from createEscrow here!
// ====================================

console.log('Refunding escrow:', ESCROW_ID);
const result = await arc.escrow.refund(ESCROW_ID);

console.log('✅ Escrow refunded! Funds returned to depositor.');
console.log('');
console.log('TX Hash:', result.txHash);
console.log('Explorer:', result.explorerUrl);`,
      },
      {
        name: 'getEscrow',
        description: 'Get escrow details',
        params: ['escrowId'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// ============ EDIT BELOW ============
const ESCROW_ID = '0x...';  // ← Your escrow ID
// ====================================

const details = await arc.escrow.get(ESCROW_ID);
console.log('Escrow details:', details);`,
      },
      {
        name: 'getUserEscrows',
        description: 'List all your escrows with IDs',
        params: [],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

console.log('Fetching escrows for:', arc.address);

const escrows = await arc.escrow.getUserEscrows();

console.log('');
console.log('=== YOUR ESCROWS ===');
console.log('Total:', escrows.length);
console.log('');

escrows.forEach((escrow, i) => {
  console.log(\`[\${i + 1}] Escrow ID: \${escrow}\`);
});

console.log('');
console.log('💡 Copy an Escrow ID above to use with release() or refund()');`,
      },
      {
        name: 'createDispute',
        description: 'Raise a dispute on escrow (buyer or seller)',
        params: ['escrowId', 'reason'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// ============ EDIT BELOW ============
const ESCROW_ID = '0x...';  // ← Escrow ID
const REASON = 'Seller did not deliver the goods as promised';
// ====================================

console.log('⚠️ Raising dispute on escrow:', ESCROW_ID.slice(0, 15) + '...');
console.log('Reason:', REASON);
console.log('');

const dispute = await arc.escrow.createDispute(ESCROW_ID, REASON);

console.log('🔴 Dispute Created!');
console.log('');
console.log('Dispute ID:', dispute.id);
console.log('Status:', dispute.status);
console.log('Created:', dispute.createdAt);
console.log('');
console.log('📌 NEXT: Arbiter will review and call resolveDispute()');
console.log('   Arbiter can release to seller OR refund to buyer');`,
      },
      {
        name: 'resolveDispute',
        description: 'Arbiter resolves the dispute',
        params: ['escrowId', 'decision', 'buyerAmount?', 'sellerAmount?'],
        code: `// Initialize ArcPay (AS ARBITER)
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY  // ← Must be arbiter's key!
});

// ============ EDIT BELOW ============
const ESCROW_ID = '0x...';  // ← Escrow ID with dispute
const DECISION = 'release';  // 'release' = pay seller, 'refund' = return to buyer, 'split' = divide
const BUYER_PERCENT = 30;   // Only for 'split': buyer gets 30%
const SELLER_PERCENT = 70;  // Only for 'split': seller gets 70%
// ====================================

console.log('⚖️ Arbiter resolving dispute...');
console.log('Escrow:', ESCROW_ID.slice(0, 15) + '...');
console.log('Decision:', DECISION);
console.log('');

const result = await arc.escrow.resolveDispute(ESCROW_ID, {
  decision: DECISION,
  buyerPercent: BUYER_PERCENT,
  sellerPercent: SELLER_PERCENT,
  reason: 'After reviewing evidence, seller provided partial service'
});

console.log('✅ Dispute Resolved!');
console.log('');
console.log('Final Decision:', DECISION);
if (DECISION === 'split') {
  console.log('Buyer receives:', BUYER_PERCENT + '%');
  console.log('Seller receives:', SELLER_PERCENT + '%');
}
console.log('TX Hash:', result.txHash);`,
      },
      {
        name: 'getEscrowStats',
        description: 'Get your escrow statistics',
        params: [],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

const stats = await arc.escrow.getStats();

console.log('=== ESCROW STATISTICS ===');
console.log('');
console.log('📊 Overview:');
console.log('  Total Escrows:', stats.total);
console.log('  Total Volume:', stats.totalVolume, 'USDC');
console.log('');
console.log('📈 By Status:');
console.log('  Active:', stats.active);
console.log('  Released:', stats.released);
console.log('  Refunded:', stats.refunded);
console.log('  Disputed:', stats.disputed || 0);
console.log('');
console.log('⚠️ Dispute Rate:', (stats.disputeRate * 100).toFixed(2) + '%');`,
      },
    ],
  },
  {
    name: 'Streams',
    icon: '💸',
    description: '✅ Fully tested - Real-time streaming payments',
    apis: [
      {
        name: 'createStream',
        description: 'Create a real-time payment stream (salary, subscription)',
        params: ['recipient', 'totalAmount', 'duration'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

console.log('Creating stream from:', arc.address);

// ============ EDIT BELOW ============
const RECIPIENT = '0xc01A5abCF3719C7Ed9021847E686087214edCefb';  // ← Employee/Recipient
const AMOUNT = '1';  // ← Total USDC to stream
const DURATION = 3600;  // ← Duration in seconds (1 hour = 3600)
// ====================================

// Calculate rate
const ratePerSecond = (parseFloat(AMOUNT) / DURATION).toFixed(8);
const ratePerHour = (parseFloat(AMOUNT) / DURATION * 3600).toFixed(4);

const result = await arc.streams.create({
  recipient: RECIPIENT,
  amount: AMOUNT,
  duration: DURATION
});

console.log('✅ Stream Created!');
console.log('');
console.log('📋 STREAM ID:', result.streamId);
console.log('');
console.log('💰 Total Amount:', AMOUNT, 'USDC');
console.log('⏱️ Duration:', DURATION, 'seconds (' + (DURATION/3600).toFixed(2) + ' hours)');
console.log('📈 Rate:', ratePerSecond, 'USDC/second');
console.log('📈 Rate:', ratePerHour, 'USDC/hour');
console.log('');
console.log('TX Hash:', result.txHash);
console.log('Explorer:', result.explorerUrl);
console.log('');
console.log('📌 RECIPIENT CAN:');
console.log('  • claim() - Withdraw accrued funds anytime');
console.log('📌 SENDER CAN:');
console.log('  • pause() - Temporarily stop streaming');
console.log('  • resume() - Continue streaming');
console.log('  • cancel() - Stop & refund remaining');`,
      },
      {
        name: 'claim',
        description: 'Claim available funds from stream',
        params: ['streamId'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// ============ EDIT BELOW ============
const STREAM_ID = '0x...';  // ← Your stream ID
// ====================================

const result = await arc.streams.claim(STREAM_ID);
console.log('✅ Claimed!');
console.log('TX:', result.txHash);
console.log('🔗 Explorer:', result.explorerUrl);`,
      },
      {
        name: 'cancelStream',
        description: 'Cancel a stream and refund remaining',
        params: ['streamId'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// ============ EDIT BELOW ============
const STREAM_ID = '0x...';  // ← Your stream ID
// ====================================

const result = await arc.streams.cancel(STREAM_ID);
console.log('✅ Stream cancelled!');
console.log('TX:', result.txHash);
console.log('🔗 Explorer:', result.explorerUrl);`,
      },
      {
        name: 'getClaimable',
        description: 'Get claimable amount for a stream',
        params: ['streamId'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// ============ EDIT BELOW ============
const STREAM_ID = '0x...';  // ← Your stream ID
// ====================================

const claimable = await arc.streams.getClaimable(STREAM_ID);
console.log('Claimable now:', claimable, 'USDC');`,
      },
      {
        name: 'getStream',
        description: 'Get stream details',
        params: ['streamId'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// ============ EDIT BELOW ============
const STREAM_ID = '0x...';  // ← Your stream ID
// ====================================

const stream = await arc.streams.get(STREAM_ID);
console.log('Stream details:', stream);`,
      },
      {
        name: 'pauseStream',
        description: 'Pause a running stream (sender only)',
        params: ['streamId'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// ============ EDIT BELOW ============
const STREAM_ID = '0x...';  // ← Your stream ID
// ====================================

console.log('⏸️ Pausing stream:', STREAM_ID.slice(0, 15) + '...');

const result = await arc.streams.pause(STREAM_ID);

console.log('✅ Stream Paused!');
console.log('');
console.log('TX Hash:', result.txHash);
console.log('Explorer:', result.explorerUrl);
console.log('');
console.log('💡 Stream is paused - no more funds accruing');
console.log('💡 Use resume() to continue streaming');`,
      },
      {
        name: 'resumeStream',
        description: 'Resume a paused stream (sender only)',
        params: ['streamId'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// ============ EDIT BELOW ============
const STREAM_ID = '0x...';  // ← Your stream ID (must be paused)
// ====================================

console.log('▶️ Resuming stream:', STREAM_ID.slice(0, 15) + '...');

const result = await arc.streams.resume(STREAM_ID);

console.log('✅ Stream Resumed!');
console.log('');
console.log('TX Hash:', result.txHash);
console.log('Explorer:', result.explorerUrl);
console.log('');
console.log('💡 Stream is active again - funds accruing');`,
      },
    ],
  },
  {
    name: 'Payment Requests',
    icon: '📩',
    description: '✅ Fully tested - Request money from contacts',
    apis: [
      {
        name: 'requests.create',
        description: 'Create a payment request',
        params: ['options'],
        returns: 'PaymentRequest',
        code: `import { ArcPay, createRequestManager } from 'arcpay';

const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

const requests = createRequestManager(arc);

// Create a payment request
const req = await requests.create({
  from: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78',
  amount: '50.00',
  reason: 'Dinner split last night',
  dueDate: 'in 7d'  // Due in 7 days
});

console.log('✅ Request created!');
console.log('ID:', req.id);
console.log('Amount:', '$' + req.amount);
console.log('Status:', req.status);
console.log('Due:', req.dueDate);`,
      },
      {
        name: 'requests.createBulk',
        description: 'Request from multiple people',
        params: ['options'],
        returns: 'PaymentRequest[]',
        code: `import { ArcPay, createRequestManager } from 'arcpay';

const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

const requests = createRequestManager(arc);

// Request from multiple people
const bulk = await requests.createBulk({
  from: [
    '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78',
    '0xc01A5abCF3719C7Ed9021847E686087214edCefb'
  ],
  amount: '33.33',
  reason: 'Group dinner split'
});

console.log('✅ Bulk requests created:', bulk.length);
bulk.forEach(req => {
  console.log('-', req.from.address.slice(0, 10) + '...', '→', '$' + req.amount);
});`,
      },
      {
        name: 'requests.pay',
        description: 'Pay a request you received',
        params: ['requestId'],
        returns: 'TransactionResult',
        code: `import { ArcPay, createRequestManager } from 'arcpay';

const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

const requests = createRequestManager(arc);

// Pay a request
const result = await requests.pay('req_abc123');

if (result.success) {
  console.log('✅ Request paid!');
  console.log('TX Hash:', result.txHash);
} else {
  console.log('❌ Payment failed:', result.error);
}`,
      },
      {
        name: 'requests.decline',
        description: 'Decline a request',
        params: ['requestId', 'reason?'],
        returns: 'boolean',
        code: `import { ArcPay, createRequestManager } from 'arcpay';

const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

const requests = createRequestManager(arc);

// Decline a request
const declined = await requests.decline('req_abc123', 'Already paid in cash');

if (declined) {
  console.log('✅ Request declined');
} else {
  console.log('❌ Request not found');
}`,
      },
      {
        name: 'requests.cancel',
        description: 'Cancel your own request',
        params: ['requestId'],
        returns: 'boolean',
        code: `import { ArcPay, createRequestManager } from 'arcpay';

const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

const requests = createRequestManager(arc);

// Cancel your own request
const cancelled = await requests.cancel('req_abc123');

if (cancelled) {
  console.log('✅ Request cancelled');
} else {
  console.log('❌ Request not found or already processed');
}`,
      },
      {
        name: 'requests.listOutgoing',
        description: 'List requests you sent (who owes you)',
        params: ['options?'],
        returns: 'PaymentRequest[]',
        code: `import { ArcPay, createRequestManager } from 'arcpay';

const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

const requests = createRequestManager(arc);

// List who owes you money
const outgoing = await requests.listOutgoing();

console.log('📤 Outgoing Requests (who owes you)');
console.log('Total:', outgoing.length);

const pending = outgoing.filter(r => r.status === 'pending');
console.log('Pending:', pending.length);

pending.forEach(req => {
  console.log('-', '$' + req.amount, 'from', req.from.address.slice(0, 10) + '...', '|', req.reason);
});`,
      },
      {
        name: 'requests.listIncoming',
        description: 'List requests you received (what you owe)',
        params: ['options?'],
        returns: 'PaymentRequest[]',
        code: `import { ArcPay, createRequestManager } from 'arcpay';

const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

const requests = createRequestManager(arc);

// List what you owe
const incoming = await requests.listIncoming();

console.log('📥 Incoming Requests (what you owe)');
console.log('Total:', incoming.length);

const pending = incoming.filter(r => r.status === 'pending');
console.log('Pending:', pending.length);

pending.forEach(req => {
  console.log('-', '$' + req.amount, 'to', req.to.address.slice(0, 10) + '...', '|', req.reason);
});

// Calculate total owed
const total = await requests.getTotalOwed();
console.log('\\nTotal you owe:', '$' + total);`,
      },
    ],
  },
  {
    name: 'Subscriptions',
    icon: '📅',
    description: 'Recurring payment management',
    apis: [
      {
        name: 'createPlan',
        description: 'Create a subscription plan',
        params: ['name', 'price', 'period'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Create a subscription plan
const plan = arc.subscriptions.createPlan({
  name: 'Pro Plan',
  price: '9.99',
  period: 'monthly',
  description: 'Full access to all features',
  features: ['Unlimited API calls', 'Priority support', '24/7 chat']
});

console.log('=== Plan Created ===');
console.log('ID:', plan.id);
console.log('Name:', plan.name);
console.log('Price:', plan.price, 'USDC/', plan.period);
console.log('Features:', plan.features.join(', '));`,
      },
      {
        name: 'subscribe',
        description: 'Subscribe to a plan',
        params: ['plan', 'merchant'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Create an inline plan and subscribe
const subscription = await arc.subscriptions.subscribe({
  plan: {
    name: 'Basic',
    price: '4.99',
    period: 'monthly'
  },
  merchant: '0xc01A5abCF3719C7Ed9021847E686087214edCefb'
});

console.log('=== Subscribed! ===');
console.log('ID:', subscription.id);
console.log('Status:', subscription.status);
console.log('Price:', subscription.price, 'USDC/', subscription.period);
console.log('Next billing:', subscription.nextBillingDate);`,
      },
      {
        name: 'cancel',
        description: 'Cancel a subscription',
        params: ['subscriptionId', 'options?'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// List active subscriptions
const subs = arc.subscriptions.listSubscriptions({ status: 'active' });
console.log('Active subscriptions:', subs.length);

if (subs.length > 0) {
  // Cancel at period end (keep until paid period expires)
  const cancelled = await arc.subscriptions.cancel(subs[0].id, {
    atPeriodEnd: true
  });

  console.log('Cancelled:', cancelled.id);
  console.log('Ends at:', cancelled.currentPeriodEnd);
}`,
      },
    ],
  },
  {
    name: 'Bridge',
    icon: '🌉',
    description: 'Cross-chain USDC transfers via CCTP',
    apis: [
      {
        name: 'transfer',
        description: 'Bridge USDC to another chain',
        params: ['to', 'amount', 'recipient?'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

console.log('=== Bridge Transfer ===');
console.log('From:', arc.address);

// Bridge 10 USDC to Base Sepolia
const result = await arc.bridge.transfer({
  to: 'base-sepolia',
  amount: '10',
  recipient: arc.address // Same address on destination
});

console.log('Transfer ID:', result.transferId);
console.log('Burn TX:', result.burnTxHash);
console.log('Status:', result.success ? '✅ Initiated' : '❌ Failed');`,
      },
      {
        name: 'getStatus',
        description: 'Check bridge transfer status',
        params: ['transferId'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Check status of a bridge transfer
const TRANSFER_ID = 'bridge_123456789'; // Your transfer ID

const status = await arc.bridge.getStatus(TRANSFER_ID);

console.log('=== Bridge Status ===');
console.log('Status:', status.status);
console.log('Burn TX:', status.burnTxHash);
if (status.mintTxHash) {
  console.log('Mint TX:', status.mintTxHash);
  console.log('✅ Transfer complete!');
}`,
      },
      {
        name: 'getSupportedChains',
        description: 'Get list of supported bridge chains',
        params: [],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Get supported chains for CCTP bridge
const chains = arc.bridge.getSupportedChains();

console.log('=== Supported Bridge Chains ===');
chains.forEach(chain => {
  console.log(\`- \${chain.name} (ID: \${chain.chainId})\${chain.isTestnet ? ' [Testnet]' : ''}\`);
});`,
      },
    ],
  },
  {
    name: 'FX',
    icon: '💱',
    description: 'Stablecoin swaps (USDC/EURC)',
    apis: [
      {
        name: 'getQuote',
        description: 'Get FX quote for swap',
        params: ['from', 'to', 'amount'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Get quote for USDC → EURC swap
const quote = await arc.fx.getQuote({
  from: 'USDC',
  to: 'EURC',
  amount: '100'
});

console.log('=== FX Quote ===');
console.log('Quote ID:', quote.id);
console.log('Rate:', quote.rate);
console.log('You send:', quote.from.amount, quote.from.currency);
console.log('You receive:', quote.to.amount, quote.to.currency);
console.log('Fee:', quote.fee.amount, quote.fee.currency);
console.log('Expires:', quote.expiry);`,
      },
      {
        name: 'swap',
        description: 'Execute FX swap with quote',
        params: ['quoteId'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// First, get a quote
const quote = await arc.fx.getQuote({
  from: 'USDC',
  to: 'EURC',
  amount: '50'
});

console.log('Got quote:', quote.id);
console.log('Rate:', quote.rate);

// Execute the swap
const result = await arc.fx.swap({ quoteId: quote.id });

if (result.success) {
  console.log('✅ Swap executed!');
  console.log('Received:', result.received, 'EURC');
} else {
  console.log('❌ Swap failed:', result.error);
}`,
      },
      {
        name: 'getSupportedPairs',
        description: 'Get list of supported FX pairs',
        params: [],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Get supported FX pairs
const pairs = arc.fx.getSupportedPairs();

console.log('=== Supported FX Pairs ===');
pairs.forEach(pair => console.log('-', pair));

// Check if a specific pair is supported
const isSupported = arc.fx.isPairSupported('USDC', 'EURC');
console.log('\\nUSDC/EURC supported:', isSupported);

// Get token addresses
console.log('\\nToken addresses:');
console.log('USDC:', arc.fx.getCurrencyAddress('USDC'));
console.log('EURC:', arc.fx.getCurrencyAddress('EURC'));`,
      },
    ],
  },
  {
    name: 'Privacy',
    icon: '🔐',
    description: '✅ Fully tested - EIP-5564 stealth addresses for private payments',
    apis: [
      {
        name: 'generateKeyPair',
        description: 'Generate spending + viewing key pair',
        params: [],
        code: `// Initialize Privacy Module
const privacy = createPrivacyModule({
  privateKey: process.env.PRIVATE_KEY
});

// Generate stealth key pair (spending + viewing keys)
const keys = privacy.generateKeyPair();

console.log('=== Stealth Key Pair ===');
console.log('Spending Public Key:', keys.spendingPublicKey);
console.log('Viewing Public Key:', keys.viewingPublicKey);
console.log('');
console.log('⚠️ IMPORTANT: Save your private keys securely!');
console.log('Spending Private Key:', keys.spendingPrivateKey);
console.log('Viewing Private Key:', keys.viewingPrivateKey);
console.log('');
console.log('Share ONLY the public keys to receive payments.');`,
      },
      {
        name: 'registerOnChain',
        description: 'Register stealth meta-address on-chain',
        params: [],
        code: `// Initialize Privacy Module
const privacy = createPrivacyModule({
  privateKey: process.env.PRIVATE_KEY
});

// First generate keys
const keys = privacy.generateKeyPair();

console.log('=== Register Meta-Address ===');
console.log('Spending PubKey:', keys.spendingPublicKey.slice(0, 20) + '...');
console.log('Viewing PubKey:', keys.viewingPublicKey.slice(0, 20) + '...');

// Register on StealthRegistry contract
const result = await privacy.registerOnChain(
  keys.spendingPublicKey,
  keys.viewingPublicKey
);

console.log('');
console.log('TX Hash:', result.txHash);
console.log('Status:', result.status);
console.log('');
console.log('✅ Others can now find your meta-address and send private payments!');`,
      },
      {
        name: 'sendPrivate',
        description: 'Send private payment to stealth address',
        params: ['recipient', 'amount'],
        code: `// Initialize Privacy Module
const privacy = createPrivacyModule({
  privateKey: process.env.PRIVATE_KEY
});

// ============ EDIT BELOW ============
const RECIPIENT = '0xc01A5abCF3719C7Ed9021847E686087214edCefb';  // ← Recipient address
const AMOUNT = '0.01';  // ← Amount in USDC
// ====================================

// Check if recipient is registered
const isReg = await privacy.isRegistered(RECIPIENT);
console.log('Recipient registered:', isReg);

if (!isReg) {
  console.log('❌ Recipient has not registered stealth meta-address');
} else {
  // Get recipient's meta-address
  const meta = await privacy.getMetaAddress(RECIPIENT);
  console.log('Meta-address found!');

  // Generate stealth address and send payment
  const result = await privacy.sendPrivate(RECIPIENT, AMOUNT);

  console.log('');
  console.log('=== Private Payment Sent ===');
  console.log('TX Hash:', result.txHash);
  console.log('Stealth Address:', result.stealthAddress);
  console.log('Ephemeral Key:', result.ephemeralPubKey.slice(0, 20) + '...');
  console.log('');
  console.log('✅ Payment is private - only recipient can claim!');
}`,
      },
      {
        name: 'scanAnnouncements',
        description: 'Scan for payments sent to you',
        params: [],
        code: `// Initialize Privacy Module
const privacy = createPrivacyModule({
  privateKey: process.env.PRIVATE_KEY
});

console.log('=== Scanning for Stealth Payments ===');

// Get total announcements on-chain
const total = await privacy.getTotalAnnouncements();
console.log('Total announcements:', total);

if (total === 0) {
  console.log('No stealth payments yet.');
} else {
  // Fetch recent announcements
  const announcements = await privacy.scanAnnouncements(0, 100);

  console.log('');
  console.log('Found', announcements.length, 'announcements');

  announcements.forEach((ann, i) => {
    console.log(\`\\n[\${i + 1}] Stealth Address: \${ann.stealthAddress}\`);
    console.log(\`    Amount: \${ann.amount} USDC\`);
    console.log(\`    Claimed: \${ann.claimed ? 'Yes' : 'No'}\`);
  });
}`,
      },
    ],
  },
  {
    name: 'Smart Wallet',
    icon: '👛',
    description: 'ERC-4337 Account Abstraction',
    apis: [
      {
        name: 'deploy',
        description: 'Deploy a smart wallet',
        params: ['guardians?', 'threshold?', 'dailyLimit?'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Deploy smart wallet with guardians
const result = await arc.smartWallet.deploy({
  guardians: [
    '0x1111111111111111111111111111111111111111',
    '0x2222222222222222222222222222222222222222'
  ],
  threshold: 2,
  dailyLimit: '1000' // 1000 USDC daily limit
});

console.log('=== Smart Wallet Deployed ===');
console.log('Address:', result.address);
console.log('TX:', result.txHash);`,
      },
      {
        name: 'execute',
        description: 'Execute transaction through smart wallet',
        params: ['to', 'value?', 'data?'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// First deploy if not already
await arc.smartWallet.deploy({ dailyLimit: '100' });

// Execute transaction
const result = await arc.smartWallet.execute({
  to: '0xc01A5abCF3719C7Ed9021847E686087214edCefb',
  value: '10'
});

console.log('=== Execution Result ===');
console.log('Success:', result.success);
console.log('TX:', result.txHash);

// Check daily limit
const limits = arc.smartWallet.getDailyLimit();
console.log('Daily limit:', limits.limit);
console.log('Spent today:', limits.spent);`,
      },
      {
        name: 'addGuardian',
        description: 'Add a guardian for recovery',
        params: ['guardian'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Deploy wallet first
await arc.smartWallet.deploy();

// Add a guardian
const result = await arc.smartWallet.addGuardian(
  '0x3333333333333333333333333333333333333333'
);

console.log('=== Guardian Added ===');
console.log('Success:', result.success);
console.log('Guardians:', result.guardians);`,
      },
    ],
  },
  {
    name: 'AI Wallet',
    icon: '🧠',
    description: 'Conversational payment wallet',
    apis: [
      {
        name: 'aiWalletInfo',
        description: 'AI Wallet information',
        params: [],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

const balance = await arc.getBalance();

console.log('AI Wallet');
console.log('=========');
console.log('Address:', arc.address);
console.log('Balance:', balance, 'USDC');
console.log('');
console.log('AI Wallet features:');
console.log('- Natural language payments');
console.log('- Smart suggestions');
console.log('- Payment scheduling');
console.log('- Spending insights');
console.log('');
console.log('💡 Try: "Send 10 USDC to 0x..." in Voice Mode!');`,
      },
      {
        name: 'checkBalance',
        description: 'Check wallet balance',
        params: [],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

const usdc = await arc.getBalance();
const eurc = await arc.getEURCBalance();

console.log('AI Wallet Balances');
console.log('==================');
console.log('Address:', arc.address);
console.log('USDC:', usdc);
console.log('EURC:', eurc);`,
      },
      {
        name: 'quickPay',
        description: 'Quick payment',
        params: ['to', 'amount'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// ============ EDIT BELOW ============
const RECIPIENT = '0xc01A5abCF3719C7Ed9021847E686087214edCefb';
const AMOUNT = '0.01';
// ====================================

console.log('Quick Pay:', AMOUNT, 'USDC');
const result = await arc.sendUSDC(RECIPIENT, AMOUNT);

console.log('✅ Paid!');
console.log('TX:', result.txHash);`,
      },
    ],
  },
  {
    name: 'Invoices',
    icon: '🧾',
    description: 'Create and track invoices',
    apis: [
      {
        name: 'create',
        description: 'Create a new invoice',
        params: ['to', 'amount', 'items?'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Create an invoice
const invoice = await arc.invoices.create({
  to: '0xc01A5abCF3719C7Ed9021847E686087214edCefb',
  items: [
    { description: 'Web Development', quantity: 10, unitPrice: '100' },
    { description: 'Hosting (1 year)', quantity: 1, unitPrice: '200' }
  ],
  metadata: { project: 'Website Redesign' }
});

console.log('=== Invoice Created ===');
console.log('Invoice #:', invoice.number);
console.log('Total:', invoice.total, 'USDC');
console.log('Status:', invoice.status);
console.log('Due:', invoice.dueDate);`,
      },
      {
        name: 'pay',
        description: 'Pay an invoice',
        params: ['invoiceId'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Create and pay an invoice
const invoice = await arc.invoices.create({
  to: arc.address,
  items: [{ description: 'Demo service', quantity: 1, unitPrice: '0.01' }]
});

console.log('Invoice created:', invoice.number);

// Pay the invoice
const result = await arc.invoices.pay(invoice.id);

console.log('=== Invoice Paid! ===');
console.log('TX Hash:', result.txHash);
console.log('Status:', result.invoice.status);
console.log('Explorer:', result.explorerUrl);`,
      },
      {
        name: 'list',
        description: 'List all invoices',
        params: ['filter?'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Create some demo invoices
await arc.invoices.create({ to: '0x1111111111111111111111111111111111111111', items: [{ description: 'Service A', quantity: 1, unitPrice: '100' }] });
await arc.invoices.create({ to: '0x2222222222222222222222222222222222222222', items: [{ description: 'Service B', quantity: 1, unitPrice: '200' }] });

// List all invoices
const all = arc.invoices.list();
console.log('=== All Invoices ===');
console.log('Total:', all.length);

// List pending invoices only
const pending = arc.invoices.list({ status: 'pending' });
console.log('Pending:', pending.length);

pending.forEach(inv => {
  console.log(\`- \${inv.number}: \${inv.amount} USDC to \${inv.to.slice(0,10)}...\`);
});`,
      },
    ],
  },
  {
    name: 'Intent',
    icon: '💬',
    description: 'Natural language payment commands',
    apis: [
      {
        name: 'parseIntent',
        description: 'Parse natural language command',
        params: ['command'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Example: parse a payment command
const command = 'Send 50 USDC to 0xc01A5abCF3719C7Ed9021847E686087214edCefb';

// Simple intent parsing
const amountMatch = command.match(/(\\d+\\.?\\d*)\\s*USDC/i);
const addressMatch = command.match(/0x[a-fA-F0-9]{40}/);

console.log('Command:', command);
console.log('Parsed amount:', amountMatch ? amountMatch[1] : 'N/A', 'USDC');
console.log('Parsed address:', addressMatch ? addressMatch[0] : 'N/A');
console.log('');
console.log('💡 Use Voice Mode for full AI-powered parsing!');`,
      },
      {
        name: 'executeIntent',
        description: 'Execute parsed intent',
        params: ['recipient', 'amount'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// ============ EDIT BELOW ============
const RECIPIENT = '0xc01A5abCF3719C7Ed9021847E686087214edCefb';
const AMOUNT = '0.01';
// ====================================

console.log('Executing intent: send', AMOUNT, 'USDC');
const result = await arc.sendUSDC(RECIPIENT, AMOUNT);

console.log('✅ Intent executed!');
console.log('TX:', result.txHash);`,
      },
    ],
  },
  {
    name: 'AI',
    icon: '🧠',
    description: 'Gemini-powered payment AI',
    apis: [
      {
        name: 'parseCommand',
        description: 'Parse a natural language payment command',
        params: ['text'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Parse natural language commands
const commands = [
  'Send 50 USDC to 0xc01A5abCF3719C7Ed9021847E686087214edCefb',
  'Check my balance',
  'Swap 100 USDC to EURC'
];

console.log('=== AI Command Parser ===\\n');

for (const cmd of commands) {
  const result = await arc.ai.parseCommand(cmd);
  console.log('Input:', cmd);
  console.log('Action:', result.action);
  console.log('Confidence:', result.confidence);
  console.log('');
}`,
      },
      {
        name: 'explainTransaction',
        description: 'Explain a transaction in plain language',
        params: ['tx'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Explain a transaction
const tx = {
  hash: '0xabc...',
  from: arc.address,
  to: '0xc01A5abCF3719C7Ed9021847E686087214edCefb',
  value: '10000000000000000000', // 10 USDC (18 decimals)
  data: '0xa9059cbb...'
};

const explanation = await arc.ai.explainTransaction(tx);

console.log('=== Transaction Explanation ===');
console.log('Summary:', explanation.summary);
console.log('Type:', explanation.type);
console.log('Risk Level:', explanation.risk);`,
      },
      {
        name: 'chat',
        description: 'Chat with AI about payments',
        params: ['message'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Chat with AI
const messages = [
  'How do I send USDC?',
  'What is my balance?',
  'Help me with escrow'
];

console.log('=== AI Chat ===\\n');

for (const msg of messages) {
  const response = await arc.ai.chat(msg);
  console.log('You:', msg);
  console.log('AI:', response.response);
  console.log('');
}`,
      },
    ],
  },
  {
    name: 'Onchain Agent',
    icon: '🔗',
    description: 'On-chain AI agent registry',
    apis: [
      {
        name: 'createOnchainAgentManager',
        description: 'Create onchain agent manager',
        params: ['config'],
        code: `// Initialize ArcPay with private key
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

console.log('Connected as:', arc.address);
console.log('Agent Registry:', arc.contracts.agent);

// Check current agent config (if registered)
try {
  const config = await arc.agent.getConfig();
  console.log('\\nAgent Config:', config);
} catch (e) {
  console.log('\\nNo agent registered yet');
}`,
      },
      {
        name: 'registerAgent',
        description: 'Register agent on-chain',
        params: ['name', 'metadata'],
        code: `// Initialize ArcPay with private key
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

console.log('Registering agent...');

// Register with daily budget and per-tx limit
const result = await arc.agent.register({
  dailyBudget: '1000',  // 1000 USDC daily limit
  perTxLimit: '100'     // 100 USDC per transaction
});

console.log('✅ Agent registered!');
console.log('TX Hash:', result.txHash);
console.log('Explorer:', result.explorerUrl);`,
      },
      {
        name: 'executePayment',
        description: 'Execute payment as registered agent',
        params: ['agentId', 'params'],
        code: `// Initialize ArcPay with private key
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Execute payment through agent registry
const result = await arc.agent.pay({
  recipient: '0xc01A5abCF3719C7Ed9021847E686087214edCefb',
  amount: '10',
  memo: 'Automated service payment'
});

console.log('✅ Agent payment executed!');
console.log('TX Hash:', result.txHash);`,
      },
      {
        name: 'getAgentInfo',
        description: 'Get registered agent info',
        params: ['agentId'],
        code: `// Initialize ArcPay with private key
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Get agent configuration
const config = await arc.agent.getConfig();
console.log('=== Agent Info ===');
console.log('Owner:', config.owner);
console.log('Daily Budget:', config.dailyBudget);
console.log('Per-TX Limit:', config.perTxLimit);
console.log('Today Spent:', config.todaySpent);
console.log('Active:', config.active);

// Get agent balance
const balance = await arc.agent.getBalance();
console.log('\\nAgent Balance:', balance, 'USDC');`,
      },
    ],
  },
  {
    name: 'Compliance',
    icon: '✅',
    description: '✅ Fully tested - KYC/AML and sanctions screening',
    apis: [
      {
        name: 'setRules',
        description: 'Set compliance rules',
        params: ['rules'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Set compliance rules
const rules = arc.compliance.setRules({
  maxTransactionAmount: '10000', // Max 10,000 USDC per tx
  requireKYC: false,
  allowedCountries: ['US', 'EU', '*'] // '*' = all countries
});

console.log('=== Compliance Rules ===');
console.log(rules);`,
      },
      {
        name: 'checkTransaction',
        description: 'Check if transaction passes compliance',
        params: ['from', 'to', 'amount'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Set rules
arc.compliance.setRules({ maxTransactionAmount: '1000' });

// Check transaction
const result = await arc.compliance.checkTransaction({
  from: arc.address,
  to: '0xc01A5abCF3719C7Ed9021847E686087214edCefb',
  amount: '500'
});

console.log('=== Compliance Check ===');
console.log('Approved:', result.approved);
console.log('Issues:', result.issues.length > 0 ? result.issues : 'None');
console.log('Checked at:', result.checkedAt);`,
      },
      {
        name: 'screenAddress',
        description: 'Screen address for sanctions',
        params: ['address'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Screen an address
const result = await arc.compliance.screenAddress(
  '0xc01A5abCF3719C7Ed9021847E686087214edCefb'
);

console.log('=== Address Screening ===');
console.log('Address:', result.address);
console.log('Blocked:', result.isBlocked);
console.log('Risk Level:', result.riskLevel);
console.log('Screened at:', result.screenedAt);`,
      },
      {
        name: 'addToBlocklist',
        description: 'Add address to blocklist',
        params: ['address'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Add to blocklist
const badAddress = '0xBADBADBADBADBADBADBADBADBADBADBADBADBAD1';
arc.compliance.addToBlocklist(badAddress);

// Check if blocked
const isBlocked = arc.compliance.isBlocked(badAddress);
console.log('Address blocked:', isBlocked);

// Now check a transaction to blocked address
const check = await arc.compliance.checkTransaction({
  from: arc.address,
  to: badAddress,
  amount: '100'
});

console.log('Transaction approved:', check.approved);
console.log('Issues:', check.issues);`,
      },
    ],
  },
  {
    name: 'Gas Station',
    icon: '⛽',
    description: 'Sponsor gas for your users',
    apis: [
      {
        name: 'deposit',
        description: 'Deposit funds to gas station',
        params: ['amount'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Deposit to gas station for sponsoring user transactions
const result = await arc.gasStation.deposit('10');

console.log('=== Gas Station Deposit ===');
console.log('Success:', result.success);
console.log('New Balance:', result.newBalance, 'USDC');`,
      },
      {
        name: 'getBalance',
        description: 'Check gas station balance',
        params: [],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Get gas station balance
const balance = arc.gasStation.getBalance();

console.log('=== Gas Station Balance ===');
console.log('Available:', balance, 'USDC');
console.log('');
console.log('This balance is used to sponsor gas for users.');`,
      },
      {
        name: 'sponsorGas',
        description: 'Sponsor gas for a user transaction',
        params: ['userTx'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// First, deposit some funds
await arc.gasStation.deposit('1');

// Sponsor gas for a user's transaction
const result = await arc.gasStation.sponsorGas({
  from: '0xUserAddress...',
  to: '0xRecipient...',
  data: '0x...'
});

console.log('=== Gas Sponsorship ===');
console.log('Success:', result.success);
console.log('Sponsored Amount:', result.sponsoredAmount, 'USDC');
console.log('Remaining Balance:', result.remainingBalance, 'USDC');`,
      },
    ],
  },
  {
    name: 'Paymaster',
    icon: '🎫',
    description: 'Gas sponsorship for users',
    apis: [
      {
        name: 'setRules',
        description: 'Set paymaster rules',
        params: ['rules'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Set paymaster rules
arc.paymaster.setRules({
  maxPerTransaction: '0.1',  // Max 0.1 USDC per tx
  maxPerUserDaily: '1.0',    // Max 1 USDC per user per day
  dailyBudget: '100.0'       // Total daily budget
});

console.log('=== Paymaster Rules Set ===');
console.log(arc.paymaster.getRules());`,
      },
      {
        name: 'sponsorTransaction',
        description: 'Sponsor a user transaction',
        params: ['request'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Sponsor a transaction for a user
const result = await arc.paymaster.sponsorTransaction({
  userAddress: '0xUserWallet...',
  to: '0xRecipient...',
  data: '0x...',
  value: '0'
});

if (result.success) {
  console.log('✅ Transaction sponsored!');
  console.log('TX:', result.txHash);
  console.log('Sponsored:', result.sponsoredAmount, 'USDC');
} else {
  console.log('❌ Sponsorship failed:', result.error);
}`,
      },
      {
        name: 'getUserStats',
        description: 'Get user spending stats',
        params: ['address'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Get stats for a specific user
const stats = arc.paymaster.getUserStats('0xUserAddress...');

console.log('=== User Stats ===');
console.log('Today spent:', stats.today, 'USDC');
console.log('Total spent:', stats.total, 'USDC');

// Get overall paymaster stats
const overall = arc.paymaster.getStats();
console.log('\\n=== Overall Stats ===');
console.log('Total spent:', overall.totalSpent, 'USDC');
console.log('Unique users:', overall.uniqueUsers);`,
      },
    ],
  },
  {
    name: 'USYC',
    icon: '📈',
    description: 'Yield-bearing token operations',
    apis: [
      {
        name: 'getBalance',
        description: 'Get USYC balance with yield info',
        params: ['address?'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Get USYC balance and accumulated yield
const balance = await arc.usyc.getBalance();

console.log('=== USYC Balance ===');
console.log('USYC Balance:', balance.usyc);
console.log('USDC Value:', balance.usdcValue);
console.log('Yield Earned:', balance.yield, 'USDC');`,
      },
      {
        name: 'subscribe',
        description: 'Convert USDC to USYC (start earning yield)',
        params: ['amount', 'options?'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Check if allowlisted (required for USYC)
const isAllowed = await arc.usyc.isAllowlisted();
console.log('Allowlisted:', isAllowed);

if (isAllowed) {
  // Subscribe USDC to get USYC
  const result = await arc.usyc.subscribe('100'); // 100 USDC
  console.log('✅ Subscribed!');
  console.log('USYC Received:', result.usycReceived);
  console.log('TX:', result.txHash);
} else {
  console.log('Get allowlisted at:', arc.usyc.getAllowlistUrl());
}`,
      },
      {
        name: 'redeem',
        description: 'Convert USYC back to USDC (collect yield)',
        params: ['amount', 'options?'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Check current balance
const balance = await arc.usyc.getBalance();
console.log('Current USYC:', balance.usyc);
console.log('Current yield:', balance.yield, 'USDC');

// Redeem USYC for USDC + yield
const result = await arc.usyc.redeem('50'); // Redeem 50 USYC

console.log('✅ Redeemed!');
console.log('USDC Received:', result.usdcReceived);
console.log('TX:', result.txHash);`,
      },
      {
        name: 'getExchangeRate',
        description: 'Get current USYC to USDC exchange rate',
        params: [],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Get current exchange rate
const rate = await arc.usyc.getExchangeRate();

console.log('=== USYC Exchange Rate ===');
console.log('1 USYC =', rate, 'USDC');
console.log('');
console.log('The rate increases over time as yield accumulates.');
console.log('APY is based on short-term US Treasury rates.');`,
      },
    ],
  },
  {
    name: 'Combo',
    icon: '🔗',
    description: 'Combined payment workflows',
    apis: [
      {
        name: 'comboInfo',
        description: 'Combo workflow information',
        params: [],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

console.log('Combo Workflows');
console.log('===============');
console.log('Your address:', arc.address);
console.log('');
console.log('Available combos:');
console.log('1. Intent → Payment: Voice command to transfer');
console.log('2. Intent → Stream: Voice command to stream');
console.log('3. Intent → Escrow: Voice command to escrow');
console.log('4. Image → Payment: Invoice photo to payment');
console.log('');
console.log('💡 Try Voice Mode or Image Mode in the sidebar!');`,
      },
    ],
  },
  {
    name: 'Contracts',
    icon: '📜',
    description: 'Smart contract addresses and ABIs',
    apis: [
      {
        name: 'getContractAddresses',
        description: 'Get deployed contract addresses',
        params: ['chainId'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Get all contract addresses for Arc Testnet
const addresses = arc.getContractAddresses(5042002);

console.log('=== ArcPay Contract Addresses ===');
console.log('Chain ID:', addresses.chainId);
console.log('USDC:', addresses.usdc);
console.log('EURC:', addresses.eurc);
console.log('USYC:', addresses.usyc);
console.log('Escrow:', addresses.escrow);
console.log('Streams:', addresses.streamPayment);
console.log('Channels:', addresses.paymentChannel);
console.log('Stealth:', addresses.stealthRegistry);
console.log('Agent Registry:', addresses.agentRegistry);`,
      },
      {
        name: 'areContractsDeployed',
        description: 'Check if contracts are deployed',
        params: ['chainId'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Check Arc Testnet
const arcTestnet = arc.areContractsDeployed(5042002);
console.log('Arc Testnet (5042002):', arcTestnet ? '✅ Deployed' : '❌ Not deployed');

// Check other chains (will return false)
const mainnet = arc.areContractsDeployed(1);
console.log('Ethereum Mainnet (1):', mainnet ? '✅ Deployed' : '❌ Not deployed');

const polygon = arc.areContractsDeployed(137);
console.log('Polygon (137):', polygon ? '✅ Deployed' : '❌ Not deployed');`,
      },
      {
        name: 'ABIs',
        description: 'Access contract ABIs',
        params: [],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Get contract addresses
const addresses = arc.getContractAddresses();

console.log('=== Available ArcPay Contracts ===');
console.log('');
console.log('Core Tokens:');
console.log('  USDC:', addresses.usdc);
console.log('  EURC:', addresses.eurc);
console.log('  USYC:', addresses.usyc);
console.log('');
console.log('Payment Infrastructure:');
console.log('  Escrow:', addresses.escrow);
console.log('  Streams:', addresses.streamPayment);
console.log('  Channels:', addresses.paymentChannel);
console.log('');
console.log('Privacy & AI:');
console.log('  Stealth:', addresses.stealthRegistry);
console.log('  Agent:', addresses.agentRegistry);`,
      },
    ],
  },
  {
    name: 'Utilities',
    icon: '🔧',
    description: 'Helper functions and utilities',
    apis: [
      {
        name: 'retry',
        description: 'Retry failed operations with backoff',
        params: ['fn', 'config?'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

console.log('Testing retry with exponential backoff...\\n');

let attempts = 0;

const result = await arc.utils.retry(
  async () => {
    attempts++;
    console.log(\`Attempt \${attempts}...\`);

    // Simulate failure for first 2 attempts
    if (attempts < 3) {
      throw new Error('Simulated network error');
    }
    return { success: true, attempts };
  },
  { maxAttempts: 5, baseDelay: 500 }
);

console.log('\\nSuccess after', result.attempts, 'attempts');`,
      },
      {
        name: 'validateAddress',
        description: 'Validate Ethereum address',
        params: ['address'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Test addresses
const addresses = [
  '0xc01A5abCF3719C7Ed9021847E686087214edCefb',
  '0xF505e2E71df58D7244189072008f25f6b6aaE5ae',
  '0xinvalid',
  '0x123',
  'not-an-address'
];

console.log('=== Address Validation ===\\n');

addresses.forEach(addr => {
  try {
    const validated = arc.utils.validateAddress(addr);
    console.log('✅', arc.utils.shortenAddress(addr), '- Valid');
  } catch (e) {
    console.log('❌', addr.slice(0, 10) + '...', '- Invalid');
  }
});`,
      },
      {
        name: 'formatAmount',
        description: 'Format amount with decimals',
        params: ['amount', 'decimals?'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

console.log('=== Amount Formatting ===\\n');

// Using viem directly (available in sandbox)
const amounts = ['100', '50.5', '0.001', '1000000'];

amounts.forEach(amt => {
  const wei = parseUnits(amt, 6);  // USDC has 6 decimals
  const formatted = formatUnits(wei, 6);
  console.log(\`\${amt} USDC → \${wei} wei → \${formatted} USDC\`);
});

console.log('\\n--- Address Shortening ---');
const addr = '0xc01A5abCF3719C7Ed9021847E686087214edCefb';
console.log('Full:', addr);
console.log('Short:', arc.utils.shortenAddress(addr));
console.log('Short (6):', arc.utils.shortenAddress(addr, 6));`,
      },
      {
        name: 'EventEmitter',
        description: 'Subscribe to SDK events',
        params: ['event', 'handler'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

console.log('=== Event System Demo ===\\n');

// Subscribe to events
arc.events.on('tx.sent', (e) => {
  console.log('📤 TX Sent:', e.data.hash);
});

arc.events.on('tx.confirmed', (e) => {
  console.log('✅ TX Confirmed:', e.data.hash, 'Block:', e.data.block);
});

arc.events.on('stream.claimed', (e) => {
  console.log('💰 Stream Claimed:', e.data.amount, 'USDC');
});

// Emit some test events
console.log('Emitting events...\\n');

arc.events.emit('tx.sent', { hash: '0xabc...' });
arc.events.emit('tx.confirmed', { hash: '0xabc...', block: 12345 });
arc.events.emit('stream.claimed', { streamId: '0x123', amount: '50' });

console.log('\\nEvent demo complete!');`,
      },
    ],
  },
  {
    name: 'Simple API',
    icon: '🎯',
    description: 'One-liner functions for quick integrations',
    apis: [
      {
        name: 'configure',
        description: 'Configure ArcPay globally',
        params: ['privateKey', 'network?'],
        code: `// Initialize ArcPay (configure equivalent)
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

console.log('✅ Configured!');
console.log('Network:', arc.network.name);
console.log('Address:', arc.address);

// Now use arc.sendUSDC(), arc.getBalance(), etc.`,
      },
      {
        name: 'pay',
        description: 'Send payment in one line',
        params: ['to', 'amount', 'options?'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

console.log('Sending from:', arc.address);

// ============ EDIT BELOW ============
const RECIPIENT = '0xc01A5abCF3719C7Ed9021847E686087214edCefb';  // ← Change this
const AMOUNT = '0.01';  // ← Change this (USDC)
// ====================================

// Simple payment
const result = await arc.sendUSDC(RECIPIENT, AMOUNT);
console.log('✅ Paid!');
console.log('TX Hash:', result.txHash);
console.log('🔗 Explorer:', result.explorerUrl);`,
      },
      {
        name: 'balance',
        description: 'Get balance in one line',
        params: ['options?'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

const usdc = await arc.getBalance();
console.log('Address:', arc.address);
console.log('Balance:', usdc, 'USDC');`,
      },
    ],
  },
  {
    name: 'Multisig Escrow',
    icon: '🔏',
    description: 'Multi-signature escrow',
    apis: [
      {
        name: 'multisigInfo',
        description: 'Multisig escrow information',
        params: [],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

console.log('Multisig Escrow Module');
console.log('======================');
console.log('Your address:', arc.address);
console.log('Escrow contract:', arc.contracts.escrow);
console.log('');
console.log('Multisig features:');
console.log('- Multiple signers with weights');
console.log('- Threshold-based approval');
console.log('- Proposal/vote mechanism');
console.log('');
console.log('💡 Create a regular escrow first with arc.escrow.create()');`,
      },
    ],
  },
  {
    name: 'Analytics',
    icon: '📈',
    description: 'Payment analytics and metrics',
    apis: [
      {
        name: 'analyticsInfo',
        description: 'Analytics module information',
        params: [],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

console.log('Analytics Module');
console.log('================');
console.log('Your address:', arc.address);
console.log('');
console.log('Track your payment metrics:');
console.log('- Total volume');
console.log('- Transaction count');
console.log('- Unique recipients');
console.log('- Time series data');`,
      },
    ],
  },
  {
    name: 'Webhooks',
    icon: '🔔',
    description: 'Event notifications',
    apis: [
      {
        name: 'createWebhookManager',
        description: 'Create webhook manager',
        params: ['config'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Register a webhook endpoint
const result = arc.webhooks.register({
  url: 'https://myapp.com/webhooks',
  events: [
    'payment.sent',
    'payment.received',
    'escrow.created',
    'escrow.released',
    'stream.claimed'
  ]
});

console.log('Webhook ID:', result.id);
console.log('Secret:', result.secret);
console.log('Status:', result.message);`,
      },
      {
        name: 'registerEndpoint',
        description: 'Register webhook endpoint',
        params: ['url', 'events'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Register webhook for payment events
const result = arc.webhooks.register({
  url: 'https://myapp.com/webhooks',
  events: ['payment.sent', 'payment.received']
});

console.log('Registered webhook:', result.id);

// List all webhooks
const allWebhooks = arc.webhooks.list();
console.log('All webhooks:', allWebhooks);`,
      },
      {
        name: 'verifySignature',
        description: 'Verify webhook signature',
        params: ['payload', 'signature'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Demo: Verify webhook signature
const payload = { type: 'payment.sent', amount: '100' };
const signature = 'sha256=abc123...';
const secret = 'whsec_xyz789...';

const isValid = arc.webhooks.verifySignature(payload, signature, secret);
console.log('Signature valid:', isValid);

// Simulate sending an event
const simulation = arc.webhooks.simulateEvent('payment.sent', {
  txHash: '0xabc...',
  amount: '100',
  to: '0x123...'
});
console.log('Simulation:', simulation);`,
      },
    ],
  },
  {
    name: 'Rate Limiting',
    icon: '🚦',
    description: 'API rate limiting utilities',
    apis: [
      {
        name: 'createRateLimiter',
        description: 'Create rate limiter',
        params: ['config'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Create a rate limiter (100 requests per minute)
const limiter = arc.createRateLimiter({
  maxRequests: 100,
  windowMs: 60 * 1000 // 1 minute
});

// Check rate limit for a user
const check1 = limiter.check('user_123');
console.log('First check:', check1);

const check2 = limiter.check('user_123');
console.log('Second check:', check2);

console.log('Remaining requests:', check2.remaining);`,
      },
      {
        name: 'rateLimit',
        description: 'Rate limit decorator',
        params: ['fn', 'config'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Create rate limiter with low limit for demo
const limiter = arc.createRateLimiter({
  maxRequests: 3,
  windowMs: 60000
});

// Simulate multiple requests
for (let i = 1; i <= 5; i++) {
  const result = limiter.check('demo_user');
  if (result.allowed) {
    console.log(\`Request \${i}: Allowed (remaining: \${result.remaining})\`);
  } else {
    console.log(\`Request \${i}: BLOCKED - retry in \${result.retryAfter}ms\`);
  }
}`,
      },
      {
        name: 'checkLimit',
        description: 'Check if rate limited',
        params: ['key'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Create limiter
const limiter = arc.createRateLimiter({
  maxRequests: 5,
  windowMs: 10000 // 10 seconds
});

// Check limit for user
const result = limiter.check('user_456');

if (result.allowed) {
  console.log('Request allowed!');
  console.log('Remaining:', result.remaining);
} else {
  console.log('Rate limited!');
  console.log('Retry after:', result.retryAfter, 'ms');
}

// Reset limit for user
limiter.reset('user_456');
console.log('Limit reset for user_456');`,
      },
    ],
  },
  {
    name: 'Events',
    icon: '📡',
    description: 'Real-time event system',
    apis: [
      {
        name: 'globalEventEmitter',
        description: 'Subscribe to SDK events',
        params: ['event', 'handler'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Subscribe to events
arc.events.on('payment.sent', (event) => {
  console.log('Payment sent!', event);
});

arc.events.on('payment.received', (event) => {
  console.log('Payment received!', event);
});

arc.events.on('escrow.created', (event) => {
  console.log('Escrow created!', event);
});

// Emit a test event
arc.events.emit('payment.sent', {
  txHash: '0xabc123...',
  to: '0x456...',
  amount: '100'
});

console.log('Event emitted successfully');`,
      },
      {
        name: 'TransactionWatcher',
        description: 'Watch transaction status',
        params: ['txHash'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Subscribe to transaction events
arc.events.on('tx.pending', (e) => console.log('TX pending:', e.data));
arc.events.on('tx.confirmed', (e) => console.log('TX confirmed:', e.data));
arc.events.on('tx.failed', (e) => console.log('TX failed:', e.data));

// Simulate transaction lifecycle
arc.events.emit('tx.pending', { hash: '0xabc...' });
await new Promise(r => setTimeout(r, 1000));
arc.events.emit('tx.confirmed', { hash: '0xabc...', blockNumber: 12345 });

console.log('Transaction watch demo complete');`,
      },
      {
        name: 'StreamWatcher',
        description: 'Watch stream events',
        params: ['streamId'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Subscribe to stream events
arc.events.on('stream.created', (e) => console.log('Stream created:', e.data));
arc.events.on('stream.claimed', (e) => console.log('Stream claimed:', e.data));
arc.events.on('stream.cancelled', (e) => console.log('Stream cancelled:', e.data));

// Simulate stream events
arc.events.emit('stream.created', {
  streamId: '0xstream123',
  recipient: '0x456...',
  amount: '1000'
});

arc.events.emit('stream.claimed', {
  streamId: '0xstream123',
  amount: '250'
});

console.log('Stream watch demo complete');`,
      },
      {
        name: 'createEvent',
        description: 'Create custom event',
        params: ['type', 'data'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Subscribe with once (fires only once)
arc.events.once('order.completed', (event) => {
  console.log('Order completed (once):', event);
});

// Subscribe normally
arc.events.on('order.completed', (event) => {
  console.log('Order completed (always):', event);
});

// Emit custom events
arc.events.emit('order.completed', {
  orderId: '12345',
  amount: '100',
  status: 'completed'
});

// Second emit - 'once' handler won't fire
arc.events.emit('order.completed', {
  orderId: '12346',
  amount: '200',
  status: 'completed'
});`,
      },
    ],
  },
  {
    name: 'Logging',
    icon: '📝',
    description: 'Structured logging system',
    apis: [
      {
        name: 'createLogger',
        description: 'Create a named logger',
        params: ['name', 'config?'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Set log level to debug
arc.logger.setLevel('debug');

// Use different log levels
arc.logger.debug('Debug: Processing payment...', { step: 1 });
arc.logger.info('Payment initiated', { to: '0x123...', amount: '100' });
arc.logger.warn('Low balance warning', { balance: '50' });
arc.logger.error('Payment failed', { error: 'Insufficient funds' });

// Get all logs
const logs = arc.logger.getLogs();
console.log('\\nTotal logs:', logs.length);`,
      },
      {
        name: 'defaultLogger',
        description: 'Use the default logger',
        params: [],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Clear any previous logs
arc.logger.clear();

// Log some messages
arc.logger.info('Starting payment process');
arc.logger.info('Connecting to Arc Testnet');
arc.logger.warn('Network congestion detected');
arc.logger.info('Payment completed');

// Review logs
console.log('\\nRecorded logs:');
arc.logger.getLogs().forEach(log => {
  console.log(\`[\${log.level.toUpperCase()}] \${log.message}\`);
});`,
      },
      {
        name: 'loggers',
        description: 'Access all loggers',
        params: [],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Simulate a payment flow with logging
arc.logger.info('=== Payment Flow Started ===');

arc.logger.info('Step 1: Validating address');
arc.logger.info('Step 2: Checking balance');
arc.logger.info('Step 3: Preparing transaction');
arc.logger.info('Step 4: Submitting to network');
arc.logger.info('Step 5: Waiting for confirmation');

arc.logger.info('=== Payment Flow Complete ===');

// Summary
console.log('\\nLog summary:', arc.logger.getLogs().length, 'entries');`,
      },
    ],
  },
  {
    name: 'Circuit Breaker',
    icon: '🔌',
    description: 'Fault tolerance patterns',
    apis: [
      {
        name: 'CircuitBreaker',
        description: 'Create circuit breaker for API calls',
        params: ['config'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Create circuit breaker (opens after 3 failures)
const breaker = arc.createCircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 5000 // 5 seconds
});

console.log('Initial state:', breaker.state);

// Simulate operations
for (let i = 1; i <= 5; i++) {
  try {
    await breaker.execute(async () => {
      // Simulate random failures
      if (Math.random() < 0.7) {
        throw new Error('Simulated failure');
      }
      return 'Success!';
    });
    console.log(\`Attempt \${i}: Success\`);
  } catch (e) {
    console.log(\`Attempt \${i}: \${e.message}\`);
  }
  console.log(\`  Circuit state: \${breaker.state}, failures: \${breaker.failures}\`);
}`,
      },
      {
        name: 'FallbackRPCManager',
        description: 'Manage multiple RPC endpoints with fallback',
        params: ['endpoints'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Circuit breaker can be used for RPC fallback
const breaker = arc.createCircuitBreaker({
  failureThreshold: 2,
  resetTimeout: 10000
});

const endpoints = [
  'https://rpc.testnet.arc.network',
  'https://rpc2.testnet.arc.network',
  'https://rpc3.testnet.arc.network'
];

console.log('Primary endpoint:', endpoints[0]);
console.log('Fallback endpoints:', endpoints.slice(1).length);

// Simulate using circuit breaker for RPC calls
let currentEndpoint = 0;
console.log('\\nSimulating RPC calls with circuit breaker...');
console.log('Circuit state:', breaker.state);`,
      },
      {
        name: 'batchExecute',
        description: 'Execute operations in batches',
        params: ['items', 'fn', 'options'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Demo recipients
const recipients = [
  '0x1111111111111111111111111111111111111111',
  '0x2222222222222222222222222222222222222222',
  '0x3333333333333333333333333333333333333333',
  '0x4444444444444444444444444444444444444444',
  '0x5555555555555555555555555555555555555555',
];

console.log('Processing', recipients.length, 'recipients in batches...');

// Process in batches using utils.batchExecute
const results = await arc.utils.batchExecute(
  recipients,
  async (recipient) => {
    // Simulate processing (not actual TX)
    await new Promise(r => setTimeout(r, 100));
    return { recipient, processed: true };
  },
  { batchSize: 2, delayMs: 500 }
);

console.log('\\nResults:');
console.log('Successful:', results.filter(r => r.success).length);
console.log('Failed:', results.filter(r => !r.success).length);`,
      },
    ],
  },
  {
    name: 'Advanced AI',
    icon: '🎯',
    description: 'Advanced AI analysis tools',
    apis: [
      {
        name: 'CommandParser',
        description: 'Parse payment commands',
        params: ['config'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Simple command parser demo
const commands = [
  'Send 50 USDC to 0xc01A5abCF3719C7Ed9021847E686087214edCefb',
  'Pay alice 100 for coffee',
  'Transfer 25.5 to bob',
];

console.log('=== Command Parser Demo ===\\n');

commands.forEach(cmd => {
  console.log('Input:', cmd);

  // Parse amount
  const amountMatch = cmd.match(/(\\d+\\.?\\d*)/);
  const amount = amountMatch ? amountMatch[1] : 'unknown';

  // Parse address or name
  const addrMatch = cmd.match(/0x[a-fA-F0-9]{40}/);
  const nameMatch = cmd.match(/to\\s+(\\w+)|pay\\s+(\\w+)/i);
  const recipient = addrMatch ? addrMatch[0] : (nameMatch ? (nameMatch[1] || nameMatch[2]) : 'unknown');

  console.log('  → Amount:', amount);
  console.log('  → Recipient:', recipient);
  console.log('');
});`,
      },
      {
        name: 'TransactionExplainer',
        description: 'Explain transactions in plain language',
        params: ['config'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Demo: Explain a transaction
const tx = {
  hash: '0xabc123def456...',
  from: '0xF505e2E71df58D7244189072008f25f6b6aaE5ae',
  to: '0xc01A5abCF3719C7Ed9021847E686087214edCefb',
  value: '10000000', // 10 USDC (6 decimals)
  data: '0xa9059cbb' // transfer selector
};

console.log('=== Transaction Explainer ===\\n');
console.log('TX Hash:', tx.hash);
console.log('');

// Explain in plain language
const fromShort = arc.utils.shortenAddress(tx.from);
const toShort = arc.utils.shortenAddress(tx.to);
const amount = (parseInt(tx.value) / 1000000).toFixed(2);

console.log('Summary:');
console.log(\`  You (\${fromShort}) sent \${amount} USDC to \${toShort}\`);
console.log('');
console.log('Details:');
console.log('  Type: ERC-20 Transfer');
console.log('  Token: USDC');
console.log('  Network: Arc Testnet');`,
      },
      {
        name: 'SpendingAdvisor',
        description: 'AI-powered spending analysis',
        params: ['config'],
        code: `// Initialize ArcPay
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY
});

// Demo: Analyze spending
const transactions = [
  { date: '2024-01-01', amount: 50, category: 'food' },
  { date: '2024-01-05', amount: 200, category: 'shopping' },
  { date: '2024-01-10', amount: 30, category: 'subscriptions' },
  { date: '2024-01-15', amount: 100, category: 'utilities' },
  { date: '2024-01-20', amount: 75, category: 'food' },
];

const budget = { monthly: 500 };
const totalSpent = transactions.reduce((sum, tx) => sum + tx.amount, 0);

console.log('=== Spending Analysis ===\\n');
console.log('Budget:', budget.monthly, 'USDC/month');
console.log('Spent:', totalSpent, 'USDC');
console.log('Remaining:', budget.monthly - totalSpent, 'USDC');
console.log('');

// Categorize spending
const byCategory = {};
transactions.forEach(tx => {
  byCategory[tx.category] = (byCategory[tx.category] || 0) + tx.amount;
});

console.log('By Category:');
Object.entries(byCategory).forEach(([cat, amt]) => {
  console.log(\`  \${cat}: \${amt} USDC\`);
});`,
      },
    ],
  }
];

// Calculate total API count
export const TOTAL_API_COUNT = API_CATEGORIES.reduce(
  (sum, cat) => sum + cat.apis.length,
  0
);

export const TOTAL_CATEGORY_COUNT = API_CATEGORIES.length;

// Get all API names for search
export const ALL_API_NAMES = API_CATEGORIES.flatMap((cat) =>
  cat.apis.map((api) => ({
    category: cat.name,
    name: api.name,
    description: api.description,
  }))
);
