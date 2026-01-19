/**
 * Escrow Types - Multi-party Conditional Payments
 */

/**
 * Escrow state
 */
export type EscrowState =
  | 'created'
  | 'funded'
  | 'active'
  | 'releasing'
  | 'released'
  | 'disputed'
  | 'refunded'
  | 'expired'
  | 'resolved';

/**
 * Release condition type
 */
export type ConditionType =
  | 'time'
  | 'multisig'
  | 'oracle'
  | 'manual'
  | 'milestone'
  | 'delivery'
  | 'approval';

/**
 * Escrow configuration
 */
export interface EscrowConfig {
  /** Wallet private key */
  privateKey: string;
  /** Escrow contract address (optional) */
  escrowContract?: string;
  /** Default dispute resolution period (seconds) */
  disputePeriod?: number;
  /** Default expiry period (seconds) */
  expiryPeriod?: number;
  /** Fee percentage (basis points) */
  feePercentage?: number;
  /** Custom RPC URL */
  rpcUrl?: string;
}

/**
 * Create escrow parameters
 */
export interface CreateEscrowParams {
  /** Depositor address */
  depositor: string;
  /** Beneficiary address */
  beneficiary: string;
  /** Escrow amount */
  amount: string;
  /** Release conditions */
  conditions: ReleaseCondition[];
  /** Arbitrators (for disputes) */
  arbitrators?: string[];
  /** Expiry timestamp */
  expiresAt?: string;
  /** Description */
  description?: string;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Release condition
 */
export interface ReleaseCondition {
  /** Condition type */
  type: ConditionType;
  /** Condition parameters */
  params: ConditionParams;
  /** Whether condition is met */
  isMet: boolean;
  /** Met timestamp */
  metAt?: string;
  /** Evidence */
  evidence?: string;
}

/**
 * Condition parameters
 */
export interface ConditionParams {
  /** For time conditions: release after timestamp */
  releaseAfter?: string;
  /** For multisig: required signatures */
  requiredSignatures?: number;
  /** For multisig: signers */
  signers?: string[];
  /** For oracle: oracle address */
  oracleAddress?: string;
  /** For oracle: expected value */
  oracleValue?: string;
  /** For milestone: milestone ID */
  milestoneId?: string;
  /** For milestone: milestone description */
  milestoneDescription?: string;
  /** For approval: approver address */
  approver?: string;
  /** For delivery: delivery proof required */
  deliveryProofRequired?: boolean;
}

/**
 * Escrow details
 */
export interface Escrow {
  /** Escrow ID */
  id: string;
  /** Depositor address */
  depositor: string;
  /** Beneficiary address */
  beneficiary: string;
  /** Amount */
  amount: string;
  /** Current state */
  state: EscrowState;
  /** Release conditions */
  conditions: ReleaseCondition[];
  /** Arbitrators */
  arbitrators: string[];
  /** Created timestamp */
  createdAt: string;
  /** Funded timestamp */
  fundedAt?: string;
  /** Released timestamp */
  releasedAt?: string;
  /** Expires at */
  expiresAt?: string;
  /** Description */
  description?: string;
  /** On-chain address */
  escrowAddress?: string;
  /** Transaction hashes */
  transactions: EscrowTransaction[];
  /** Disputes */
  disputes: Dispute[];
  /** Fee amount */
  feeAmount?: string;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Escrow transaction
 */
export interface EscrowTransaction {
  /** Transaction type */
  type: 'create' | 'fund' | 'release' | 'refund' | 'dispute' | 'resolve';
  /** Transaction hash */
  txHash: string;
  /** Amount */
  amount: string;
  /** Timestamp */
  timestamp: string;
  /** From address */
  from: string;
  /** To address */
  to: string;
}

/**
 * Dispute
 */
export interface Dispute {
  /** Dispute ID */
  id: string;
  /** Raised by */
  raisedBy: string;
  /** Reason */
  reason: string;
  /** Evidence */
  evidence?: string[];
  /** Current state */
  state: 'open' | 'reviewing' | 'resolved';
  /** Resolution */
  resolution?: {
    decision: 'release' | 'refund' | 'split';
    splitRatio?: { depositor: number; beneficiary: number };
    decidedBy: string;
    reason: string;
  };
  /** Created timestamp */
  createdAt: string;
  /** Resolved timestamp */
  resolvedAt?: string;
}

/**
 * Milestone
 */
export interface Milestone {
  /** Milestone ID */
  id: string;
  /** Escrow ID */
  escrowId: string;
  /** Description */
  description: string;
  /** Amount for this milestone */
  amount: string;
  /** Due date */
  dueDate?: string;
  /** Status */
  status: 'pending' | 'submitted' | 'approved' | 'rejected' | 'completed';
  /** Completed timestamp */
  completedAt?: string;
  /** Submission */
  submission?: {
    evidence: string;
    submittedAt: string;
    notes?: string;
  };
  /** Approval */
  approval?: {
    approvedBy: string;
    approvedAt: string;
    notes?: string;
  };
}

/**
 * Multi-party escrow for group payments
 */
export interface MultiPartyEscrow {
  /** Escrow ID */
  id: string;
  /** All parties */
  parties: PartyInfo[];
  /** Total amount */
  totalAmount: string;
  /** Distribution rules */
  distribution: DistributionRule[];
  /** State */
  state: EscrowState;
  /** Required approvals for release */
  requiredApprovals: number;
  /** Current approvals */
  approvals: string[];
  /** Created timestamp */
  createdAt: string;
}

/**
 * Party information
 */
export interface PartyInfo {
  /** Party address */
  address: string;
  /** Role */
  role: 'depositor' | 'beneficiary' | 'arbitrator' | 'observer';
  /** Share percentage (for beneficiaries) */
  sharePercentage?: number;
  /** Has approved */
  hasApproved: boolean;
}

/**
 * Distribution rule
 */
export interface DistributionRule {
  /** Beneficiary address */
  beneficiary: string;
  /** Amount or percentage */
  amount?: string;
  /** Percentage (alternative to amount) */
  percentage?: number;
  /** Conditions for this distribution */
  conditions?: ReleaseCondition[];
}

/**
 * Escrow result
 */
export interface EscrowResult {
  /** Whether successful */
  success: boolean;
  /** Escrow ID */
  escrowId: string;
  /** Transaction hash */
  txHash?: string;
  /** New state */
  newState: EscrowState;
  /** Error message */
  error?: string;
}

/**
 * Fund escrow result
 */
export interface FundResult extends EscrowResult {
  /** Amount funded */
  amountFunded: string;
}

/**
 * Release result
 */
export interface ReleaseResult extends EscrowResult {
  /** Amount released */
  amountReleased: string;
  /** Fee deducted */
  feeDeducted?: string;
  /** Recipient */
  recipient: string;
}

/**
 * Refund result
 */
export interface RefundResult extends EscrowResult {
  /** Amount refunded */
  amountRefunded: string;
  /** Refund recipient */
  recipient: string;
}

/**
 * Escrow statistics
 */
export interface EscrowStats {
  /** Total escrows created */
  totalCreated: number;
  /** Currently active */
  activeCount: number;
  /** Total volume */
  totalVolume: string;
  /** Total released */
  totalReleased: string;
  /** Total refunded */
  totalRefunded: string;
  /** Dispute rate */
  disputeRate: number;
  /** Average escrow duration (seconds) */
  averageDuration: number;
}
