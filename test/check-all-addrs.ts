import { createPublicClient, http } from 'viem';

const client = createPublicClient({
  transport: http('https://rpc.testnet.arc.network'),
});

async function check() {
  // All possible addresses
  const contracts = {
    // From SDK addresses.ts
    'escrow (SDK)': '0x0a982E2250F1C66487b88286e14D965025dD89D2',
    'paymentChannel (SDK)': '0x3FF7bC1C52e7DdD2B7B915bDAdBe003037B0FA2E',
    'stealthRegistry (SDK)': '0xbC6d02dBDe96caE69680BDbB63f9A12a14F3a41B',
    'streamPayment (SDK)': '0x4678D992De548bddCb5Cd4104470766b5207A855',
    'agentRegistry (SDK)': '0xF7edaD804760cfDD4050ca9623BFb421Cc2Fe2cf',

    // From test file (different addresses)
    'paymentChannel (test)': '0x16217BdB8c9f1cD1dB6251f2ca70E0372f24a67e',
    'agentRegistry (test)': '0x98a135Be5BEC485E4Db0CD9a2Cfdc27a96f2edab',

    // From deployed-addresses.json
    'paymentChannel (json)': '0x3FF7bC1C52e7DdD2B7B915bDAdBe003037B0FA2E',
  };

  console.log('=== All Contract Addresses Check ===\n');

  for (const [name, addr] of Object.entries(contracts)) {
    const code = await client.getCode({ address: addr as `0x${string}` });
    const status = code && code !== '0x' ? `✅ Has code (${code.length} chars)` : '❌ NO CODE';
    console.log(`${name}:`);
    console.log(`  ${addr}`);
    console.log(`  ${status}\n`);
  }
}

check().catch(console.error);
