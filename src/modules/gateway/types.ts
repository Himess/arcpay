/**
 * Gateway module types - Unified USDC balance across chains
 */

/**
 * Gateway domain IDs for supported chains
 * Source: https://gateway-api-testnet.circle.com/v1/info
 */
export const GATEWAY_DOMAINS = {
  // Ethereum
  ethereum: 0,
  sepolia: 0,
  // Avalanche
  avalanche: 1,
  avalancheFuji: 1,
  // Solana
  solana: 5,
  solanaDevnet: 5,
  // Base
  base: 6,
  baseSepolia: 6,
  // Sonic
  sonic: 13,
  sonicTestnet: 13,
  // Worldchain
  worldchain: 14,
  worldchainSepolia: 14,
  // Sei
  sei: 16,
  seiAtlantic: 16,
  // HyperEVM
  hyperEvm: 19,
  hyperEvmTestnet: 19,
  // Arc
  arc: 26,
  arcTestnet: 26,
} as const;

export type GatewayDomain = keyof typeof GATEWAY_DOMAINS;

/**
 * Unified balance result
 */
export interface UnifiedBalance {
  /** Total balance across all chains */
  total: string;
  /** Available balance for withdrawal */
  available: string;
  /** Pending deposits/withdrawals */
  pending: string;
  /** Balance breakdown by chain */
  byChain: Record<string, string>;
}

/**
 * Deposit parameters
 */
export interface GatewayDepositParams {
  /** Amount of USDC to deposit */
  amount: string;
  /** Use permit for gasless approval (if supported) */
  usePermit?: boolean;
}

/**
 * Deposit result
 */
export interface GatewayDepositResult {
  success: boolean;
  txHash?: string;
  explorerUrl?: string;
  error?: string;
}

/**
 * Withdraw parameters
 */
export interface GatewayWithdrawParams {
  /** Target chain for withdrawal */
  chain: GatewayDomain;
  /** Amount of USDC to withdraw */
  amount: string;
  /** Recipient address on target chain (defaults to sender) */
  recipient?: string;
}

/**
 * Withdraw result
 */
export interface GatewayWithdrawResult {
  success: boolean;
  /** Withdrawal initiation tx hash */
  initTxHash?: string;
  /** Attestation for minting on target chain */
  attestation?: string;
  /** Explorer URL */
  explorerUrl?: string;
  error?: string;
}

/**
 * Gateway API info response
 */
export interface GatewayInfo {
  supportedDomains: number[];
  supportedTokens: string[];
  apiVersion: string;
}

/**
 * Burn intent for withdrawal
 */
export interface BurnIntent {
  depositor: string;
  token: string;
  amount: bigint;
  destinationDomain: number;
  destinationAddress: string;
  nonce: bigint;
  expiry: bigint;
}
