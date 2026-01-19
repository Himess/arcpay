import { createWalletClient, createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
};

const WALLET_A_KEY = '0x0beef695a3a30c5eb3a7c3ca656e1d8ec6f9c3a98349959326fe11e4a410dbc6';
const WALLET_B_KEY = '0xbba623c945c9e7ef9458450e53a83751acf90e65554ad033815720d7bb392d79';

async function topup() {
  const accountA = privateKeyToAccount(WALLET_A_KEY as `0x${string}`);
  const accountB = privateKeyToAccount(WALLET_B_KEY as `0x${string}`);

  const publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http(),
  });

  const walletA = createWalletClient({
    chain: arcTestnet,
    transport: http(),
    account: accountA,
  });

  // Send 0.1 USDC to Wallet B
  const amount = parseUnits('0.1', 18);
  console.log('Sending 0.1 USDC to Wallet B...');

  const hash = await walletA.sendTransaction({
    to: accountB.address,
    value: amount,
  });

  console.log('Transaction hash:', hash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('Transaction confirmed in block:', receipt.blockNumber);

  // Check new balance
  const newBalanceB = await publicClient.getBalance({ address: accountB.address });
  console.log('New Wallet B balance:', formatUnits(newBalanceB, 18), 'USDC');
}

topup().catch(console.error);
