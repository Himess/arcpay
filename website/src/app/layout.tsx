import type { Metadata } from 'next';
import Image from 'next/image';
import './globals.css';

export const metadata: Metadata = {
  title: 'ArcPay - AI-Powered Payment SDK for Autonomous Commerce',
  description: 'Voice commands, image payments, and AI agents. Talk to pay. Show an invoice. Let AI handle the rest.',
  keywords: ['arc', 'usdc', 'micropayments', 'ai', 'gemini', 'voice', 'escrow', 'streaming', 'agents', 'blockchain', 'sdk'],
  authors: [{ name: 'Himess' }],
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
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
                <a href="/" className="flex items-center space-x-3">
                  <Image
                    src="/logo.png"
                    alt="ArcPay Logo"
                    width={36}
                    height={36}
                    className="rounded-lg"
                  />
                  <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
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
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg font-medium transition-all"
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
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-center md:text-left">
                <p className="text-gray-500">
                  Built for Arc Hackathon 2026 - Best Dev Tools • Best Trustless AI Agent • Best Gemini Use
                </p>
                <p className="text-gray-600 text-sm mt-1">
                  Made with ❤️ by Himess
                </p>
              </div>
              <div className="flex items-center space-x-6">
                <a href="https://github.com/Himess/arcpay" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-cyan-400 transition-colors flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  Project
                </a>
                <a href="https://github.com/Himess" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-cyan-400 transition-colors flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  @Himess
                </a>
                <a href="https://twitter.com/Himess__" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-cyan-400 transition-colors flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  @Himess__
                </a>
                <a href="https://arc.network" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-300 transition-colors">
                  Arc Network
                </a>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
