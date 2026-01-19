/**
 * Arc network configurations
 */
export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  usdc: string;
  eurc?: string;
  usyc?: string;
  usycTeller?: string;
  usycEntitlements?: string;
  facilitatorUrl: string;
  faucetUrl?: string;
}

export const NETWORKS: Record<string, NetworkConfig> = {
  'arc-testnet': {
    chainId: 5042002,
    name: 'Arc Testnet',
    rpcUrl: 'https://rpc.testnet.arc.network',
    explorerUrl: 'https://testnet.arcscan.app',
    usdc: '0x3600000000000000000000000000000000000000',
    eurc: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
    usyc: '0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C',
    usycTeller: '0x9fdF14c5B14173D74C08Af27AebFf39240dC105A',
    usycEntitlements: '0xcc205224862c7641930c87679e98999d23c26113',
    facilitatorUrl: 'https://x402.org/facilitator',
    faucetUrl: 'https://faucet.circle.com',
  },
  'arc-mainnet': {
    chainId: 5042001,
    name: 'Arc Mainnet',
    rpcUrl: 'https://rpc.arc.network',
    explorerUrl: 'https://arcscan.app',
    usdc: '0x3600000000000000000000000000000000000000',
    facilitatorUrl: 'https://x402.org/facilitator',
  },
};

export type NetworkName = keyof typeof NETWORKS;

export function getNetwork(name: NetworkName): NetworkConfig {
  const network = NETWORKS[name];
  if (!network) {
    throw new Error(`Unknown network: ${name}. Available: ${Object.keys(NETWORKS).join(', ')}`);
  }
  return network;
}
