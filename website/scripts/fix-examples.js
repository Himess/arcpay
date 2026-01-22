const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/playground/apiExamples.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

// Pattern 3: Init with note about settings
const oldPattern3 = /\/\/ Initialize ArcPay SDK\n\/\/ Note: Set your private key in Settings \(⚙️\) for write operations\nconst arc = await ArcPay\.init\(\{\n  network: 'arc-testnet',\n  useCircleWallet: true  \/\/ ERC-4337 gasless - no private key needed!, \/\/ from Settings, optional\n\}\);/g;

const newPattern3 = `// Initialize ArcPay SDK
// Note: Set your private key in Settings (⚙️) for write operations
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: PRIVATE_KEY  // From Settings
});`;

content = content.replace(oldPattern3, newPattern3);

// Pattern 4: Arbiter init
const oldPattern4 = /\/\/ Initialize ArcPay \(AS ARBITER\)\nconst arc = await ArcPay\.init\(\{\n  network: 'arc-testnet',\n  useCircleWallet: true  \/\/ ERC-4337 gasless - no private key needed!  \/\/ ← Must be arbiter's key!\n\}\);/g;

const newPattern4 = `// Initialize ArcPay (AS ARBITER)
const arc = await ArcPay.init({
  network: 'arc-testnet',
  privateKey: PRIVATE_KEY  // ← Must be arbiter's key!
});`;

content = content.replace(oldPattern4, newPattern4);

// Pattern 5: Privacy module init (multiple variants)
const oldPattern5 = /const privacy = createPrivacyModule\(\{\n  useCircleWallet: true  \/\/ ERC-4337 gasless - no private key needed!\n\}\);/g;

const newPattern5 = `const privacy = createPrivacyModule({
  privateKey: PRIVATE_KEY  // From Settings
});`;

content = content.replace(oldPattern5, newPattern5);

fs.writeFileSync(filePath, content);

// Verify
const verifyContent = fs.readFileSync(filePath, 'utf8');
const remaining = (verifyContent.match(/useCircleWallet/g) || []).length;
console.log('Remaining useCircleWallet occurrences:', remaining);

console.log('Done! File updated.');
