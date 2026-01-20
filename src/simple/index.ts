/**
 * ArcPay Simple API
 *
 * One-liner functions for common payment operations.
 * Perfect for quick integrations and simple use cases.
 *
 * @example
 * ```typescript
 * import { pay, escrow, stream } from 'arcpay';
 *
 * // One-liner payment
 * await pay('0x...', '100');
 *
 * // One-liner escrow
 * await escrow('0x...', '500', { release: 'on-approval' });
 *
 * // One-liner streaming
 * await stream('0x...', '1000/month');
 * ```
 */

import { ArcPayClient } from '../core/client';
import { createEscrowManager } from '../modules/escrow';
import { createPaymentChannelManager } from '../modules/channels';
import { createStreamManager } from '../modules/streams';
import { createPrivacyModule } from '../modules/privacy';
import { createContactManager, type Contact, type ContactMetadata, type ContactManager } from '../modules/contacts';
import { createTemplateManager, type PaymentTemplate } from '../modules/templates';
import { ArcPay } from '../core/client';
import { createSplitManager, type SplitResult, type SplitRecipient } from '../modules/split';
import { createLinkManager, type PaymentLink } from '../modules/links';
import { createRequestManager, type PaymentRequest } from '../modules/requests';

// Global configuration
let globalConfig: {
  privateKey?: string;
  network?: 'arc-testnet' | 'arc-mainnet';
  circleApiKey?: string;
} = {};

// Global contact manager (lazy initialized)
let globalContactManager: ContactManager | null = null;

function getContactManager(): ContactManager {
  if (!globalContactManager) {
    globalContactManager = createContactManager({ autoSave: true });
  }
  return globalContactManager;
}

/**
 * Configure ArcPay globally
 *
 * @example
 * ```typescript
 * import { configure, pay } from 'arcpay';
 *
 * configure({
 *   privateKey: process.env.PRIVATE_KEY,
 *   circleApiKey: process.env.CIRCLE_API_KEY // Optional: for Gateway/FX
 * });
 *
 * // Now you can use one-liners without passing privateKey
 * await pay('0x...', '100');
 * ```
 */
export function configure(config: {
  privateKey: string;
  network?: 'arc-testnet' | 'arc-mainnet';
  circleApiKey?: string;
}): void {
  globalConfig = config;
}

/**
 * Get or throw private key
 */
function getPrivateKey(options?: { privateKey?: string }): string {
  const key = options?.privateKey || globalConfig.privateKey || process.env.ARCPAY_PRIVATE_KEY;
  if (!key) {
    throw new Error(
      'Private key required. Either call configure(), pass privateKey option, or set ARCPAY_PRIVATE_KEY env var.'
    );
  }
  return key;
}

// ============================================
// SIMPLE PAYMENTS
// ============================================

/**
 * Send a USDC payment in one line
 *
 * @description Transfers USDC to a recipient address. Supports both regular
 * and private (stealth address) payments for enhanced privacy.
 *
 * @param to - Recipient address (0x...) or stealth address (st:arc:...)
 * @param amount - Amount in USDC (e.g., "100" or "100.50")
 * @param options - Optional configuration
 * @param options.privateKey - Override global private key
 * @param options.private - Use stealth address for privacy
 *
 * @returns Promise with transaction hash and success status
 *
 * @throws {InsufficientBalanceError} When wallet doesn't have enough USDC
 * @throws {InvalidAddressError} When recipient address is invalid
 * @throws {NetworkError} When transaction fails due to network issues
 * @throws {SignerRequiredError} When no private key is configured
 *
 * @example
 * ```typescript
 * // Simple payment
 * await pay('0x...', '100');
 *
 * // With options
 * await pay('0x...', '100', { privateKey: '0x...' });
 *
 * // Private payment (stealth address)
 * await pay('0x...', '100', { private: true });
 * ```
 */
export async function pay(
  to: string,
  amount: string,
  options?: {
    privateKey?: string;
    private?: boolean;
  }
): Promise<{ txHash: string; success: boolean }> {
  const privateKey = getPrivateKey(options);

  if (options?.private) {
    const privacy = createPrivacyModule({ privateKey });
    const result = await privacy.sendPrivate({ to, amount });
    return { txHash: result.txHash || '', success: result.success };
  }

  const client = new ArcPayClient({
    network: globalConfig.network || 'arc-testnet',
    privateKey,
  });

  const result = await client.transfer({ to, amount });
  return { txHash: result.txHash, success: true };
}

