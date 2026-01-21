import { ethers } from 'ethers';

async function main() {
  const provider = new ethers.JsonRpcProvider('https://rpc.testnet.arc.network');
  const wallet = new ethers.Wallet('0beef695a3a30c5eb3a7c3ca656e1d8ec6f9c3a98349959326fe11e4a410dbc6', provider);

  const circleWallet = '0x4cc48ea31173c5f14999222962a900ae2e945a1a';
  const amount = ethers.parseUnits('0.1', 18); // 0.1 USDC

  console.log('Sending 0.1 USDC to Circle wallet...');
  console.log('From:', wallet.address);
  console.log('To:', circleWallet);

  const tx = await wallet.sendTransaction({
    to: circleWallet,
    value: amount,
  });

  console.log('TX Hash:', tx.hash);
  console.log('Waiting for confirmation...');

  const receipt = await tx.wait();
  console.log('Confirmed in block:', receipt?.blockNumber);

  const balance = await provider.getBalance(circleWallet);
  console.log('Circle wallet balance:', ethers.formatUnits(balance, 18), 'USDC');
}

main().catch(console.error);
