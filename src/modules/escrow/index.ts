/**
 * Escrow Module - Multi-party Conditional Payments
 *
 * Secure escrow for marketplace, freelance, and multi-party transactions:
 * - Conditional release (time, multisig, oracle, manual)
 * - Milestone-based payments
 * - Dispute resolution with arbitrators
 * - Multi-party distribution
 *
 * @example
 * ```typescript
 * import { createEscrowManager } from 'arcpay';
 *
 * const escrow = createEscrowManager({
 *   privateKey: process.env.PRIVATE_KEY,
 * });
 *
 * // Create marketplace escrow
 * const e = await escrow.createEscrow({
 *   depositor: buyer,
 *   beneficiary: seller,
 *   amount: '500',
 *   conditions: [
 *     { type: 'approval', params: { approver: buyer }, isMet: false }
 *   ],
 *   arbitrators: [platformArbitrator],
 *   description: 'Purchase of item #123',
 * });
 *
 * // Fund the escrow
 * await escrow.fundEscrow(e.id);
 *
 * // After delivery, buyer approves
 * await escrow.markConditionMet(e.id, 0, 'Item received');
 *
 * // Release funds to seller
 * const result = await escrow.releaseEscrow(e.id);
 *
 * // Or if dispute needed
 * escrow.raiseDispute(e.id, buyer, 'Item not as described', ['photo1.jpg']);
 *
 * // Arbitrator resolves
 * await escrow.resolveDispute(e.id, dispute.id, {
 *   decision: 'split',
 *   splitRatio: { depositor: 50, beneficiary: 50 },
 *   decidedBy: platformArbitrator,
 *   reason: 'Partial refund agreed',
 * });
 * ```
 */

export * from './types';
export { EscrowManager, createEscrowManager } from './escrow';
export {
  MultisigEscrowManager,
  createMultisigEscrow,
  type MultisigSigner,
  type MultisigEscrowConfig,
  type MultisigEscrow,
  type MultisigState,
  type MultisigApproval,
  type ApprovalResult,
} from './multisig';