/**
 * Get USDC balance for the configured wallet
 *
 * @description Retrieves the current USDC balance and wallet address.
 *
 * @param options - Optional configuration
 * @param options.privateKey - Override global private key
 *
 * @returns Promise with USDC balance and wallet address
 *
 * @throws {NetworkError} When unable to connect to the network
 * @throws {SignerRequiredError} When no private key is configured
 *
 * @example
 * ```typescript
 * const { usdc, address } = await balance();
 * console.log(`Balance: ${usdc} USDC at ${address}`);
 * ```
 */
export async function balance(options?: { privateKey?: string }): Promise<{
  usdc: string;
  address: string;
}> {
  const privateKey = getPrivateKey(options);
  const client = new ArcPayClient({
    network: globalConfig.network || 'arc-testnet',
    privateKey,
  });

  return await client.getBalance();
}

// ============================================
// ESCROW
// ============================================

export interface EscrowOptions {
  privateKey?: string;
  release?: 'on-approval' | 'on-time' | 'on-milestone';
  arbiter?: string;
  deadline?: string;
  description?: string;
}

/**
 * Create a secure escrow for multi-party payments
 *
 * @description Creates an escrow where funds are held until conditions are met.
 * Supports arbitration for dispute resolution.
 *
 * @param beneficiary - Address that will receive funds when released
 * @param amount - Amount in USDC to escrow
 * @param options - Escrow configuration
 * @param options.privateKey - Override global private key
 * @param options.release - Release condition: 'on-approval', 'on-time', 'on-milestone'
 * @param options.arbiter - Arbitrator address for disputes
 * @param options.deadline - Expiration time (e.g., '7d', '24h', '1w')
 * @param options.description - Human-readable description
 *
 * @returns Promise with escrow ID and transaction hash
 *
 * @throws {InsufficientBalanceError} When wallet doesn't have enough USDC
 * @throws {InvalidAddressError} When beneficiary or arbiter address is invalid
 * @throws {NetworkError} When transaction fails
 * @throws {SignerRequiredError} When no private key is configured
 *
 * @example
 * ```typescript
 * // Simple escrow
 * const { escrowId } = await escrow('0x...', '500');
 *
 * // With release condition
 * const { escrowId } = await escrow('0x...', '500', {
 *   release: 'on-approval',
 *   arbiter: '0x...',
 *   deadline: '7d'
 * });
 * ```
 */
export async function escrow(
  beneficiary: string,
  amount: string,
  options?: EscrowOptions
): Promise<{ escrowId: string; txHash: string }> {
  const privateKey = getPrivateKey(options);
  const manager = createEscrowManager({ privateKey });

  const client = new ArcPayClient({
    network: globalConfig.network || 'arc-testnet',
    privateKey,
  });
  const { address: depositor } = await client.getBalance();

  const escrowResult = await manager.createEscrow({
    depositor,
    beneficiary,
    amount,
    conditions: [
      {
        type: options?.release === 'on-time' ? 'time' : 'approval',
        params: options?.arbiter ? { approver: options.arbiter } : {},
        isMet: false,
      },
    ],
    arbitrators: options?.arbiter ? [options.arbiter] : [],
    expiresAt: options?.deadline,
    description: options?.description,
  });

  // Fund it
  await manager.fundEscrow(escrowResult.id);

  return { escrowId: escrowResult.id, txHash: '' };
}

/**
 * Release an escrow
 *
 * @example
 * ```typescript
 * await releaseEscrow('escrow_123');
 * ```
 */
export async function releaseEscrow(
  escrowId: string,
  options?: { privateKey?: string }
): Promise<{ txHash: string; success: boolean }> {
  const privateKey = getPrivateKey(options);
  const manager = createEscrowManager({ privateKey });

  const result = await manager.releaseEscrow(escrowId);
  return { txHash: result.txHash || '', success: result.success };
}

/**
 * Refund an escrow
 *
 * @example
 * ```typescript
 * await refundEscrow('escrow_123');
 * ```
 */
export async function refundEscrow(
  escrowId: string,
  options?: { privateKey?: string }
): Promise<{ txHash: string; success: boolean }> {
  const privateKey = getPrivateKey(options);
  const manager = createEscrowManager({ privateKey });

  const result = await manager.refundEscrow(escrowId);
  return { txHash: result.txHash || '', success: result.success };
}

// ============================================
// STREAMING
// ============================================

export interface StreamOptions {
  privateKey?: string;
  startAt?: string;
}

