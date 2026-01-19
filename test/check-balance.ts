import { createPublicClient, http, formatUnits } from 'viem';

const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
};

const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });

async function check() {
  const walletA = '0x8C14acDB4FF23C66c2e1CAdFa09A3e3DB75eB9E1';
  const walletB = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

  const balanceA = await publicClient.getBalance({ address: walletA });
  const balanceB = await publicClient.getBalance({ address: walletB });

  console.log('Wallet A:', walletA);
  console.log('Balance A:', formatUnits(balanceA, 18), 'USDC');
  console.log('');
  console.log('Wallet B:', walletB);
  console.log('Balance B:', formatUnits(balanceB, 18), 'USDC');

  // Check tx receipts
  const txHashes = [
    '0x992dda120e07a3d9a6a4888aba18c690bd63924f9dcdb5757c12273f94a392f4',
    '0x7e02719243d041b9188aca6124aa92962215107e377ac661b6f4bba5d5783db0'
  ];

  for (const hash of txHashes) {
    try {
      const receipt = await publicClient.getTransactionReceipt({ hash: hash as `0x${string}` });
      console.log(`\nTX ${hash.slice(0, 10)}...`);
      console.log('  Status:', receipt.status);
      console.log('  Block:', receipt.blockNumber);
      console.log('  From:', receipt.from);
      console.log('  To:', receipt.to);
    } catch (e) {
      console.log(`TX ${hash.slice(0, 10)}... not found`);
    }
  }
}

check();
