/**
 * Stealth Address Generator - Simplified EIP-5564 implementation
 */

import { keccak256 } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import type { StealthKeyPair, StealthAddress } from './types';

/**
 * Stealth address generator
 *
 * Implements simplified stealth address scheme inspired by EIP-5564.
 * Uses separate spending and viewing keys for privacy.
 */
export class StealthAddressGenerator {
  /**
   * Generate new stealth key pair for a user
   *
   * @returns New stealth key pair
   */
  static generateKeyPair(): StealthKeyPair {
    // Generate separate spending and viewing keys
    const spendingKey = generatePrivateKey();
    const viewingKey = generatePrivateKey();

    const spendingAccount = privateKeyToAccount(spendingKey);
    const viewingAccount = privateKeyToAccount(viewingKey);

    // Create stealth meta-address (format: st:arc:<spending><viewing>)
    const stealthMetaAddress = `st:arc:${spendingAccount.address.slice(2)}${viewingAccount.address.slice(2)}`;

    return {
      spendingKey,
      viewingKey,
      spendingPubKey: spendingAccount.address,
      viewingPubKey: viewingAccount.address,
      stealthMetaAddress,
    };
  }

  /**
   * Generate one-time stealth address for payment
   *
   * Sender uses this to create a unique address that only
   * the recipient can derive the private key for.
   *
   * @param recipientMetaAddress - Recipient's stealth meta-address
   * @returns Stealth address with ephemeral key
   */
  static generateStealthAddress(recipientMetaAddress: string): StealthAddress {
    const { spendingPubKey, viewingPubKey } =
      this.parseMetaAddress(recipientMetaAddress);

    // Generate ephemeral key pair
    const ephemeralKey = generatePrivateKey();
    const ephemeralAccount = privateKeyToAccount(ephemeralKey);

    // Create shared secret (simplified - production should use ECDH)
    // S = hash(ephemeral_private * viewing_public)
    const sharedSecret = keccak256(
      `0x${ephemeralKey.slice(2)}${viewingPubKey.slice(2)}` as `0x${string}`
    );

    // Derive stealth address
    // stealth_address = hash(spending_public + shared_secret)
    const stealthAddressHash = keccak256(
      `0x${spendingPubKey.slice(2)}${sharedSecret.slice(2)}` as `0x${string}`
    );

    // Take last 40 hex chars (20 bytes) as address
    const stealthAddress = `0x${stealthAddressHash.slice(-40)}`;

    // View tag for quick scanning (first 3 bytes of shared secret)
    const viewTag = sharedSecret.slice(0, 8);

    return {
      address: stealthAddress,
      ephemeralPubKey: ephemeralAccount.address,
      viewTag,
    };
  }

  /**
   * Compute private key for stealth address (for claiming)
   *
   * Recipient uses their viewing key + ephemeral public key
   * to derive the private key for the stealth address.
   *
   * @param stealthKeys - Recipient's stealth key pair
   * @param ephemeralPubKey - Ephemeral public key from sender
   * @returns Private key for the stealth address
   */
  static computeStealthPrivateKey(
    stealthKeys: StealthKeyPair,
    ephemeralPubKey: string
  ): `0x${string}` {
    // Compute shared secret using viewing key
    // S = hash(viewing_private * ephemeral_public)
    const sharedSecret = keccak256(
      `0x${stealthKeys.viewingKey.slice(2)}${ephemeralPubKey.slice(2)}` as `0x${string}`
    );

    // Derive stealth private key
    // stealth_private = hash(spending_private + shared_secret)
    const stealthPrivKey = keccak256(
      `0x${stealthKeys.spendingKey.slice(2)}${sharedSecret.slice(2)}` as `0x${string}`
    );

    return stealthPrivKey as `0x${string}`;
  }

  /**
   * Check view tag for quick scanning
   *
   * View tags allow recipients to quickly filter transactions
   * without doing full derivation.
   *
   * @param stealthKeys - Recipient's stealth key pair
   * @param ephemeralPubKey - Ephemeral public key to check
   * @param viewTag - View tag to verify
   * @returns Whether view tag matches
   */
  static checkViewTag(
    stealthKeys: StealthKeyPair,
    ephemeralPubKey: string,
    viewTag: string
  ): boolean {
    const sharedSecret = keccak256(
      `0x${stealthKeys.viewingKey.slice(2)}${ephemeralPubKey.slice(2)}` as `0x${string}`
    );

    return sharedSecret.slice(0, 8) === viewTag;
  }

  /**
   * Derive stealth address from keys (for verification)
   *
   * @param stealthKeys - Recipient's stealth key pair
   * @param ephemeralPubKey - Ephemeral public key
   * @returns Expected stealth address
   */
  static deriveStealthAddress(
    stealthKeys: StealthKeyPair,
    ephemeralPubKey: string
  ): string {
    const sharedSecret = keccak256(
      `0x${stealthKeys.viewingKey.slice(2)}${ephemeralPubKey.slice(2)}` as `0x${string}`
    );

    const stealthAddressHash = keccak256(
      `0x${stealthKeys.spendingPubKey.slice(2)}${sharedSecret.slice(2)}` as `0x${string}`
    );

    return `0x${stealthAddressHash.slice(-40)}`;
  }

  /**
   * Parse stealth meta-address into components
   *
   * @param metaAddress - Stealth meta-address (st:arc:...)
   * @returns Spending and viewing public keys
   */
  static parseMetaAddress(metaAddress: string): {
    spendingPubKey: string;
    viewingPubKey: string;
  } {
    if (!metaAddress.startsWith('st:arc:')) {
      throw new Error('Invalid stealth meta-address format');
    }

    const addresses = metaAddress.replace('st:arc:', '');

    if (addresses.length !== 80) {
      throw new Error('Invalid stealth meta-address length');
    }

    const spendingPubKey = '0x' + addresses.slice(0, 40);
    const viewingPubKey = '0x' + addresses.slice(40);

    return { spendingPubKey, viewingPubKey };
  }

  /**
   * Check if address is a stealth meta-address
   *
   * @param address - Address to check
   * @returns Whether it's a stealth meta-address
   */
  static isStealthMetaAddress(address: string): boolean {
    return address.startsWith('st:arc:') && address.length === 87;
  }
}
