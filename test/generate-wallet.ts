import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

// Generate a new random wallet for testing
const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);

console.log('New Test Wallet B:');
console.log('Address:', account.address);
console.log('Private Key:', privateKey);
console.log('\nAdd this to your .env file:');
console.log(`TEST_WALLET_B_KEY=${privateKey}`);