/**
 * Start a real-time payment stream
 *
 * @description Creates a continuous payment stream where funds flow per-second
 * from sender to recipient. Perfect for salaries, subscriptions, and rent.
 *
 * @param recipient - Address to receive the streamed funds
 * @param amount - Total amount or rate (e.g., '5000' or '100/day')
 * @param duration - Stream duration (e.g., '30d', '1w', '24h')
 * @param options - Stream configuration
 * @param options.privateKey - Override global private key
 * @param options.startAt - Delayed start time
 *
 * @returns Promise with stream ID and transaction hash
 *
 * @throws {InsufficientBalanceError} When wallet doesn't have enough USDC
 * @throws {InvalidAddressError} When recipient address is invalid
 * @throws {ValidationError} When duration format is invalid
 * @throws {NetworkError} When transaction fails
 *
 * @example
 * ```typescript
 * // Stream $1000 over 30 days
 * await stream('0x...', '1000', '30d');
 *
 * // Stream with rate
 * await stream('0x...', '100/day', '1w');
 *
 * // Continuous monthly salary
 * await stream('0x...', '5000', '30d');
 * ```
 */
export async function stream(
  recipient: string,
  amount: string,
  duration: string,
  options?: StreamOptions
): Promise<{ streamId: string; txHash: string }> {
  const privateKey = getPrivateKey(options);
  const manager = createStreamManager({ privateKey });

  // Parse duration to seconds
  const durationSeconds = parseDuration(duration);

  // Parse amount (handle rate format like '100/day')
  const totalAmount = parseAmount(amount, durationSeconds);

  const result = await manager.createStream({
    recipient,
    totalAmount,
    duration: durationSeconds,
  });

  return { streamId: result.id, txHash: result.txHash || '' };
}

/**
 * Claim from a stream
 *
 * @example
 * ```typescript
 * const { amount, txHash } = await claimStream('stream_123');
 * ```
 */
export async function claimStream(
  streamId: string,
  options?: { privateKey?: string }
): Promise<{ amount: string; txHash: string }> {
  const privateKey = getPrivateKey(options);
  const manager = createStreamManager({ privateKey });

  const result = await manager.claim(streamId);
  return { amount: result.amountClaimed, txHash: result.txHash };
}

/**
 * Cancel a stream
 *
 * @example
 * ```typescript
 * await cancelStream('stream_123');
 * ```
 */
export async function cancelStream(
  streamId: string,
  options?: { privateKey?: string }
): Promise<{ success: boolean }> {
  const privateKey = getPrivateKey(options);
  const manager = createStreamManager({ privateKey });

  const result = await manager.cancelStream(streamId);
  return { success: result.success };
}

// ============================================
// PAYMENT CHANNELS
// ============================================

/**
 * Open an off-chain payment channel for instant micropayments
 *
 * @description Creates a payment channel with a deposit. Once open, you can
 * make thousands of instant payments with no gas fees until you close it.
 *
 * @param recipient - Channel recipient address
 * @param deposit - Initial deposit amount in USDC
 * @param options - Channel configuration
 * @param options.privateKey - Override global private key
 *
 * @returns Promise with channel ID
 *
 * @throws {InsufficientBalanceError} When wallet doesn't have enough USDC
 * @throws {InvalidAddressError} When recipient address is invalid
 * @throws {NetworkError} When transaction fails
 *
 * @example
 * ```typescript
 * const { channelId } = await openChannel('0x...', '10');
 * // Now make instant payments
 * await channelPay(channelId, '0.001');
 * ```
 */
export async function openChannel(
  recipient: string,
  deposit: string,
  options?: { privateKey?: string }
): Promise<{ channelId: string }> {
  const privateKey = getPrivateKey(options);
  const manager = createPaymentChannelManager({ privateKey });

  const channel = await manager.createChannel({ recipient, deposit });
  return { channelId: channel.id };
}

/**
 * Pay through a channel (instant, no gas)
 *
 * @example
 * ```typescript
 * const { receipt } = await channelPay('channel_123', '0.01');
 * ```
 */
export async function channelPay(
  channelId: string,
  amount: string,
  options?: { privateKey?: string }
): Promise<{ receipt: string }> {
  const privateKey = getPrivateKey(options);
  const manager = createPaymentChannelManager({ privateKey });

  const result = await manager.pay(channelId, amount);
  return { receipt: result.signature };
}

/**
 * Close a channel
 *
 * @example
 * ```typescript
 * await closeChannel('channel_123');
 * ```
 */
export async function closeChannel(
  channelId: string,
  options?: { privateKey?: string }
): Promise<{ txHash: string }> {
  const privateKey = getPrivateKey(options);
  const manager = createPaymentChannelManager({ privateKey });

  const result = await manager.closeChannel(channelId);
  return { txHash: result.txHash };
}

// ============================================
// PRIVACY
// ============================================

