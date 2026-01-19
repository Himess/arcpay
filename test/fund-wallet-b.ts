import { createWalletClient, createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
};

const WALLET_A_KEY = '0x0beef695a3a30c5eb3a7c3ca656e1d8ec6f9c3a98349959326fe11e4a410dbc6';
const WALLET_B_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

async function fundWalletB() {
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
  const balanceB = await publicClient.getBalance({ address: WALLET_B_ADDRESS as `0x${string}` });

  console.log('Wallet A balance:', formatUnits(balanceA, 18), 'USDC');
  console.log('Wallet B balance:', formatUnits(balanceB, 18), 'USDC');

  if (balanceB > parseUnits('0.01', 18)) {
    console.log('Wallet B already has sufficient balance');
    return;
  }

  // Send 0.1 USDC to Wallet B
  const amount = parseUnits('0.1', 18);
  console.log('\nSending 0.1 USDC to Wallet B...');

  const hash = await walletA.sendTransaction({
    to: WALLET_B_ADDRESS as `0x${string}`,
    value: amount,
  });

  console.log('Transaction hash:', hash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('Transaction confirmed in block:', receipt.blockNumber);

  // Check new balance
  const newBalanceB = await publicClient.getBalance({ address: WALLET_B_ADDRESS as `0x${string}` });
  console.log('New Wallet B balance:', formatUnits(newBalanceB, 18), 'USDC');
}

fundWalletB().catch(console.error);
