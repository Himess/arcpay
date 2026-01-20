'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

type DocSection = 'why-arcpay' | 'getting-started' | 'ai-voice' | 'core' | 'contacts' | 'tools' | 'hackathon' | 'advanced' | 'contracts';

// Comparison data for Before/After cards
const COMPARISONS = [
  {
    id: 'payments',
    title: 'Send Payment',
    icon: '💳',
    withoutArcPay: `import { ethers } from 'ethers';
import { createPublicClient, http } from 'viem';

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const usdcContract = new ethers.Contract(
  USDC_ADDRESS,
  ['function transfer(address to, uint256 amount)'],
  wallet
);

const decimals = await usdcContract.decimals();
const amount = ethers.parseUnits('100', decimals);
const tx = await usdcContract.transfer(recipient, amount);
await tx.wait();
console.log('TX:', tx.hash);`,
    withArcPay: `const arc = await ArcPay.init({ network: 'arc-testnet' });
await arc.sendUSDC('0x...', '100');`,
    linesBefore: 15,
    linesAfter: 2,
    timeBefore: '30 min',
    timeAfter: '30 sec',
  },
  {
    id: 'escrow',
    title: 'Create Escrow',
    icon: '🔒',
    withoutArcPay: `// Deploy escrow contract
const EscrowFactory = await ethers.getContractFactory('Escrow');
const escrow = await EscrowFactory.deploy(
  seller, amount, deadline, arbiter
);
await escrow.deployed();

// Handle deposits
await usdc.approve(escrow.address, amount);
await escrow.deposit();

// Set up event listeners
escrow.on('Released', () => { /* ... */ });
escrow.on('Refunded', () => { /* ... */ });
escrow.on('Disputed', () => { /* ... */ });

// Release/refund logic
// ... 30+ more lines`,
    withArcPay: `await escrow('0x...', '500', 7); // 7 day release`,
    linesBefore: 50,
    linesAfter: 1,
    timeBefore: '2 hours',
    timeAfter: '10 sec',
  },
  {
    id: 'streaming',
    title: 'Salary Streaming',
    icon: '💸',
    withoutArcPay: `// Complex streaming contract deployment
// Per-second calculation logic
// Withdraw mechanism implementation
// Balance tracking system
// Cancel & refund logic
// Event handling
// ... 100+ lines of code`,
    withArcPay: `await stream('0x...', '5000', 30); // 30 days`,
    linesBefore: 100,
    linesAfter: 1,
    timeBefore: '1 day',
    timeAfter: '10 sec',
  },
  {
    id: 'contacts',
    title: 'Contact Payments',
    icon: '📇',
    withoutArcPay: `// Set up database for address book
// Create CRUD operations
// Implement address validation
// Build search functionality
// Handle name resolution
// ... hours of development`,
    withArcPay: `await addContact('ahmed', '0x...');
await pay('ahmed', '50'); // Use names, not 0x!`,
    linesBefore: 0,
    linesAfter: 2,
    timeBefore: 'Hours',
    timeAfter: 'Seconds',
    special: true,
  },
  {
    id: 'voice',
    title: 'Voice Payments',
    icon: '🎤',
    withoutArcPay: `// Set up speech recognition
// Implement intent parsing
// Integrate NLP for commands
// Build command routing
// Handle confirmations
// ... 200+ lines of code`,
    withArcPay: `// Just speak:
"Send 50 USDC to Ahmed"`,
    linesBefore: 200,
    linesAfter: 0,
    timeBefore: 'Days',
    timeAfter: 'Instant',
    special: true,
  },
];

// Feature grid data
const FEATURES = [
  { icon: '💳', title: 'Payments', code: 'pay("0x...", "100")', saved: '15+ → 2', color: 'from-blue-500 to-cyan-500' },
  { icon: '🔒', title: 'Escrow', code: 'escrow("0x...", "500", 7)', saved: '50+ → 1', color: 'from-cyan-500 to-blue-500' },
  { icon: '💸', title: 'Streaming', code: 'stream("0x...", "5000", 30)', saved: '100+ → 1', color: 'from-green-500 to-emerald-500' },
  { icon: '📇', title: 'Contacts', code: 'pay("ahmed", "50")', saved: 'N/A → 2', color: 'from-amber-500 to-orange-500' },
  { icon: '📅', title: 'Subscriptions', code: 'payAllDueBills()', saved: 'N/A → 1', color: 'from-red-500 to-rose-500' },
  { icon: '🎤', title: 'Voice', code: '"Send 50 to ahmed"', saved: '200+ → 0', color: 'from-blue-500 to-cyan-500' },
  { icon: '🤖', title: 'AI Agents', code: 'agent.executeTask()', saved: 'Complex → Simple', color: 'from-cyan-500 to-blue-500' },
  { icon: '🕵️', title: 'Privacy', code: 'stealthPay("0x...", "100")', saved: '300+ → 1', color: 'from-slate-500 to-gray-500' },
  { icon: '⚡', title: 'Channels', code: 'microPay("0x...", "0.01")', saved: '150+ → 1', color: 'from-yellow-500 to-lime-500' },
];

