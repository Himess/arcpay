import { createWalletClient, createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
};

const WALLET_A_KEY = '0x0beef695a3a30c5eb3a7c3ca656e1d8ec6f9c3a98349959326fe11e4a410dbc6';
const NEW_WALLET_B = '0xc01A5abCF3719C7Ed9021847E686087214edCefb';

async function fundNewWallet() {
  const accountA = privateKeyToAccount(WALLET_A_KEY as `0x${string}`);

  const publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http(),
  });

  const walletA = createWalletClient({
    chain: arcTestnet,
    transport: http(),
    account: accountA,
  });

  // Check balances
  const balanceA = await publicClient.getBalance({ address: accountA.address });
  const balanceB = await publicClient.getBalance({ address: NEW_WALLET_B as `0x${string}` });

  console.log('Wallet A balance:', formatUnits(balanceA, 18), 'USDC');
  console.log('New Wallet B balance:', formatUnits(balanceB, 18), 'USDC');

  if (balanceB > parseUnits('0.01', 18)) {
    console.log('New Wallet B already has sufficient balance');
    return;
  }

  // Send 0.05 USDC to new Wallet B
  const amount = parseUnits('0.05', 18);
  console.log('\nSending 0.05 USDC to new Wallet B...');

  const hash = await walletA.sendTransaction({
    to: NEW_WALLET_B as `0x${string}`,
    value: amount,
  });

  console.log('Transaction hash:', hash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('Transaction confirmed in block:', receipt.blockNumber);

  // Wait a bit and check new balance
  await new Promise(resolve => setTimeout(resolve, 2000));

  const newBalanceB = await publicClient.getBalance({ address: NEW_WALLET_B as `0x${string}` });
  console.log('New Wallet B balance:', formatUnits(newBalanceB, 18), 'USDC');
}

fundNewWallet().catch(console.error);
