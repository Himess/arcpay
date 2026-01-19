/**
 * Compliance Module - KYC/AML/Sanctions Screening
 *
 * Circle Compliance Engine-style transaction screening for:
 * - Sanctions list checking (OFAC, EU, UN)
 * - Transaction monitoring
 * - Velocity limits
 * - Pattern detection
 * - Travel rule data
 *
 * @example
 * ```typescript
 * import { createComplianceModule } from 'arcpay';
 *
 * const compliance = createComplianceModule({
 *   thresholds: {
 *     singleTransaction: '10000',
 *     dailyVolume: '50000',
 *   }
 * });
 *
 * // Screen transaction before execution
 * const result = await compliance.screenTransaction({
 *   from: sender,
 *   to: recipient,
 *   amount: '5000',
 *   currency: 'USDC',
 * });
 *
 * if (!result.allowed) {
 *   console.log('Transaction blocked:', result.reasons);
 *   return;
 * }
 *
 * // Check specific address
 * const profile = await compliance.checkAddress(address);
 * if (profile.riskLevel === 'critical') {
 *   // Block address
 * }
 *
 * // Sanctions check
 * const sanctions = await compliance.checkSanctions(address);
 * if (sanctions.isSanctioned) {
 *   compliance.addToBlacklist(address, 'Sanctioned', { source: 'ofac' });
 * }
 *
 * // Generate report
 * const report = compliance.generateReport('2024-01-01', '2024-01-31');
 * ```
 */

export * from './types';
export { ComplianceModule, createComplianceModule } from './compliance';
