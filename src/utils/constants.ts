/**
 * Token decimals
 */
export const USDC_DECIMALS = 6;
export const EURC_DECIMALS = 6;
export const USYC_DECIMALS = 6;

/**
 * ERC20 ABI - minimal interface for token operations
 */
export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

/**
 * USYC Teller ABI - for subscribe/redeem operations
 */
export const USYC_TELLER_ABI = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'depositAsset', type: 'address' },
      { name: 'depositAmount', type: 'uint256' },
      { name: 'minimumMint', type: 'uint256' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
  {
    name: 'bulkDeposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'depositAsset', type: 'address' },
      { name: 'depositAmount', type: 'uint256' },
      { name: 'minimumMint', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
  {
    name: 'bulkWithdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'withdrawAsset', type: 'address' },
      { name: 'shareAmount', type: 'uint256' },
      { name: 'minimumAssets', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'assetsOut', type: 'uint256' }],
  },
  {
    name: 'accountant',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'asset',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

/**
 * USYC Accountant ABI - for exchange rate
 */
export const USYC_ACCOUNTANT_ABI = [
  {
    name: 'getRateInQuote',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'quote', type: 'address' }],
    outputs: [{ name: 'rate', type: 'uint256' }],
  },
  {
    name: 'getRateInQuoteSafe',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'quote', type: 'address' }],
    outputs: [{ name: 'rate', type: 'uint256' }],
  },
  {
    name: 'getRate',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: 'rate', type: 'uint256' }],
  },
] as const;

/**
 * USYC Entitlements ABI - for allowlist checks
 */
export const USYC_ENTITLEMENTS_ABI = [
  {
    name: 'isAllowed',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;
