import { createPublicClient, http } from 'viem';

const client = createPublicClient({
  transport: http('https://rpc.testnet.arc.network'),
});

async function check() {
  const contracts = {
    escrow: '0x0a982E2250F1C66487b88286e14D965025dD89D2',
    stream: '0x4678D992DE548BDdCb5cd4104470766b5207A855',
    channel: '0x16217BdB8c9f1cD1dB6251f2ca70E0372f24a67e',
    stealth: '0xbC6d02dBDe96caE69680BDbB63f9A12a14F3a41B',
    agent: '0x98a135Be5BEC485E4Db0CD9a2Cfdc27a96f2edab',
  };

  console.log('=== Contract Bytecode Check ===\n');

  for (const [name, addr] of Object.entries(contracts)) {
    const code = await client.getCode({ address: addr as `0x${string}` });
    console.log(`${name}: ${code ? `Has bytecode (${code.length} chars)` : 'NO CODE'}`);
  }
}

check().catch(console.error);
