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
  // Check what address the private key corresponds to
  const WALLET_A_KEY = '0x0beef695a3a30c5eb3a7c3ca656e1d8ec6f9c3a98349959326fe11e4a410dbc6';
  const WALLET_B_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

  const accountA = privateKeyToAccount(WALLET_A_KEY as `0x${string}`);
  const accountB = privateKeyToAccount(WALLET_B_KEY as `0x${string}`);

  console.log('Private Key A derives to:', accountA.address);
  console.log('Private Key B derives to:', accountB.address);

  // Check balances
  const balanceA = await publicClient.getBalance({ address: accountA.address });
  const balanceB = await publicClient.getBalance({ address: accountB.address });

  console.log('\nActual Wallet A balance:', formatUnits(balanceA, 18), 'USDC');
  console.log('Actual Wallet B balance:', formatUnits(balanceB, 18), 'USDC');

  // Also check the tx recipient
  const txRecipient = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  const recipientBalance = await publicClient.getBalance({ address: txRecipient as `0x${string}` });
  console.log('\nTX Recipient balance:', formatUnits(recipientBalance, 18), 'USDC');
}

check();
