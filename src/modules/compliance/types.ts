/**
 * Compliance Types - KYC/AML/Sanctions Screening
 */

/**
 * KYC status
 */
export type KYCStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'expired';

/**
 * Risk level
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Compliance check type
 */
export type CheckType = 'sanctions' | 'pep' | 'adverse_media' | 'kyc' | 'aml' | 'transaction';

/**
 * Compliance module configuration
 */
export interface ComplianceConfig {
  /** API key for compliance provider */
  apiKey?: string;
  /** Provider URL */
  providerUrl?: string;
  /** Enable automatic screening */
  autoScreen?: boolean;
  /** Blocked jurisdictions */
  blockedJurisdictions?: string[];
  /** Transaction monitoring thresholds */
  thresholds?: {
    /** Single transaction threshold for enhanced review */
    singleTransaction?: string;
    /** Daily volume threshold */
    dailyVolume?: string;
    /** Monthly volume threshold */
    monthlyVolume?: string;
  };
  /** Webhook for alerts */
  webhookUrl?: string;
}

/**
 * User/address profile for compliance
 */
export interface ComplianceProfile {
  /** Address */
  address: string;
  /** KYC status */
  kycStatus: KYCStatus;
  /** Risk level */
  riskLevel: RiskLevel;
  /** Risk score (0-100) */
  riskScore: number;
  /** Last check timestamp */
  lastChecked: string;
  /** Check results */
  checks: CheckResult[];
  /** Flags/alerts */
  flags: ComplianceFlag[];
  /** Whether address is approved for transactions */
  isApproved: boolean;
  /** Notes */
  notes?: string;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Check result
 */
export interface CheckResult {
  /** Check type */
  type: CheckType;
  /** Result status */
  status: 'pass' | 'fail' | 'review' | 'error';
  /** Risk level from this check */
  riskLevel: RiskLevel;
  /** Details */
  details?: string;
  /** Source of check */
  source?: string;
  /** Timestamp */
  checkedAt: string;
  /** Expiry timestamp */
  expiresAt?: string;
  /** Raw response data */
  rawData?: Record<string, unknown>;
}

/**
 * Compliance flag/alert
 */
export interface ComplianceFlag {
  /** Flag ID */
  id: string;
  /** Flag type */
  type: 'sanction' | 'pep' | 'adverse_media' | 'suspicious_activity' | 'high_risk_jurisdiction' | 'velocity' | 'pattern';
  /** Severity */
  severity: RiskLevel;
  /** Description */
  description: string;
  /** Created timestamp */
  createdAt: string;
  /** Resolved timestamp */
  resolvedAt?: string;
  /** Is active */
  isActive: boolean;
  /** Action taken */
  actionTaken?: string;
}

/**
 * Sanctions check result
 */
export interface SanctionsCheckResult {
  /** Whether address is sanctioned */
  isSanctioned: boolean;
  /** Match percentage (0-100) */
  matchScore?: number;
  /** Lists matched */
  matchedLists?: string[];
  /** Match details */
  matchDetails?: Array<{
    listName: string;
    entityName: string;
    matchType: 'exact' | 'fuzzy' | 'alias';
    confidence: number;
  }>;
  /** Check timestamp */
  checkedAt: string;
}

/**
 * Transaction screening request
 */
export interface TransactionScreeningRequest {
  /** Sender address */
  from: string;
  /** Recipient address */
  to: string;
  /** Amount */
  amount: string;
  /** Currency */
  currency: string;
  /** Transaction type */
  type?: 'transfer' | 'swap' | 'bridge' | 'stream';
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Transaction screening result
 */
export interface TransactionScreeningResult {
  /** Request ID */
  requestId: string;
  /** Whether transaction is allowed */
  allowed: boolean;
  /** Risk level */
  riskLevel: RiskLevel;
  /** Risk score (0-100) */
  riskScore: number;
  /** Reasons if blocked */
  reasons?: string[];
  /** Required actions */
  requiredActions?: string[];
  /** Flags triggered */
  flags: ComplianceFlag[];
  /** Screening timestamp */
  screenedAt: string;
  /** Expiry (cached result) */
  expiresAt?: string;
}

/**
 * Travel rule data
 */
export interface TravelRuleData {
  /** Originator info */
  originator: {
    name?: string;
    address: string;
    accountNumber?: string;
    institutionName?: string;
    institutionAddress?: string;
  };
  /** Beneficiary info */
  beneficiary: {
    name?: string;
    address: string;
    accountNumber?: string;
    institutionName?: string;
    institutionAddress?: string;
  };
  /** Transaction reference */
  transactionRef: string;
  /** Amount */
  amount: string;
  /** Currency */
  currency: string;
}

/**
 * Compliance report
 */
export interface ComplianceReport {
  /** Report ID */
  id: string;
  /** Report type */
  type: 'sar' | 'ctr' | 'summary' | 'audit';
  /** Period start */
  periodStart: string;
  /** Period end */
  periodEnd: string;
  /** Statistics */
  stats: {
    totalTransactions: number;
    totalVolume: string;
    flaggedTransactions: number;
    blockedTransactions: number;
    highRiskAddresses: number;
  };
  /** Flagged items */
  flaggedItems: Array<{
    type: string;
    count: number;
    details: string[];
  }>;
  /** Generated at */
  generatedAt: string;
}

/**
 * Whitelist entry
 */
export interface WhitelistEntry {
  /** Address */
  address: string;
  /** Label */
  label?: string;
  /** Added by */
  addedBy: string;
  /** Added at */
  addedAt: string;
  /** Expires at */
  expiresAt?: string;
  /** Notes */
  notes?: string;
}

/**
 * Blacklist entry
 */
export interface BlacklistEntry {
  /** Address */
  address: string;
  /** Reason */
  reason: string;
  /** Source */
  source: 'internal' | 'ofac' | 'eu' | 'un' | 'provider';
  /** Added at */
  addedAt: string;
  /** Is permanent */
  isPermanent: boolean;
  /** Expires at */
  expiresAt?: string;
}

/**
 * Velocity check result
 */
export interface VelocityCheckResult {
  /** Address */
  address: string;
  /** Period */
  period: '1h' | '24h' | '7d' | '30d';
  /** Transaction count */
  transactionCount: number;
  /** Total volume */
  totalVolume: string;
  /** Exceeds threshold */
  exceedsThreshold: boolean;
  /** Threshold exceeded */
  thresholdExceeded?: string;
  /** Unique counterparties */
  uniqueCounterparties: number;
}

/**
 * Pattern detection result
 */
export interface PatternDetectionResult {
  /** Pattern type */
  patternType: 'structuring' | 'layering' | 'round_tripping' | 'rapid_movement' | 'fan_out' | 'fan_in';
  /** Confidence score (0-100) */
  confidence: number;
  /** Risk level */
  riskLevel: RiskLevel;
  /** Description */
  description: string;
  /** Involved addresses */
  involvedAddresses: string[];
  /** Involved transactions */
  involvedTransactions: string[];
  /** Detected at */
  detectedAt: string;
}