/**
 * Get your stealth address for receiving private payments
 *
 * @example
 * ```typescript
 * const stealthAddress = await getStealthAddress();
 * // Share this with senders for private payments
 * ```
 */
export async function getStealthAddress(options?: { privateKey?: string }): Promise<string> {
  const privateKey = getPrivateKey(options);
  const privacy = createPrivacyModule({ privateKey });
  return privacy.getStealthMetaAddress();
}

/**
 * Send a private payment using stealth addresses (EIP-5564)
 *
 * @description Sends USDC to a stealth address where the recipient's real
 * address is hidden on-chain. Only the recipient can claim the funds.
 *
 * @param to - Stealth meta-address (st:arc:...) or recipient's stealth address
 * @param amount - Amount in USDC to send
 * @param options - Payment configuration
 * @param options.privateKey - Override global private key
 *
 * @returns Promise with transaction hash and generated stealth address
 *
 * @throws {InsufficientBalanceError} When wallet doesn't have enough USDC
 * @throws {ValidationError} When stealth address format is invalid
 * @throws {NetworkError} When transaction fails
 *
 * @example
 * ```typescript
 * // Get recipient's stealth address first
 * const stealthAddr = await getStealthAddress();
 *
 * // Send private payment
 * await payPrivate('st:arc:...', '100');
 * ```
 */
export async function payPrivate(
  to: string,
  amount: string,
  options?: { privateKey?: string }
): Promise<{ txHash: string; stealthAddress?: string }> {
  const privateKey = getPrivateKey(options);
  const privacy = createPrivacyModule({ privateKey });

  const result = await privacy.sendPrivate({ to, amount });
  return {
    txHash: result.txHash || '',
    stealthAddress: result.stealthAddress,
  };
}

// ============================================
// CONTACTS
// ============================================

/**
 * Add a contact (address alias) in one line
 *
 * @example
 * ```typescript
 * await addContact('ahmed', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78');
 * await addContact('netflix', '0x...', { category: 'subscription' });
 * ```
 */
export async function addContact(
  name: string,
  address: string,
  metadata?: ContactMetadata
): Promise<Contact> {
  const manager = getContactManager();
  return manager.add(name, address, metadata);
}

/**
 * Get a contact by name
 *
 * @example
 * ```typescript
 * const contact = await getContact('ahmed');
 * if (contact) {
 *   console.log(`Ahmed's address: ${contact.address}`);
 * }
 * ```
 */
export async function getContact(name: string): Promise<Contact | null> {
  const manager = getContactManager();
  const contact = await manager.get(name);
  return contact ?? null;
}

/**
 * List all contacts
 *
 * @example
 * ```typescript
 * const contacts = await listContacts();
 * contacts.forEach(c => console.log(`${c.displayName}: ${c.address}`));
 * ```
 */
export async function listContacts(): Promise<Contact[]> {
  const manager = getContactManager();
  return manager.list();
}

/**
 * Delete a contact
 *
 * @example
 * ```typescript
 * const deleted = await deleteContact('ahmed');
 * if (deleted) {
 *   console.log('Contact removed');
 * }
 * ```
 */
export async function deleteContact(name: string): Promise<boolean> {
  const manager = getContactManager();
  return manager.delete(name);
}

/**
 * Resolve a contact name to address
 *
 * @example
 * ```typescript
 * const address = await resolveContact('ahmed');
 * // Returns '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78'
 *
 * const same = await resolveContact('0x742d...');
 * // Returns the same address if it's already an address
 * ```
 */
export async function resolveContact(nameOrAddress: string): Promise<string | undefined> {
  const manager = getContactManager();
  return manager.resolve(nameOrAddress);
}

/**
 * Search contacts with fuzzy matching
 *
 * @example
 * ```typescript
 * const results = await searchContacts('ahm');
 * // Returns contacts matching 'ahm' (e.g., 'ahmed', 'ahmad')
 * ```
 */
export async function searchContacts(query: string): Promise<Contact[]> {
  const manager = getContactManager();
  const results = await manager.search(query);
  return results.map(r => r.contact);
}

/**
 * Pay by contact name or address
 *
 * @description Resolves a contact name to address and sends payment.
 * If the recipient is already an address, sends directly.
 *
 * @param to - Contact name (e.g., "ahmed") or address (0x...)
 * @param amount - Amount in USDC
 * @param options - Optional configuration
 *
 * @returns Promise with transaction hash and resolved address
 *
 * @throws {ContactNotFoundError} When contact name is not found
 * @throws {InsufficientBalanceError} When wallet doesn't have enough USDC
 *
 * @example
 * ```typescript
 * // Add contact first
 * await addContact('ahmed', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78');
 *
 * // Pay by name
 * await payTo('ahmed', '50');
 *
 * // Or pay by address (still works)
 * await payTo('0x742d35Cc...', '50');
 * ```
 */
