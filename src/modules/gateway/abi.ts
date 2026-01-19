/**
 * Gateway contract ABIs
 */

/**
 * Gateway Wallet ABI - for deposits and withdrawals
 */
export const GATEWAY_WALLET_ABI = [
  {
    type: 'function',
    name: 'deposit',
    inputs: [
      { name: 'token', type: 'address', internalType: 'address' },
      { name: 'value', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'depositWithPermit',
    inputs: [
      { name: 'token', type: 'address', internalType: 'address' },
      { name: 'value', type: 'uint256', internalType: 'uint256' },
      { name: 'deadline', type: 'uint256', internalType: 'uint256' },
      { name: 'v', type: 'uint8', internalType: 'uint8' },
      { name: 'r', type: 'bytes32', internalType: 'bytes32' },
      { name: 's', type: 'bytes32', internalType: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'initiateWithdrawal',
    inputs: [
      { name: 'token', type: 'address', internalType: 'address' },
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdraw',
    inputs: [{ name: 'token', type: 'address', internalType: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [
      { name: 'depositor', type: 'address', internalType: 'address' },
      { name: 'token', type: 'address', internalType: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

/**
 * Gateway Minter ABI - for minting on destination chain
 */
export const GATEWAY_MINTER_ABI = [
  {
    type: 'function',
    name: 'gatewayMint',
    inputs: [
      { name: 'attestation', type: 'bytes', internalType: 'bytes' },
      { name: 'attestationSignature', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

/**
 * Gateway contract addresses (same on all chains)
 */
export const GATEWAY_CONTRACTS = {
  GATEWAY_WALLET: '0x0077777d7EBA4688BDeF3E311b846F25870A19B9' as const,
  GATEWAY_MINTER: '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B' as const,
};

/**
 * Burn Intent EIP-712 typed data
 */
export const BURN_INTENT_TYPES = {
  BurnIntent: [
    { name: 'depositor', type: 'address' },
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'destinationDomain', type: 'uint32' },
    { name: 'destinationAddress', type: 'bytes32' },
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
  ],
} as const;

/**
 * Burn Intent EIP-712 domain
 */
export const BURN_INTENT_DOMAIN = {
  name: 'Circle Gateway',
  version: '1',
} as const;
