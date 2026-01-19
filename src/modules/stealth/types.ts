/**
 * Stealth Address Types
 */

/**
 * Stealth key pair (spending + viewing)
 */
export interface StealthKeyPair {
  /** Private spending key (hex) */
  spendingPrivateKey: string;
  /** Public spending key (compressed, 33 bytes hex) */
  spendingPublicKey: string;
  /** Private viewing key (hex) */
  viewingPrivateKey: string;
  /** Public viewing key (compressed, 33 bytes hex) */
  viewingPublicKey: string;
}

/**
 * Stealth meta-address (public keys only, safe to share)
 */
export interface StealthMetaAddress {
  /** Public spending key (compressed, 33 bytes hex) */
  spendingPublicKey: string;
  /** Public viewing key (compressed, 33 bytes hex) */
  viewingPublicKey: string;
}

/**
 * Generated stealth address for payment
 */
export interface StealthAddressResult {
  /** The one-time stealth address to send funds to */
  stealthAddress: string;
  /** Ephemeral public key (to publish for recipient) */
  ephemeralPublicKey: string;
  /** View tag for efficient scanning (first byte of shared secret) */
  viewTag: number;
}

/**
 * Stealth payment announcement from chain
 */
export interface StealthAnnouncement {
  id: string;
  stealthAddress: string;
  amount: string;
  ephemeralPublicKey: string;
  encryptedMemo: string;
  timestamp: number;
  claimed: boolean;
}

/**
 * Scanned payment that belongs to us
 */
export interface ScannedPayment {
  announcement: StealthAnnouncement;
  /** The private key to spend from this stealth address */
  stealthPrivateKey: string;
  /** Decrypted memo (if any) */
  memo?: string;
}

/**
 * Stealth manager configuration
 */
export interface StealthConfig {
  /** Private key for signing transactions */
  privateKey: string;
  /** RPC URL */
  rpcUrl?: string;
  /** Stealth registry contract address (optional, uses default) */
  registryAddress?: string;
}

/**
 * Send stealth payment parameters
 */
export interface SendStealthParams {
  /** Recipient's meta-address (or their wallet address to lookup) */
  recipient: string | StealthMetaAddress;
  /** Amount in USDC (human-readable) */
  amount: string;
  /** Optional memo (will be encrypted) */
  memo?: string;
}

/**
 * Send stealth payment result
 */
export interface SendStealthResult {
  success: boolean;
  announcementId?: string;
  stealthAddress?: string;
  txHash?: string;
  error?: string;
}

/**
 * Claim stealth payment result
 */
export interface ClaimStealthResult {
  success: boolean;
  amount?: string;
  txHash?: string;
  error?: string;
}