export async function payTo(
  to: string,
  amount: string,
  options?: { privateKey?: string }
): Promise<{ txHash: string; resolvedAddress: string; contactName?: string }> {
  const manager = getContactManager();

  // Resolve contact name to address
  let resolvedAddress: string;
  let contactName: string | undefined;

  if (to.startsWith('0x') && to.length === 42) {
    // Already an address
    resolvedAddress = to;
  } else {
    // Try to resolve from contacts
    const resolved = await manager.resolve(to);
    if (!resolved) {
      throw new Error(`Contact "${to}" not found. Add them first with addContact().`);
    }
    resolvedAddress = resolved;
    contactName = to;
  }

  // Send payment
  const result = await pay(resolvedAddress, amount, options);

  return {
    txHash: result.txHash,
    resolvedAddress,
    contactName,
  };
}

// ============================================
// SUBSCRIPTIONS
// ============================================

/**
 * Add a subscription with billing day
 *
 * @example
 * ```typescript
 * // Add Netflix subscription for $15.99/month on the 15th
 * await addSubscription('netflix', '0x...', '15.99', 15);
 *
 * // Add Spotify subscription
 * await addSubscription('spotify', '0x...', '9.99', 1);
 * ```
 */
export async function addSubscription(
  name: string,
  address: string,
  amount: string,
  billingDay: number
): Promise<Contact> {
  const manager = getContactManager();
  return manager.add(name, address, {
    category: 'subscription',
    monthlyAmount: amount,
    billingDay,
  });
}

/**
 * Get all subscriptions that are due today or overdue
 *
 * @example
 * ```typescript
 * const dueBills = await getDueBills();
 * dueBills.forEach(bill => {
 *   console.log(`${bill.displayName}: $${bill.metadata.monthlyAmount}`);
 * });
 * ```
 */
export async function getDueBills(): Promise<Contact[]> {
  const manager = getContactManager();
  return manager.getDueSubscriptions();
}

/**
 * Get subscriptions coming up in the next N days
 *
 * @example
 * ```typescript
 * // Get bills due in the next 7 days
 * const upcoming = await getUpcomingBills(7);
 *
 * // Get bills due in the next 30 days
 * const monthAhead = await getUpcomingBills(30);
 * ```
 */
export async function getUpcomingBills(days: number = 7): Promise<Contact[]> {
  const manager = getContactManager();
  return manager.getUpcomingSubscriptions(days);
}

/**
 * Get overdue subscriptions
 *
 * @example
 * ```typescript
 * const overdue = await getOverdueBills();
 * if (overdue.length > 0) {
 *   console.log(`You have ${overdue.length} overdue bills!`);
 * }
 * ```
 */
export async function getOverdueBills(): Promise<Contact[]> {
  const manager = getContactManager();
  return manager.getOverdueSubscriptions();
}

/**
 * Get subscriptions paid this month
 *
 * @example
 * ```typescript
 * const paid = await getPaidBills();
 * console.log(`${paid.length} bills paid this month`);
 * ```
 */
export async function getPaidBills(): Promise<Contact[]> {
  const manager = getContactManager();
  return manager.getPaidThisMonth();
}

/**
 * Pay a subscription bill
 *
 * @example
 * ```typescript
 * const { txHash } = await payBill('netflix');
 * console.log(`Paid Netflix! TX: ${txHash}`);
 * ```
 */
export async function payBill(
  name: string,
  options?: { privateKey?: string }
): Promise<{ txHash: string; contact: Contact }> {
  const manager = getContactManager();
  const contact = await manager.get(name);

  if (!contact) {
    throw new Error(`Subscription "${name}" not found`);
  }

  if (contact.metadata.category !== 'subscription') {
    throw new Error(`"${name}" is not a subscription`);
  }

  const amount = contact.metadata.monthlyAmount;
  if (!amount) {
    throw new Error(`No amount set for subscription "${name}"`);
  }

  // Pay the subscription
  const privateKey = getPrivateKey(options);
  const client = new ArcPayClient({
    network: globalConfig.network || 'arc-testnet',
    privateKey,
  });

  const result = await client.transfer({ to: contact.address, amount });

  // Mark as paid
  const updatedContact = await manager.markPaid(name, result.txHash);

  return { txHash: result.txHash, contact: updatedContact };
}

