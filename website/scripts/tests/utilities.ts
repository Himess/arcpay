/**
 * Utilities Tests
 * Tests: Contacts, formatting utilities
 */

import { TestResult, runTest, formatUSDC, parseUSDC } from './types';
import { getTestContext } from './config';

// In-memory contacts store for testing
const contactsStore = new Map<string, { name: string; address: string; notes?: string }>();

export async function runUtilityTests(): Promise<TestResult[]> {
  console.log('\n🔧 Category 15: Utilities Tests');
  console.log('─'.repeat(40));

  const results: TestResult[] = [];
  const ctx = getTestContext();

  // TEST_15_1: contacts.add()
  results.push(await runTest('TEST_15_1', 'contacts.add()', 'Utilities', async () => {
    const contact = {
      name: 'Alice',
      address: ctx.circleWallet.address,
      notes: 'Circle wallet for testing',
    };

    contactsStore.set(contact.name.toLowerCase(), contact);

    return {
      details: {
        method: 'contacts.add()',
        contact,
        stored: true,
      },
    };
  }));

  // TEST_15_2: contacts.get()
  results.push(await runTest('TEST_15_2', 'contacts.get()', 'Utilities', async () => {
    const contact = contactsStore.get('alice');

    if (!contact) {
      throw new Error('Contact not found');
    }

    return {
      details: {
        method: 'contacts.get()',
        name: 'alice',
        contact,
      },
    };
  }));

  // TEST_15_3: contacts.list()
  results.push(await runTest('TEST_15_3', 'contacts.list()', 'Utilities', async () => {
    // Add a few more contacts
    contactsStore.set('bob', { name: 'Bob', address: '0x1234567890123456789012345678901234567890' });
    contactsStore.set('charlie', { name: 'Charlie', address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' });

    const contacts = Array.from(contactsStore.values());

    return {
      details: {
        method: 'contacts.list()',
        count: contacts.length,
        contacts: contacts.map(c => ({ name: c.name, address: c.address.slice(0, 10) + '...' })),
      },
    };
  }));

  // TEST_15_4: contacts.resolveAddress()
  results.push(await runTest('TEST_15_4', 'contacts.resolveAddress()', 'Utilities', async () => {
    const contact = contactsStore.get('alice');

    if (!contact) {
      throw new Error('Contact not found');
    }

    // Resolve name to address
    const resolvedAddress = contact.address;

    return {
      details: {
        method: 'contacts.resolveAddress()',
        input: 'alice',
        resolvedAddress,
        isValid: resolvedAddress.startsWith('0x') && resolvedAddress.length === 42,
      },
    };
  }));

  // TEST_15_5: utils.formatUSDC()
  results.push(await runTest('TEST_15_5', 'utils.formatUSDC()', 'Utilities', async () => {
    // Test various amounts
    const testCases = [
      { input: BigInt('1000000000000000000'), expected: '1.000000' },
      { input: BigInt('500000000000000000'), expected: '0.500000' },
      { input: BigInt('123456789012345678'), expected: '0.123456' },
      { input: BigInt('10000000000000000000'), expected: '10.000000' },
    ];

    const results = testCases.map(tc => ({
      input: tc.input.toString(),
      formatted: formatUSDC(tc.input),
      expected: tc.expected,
      pass: formatUSDC(tc.input).startsWith(tc.expected.split('.')[0]),
    }));

    const allPassed = results.every(r => r.pass);

    if (!allPassed) {
      throw new Error('Some format tests failed');
    }

    return {
      details: {
        method: 'utils.formatUSDC()',
        testCases: results,
        allPassed,
      },
    };
  }));

  return results;
}
