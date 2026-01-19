/**
 * Agent module tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyEngine } from '../src/modules/agent/policies';
import { TreasuryManager } from '../src/modules/agent/treasury';

describe('PolicyEngine', () => {
  let engine: PolicyEngine;

  beforeEach(() => {
    engine = new PolicyEngine({
      maxPerTransaction: '1.00',
      dailyBudget: '10.00',
      allowedEndpoints: ['api.example.com/*'],
      blockedEndpoints: ['*.bad.com'],
    });
  });

  it('should allow valid payment', () => {
    const result = engine.checkPayment('0.50', 'api.example.com/data');
    expect(result.allowed).toBe(true);
  });

  it('should reject payment exceeding max per transaction', () => {
    const result = engine.checkPayment('2.00', 'api.example.com/data');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('exceeds max per transaction');
  });

  it('should reject blocked endpoints', () => {
    // Create engine without whitelist to test blacklist
    const engineWithBlacklist = new PolicyEngine({
      maxPerTransaction: '1.00',
      dailyBudget: '10.00',
      blockedEndpoints: ['*.bad.com/*'],
    });
    const result = engineWithBlacklist.checkPayment('0.50', 'https://malware.bad.com/hack');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('blocked');
  });

  it('should reject non-whitelisted endpoints', () => {
    const result = engine.checkPayment('0.50', 'api.other.com/data');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not in whitelist');
  });

  it('should track spending and enforce daily budget', () => {
    // Spend up to limit
    for (let i = 0; i < 10; i++) {
      const check = engine.checkPayment('1.00', 'api.example.com/data');
      if (check.allowed) {
        engine.recordPayment('1.00');
      }
    }

    // Next payment should fail
    const result = engine.checkPayment('1.00', 'api.example.com/data');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('daily budget');
  });

  it('should get remaining budgets', () => {
    engine.recordPayment('3.00');
    const budgets = engine.getRemainingBudgets();
    expect(budgets.daily).toBe('7');
  });

  it('should enforce approval threshold', () => {
    const engineWithApproval = new PolicyEngine({
      maxPerTransaction: '10.00',
      dailyBudget: '100.00',
      requireApproval: { above: '5.00' },
    });

    const result = engineWithApproval.checkPayment('6.00', 'api.example.com/data');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('requires human approval');
  });

  it('should handle monthly budget', () => {
    const engineWithMonthly = new PolicyEngine({
      maxPerTransaction: '10.00',
      dailyBudget: '100.00',
      monthlyBudget: '50.00',
    });

    // Spend more than monthly
    for (let i = 0; i < 5; i++) {
      engineWithMonthly.recordPayment('10.00');
    }

    const result = engineWithMonthly.checkPayment('10.00', 'api.example.com');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('monthly budget');
  });

  it('should update policy', () => {
    engine.updatePolicy({ maxPerTransaction: '5.00' });
    const policy = engine.getPolicy();
    expect(policy.maxPerTransaction).toBe('5.00');
    expect(policy.dailyBudget).toBe('10.00'); // unchanged
  });
});

describe('TreasuryManager', () => {
  let treasury: TreasuryManager;

  beforeEach(() => {
    treasury = new TreasuryManager();
  });

  it('should record transactions', () => {
    const id = treasury.recordTransaction({
      timestamp: new Date().toISOString(),
      endpoint: 'api.example.com',
      amount: '1.00',
      status: 'settled',
    });

    expect(id).toMatch(/^tx_/);

    const recent = treasury.getRecentTransactions(1);
    expect(recent[0].amount).toBe('1.00');
  });

  it('should calculate stats correctly', () => {
    treasury.recordTransaction({
      timestamp: new Date().toISOString(),
      endpoint: 'api.example.com',
      amount: '1.50',
      status: 'settled',
    });

    treasury.recordTransaction({
      timestamp: new Date().toISOString(),
      endpoint: 'api.example.com',
      amount: '2.50',
      status: 'settled',
    });

    const stats = treasury.getStats('10.00', '100.00');
    expect(stats.totalSpent).toBe('4.00');
    expect(stats.remainingDailyBudget).toBe('6.00');
    expect(stats.remainingMonthlyBudget).toBe('96.00');
  });

  it('should update transaction status', () => {
    const id = treasury.recordTransaction({
      timestamp: new Date().toISOString(),
      endpoint: 'api.example.com',
      amount: '1.00',
      status: 'pending',
    });

    treasury.updateTransaction(id, { status: 'settled', txHash: '0x123' });

    const tx = treasury.getTransaction(id);
    expect(tx?.status).toBe('settled');
    expect(tx?.txHash).toBe('0x123');
  });

  it('should get transactions by status', () => {
    treasury.recordTransaction({
      timestamp: new Date().toISOString(),
      endpoint: 'api.example.com',
      amount: '1.00',
      status: 'pending',
    });

    treasury.recordTransaction({
      timestamp: new Date().toISOString(),
      endpoint: 'api.example.com',
      amount: '2.00',
      status: 'settled',
    });

    const pending = treasury.getTransactionsByStatus('pending');
    expect(pending).toHaveLength(1);
    expect(pending[0].amount).toBe('1.00');

    const settled = treasury.getTransactionsByStatus('settled');
    expect(settled).toHaveLength(1);
    expect(settled[0].amount).toBe('2.00');
  });

  it('should get pending count', () => {
    treasury.recordTransaction({
      timestamp: new Date().toISOString(),
      endpoint: 'api.example.com',
      amount: '1.00',
      status: 'pending',
    });

    treasury.recordTransaction({
      timestamp: new Date().toISOString(),
      endpoint: 'api.example.com',
      amount: '2.00',
      status: 'pending',
    });

    expect(treasury.getPendingCount()).toBe(2);
  });

  it('should prune history', () => {
    for (let i = 0; i < 10; i++) {
      treasury.recordTransaction({
        timestamp: new Date().toISOString(),
        endpoint: 'api.example.com',
        amount: '1.00',
        status: 'settled',
      });
    }

    treasury.pruneHistory(5);
    const recent = treasury.getRecentTransactions(10);
    expect(recent).toHaveLength(5);
  });
});
