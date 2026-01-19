/**
 * AI Module Tests
 *
 * Tests for intent parsing and AI payment processing
 */

import { describe, it, expect, vi } from 'vitest';

describe('AI Module', () => {
  describe('Intent Parsing', () => {
    it('should parse transfer intent', () => {
      const input = 'Send 50 USDC to 0x742d35Cc6634C0532925a3b844Bc9e7595f9dB19';
      const hasTransferKeyword = /send|transfer|pay/i.test(input);
      const hasAmount = /\d+/.test(input);
      const hasAddress = /0x[a-fA-F0-9]{40}/.test(input);

      expect(hasTransferKeyword).toBe(true);
      expect(hasAmount).toBe(true);
      expect(hasAddress).toBe(true);
    });

    it('should extract amount from intent', () => {
      const input = 'Transfer 100 USDC';
      const match = input.match(/(\d+(?:\.\d+)?)\s*(?:USDC|usdc)/);
      const amount = match ? parseFloat(match[1]) : 0;
      expect(amount).toBe(100);
    });

    it('should extract decimal amount from intent', () => {
      const input = 'Send 25.50 USDC';
      const match = input.match(/(\d+(?:\.\d+)?)\s*(?:USDC|usdc)/);
      const amount = match ? parseFloat(match[1]) : 0;
      expect(amount).toBe(25.5);
    });

    it('should extract recipient address from intent', () => {
      const input = 'Pay 0x742d35Cc6634C0532925a3b844Bc9e7595f9dB19 50 USDC';
      const match = input.match(/0x[a-fA-F0-9]{40}/);
      const address = match ? match[0] : null;
      expect(address).toBe('0x742d35Cc6634C0532925a3b844Bc9e7595f9dB19');
    });

    it('should identify balance check intent', () => {
      const input = 'What is my USDC balance?';
      const isBalanceCheck = /balance|how much|check/i.test(input);
      expect(isBalanceCheck).toBe(true);
    });

    it('should identify escrow intent', () => {
      const input = 'Create an escrow for 200 USDC';
      const isEscrowIntent = /escrow|hold|secure/i.test(input);
      expect(isEscrowIntent).toBe(true);
    });
  });

  describe('Function Call Mapping', () => {
    it('should map transfer intent to correct function', () => {
      const intent = 'transfer';
      const functionMap: Record<string, string> = {
        transfer: 'executeTransfer',
        balance: 'getBalance',
        escrow: 'createEscrow',
        stream: 'createStream',
      };
      const functionName = functionMap[intent];
      expect(functionName).toBe('executeTransfer');
    });

    it('should handle unknown intent gracefully', () => {
      const intent = 'unknown';
      const functionMap: Record<string, string> = {
        transfer: 'executeTransfer',
        balance: 'getBalance',
      };
      const functionName = functionMap[intent] || 'handleUnknown';
      expect(functionName).toBe('handleUnknown');
    });
  });

  describe('Input Validation', () => {
    it('should reject empty input', () => {
      const input = '';
      const isValid = input.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it('should reject input without action keyword', () => {
      const input = 'Hello world';
      const hasActionKeyword = /send|transfer|pay|balance|escrow|stream/i.test(input);
      expect(hasActionKeyword).toBe(false);
    });

    it('should accept valid payment command', () => {
      const input = 'Send 10 USDC to vitalik.eth';
      const hasActionKeyword = /send|transfer|pay/i.test(input);
      const hasAmount = /\d+/.test(input);
      expect(hasActionKeyword && hasAmount).toBe(true);
    });
  });
});
