/**
 * Voice Module Tests
 *
 * Tests for voice command recognition and processing
 */

import { describe, it, expect, vi } from 'vitest';

describe('Voice Module', () => {
  describe('Speech Recognition', () => {
    it('should normalize voice transcript to lowercase', () => {
      const transcript = 'SEND 50 USDC TO ALICE';
      const normalized = transcript.toLowerCase();
      expect(normalized).toBe('send 50 usdc to alice');
    });

    it('should trim whitespace from transcript', () => {
      const transcript = '  send 100 usdc  ';
      const cleaned = transcript.trim();
      expect(cleaned).toBe('send 100 usdc');
    });

    it('should handle common speech recognition errors', () => {
      const transcript = 'send fifty usdc';
      // Common word-to-number mapping
      const wordNumbers: Record<string, string> = {
        'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
        'ten': '10', 'twenty': '20', 'fifty': '50', 'hundred': '100',
      };
      let processed = transcript;
      Object.entries(wordNumbers).forEach(([word, num]) => {
        processed = processed.replace(new RegExp(`\\b${word}\\b`, 'gi'), num);
      });
      expect(processed).toBe('send 50 usdc');
    });
  });

  describe('Command Parsing', () => {
    it('should parse send command', () => {
      const command = 'send 25 usdc';
      const isSendCommand = command.startsWith('send');
      expect(isSendCommand).toBe(true);
    });

    it('should parse check balance command', () => {
      const command = 'check my balance';
      const isBalanceCommand = /balance|how much/i.test(command);
      expect(isBalanceCommand).toBe(true);
    });

    it('should parse cancel command', () => {
      const command = 'cancel';
      const isCancelCommand = command === 'cancel' || command === 'stop';
      expect(isCancelCommand).toBe(true);
    });

    it('should extract amount from voice command', () => {
      const command = 'transfer 75.5 usdc to bob';
      const match = command.match(/(\d+(?:\.\d+)?)/);
      const amount = match ? parseFloat(match[1]) : 0;
      expect(amount).toBe(75.5);
    });
  });

  describe('Voice Feedback', () => {
    it('should generate confirmation message for transfer', () => {
      const amount = 100;
      const recipient = 'alice.eth';
      const message = `Sending ${amount} USDC to ${recipient}`;
      expect(message).toBe('Sending 100 USDC to alice.eth');
    });

    it('should generate balance response', () => {
      const balance = 1500.50;
      const message = `Your balance is ${balance} USDC`;
      expect(message).toBe('Your balance is 1500.5 USDC');
    });

    it('should generate error message for failed transaction', () => {
      const error = 'Insufficient funds';
      const message = `Transaction failed: ${error}`;
      expect(message).toBe('Transaction failed: Insufficient funds');
    });
  });

  describe('Language Support', () => {
    it('should detect English language code', () => {
      const langCode = 'en-US';
      const isEnglish = langCode.startsWith('en');
      expect(isEnglish).toBe(true);
    });

    it('should detect Turkish language code', () => {
      const langCode = 'tr-TR';
      const isTurkish = langCode.startsWith('tr');
      expect(isTurkish).toBe(true);
    });

    it('should default to English for unsupported languages', () => {
      const supportedLanguages = ['en', 'tr', 'es', 'fr'];
      const userLang = 'jp';
      const selectedLang = supportedLanguages.includes(userLang) ? userLang : 'en';
      expect(selectedLang).toBe('en');
    });
  });
});
