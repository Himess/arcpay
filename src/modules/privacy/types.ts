/**
 * Privacy module types - Stealth address payments
 */

/**
 * Stealth key pair for receiving private payments
 */
export interface StealthKeyPair {
  /** Private key for spending */
  spendingKey: string;
  /** Private key for viewing/scanning */
  viewingKey: string;
  /** Public key for spending */
  spendingPubKey: string;
  /** Public key for viewing */
  viewingPubKey: string;
  /** Stealth meta-address to share with senders */
  stealthMetaAddress: string;
}

/**
 * One-time stealth address for a payment
 */
export interface StealthAddress {
  /** Generated stealth address */
  address: string;
  /** Ephemeral public key (sender publishes this) */
  ephemeralPubKey: string;
  /** View tag for quick scanning */
  viewTag: string;
}

/**
 * Record of a stealth payment
 */
export interface StealthPayment {
  /** Payment ID */
  id: string;
  /** Stealth address funds were sent to */
  stealthAddress: string;
  /** Ephemeral public key */
  ephemeralPubKey: string;
  /** Amount sent */
  amount: string;
  /** Transaction hash */
  txHash: string;
  /** Payment timestamp */
  timestamp: string;
  /** Whether funds have been claimed */
  claimed: boolean;
}

/**
 * Encrypted memo attached to payment
 */
export interface EncryptedMemo {
  /** Encrypted message */
  ciphertext: string;
  /** Encryption nonce */
  nonce: string;
  /** Ephemeral public key for decryption */
  ephemeralPubKey: string;
}

/**
 * Privacy module configuration
 */
export interface PrivacyConfig {
  /** Wallet private key */
  privateKey: string;
  /** Pre-existing stealth keys (optional) */
  stealthKeys?: StealthKeyPair;
}

/**
 * Options for sending private payment
 */
export interface SendPrivateOptions {
  /** Recipient stealth meta-address or regular address */
  to: string;
  /** Amount to send */
  amount: string;
  /** Optional encrypted memo */
  memo?: string;
}

/**
 * Result of private payment
 */
export interface PrivatePaymentResult {
  /** Whether payment succeeded */
  success: boolean;
  /** Transaction hash */
  txHash?: string;
  /** Stealth address used */
  stealthAddress?: string;
  /** Ephemeral public key (for recipient) */
  ephemeralPubKey?: string;
  /** Error message */
  error?: string;
}

/**
 * Result of claiming stealth payment
 */
export interface ClaimResult {
  /** Whether claim succeeded */
  success: boolean;
  /** Transaction hash */
  txHash?: string;
  /** Amount claimed */
  amount?: string;
  /** Error message */
  error?: string;
}

/**
 * Scan result for incoming stealth payments
 */
export interface ScanResult {
  /** Found payments */
  payments: StealthPayment[];
  /** Last block scanned */
  lastBlock: number;
  /** Total unclaimed amount */
  unclaimedTotal: string;
}
