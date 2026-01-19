import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ArcPay - AI-Powered Payment SDK for Autonomous Commerce',
  description: 'Voice commands, image payments, and AI agents. Talk to pay. Show an invoice. Let AI handle the rest.',
  keywords: ['arc', 'usdc', 'micropayments', 'ai', 'gemini', 'voice', 'escrow', 'streaming', 'agents', 'blockchain', 'sdk'],
  authors: [{ name: 'Himess' }],
  openGraph: {
    title: 'ArcPay - AI-Powered Payments',
    description: 'Talk to pay. Show an invoice. Let AI handle the rest.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-gray-950 text-gray-100">
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <a href="/" className="flex items-center space-x-2">
                  <span className="text-2xl font-bold bg-gradient-to-r from-arc-400 to-circle-400 bg-clip-text text-transparent">
                    arcpay
                  </span>
                </a>
              </div>
              <div className="hidden md:flex items-center space-x-8">
                <a href="/docs" className="text-gray-300 hover:text-white transition-colors">
                  Docs
                </a>
                <a href="/playground" className="text-gray-300 hover:text-white transition-colors">
                  Playground
                </a>
                <a href="/use-cases" className="text-gray-300 hover:text-white transition-colors">
                  Use Cases
                </a>
                <a
                  href="https://github.com/Himess/arcpay"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  GitHub
                </a>
                <a
                  href="https://www.npmjs.com/package/arcpay"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-arc-600 hover:bg-arc-700 rounded-lg font-medium transition-colors"
                >
                  npm install
                </a>
              </div>
            </div>
          </div>
        </nav>
        <main className="pt-16">{children}</main>
        <footer className="border-t border-gray-800 py-8 mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-500">
                Built for Arc Hackathon 2026 - Best Dev Tools • Best Trustless AI Agent • Best Gemini Use
              </p>
              <div className="flex items-center space-x-4 mt-4 md:mt-0">
                <a href="https://arc.network" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-300">
                  Arc Network
                </a>
                <a href="https://circle.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-300">
                  Circle
                </a>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
