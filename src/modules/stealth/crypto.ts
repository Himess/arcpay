/**
 * Stealth Address Cryptography
 *
 * Implements EIP-5564 compatible stealth address generation and scanning.
 *
 * How it works:
 * 1. Recipient generates spending key (s) and viewing key (v)
 * 2. Recipient publishes S = s*G and V = v*G (meta-address)
 * 3. Sender generates ephemeral key (r), computes R = r*G
 * 4. Sender computes shared secret: secret = hash(r*V)
 * 5. Sender computes stealth address: P = S + secret*G
 * 6. Recipient scans: for each R, compute secret = hash(v*R), check if S + secret*G matches
 * 7. Recipient derives private key: p = s + secret
 */

import { keccak256, toBytes, toHex, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { secp256k1 } from '@noble/curves/secp256k1';
import type { StealthKeyPair, StealthMetaAddress, StealthAddressResult } from './types';

/**
 * Generate a new stealth key pair
 */
export function generateStealthKeys(): StealthKeyPair {
  // Generate random spending key
  const spendingPrivateKey = secp256k1.utils.randomPrivateKey();
  const spendingPublicKey = secp256k1.getPublicKey(spendingPrivateKey, true); // compressed

  // Generate random viewing key
  const viewingPrivateKey = secp256k1.utils.randomPrivateKey();
  const viewingPublicKey = secp256k1.getPublicKey(viewingPrivateKey, true); // compressed

  return {
    spendingPrivateKey: toHex(spendingPrivateKey),
    spendingPublicKey: toHex(spendingPublicKey),
    viewingPrivateKey: toHex(viewingPrivateKey),
    viewingPublicKey: toHex(viewingPublicKey),
  };
}

/**
 * Get meta-address (public keys only) from key pair
 */
export function getMetaAddress(keys: StealthKeyPair): StealthMetaAddress {
  return {
    spendingPublicKey: keys.spendingPublicKey,
    viewingPublicKey: keys.viewingPublicKey,
  };
}

/**
 * Generate a stealth address for a recipient
 * Called by the sender
 */
export function generateStealthAddress(metaAddress: StealthMetaAddress): StealthAddressResult {
  // Generate ephemeral key pair
  const ephemeralPrivateKey = secp256k1.utils.randomPrivateKey();
  const ephemeralPublicKey = secp256k1.getPublicKey(ephemeralPrivateKey, true);

  // Parse recipient's viewing public key
  const viewingPubKeyBytes = toBytes(metaAddress.viewingPublicKey as Hex);
  const viewingPubKeyPoint = secp256k1.ProjectivePoint.fromHex(viewingPubKeyBytes);

  // Compute shared secret: r * V (ephemeral private * viewing public)
  const sharedSecretPoint = viewingPubKeyPoint.multiply(
    BigInt(toHex(ephemeralPrivateKey))
  );
  const sharedSecretBytes = sharedSecretPoint.toRawBytes(true);

  // Hash the shared secret
  const sharedSecretHash = keccak256(sharedSecretBytes);
  const sharedSecretScalar = BigInt(sharedSecretHash) % secp256k1.CURVE.n;

  // Parse recipient's spending public key
  const spendingPubKeyBytes = toBytes(metaAddress.spendingPublicKey as Hex);
  const spendingPubKeyPoint = secp256k1.ProjectivePoint.fromHex(spendingPubKeyBytes);

  // Compute stealth public key: S + hash(shared_secret) * G
  const stealthPubKeyPoint = spendingPubKeyPoint.add(
    secp256k1.ProjectivePoint.BASE.multiply(sharedSecretScalar)
  );
  const stealthPubKey = stealthPubKeyPoint.toRawBytes(false); // uncompressed for address derivation

  // Derive Ethereum address from public key
  const stealthAddress = publicKeyToAddress(stealthPubKey);

  // View tag is first byte of shared secret hash (for efficient scanning)
  const viewTag = parseInt(sharedSecretHash.slice(2, 4), 16);

  return {
    stealthAddress,
    ephemeralPublicKey: toHex(ephemeralPublicKey),
    viewTag,
  };
}

/**
 * Scan an announcement to check if it belongs to us
 * Returns the stealth private key if it matches, null otherwise
 */
export function scanAnnouncement(
  keys: StealthKeyPair,
  ephemeralPublicKey: string,
  stealthAddress: string
): string | null {
  try {
    // Parse ephemeral public key
    const ephemeralPubKeyBytes = toBytes(ephemeralPublicKey as Hex);
    const ephemeralPubKeyPoint = secp256k1.ProjectivePoint.fromHex(ephemeralPubKeyBytes);

    // Compute shared secret using viewing private key: v * R
    const viewingPrivKeyBytes = toBytes(keys.viewingPrivateKey as Hex);
    const viewingPrivKeyScalar = BigInt(toHex(viewingPrivKeyBytes));
    const sharedSecretPoint = ephemeralPubKeyPoint.multiply(viewingPrivKeyScalar);
    const sharedSecretBytes = sharedSecretPoint.toRawBytes(true);

    // Hash the shared secret
    const sharedSecretHash = keccak256(sharedSecretBytes);
    const sharedSecretScalar = BigInt(sharedSecretHash) % secp256k1.CURVE.n;

    // Compute expected stealth public key: S + hash(shared_secret) * G
    const spendingPubKeyBytes = toBytes(keys.spendingPublicKey as Hex);
    const spendingPubKeyPoint = secp256k1.ProjectivePoint.fromHex(spendingPubKeyBytes);
    const expectedStealthPubKeyPoint = spendingPubKeyPoint.add(
      secp256k1.ProjectivePoint.BASE.multiply(sharedSecretScalar)
    );
    const expectedStealthPubKey = expectedStealthPubKeyPoint.toRawBytes(false);

    // Derive expected address
    const expectedAddress = publicKeyToAddress(expectedStealthPubKey);

    // Check if addresses match
    if (expectedAddress.toLowerCase() !== stealthAddress.toLowerCase()) {
      return null;
    }

    // Compute stealth private key: s + hash(shared_secret)
    const spendingPrivKeyBytes = toBytes(keys.spendingPrivateKey as Hex);
    const spendingPrivKeyScalar = BigInt(toHex(spendingPrivKeyBytes));
    const stealthPrivKeyScalar =
      (spendingPrivKeyScalar + sharedSecretScalar) % secp256k1.CURVE.n;

    // Convert to hex
    const stealthPrivKey = stealthPrivKeyScalar.toString(16).padStart(64, '0');
    return `0x${stealthPrivKey}`;
  } catch {
    return null;
  }
}

/**
 * Derive Ethereum address from uncompressed public key
 */
function publicKeyToAddress(publicKey: Uint8Array): string {
  // Remove the 0x04 prefix if present (uncompressed format)
  const pubKeyWithoutPrefix = publicKey.length === 65 ? publicKey.slice(1) : publicKey;

  // Keccak256 hash of public key
  const hash = keccak256(pubKeyWithoutPrefix);

  // Take last 20 bytes
  return `0x${hash.slice(-40)}`;
}

/**
 * Encrypt a memo using shared secret
 */
export function encryptMemo(memo: string, sharedSecret: string): string {
  // Simple XOR encryption with keccak hash of shared secret
  const key = keccak256(toBytes(sharedSecret as Hex));
  const memoBytes = new TextEncoder().encode(memo);
  const keyBytes = toBytes(key as Hex);

  const encrypted = new Uint8Array(memoBytes.length);
  for (let i = 0; i < memoBytes.length; i++) {
    encrypted[i] = memoBytes[i] ^ keyBytes[i % keyBytes.length];
  }

  return toHex(encrypted);
}

/**
 * Decrypt a memo using shared secret
 */
export function decryptMemo(encryptedMemo: string, sharedSecret: string): string {
  if (!encryptedMemo || encryptedMemo === '0x') return '';

  const key = keccak256(toBytes(sharedSecret as Hex));
  const encryptedBytes = toBytes(encryptedMemo as Hex);
  const keyBytes = toBytes(key as Hex);

  const decrypted = new Uint8Array(encryptedBytes.length);
  for (let i = 0; i < encryptedBytes.length; i++) {
    decrypted[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
  }

  return new TextDecoder().decode(decrypted);
}
