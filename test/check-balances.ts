import { createPublicClient, http, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
};

const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });

async function check() {
  // Wallet A - Main funded test wallet
  const WALLET_A_KEY = '0x0beef695a3a30c5eb3a7c3ca656e1d8ec6f9c3a98349959326fe11e4a410dbc6';
  // Wallet B - New test wallet
  const WALLET_B_KEY = '0xbba623c945c9e7ef9458450e53a83751acf90e65554ad033815720d7bb392d79';

  const accountA = privateKeyToAccount(WALLET_A_KEY as `0x${string}`);
  const accountB = privateKeyToAccount(WALLET_B_KEY as `0x${string}`);

  console.log('Wallet A:', accountA.address);
  console.log('Wallet B:', accountB.address);

  const balanceA = await publicClient.getBalance({ address: accountA.address });
  const balanceB = await publicClient.getBalance({ address: accountB.address });

  console.log('\nWallet A balance:', formatUnits(balanceA, 18), 'USDC');
  console.log('Wallet B balance:', formatUnits(balanceB, 18), 'USDC');
}

check();
