/**
 * Bridge module types
 */

/**
 * Supported chains for bridging
 */
export type SupportedChain =
  | 'arc'
  | 'arc-testnet'
  | 'ethereum'
  | 'sepolia'
  | 'base'
  | 'base-sepolia'
  | 'arbitrum'
  | 'arbitrum-sepolia'
  | 'avalanche'
  | 'avalanche-fuji'
  | 'polygon'
  | 'polygon-amoy';

/**
 * Bridge transfer parameters
 */
export interface BridgeTransferParams {
  /** Target chain */
  to: SupportedChain;
  /** Amount of USDC to bridge */
  amount: string;
  /** Recipient address on destination chain (defaults to sender) */
  recipient?: string;
}

/**
 * Bridge transfer result
 */
export interface BridgeTransferResult {
  success: boolean;
  /** Transfer ID for tracking */
  transferId?: string;
  /** Burn transaction hash on source chain */
  burnTxHash?: string;
  /** Mint transaction hash on destination chain */
  mintTxHash?: string;
  /** Explorer URL for the transaction */
  explorerUrl?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Bridge transfer status
 */
export type BridgeTransferStatus =
  | 'pending'
  | 'burning'
  | 'burned'
  | 'minting'
  | 'completed'
  | 'failed';

/**
 * Bridge status result
 */
export interface BridgeStatusResult {
  status: BridgeTransferStatus;
  burnTxHash?: string;
  mintTxHash?: string;
  error?: string;
}

/**
 * Bridge event types
 */
export type BridgeEventType = 'approve' | 'burn' | 'mint' | 'complete' | 'error';

/**
 * Bridge event data
 */
export interface BridgeEvent {
  type: BridgeEventType;
  txHash?: string;
  error?: string;
}

/**
 * Chain info
 */
export interface ChainInfo {
  name: string;
  chainId: number;
  isTestnet: boolean;
}

/**
 * CCTP Attestation API response
 */
export interface AttestationResponse {
  status: 'pending_confirmations' | 'complete';
  attestation?: string;
}

/**
 * Transfer tracking info (stored locally)
 */
export interface TransferInfo {
  transferId: string;
  messageHash: string;
  sourceChain: SupportedChain;
  destinationChain: SupportedChain;
  amount: string;
  burnTxHash: string;
  mintTxHash?: string;
  attestation?: string;
  status: BridgeTransferStatus;
  createdAt: number;
  updatedAt: number;
}
