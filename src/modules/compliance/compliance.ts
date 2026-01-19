/**
 * Compliance Module - KYC/AML/Sanctions Screening
 *
 * Circle Compliance Engine-style transaction screening.
 */

import type {
  ComplianceConfig,
  ComplianceProfile,
  CheckResult,
  ComplianceFlag,
  SanctionsCheckResult,
  TransactionScreeningRequest,
  TransactionScreeningResult,
  TravelRuleData,
  ComplianceReport,
  WhitelistEntry,
  BlacklistEntry,
  VelocityCheckResult,
  PatternDetectionResult,
  RiskLevel,
  KYCStatus,
} from './types';

// Known sanctioned addresses (OFAC SDN list examples - these are for demonstration)
const KNOWN_SANCTIONED: Set<string> = new Set([
  '0x8589427373d6d84e98730d7795d8f6f8731fda16', // Tornado Cash
  '0x722122df12d4e14e13ac3b6895a86e84145b6967', // Tornado Cash
  '0xdd4c48c0b24039969fc16d1cdf626eab821d3384', // Tornado Cash
]);

// High-risk jurisdictions
const HIGH_RISK_JURISDICTIONS = ['KP', 'IR', 'SY', 'CU', 'RU', 'BY'];

/**
 * Compliance Module for transaction screening
 */
export class ComplianceModule {
  private config: ComplianceConfig;
  private profiles: Map<string, ComplianceProfile> = new Map();
  private whitelist: Map<string, WhitelistEntry> = new Map();
  private blacklist: Map<string, BlacklistEntry> = new Map();
  private transactionHistory: Map<string, Array<{ amount: string; timestamp: string }>> = new Map();

  constructor(config: ComplianceConfig = {}) {
    this.config = {
      autoScreen: true,
      blockedJurisdictions: HIGH_RISK_JURISDICTIONS,
      thresholds: {
        singleTransaction: '10000',
        dailyVolume: '50000',
        monthlyVolume: '200000',
      },
      ...config,
    };

    // Initialize blacklist with known sanctioned addresses
    for (const addr of KNOWN_SANCTIONED) {
      this.blacklist.set(addr.toLowerCase(), {
        address: addr,
        reason: 'OFAC Sanctioned Address',
        source: 'ofac',
        addedAt: new Date().toISOString(),
        isPermanent: true,
      });
    }
  }

