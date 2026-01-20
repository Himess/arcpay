'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

export default function Home() {
  const [demoStep, setDemoStep] = useState(0);
  const [isListening, setIsListening] = useState(false);

  const demoSteps = [
    { text: '"Send 50 dollars to writer-bot for the blog post"', type: 'user' },
    { text: 'Processing with Gemini AI...', type: 'processing' },
    { text: 'Executing payment on Arc...', type: 'processing' },
    { text: 'Sent 50 USDC to writer-bot', type: 'success' },
  ];

  useEffect(() => {
    if (isListening && demoStep < demoSteps.length) {
      const timer = setTimeout(() => {
        setDemoStep(prev => prev + 1);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isListening, demoStep]);

  const startDemo = () => {
    setIsListening(true);
    setDemoStep(0);
  };

  const resetDemo = () => {
    setIsListening(false);
    setDemoStep(0);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-900/20 via-blue-900/10 to-transparent" />

        <motion.div
          className="max-w-7xl mx-auto text-center relative z-10"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          {/* Tech Badge */}
          <motion.div variants={fadeIn} className="flex items-center justify-center gap-2 mb-6">
            <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm font-medium backdrop-blur-sm border border-cyan-500/20">
              Powered by Gemini 3 Flash
            </span>
          </motion.div>

          <motion.h1 variants={fadeIn} className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              ArcPay
            </span>
          </motion.h1>

          <motion.p variants={fadeIn} className="text-xl md:text-2xl text-gray-300 mb-4 max-w-3xl mx-auto">
            The All-in-One Payment SDK
          </motion.p>

          <motion.p variants={fadeIn} className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
            Voice commands, AI agents, escrow, streaming, micropayments, privacy—everything you need in one SDK.
          </motion.p>

          {/* Tech Badges Row */}
          <motion.div variants={fadeIn} className="flex flex-wrap justify-center gap-3 mb-8">
            {[
              { label: 'TypeScript', color: 'blue' },
              { label: 'Arc Network', color: 'cyan' },
              { label: 'USDC', color: 'green' },
              { label: 'Gemini AI', color: 'blue' },
              { label: 'ERC-4337', color: 'orange' },
            ].map((badge) => (
              <span
                key={badge.label}
                className={`px-3 py-1 text-xs font-medium rounded-full backdrop-blur-sm border ${
                  badge.color === 'blue' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                  badge.color === 'cyan' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                  badge.color === 'green' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  badge.color === 'blue' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                  'bg-orange-500/10 text-orange-400 border-orange-500/20'
                }`}
              >
                {badge.label}
              </span>
            ))}
          </motion.div>

          {/* Stats Row */}
          <motion.div variants={fadeIn} className="flex flex-wrap justify-center gap-8 mb-12">
            {[
              { value: '5', label: 'Smart Contracts' },
              { value: '150+', label: 'APIs' },
              { value: '28', label: 'Modules' },
              { value: '500+', label: 'Tests Passing' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-cyan-400">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Voice Demo Box */}
          <motion.div
            variants={fadeIn}
            className="max-w-2xl mx-auto bg-gray-900/80 backdrop-blur border border-gray-800 rounded-2xl p-8 mb-12"
          >
            <div className="flex flex-col items-center">
              <button
                onClick={isListening ? resetDemo : startDemo}
                className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all ${
                  isListening
                    ? 'bg-red-500/20 border-2 border-red-500 animate-pulse'
                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500'
                }`}
              >
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </button>

              <p className="text-gray-400 mb-6">
                {isListening ? 'Listening...' : 'Click to try voice command'}
              </p>

              <div className="w-full space-y-3 text-left">
                {demoSteps.slice(0, demoStep).map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center gap-3 ${
                      step.type === 'success' ? 'text-emerald-400' :
                      step.type === 'processing' ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                  >
                    {step.type === 'success' && <span>✅</span>}
                    {step.type === 'processing' && <span>⏳</span>}
                    {step.type === 'user' && <span>🎤</span>}
                    <span>{step.text}</span>
                  </motion.div>
                ))}
                {demoStep >= demoSteps.length && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-gray-500 mt-4"
                  >
                    Tx: 0xabc123...789 <a href="#" className="text-cyan-400 hover:underline">View on ArcScan ↗</a>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div variants={fadeIn} className="flex flex-wrap justify-center gap-4 mb-12">
            <Link
              href="/playground"
              className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <span>🎮</span> Try Playground
            </Link>
            <Link
              href="/docs"
              className="px-8 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <span>📚</span> Docs
            </Link>
            <a
              href="https://github.com/Himess/arcpay"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <span>⭐</span> GitHub
            </a>
          </motion.div>

          {/* Feature Pills */}
          <motion.div variants={fadeIn} className="flex flex-wrap justify-center gap-4">
            {[
              { icon: '🎤', label: 'Voice Commands' },
              { icon: '📸', label: 'Vision (Invoice)' },
              { icon: '🔗', label: 'On-chain Trustless' },
              { icon: '🤖', label: 'Agents Autonomous' },
            ].map((item, i) => (
              <div key={i} className="px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
                <span className="mr-2">{item.icon}</span>
                <span className="text-gray-300">{item.label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* AI Capabilities Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-900/50 to-gray-950">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              🧠 Powered by <span className="text-cyan-400">Gemini 3 Flash</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Multimodal AI that understands voice, images, and context to execute payments autonomously
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Voice Commands */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gray-900/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 hover:border-cyan-500/30 transition-all"
            >
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span>🎤</span> Voice Commands
              </h3>
              <div className="space-y-4 text-sm">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-gray-400">"Send 50 to writer-bot"</p>
                  <div className="mt-2 text-gray-500">↓</div>
                  <p className="text-gray-300">Gemini understands:</p>
                  <ul className="text-gray-400 mt-1 space-y-1">
                    <li>• Action: <span className="text-cyan-400">pay</span></li>
                    <li>• Amount: <span className="text-cyan-400">50 USDC</span></li>
                    <li>• Recipient: <span className="text-cyan-400">writer-bot</span></li>
                  </ul>
                  <div className="mt-2 text-gray-500">↓</div>
                  <p className="text-emerald-400">✅ Payment executed</p>
                </div>
              </div>
            </motion.div>

            {/* Vision Payments */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gray-900/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 hover:border-cyan-500/30 transition-all"
            >
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span>📸</span> Vision Payments
              </h3>
              <div className="space-y-4 text-sm">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-gray-400">[Invoice Image]</p>
                  <div className="mt-2 text-gray-500">↓</div>
                  <p className="text-gray-300">Gemini extracts:</p>
                  <ul className="text-gray-400 mt-1 space-y-1">
                    <li>• Amount: <span className="text-cyan-400">$150</span></li>
                    <li>• Recipient: <span className="text-cyan-400">0x123...</span></li>
                    <li>• Due: <span className="text-cyan-400">Jan 30, 2026</span></li>
                  </ul>
                  <div className="mt-2 text-gray-500">↓</div>
                  <p className="text-emerald-400">✅ Invoice paid</p>
                </div>
              </div>
            </motion.div>

            {/* Delivery Verification */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gray-900/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 hover:border-cyan-500/30 transition-all"
            >
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span>📦</span> Delivery Verification
              </h3>
              <div className="space-y-4 text-sm">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-gray-400">[Delivery Photo]</p>
                  <div className="mt-2 text-gray-500">↓</div>
                  <p className="text-gray-300">Gemini analyzes:</p>
                  <ul className="text-gray-400 mt-1 space-y-1">
                    <li>• Package visible <span className="text-emerald-400">✓</span></li>
                    <li>• At front door <span className="text-emerald-400">✓</span></li>
                    <li>• Confidence: <span className="text-cyan-400">95%</span></li>
                  </ul>
                  <div className="mt-2 text-gray-500">↓</div>
                  <p className="text-emerald-400">✅ Escrow released</p>
                </div>
              </div>
            </motion.div>

            {/* Function Calling */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gray-900/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 hover:border-cyan-500/30 transition-all"
            >
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span>🤖</span> Function Calling
              </h3>
              <div className="space-y-4 text-sm">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-gray-300 mb-3">Gemini doesn't just parse—it <span className="text-cyan-400">EXECUTES</span>.</p>
                  <p className="text-gray-400 mb-2">Direct smart contract calls:</p>
                  <div className="grid grid-cols-2 gap-2 text-gray-400">
                    <span>• pay()</span>
                    <span>• createEscrow()</span>
                    <span>• releaseEscrow()</span>
                    <span>• hireAgent()</span>
                    <span>• startStream()</span>
                    <span>• openChannel()</span>
                  </div>
                  <p className="text-gray-500 mt-2">And 15+ more...</p>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="text-center mt-8">
            <Link href="/use-cases" className="text-cyan-400 hover:text-cyan-300 transition-colors">
              See All AI Capabilities →
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid - 12 Modules */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Complete Payment Toolkit</h2>
            <p className="text-gray-400">28 modules for every payment scenario</p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-4 gap-6"
          >
            {[
              { icon: '🤖', title: 'AI Agent', desc: 'Voice + Vision payments', tag: 'Gemini' },
              { icon: '🎤', title: 'Voice', desc: 'Speech-to-payment', tag: 'NEW' },
              { icon: '📸', title: 'Vision', desc: 'Invoice & receipt AI', tag: 'NEW' },
              { icon: '🔒', title: 'Escrow', desc: 'Multi-party + Arbiter', tag: '' },
              { icon: '💸', title: 'Streaming', desc: 'Per-second payments', tag: '' },
              { icon: '⚡', title: 'Channels', desc: 'x402 micropayments', tag: 'x402' },
              { icon: '🔐', title: 'Privacy', desc: 'Stealth addresses', tag: '' },
              { icon: '📇', title: 'Contacts', desc: 'Pay by name', tag: 'NEW' },
              { icon: '📋', title: 'Templates', desc: 'Reusable payments', tag: 'NEW' },
              { icon: '🔗', title: 'Links', desc: 'Shareable pay links', tag: 'NEW' },
              { icon: '📨', title: 'Requests', desc: 'Request payments', tag: 'NEW' },
              { icon: '➗', title: 'Split', desc: 'Split bills', tag: 'NEW' },
              { icon: '⛽', title: 'Gasless', desc: 'Sponsor user gas', tag: 'x402' },
              { icon: '🌉', title: 'Bridge', desc: 'Cross-chain USDC', tag: '' },
              { icon: '💱', title: 'FX Swap', desc: 'USDC ↔ EURC', tag: '' },
              { icon: '🛡️', title: 'Compliance', desc: 'KYC/AML checks', tag: '' },
            ].map((feature, i) => (
              <motion.div
                key={i}
                variants={fadeIn}
                className="bg-gray-900/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-cyan-500/50 hover:bg-gray-900/50 transition-all"
              >
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm mb-2">{feature.desc}</p>
                {feature.tag && (
                  <span className={`text-xs px-2 py-1 rounded ${
                    feature.tag.includes('NEW') ? 'bg-cyan-500/20 text-cyan-400' :
                    feature.tag.includes('Gemini') ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-500'
                  }`}>
                    {feature.tag}
                  </span>
                )}
              </motion.div>
            ))}
          </motion.div>

          <p className="text-center text-gray-500 mt-8">
            5 Smart Contracts • 150+ APIs • 28 Modules • React Hooks
          </p>
        </div>
      </section>

      {/* Code Comparison */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Developers Love ArcPay</h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Traditional Way */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gray-900 rounded-xl overflow-hidden border border-red-500/30"
            >
              <div className="px-4 py-2 bg-red-900/20 border-b border-red-500/30">
                <span className="text-red-400">❌ Traditional Way</span>
              </div>
              <pre className="p-4 text-sm text-gray-400 overflow-x-auto">
{`// 150+ lines of code
import { ethers } from 'ethers';
import { Circle } from '@circle-fin/...';
import { x402 } from 'x402';

const provider = new ethers.Provider(...);
const signer = provider.getSigner();
const contract = new ethers.Contract(...);
await contract.approve(...);
await contract.transfer(...);
// ... 140 more lines`}
              </pre>
            </motion.div>

            {/* With ArcPay */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gray-900 rounded-xl overflow-hidden border border-emerald-500/30"
            >
              <div className="px-4 py-2 bg-emerald-900/20 border-b border-emerald-500/30">
                <span className="text-emerald-400">✅ With ArcPay</span>
              </div>
              <pre className="p-4 text-sm text-gray-300 overflow-x-auto">
{`// Voice command
await agent.executeVoice();
// "Send 50 to writer-bot"

// Or one line
await pay('0x...', '50');

// Or with image
await agent.payInvoice(img);

// That's it! 🎉`}
              </pre>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-8 text-center">
            <div>
              <p className="text-red-400 line-through">Hours of setup</p>
              <p className="text-emerald-400 font-bold">5 minutes</p>
            </div>
            <div>
              <p className="text-red-400 line-through">5 packages</p>
              <p className="text-emerald-400 font-bold">1 import</p>
            </div>
            <div>
              <p className="text-red-400 line-through">Complex integration</p>
              <p className="text-emerald-400 font-bold">AI handles it</p>
            </div>
          </div>
        </div>
      </section>

      {/* Live Stats */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">📊 Live on Arc Testnet</h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-5 gap-6"
          >
            {[
              { value: '5', label: 'Smart Contracts' },
              { value: '150+', label: 'Public APIs' },
              { value: '28', label: 'Modules' },
              { value: '120+', label: 'Types' },
              { value: 'Gemini 3', label: 'Flash AI' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                variants={fadeIn}
                className="bg-gray-900/30 backdrop-blur-sm rounded-xl p-6 text-center border border-gray-700/50 hover:border-cyan-500/30 transition-all"
              >
                <div className="text-2xl md:text-3xl font-bold text-cyan-400 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>

          <p className="text-center text-gray-500 mt-6">
            Escrow • Streaming • Channels • Privacy • Agent Registry • Smart Wallet • Subscriptions • Bridge • And 17 more...
          </p>

          <div className="text-center mt-4">
            <a
              href="https://testnet.arcscan.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              View Contracts on ArcScan →
            </a>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-900/50 to-gray-950">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Build AI-Powered Commerce?</h2>

            <div className="inline-flex items-center bg-gray-900 rounded-lg px-6 py-3 font-mono text-lg mb-8">
              <span className="text-gray-500 mr-2">$</span>
              <span className="text-gray-300">npm install arcpay</span>
            </div>

            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <Link
                href="/playground"
                className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg font-semibold transition-colors"
              >
                🎮 Playground
                <span className="block text-sm font-normal opacity-75">Try voice & image commands</span>
              </Link>
              <Link
                href="/docs"
                className="px-8 py-4 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition-colors"
              >
                📚 Read Docs
                <span className="block text-sm font-normal opacity-75">Full API reference</span>
              </Link>
              <a
                href="https://github.com/Himess/arcpay"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition-colors"
              >
                ⭐ Star on GitHub
                <span className="block text-sm font-normal opacity-75">Show support!</span>
              </a>
            </div>

            <div className="border-t border-gray-800 pt-8">
              <p className="text-gray-400 mb-2">Built for Agentic Commerce on Arc Hackathon 2026</p>
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full">Best Dev Tools</span>
                <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full">Best Trustless AI Agent</span>
                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full">Best Gemini Use</span>
              </div>
              <p className="text-gray-500 mt-6">Made with ❤️ by Himess</p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
