import type { StorageAdapter } from '../modules/contacts';

/**
 * Configuration for initializing ArcPay client
 */
export interface ArcPayConfig {
  /** Network to connect to */
  network: 'arc-testnet' | 'arc-mainnet';
  /** Private key for signing transactions (optional for read-only operations) */
  privateKey?: string;
  /** Custom RPC URL (overrides default) */
  rpcUrl?: string;
  /** Circle API key for Gateway, Bridge, and FX operations */
  circleApiKey?: string;
  /** Custom storage adapter for contacts (defaults to auto-detect) */
  contactStorage?: StorageAdapter;
}

/**
 * Transaction result
 */
export interface TransactionResult {
  success: boolean;
  txHash?: string;
  explorerUrl?: string;
  error?: string;
}

/**
 * Balance information
 */
export interface BalanceInfo {
  /** USDC balance in human-readable format */
  usdc: string;
  /** EURC balance in human-readable format */
  eurc?: string;
  /** Raw balance in wei */
  raw: bigint;
}

/**
 * Token types supported on Arc
 */
export type TokenType = 'usdc' | 'eurc';

/**
 * Address type
 */
export type Address = `0x${string}`;

/**
 * Hex string type
 */
export type Hex = `0x${string}`;