  /**
   * Screen a transaction before execution
   *
   * @param request - Transaction screening request
   * @returns Screening result
   */
  async screenTransaction(request: TransactionScreeningRequest): Promise<TransactionScreeningResult> {
    const requestId = `txscr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const flags: ComplianceFlag[] = [];
    const reasons: string[] = [];
    let riskScore = 0;
    let allowed = true;

    // Check sender
    const senderResult = await this.checkAddress(request.from);
    if (!senderResult.isApproved) {
      allowed = false;
      reasons.push(`Sender address blocked: ${senderResult.flags.map((f) => f.description).join(', ')}`);
      flags.push(...senderResult.flags);
    }
    riskScore += senderResult.riskScore * 0.4;

    // Check recipient
    const recipientResult = await this.checkAddress(request.to);
    if (!recipientResult.isApproved) {
      allowed = false;
      reasons.push(`Recipient address blocked: ${recipientResult.flags.map((f) => f.description).join(', ')}`);
      flags.push(...recipientResult.flags);
    }
    riskScore += recipientResult.riskScore * 0.4;

    // Check amount thresholds
    const amount = parseFloat(request.amount);
    const singleThreshold = parseFloat(this.config.thresholds?.singleTransaction || '10000');

    if (amount >= singleThreshold) {
      const flag: ComplianceFlag = {
        id: `flag_${Date.now()}`,
        type: 'suspicious_activity',
        severity: 'medium',
        description: `Large transaction: ${request.amount} ${request.currency}`,
        createdAt: new Date().toISOString(),
        isActive: true,
      };
      flags.push(flag);
      riskScore += 20;
    }

    // Velocity check
    const velocityResult = await this.checkVelocity(request.from, '24h');
    if (velocityResult.exceedsThreshold) {
      const flag: ComplianceFlag = {
        id: `flag_${Date.now()}_vel`,
        type: 'velocity',
        severity: 'medium',
        description: `High transaction velocity: ${velocityResult.transactionCount} txs, ${velocityResult.totalVolume} volume in 24h`,
        createdAt: new Date().toISOString(),
        isActive: true,
      };
      flags.push(flag);
      riskScore += 15;
    }

    // Determine risk level
    const riskLevel = this.calculateRiskLevel(riskScore);

    // Record transaction for velocity tracking
    this.recordTransaction(request.from, request.amount);
    this.recordTransaction(request.to, request.amount);

    // Notify via webhook if high risk
    if (riskLevel === 'high' || riskLevel === 'critical') {
      this.notifyWebhook({
        type: 'high_risk_transaction',
        requestId,
        request,
        riskLevel,
        riskScore,
        flags,
      });
    }

    return {
      requestId,
      allowed,
      riskLevel,
      riskScore: Math.round(riskScore),
      reasons: reasons.length > 0 ? reasons : undefined,
      flags,
      screenedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 300000).toISOString(), // 5 min cache
    };
  }

  /**
   * Check an address for compliance
   *
   * @param address - Address to check
   * @returns Compliance profile
   */
  async checkAddress(address: string): Promise<ComplianceProfile> {
    const normalizedAddress = address.toLowerCase();

    // Check cache
    const cached = this.profiles.get(normalizedAddress);
    if (cached && new Date(cached.lastChecked) > new Date(Date.now() - 3600000)) {
      return cached;
    }

    // Check whitelist
    if (this.whitelist.has(normalizedAddress)) {
      const entry = this.whitelist.get(normalizedAddress)!;
      if (!entry.expiresAt || new Date(entry.expiresAt) > new Date()) {
        return this.createProfile(normalizedAddress, 'approved', 'low', 10, []);
      }
    }

    // Check blacklist
    if (this.blacklist.has(normalizedAddress)) {
      const entry = this.blacklist.get(normalizedAddress)!;
      const flag: ComplianceFlag = {
        id: `flag_bl_${Date.now()}`,
        type: 'sanction',
        severity: 'critical',
        description: entry.reason,
        createdAt: new Date().toISOString(),
        isActive: true,
      };
      return this.createProfile(normalizedAddress, 'rejected', 'critical', 100, [flag], false);
    }

    // Run sanctions check
    const sanctionsResult = await this.checkSanctions(address);
    if (sanctionsResult.isSanctioned) {
      const flag: ComplianceFlag = {
        id: `flag_sanc_${Date.now()}`,
        type: 'sanction',
        severity: 'critical',
        description: `Sanctioned address: ${sanctionsResult.matchedLists?.join(', ')}`,
        createdAt: new Date().toISOString(),
        isActive: true,
      };
      return this.createProfile(normalizedAddress, 'rejected', 'critical', 100, [flag], false);
    }

    // Run additional checks if provider is configured
    const checks: CheckResult[] = [];
    let riskScore = 0;
    const flags: ComplianceFlag[] = [];

    // Basic checks
    checks.push({
      type: 'sanctions',
      status: 'pass',
      riskLevel: 'low',
      checkedAt: new Date().toISOString(),
    });

    // Check for known contract patterns (mixers, etc.)
    const contractRisk = await this.checkContractRisk(address);
    if (contractRisk > 0) {
      riskScore += contractRisk;
      if (contractRisk >= 50) {
        flags.push({
          id: `flag_contract_${Date.now()}`,
          type: 'suspicious_activity',
          severity: contractRisk >= 80 ? 'critical' : 'high',
          description: 'Interaction with high-risk contract pattern',
          createdAt: new Date().toISOString(),
          isActive: true,
        });
      }
    }

    const riskLevel = this.calculateRiskLevel(riskScore);
    const kycStatus: KYCStatus = riskLevel === 'critical' ? 'rejected' : 'approved';
    const isApproved = riskLevel !== 'critical';

    const profile = this.createProfile(normalizedAddress, kycStatus, riskLevel, riskScore, flags, isApproved);
    profile.checks = checks;
    this.profiles.set(normalizedAddress, profile);

    return profile;
  }

  /**
   * Check address against sanctions lists
   *
   * @param address - Address to check
   * @returns Sanctions check result
   */
  async checkSanctions(address: string): Promise<SanctionsCheckResult> {
    const normalizedAddress = address.toLowerCase();

    // Check local list
    if (KNOWN_SANCTIONED.has(normalizedAddress)) {
      return {
        isSanctioned: true,
        matchScore: 100,
        matchedLists: ['OFAC SDN'],
        matchDetails: [
          {
            listName: 'OFAC SDN',
            entityName: 'Sanctioned Address',
            matchType: 'exact',
            confidence: 100,
          },
        ],
        checkedAt: new Date().toISOString(),
      };
    }

    // Check blacklist
    if (this.blacklist.has(normalizedAddress)) {
      const entry = this.blacklist.get(normalizedAddress)!;
      return {
        isSanctioned: true,
        matchScore: 100,
        matchedLists: [entry.source.toUpperCase()],
        checkedAt: new Date().toISOString(),
      };
    }

    // External API check would go here
    if (this.config.providerUrl && this.config.apiKey) {
      try {
        const response = await fetch(`${this.config.providerUrl}/sanctions/check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({ address }),
        });

        if (response.ok) {
          return (await response.json()) as SanctionsCheckResult;
        }
      } catch {
        // Fall through to default
      }
    }

    return {
      isSanctioned: false,
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * Check transaction velocity
   *
   * @param address - Address to check
   * @param period - Time period
   * @returns Velocity check result
   */
  async checkVelocity(
    address: string,
    period: '1h' | '24h' | '7d' | '30d'
  ): Promise<VelocityCheckResult> {
    const normalizedAddress = address.toLowerCase();
    const history = this.transactionHistory.get(normalizedAddress) || [];

    const periodMs = {
      '1h': 3600000,
      '24h': 86400000,
      '7d': 604800000,
      '30d': 2592000000,
    }[period];

    const cutoff = new Date(Date.now() - periodMs);
    const recentTxs = history.filter((tx) => new Date(tx.timestamp) > cutoff);

    const totalVolume = recentTxs.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
    const uniqueCounterparties = new Set(recentTxs.map((tx) => tx.amount)).size; // Simplified

    const thresholds = {
      '1h': parseFloat(this.config.thresholds?.dailyVolume || '50000') / 24,
      '24h': parseFloat(this.config.thresholds?.dailyVolume || '50000'),
      '7d': parseFloat(this.config.thresholds?.dailyVolume || '50000') * 7,
      '30d': parseFloat(this.config.thresholds?.monthlyVolume || '200000'),
    };

    const threshold = thresholds[period];
    const exceedsThreshold = totalVolume > threshold;

    return {
      address: normalizedAddress,
      period,
      transactionCount: recentTxs.length,
      totalVolume: totalVolume.toFixed(2),
      exceedsThreshold,
      thresholdExceeded: exceedsThreshold ? threshold.toString() : undefined,
      uniqueCounterparties,
    };
  }

  /**
   * Detect suspicious patterns
   *
   * @param addresses - Addresses to analyze
   * @returns Pattern detection results
   */
  async detectPatterns(addresses: string[]): Promise<PatternDetectionResult[]> {
    const results: PatternDetectionResult[] = [];

    for (const address of addresses) {
      const normalizedAddress = address.toLowerCase();
      const history = this.transactionHistory.get(normalizedAddress) || [];

      // Check for structuring (many transactions just under threshold)
      const threshold = parseFloat(this.config.thresholds?.singleTransaction || '10000');
      const suspiciousTxs = history.filter((tx) => {
        const amount = parseFloat(tx.amount);
        return amount >= threshold * 0.8 && amount < threshold;
      });

      if (suspiciousTxs.length >= 3) {
        results.push({
          patternType: 'structuring',
          confidence: Math.min(90, suspiciousTxs.length * 20),
          riskLevel: 'high',
          description: `Possible structuring detected: ${suspiciousTxs.length} transactions just under threshold`,
          involvedAddresses: [address],
          involvedTransactions: [],
          detectedAt: new Date().toISOString(),
        });
      }

      // Check for rapid movement
      const recentTxs = history.filter(
        (tx) => new Date(tx.timestamp) > new Date(Date.now() - 3600000)
      );
      if (recentTxs.length >= 5) {
        results.push({
          patternType: 'rapid_movement',
          confidence: Math.min(80, recentTxs.length * 15),
          riskLevel: 'medium',
          description: `Rapid transaction activity: ${recentTxs.length} transactions in 1 hour`,
          involvedAddresses: [address],
          involvedTransactions: [],
          detectedAt: new Date().toISOString(),
        });
      }
    }

    return results;
  }

  /**
   * Add address to whitelist
   *
   * @param address - Address to whitelist
   * @param addedBy - Who added it
   * @param options - Options
   */
  addToWhitelist(
    address: string,
    addedBy: string,
    options?: { label?: string; expiresAt?: string; notes?: string }
  ): WhitelistEntry {
    const entry: WhitelistEntry = {
      address: address.toLowerCase(),
      label: options?.label,
      addedBy,
      addedAt: new Date().toISOString(),
      expiresAt: options?.expiresAt,
      notes: options?.notes,
    };

    this.whitelist.set(address.toLowerCase(), entry);

    // Remove from blacklist if present
    this.blacklist.delete(address.toLowerCase());

    // Update profile
    const profile = this.profiles.get(address.toLowerCase());
    if (profile) {
      profile.kycStatus = 'approved';
      profile.isApproved = true;
      profile.riskLevel = 'low';
      profile.riskScore = 10;
    }

    return entry;
  }

  /**
   * Add address to blacklist
   *
   * @param address - Address to blacklist
   * @param reason - Reason for blacklisting
   * @param options - Options
   */
  addToBlacklist(
    address: string,
    reason: string,
    options?: { source?: BlacklistEntry['source']; isPermanent?: boolean; expiresAt?: string }
  ): BlacklistEntry {
    const entry: BlacklistEntry = {
      address: address.toLowerCase(),
      reason,
      source: options?.source || 'internal',
      addedAt: new Date().toISOString(),
      isPermanent: options?.isPermanent ?? false,
      expiresAt: options?.expiresAt,
    };

    this.blacklist.set(address.toLowerCase(), entry);

    // Remove from whitelist if present
    this.whitelist.delete(address.toLowerCase());

    // Update profile
    const profile = this.profiles.get(address.toLowerCase());
    if (profile) {
      profile.kycStatus = 'rejected';
      profile.isApproved = false;
      profile.riskLevel = 'critical';
      profile.riskScore = 100;
    }

    return entry;
  }

  /**
   * Remove address from whitelist
   *
   * @param address - Address to remove
   */
  removeFromWhitelist(address: string): void {
    this.whitelist.delete(address.toLowerCase());
  }

  /**
   * Remove address from blacklist
   *
   * @param address - Address to remove
   */
  removeFromBlacklist(address: string): void {
    const entry = this.blacklist.get(address.toLowerCase());
    if (entry?.isPermanent) {
      throw new Error('Cannot remove permanent blacklist entry');
    }
    this.blacklist.delete(address.toLowerCase());
  }

  /**
   * Generate compliance report
   *
   * @param startDate - Report start date
   * @param endDate - Report end date
   * @param type - Report type
   * @returns Compliance report
   */
  generateReport(
    startDate: string,
    endDate: string,
    type: ComplianceReport['type'] = 'summary'
  ): ComplianceReport {
    const profiles = Array.from(this.profiles.values());
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Calculate statistics
    let totalTransactions = 0;
    let totalVolume = 0;
    let flaggedTransactions = 0;
    let blockedTransactions = 0;

    for (const history of this.transactionHistory.values()) {
      const periodTxs = history.filter((tx) => {
        const date = new Date(tx.timestamp);
        return date >= start && date <= end;
      });
      totalTransactions += periodTxs.length;
      totalVolume += periodTxs.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
    }

    const highRiskAddresses = profiles.filter(
      (p) => p.riskLevel === 'high' || p.riskLevel === 'critical'
    ).length;

    // Collect flagged items
    const flagsByType = new Map<string, string[]>();
    for (const profile of profiles) {
      for (const flag of profile.flags) {
        if (!flag.isActive) continue;
        const existing = flagsByType.get(flag.type) || [];
        existing.push(flag.description);
        flagsByType.set(flag.type, existing);
      }
    }

    const flaggedItems = Array.from(flagsByType.entries()).map(([type, details]) => ({
      type,
      count: details.length,
      details,
    }));

    return {
      id: `report_${Date.now()}`,
      type,
      periodStart: startDate,
      periodEnd: endDate,
      stats: {
        totalTransactions,
        totalVolume: totalVolume.toFixed(2),
        flaggedTransactions,
        blockedTransactions,
        highRiskAddresses,
      },
      flaggedItems,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Prepare travel rule data
   *
   * @param data - Travel rule data
   * @returns Formatted travel rule data
   */
  prepareTravelRuleData(data: Partial<TravelRuleData>): TravelRuleData {
    return {
      originator: {
        address: data.originator?.address || '',
        name: data.originator?.name,
        accountNumber: data.originator?.accountNumber,
        institutionName: data.originator?.institutionName,
        institutionAddress: data.originator?.institutionAddress,
      },
      beneficiary: {
        address: data.beneficiary?.address || '',
        name: data.beneficiary?.name,
        accountNumber: data.beneficiary?.accountNumber,
        institutionName: data.beneficiary?.institutionName,
        institutionAddress: data.beneficiary?.institutionAddress,
      },
      transactionRef: data.transactionRef || `tr_${Date.now()}`,
      amount: data.amount || '0',
      currency: data.currency || 'USDC',
    };
  }

  /**
   * Get profile for address
   *
   * @param address - Address
   * @returns Profile or undefined
   */
  getProfile(address: string): ComplianceProfile | undefined {
    return this.profiles.get(address.toLowerCase());
  }

  /**
   * Get all flagged profiles
   *
   * @returns Flagged profiles
   */
  getFlaggedProfiles(): ComplianceProfile[] {
    return Array.from(this.profiles.values()).filter((p) => p.flags.some((f) => f.isActive));
  }

  /**
   * Get whitelist
   *
   * @returns Whitelist entries
   */
  getWhitelist(): WhitelistEntry[] {
    return Array.from(this.whitelist.values());
  }

  /**
   * Get blacklist
   *
   * @returns Blacklist entries
   */
  getBlacklist(): BlacklistEntry[] {
    return Array.from(this.blacklist.values());
  }

  // Private methods

  private createProfile(
    address: string,
    kycStatus: KYCStatus,
    riskLevel: RiskLevel,
    riskScore: number,
    flags: ComplianceFlag[],
    isApproved: boolean = true
  ): ComplianceProfile {
    return {
      address,
      kycStatus,
      riskLevel,
      riskScore,
      lastChecked: new Date().toISOString(),
      checks: [],
      flags,
      isApproved,
    };
  }

  private calculateRiskLevel(score: number): RiskLevel {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  private async checkContractRisk(_address: string): Promise<number> {
    // In production, this would check on-chain data for:
    // - Contract interactions with known mixers
    // - Unusual contract patterns
    // - Flash loan patterns
    // For now, return 0
    return 0;
  }

  private recordTransaction(address: string, amount: string): void {
    const normalizedAddress = address.toLowerCase();
    const history = this.transactionHistory.get(normalizedAddress) || [];
    history.push({
      amount,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 1000 transactions per address
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }

    this.transactionHistory.set(normalizedAddress, history);
  }

  private notifyWebhook(data: Record<string, unknown>): void {
    if (!this.config.webhookUrl) return;

    fetch(this.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {
      // Ignore webhook errors
    });
  }
}

/**
 * Create a compliance module instance
 *
 * @param config - Compliance configuration
 * @returns ComplianceModule instance
 *
 * @example
 * ```typescript
 * const compliance = createComplianceModule({
 *   autoScreen: true,
 *   thresholds: {
 *     singleTransaction: '10000',
 *     dailyVolume: '50000',
 *   }
 * });
 *
 * // Screen a transaction
 * const result = await compliance.screenTransaction({
 *   from: '0x...',
 *   to: '0x...',
 *   amount: '5000',
 *   currency: 'USDC',
 * });
 *
 * if (result.allowed) {
 *   // Proceed with transaction
 * } else {
 *   console.log('Blocked:', result.reasons);
 * }
 *
 * // Check address
 * const profile = await compliance.checkAddress('0x...');
 * console.log('Risk level:', profile.riskLevel);
 *
 * // Manage lists
 * compliance.addToWhitelist('0x...', 'admin');
 * compliance.addToBlacklist('0x...', 'Suspicious activity');
 * ```
 */
export function createComplianceModule(config?: ComplianceConfig): ComplianceModule {
  return new ComplianceModule(config);
}
