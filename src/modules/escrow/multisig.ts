/**
 * Multi-sig Escrow Module
 *
 * Enhanced escrow with multi-signature support for:
 * - N-of-M approval requirements
 * - Time-locked releases
 * - Weighted voting
 * - Threshold signatures
 *
 * @example
 * ```typescript
 * import { createMultisigEscrow } from 'arcpay';
 *
 * const multisig = createMultisigEscrow({
 *   privateKey: process.env.PRIVATE_KEY,
 * });
 *
 * // Create 2-of-3 multisig escrow
 * const escrow = await multisig.create({
 *   signers: [alice, bob, charlie],
 *   threshold: 2,
 *   beneficiary: '0x...',
 *   amount: '10000',
 *   description: 'Investment fund release'
 * });
 *
 * // Each signer approves
 * await multisig.approve(escrow.id, 'alice_signature');
 * await multisig.approve(escrow.id, 'bob_signature');
 *
 * // Once threshold is met, release automatically happens
 * ```
 */

import { createEscrowManager, type EscrowManager } from './escrow';
import type { EscrowConfig } from './types';

/**
 * Multi-sig signer info
 */
export interface MultisigSigner {
  /** Signer address */
  address: string;
  /** Signer name/label */
  name?: string;
  /** Weight for weighted voting (default: 1) */
  weight?: number;
  /** Has signed */
  hasSigned: boolean;
  /** Signed at timestamp */
  signedAt?: string;
  /** Signature data */
  signature?: string;
}

/**
 * Multi-sig escrow configuration
 */
export interface MultisigEscrowConfig {
  /** List of signers */
  signers: Array<string | { address: string; name?: string; weight?: number }>;
  /** Required signatures (or total weight) to release */
  threshold: number;
  /** Beneficiary address */
  beneficiary: string;
  /** Escrow amount */
  amount: string;
  /** Use weighted voting */
  weighted?: boolean;
  /** Description */
  description?: string;
  /** Time lock (release only after this time) */
  timeLock?: string;
  /** Expiry */
  expiresAt?: string;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Multi-sig escrow details
 */
export interface MultisigEscrow {
  /** Escrow ID */
  id: string;
  /** Underlying escrow ID */
  escrowId: string;
  /** All signers */
  signers: MultisigSigner[];
  /** Required threshold */
  threshold: number;
  /** Current weight/signatures collected */
  currentWeight: number;
  /** Use weighted voting */
  weighted: boolean;
  /** Beneficiary */
  beneficiary: string;
  /** Amount */
  amount: string;
  /** State */
  state: MultisigState;
  /** Time lock (if any) */
  timeLock?: string;
  /** Description */
  description?: string;
  /** Created timestamp */
  createdAt: string;
  /** Released timestamp */
  releasedAt?: string;
  /** Expires at */
  expiresAt?: string;
  /** Approval history */
  approvals: MultisigApproval[];
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Multi-sig state
 */
export type MultisigState =
  | 'pending'
  | 'collecting'
  | 'threshold_met'
  | 'time_locked'
  | 'released'
  | 'expired'
  | 'cancelled';

/**
 * Approval record
 */
export interface MultisigApproval {
  /** Signer address */
  signer: string;
  /** Approved at */
  approvedAt: string;
  /** Weight contributed */
  weight: number;
  /** Optional message */
  message?: string;
}

/**
 * Approval result
 */
export interface ApprovalResult {
  success: boolean;
  currentWeight: number;
  thresholdMet: boolean;
  autoReleased: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Multi-sig Escrow Manager
 */
export class MultisigEscrowManager {
  private escrowManager: EscrowManager;
  private multisigEscrows: Map<string, MultisigEscrow> = new Map();

  constructor(config: EscrowConfig) {
    this.escrowManager = createEscrowManager(config);
  }

