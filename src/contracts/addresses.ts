/**
 * ArcPay Contract Addresses
 *
 * This file contains the deployed contract addresses for each network.
 * Update these after deploying contracts with `npm run deploy`.
 */

export interface ContractAddresses {
  escrow: string;
  paymentChannel: string;
  stealthRegistry: string;
  streamPayment: string;
  agentRegistry: string;
  usdc: string;
  eurc: string;
  usyc: string;
}

export const CONTRACT_ADDRESSES: Record<number, ContractAddresses> = {
  // Arc Testnet (Chain ID: 5042002)
  // Official Circle token addresses from: https://docs.arc.network/arc/references/contract-addresses
  5042002: {
    escrow: "0x0a982E2250F1C66487b88286e14D965025dD89D2",
    paymentChannel: "0x3FF7bC1C52e7DdD2B7B915bDAdBe003037B0FA2E",
    stealthRegistry: "0xbC6d02dBDe96caE69680BDbB63f9A12a14F3a41B",
    streamPayment: "0x4678D992De548bddCb5Cd4104470766b5207A855",
    agentRegistry: "0x5E3ef9A91AD33270f84B32ACFF91068Eea44c5ee",
    usdc: "0x3600000000000000000000000000000000000000", // Native USDC (18 decimals, Arc's gas token)
    eurc: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a", // Circle EURC
    usyc: "0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C", // Circle USYC (yield-bearing)
  },

  // Local Hardhat (Chain ID: 31337)
  31337: {
    escrow: "0x0000000000000000000000000000000000000000",
    paymentChannel: "0x0000000000000000000000000000000000000000",
    stealthRegistry: "0x0000000000000000000000000000000000000000",
    streamPayment: "0x0000000000000000000000000000000000000000",
    agentRegistry: "0x0000000000000000000000000000000000000000",
    usdc: "0x0000000000000000000000000000000000000000",
    eurc: "0x0000000000000000000000000000000000000000",
    usyc: "0x0000000000000000000000000000000000000000",
  },
};

/**
 * Get contract addresses for a specific chain
 */
export function getContractAddresses(chainId: number): ContractAddresses {
  const addresses = CONTRACT_ADDRESSES[chainId];
  if (!addresses) {
    throw new Error(`No contract addresses configured for chain ID: ${chainId}`);
  }
  return addresses;
}

/**
 * Check if contracts are deployed on a specific chain
 */
export function areContractsDeployed(chainId: number): boolean {
  const addresses = CONTRACT_ADDRESSES[chainId];
  if (!addresses) return false;

  // Check if any address is still the zero address
  return (
    addresses.escrow !== "0x0000000000000000000000000000000000000000" &&
    addresses.paymentChannel !== "0x0000000000000000000000000000000000000000" &&
    addresses.stealthRegistry !== "0x0000000000000000000000000000000000000000" &&
    addresses.streamPayment !== "0x0000000000000000000000000000000000000000"
  );
}

export default CONTRACT_ADDRESSES;