/**
 * Pay all due subscriptions
 *
 * @example
 * ```typescript
 * const { paid, total, transactions } = await payAllDueBills();
 * console.log(`Paid ${paid} bills totaling $${total}`);
 * ```
 */
export async function payAllDueBills(
  options?: { privateKey?: string }
): Promise<{ paid: number; total: string; transactions: Array<{ name: string; txHash: string }> }> {
  const manager = getContactManager();
  const dueBills = await manager.getDueSubscriptions();

  if (dueBills.length === 0) {
    return { paid: 0, total: '0', transactions: [] };
  }

  const privateKey = getPrivateKey(options);
  const client = new ArcPayClient({
    network: globalConfig.network || 'arc-testnet',
    privateKey,
  });

  const transactions: Array<{ name: string; txHash: string }> = [];
  let totalPaid = 0;

  for (const bill of dueBills) {
    const amount = bill.metadata.monthlyAmount;
    if (!amount) continue;

    const result = await client.transfer({ to: bill.address, amount });
    await manager.markPaid(bill.name, result.txHash);

    transactions.push({ name: bill.displayName, txHash: result.txHash });
    totalPaid += parseFloat(amount);
  }

  return {
    paid: transactions.length,
    total: totalPaid.toFixed(2),
    transactions,
  };
}

/**
 * Snooze a subscription for N days
 *
 * @example
 * ```typescript
 * // Snooze Netflix for 3 days
 * await snoozeBill('netflix', 3);
 *
 * // Snooze Spotify for 1 week
 * await snoozeBill('spotify', 7);
 * ```
 */
export async function snoozeBill(name: string, days: number): Promise<Contact> {
  const manager = getContactManager();
  return manager.snooze(name, days);
}

/**
 * Get total monthly subscription cost
 *
 * @example
 * ```typescript
 * const total = await getMonthlySubscriptionTotal();
 * console.log(`You spend $${total}/month on subscriptions`);
 * ```
 */
export async function getMonthlySubscriptionTotal(): Promise<string> {
  const manager = getContactManager();
  return manager.getMonthlyTotal();
}

/**
 * List all subscriptions with their status
 *
 * @example
 * ```typescript
 * const subs = await listSubscriptions();
 * subs.forEach(sub => {
 *   const status = getContactManager().getSubscriptionStatus(sub);
 *   console.log(`${sub.displayName}: ${status.status}`);
 * });
 * ```
 */
export async function listSubscriptions(): Promise<Contact[]> {
  const manager = getContactManager();
  return manager.getSubscriptions();
}

// ============================================
// HELPERS
// ============================================

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h|d|w|mo|y)$/);
  if (!match) {
    // Try parsing as number (seconds)
    const num = parseInt(duration);
    if (!isNaN(num)) return num;
    return 30 * 24 * 60 * 60; // Default 30 days
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 24 * 60 * 60;
    case 'w':
      return value * 7 * 24 * 60 * 60;
    case 'mo':
      return value * 30 * 24 * 60 * 60;
    case 'y':
      return value * 365 * 24 * 60 * 60;
    default:
      return 30 * 24 * 60 * 60;
  }
}

function parseAmount(amount: string, durationSeconds: number): string {
  // Handle rate format like '100/day', '1000/month'
  const rateMatch = amount.match(/^([\d.]+)\/(hour|day|week|month|year)$/);
  if (!rateMatch) return amount;

  const rate = parseFloat(rateMatch[1]);
  const period = rateMatch[2];

  let periodSeconds: number;
  switch (period) {
    case 'hour':
      periodSeconds = 60 * 60;
      break;
    case 'day':
      periodSeconds = 24 * 60 * 60;
      break;
    case 'week':
      periodSeconds = 7 * 24 * 60 * 60;
      break;
    case 'month':
      periodSeconds = 30 * 24 * 60 * 60;
      break;
    case 'year':
      periodSeconds = 365 * 24 * 60 * 60;
      break;
    default:
      periodSeconds = 24 * 60 * 60;
  }

  const totalAmount = (rate * durationSeconds) / periodSeconds;
  return totalAmount.toFixed(6);
}

// ============================================
// PAYMENT TEMPLATES
// ============================================

/**
 * List available payment templates
 *
 * @example
 * ```typescript
 * const templates = listTemplates();
 * templates.forEach(t => console.log(`${t.icon} ${t.name}: $${t.amount}/mo`));
 * ```
 */
export function listTemplates(category?: 'subscription' | 'business' | 'personal' | 'utility'): PaymentTemplate[] {
  const manager = createTemplateManager();
  return manager.list({ category });
}

