/**
 * Test Wallets for ArcPay
 *
 * These are demo wallet addresses for testing purposes.
 * For production, use Circle Developer-Controlled Wallets.
 *
 * To create real Circle wallets, run:
 * npx ts-node scripts/setup-test-wallets.ts
 */

export const TEST_WALLETS = {
  // Demo contacts (matching playground demo data)
  ahmed: {
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f5bB71',
    walletId: null, // Set after running setup script
  },
  bob: {
    address: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    walletId: null,
  },
  netflix: {
    address: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
    walletId: null,
  },

  // Additional test wallets (placeholder - run setup script to fill)
  alice: {
    address: '0x0000000000000000000000000000000000000000',
    walletId: null,
  },
  merchant: {
    address: '0x0000000000000000000000000000000000000000',
    walletId: null,
  },
  agent: {
    address: '0x0000000000000000000000000000000000000000',
    walletId: null,
  },
};

// Arc Testnet Chain Config
export const ARC_TESTNET = {
  id: 5042002,
  name: 'Arc Testnet',
  rpcUrl: 'https://rpc.testnet.arc.network',
  explorer: 'https://testnet.arcscan.app',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18, // Native USDC on Arc
  },
};

// Contract Addresses on Arc Testnet
export const CONTRACTS = {
  usdc: '0x3600000000000000000000000000000000000000',
  eurc: '0x3700000000000000000000000000000000000000',
  usyc: '0x3800000000000000000000000000000000000000',
  escrow: '0x3100000000000000000000000000000000000000',
  stream: '0x3200000000000000000000000000000000000000',
  channel: '0x3300000000000000000000000000000000000000',
  agent: '0x3400000000000000000000000000000000000000',
  stealth: '0x3500000000000000000000000000000000000000',
};
