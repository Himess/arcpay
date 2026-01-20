/**
 * ArcPay SDK Verification Tests
 *
 * This file contains test functions that can be run in the browser console
 * or imported into the playground to verify SDK functionality.
 *
 * Usage in browser console:
 * 1. Go to /playground
 * 2. Open browser console (F12)
 * 3. Copy and paste these functions
 * 4. Run: await runAllTests()
 */

// Test configuration
const TEST_CONFIG = {
  RPC_URL: 'https://rpc.testnet.arc.network',
  CHAIN_ID: 5042002,
  EXPLORER: 'https://testnet.arcscan.app',
  CONTRACTS: {
    escrow: '0x0a982E2250F1C66487b88286e14D965025dD89D2',
    stream: '0x4678D992De548bddCb5Cd4104470766b5207A855',
    stealth: '0xbC6d02dBDe96caE69680BDbB63f9A12a14F3a41B',
    usyc: '0x998D66DF2Ed5378a655a19b8F301C6fc456dB9E0',
  },
};

// Test functions to run in browser console
const browserTests = `
// === BROWSER CONSOLE TESTS ===
// Copy this entire block into your browser console on /playground

async function testRPCConnection() {
  console.log('Testing RPC connection...');
  try {
    const res = await fetch('https://rpc.testnet.arc.network', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_chainId',
        params: [],
        id: 1,
      }),
    });
    const data = await res.json();
    const chainId = parseInt(data.result, 16);
    if (chainId === 5042002) {
      console.log('✅ RPC connection OK - Chain ID:', chainId);
      return true;
    } else {
      console.log('❌ Wrong chain ID:', chainId);
      return false;
    }
  } catch (e) {
    console.log('❌ RPC connection failed:', e.message);
    return false;
  }
}

async function testContractExists(name, address) {
  console.log(\`Testing contract \${name} at \${address}...\`);
  try {
    const res = await fetch('https://rpc.testnet.arc.network', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getCode',
        params: [address, 'latest'],
        id: 1,
      }),
    });
    const data = await res.json();
    if (data.result && data.result !== '0x') {
      console.log(\`✅ \${name} contract exists\`);
      return true;
    } else {
      console.log(\`❌ \${name} contract not found\`);
      return false;
    }
  } catch (e) {
    console.log(\`❌ \${name} check failed:\`, e.message);
    return false;
  }
}

async function testNobleSecp256k1() {
  console.log('Testing noble-secp256k1 import...');
  try {
    const secp = await import('@noble/secp256k1');
    // Generate a test key pair
    const privKey = new Uint8Array(32);
    crypto.getRandomValues(privKey);
    const pubKey = secp.getPublicKey(privKey, true);
    if (pubKey.length === 33) {
      console.log('✅ noble-secp256k1 working - generated compressed pubkey');
      return true;
    }
    return false;
  } catch (e) {
    console.log('❌ noble-secp256k1 failed:', e.message);
    return false;
  }
}

async function testWebCryptoSHA256() {
  console.log('Testing Web Crypto SHA-256...');
  try {
    const data = new TextEncoder().encode('test');
    const buffer = new ArrayBuffer(data.length);
    new Uint8Array(buffer).set(data);
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    const hashHex = Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    if (hashHex.length === 64) {
      console.log('✅ Web Crypto SHA-256 working');
      return true;
    }
    return false;
  } catch (e) {
    console.log('❌ Web Crypto SHA-256 failed:', e.message);
    return false;
  }
}

async function testAPIEndpoint(name, url, expectStatus = 200) {
  console.log(\`Testing API: \${name}...\`);
  try {
    const res = await fetch(url);
    if (expectStatus === 402 && res.status === 402) {
      console.log(\`✅ \${name} - returned 402 as expected\`);
      return true;
    }
    if (res.ok || res.status === expectStatus) {
      console.log(\`✅ \${name} - status \${res.status}\`);
      return true;
    }
    console.log(\`❌ \${name} - unexpected status \${res.status}\`);
    return false;
  } catch (e) {
    console.log(\`❌ \${name} failed:\`, e.message);
    return false;
  }
}

async function runAllTests() {
  console.log('='.repeat(50));
  console.log('ArcPay SDK Verification Tests');
  console.log('='.repeat(50));
  console.log('');

  const results = [];

  // Core tests
  results.push(await testRPCConnection());
  results.push(await testWebCryptoSHA256());
  results.push(await testNobleSecp256k1());

  // Contract tests
  results.push(await testContractExists('Escrow', '0x0a982E2250F1C66487b88286e14D965025dD89D2'));
  results.push(await testContractExists('Stream', '0x4678D992De548bddCb5Cd4104470766b5207A855'));
  results.push(await testContractExists('Stealth', '0xbC6d02dBDe96caE69680BDbB63f9A12a14F3a41B'));

  // API tests
  results.push(await testAPIEndpoint('x402 Premium', '/api/x402/premium', 402));
  results.push(await testAPIEndpoint('x402 Weather', '/api/x402/weather', 402));

  // Summary
  console.log('');
  console.log('='.repeat(50));
  const passed = results.filter(r => r).length;
  const total = results.length;
  console.log(\`Results: \${passed}/\${total} tests passed\`);
  console.log('='.repeat(50));

  return { passed, total, allPassed: passed === total };
}

// Run all tests
runAllTests();
`;

console.log('='.repeat(60));
console.log('ArcPay SDK Browser Tests');
console.log('='.repeat(60));
console.log('');
console.log('To run these tests:');
console.log('1. Go to https://website-beige-six-15.vercel.app/playground');
console.log('2. Open browser console (F12 -> Console)');
console.log('3. Paste the following code and press Enter:');
console.log('');
console.log(browserTests);