/**
 * Get a template by ID
 *
 * @example
 * ```typescript
 * const netflix = getTemplate('netflix');
 * console.log(`Netflix: $${netflix?.amount}/mo`);
 * ```
 */
export function getTemplate(id: string): PaymentTemplate | undefined {
  const manager = createTemplateManager();
  return manager.get(id);
}

/**
 * Create a contact from a template
 *
 * @example
 * ```typescript
 * // Add Netflix subscription
 * const contact = await addFromTemplate('netflix', '0x...');
 *
 * // Add with custom amount
 * const contact = await addFromTemplate('netflix', '0x...', '22.99');
 * ```
 */
export async function addFromTemplate(
  templateId: string,
  address: string,
  amount?: string
): Promise<Contact> {
  const manager = createTemplateManager();
  manager.setContactManager(getContactManager());
  return manager.use(templateId, { address, amount });
}

// ============================================
// SPLIT PAYMENT
// ============================================

/**
 * Split a payment equally between recipients
 *
 * @example
 * ```typescript
 * // Split $100 between alice, bob, and charlie
 * const result = await splitPayment('100', ['alice', 'bob', 'charlie']);
 * console.log(`Split completed: ${result.successCount} payments`);
 * ```
 */
export async function splitPayment(
  total: string,
  recipients: string[],
  options?: { privateKey?: string }
): Promise<SplitResult> {
  const privateKey = getPrivateKey(options);
  const arcPay = await ArcPay.init({
    network: globalConfig.network || 'arc-testnet',
    privateKey,
  });

  const manager = createSplitManager(arcPay);
  manager.setContactManager(getContactManager());

  return manager.equal(total, recipients);
}

/**
 * Split with custom amounts
 *
 * @example
 * ```typescript
 * const result = await splitCustom([
 *   { to: 'alice', amount: '50' },
 *   { to: 'bob', amount: '30' },
 *   { to: 'charlie', amount: '20' }
 * ]);
 * ```
 */
export async function splitCustom(
  recipients: SplitRecipient[],
  options?: { privateKey?: string }
): Promise<SplitResult> {
  const privateKey = getPrivateKey(options);
  const arcPay = await ArcPay.init({
    network: globalConfig.network || 'arc-testnet',
    privateKey,
  });

  const manager = createSplitManager(arcPay);
  manager.setContactManager(getContactManager());

  return manager.custom(recipients);
}

// ============================================
// PAYMENT LINKS
// ============================================

/**
 * Create a shareable payment link
 *
 * @example
 * ```typescript
 * const link = await createPaymentLink('50', 'Dinner split');
 * console.log(`Share this: ${link.url}`);
 * ```
 */
export async function createPaymentLink(
  amount?: string,
  description?: string,
  options?: { privateKey?: string }
): Promise<PaymentLink> {
  const privateKey = getPrivateKey(options);
  const arcPay = await ArcPay.init({
    network: globalConfig.network || 'arc-testnet',
    privateKey,
  });

  const manager = createLinkManager(arcPay);

  return manager.create({ amount, description });
}

/**
 * Pay a payment link
 *
 * @example
 * ```typescript
 * const result = await payLink('link_abc123');
 * console.log(`Paid! TX: ${result.txHash}`);
 * ```
 */
export async function payLink(
  urlOrId: string,
  amount?: string,
  options?: { privateKey?: string }
): Promise<{ txHash: string }> {
  const privateKey = getPrivateKey(options);
  const arcPay = await ArcPay.init({
    network: globalConfig.network || 'arc-testnet',
    privateKey,
  });

  const manager = createLinkManager(arcPay);

  const result = await manager.payFromUrl(urlOrId, amount);
  return { txHash: result.txHash };
}

/**
 * List payment links
 *
 * @example
 * ```typescript
 * const links = await listPaymentLinks();
 * const active = await listPaymentLinks('active');
 * ```
 */
export async function listPaymentLinks(
  status?: 'active' | 'paid' | 'expired' | 'cancelled',
  options?: { privateKey?: string }
): Promise<PaymentLink[]> {
  const privateKey = getPrivateKey(options);
  const arcPay = await ArcPay.init({
    network: globalConfig.network || 'arc-testnet',
    privateKey,
  });

  const manager = createLinkManager(arcPay);

  return manager.list({ status });
}

// ============================================
// PAYMENT REQUESTS
// ============================================

/**
 * Request payment from someone
 *
 * @example
 * ```typescript
 * const request = await requestPayment('alice', '50', 'Dinner split');
 * console.log(`Request sent to ${request.from.name}`);
 * ```
 */
