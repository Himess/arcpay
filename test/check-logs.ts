import { createPublicClient, http, formatUnits, decodeEventLog } from 'viem';

const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
};

const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });

async function check() {
  const txHash = '0x7e02719243d041b9188aca6124aa92962215107e377ac661b6f4bba5d5783db0';

  // Get receipt
  const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });

  console.log('Transaction Logs:');
  for (const log of receipt.logs) {
    console.log('\nLog:');
    console.log('  Address:', log.address);
    console.log('  Topics:', log.topics);
    console.log('  Data:', log.data);
  }

  // Also check if it's an ERC20 transfer by looking at native balance vs token balance
  // Arc uses native USDC so maybe it's different
  console.log('\n--- Checking raw balance with eth_getBalance ---');

  const rawBalance = await fetch('https://rpc.testnet.arc.network', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getBalance',
      params: ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', 'latest'],
      id: 1
    })
  }).then(r => r.json());

  console.log('Raw balance response:', rawBalance);
  if (rawBalance.result) {
    console.log('Parsed balance:', formatUnits(BigInt(rawBalance.result), 18), 'USDC');
  }
}

check();
