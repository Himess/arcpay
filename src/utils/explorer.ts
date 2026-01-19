import type { NetworkConfig } from '../core/config';

/**
 * Get transaction explorer URL
 */
export function getTxUrl(network: NetworkConfig, txHash: string): string {
  return `${network.explorerUrl}/tx/${txHash}`;
}

/**
 * Get address explorer URL
 */
export function getAddressUrl(network: NetworkConfig, address: string): string {
  return `${network.explorerUrl}/address/${address}`;
}

/**
 * Get token explorer URL
 */
export function getTokenUrl(network: NetworkConfig, tokenAddress: string): string {
  return `${network.explorerUrl}/token/${tokenAddress}`;
}

/**
 * Get block explorer URL
 */
export function getBlockUrl(network: NetworkConfig, blockNumber: number): string {
  return `${network.explorerUrl}/block/${blockNumber}`;
}