export async function requestPayment(
  from: string,
  amount: string,
  reason?: string,
  options?: { privateKey?: string }
): Promise<PaymentRequest> {
  const privateKey = getPrivateKey(options);
  const arcPay = await ArcPay.init({
    network: globalConfig.network || 'arc-testnet',
    privateKey,
  });

  const manager = createRequestManager(arcPay);
  manager.setContactManager(getContactManager());

  return manager.create({ from, amount, reason });
}

/**
 * Request payment from multiple people
 *
 * @example
 * ```typescript
 * const requests = await requestPaymentFrom(
 *   ['alice', 'bob', 'charlie'],
 *   '33.33',
 *   'Split dinner'
 * );
 * ```
 */
export async function requestPaymentFrom(
  from: string[],
  amount: string,
  reason?: string,
  options?: { privateKey?: string }
): Promise<PaymentRequest[]> {
  const privateKey = getPrivateKey(options);
  const arcPay = await ArcPay.init({
    network: globalConfig.network || 'arc-testnet',
    privateKey,
  });

  const manager = createRequestManager(arcPay);
  manager.setContactManager(getContactManager());

  return manager.createBulk({ from, amount, reason });
}

/**
 * List incoming payment requests (what you owe)
 *
 * @example
 * ```typescript
 * const incoming = await getIncomingRequests();
 * incoming.forEach(r => console.log(`Owe ${r.to.name}: $${r.amount}`));
 * ```
 */
export async function getIncomingRequests(
  options?: { privateKey?: string }
): Promise<PaymentRequest[]> {
  const privateKey = getPrivateKey(options);
  const arcPay = await ArcPay.init({
    network: globalConfig.network || 'arc-testnet',
    privateKey,
  });

  const manager = createRequestManager(arcPay);

  return manager.listIncoming();
}

/**
 * List outgoing payment requests (what others owe you)
 *
 * @example
 * ```typescript
 * const outgoing = await getOutgoingRequests();
 * outgoing.forEach(r => console.log(`${r.from.name} owes: $${r.amount}`));
 * ```
 */
export async function getOutgoingRequests(
  options?: { privateKey?: string }
): Promise<PaymentRequest[]> {
  const privateKey = getPrivateKey(options);
  const arcPay = await ArcPay.init({
    network: globalConfig.network || 'arc-testnet',
    privateKey,
  });

  const manager = createRequestManager(arcPay);

  return manager.listOutgoing();
}

/**
 * Pay a payment request
 *
 * @example
 * ```typescript
 * const result = await payRequest('req_abc123');
 * console.log(`Paid! TX: ${result.txHash}`);
 * ```
 */
export async function payRequest(
  requestId: string,
  options?: { privateKey?: string }
): Promise<{ txHash: string }> {
  const privateKey = getPrivateKey(options);
  const arcPay = await ArcPay.init({
    network: globalConfig.network || 'arc-testnet',
    privateKey,
  });

  const manager = createRequestManager(arcPay);

  return manager.pay(requestId);
}

/**
 * Decline a payment request
 *
 * @example
 * ```typescript
 * await declineRequest('req_abc123', 'Already paid cash');
 * ```
 */
export async function declineRequest(
  requestId: string,
  reason?: string,
  options?: { privateKey?: string }
): Promise<void> {
  const privateKey = getPrivateKey(options);
  const arcPay = await ArcPay.init({
    network: globalConfig.network || 'arc-testnet',
    privateKey,
  });

  const manager = createRequestManager(arcPay);

  return manager.decline(requestId, reason);
}

// ============================================
// DEFAULT EXPORT
// ============================================

export default {
  configure,
  pay,
  balance,
  escrow,
  releaseEscrow,
  refundEscrow,
  stream,
  claimStream,
  cancelStream,
  openChannel,
  channelPay,
  closeChannel,
  getStealthAddress,
  payPrivate,
  // Contacts
  addContact,
  getContact,
  listContacts,
  deleteContact,
  resolveContact,
  searchContacts,
  payTo,
  // Subscriptions
  addSubscription,
  getDueBills,
  getUpcomingBills,
  getOverdueBills,
  getPaidBills,
  payBill,
  payAllDueBills,
  snoozeBill,
  getMonthlySubscriptionTotal,
  listSubscriptions,
  // Templates
  listTemplates,
  getTemplate,
  addFromTemplate,
  // Split Payment
  splitPayment,
  splitCustom,
  // Payment Links
  createPaymentLink,
  payLink,
  listPaymentLinks,
  // Payment Requests
  requestPayment,
  requestPaymentFrom,
  getIncomingRequests,
  getOutgoingRequests,
  payRequest,
  declineRequest,
};
