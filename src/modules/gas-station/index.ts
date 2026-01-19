/**
 * Gas Station Module - Circle-style gas sponsorship
 *
 * Enables gasless transactions by sponsoring user gas fees.
 *
 * @example
 * ```typescript
 * import { createGasStation } from 'arcpay';
 *
 * const station = createGasStation({
 *   privateKey: process.env.SPONSOR_KEY,
 * });
 *
 * // Sponsor a user transaction
 * const result = await station.sponsor({
 *   userAddress: '0x...',
 *   to: '0x...contract',
 *   data: '0x...calldata',
 *   estimatedGas: '100000',
 * });
 *
 * // Check user eligibility
 * const eligibility = station.checkEligibility('0x...');
 * console.log('Remaining gas:', eligibility.remainingGas);
 *
 * // Get station stats
 * const stats = station.getStats();
 * console.log('Sponsored today:', stats.gasToday);
 * ```
 */

export * from './types';
export { GasStation, createGasStation } from './station';
