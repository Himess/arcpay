import { ValidationError } from './errors';

/**
 * Validate Ethereum address
 */
export function validateAddress(address: string, fieldName = 'address'): `0x${string}` {
  if (!address) {
    throw new ValidationError(`${fieldName} is required`);
  }

  if (!address.startsWith('0x')) {
    throw new ValidationError(`${fieldName} must start with 0x`);
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new ValidationError(`${fieldName} must be a valid Ethereum address`);
  }

  return address as `0x${string}`;
}

/**
 * Validate amount is positive
 */
export function validateAmount(amount: string, fieldName = 'amount'): string {
  if (!amount) {
    throw new ValidationError(`${fieldName} is required`);
  }

  const num = parseFloat(amount);

  if (isNaN(num)) {
    throw new ValidationError(`${fieldName} must be a valid number`);
  }

  if (num <= 0) {
    throw new ValidationError(`${fieldName} must be greater than 0`);
  }

  return amount;
}

/**
 * Validate private key format
 */
export function validatePrivateKey(key: string): `0x${string}` {
  if (!key) {
    throw new ValidationError('Private key is required');
  }

  let normalizedKey = key;
  if (!normalizedKey.startsWith('0x')) {
    normalizedKey = `0x${normalizedKey}`;
  }

  if (!/^0x[a-fA-F0-9]{64}$/.test(normalizedKey)) {
    throw new ValidationError('Private key must be a 64-character hex string');
  }

  return normalizedKey as `0x${string}`;
}

/**
 * Validate URL format
 */
export function validateUrl(url: string, fieldName = 'url'): string {
  if (!url) {
    throw new ValidationError(`${fieldName} is required`);
  }

  try {
    new URL(url);
    return url;
  } catch {
    throw new ValidationError(`${fieldName} must be a valid URL`);
  }
}