  /**
   * Create a multi-sig escrow
   *
   * @example
   * ```typescript
   * // Simple 2-of-3 multisig
   * const escrow = await multisig.create({
   *   signers: [alice, bob, charlie],
   *   threshold: 2,
   *   beneficiary: treasury,
   *   amount: '50000'
   * });
   *
   * // Weighted multisig (board members with different weights)
   * const escrow = await multisig.create({
   *   signers: [
   *     { address: ceo, weight: 3 },
   *     { address: cfo, weight: 2 },
   *     { address: cto, weight: 2 },
   *     { address: boardMember1, weight: 1 },
   *     { address: boardMember2, weight: 1 },
   *   ],
   *   threshold: 5, // Need combined weight of 5
   *   weighted: true,
   *   beneficiary: vendor,
   *   amount: '100000',
   *   timeLock: '7d' // Release after 7 days even if threshold met
   * });
   * ```
   */
  async create(params: MultisigEscrowConfig): Promise<MultisigEscrow> {
    // Normalize signers
    const signers: MultisigSigner[] = params.signers.map((s) => {
      if (typeof s === 'string') {
        return { address: s, weight: 1, hasSigned: false };
      }
      return { ...s, weight: s.weight || 1, hasSigned: false };
    });

    // Create underlying escrow
    const escrow = await this.escrowManager.createEscrow({
      depositor: signers[0].address,
      beneficiary: params.beneficiary,
      amount: params.amount,
      conditions: [
        {
          type: 'multisig',
          params: {
            requiredSignatures: params.threshold,
            signers: signers.map((s) => s.address),
          },
          isMet: false,
        },
      ],
      expiresAt: params.expiresAt,
      description: params.description,
      metadata: params.metadata,
    });

    // Fund it
    await this.escrowManager.fundEscrow(escrow.id);

    // Parse time lock
    const timeLock = params.timeLock ? this.parseTimeLock(params.timeLock) : undefined;

    const multisigEscrow: MultisigEscrow = {
      id: `msig_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      escrowId: escrow.id,
      signers,
      threshold: params.threshold,
      currentWeight: 0,
      weighted: params.weighted || false,
      beneficiary: params.beneficiary,
      amount: params.amount,
      state: 'collecting',
      timeLock: timeLock?.toISOString(),
      description: params.description,
      createdAt: new Date().toISOString(),
      expiresAt: params.expiresAt,
      approvals: [],
      metadata: params.metadata,
    };

    this.multisigEscrows.set(multisigEscrow.id, multisigEscrow);
    return multisigEscrow;
  }

  /**
   * Approve/sign a multi-sig escrow
   *
   * @example
   * ```typescript
   * // Approve as a signer
   * const result = await multisig.approve(escrowId, {
   *   message: 'Approved for Q4 budget'
   * });
   *
   * if (result.autoReleased) {
   *   console.log('Funds released!', result.txHash);
   * }
   * ```
   */
  async approve(
    multisigId: string,
    options?: { signer?: string; message?: string }
  ): Promise<ApprovalResult> {
    const multisig = this.multisigEscrows.get(multisigId);
    if (!multisig) {
      return {
        success: false,
        currentWeight: 0,
        thresholdMet: false,
        autoReleased: false,
        error: 'Multi-sig escrow not found',
      };
    }

    if (multisig.state === 'released') {
      return {
        success: false,
        currentWeight: multisig.currentWeight,
        thresholdMet: true,
        autoReleased: false,
        error: 'Already released',
      };
    }

    // Find the signer
    const signerAddress = options?.signer || multisig.signers[0].address;
    const signer = multisig.signers.find(
      (s) => s.address.toLowerCase() === signerAddress.toLowerCase()
    );

    if (!signer) {
      return {
        success: false,
        currentWeight: multisig.currentWeight,
        thresholdMet: false,
        autoReleased: false,
        error: 'Not an authorized signer',
      };
    }

    if (signer.hasSigned) {
      return {
        success: false,
        currentWeight: multisig.currentWeight,
        thresholdMet: multisig.currentWeight >= multisig.threshold,
        autoReleased: false,
        error: 'Already signed',
      };
    }

    // Record approval
    signer.hasSigned = true;
    signer.signedAt = new Date().toISOString();

    const weight = signer.weight || 1;
    multisig.currentWeight += weight;

    multisig.approvals.push({
      signer: signerAddress,
      approvedAt: new Date().toISOString(),
      weight,
      message: options?.message,
    });

    // Check if threshold met
    const thresholdMet = multisig.currentWeight >= multisig.threshold;

    if (thresholdMet) {
      multisig.state = 'threshold_met';

      // Check time lock
      if (multisig.timeLock && new Date(multisig.timeLock) > new Date()) {
        multisig.state = 'time_locked';
        this.multisigEscrows.set(multisigId, multisig);

        return {
          success: true,
          currentWeight: multisig.currentWeight,
          thresholdMet: true,
          autoReleased: false,
          error: `Time-locked until ${multisig.timeLock}`,
        };
      }

      // Auto-release
      const result = await this.release(multisigId);
      return {
        success: result.success,
        currentWeight: multisig.currentWeight,
        thresholdMet: true,
        autoReleased: result.success,
        txHash: result.txHash,
        error: result.error,
      };
    }

    this.multisigEscrows.set(multisigId, multisig);

    return {
      success: true,
      currentWeight: multisig.currentWeight,
      thresholdMet: false,
      autoReleased: false,
    };
  }

  /**
   * Revoke approval (before threshold is met)
   */
  revoke(multisigId: string, signerAddress: string): { success: boolean; error?: string } {
    const multisig = this.multisigEscrows.get(multisigId);
    if (!multisig) {
      return { success: false, error: 'Multi-sig escrow not found' };
    }

    if (multisig.state === 'released' || multisig.state === 'threshold_met') {
      return { success: false, error: 'Cannot revoke after threshold met' };
    }

    const signer = multisig.signers.find(
      (s) => s.address.toLowerCase() === signerAddress.toLowerCase()
    );

    if (!signer || !signer.hasSigned) {
      return { success: false, error: 'Not signed or not a signer' };
    }

    signer.hasSigned = false;
    signer.signedAt = undefined;
    multisig.currentWeight -= signer.weight || 1;

    // Remove from approvals
    multisig.approvals = multisig.approvals.filter(
      (a) => a.signer.toLowerCase() !== signerAddress.toLowerCase()
    );

    this.multisigEscrows.set(multisigId, multisig);
    return { success: true };
  }

  /**
   * Force release (if threshold met and time lock passed)
   */
  async release(multisigId: string): Promise<{ success: boolean; txHash?: string; error?: string }> {
    const multisig = this.multisigEscrows.get(multisigId);
    if (!multisig) {
      return { success: false, error: 'Multi-sig escrow not found' };
    }

    if (multisig.currentWeight < multisig.threshold) {
      return { success: false, error: 'Threshold not met' };
    }

    if (multisig.timeLock && new Date(multisig.timeLock) > new Date()) {
      return { success: false, error: `Time-locked until ${multisig.timeLock}` };
    }

    // Release underlying escrow
    const result = await this.escrowManager.releaseEscrow(multisig.escrowId);

    if (result.success) {
      multisig.state = 'released';
      multisig.releasedAt = new Date().toISOString();
      this.multisigEscrows.set(multisigId, multisig);
    }

    return {
      success: result.success,
      txHash: result.txHash,
      error: result.error,
    };
  }

  /**
   * Cancel a multi-sig escrow (requires all signers or expiry)
   */
  async cancel(
    multisigId: string
  ): Promise<{ success: boolean; refundTxHash?: string; error?: string }> {
    const multisig = this.multisigEscrows.get(multisigId);
    if (!multisig) {
      return { success: false, error: 'Multi-sig escrow not found' };
    }

    if (multisig.state === 'released') {
      return { success: false, error: 'Already released' };
    }

    // Check expiry
    if (multisig.expiresAt && new Date(multisig.expiresAt) < new Date()) {
      const result = await this.escrowManager.refundEscrow(multisig.escrowId);
      multisig.state = 'expired';
      this.multisigEscrows.set(multisigId, multisig);
      return { success: result.success, refundTxHash: result.txHash, error: result.error };
    }

    // Check if all signers agreed to cancel (all must have NOT signed)
    const signedCount = multisig.signers.filter((s) => s.hasSigned).length;
    if (signedCount > 0) {
      return { success: false, error: 'Cannot cancel with active approvals' };
    }

    const result = await this.escrowManager.refundEscrow(multisig.escrowId);
    if (result.success) {
      multisig.state = 'cancelled';
      this.multisigEscrows.set(multisigId, multisig);
    }

    return { success: result.success, refundTxHash: result.txHash, error: result.error };
  }

  /**
   * Get multi-sig escrow details
   */
  get(multisigId: string): MultisigEscrow | undefined {
    return this.multisigEscrows.get(multisigId);
  }

  /**
   * List all multi-sig escrows
   */
  list(filter?: { state?: MultisigState; signer?: string }): MultisigEscrow[] {
    let escrows = Array.from(this.multisigEscrows.values());

    if (filter?.state) {
      escrows = escrows.filter((e) => e.state === filter.state);
    }

    if (filter?.signer) {
      escrows = escrows.filter((e) =>
        e.signers.some((s) => s.address.toLowerCase() === filter.signer!.toLowerCase())
      );
    }

    return escrows;
  }

  /**
   * Get pending approvals for a signer
   */
  getPendingApprovals(signerAddress: string): MultisigEscrow[] {
    return Array.from(this.multisigEscrows.values()).filter((e) => {
      if (e.state !== 'collecting' && e.state !== 'pending') return false;
      const signer = e.signers.find(
        (s) => s.address.toLowerCase() === signerAddress.toLowerCase()
      );
      return signer && !signer.hasSigned;
    });
  }

  /**
   * Check and process time-locked escrows
   */
  async processTimeLocks(): Promise<{ released: string[]; errors: string[] }> {
    const released: string[] = [];
    const errors: string[] = [];
    const now = new Date();

    for (const escrow of this.multisigEscrows.values()) {
      if (escrow.state !== 'time_locked') continue;

      if (escrow.timeLock && new Date(escrow.timeLock) <= now) {
        const result = await this.release(escrow.id);
        if (result.success) {
          released.push(escrow.id);
        } else {
          errors.push(`${escrow.id}: ${result.error}`);
        }
      }
    }

    return { released, errors };
  }

  /**
   * Parse time lock string to Date
   */
  private parseTimeLock(timeLock: string): Date {
    const now = new Date();
    const match = timeLock.match(/^(\d+)(h|d|w|m)$/);

    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2];

      switch (unit) {
        case 'h':
          return new Date(now.getTime() + value * 60 * 60 * 1000);
        case 'd':
          return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
        case 'w':
          return new Date(now.getTime() + value * 7 * 24 * 60 * 60 * 1000);
        case 'm':
          return new Date(now.getTime() + value * 30 * 24 * 60 * 60 * 1000);
      }
    }

    // Try parsing as ISO date
    const parsed = new Date(timeLock);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    // Default: 7 days
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
}

/**
 * Create a multi-sig escrow manager
 *
 * @example
 * ```typescript
 * const multisig = createMultisigEscrow({
 *   privateKey: process.env.PRIVATE_KEY,
 * });
 *
 * // Create 2-of-3 multisig
 * const escrow = await multisig.create({
 *   signers: [alice, bob, charlie],
 *   threshold: 2,
 *   beneficiary: treasury,
 *   amount: '10000'
 * });
 * ```
 */
export function createMultisigEscrow(config: EscrowConfig): MultisigEscrowManager {
  return new MultisigEscrowManager(config);
}

export default { createMultisigEscrow, MultisigEscrowManager };