// Quick reference data
const QUICK_REF = [
  { action: 'Send payment', code: `await pay('0x...', '100')` },
  { action: 'Check balance', code: `await balance()` },
  { action: 'Create escrow', code: `await escrow('0x...', '500', 7)` },
  { action: 'Start stream', code: `await stream('0x...', '1000', 30)` },
  { action: 'Add contact', code: `await addContact('ahmed', '0x...')` },
  { action: 'Pay contact', code: `await pay('ahmed', '50')` },
  { action: 'Get due bills', code: `await getDueBills()` },
  { action: 'Pay all bills', code: `await payAllDueBills()` },
  { action: 'Voice command', code: `"Send 50 to ahmed"` },
];

// Copy to clipboard helper
const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
};

// Code block with copy button
const CodeBlock = ({ code, language = 'typescript', showCopy = true }: { code: string; language?: string; showCopy?: boolean }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    copyToClipboard(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-gray-900/80 backdrop-blur-sm p-4 rounded-lg overflow-x-auto text-sm border border-gray-800">
        <code>{code}</code>
      </pre>
      {showCopy && (
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-2 rounded-lg bg-gray-800 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Copy code"
        >
          {copied ? (
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
};

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<DocSection>('why-arcpay');
  const [animatedLines, setAnimatedLines] = useState({ from: 0, to: 0 });

  // Animate the line count in hero
  useEffect(() => {
    const timer1 = setTimeout(() => setAnimatedLines({ from: 50, to: 0 }), 500);
    const timer2 = setTimeout(() => setAnimatedLines({ from: 50, to: 3 }), 1000);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const sections = [
    { id: 'why-arcpay', label: 'Why ArcPay?', icon: '✨', isHighlight: true },
    { id: 'getting-started', label: 'Getting Started', icon: '🚀' },
    { id: 'hackathon', label: 'Hackathon Features', icon: '🏆' },
    { id: 'core', label: 'Core Modules', icon: '💰' },
    { id: 'contacts', label: 'Contacts & Subs', icon: '📇' },
    { id: 'ai-voice', label: 'AI & Voice', icon: '🤖' },
    { id: 'tools', label: 'Payment Tools', icon: '🛠️' },
    { id: 'advanced', label: 'Advanced', icon: '⚡' },
    { id: 'contracts', label: 'Contracts', icon: '📜' },
  ];

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="hidden md:block w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-2">
              <h2 className="text-lg font-semibold mb-4 text-gray-300">Documentation</h2>
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id as DocSection)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all ${
                    activeSection === section.id
                      ? section.isHighlight
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                        : 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800/50'
                  }`}
                >
                  <span>{section.icon}</span>
                  <span className="font-medium">{section.label}</span>
                </button>
              ))}
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 max-w-5xl">
            <AnimatePresence mode="wait">
              {/* WHY ARCPAY - Hero Section */}
              {activeSection === 'why-arcpay' && (
                <motion.div
                  key="why-arcpay"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-16"
                >
                  {/* Hero */}
                  <section className="text-center py-12">
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                        Build Payment Apps<br />in Minutes, Not Weeks
                      </h1>
                      <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
                        ArcPay reduces <span className="text-red-400 font-bold">50+ lines</span> of blockchain code to just <span className="text-green-400 font-bold">3 lines</span>
                      </p>
                    </motion.div>

                    {/* Animated comparison preview */}
                    <motion.div
                      initial={{ y: 30, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="flex flex-col md:flex-row items-center justify-center gap-6 mb-10"
                    >
                      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-8 py-6 min-w-[200px]">
                        <div className="text-red-400 text-sm font-medium mb-2">WITHOUT ArcPay</div>
                        <div className="text-4xl font-bold text-red-400">50+</div>
                        <div className="text-gray-500 text-sm">lines of code</div>
                        <div className="text-gray-600 text-xs mt-2">⏱️ 2+ hours</div>
                      </div>

                      <motion.div
                        animate={{ x: [0, 10, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="text-4xl"
                      >
                        →
                      </motion.div>

                      <div className="bg-green-500/10 border border-green-500/30 rounded-2xl px-8 py-6 min-w-[200px]">
                        <div className="text-green-400 text-sm font-medium mb-2">WITH ArcPay</div>
                        <motion.div
                          className="text-4xl font-bold text-green-400"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.8 }}
                        >
                          3
                        </motion.div>
                        <div className="text-gray-500 text-sm">lines of code</div>
                        <div className="text-gray-600 text-xs mt-2">⏱️ 2 minutes</div>
                      </div>
                    </motion.div>

                    {/* CTA buttons */}
                    <div className="flex flex-wrap justify-center gap-4">
                      <button
                        onClick={() => setActiveSection('getting-started')}
                        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all"
                      >
                        Get Started
                      </button>
                      <Link
                        href="/playground"
                        className="px-8 py-3 bg-gray-800 border border-gray-700 rounded-xl font-semibold hover:bg-gray-700 transition-all"
                      >
                        Try Playground
                      </Link>
                    </div>
                  </section>

                  {/* Before/After Comparison Cards */}
                  <section>
                    <h2 className="text-3xl font-bold text-center mb-2">See the Difference</h2>
                    <p className="text-gray-400 text-center mb-10">Real code comparisons for common payment tasks</p>

                    <div className="space-y-8">
                      {COMPARISONS.map((comp, i) => (
                        <motion.div
                          key={comp.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="bg-gray-900/50 rounded-2xl border border-gray-800 overflow-hidden"
                        >
                          <div className="p-4 border-b border-gray-800 flex items-center gap-3">
                            <span className="text-2xl">{comp.icon}</span>
                            <h3 className="text-xl font-semibold">{comp.title}</h3>
                            <span className="ml-auto text-sm bg-green-500/20 text-green-400 px-3 py-1 rounded-full">
                              {comp.linesBefore > 0 ? `${comp.linesBefore}+ → ${comp.linesAfter}` : `${comp.timeBefore} → ${comp.timeAfter}`} lines saved
                            </span>
                          </div>

                          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-800">
                            {/* Without ArcPay */}
                            <div className="p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-red-400">❌</span>
                                <span className="text-sm text-red-400 font-medium">Without ArcPay</span>
                              </div>
                              <div className="bg-gray-950/50 rounded-lg p-3 border-l-2 border-red-500/50 opacity-70">
                                <pre className="text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap">{comp.withoutArcPay}</pre>
                              </div>
                              <div className="flex gap-4 mt-3 text-xs text-gray-500">
                                <span>📝 {comp.linesBefore > 0 ? `${comp.linesBefore}+ lines` : 'N/A'}</span>
                                <span>⏱️ {comp.timeBefore}</span>
                              </div>
                            </div>

                            {/* With ArcPay */}
                            <div className="p-4 bg-green-500/5">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-green-400">✅</span>
                                <span className="text-sm text-green-400 font-medium">With ArcPay</span>
                              </div>
                              <div className="bg-gray-950/50 rounded-lg p-3 border-l-2 border-green-500/50">
                                <pre className="text-sm text-green-300 overflow-x-auto">{comp.withArcPay}</pre>
                              </div>
                              <div className="flex items-center justify-between mt-3">
                                <div className="flex gap-4 text-xs text-gray-500">
                                  <span>📝 {comp.linesAfter} lines</span>
                                  <span>⏱️ {comp.timeAfter}</span>
                                </div>
                                <Link
                                  href="/playground"
                                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                                >
                                  Try in Playground →
                                </Link>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </section>

                  {/* Feature Grid */}
                  <section>
                    <h2 className="text-3xl font-bold text-center mb-2">Everything You Need</h2>
                    <p className="text-gray-400 text-center mb-10">9 powerful modules, all with one-liner APIs</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {FEATURES.map((feature, i) => (
                        <motion.div
                          key={feature.title}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.05 }}
                          whileHover={{ scale: 1.02, y: -4 }}
                          className="relative bg-gray-900/50 rounded-xl border border-gray-800 p-5 cursor-pointer group overflow-hidden"
                        >
                          <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity`} />

                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-2xl">{feature.icon}</span>
                            <h3 className="font-semibold text-lg">{feature.title}</h3>
                          </div>

                          <code className="text-xs bg-gray-800/80 px-2 py-1 rounded text-gray-300 font-mono block mb-3 truncate">
                            {feature.code}
                          </code>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                              {feature.saved} lines
                            </span>
                            <Link
                              href="/playground"
                              className="text-xs text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Try it →
                            </Link>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </section>

                  {/* Quick Reference Table */}
                  <section>
                    <h2 className="text-3xl font-bold text-center mb-2">Quick Reference</h2>
                    <p className="text-gray-400 text-center mb-10">All the one-liners you need</p>

                    <div className="bg-gray-900/50 rounded-2xl border border-gray-800 overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-800/50">
                            <th className="text-left py-3 px-5 text-gray-400 font-medium">Action</th>
                            <th className="text-left py-3 px-5 text-gray-400 font-medium">Code</th>
                            <th className="text-right py-3 px-5 text-gray-400 font-medium">Copy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {QUICK_REF.map((item, i) => (
                            <tr key={i} className="border-t border-gray-800 hover:bg-gray-800/30 transition-colors">
                              <td className="py-3 px-5 text-gray-300">{item.action}</td>
                              <td className="py-3 px-5">
                                <code className="text-sm text-emerald-400 font-mono">{item.code}</code>
                              </td>
                              <td className="py-3 px-5 text-right">
                                <button
                                  onClick={() => copyToClipboard(item.code)}
                                  className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                                  title="Copy"
                                >
                                  <svg className="w-4 h-4 text-gray-500 hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {/* Final CTA */}
                  <section className="text-center py-12">
                    <h2 className="text-3xl font-bold mb-4">Ready to Build?</h2>
                    <p className="text-gray-400 mb-8">Start building payment applications in minutes</p>
                    <div className="flex flex-wrap justify-center gap-4">
                      <button
                        onClick={() => setActiveSection('getting-started')}
                        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all"
                      >
                        Read the Docs
                      </button>
                      <Link
                        href="/playground"
                        className="px-8 py-3 bg-gray-800 border border-gray-700 rounded-xl font-semibold hover:bg-gray-700 transition-all"
                      >
                        Try the Playground
                      </Link>
                    </div>
                  </section>
                </motion.div>
              )}

              {/* Getting Started */}
              {activeSection === 'getting-started' && (
                <motion.div
                  key="getting-started"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-12"
                >
                  <section>
                    <h1 className="text-4xl font-bold mb-4">Quick Start</h1>
                    <p className="text-gray-400 mb-8">Get up and running in 2 minutes</p>

                    <h2 className="text-2xl font-semibold mb-4">Installation</h2>
                    <CodeBlock code={`npm install arcpay
# or
yarn add arcpay
# or
pnpm add arcpay`} />

                    <h2 className="text-2xl font-semibold mt-8 mb-4">Environment Variables</h2>
                    <CodeBlock code={`# .env
PRIVATE_KEY=0x...          # Your wallet private key
GEMINI_API_KEY=AIza...     # For AI/Voice features (optional)
CIRCLE_API_KEY=...         # For Cross-chain bridge (optional)`} />

                    <h2 className="text-2xl font-semibold mt-8 mb-4">Basic Usage</h2>
                    <CodeBlock code={`import { ArcPay } from 'arcpay';

// Initialize client
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: process.env.PRIVATE_KEY,
});

// Check balance
const balance = await arc.getBalance();
console.log(\`Balance: \${balance} USDC\`);

// Send payment
const result = await arc.sendUSDC('0xRecipient...', '100');
console.log(\`Tx: \${result.explorerUrl}\`);`} />

                    <h2 className="text-2xl font-semibold mt-8 mb-4">Simple API (Even Easier!)</h2>
                    <p className="text-gray-400 mb-4">
                      Use our simplified one-liner functions for common operations:
                    </p>
                    <CodeBlock code={`import { configure, pay, balance, escrow, stream } from 'arcpay';

// Configure once
configure({ network: 'arc-testnet', privateKey: '0x...' });

// Then use one-liners everywhere
const bal = await balance();                    // Check balance
await pay('0x...', '100');                      // Send payment
await escrow('0x...', '500', 7);               // Create escrow (7 days)
await stream('0x...', '5000', 30);             // Start stream (30 days)`} />

                    <div className="mt-8 p-6 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
                      <h3 className="text-lg font-semibold text-cyan-400 mb-2">💡 Pro Tip</h3>
                      <p className="text-gray-300">
                        Try the <Link href="/playground" className="text-cyan-400 hover:underline">Playground</Link> to test
                        these commands interactively without writing any code!
                      </p>
                    </div>
                  </section>
                </motion.div>
              )}

              {/* Core Modules */}
              {activeSection === 'core' && (
                <motion.div
                  key="core"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-12"
                >
                  <section>
                    <h1 className="text-4xl font-bold mb-8">Core Modules</h1>

                    <h2 className="text-2xl font-semibold mb-4">🔒 Escrow</h2>
                    <p className="text-gray-400 mb-4">
                      Trustless escrow with multi-party support and arbiter resolution.
                    </p>
                    <CodeBlock code={`// Create escrow (one-liner)
await escrow('0xSeller...', '500', 7);  // 7 day deadline

// Or with full options
const escrow = await arc.escrow.create({
  seller: '0xSeller...',
  amount: '500',
  arbiter: '0xArbiter...',      // Optional dispute resolver
  deadline: Math.floor(Date.now()/1000) + 86400, // 24h
});

// Release when satisfied
await arc.escrow.release(escrow.id);

// Or refund if deadline passes
await arc.escrow.refund(escrow.id);`} />

                    <h2 className="text-2xl font-semibold mt-12 mb-4">💸 Streaming Payments</h2>
                    <p className="text-gray-400 mb-4">
                      Per-second payment streams for salaries, subscriptions, and more.
                    </p>
                    <CodeBlock code={`// Create stream (one-liner)
await stream('0xEmployee...', '5000', 30);  // $5000 over 30 days

// Check streamable amount
const available = await arc.streaming.getStreamable(streamId);

// Recipient withdraws
await arc.streaming.withdraw(streamId);

// Sender cancels (remaining returned)
await arc.streaming.cancel(streamId);`} />

                    <h2 className="text-2xl font-semibold mt-12 mb-4">⚡ Payment Channels</h2>
                    <p className="text-gray-400 mb-4">
                      Off-chain micropayments with zero gas per transaction.
                    </p>
                    <CodeBlock code={`// Open channel with deposit
const channel = await arc.channels.open({
  participant: '0xMerchant...',
  deposit: '100',
});

// Send off-chain payments (no gas!)
await arc.channels.pay(channel.id, '0.01');
await arc.channels.pay(channel.id, '0.02');
await arc.channels.pay(channel.id, '0.005');

// Close and settle on-chain
await arc.channels.close(channel.id);`} />
                  </section>
                </motion.div>
              )}

              {/* Contacts & Subscriptions */}
              {activeSection === 'contacts' && (
                <motion.div
                  key="contacts"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-12"
                >
                  <section>
                    <div className="flex items-center gap-3 mb-4">
                      <h1 className="text-4xl font-bold">Contacts & Subscriptions</h1>
                      <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm">NEW</span>
                    </div>
                    <p className="text-gray-400 mb-8">
                      Pay by name, track bills, never miss a due date.
                    </p>

                    <h2 className="text-2xl font-semibold mb-4">📇 Contacts</h2>
                    <p className="text-gray-400 mb-4">
                      Say goodbye to copying wallet addresses. Use human-readable names instead.
                    </p>
                    <CodeBlock code={`import { addContact, pay, getContact, searchContacts } from 'arcpay';

// Add contacts
await addContact('ahmed', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78');
await addContact('netflix', '0x8ba1f109551bD432803012645Ac136ddd64DBA72', {
  category: 'subscription',
  monthlyAmount: '15.99',
  billingDay: 15,
});

// Now pay by name!
await pay('ahmed', '50');      // No more 0x addresses!
await pay('netflix', '15.99'); // Pay your Netflix

// Fuzzy search
const results = await searchContacts('ahm');  // Finds "ahmed"

// Voice-friendly
// "Send 50 to ahmed" - Just works!`} />

                    <h2 className="text-2xl font-semibold mt-12 mb-4">📅 Subscriptions</h2>
                    <p className="text-gray-400 mb-4">
                      Track all your recurring payments. Get notified when bills are due.
                    </p>
                    <CodeBlock code={`import {
  addSubscription,
  getDueBills,
  getUpcomingBills,
  payBill,
  payAllDueBills,
  snoozeBill,
  getMonthlySubscriptionTotal
} from 'arcpay';

// Add subscriptions
await addSubscription('netflix', '0x...', '15.99', 15);  // Due on 15th
await addSubscription('spotify', '0x...', '9.99', 1);    // Due on 1st
await addSubscription('github', '0x...', '4.00', 20);    // Due on 20th

// Check what's due
const dueBills = await getDueBills();        // Due today or overdue
const upcoming = await getUpcomingBills(7);  // Due in next 7 days

// Pay individual bill
await payBill('netflix');

// Or pay all at once!
const result = await payAllDueBills();
// { paid: 3, total: '29.98', transactions: [...] }

// Need more time? Snooze it
await snoozeBill('spotify', 3);  // Snooze 3 days

// Monthly spending
const total = await getMonthlySubscriptionTotal();
console.log(\`You spend $\${total}/month on subscriptions\`);`} />

                    <h2 className="text-2xl font-semibold mt-12 mb-4">🎤 Voice Commands</h2>
                    <p className="text-gray-400 mb-4">
                      Manage contacts and subscriptions with your voice.
                    </p>
                    <CodeBlock code={`// Contact commands
"Save ahmed as 0x742d35..."
"Who is ahmed?"
"Send $50 to ahmed"
"Pay ahmed 100 USDC"
"List my contacts"

// Subscription commands
"What bills are due?"
"Pay my netflix"
"Pay all my bills"
"Snooze spotify for 3 days"
"How much do I spend on subscriptions?"
"Show my subscriptions"`} />
                  </section>
                </motion.div>
              )}

              {/* AI & Voice */}
              {activeSection === 'ai-voice' && (
                <motion.div
                  key="ai-voice"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-12"
                >
                  <section>
                    <div className="flex items-center gap-3 mb-4">
                      <h1 className="text-4xl font-bold">AI & Voice</h1>
                      <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm">NEW</span>
                    </div>
                    <p className="text-gray-400 mb-8">
                      Powered by Gemini - voice commands, image payments, and AI function calling.
                    </p>

                    <h2 className="text-2xl font-semibold mb-4">🎤 Voice Commands</h2>
                    <CodeBlock code={`import { createVoiceAgent } from 'arcpay';

const agent = createVoiceAgent({
  privateKey: process.env.PRIVATE_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
});

// User says: "Send 50 to ahmed for the article"
const result = await agent.executeVoiceCommand();
// { success: true, txHash: '0x...', action: 'pay', amount: '50' }`} />

                    <h2 className="text-2xl font-semibold mt-12 mb-4">📸 Image Payments (Invoice)</h2>
                    <CodeBlock code={`// Pay invoice from image
const result = await agent.payInvoice(invoiceImageBuffer);

// {
//   success: true,
//   extracted: {
//     amount: 150,
//     recipient: '0x9f2...',
//     invoiceNumber: 'INV-2026-0042',
//   },
//   txHash: '0xabc...',
//   confidence: 97
// }`} />

                    <h2 className="text-2xl font-semibold mt-12 mb-4">🤖 AI Agent Registry</h2>
                    <CodeBlock code={`// Register your agent
await arc.agent.register({
  name: 'WriterBot',
  capabilities: ['content', 'research'],
  ratePerTask: '10', // USDC
});

// Hire an agent
const job = await arc.agent.hire({
  agentAddress: '0xWriterBot...',
  budget: '50',
  task: 'Write a blog post',
});

// Approve and release payment
await arc.agent.approveWork(job.id);`} />
                  </section>
                </motion.div>
              )}

              {/* Payment Tools */}
              {activeSection === 'tools' && (
                <motion.div
                  key="tools"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-12"
                >
                  <section>
                    <h1 className="text-4xl font-bold mb-4">Payment Tools</h1>
                    <p className="text-gray-400 mb-8">
                      Convenience modules for managing payments, contacts, and requests.
                    </p>

                    <h2 className="text-2xl font-semibold mb-4">📇 Contacts (Pay by Name)</h2>
                    <p className="text-gray-400 mb-4">
                      Store addresses with human-readable names. Pay "ahmed" instead of "0x742d35...".
                    </p>
                    <CodeBlock code={`import { addContact, getContact, pay } from 'arcpay';

// Save a contact
await addContact('ahmed', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78');
await addContact('alice', '0x8ba1f109551bD432803012645Ac136ddd64DBA72');

// Pay by name - no more copy-pasting addresses!
await pay('ahmed', '50');
await pay('alice', '100');

// Get contact details
const contact = await getContact('ahmed');
console.log(contact.address); // 0x742d35...`} />

                    <h2 className="text-2xl font-semibold mt-8 mb-4">📋 Templates (Reusable Payments)</h2>
                    <p className="text-gray-400 mb-4">
                      Create payment templates for recurring transactions.
                    </p>
                    <CodeBlock code={`import { createTemplate, executeTemplate } from 'arcpay';

// Create a template for monthly rent
const template = await createTemplate({
  name: 'Monthly Rent',
  recipient: '0x...landlord',
  amount: '1500',
  memo: 'Rent payment'
});

// Execute template with one click
await executeTemplate(template.id);`} />

                    <h2 className="text-2xl font-semibold mt-8 mb-4">🔗 Links (Shareable Payment Links)</h2>
                    <p className="text-gray-400 mb-4">
                      Generate payment links that anyone can use to pay you.
                    </p>
                    <CodeBlock code={`import { createPaymentLink, getPaymentLink } from 'arcpay';

// Create a payment link
const link = await createPaymentLink({
  amount: '25',
  memo: 'Coffee meetup',
  expiresIn: '7d'
});

console.log(link.url); // https://pay.arcpay.io/link/abc123

// Check link status
const status = await getPaymentLink(link.id);
console.log(status.paid); // true/false`} />

                    <h2 className="text-2xl font-semibold mt-8 mb-4">📨 Requests (Payment Requests)</h2>
                    <p className="text-gray-400 mb-4">
                      Request payments from others with notifications.
                    </p>
                    <CodeBlock code={`import { createRequest, getMyRequests, payRequest } from 'arcpay';

// Request payment from someone
const request = await createRequest({
  from: '0x...debtor',
  amount: '100',
  memo: 'Dinner split from last week'
});

// Check incoming requests
const myRequests = await getMyRequests();

// Pay a request
await payRequest(request.id);`} />

                    <h2 className="text-2xl font-semibold mt-8 mb-4">➗ Split (Split Bills)</h2>
                    <p className="text-gray-400 mb-4">
                      Split payments among multiple recipients.
                    </p>
                    <CodeBlock code={`import { splitPayment, splitEvenly } from 'arcpay';

// Split custom amounts
await splitPayment('150', [
  { address: '0x...alice', amount: '50' },
  { address: '0x...bob', amount: '50' },
  { address: '0x...carol', amount: '50' },
]);

// Split evenly
await splitEvenly('90', ['0x...alice', '0x...bob', '0x...carol']);
// Each receives 30 USDC`} />
                  </section>
                </motion.div>
              )}

              {/* Hackathon Features */}
              {activeSection === 'hackathon' && (
                <motion.div
                  key="hackathon"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-12"
                >
                  <section>
                    <h1 className="text-4xl font-bold mb-4">Hackathon Features</h1>
                    <p className="text-gray-400 mb-8">
                      Key features built for the Arc Hackathon 2026 - Best Dev Tools Track.
                    </p>

                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                      <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 rounded-xl p-6 border border-blue-500/30">
                        <div className="text-3xl mb-3">⚡</div>
                        <h3 className="text-xl font-bold mb-2">x402 Protocol</h3>
                        <p className="text-gray-400 text-sm">Pay-per-request API monetization without gas fees</p>
                      </div>
                      <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 rounded-xl p-6 border border-green-500/30">
                        <div className="text-3xl mb-3">⛽</div>
                        <h3 className="text-xl font-bold mb-2">Gasless Payments</h3>
                        <p className="text-gray-400 text-sm">Users don't need ETH - sponsor their gas with USDC</p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-xl p-6 border border-purple-500/30">
                        <div className="text-3xl mb-3">🌐</div>
                        <h3 className="text-xl font-bold mb-2">Circle Gateway</h3>
                        <p className="text-gray-400 text-sm">Unified balance across Ethereum, Arbitrum, Base, Arc</p>
                      </div>
                      <div className="bg-gradient-to-br from-amber-600/20 to-orange-600/20 rounded-xl p-6 border border-amber-500/30">
                        <div className="text-3xl mb-3">🤖</div>
                        <h3 className="text-xl font-bold mb-2">AI Voice Commands</h3>
                        <p className="text-gray-400 text-sm">"Send 50 to Ahmed" - Gemini understands and executes</p>
                      </div>
                    </div>

                    <h2 className="text-2xl font-semibold mb-4">⚡ x402 Protocol (Micropayments)</h2>
                    <p className="text-gray-400 mb-4">
                      Monetize APIs with pay-per-request. No subscriptions, no gas fees.
                    </p>
                    <CodeBlock code={`// Server: Add paywall to your API
import { micropayments } from 'arcpay';

app.use(micropayments.paywall('0xYourAddress', {
  'GET /api/premium': { price: '0.10', description: 'Premium data' },
  'POST /api/generate': { price: '1.00', description: 'AI generation' },
}));

// Client: Pay for API access
const data = await micropayments.pay('https://api.example.com/premium');`} />

                    <h2 className="text-2xl font-semibold mt-8 mb-4">⛽ Gas Station (Gasless Transactions)</h2>
                    <p className="text-gray-400 mb-4">
                      Sponsor gas fees for your users. They pay in USDC, you cover the ETH.
                    </p>
                    <CodeBlock code={`import { gasStation } from 'arcpay';

// Sponsor a user's transaction
const result = await gasStation.sponsorTransaction({
  userAddress: '0x...user',
  transaction: {
    to: '0x...recipient',
    data: '0x...',
  },
  maxGasUSDC: '1.00' // Max gas cost in USDC
});

console.log(result.txHash); // Transaction sent without user paying gas!`} />

                    <h2 className="text-2xl font-semibold mt-8 mb-4">🌐 Circle Gateway (Unified Balance)</h2>
                    <p className="text-gray-400 mb-4">
                      See and use your USDC across all chains from one interface.
                    </p>
                    <CodeBlock code={`import { gateway } from 'arcpay';

// Get unified balance across all chains
const balance = await gateway.getUnifiedBalance('0x...user');
console.log(balance);
// {
//   total: '1500.00',
//   chains: {
//     ethereum: '500.00',
//     arbitrum: '300.00',
//     base: '400.00',
//     arc: '300.00'
//   }
// }

// Pay from any chain, gateway handles routing
await gateway.payFrom({
  recipient: '0x...',
  amount: '100',
  preferredChain: 'arc' // Or 'cheapest', 'fastest'
});`} />

                    <h2 className="text-2xl font-semibold mt-8 mb-4">🛡️ Compliance Module</h2>
                    <p className="text-gray-400 mb-4">
                      Built-in KYC/AML/Sanctions screening for enterprise use.
                    </p>
                    <CodeBlock code={`import { compliance } from 'arcpay';

// Check address before sending
const check = await compliance.screenAddress('0x...');
if (check.passed) {
  await pay('0x...', '1000');
} else {
  console.log('Blocked:', check.reason);
  // e.g., "Address on OFAC sanctions list"
}`} />
                  </section>
                </motion.div>
              )}

              {/* Advanced */}
              {activeSection === 'advanced' && (
                <motion.div
                  key="advanced"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-12"
                >
                  <section>
                    <h1 className="text-4xl font-bold mb-8">Advanced Features</h1>

                    <h2 className="text-2xl font-semibold mb-4">🕵️ Privacy (Stealth Addresses)</h2>
                    <p className="text-gray-400 mb-4">
                      Send payments that can't be linked to the recipient on-chain (EIP-5564).
                    </p>
                    <CodeBlock code={`// Generate stealth address
const stealth = await arc.privacy.generateStealthAddress(recipientPublicKey);

// Send to stealth address
await arc.privacy.sendStealth({
  stealthAddress: stealth.address,
  amount: '100',
  ephemeralPubKey: stealth.ephemeralPubKey,
});

// Recipient scans for payments
const payments = await arc.privacy.scanPayments(viewingKey);`} />

                    <h2 className="text-2xl font-semibold mt-12 mb-4">🌉 Cross-Chain Bridge</h2>
                    <CodeBlock code={`// Bridge from Ethereum to Arc
const result = await arc.bridge.send({
  sourceChain: 'ethereum',
  destinationChain: 'arc',
  amount: '1000',
  recipient: '0xRecipient...',
});

// Check bridge status
const status = await arc.bridge.getStatus(result.messageId);`} />

                    <h2 className="text-2xl font-semibold mt-12 mb-4">💱 FX Swap</h2>
                    <CodeBlock code={`// Get exchange rate
const rate = await arc.fx.getRate('USDC', 'EURC');

// Swap USDC to EURC
await arc.fx.swap({
  from: 'USDC',
  to: 'EURC',
  amount: '1000',
  minReceived: '920', // Slippage protection
});`} />
                  </section>
                </motion.div>
              )}

              {/* Contracts */}
              {activeSection === 'contracts' && (
                <motion.div
                  key="contracts"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-12"
                >
                  <section>
                    <h1 className="text-4xl font-bold mb-4">Smart Contracts</h1>
                    <p className="text-gray-400 mb-8">
                      All contracts are deployed on Arc Testnet (Chain ID: 5042002).
                    </p>

                    <div className="overflow-x-auto bg-gray-900/50 rounded-xl border border-gray-800">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-gray-800 bg-gray-800/50">
                            <th className="py-3 px-4 font-medium text-gray-300">Contract</th>
                            <th className="py-3 px-4 font-medium text-gray-300">Address</th>
                            <th className="py-3 px-4 font-medium text-gray-300">Description</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-400">
                          <tr className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                            <td className="py-3 px-4 font-medium text-white">Escrow</td>
                            <td className="py-3 px-4">
                              <a
                                href="https://testnet.arcscan.app/address/0x0a982E2250F1C66487b88286e14D965025dD89D2"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-sm text-cyan-400 hover:text-cyan-300 hover:underline"
                              >
                                0x0a982E2250F1C66487b88286e14D965025dD89D2
                              </a>
                            </td>
                            <td className="py-3 px-4">Multi-party escrow with arbiter</td>
                          </tr>
                          <tr className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                            <td className="py-3 px-4 font-medium text-white">PaymentChannel</td>
                            <td className="py-3 px-4">
                              <a
                                href="https://testnet.arcscan.app/address/0x3FF7bC1C52e7DdD2B7B915bDAdBe003037B0FA2E"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-sm text-cyan-400 hover:text-cyan-300 hover:underline"
                              >
                                0x3FF7bC1C52e7DdD2B7B915bDAdBe003037B0FA2E
                              </a>
                            </td>
                            <td className="py-3 px-4">Off-chain micropayments</td>
                          </tr>
                          <tr className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                            <td className="py-3 px-4 font-medium text-white">StreamPayment</td>
                            <td className="py-3 px-4">
                              <a
                                href="https://testnet.arcscan.app/address/0x4678D992De548bddCb5Cd4104470766b5207A855"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-sm text-cyan-400 hover:text-cyan-300 hover:underline"
                              >
                                0x4678D992De548bddCb5Cd4104470766b5207A855
                              </a>
                            </td>
                            <td className="py-3 px-4">Per-second streaming</td>
                          </tr>
                          <tr className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                            <td className="py-3 px-4 font-medium text-white">StealthRegistry</td>
                            <td className="py-3 px-4">
                              <a
                                href="https://testnet.arcscan.app/address/0xbC6d02dBDe96caE69680BDbB63f9A12a14F3a41B"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-sm text-cyan-400 hover:text-cyan-300 hover:underline"
                              >
                                0xbC6d02dBDe96caE69680BDbB63f9A12a14F3a41B
                              </a>
                            </td>
                            <td className="py-3 px-4">Privacy stealth addresses</td>
                          </tr>
                          <tr className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                            <td className="py-3 px-4 font-medium text-white">AgentRegistry</td>
                            <td className="py-3 px-4">
                              <a
                                href="https://testnet.arcscan.app/address/0x5E3ef9A91AD33270f84B32ACFF91068Eea44c5ee"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-sm text-cyan-400 hover:text-cyan-300 hover:underline"
                              >
                                0x5E3ef9A91AD33270f84B32ACFF91068Eea44c5ee
                              </a>
                            </td>
                            <td className="py-3 px-4">AI agent management</td>
                          </tr>
                          <tr className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                            <td className="py-3 px-4 font-medium text-white">USDC</td>
                            <td className="py-3 px-4">
                              <a
                                href="https://testnet.arcscan.app/address/0x3600000000000000000000000000000000000000"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-sm text-cyan-400 hover:text-cyan-300 hover:underline"
                              >
                                0x3600000000000000000000000000000000000000
                              </a>
                            </td>
                            <td className="py-3 px-4">Native USDC (Arc's gas token)</td>
                          </tr>
                          <tr className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                            <td className="py-3 px-4 font-medium text-white">EURC</td>
                            <td className="py-3 px-4">
                              <a
                                href="https://testnet.arcscan.app/address/0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-sm text-cyan-400 hover:text-cyan-300 hover:underline"
                              >
                                0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a
                              </a>
                            </td>
                            <td className="py-3 px-4">Circle EURC stablecoin</td>
                          </tr>
                          <tr className="hover:bg-gray-800/30 transition-colors">
                            <td className="py-3 px-4 font-medium text-white">USYC</td>
                            <td className="py-3 px-4">
                              <a
                                href="https://testnet.arcscan.app/address/0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-sm text-cyan-400 hover:text-cyan-300 hover:underline"
                              >
                                0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C
                              </a>
                            </td>
                            <td className="py-3 px-4">Circle USYC (yield-bearing)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <h2 className="text-2xl font-semibold mt-8 mb-4">Import ABIs</h2>
                    <CodeBlock code={`import {
  EscrowABI,
  PaymentChannelABI,
  StreamPaymentABI,
  StealthRegistryABI,
  AgentRegistryABI,
} from 'arcpay/contracts';

import { getContractAddresses } from 'arcpay';
const addresses = getContractAddresses(5042002); // Arc Testnet`} />

                    <div className="mt-8">
                      <a
                        href="https://testnet.arcscan.app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300"
                      >
                        View all contracts on ArcScan
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </section>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
