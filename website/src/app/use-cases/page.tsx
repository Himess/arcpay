'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

export default function UseCasesPage() {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Real-World Use Cases</h1>
          <p className="text-xl text-gray-400">AI-powered payment scenarios for autonomous commerce</p>
        </motion.div>

        {/* Use Case 1: Voice-Powered Agent Marketplace */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-800">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="text-3xl">🎤</span>
              Voice-Powered Agent Marketplace
            </h2>

            <div className="bg-gray-800/50 rounded-xl p-6 mb-6">
              <p className="text-gray-300 text-lg mb-4">
                User speaks: <span className="text-cyan-400">"Hire a writer to create a blog post, budget 50 dollars"</span>
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="bg-gray-800/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold">1</div>
                  <h3 className="font-semibold">Voice Input</h3>
                </div>
                <div className="space-y-2 text-sm text-gray-400">
                  <p>👤 Human speaks command</p>
                  <p className="text-cyan-400">↓ Gemini AI parses & executes</p>
                  <p>🤖 Agent A receives request</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-gray-800/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold">2</div>
                  <h3 className="font-semibold">Agent Hiring</h3>
                </div>
                <div className="space-y-2 text-sm text-gray-400">
                  <p>🔗 hireAgent() called</p>
                  <p>💰 50 USDC held in escrow</p>
                  <p>🤖 Writer-bot starts work</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-gray-800/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center font-bold">3</div>
                  <h3 className="font-semibold">Completion</h3>
                </div>
                <div className="space-y-2 text-sm text-gray-400">
                  <p>📝 Work submitted</p>
                  <p>👤 "Approve work" (voice)</p>
                  <p className="text-emerald-400">✅ 50 USDC released</p>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link
                href="/playground"
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
              >
                Try in Playground →
              </Link>
            </div>
          </div>
        </motion.section>

        {/* Use Case 2: Invoice Payment with Vision */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-800">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="text-3xl">📸</span>
              Invoice Payment with Vision
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-gray-800/50 rounded-xl p-6">
                  <h3 className="font-semibold mb-4">📄 Invoice Image</h3>
                  <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                    <p className="text-4xl mb-2">📋</p>
                    <p className="text-gray-400">Invoice #2026-0042</p>
                    <p className="text-2xl font-bold text-cyan-400 my-2">$150.00</p>
                    <p className="text-gray-500 text-sm">Acme Corp</p>
                    <p className="text-gray-500 text-sm">0x9f2...abc</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-400">
                  <span className="text-cyan-400">↓</span>
                  <span>Gemini Vision analyzes image</span>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-2">Extracted:</p>
                  <ul className="space-y-1 text-sm">
                    <li>• Amount: <span className="text-cyan-400">$150</span></li>
                    <li>• Recipient: <span className="text-cyan-400">0x9f2...</span></li>
                    <li>• Due: <span className="text-cyan-400">Jan 30</span></li>
                  </ul>
                </div>

                <div className="flex items-center gap-3 text-gray-400">
                  <span className="text-cyan-400">↓</span>
                  <span>User confirms payment</span>
                </div>

                <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-xl p-4">
                  <p className="text-emerald-400 font-semibold">✅ Paid 150 USDC</p>
                  <p className="text-gray-500 text-sm">Tx: 0xabc123...</p>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link
                href="/playground"
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
              >
                Try in Playground →
              </Link>
            </div>
          </div>
        </motion.section>

        {/* Use Case 3: Delivery Verification */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-800">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="text-3xl">📦</span>
              Delivery Verification → Escrow Release
            </h2>

            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-gray-800/30 rounded-xl p-6 text-center">
                <p className="text-4xl mb-4">🛒</p>
                <h3 className="font-semibold mb-2">Order</h3>
                <p className="text-sm text-gray-400">Buyer creates escrow for $500</p>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6 text-center">
                <p className="text-4xl mb-4">🚚</p>
                <h3 className="font-semibold mb-2">Ship</h3>
                <p className="text-sm text-gray-400">Seller ships package</p>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6 text-center">
                <p className="text-4xl mb-4">📷</p>
                <h3 className="font-semibold mb-2">Photo</h3>
                <p className="text-sm text-gray-400">Delivery photo uploaded</p>
              </div>

              <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-xl p-6 text-center">
                <p className="text-4xl mb-4">✅</p>
                <h3 className="font-semibold mb-2 text-emerald-400">Released</h3>
                <p className="text-sm text-gray-400">Gemini verifies → escrow released</p>
              </div>
            </div>

            <div className="mt-8 bg-gray-800/30 rounded-xl p-6">
              <h3 className="font-semibold mb-4">🤖 Gemini Analysis</h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span className="text-gray-400">Package visible</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span className="text-gray-400">At front door</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400">95%</span>
                  <span className="text-gray-400">Confidence</span>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Use Case 4: Streaming Salary */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-800">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="text-3xl">💸</span>
              Streaming Salary Payments
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold mb-4">Real-time salary distribution</h3>
                <p className="text-gray-400 mb-6">
                  Pay employees per-second instead of monthly. Funds flow continuously and can be withdrawn anytime.
                </p>

                <div className="space-y-4">
                  <div className="bg-gray-800/50 rounded-lg p-4 flex justify-between items-center">
                    <span className="text-gray-400">Monthly Salary</span>
                    <span className="font-semibold">$5,000 USDC</span>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4 flex justify-between items-center">
                    <span className="text-gray-400">Per Second</span>
                    <span className="font-semibold text-cyan-400">$0.00193 USDC</span>
                  </div>
                  <div className="bg-emerald-900/30 rounded-lg p-4 flex justify-between items-center">
                    <span className="text-gray-400">Withdrawable Now</span>
                    <span className="font-semibold text-emerald-400">$1,234.56 USDC</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 rounded-xl p-4">
                <pre className="text-sm text-gray-300 overflow-x-auto">
{`// Create salary stream
const stream = await arc.streaming.create({
  recipient: '0xEmployee...',
  totalAmount: '5000',
  duration: 30 * 24 * 60 * 60,
});

// Employee withdraws anytime
const amount = await arc.streaming.withdraw(
  stream.id
);`}
                </pre>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Use Case 5: Private Payments */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-800">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="text-3xl">🔐</span>
              Privacy-Preserving Payments
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gray-800/30 rounded-xl p-6">
                <h3 className="font-semibold mb-4">Stealth Addresses (EIP-5564)</h3>
                <p className="text-gray-400 text-sm">
                  Generate one-time addresses for each transaction. Recipients maintain privacy while receiving funds.
                </p>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6">
                <h3 className="font-semibold mb-4">Unlinkable Transactions</h3>
                <p className="text-gray-400 text-sm">
                  No on-chain link between sender and recipient. Perfect for payroll, donations, or sensitive payments.
                </p>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6">
                <h3 className="font-semibold mb-4">Easy Recovery</h3>
                <p className="text-gray-400 text-sm">
                  Recipients scan the registry to find payments meant for them using their viewing key.
                </p>
              </div>
            </div>

            <div className="mt-6 bg-gray-900 rounded-xl p-4">
              <pre className="text-sm text-gray-300 overflow-x-auto">
{`// Generate stealth address for privacy
const stealth = await arc.privacy.generateStealthAddress(recipientPublicKey);

// Send to stealth address - unlinkable on-chain
await arc.privacy.sendStealth({
  stealthAddress: stealth.address,
  amount: '1000',
  ephemeralPubKey: stealth.ephemeralPubKey,
});`}
              </pre>
            </div>
          </div>
        </motion.section>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center py-12"
        >
          <h2 className="text-2xl font-bold mb-4">Ready to build these use cases?</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/playground"
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
            >
              🎮 Try Playground
            </Link>
            <Link
              href="/docs"
              className="px-8 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition-colors"
            >
              📚 Read Docs
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
