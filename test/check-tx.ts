import { createPublicClient, http, formatUnits } from 'viem';

const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
};

const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });

async function check() {
  const txHash = '0x7e02719243d041b9188aca6124aa92962215107e377ac661b6f4bba5d5783db0';

  // Get full transaction details
  const tx = await publicClient.getTransaction({ hash: txHash as `0x${string}` });
  console.log('Transaction:');
  console.log('  From:', tx.from);
  console.log('  To:', tx.to);
  console.log('  Value:', formatUnits(tx.value, 18), 'USDC');
  console.log('  Gas:', tx.gas);
  console.log('  Block:', tx.blockNumber);

  // Get receipt
  const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
  console.log('\nReceipt:');
  console.log('  Status:', receipt.status);
  console.log('  Gas Used:', receipt.gasUsed);
  console.log('  Effective Gas Price:', receipt.effectiveGasPrice);
  console.log('  Logs:', receipt.logs.length);

  // Check current block
  const block = await publicClient.getBlockNumber();
  console.log('\nCurrent block:', block);
  console.log('TX block:', tx.blockNumber);
  console.log('Confirmations:', block - tx.blockNumber!);
}

check();
