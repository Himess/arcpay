/**
 * Voice Module Types
 */

export interface SpeechRecognitionConfig {
  language?: string; // default: 'en-US'
  continuous?: boolean;
  interimResults?: boolean;
}

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface SpeechSynthesisConfig {
  voice?: string;
  rate?: number; // 0.1 to 10, default: 1
  pitch?: number; // 0 to 2, default: 1
  volume?: number; // 0 to 1, default: 1
  language?: string;
}

export interface VoiceAgentConfig {
  language?: string;
  speakResponses?: boolean;
  confirmLargePayments?: boolean;
  largePaymentThreshold?: string;
}

export interface VoiceCommandResult {
  recognized: boolean;
  transcript: string;
  confidence: number;
  processed: boolean;
  response?: string;
  error?: string;
}
